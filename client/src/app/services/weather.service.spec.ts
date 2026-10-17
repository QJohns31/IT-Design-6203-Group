// Unit tests – WeatherService (OpenWeatherMap third-party API, team-tested)
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WeatherService } from './weather.service';
import { API_URL } from '../api.config';

describe('WeatherService', () => {
  it('calls the Express weather proxy with city, date and units', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(WeatherService);
    const http = TestBed.inject(HttpTestingController);

    service.getForecast('Nassau', '2026-10-05').subscribe((w) => expect(w.city).toBe('Nassau'));
    const req = http.expectOne((r) => r.url === `${API_URL}/weather`);
    expect(req.request.params.get('city')).toBe('Nassau');
    expect(req.request.params.get('date')).toBe('2026-10-05');
    expect(req.request.params.get('units')).toBe('metric');
    req.flush({ city: 'Nassau', days: [] });
    http.verify();
  });
});
