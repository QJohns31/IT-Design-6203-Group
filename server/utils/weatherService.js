/**
 * OpenWeatherMap integration (project-level third-party API, hosted in Task Management).
 *
 * Uses the free "5 day / 3 hour forecast" endpoint:
 *   https://api.openweathermap.org/data/2.5/forecast?q={city}&appid={API key}&units=metric
 * Docs: https://openweathermap.org/forecast5
 * Icons: https://openweathermap.org/weather-conditions
 *
 * The API key never reaches the browser: Angular calls our Express route, and Express
 * calls OpenWeatherMap using the OPENWEATHER_API_KEY environment variable.
 *
 * `fetchFn` is injectable so the logic can be unit-tested without network access.
 */

const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

class WeatherError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'WeatherError';
    this.status = status;
  }
}

/** Converts a forecast entry's UTC timestamp into the city's local YYYY-MM-DD and hour. */
function localParts(dtSeconds, tzOffsetSeconds) {
  const local = new Date((dtSeconds + tzOffsetSeconds) * 1000);
  return { date: local.toISOString().slice(0, 10), hour: local.getUTCHours() };
}

/**
 * Groups the 3-hour entries into one summary per local calendar day.
 * The "representative" entry for icon/description is the one closest to 12:00 local time.
 */
function summarizeForecast(apiData) {
  const tz = (apiData.city && apiData.city.timezone) || 0;
  const byDate = new Map();

  for (const entry of apiData.list || []) {
    const { date, hour } = localParts(entry.dt, tz);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push({ ...entry, localHour: hour });
  }

  const days = [];
  for (const [date, entries] of byDate) {
    const temps = entries.map((e) => e.main.temp);
    const rep = entries.reduce((best, e) =>
      Math.abs(e.localHour - 12) < Math.abs(best.localHour - 12) ? e : best);
    const weather = (rep.weather && rep.weather[0]) || {};
    days.push({
      date,
      tempMin: Math.round(Math.min(...entries.map((e) => e.main.temp_min ?? e.main.temp))),
      tempMax: Math.round(Math.max(...entries.map((e) => e.main.temp_max ?? e.main.temp))),
      tempAvg: Math.round(temps.reduce((a, b) => a + b, 0) / temps.length),
      humidity: rep.main.humidity,
      windSpeed: rep.wind ? rep.wind.speed : null,
      chanceOfRain: Math.round(Math.max(...entries.map((e) => e.pop || 0)) * 100),
      main: weather.main || '',
      description: weather.description || '',
      icon: weather.icon || '',
      iconUrl: weather.icon ? `https://openweathermap.org/img/wn/${weather.icon}@2x.png` : '',
    });
  }
  return days;
}

/**
 * Fetches the forecast for a city and (optionally) picks out one date.
 * @returns {Promise<{city:string,country:string,units:string,requestedDate:string|null,
 *   available:boolean,message:string,forecast:object|null,days:object[]}>}
 */
async function getForecast({ city, date, units = 'metric' }, { apiKey = process.env.OPENWEATHER_API_KEY, fetchFn = fetch } = {}) {
  if (!apiKey) {
    throw new WeatherError('Weather service is not configured. Add OPENWEATHER_API_KEY to server/.env.', 503);
  }

  const url = `${FORECAST_URL}?q=${encodeURIComponent(city)}&units=${units}&appid=${apiKey}`;
  let response;
  try {
    response = await fetchFn(url);
  } catch (err) {
    throw new WeatherError('Could not reach OpenWeatherMap. Check your internet connection.', 502);
  }

  if (response.status === 404) throw new WeatherError(`City "${city}" was not found.`, 404);
  if (response.status === 401) throw new WeatherError('OpenWeatherMap rejected the API key (new keys can take a couple of hours to activate).', 502);
  if (!response.ok) throw new WeatherError(`OpenWeatherMap returned an error (HTTP ${response.status}).`, 502);

  const data = await response.json();
  const days = summarizeForecast(data);
  const target = date || (days[0] && days[0].date) || null;
  const forecast = days.find((d) => d.date === target) || null;

  let message = '';
  if (!forecast) {
    message = 'A forecast is only available for the next 5 days. Check again closer to the due date.';
  }

  return {
    city: data.city ? data.city.name : city,
    country: data.city ? data.city.country : '',
    units,
    requestedDate: date || null,
    available: Boolean(forecast),
    message,
    forecast,
    days,
  };
}

module.exports = { getForecast, summarizeForecast, localParts, WeatherError, FORECAST_URL };
