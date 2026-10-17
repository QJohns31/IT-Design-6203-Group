// Component test – Category & List Management (Aderoju Okunlola)
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CategoryManagementComponent } from './category-management.component';
import { API_URL } from '../api.config';

describe('CategoryManagementComponent', () => {
  it('renders categories with their task counts', () => {
    TestBed.configureTestingModule({
      imports: [CategoryManagementComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(CategoryManagementComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne(`${API_URL}/categories`).flush({
      categories: [
        { _id: 'c1', name: 'Personal', color: '#16a34a', icon: '🏠', description: '', taskCount: 3 },
        { _id: 'c2', name: 'Work', color: '#2563eb', icon: '💼', description: '', taskCount: 1 },
      ],
      uncategorizedCount: 2,
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.cat').length).toBe(2);
    expect(el.textContent).toContain('3 task(s)');
    expect(el.textContent).toContain('2 task(s) are not in any category');
    http.verify();
  });
});
