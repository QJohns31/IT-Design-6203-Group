// Unit tests – OpenWeatherMap integration logic (network is mocked)
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { getForecast, summarizeForecast } = require('../../utils/weatherService');

// Two days of 3-hour entries shaped like the real /data/2.5/forecast response
const sample = {
  cod: '200',
  city: { name: 'Nassau', country: 'BS', timezone: -14400 }, // UTC-4
  list: [
    { dt: Date.UTC(2026, 9, 5, 12) / 1000, main: { temp: 27, temp_min: 26, temp_max: 27, humidity: 70 }, weather: [{ main: 'Clouds', description: 'scattered clouds', icon: '03d' }], wind: { speed: 4 }, pop: 0.1 },
    { dt: Date.UTC(2026, 9, 5, 15) / 1000, main: { temp: 30, temp_min: 29, temp_max: 31, humidity: 60 }, weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }], wind: { speed: 5 }, pop: 0.3 },
    { dt: Date.UTC(2026, 9, 6, 15) / 1000, main: { temp: 28, temp_min: 27, temp_max: 29, humidity: 80 }, weather: [{ main: 'Rain', description: 'light rain', icon: '10d' }], wind: { speed: 6 }, pop: 0.8 },
  ],
};
const okFetch = async () => ({ ok: true, status: 200, json: async () => sample });

describe('weatherService', () => {
  test('summarizeForecast groups entries by the city\'s local date', () => {
    const days = summarizeForecast(sample);
    assert.deepEqual(days.map((d) => d.date), ['2026-10-05', '2026-10-06']);
    const first = days[0];
    assert.equal(first.tempMin, 26);
    assert.equal(first.tempMax, 31);
    assert.equal(first.chanceOfRain, 30);
    // 12:00 local (16:00 UTC) is closest to the 15:00 UTC entry = 11:00 local
    assert.equal(first.description, 'clear sky');
    assert.equal(first.iconUrl, 'https://openweathermap.org/img/wn/01d@2x.png');
  });

  test('getForecast returns the requested date', async () => {
    let calledUrl = '';
    const result = await getForecast({ city: 'Nassau', date: '2026-10-06', units: 'metric' }, {
      apiKey: 'KEY', fetchFn: async (url) => { calledUrl = url; return okFetch(); },
    });
    assert.ok(calledUrl.startsWith('https://api.openweathermap.org/data/2.5/forecast?q=Nassau&units=metric&appid=KEY'));
    assert.equal(result.available, true);
    assert.equal(result.forecast.main, 'Rain');
    assert.equal(result.country, 'BS');
  });

  test('getForecast explains when the date is beyond the 5-day window', async () => {
    const result = await getForecast({ city: 'Nassau', date: '2026-12-25' }, { apiKey: 'KEY', fetchFn: okFetch });
    assert.equal(result.available, false);
    assert.match(result.message, /next 5 days/);
    assert.equal(result.days.length, 2);
  });

  test('missing API key gives HTTP 503', async () => {
    await assert.rejects(getForecast({ city: 'Nassau' }, { apiKey: '', fetchFn: okFetch }), { status: 503 });
  });

  test('unknown city gives HTTP 404', async () => {
    const notFound = async () => ({ ok: false, status: 404, json: async () => ({ cod: '404', message: 'city not found' }) });
    await assert.rejects(getForecast({ city: 'Atlantis' }, { apiKey: 'KEY', fetchFn: notFound }), { status: 404 });
  });

  test('network failure gives HTTP 502', async () => {
    const down = async () => { throw new Error('ECONNREFUSED'); };
    await assert.rejects(getForecast({ city: 'Nassau' }, { apiKey: 'KEY', fetchFn: down }), { status: 502 });
  });
});
