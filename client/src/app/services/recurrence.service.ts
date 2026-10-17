// Recurring Task Management service – Deborah Cody
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../api.config';
import { RecurrenceRule } from '../models/models';

@Injectable({ providedIn: 'root' })
export class RecurrenceService {
  private http = inject(HttpClient);
  private url = `${API_URL}/recurrences`;

  getRules(taskId?: string): Observable<RecurrenceRule[]> {
    const params = taskId ? new HttpParams().set('taskId', taskId) : new HttpParams();
    return this.http.get<RecurrenceRule[]>(this.url, { params });
  }

  getOccurrences(id: string, count = 10): Observable<{ id: string; occurrences: string[] }> {
    const params = new HttpParams().set('count', String(count));
    return this.http.get<{ id: string; occurrences: string[] }>(`${this.url}/${id}/occurrences`, { params });
  }

  createRule(rule: Partial<RecurrenceRule>): Observable<RecurrenceRule> {
    return this.http.post<RecurrenceRule>(this.url, rule);
  }

  updateRule(id: string, changes: Partial<RecurrenceRule>): Observable<RecurrenceRule> {
    return this.http.put<RecurrenceRule>(`${this.url}/${id}`, changes);
  }

  deleteRule(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`);
  }
}
