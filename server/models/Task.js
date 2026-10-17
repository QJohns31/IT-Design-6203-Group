// Task Management – Quzhan Johnson
// Schema pattern adapted from the Mongoose guide: https://mongoosejs.com/docs/guide.html
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 1000 },
    dueDate: { type: Date, default: null },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
    // Relationship to the Category component (shared database, linked by ID)
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    // Optional city used for the OpenWeatherMap forecast
    location: { type: String, default: '', trim: true, maxlength: 100 },
  },
  { timestamps: true }
);

taskSchema.index({ categoryId: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
