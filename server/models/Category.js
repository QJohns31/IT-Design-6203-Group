// Category & List Management – Aderoju Okunlola
// Schema pattern adapted from the Mongoose guide: https://mongoosejs.com/docs/guide.html
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    color: { type: String, default: '#4f46e5', match: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i },
    icon: { type: String, default: '📁', maxlength: 8 },
    description: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

// Case-insensitive uniqueness for names such as "Work" and "work".
// Collation docs: https://www.mongodb.com/docs/manual/reference/collation/
categorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('Category', categorySchema);
