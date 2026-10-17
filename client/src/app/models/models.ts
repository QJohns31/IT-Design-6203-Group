// Shared TypeScript interfaces mirroring the Mongoose schemas on the server.

export type Priority = 'Low' | 'Medium' | 'High';
export type Status = 'Pending' | 'In Progress' | 'Completed';
export type ItemType = 'reminder' | 'subtask';
export type Frequency = 'daily' | 'weekly' | 'monthly';

/** Task Management – Quzhan Johnson */
export interface Task {
  _id: string;
  title: string;
  description: string;
  dueDate: string | null; // ISO string, date-only stored as UTC midnight
  priority: Priority;
  status: Status;
  categoryId: string | null;
  location: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Category & List Management – Aderoju Okunlola */
export interface Category {
  _id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  taskCount?: number;
  tasks?: Task[];
}

export interface CategoryListResponse {
  categories: Category[];
  uncategorizedCount: number;
}

export type CategoryDeleteMode = 'unassign' | 'reassign' | 'delete';

/** Reminder & Subtask Management – Lakshmi Pranathi Priya Ega */
export interface ReminderSubtask {
  _id: string;
  taskId: string;
  type: ItemType;
  text: string;
  remindAt: string | null;
  completed: boolean;
}

export interface ItemListResponse {
  items: ReminderSubtask[];
  progress: { subtasksTotal: number; subtasksDone: number; percent: number };
}

/** Recurring Task Management – Deborah Cody */
export interface RecurrenceRule {
  _id: string;
  taskId: string;
  frequency: Frequency;
  interval: number;
  startDate: string;
  endDate: string | null;
  active: boolean;
  summary?: string;
  nextOccurrences?: string[];
}

/** OpenWeatherMap (third-party API) – shape returned by GET /api/weather */
export interface WeatherDay {
  date: string;
  tempMin: number;
  tempMax: number;
  tempAvg: number;
  humidity: number;
  windSpeed: number | null;
  chanceOfRain: number;
  main: string;
  description: string;
  icon: string;
  iconUrl: string;
}

export interface WeatherResponse {
  city: string;
  country: string;
  units: 'metric' | 'imperial';
  requestedDate: string | null;
  available: boolean;
  message: string;
  forecast: WeatherDay | null;
  days: WeatherDay[];
}

/** Error body returned by the Express error handler */
export interface ApiError {
  message: string;
  details?: string[];
}
