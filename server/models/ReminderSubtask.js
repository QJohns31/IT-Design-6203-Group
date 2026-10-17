// Reminder & Subtask Management – Lakshmi Pranathi Priya Ega
// One collection holds both item types, distinguished by the `type` field.
// Schema pattern adapted from the Mongoose guide: https://mongoosejs.com/docs/guide.html
const mongoose = require('mongoose');

const reminderSubtaskSchema = new mongoose.Schema(
  {
    // Relationship to the Task component (parent task ID)
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    type: { type: String, enum: ['reminder', 'subtask'], required: true },
    text: { type: String, required: true, trim: true, maxlength: 200 },
    remindAt: { type: Date, default: null }, // used when type === 'reminder'
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reminderSubtaskSchema.index({ taskId: 1, type: 1 });

module.exports = mongoose.model('ReminderSubtask', reminderSubtaskSchema);
