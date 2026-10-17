// OpenWeatherMap (third-party API) service – calls our Express proxy, which holds the API key.
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../api.config';
import { WeatherResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private http = inject(HttpClient);

  getForecast(city: string, date?: string, units: 'metric' | 'imperial' = 'metric'): Observable<WeatherResponse> {
    let params = new HttpParams().set('city', city).set('units', units);
    if (date) params = params.set('date', date);
    return this.http.get<WeatherResponse>(`${API_URL}/weather`, { params });
  }
}
