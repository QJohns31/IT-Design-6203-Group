// Component test – Task Management (Quzhan Johnson)
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TaskManagementComponent } from './task-management.component';
import { API_URL } from '../api.config';

describe('TaskManagementComponent', () => {
  it('loads categories and tasks and renders the task list', () => {
    TestBed.configureTestingModule({
      imports: [TaskManagementComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(TaskManagementComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); // triggers ngOnInit

    http.expectOne(`${API_URL}/categories`).flush({
      categories: [{ _id: 'c1', name: 'Work', color: '#2563eb', icon: '💼', description: '' }],
      uncategorizedCount: 0,
    });
    http.expectOne((r) => r.url === `${API_URL}/tasks`).flush([
      { _id: 't1', title: 'Write report', description: '', dueDate: null, priority: 'High', status: 'Pending', categoryId: 'c1', location: '' },
      { _id: 't2', title: 'Buy milk', description: '', dueDate: null, priority: 'Low', status: 'Completed', categoryId: null, location: '' },
    ]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const titles = Array.from(el.querySelectorAll('.task h3')).map((h) => h.textContent?.trim());
    expect(titles).toEqual(['Write report', 'Buy milk']);
    expect(el.textContent).toContain('Work');
    expect(fixture.componentInstance.counts().Completed).toBe(1);
    http.verify();
  });
});
