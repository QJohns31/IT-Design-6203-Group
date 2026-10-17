/**
 * Weather controller – OpenWeatherMap third-party API (integrated by Quzhan Johnson,
 * tested by the whole team). The forecast lookup function is injectable for testing.
 */
const { HttpError } = require('../middleware/errors');
const { validateWeatherQuery } = require('../utils/validators');
const { assertValid } = require('./helpers');
const weatherService = require('../utils/weatherService');

function createWeatherController({ getForecast = weatherService.getForecast } = {}) {
  /** GET /api/weather?city=Nassau&date=YYYY-MM-DD&units=metric|imperial */
  async function forecast(req, res) {
    const { errors, value } = validateWeatherQuery(req.query);
    assertValid(errors);
    try {
      res.json(await getForecast(value));
    } catch (err) {
      if (err instanceof weatherService.WeatherError) throw new HttpError(err.status, err.message);
      throw err;
    }
  }
  return { forecast };
}

module.exports = { createWeatherController };
