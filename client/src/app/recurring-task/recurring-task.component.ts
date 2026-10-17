/**
 * Recurring Task Management component – Deborah Cody
 * C: create a recurrence rule for a task (daily / weekly / monthly, interval, start, optional end)
 * R: view all rules with a readable summary and the upcoming occurrences
 * U: edit frequency, interval, start/end date, or pause/resume a rule
 * D: delete a recurrence rule
 *
 * Milestone 1 – Angular concepts used in this file
 * - Angular form approaches: the rule form is a REACTIVE form (FormGroup/FormControl).
 * - FormControl / FormGroup: `ruleForm` groups task, frequency, interval, start, end and active,
 *   with a group-level validator (end date must not be before the start date).
 * - signal(): rule list, messages, which rule is being edited, expanded date list.
 * - Signal vs. reactive form objects: toSignal() turns the form value into a signal; computed()
 *   builds the live "Every 2 weeks until …" summary and the unit label as the user types.
 * - Component data to browser interface: interpolation, [checked]/[disabled] property binding,
 *   (change)/(click) event binding, [formGroup]/formControlName.
 * Reactive forms guide: https://angular.dev/guide/forms/reactive-forms
 */
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RecurrenceService } from '../services/recurrence.service';
import { TaskService } from '../services/task.service';
import { Frequency, RecurrenceRule, Task } from '../models/models';
import { errorMessage } from '../utils/task-utils';
import { toDateInput, todayLocalIso } from '../utils/date-utils';
import { describeSchedule, endsBeforeStart } from '../utils/recurrence-utils';

/** Group validator: the end date (if any) must not be before the start date. */
function endAfterStart(group: AbstractControl): ValidationErrors | null {
  return endsBeforeStart(group.get('startDate')?.value, group.get('endDate')?.value) ? { endBeforeStart: true } : null;
}

/** Blank values used to create and reset the reactive form. */
const emptyRule = () => ({
  taskId: '', frequency: 'weekly' as Frequency, interval: 1, startDate: todayLocalIso(), endDate: '', active: true,
});

@Component({
  selector: 'app-recurring-task',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './recurring-task.component.html',
  styleUrl: './recurring-task.component.css',
})
export class RecurringTaskComponent implements OnInit {
  private recurrenceService = inject(RecurrenceService);
  private taskService = inject(TaskService);

  readonly frequencies: { value: Frequency; label: string; unit: string }[] = [
    { value: 'daily', label: 'Daily', unit: 'day(s)' },
    { value: 'weekly', label: 'Weekly', unit: 'week(s)' },
    { value: 'monthly', label: 'Monthly', unit: 'month(s)' },
  ];

  tasks = signal<Task[]>([]);
  rules = signal<RecurrenceRule[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  success = signal('');
  editingId = signal<string | null>(null);
  expandedId = signal<string | null>(null);
  moreDates = signal<string[]>([]);

  submitted = signal(false);

  // ---------- Reactive form: FormGroup made of typed FormControls ----------
  readonly ruleForm = new FormGroup(
    {
      taskId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      frequency: new FormControl<Frequency>('weekly', { nonNullable: true }),
      interval: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(365)] }),
      startDate: new FormControl(todayLocalIso(), { nonNullable: true, validators: [Validators.required] }),
      endDate: new FormControl('', { nonNullable: true }),
      active: new FormControl(true, { nonNullable: true }),
    },
    { validators: endAfterStart },
  );

  // Bridge from reactive form objects to signals
  readonly formValue = toSignal(this.ruleForm.valueChanges, { initialValue: this.ruleForm.getRawValue() });
  readonly unitLabel = computed(() => this.unitFor(this.formValue().frequency ?? 'weekly'));
  readonly previewSummary = computed(() => {
    const v = this.formValue();
    return describeSchedule(v.frequency ?? 'weekly', v.interval ?? 1, v.endDate);
  });

  taskTitles = computed(() => new Map(this.tasks().map((t) => [t._id, t.title])));
  /** Tasks that do not have a rule yet (one rule per task). */
  availableTasks = computed(() => {
    const used = new Set(this.rules().map((r) => r.taskId));
    return this.tasks().filter((t) => !used.has(t._id));
  });

  ngOnInit(): void {
    this.taskService.getTasks({ sort: 'title' }).subscribe({
      next: (tasks) => this.tasks.set(tasks),
      error: (err) => this.error.set(errorMessage(err)),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.recurrenceService.getRules().subscribe({
      next: (rules) => {
        this.rules.set(rules);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  unitFor(freq: Frequency): string {
    return this.frequencies.find((f) => f.value === freq)?.unit ?? '';
  }

  /** When a task is picked, default the start date to the task's due date. */
  constructor() {
    // When a new task is picked, default the start date to that task's due date.
    this.ruleForm.controls.taskId.valueChanges.pipe(takeUntilDestroyed()).subscribe((taskId) => {
      if (this.editingId()) return;
      const task = this.tasks().find((t) => t._id === taskId);
      if (task?.dueDate) this.ruleForm.controls.startDate.setValue(toDateInput(task.dueDate));
    });
  }

  /** UPDATE (step 1): load the rule into the reactive form. The task cannot change, so its control is disabled. */
  startEdit(rule: RecurrenceRule): void {
    this.editingId.set(rule._id);
    this.ruleForm.setValue({
      taskId: rule.taskId,
      frequency: rule.frequency,
      interval: rule.interval,
      startDate: toDateInput(rule.startDate),
      endDate: toDateInput(rule.endDate),
      active: rule.active,
    });
    this.ruleForm.controls.taskId.disable();
    this.submitted.set(false);
    this.error.set('');
    this.success.set('');
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.submitted.set(false);
    this.ruleForm.controls.taskId.enable();
    this.ruleForm.reset(emptyRule());
  }

  /** CREATE or UPDATE (step 2): read the form with getRawValue() (includes the disabled task) and save. */
  save(): void {
    this.submitted.set(true);
    if (this.ruleForm.invalid) {
      this.ruleForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const v = this.ruleForm.getRawValue();
    const payload: Partial<RecurrenceRule> = {
      frequency: v.frequency,
      interval: Number(v.interval),
      startDate: v.startDate,
      endDate: v.endDate || null,
      active: v.active,
    };
    const id = this.editingId();
    const request = id
      ? this.recurrenceService.updateRule(id, payload)
      : this.recurrenceService.createRule({ ...payload, taskId: v.taskId });

    request.subscribe({
      next: (rule) => {
        this.success.set(`${id ? 'Updated' : 'Created'} rule: ${rule.summary} for "${this.taskTitles().get(rule.taskId) ?? 'task'}".`);
        this.saving.set(false);
        this.cancelEdit();
        this.load();
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.saving.set(false);
      },
    });
  }

  toggleActive(rule: RecurrenceRule): void {
    this.recurrenceService.updateRule(rule._id, { active: !rule.active }).subscribe({
      next: (updated) => {
        this.rules.update((list) => list.map((r) => (r._id === updated._id ? updated : r)));
        this.success.set(updated.active ? 'Rule resumed.' : 'Rule paused.');
      },
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  showMore(rule: RecurrenceRule): void {
    if (this.expandedId() === rule._id) {
      this.expandedId.set(null);
      return;
    }
    this.recurrenceService.getOccurrences(rule._id, 10).subscribe({
      next: (res) => {
        this.moreDates.set(res.occurrences);
        this.expandedId.set(rule._id);
      },
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  remove(rule: RecurrenceRule): void {
    if (!confirm(`Stop "${this.taskTitles().get(rule.taskId) ?? 'this task'}" from repeating?`)) return;
    this.recurrenceService.deleteRule(rule._id).subscribe({
      next: () => {
        this.success.set('Recurrence rule deleted.');
        if (this.editingId() === rule._id) this.cancelEdit();
        this.load();
      },
      error: (err) => this.error.set(errorMessage(err)),
    });
  }
}
