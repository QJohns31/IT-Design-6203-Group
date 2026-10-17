// Component test – Recurring Task Management (Deborah Cody)
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RecurringTaskComponent } from './recurring-task.component';
import { API_URL } from '../api.config';

describe('RecurringTaskComponent', () => {
  it('shows rules with summaries and hides tasks that already repeat from the form', () => {
    TestBed.configureTestingModule({
      imports: [RecurringTaskComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(RecurringTaskComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((r) => r.url === `${API_URL}/tasks`).flush([
      { _id: 't1', title: 'Groceries', description: '', dueDate: null, priority: 'Low', status: 'Pending', categoryId: null, location: '' },
      { _id: 't2', title: 'Stand-up', description: '', dueDate: null, priority: 'Medium', status: 'Pending', categoryId: null, location: '' },
    ]);
    http.expectOne((r) => r.url === `${API_URL}/recurrences`).flush([
      { _id: 'r1', taskId: 't1', frequency: 'weekly', interval: 1, startDate: '2026-10-05T00:00:00.000Z', endDate: null, active: true,
        summary: 'Every week', nextOccurrences: ['2026-10-05T00:00:00.000Z', '2026-10-12T00:00:00.000Z'] },
    ]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Every week');
    expect(el.querySelectorAll('.rule .next .date-chip').length).toBe(2);
    expect(fixture.componentInstance.availableTasks().map((t) => t._id)).toEqual(['t2']);
    http.verify();
  });
});
