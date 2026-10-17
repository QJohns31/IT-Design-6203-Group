// Unit tests – ReminderSubtaskService (Lakshmi Pranathi Priya Ega)
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReminderSubtaskService } from './reminder-subtask.service';
import { API_URL } from '../api.config';

describe('ReminderSubtaskService', () => {
  let service: ReminderSubtaskService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ReminderSubtaskService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('filters items by task and type', () => {
    service.getItems('t1', 'reminder').subscribe();
    const req = http.expectOne((r) => r.url === `${API_URL}/items`);
    expect(req.request.params.get('taskId')).toBe('t1');
    expect(req.request.params.get('type')).toBe('reminder');
    req.flush({ items: [], progress: { subtasksTotal: 0, subtasksDone: 0, percent: 0 } });
  });

  it('toggles completion with PATCH', () => {
    service.toggleItem('i1').subscribe((i) => expect(i.completed).toBe(true));
    const req = http.expectOne(`${API_URL}/items/i1/toggle`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ _id: 'i1', completed: true });
  });
});
