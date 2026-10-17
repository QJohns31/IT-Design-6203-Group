// Unit tests – RecurrenceService (Deborah Cody)
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RecurrenceService } from './recurrence.service';
import { API_URL } from '../api.config';

describe('RecurrenceService', () => {
  let service: RecurrenceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RecurrenceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates a rule with POST', () => {
    service.createRule({ taskId: 't1', frequency: 'weekly', interval: 2, startDate: '2026-10-05' }).subscribe();
    const req = http.expectOne(`${API_URL}/recurrences`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.frequency).toBe('weekly');
    req.flush({});
  });

  it('requests a given number of occurrences', () => {
    service.getOccurrences('r1', 10).subscribe((res) => expect(res.occurrences.length).toBe(1));
    const req = http.expectOne((r) => r.url === `${API_URL}/recurrences/r1/occurrences`);
    expect(req.request.params.get('count')).toBe('10');
    req.flush({ id: 'r1', occurrences: ['2026-10-05T00:00:00.000Z'] });
  });
});
