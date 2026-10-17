// Category & List Management service – Aderoju Okunlola
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../api.config';
import { Category, CategoryDeleteMode, CategoryListResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);
  private url = `${API_URL}/categories`;

  getCategories(): Observable<CategoryListResponse> {
    return this.http.get<CategoryListResponse>(this.url);
  }

  getCategory(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.url}/${id}`);
  }

  createCategory(category: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(this.url, category);
  }

  updateCategory(id: string, changes: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(`${this.url}/${id}`, changes);
  }

  deleteCategory(id: string, mode: CategoryDeleteMode, targetId?: string): Observable<{ message: string; affectedTasks: number }> {
    let params = new HttpParams().set('mode', mode);
    if (mode === 'reassign' && targetId) params = params.set('targetId', targetId);
    return this.http.delete<{ message: string; affectedTasks: number }>(`${this.url}/${id}`, { params });
  }
}
