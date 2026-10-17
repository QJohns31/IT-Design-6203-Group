// One route per member component. https://angular.dev/guide/routing/common-router-tasks
import { Routes } from '@angular/router';
import { TaskManagementComponent } from './task-management/task-management.component';
import { CategoryManagementComponent } from './category-management/category-management.component';
import { ReminderSubtaskComponent } from './reminder-subtask/reminder-subtask.component';
import { RecurringTaskComponent } from './recurring-task/recurring-task.component';

export const routes: Routes = [
  { path: '', redirectTo: 'tasks', pathMatch: 'full' },
  { path: 'tasks', component: TaskManagementComponent, title: 'Tasks · Task Flow' },
  { path: 'categories', component: CategoryManagementComponent, title: 'Categories · Task Flow' },
  { path: 'reminders', component: ReminderSubtaskComponent, title: 'Reminders & Subtasks · Task Flow' },
  { path: 'recurring', component: RecurringTaskComponent, title: 'Recurring Tasks · Task Flow' },
  { path: '**', redirectTo: 'tasks' },
];
