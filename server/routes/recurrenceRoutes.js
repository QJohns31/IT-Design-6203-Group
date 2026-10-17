// Recurring Task Management routes – Deborah Cody
const express = require('express');
const { asyncHandler } = require('../middleware/errors');
const { createRecurrenceController } = require('../controllers/recurrenceController');

module.exports = (models) => {
  const router = express.Router();
  const c = createRecurrenceController(models);
  router.get('/', asyncHandler(c.list));
  router.get('/:id/occurrences', asyncHandler(c.occurrences));
  router.get('/:id', asyncHandler(c.getOne));
  router.post('/', asyncHandler(c.create));
  router.put('/:id', asyncHandler(c.update));
  router.delete('/:id', asyncHandler(c.remove));
  return router;
};
