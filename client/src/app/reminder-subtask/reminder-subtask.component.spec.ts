// Component test – Reminder & Subtask Management (Lakshmi Pranathi Priya Ega)
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ReminderSubtaskComponent } from './reminder-subtask.component';
import { API_URL } from '../api.config';

describe('ReminderSubtaskComponent', () => {
  it('selects the first task and shows its subtasks with progress', () => {
    TestBed.configureTestingModule({
      imports: [ReminderSubtaskComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(ReminderSubtaskComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((r) => r.url === `${API_URL}/tasks`).flush([
      { _id: 't1', title: 'Project report', description: '', dueDate: null, priority: 'High', status: 'Pending', categoryId: null, location: '' },
    ]);
    // Both item requests go to /items: one for all reminders, one for the selected task
    const itemReqs = http.match((r) => r.url === `${API_URL}/items`);
    expect(itemReqs.length).toBe(2);
    const forTask = itemReqs.find((r) => r.request.params.get('taskId') === 't1')!;
    const allReminders = itemReqs.find((r) => r.request.params.get('type') === 'reminder')!;
    allReminders.flush({ items: [], progress: { subtasksTotal: 0, subtasksDone: 0, percent: 0 } });
    forTask.flush({
      items: [
        { _id: 'i1', taskId: 't1', type: 'subtask', text: 'Outline', remindAt: null, completed: true },
        { _id: 'i2', taskId: 't1', type: 'subtask', text: 'Draft', remindAt: null, completed: false },
      ],
      progress: { subtasksTotal: 2, subtasksDone: 1, percent: 50 },
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('1 / 2 done');
    expect(el.textContent).toContain('Outline');
    expect(fixture.componentInstance.subtasks().length).toBe(2);
    http.verify();
  });
});
