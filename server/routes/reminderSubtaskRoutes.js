// Reminder & Subtask Management routes – Lakshmi Pranathi Priya Ega
const express = require('express');
const { asyncHandler } = require('../middleware/errors');
const { createReminderSubtaskController } = require('../controllers/reminderSubtaskController');

module.exports = (models) => {
  const router = express.Router();
  const c = createReminderSubtaskController(models);
  router.get('/', asyncHandler(c.list));
  router.get('/:id', asyncHandler(c.getOne));
  router.post('/', asyncHandler(c.create));
  router.put('/:id', asyncHandler(c.update));
  router.patch('/:id/toggle', asyncHandler(c.toggle));
  router.delete('/:id', asyncHandler(c.remove));
  return router;
};
