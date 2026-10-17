// Weather forecast card – OpenWeatherMap third-party API (integrated by Quzhan Johnson,
// tested by the whole team). Shown inside Task Management for tasks with a location + due date.
import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { WeatherService } from '../services/weather.service';
import { WeatherResponse } from '../models/models';
import { errorMessage } from '../utils/task-utils';

@Component({
  selector: 'app-weather-widget',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './weather-widget.component.html',
  styleUrl: './weather-widget.component.css',
})
export class WeatherWidgetComponent implements OnChanges {
  @Input({ required: true }) city = '';
  @Input() date = ''; // YYYY-MM-DD
  @Input() units: 'metric' | 'imperial' = 'metric';

  private weatherService = inject(WeatherService);

  loading = signal(false);
  error = signal('');
  weather = signal<WeatherResponse | null>(null);

  ngOnChanges(): void {
    this.load();
  }

  get unitSymbol(): string {
    return this.units === 'imperial' ? '°F' : '°C';
  }

  load(): void {
    if (!this.city) return;
    this.loading.set(true);
    this.error.set('');
    this.weatherService.getForecast(this.city, this.date || undefined, this.units).subscribe({
      next: (data) => {
        this.weather.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.weather.set(null);
        this.loading.set(false);
      },
    });
  }
}
