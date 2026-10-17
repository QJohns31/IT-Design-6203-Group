/**
 * Task Management component – Quzhan Johnson
 * C: create a task (title, description, due date, priority, status, category, location)
 * R: list tasks with search + filters (category, priority, status, due date) and sorting
 * U: edit any field, or change status inline
 * D: delete a task (server also removes its reminders/subtasks and recurrence rule)
 * Also hosts the OpenWeatherMap forecast (third-party API) for tasks with a location.
 *
 * Milestone 1 – Angular concepts used in this file
 * - Angular form approaches: the task form is a REACTIVE form (FormGroup + FormControl built
 *   in this class). The small filter bar keeps the TEMPLATE-DRIVEN approach ([(ngModel)]) so
 *   both approaches can be compared.
 * - FormControl / FormGroup: one typed FormControl per field, grouped in `taskForm`.
 * - signal(): page state (tasks, messages, editingId, submitted) is held in writable signals.
 * - Signal vs. reactive form objects: the FormGroup tracks input values and validity;
 *   toSignal() turns its valueChanges/statusChanges streams into signals so computed()
 *   values (the live preview) update automatically.
 * - Component data to browser interface / data binding: {{ interpolation }}, [property]
 *   binding, (event) binding and [formGroup]/formControlName in the template.
 * Reactive forms guide: https://angular.dev/guide/forms/reactive-forms
 * Signals guide: https://angular.dev/guide/signals
 */
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TaskFilters, TaskService } from '../services/task.service';
import { CategoryService } from '../services/category.service';
import { Category, Priority, Status, Task } from '../models/models';
import { PRIORITIES, STATUSES, canShowWeather, countByStatus, dueLabel, errorMessage, isOverdue } from '../utils/task-utils';
import { toDateInput } from '../utils/date-utils';
import { WeatherWidgetComponent } from '../weather-widget/weather-widget.component';

/** Blank values used to create and reset the reactive form. */
const EMPTY_TASK = {
  title: '', description: '', dueDate: '', priority: 'Medium' as Priority, status: 'Pending' as Status,
  categoryId: '', location: '',
};

@Component({
  selector: 'app-task-management',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, DatePipe, RouterLink, WeatherWidgetComponent],
  templateUrl: './task-management.component.html',
  styleUrl: './task-management.component.css',
})
export class TaskManagementComponent implements OnInit {
  private taskService = inject(TaskService);
  private categoryService = inject(CategoryService);

  readonly priorities = PRIORITIES;
  readonly statuses = STATUSES;

  tasks = signal<Task[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  success = signal('');
  editingId = signal<string | null>(null);
  weatherTaskId = signal<string | null>(null);

  submitted = signal(false); // becomes true when the user presses Add/Save, to show errors

  // Template-driven filters (bound with [(ngModel)] in the template)
  filters: TaskFilters = { search: '', categoryId: '', priority: '', status: '', dueFrom: '', dueTo: '', sort: 'dueDate' };

  // ---------- Reactive form: FormGroup made of typed FormControls ----------
  readonly taskForm = new FormGroup({
    title: new FormControl(EMPTY_TASK.title, { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    description: new FormControl(EMPTY_TASK.description, { nonNullable: true, validators: [Validators.maxLength(1000)] }),
    dueDate: new FormControl(EMPTY_TASK.dueDate, { nonNullable: true }),
    priority: new FormControl<Priority>(EMPTY_TASK.priority, { nonNullable: true }),
    status: new FormControl<Status>(EMPTY_TASK.status, { nonNullable: true }),
    categoryId: new FormControl(EMPTY_TASK.categoryId, { nonNullable: true }),
    location: new FormControl(EMPTY_TASK.location, { nonNullable: true, validators: [Validators.maxLength(100)] }),
  });

  // Bridge from reactive form objects to signals
  readonly formValue = toSignal(this.taskForm.valueChanges, { initialValue: this.taskForm.getRawValue() });
  readonly formStatus = toSignal(this.taskForm.statusChanges, { initialValue: this.taskForm.status });

  // computed() signals derived from the form – shown live in the preview card
  readonly previewTitle = computed(() => this.formValue().title?.trim() || 'Untitled task');
  readonly previewPriority = computed(() => this.formValue().priority ?? 'Medium');
  readonly formIsValid = computed(() => this.formStatus() === 'VALID');

  counts = computed(() => countByStatus(this.tasks()));
  categoryMap = computed(() => new Map(this.categories().map((c) => [c._id, c])));

  // Expose helpers to the template
  isOverdue = isOverdue;
  dueLabel = dueLabel;
  canShowWeather = canShowWeather;

  categoryOf(task: Task): Category | undefined {
    return task.categoryId ? this.categoryMap().get(task.categoryId) : undefined;
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadTasks();
  }

  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (res) => this.categories.set(res.categories),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  loadTasks(): void {
    this.loading.set(true);
    this.taskService.getTasks(this.filters).subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  clearFilters(): void {
    this.filters = { search: '', categoryId: '', priority: '', status: '', dueFrom: '', dueTo: '', sort: 'dueDate' };
    this.loadTasks();
  }

  /** UPDATE (step 1): copy the chosen task into the reactive form with setValue(). */
  startEdit(task: Task): void {
    this.editingId.set(task._id);
    this.taskForm.setValue({
      title: task.title,
      description: task.description,
      dueDate: toDateInput(task.dueDate),
      priority: task.priority,
      status: task.status,
      categoryId: task.categoryId ?? '',
      location: task.location,
    });
    this.submitted.set(false);
    this.success.set('');
    this.error.set('');
  }

  /** Clears the form and returns to "New task" mode. */
  cancelEdit(): void {
    this.editingId.set(null);
    this.submitted.set(false);
    this.taskForm.reset(EMPTY_TASK);
  }

  /** CREATE or UPDATE (step 2): read the form with getRawValue() and send it to the API. */
  save(): void {
    this.submitted.set(true);
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const v = this.taskForm.getRawValue();
    const payload: Partial<Task> = {
      title: v.title,
      description: v.description,
      dueDate: v.dueDate || null,
      priority: v.priority,
      status: v.status,
      categoryId: v.categoryId || null,
      location: v.location,
    };
    const id = this.editingId();
    const request = id ? this.taskService.updateTask(id, payload) : this.taskService.createTask(payload);

    request.subscribe({
      next: (task) => {
        this.success.set(id ? `Updated "${task.title}".` : `Created "${task.title}".`);
        this.saving.set(false);
        this.cancelEdit();
        this.loadTasks();
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.saving.set(false);
      },
    });
  }

  changeStatus(task: Task, status: Status): void {
    this.taskService.updateTask(task._id, { status }).subscribe({
      next: (updated) => this.tasks.update((list) => list.map((t) => (t._id === updated._id ? updated : t))),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  deleteTask(task: Task): void {
    if (!confirm(`Delete "${task.title}"? Its reminders, subtasks and recurrence rule will also be removed.`)) return;
    this.taskService.deleteTask(task._id).subscribe({
      next: () => {
        this.success.set(`Deleted "${task.title}".`);
        if (this.editingId() === task._id) this.cancelEdit();
        this.loadTasks();
      },
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  toggleWeather(task: Task): void {
    this.weatherTaskId.set(this.weatherTaskId() === task._id ? null : task._id);
  }
}
