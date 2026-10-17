// Task Management service – Quzhan Johnson
// HttpClient usage per https://angular.dev/guide/http/making-requests
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../api.config';
import { Task } from '../models/models';

export interface TaskFilters {
  search?: string;
  categoryId?: string;
  priority?: string;
  status?: string;
  dueFrom?: string;
  dueTo?: string;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);
  private url = `${API_URL}/tasks`;

  getTasks(filters: TaskFilters = {}): Observable<Task[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get<Task[]>(this.url, { params });
  }

  getTask(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.url}/${id}`);
  }

  createTask(task: Partial<Task>): Observable<Task> {
    return this.http.post<Task>(this.url, task);
  }

  updateTask(id: string, changes: Partial<Task>): Observable<Task> {
    return this.http.put<Task>(`${this.url}/${id}`, changes);
  }

  deleteTask(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`);
  }
}
