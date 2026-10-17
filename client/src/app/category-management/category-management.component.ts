/**
 * Category & List Management component – Aderoju Okunlola
 * C: create a category/list (name, colour, icon, description)
 * R: view all categories with task counts, and the tasks assigned to each
 * U: rename a category or change its colour/icon/description
 * D: delete a category and choose to un-assign, reassign or remove its tasks
 *
 * Milestone 1 – Angular concepts used in this file
 * - Angular form approaches: the category form is a REACTIVE form (FormGroup/FormControl);
 *   the small delete panel keeps TEMPLATE-DRIVEN [(ngModel)] radio buttons for comparison.
 * - FormControl / FormGroup: `categoryForm` groups name, color, icon and description.
 * - signal(): the category list, messages and which card is being edited/deleted.
 * - Signal vs. reactive form objects: toSignal() exposes the form value as a signal, and
 *   computed() signals drive the live colour/icon preview.
 * - Component data to browser interface: interpolation, [style.background] property binding,
 *   (click) event binding and [formGroup]/formControlName.
 * Reactive forms guide: https://angular.dev/guide/forms/reactive-forms
 */
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../services/category.service';
import { Category, CategoryDeleteMode, Task } from '../models/models';
import { errorMessage } from '../utils/task-utils';

/** Blank values used to create and reset the reactive form. */
const EMPTY_CATEGORY = { name: '', color: '#0e7c86', icon: '📁', description: '' };

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, DatePipe],
  templateUrl: './category-management.component.html',
  styleUrl: './category-management.component.css',
})
export class CategoryManagementComponent implements OnInit {
  private categoryService = inject(CategoryService);

  readonly iconChoices = ['📁', '💼', '🏠', '🛒', '🎓', '💪', '✈️', '💡', '🧾', '❤️'];

  categories = signal<Category[]>([]);
  uncategorizedCount = signal(0);
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  success = signal('');
  editingId = signal<string | null>(null);

  // READ: which category's task list is expanded
  expandedId = signal<string | null>(null);
  expandedTasks = signal<Task[]>([]);

  // DELETE: inline confirmation panel state
  deletingId = signal<string | null>(null);
  deleteMode: CategoryDeleteMode = 'unassign';
  reassignTargetId = '';

  submitted = signal(false);

  // ---------- Reactive form: FormGroup made of typed FormControls ----------
  readonly categoryForm = new FormGroup({
    name: new FormControl(EMPTY_CATEGORY.name, { nonNullable: true, validators: [Validators.required, Validators.maxLength(40)] }),
    color: new FormControl(EMPTY_CATEGORY.color, { nonNullable: true, validators: [Validators.pattern(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)] }),
    icon: new FormControl(EMPTY_CATEGORY.icon, { nonNullable: true, validators: [Validators.maxLength(8)] }),
    description: new FormControl(EMPTY_CATEGORY.description, { nonNullable: true, validators: [Validators.maxLength(300)] }),
  });

  // Bridge from reactive form objects to signals, used by the live preview
  readonly formValue = toSignal(this.categoryForm.valueChanges, { initialValue: this.categoryForm.getRawValue() });
  readonly previewName = computed(() => this.formValue().name?.trim() || 'Preview');
  readonly previewColor = computed(() => this.formValue().color || EMPTY_CATEGORY.color);
  readonly previewIcon = computed(() => this.formValue().icon || EMPTY_CATEGORY.icon);

  otherCategories = computed(() => this.categories().filter((c) => c._id !== this.deletingId()));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.categoryService.getCategories().subscribe({
      next: (res) => {
        this.categories.set(res.categories);
        this.uncategorizedCount.set(res.uncategorizedCount);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  toggleTasks(category: Category): void {
    if (this.expandedId() === category._id) {
      this.expandedId.set(null);
      return;
    }
    this.categoryService.getCategory(category._id).subscribe({
      next: (full) => {
        this.expandedTasks.set(full.tasks ?? []);
        this.expandedId.set(category._id);
      },
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  /** Quick-pick icon buttons write into the form with setValue(). */
  pickIcon(icon: string): void {
    this.categoryForm.controls.icon.setValue(icon);
  }

  /** UPDATE (step 1): load the category into the reactive form. */
  startEdit(category: Category): void {
    this.editingId.set(category._id);
    this.categoryForm.setValue({ name: category.name, color: category.color, icon: category.icon, description: category.description });
    this.submitted.set(false);
    this.error.set('');
    this.success.set('');
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.submitted.set(false);
    this.categoryForm.reset(EMPTY_CATEGORY);
  }

  /** CREATE or UPDATE (step 2): send the form's value to the API. */
  save(): void {
    this.submitted.set(true);
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const id = this.editingId();
    const value = this.categoryForm.getRawValue();
    const request = id
      ? this.categoryService.updateCategory(id, value)
      : this.categoryService.createCategory(value);

    request.subscribe({
      next: (cat) => {
        this.success.set(id ? `Saved "${cat.name}".` : `Created "${cat.name}".`);
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

  askDelete(category: Category): void {
    this.deletingId.set(category._id);
    this.deleteMode = 'unassign';
    this.reassignTargetId = '';
  }

  confirmDelete(category: Category): void {
    if (this.deleteMode === 'reassign' && !this.reassignTargetId) {
      this.error.set('Choose the category that should receive the tasks.');
      return;
    }
    this.categoryService.deleteCategory(category._id, this.deleteMode, this.reassignTargetId).subscribe({
      next: (res) => {
        const verb = { unassign: 'left uncategorized', reassign: 'moved', delete: 'deleted' }[this.deleteMode];
        this.success.set(`Deleted "${category.name}". ${res.affectedTasks} task(s) ${verb}.`);
        this.deletingId.set(null);
        if (this.editingId() === category._id) this.cancelEdit();
        if (this.expandedId() === category._id) this.expandedId.set(null);
        this.load();
      },
      error: (err) => this.error.set(errorMessage(err)),
    });
  }
}
