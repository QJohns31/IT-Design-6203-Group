// Task Management routes – Quzhan Johnson
// Router usage per https://expressjs.com/en/guide/routing.html#express-router
const express = require('express');
const { asyncHandler } = require('../middleware/errors');
const { createTaskController } = require('../controllers/taskController');

module.exports = (models) => {
  const router = express.Router();
  const c = createTaskController(models);
  router.get('/', asyncHandler(c.list));
  router.get('/:id', asyncHandler(c.getOne));
  router.post('/', asyncHandler(c.create));
  router.put('/:id', asyncHandler(c.update));
  router.delete('/:id', asyncHandler(c.remove));
  return router;
};
