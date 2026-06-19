export interface NoteItem {
  id: string;
  text: string;
  checked: boolean;
  parentId?: string | null;
  children?: NoteItem[];
  collapsed?: boolean;
  depth?: number;
}

export type NoteType =
  | 'text'
  | 'checklist'
  | 'task'
  | 'habit'
  | 'vision'
  | '3-5-year-goal'
  | 'annual-goal'
  | 'quarterly-goal'
  | 'monthly-goal'
  | 'weekly-goal'
  | 'daily-goal'
  | 'project'; // New type for overarching projects

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'not_done';
export type CompletionRating = 'none' | 'orange' | 'yellow' | 'lightgreen' | 'darkgreen';

export interface Note {
  id: string;
  title: string;
  content: string;
  items: NoteItem[];
  type: NoteType;
  color: NoteColor;
  labels: string[];
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  reminder?: string;
  taskId?: string; // Google Tasks ID
  createdAt: string;
  updatedAt: string;
  templateId?: string;

  // New fields for hierarchy, progress, dependencies, and habits
  parentId?: string | null;          // UUID of parent note (goal/project)
  dependOn?: string[];               // array of note IDs that must be done first
  progress?: number;                 // 0-100 % (manual for goals/tasks, auto for checklists)
  status: TaskStatus;                // 'pending', 'in_progress', 'completed', 'not_done'
  completedRating?: CompletionRating; // 'orange', 'yellow', 'lightgreen', 'darkgreen'
  startDate?: string;                // ISO date (planned start)
  dueDate?: string;                  // ISO date (planned due)
  completedAt?: string;              // ISO timestamp when marked done
  recurrence?: {                     // for habits & repeating goals
    rule: string;                    // e.g. "FREQ=DAILY;INTERVAL=1"
    until?: string;
  };
  streak?: number;                   // current habit streak
  bestStreak?: number;
  rollupProgress?: number;           // computed from children (0-100)
  autoCompleteChildren?: boolean;    // Option for goals to auto-complete children
}

export interface NoteTemplate {
  id: string;
  name: string;
  title: string;
  content: string;
  items: NoteItem[];
  type: NoteType;
  color: NoteColor;
  labels: string[];
  createdAt: string;
  parentId?: string;
  dependOn?: string[];
  progress?: number;
  status: TaskStatus;
  completedRating?: CompletionRating;
  startDate?: string;
  dueDate?: string;
  recurrence?: {
    rule: string;
    until?: string;
  };
}

export type NoteColor =
  | 'white' | 'red' | 'orange' | 'yellow' | 'green' | 'teal'
  | 'blue' | 'darkblue' | 'purple' | 'pink' | 'brown' | 'gray';

export const COLOR_MAP: Record<NoteColor, string> = {
  white: '#ffffff',
  red: '#f28b82',
  orange: '#fbbc04',
  yellow: '#fff475',
  green: '#ccff90',
  teal: '#a7ffeb',
  blue: '#cbf0f8',
  darkblue: '#aecbfa',
  purple: '#d7aefb',
  pink: '#fdcfe8',
  brown: '#e6c9a8',
  gray: '#e8eaed',
};

export const COLOR_NAMES: Record<NoteColor, string> = {
  white: 'Default',
  red: 'Red',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  teal: 'Teal',
  blue: 'Blue',
  darkblue: 'Dark Blue',
  purple: 'Purple',
  pink: 'Pink',
  brown: 'Brown',
  gray: 'Gray',
};

// Colors for task completion ratings
export const RATING_COLORS: Record<CompletionRating, string> = {
  none: '#e8eaed', // Default gray
  orange: '#fbbc04',
  yellow: '#fff475',
  lightgreen: '#ccff90',
  darkgreen: '#1a73e8', // Keep blue for 'darkgreen'
};

export const USER_LABELS = [
  '00. Templates',
  '00a. Daily Pressing Needs',
  '00a Gratitude Lists',
  '00b. Daily Important Events & Appointments',
  '00d. Daily Priorities',
  '01. Goals & Plans',
  '02. Readiness (Educ., Skills, & Traits)',
  '03. Wellness Indicators',
  '04. Execution',
  '05. Overcoming',
  '06. Performance Tracking',
  '07. Guidance & Oversight',
  '08. Spiritual',
  '08a. Conversion',
  '08b. Character',
  '08c. Doctrinal Purity',
  '09. Material',
  '09a. Basic Needs',
  '09b. Safety & Health Needs',
  '09c. Relational Needs',
  '09d. Achievements Needs',
  '09e. Self-Expression Needs',
  '10. Financial',
  '10a. Income Generation & Management',
  '10b. Financial Stewardship',
  '10c. Budgeting',
  '10d. Spending Tracking',
  '10e. Net Worth Statement',
  '10f. Credit Management',
  '10g. Tithes & Offerings',
  '10h. True Riches',
  '12. Business',
  '12a. Product Development',
  '12b. Marketing',
  '12c. Sales',
  '12d. Order Fulfillment',
  '12e. Customer Support',
  '12f. Customer Satisfaction',
  '12g. Customer Success',
  '12g. Finance Management',
  '12h. Human Resources Management',
  '12i. Operations Management',
  '12j. Strategic Management',
  '12k. Admin Operations',
  '12l. Legal Affairs',
  '12m. Corporate Governance',
  '13. Project Reference Materials',
  '14. General Reference Material',
];

export const DEFAULT_TEMPLATES: Omit<NoteTemplate, 'id' | 'createdAt'>[] = [
  {
    name: '10 Daily Questions',
    title: '10 Daily Questions',
    content: '1. What did I learn today?\n2. What am I grateful for?\n3. What did I struggle with?\n4. How did I serve others?\n5. What will I do differently tomorrow?\n6. How did I grow spiritually?\n7. What relationships did I invest in?\n8. How was my health today?\n9. What progress did I make on my goals?\n10. Am I aligned with my core values?',
    items: [],
    type: 'daily-goal', // Changed from text to daily-goal
    color: 'yellow',
    labels: ['00. Templates'],
    status: 'pending', // Default status
  },
  {
    name: 'Daily Priorities',
    title: 'Daily Priorities',
    content: '**Spiritual:** \n\n**Material:** \n\n**Financial:** \n\n**Business:** \n\n**Personal:** \n',
    items: [],
    type: 'daily-goal', // Changed from text to daily-goal
    color: 'blue',
    labels: ['00d. Daily Priorities'],
    status: 'pending',
  },
  {
    name: 'Gratitude List',
    title: 'Gratitude List',
    content: '**Spiritual:** \n\n**Material:** \n\n**Relational:** \n\n**Financial:** \n\n**Health:** \n',
    items: [],
    type: 'text',
    color: 'green',
    labels: ['00a Gratitude Lists'],
    status: 'pending',
  },
  {
    name: 'Pressing Needs',
    title: 'Pressing Needs',
    content: '**Urgent & Important:** \n\n**Important but Not Urgent:** \n\n**Urgent but Not Important:** \n\n**Delegate:** \n',
    items: [],
    type: 'checklist', // Changed to checklist
    color: 'red',
    labels: ['00a. Daily Pressing Needs'],
    status: 'pending',
  },
  {
    name: 'Weekly Plan',
    title: 'Weekly Plan',
    content: '**Goals:** \n\n**Key Actions:** \n\n**Appointments:** \n\n**Review Points:** \n',
    items: [],
    type: 'weekly-goal', // Changed from text to weekly-goal
    color: 'purple',
    labels: ['01. Goals & Plans'],
    status: 'pending',
  },
  {
    name: 'Quarterly Review',
    title: 'Quarterly Review',
    content: '**Wins:** \n\n**Challenges:** \n\n**Metrics:** \n\n**Next Quarter Focus:** \n\n**Adjustments:** \n',
    items: [],
    type: 'quarterly-goal', // Changed from text to quarterly-goal
    color: 'darkblue',
    labels: ['06. Performance Tracking'],
    status: 'pending',
  },
  // New templates for the hierarchy
  {
    name: 'Vision & Mission',
    title: 'My Life Vision & Mission',
    content: 'Define your ultimate purpose and guiding principles.',
    items: [],
    type: 'vision',
    color: 'white',
    labels: [],
    status: 'pending',
  },
  {
    name: '3-5 Year Goal',
    title: 'New 3-5 Year Goal',
    content: 'Break down your vision into actionable mid-term goals.',
    items: [],
    type: '3-5-year-goal',
    color: 'blue',
    labels: ['01. Goals & Plans'],
    status: 'pending',
  },
  {
    name: 'Annual Goal',
    title: 'New Annual Goal',
    content: 'What do you want to achieve this year?',
    items: [],
    type: 'annual-goal',
    color: 'teal',
    labels: ['01. Goals & Plans'],
    status: 'pending',
  },
  {
    name: 'Project',
    title: 'New Project',
    content: 'A series of tasks leading to a specific outcome.',
    items: [],
    type: 'project',
    color: 'gray',
    labels: ['02. Readiness (Educ., Skills, & Traits)'], // Example label
    status: 'pending',
  },
  {
    name: 'Task',
    title: 'New Task',
    content: 'A single actionable item.',
    items: [],
    type: 'task',
    color: 'white',
    labels: ['04. Execution'],
    status: 'pending',
  },
  {
    name: 'Habit',
    title: 'New Habit',
    content: 'Track your daily habits.',
    items: [],
    type: 'habit',
    color: 'green',
    labels: ['03. Wellness Indicators'],
    status: 'pending',
    recurrence: { rule: 'FREQ=DAILY' },
  },
];
