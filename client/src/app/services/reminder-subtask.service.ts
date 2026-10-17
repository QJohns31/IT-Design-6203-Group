// Reminder & Subtask Management service – Lakshmi Pranathi Priya Ega
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../api.config';
import { ItemListResponse, ItemType, ReminderSubtask } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ReminderSubtaskService {
  private http = inject(HttpClient);
  private url = `${API_URL}/items`;

  getItems(taskId?: string, type?: ItemType): Observable<ItemListResponse> {
    let params = new HttpParams();
    if (taskId) params = params.set('taskId', taskId);
    if (type) params = params.set('type', type);
    return this.http.get<ItemListResponse>(this.url, { params });
  }

  createItem(item: Partial<ReminderSubtask>): Observable<ReminderSubtask> {
    return this.http.post<ReminderSubtask>(this.url, item);
  }

  updateItem(id: string, changes: Partial<ReminderSubtask>): Observable<ReminderSubtask> {
    return this.http.put<ReminderSubtask>(`${this.url}/${id}`, changes);
  }

  toggleItem(id: string): Observable<ReminderSubtask> {
    return this.http.patch<ReminderSubtask>(`${this.url}/${id}/toggle`, {});
  }

  deleteItem(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`);
  }
}
