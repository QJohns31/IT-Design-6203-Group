// Unit tests – TaskService (Quzhan Johnson). HttpTestingController per
// https://angular.dev/guide/http/testing
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TaskService } from './task.service';
import { API_URL } from '../api.config';

describe('TaskService', () => {
  let service: TaskService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TaskService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends only non-empty filters as query parameters', () => {
    service.getTasks({ search: 'milk', priority: '', status: 'Pending' }).subscribe();
    const req = http.expectOne((r) => r.url === `${API_URL}/tasks`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('search')).toBe('milk');
    expect(req.request.params.get('status')).toBe('Pending');
    expect(req.request.params.has('priority')).toBe(false);
    req.flush([]);
  });

  it('creates a task with POST', () => {
    service.createTask({ title: 'New' }).subscribe((t) => expect(t.title).toBe('New'));
    const req = http.expectOne(`${API_URL}/tasks`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'New' });
    req.flush({ _id: '1', title: 'New' });
  });

  it('updates with PUT and deletes with DELETE', () => {
    service.updateTask('abc', { status: 'Completed' }).subscribe();
    const put = http.expectOne(`${API_URL}/tasks/abc`);
    expect(put.request.method).toBe('PUT');
    put.flush({});
    service.deleteTask('abc').subscribe();
    const del = http.expectOne(`${API_URL}/tasks/abc`);
    expect(del.request.method).toBe('DELETE');
    del.flush({ message: 'ok' });
  });
});
