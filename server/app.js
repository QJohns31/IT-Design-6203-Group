/**
 * Builds the Express application (without starting it) so tests can create
 * an instance against a test database.
 * Express basics: https://expressjs.com/en/starter/hello-world.html
 * CORS middleware: https://expressjs.com/en/resources/middleware/cors.html
 */
const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/errors');

const defaultModels = () => ({
  Task: require('./models/Task'),
  Category: require('./models/Category'),
  ReminderSubtask: require('./models/ReminderSubtask'),
  RecurrenceRule: require('./models/RecurrenceRule'),
});

function createApp({ models = defaultModels(), weather = {} } = {}) {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:4200' }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  app.use('/api/tasks', require('./routes/taskRoutes')(models));            // Quzhan Johnson
  app.use('/api/categories', require('./routes/categoryRoutes')(models));   // Aderoju Okunlola
  app.use('/api/items', require('./routes/reminderSubtaskRoutes')(models)); // Lakshmi Pranathi Priya Ega
  app.use('/api/recurrences', require('./routes/recurrenceRoutes')(models)); // Deborah Cody
  app.use('/api/weather', require('./routes/weatherRoutes')(weather));      // OpenWeatherMap

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
