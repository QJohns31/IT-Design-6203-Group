// Recurring Task Management – Deborah Cody
// Schema pattern adapted from the Mongoose guide: https://mongoosejs.com/docs/guide.html
const mongoose = require('mongoose');

const recurrenceRuleSchema = new mongoose.Schema(
  {
    // Relationship to the Task component; one rule per task
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, unique: true },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
    interval: { type: Number, default: 1, min: 1, max: 365 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RecurrenceRule', recurrenceRuleSchema);
