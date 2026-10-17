// Unit tests – CategoryService (Aderoju Okunlola)
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CategoryService } from './category.service';
import { API_URL } from '../api.config';

describe('CategoryService', () => {
  let service: CategoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CategoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists categories', () => {
    service.getCategories().subscribe((res) => expect(res.uncategorizedCount).toBe(2));
    http.expectOne(`${API_URL}/categories`).flush({ categories: [], uncategorizedCount: 2 });
  });

  it('sends mode and targetId when reassigning on delete', () => {
    service.deleteCategory('c1', 'reassign', 'c2').subscribe();
    const req = http.expectOne((r) => r.url === `${API_URL}/categories/c1`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.params.get('mode')).toBe('reassign');
    expect(req.request.params.get('targetId')).toBe('c2');
    req.flush({ message: 'ok', affectedTasks: 1 });
  });

  it('omits targetId for unassign', () => {
    service.deleteCategory('c1', 'unassign', 'c2').subscribe();
    const req = http.expectOne((r) => r.url === `${API_URL}/categories/c1`);
    expect(req.request.params.has('targetId')).toBe(false);
    req.flush({ message: 'ok', affectedTasks: 0 });
  });
});
