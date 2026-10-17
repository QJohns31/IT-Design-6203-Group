/**
 * Reminder & Subtask Management component – Lakshmi Pranathi Priya Ega
 * C: add a reminder (text + date/time) or a subtask (checklist item) to a parent task
 * R: view all reminders/subtasks for the selected task, with checklist progress
 *    and a banner of reminders that are now due (across all tasks)
 * U: edit a reminder's date/time or a subtask's text; tick items complete
 * D: delete a reminder or subtask
 *
 * Milestone 1 – Angular concepts used in this file
 * - Angular form approaches: adding/editing items uses a REACTIVE form (FormGroup/FormControl);
 *   the parent-task picker keeps a TEMPLATE-DRIVEN [(ngModel)] select for comparison.
 * - FormControl / FormGroup: `itemForm` groups type, text and remindAt, with a group-level
 *   validator (a reminder must have a date/time).
 * - signal(): the item list, progress, messages and which item is being edited.
 * - Signal vs. reactive form objects: toSignal() turns the form's value into a signal so
 *   computed() can show/hide the date field and build the live preview line.
 * - Component data to browser interface: interpolation, [style.width.%] and [checked]
 *   property bindings, (change)/(click) event bindings, [formGroup]/formControlName.
 * Reactive forms guide: https://angular.dev/guide/forms/reactive-forms
 */
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ReminderSubtaskService } from '../services/reminder-subtask.service';
import { TaskService } from '../services/task.service';
import { ItemType, ReminderSubtask, Task } from '../models/models';
import { dueReminders, errorMessage } from '../utils/task-utils';
import { fromDateTimeLocalInput, toDateTimeLocalInput } from '../utils/date-utils';

/** Group validator: a reminder needs a date and time; a subtask does not. */
function reminderNeedsTime(group: AbstractControl): ValidationErrors | null {
  const type = group.get('type')?.value;
  const remindAt = group.get('remindAt')?.value;
  return type === 'reminder' && !remindAt ? { remindAtRequired: true } : null;
}

/** Blank values used to create and reset the reactive form. */
const EMPTY_ITEM = { type: 'subtask' as ItemType, text: '', remindAt: '' };

@Component({
  selector: 'app-reminder-subtask',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, DatePipe],
  templateUrl: './reminder-subtask.component.html',
  styleUrl: './reminder-subtask.component.css',
})
export class ReminderSubtaskComponent implements OnInit {
  private itemService = inject(ReminderSubtaskService);
  private taskService = inject(TaskService);
  private route = inject(ActivatedRoute);

  tasks = signal<Task[]>([]);
  items = signal<ReminderSubtask[]>([]);
  allReminders = signal<ReminderSubtask[]>([]);
  progress = signal({ subtasksTotal: 0, subtasksDone: 0, percent: 0 });
  error = signal('');
  success = signal('');
  loading = signal(false);
  saving = signal(false);
  submitted = signal(false);
  editingId = signal<string | null>(null);

  // Template-driven parent-task picker (bound with [(ngModel)])
  selectedTaskId = '';

  // ---------- Reactive form: FormGroup made of typed FormControls ----------
  readonly itemForm = new FormGroup(
    {
      type: new FormControl<ItemType>(EMPTY_ITEM.type, { nonNullable: true }),
      text: new FormControl(EMPTY_ITEM.text, { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
      remindAt: new FormControl(EMPTY_ITEM.remindAt, { nonNullable: true }),
    },
    { validators: reminderNeedsTime },
  );

  // Bridge from reactive form objects to signals
  readonly formValue = toSignal(this.itemForm.valueChanges, { initialValue: this.itemForm.getRawValue() });
  readonly isReminder = computed(() => this.formValue().type === 'reminder');
  readonly previewLine = computed(() => {
    const v = this.formValue();
    const text = v.text?.trim() || '…';
    return v.type === 'reminder' ? `Reminder: ${text}` : `Subtask: ${text}`;
  });

  subtasks = computed(() => this.items().filter((i) => i.type === 'subtask'));
  reminders = computed(() => this.items().filter((i) => i.type === 'reminder'));
  dueNow = computed(() => dueReminders(this.allReminders()));
  taskTitles = computed(() => new Map(this.tasks().map((t) => [t._id, t.title])));

  ngOnInit(): void {
    this.selectedTaskId = this.route.snapshot.queryParamMap.get('taskId') ?? '';
    this.taskService.getTasks({ sort: 'dueDate' }).subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        if (!this.selectedTaskId && tasks.length) this.selectedTaskId = tasks[0]._id;
        this.loadItems();
      },
      error: (err) => this.error.set(errorMessage(err)),
    });
    this.loadAllReminders();
  }

  /** READ: items for the selected task, plus the checklist progress. */
  loadItems(): void {
    this.cancelEdit();
    if (!this.selectedTaskId) {
      this.items.set([]);
      return;
    }
    this.loading.set(true);
    this.itemService.getItems(this.selectedTaskId).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.progress.set(res.progress);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  /** READ: every reminder, used for the "reminders due" banner. */
  loadAllReminders(): void {
    this.itemService.getItems(undefined, 'reminder').subscribe({
      next: (res) => this.allReminders.set(res.items),
      error: () => this.allReminders.set([]),
    });
  }

  private refresh(message: string): void {
    this.success.set(message);
    this.error.set('');
    this.loadItems();
    this.loadAllReminders();
  }

  /** Quick buttons above the lists switch the form to a subtask or a reminder. */
  startNew(type: ItemType): void {
    this.cancelEdit();
    this.itemForm.controls.type.setValue(type);
  }

  /** UPDATE (step 1): load an item into the reactive form. */
  startEdit(item: ReminderSubtask): void {
    this.editingId.set(item._id);
    this.itemForm.setValue({ type: item.type, text: item.text, remindAt: toDateTimeLocalInput(item.remindAt) });
    this.submitted.set(false);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.submitted.set(false);
    this.itemForm.reset(EMPTY_ITEM);
  }

  /** CREATE or UPDATE (step 2): send the form's value to the API. */
  save(): void {
    this.submitted.set(true);
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }
    const v = this.itemForm.getRawValue();
    const remindAt = v.type === 'reminder' ? fromDateTimeLocalInput(v.remindAt) : null;
    const id = this.editingId();
    this.saving.set(true);
    const request = id
      ? this.itemService.updateItem(id, { type: v.type, text: v.text.trim(), remindAt })
      : this.itemService.createItem({ taskId: this.selectedTaskId, type: v.type, text: v.text.trim(), remindAt });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.refresh(id ? 'Saved.' : v.type === 'reminder' ? 'Reminder added.' : 'Subtask added.');
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }

  /** UPDATE (quick): tick or untick an item. */
  toggle(item: ReminderSubtask): void {
    this.itemService.toggleItem(item._id).subscribe({
      next: () => this.refresh(''),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  /** DELETE */
  remove(item: ReminderSubtask): void {
    if (!confirm(`Delete "${item.text}"?`)) return;
    this.itemService.deleteItem(item._id).subscribe({
      next: () => this.refresh('Deleted.'),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  isDue(item: ReminderSubtask): boolean {
    return !item.completed && !!item.remindAt && new Date(item.remindAt) <= new Date();
  }
}
