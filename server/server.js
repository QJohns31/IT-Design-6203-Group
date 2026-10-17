/**
 * Entry point: loads .env, connects to MongoDB with Mongoose, then starts Express.
 * Mongoose connection docs: https://mongoosejs.com/docs/connections.html
 * process.loadEnvFile (Node.js >= 20.12): https://nodejs.org/api/process.html#processloadenvfilepath
 */
try {
  process.loadEnvFile(); // reads ./.env if it exists
} catch {
  // No .env file – defaults below are used.
}

const mongoose = require('mongoose');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskflow';

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to MongoDB at ${MONGODB_URI}`);
    const app = createApp();
    app.listen(PORT, () => console.log(`Task Flow API listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
