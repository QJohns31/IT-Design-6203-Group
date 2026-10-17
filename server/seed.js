/**
 * Optional: loads sample data so the app has something to show on first run.
 * Usage:  npm run seed        (WARNING: clears the four Task Flow collections first)
 */
try { process.loadEnvFile(); } catch { /* no .env */ }

const mongoose = require('mongoose');
const Category = require('./models/Category');
const Task = require('./models/Task');
const ReminderSubtask = require('./models/ReminderSubtask');
const RecurrenceRule = require('./models/RecurrenceRule');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskflow';

function daysFromToday(n) {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  await Promise.all([Category.deleteMany({}), Task.deleteMany({}), ReminderSubtask.deleteMany({}), RecurrenceRule.deleteMany({})]);

  const [work, personal, shopping] = await Category.create([
    { name: 'Work', color: '#2563eb', icon: '💼', description: 'Job and project tasks' },
    { name: 'Personal', color: '#16a34a', icon: '🏠', description: 'Home and life admin' },
    { name: 'Shopping', color: '#d97706', icon: '🛒', description: 'Things to buy' },
  ]);

  const [report, beach, groceries, standup] = await Task.create([
    { title: 'Finish IT6203 project report', description: 'Combine component write-ups', dueDate: daysFromToday(3), priority: 'High', status: 'In Progress', categoryId: work._id },
    { title: 'Beach clean-up volunteer day', description: 'Bring gloves and water', dueDate: daysFromToday(2), priority: 'Medium', status: 'Pending', categoryId: personal._id, location: 'Nassau' },
    { title: 'Weekly groceries', dueDate: daysFromToday(1), priority: 'Low', status: 'Pending', categoryId: shopping._id },
    { title: 'Team stand-up meeting', dueDate: daysFromToday(0), priority: 'Medium', status: 'Pending', categoryId: work._id },
  ]);

  await ReminderSubtask.create([
    { taskId: report._id, type: 'subtask', text: 'Write Task Management section', completed: true },
    { taskId: report._id, type: 'subtask', text: 'Add test results and screenshots' },
    { taskId: report._id, type: 'reminder', text: 'Submit on D2L', remindAt: daysFromToday(3) },
    { taskId: groceries._id, type: 'subtask', text: 'Milk' },
    { taskId: groceries._id, type: 'subtask', text: 'Bread' },
  ]);

  await RecurrenceRule.create([
    { taskId: groceries._id, frequency: 'weekly', interval: 1, startDate: daysFromToday(1) },
    { taskId: standup._id, frequency: 'daily', interval: 1, startDate: daysFromToday(0), endDate: daysFromToday(30) },
  ]);

  console.log(`Seeded 3 categories, 4 tasks, 5 reminders/subtasks and 2 recurrence rules into ${MONGODB_URI}`);
  console.log(`(beach task "${beach.title}" has location Nassau for the weather demo)`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
