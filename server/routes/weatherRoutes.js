// OpenWeatherMap proxy route (project-level third-party API)
const express = require('express');
const { asyncHandler } = require('../middleware/errors');
const { createWeatherController } = require('../controllers/weatherController');

module.exports = (deps) => {
  const router = express.Router();
  const c = createWeatherController(deps);
  router.get('/', asyncHandler(c.forecast));
  return router;
};
