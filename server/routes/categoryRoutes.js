// Category & List Management routes – Aderoju Okunlola
const express = require('express');
const { asyncHandler } = require('../middleware/errors');
const { createCategoryController } = require('../controllers/categoryController');

module.exports = (models) => {
  const router = express.Router();
  const c = createCategoryController(models);
  router.get('/', asyncHandler(c.list));
  router.get('/:id', asyncHandler(c.getOne));
  router.post('/', asyncHandler(c.create));
  router.put('/:id', asyncHandler(c.update));
  router.delete('/:id', asyncHandler(c.remove));
  return router;
};
