/**
 * Task Management component – Quzhan Johnson
 * C: create a task (title, description, due date, priority, status, category, location)
 * R: list tasks with search + filters (category, priority, status, due date) and sorting
 * U: edit any field, or change status inline
 * D: delete a task (server also removes its reminders/subtasks and recurrence rule)
 * Also hosts the OpenWeatherMap forecast (third-party API) for tasks with a location.
 */
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TaskFilters, TaskService } from '../services/task.service';
import { CategoryService } from '../services/category.service';
import { Category, Priority, Status, Task } from '../models/models';
import { PRIORITIES, STATUSES, canShowWeather, countByStatus, dueLabel, errorMessage, isOverdue } from '../utils/task-utils';
import { toDateInput } from '../utils/date-utils';
import { WeatherWidgetComponent } from '../weather-widget/weather-widget.component';

interface TaskForm {
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  status: Status;
  categoryId: string;
  location: string;
}

const emptyForm = (): TaskForm => ({
  title: '', description: '', dueDate: '', priority: 'Medium', status: 'Pending', categoryId: '', location: '',
});

@Component({
  selector: 'app-task-management',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, WeatherWidgetComponent],
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

  filters: TaskFilters = { search: '', categoryId: '', priority: '', status: '', dueFrom: '', dueTo: '', sort: 'dueDate' };
  form: TaskForm = emptyForm();

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

  startEdit(task: Task): void {
    this.editingId.set(task._id);
    this.form = {
      title: task.title,
      description: task.description,
      dueDate: toDateInput(task.dueDate),
      priority: task.priority,
      status: task.status,
      categoryId: task.categoryId ?? '',
      location: task.location,
    };
    this.success.set('');
    this.error.set('');
  }

  cancelEdit(formRef?: NgForm): void {
    this.editingId.set(null);
    this.form = emptyForm();
    formRef?.resetForm(this.form);
  }

  save(formRef: NgForm): void {
    if (formRef.invalid) return;
    this.saving.set(true);
    this.error.set('');
    const payload: Partial<Task> = {
      title: this.form.title,
      description: this.form.description,
      dueDate: this.form.dueDate || null,
      priority: this.form.priority,
      status: this.form.status,
      categoryId: this.form.categoryId || null,
      location: this.form.location,
    };
    const id = this.editingId();
    const request = id ? this.taskService.updateTask(id, payload) : this.taskService.createTask(payload);

    request.subscribe({
      next: (task) => {
        this.success.set(id ? `Updated "${task.title}".` : `Created "${task.title}".`);
        this.saving.set(false);
        this.cancelEdit(formRef);
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
