// Unit tests – weather route controller (third-party API wrapper)
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { call } = require('../helpers/fakeModel');
const { createWeatherController } = require('../../controllers/weatherController');
const { WeatherError } = require('../../utils/weatherService');

describe('Weather controller', () => {
  test('passes validated query to the forecast service', async () => {
    let received;
    const c = createWeatherController({ getForecast: async (q) => { received = q; return { available: true }; } });
    const r = await call(c.forecast, { query: { city: ' Nassau ', date: '2026-10-05' } });
    assert.equal(r.status, 200);
    assert.deepEqual(received, { city: 'Nassau', date: '2026-10-05', units: 'metric' });
  });

  test('missing city returns 400 without calling the API', async () => {
    let called = false;
    const c = createWeatherController({ getForecast: async () => { called = true; } });
    assert.equal((await call(c.forecast, { query: {} })).status, 400);
    assert.equal(called, false);
  });

  test('service errors become HTTP errors', async () => {
    const c = createWeatherController({ getForecast: async () => { throw new WeatherError('City "X" was not found.', 404); } });
    const r = await call(c.forecast, { query: { city: 'X' } });
    assert.equal(r.status, 404);
    assert.match(r.body.message, /not found/);
  });
});
