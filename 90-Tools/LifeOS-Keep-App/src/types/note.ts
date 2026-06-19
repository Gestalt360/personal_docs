export interface NoteItem {
  id: string;
  text: string;
  checked: boolean;
  parentId?: string | null;
  children?: NoteItem[];
  collapsed?: boolean;
  depth?: number;
}

export type NoteColor =
  | 'white' | 'red' | 'orange' | 'yellow' | 'green' | 'teal'
  | 'blue' | 'darkblue' | 'purple' | 'pink' | 'brown' | 'gray';

export interface Note {
  id: string;
  title: string;
  content: string;
  items: NoteItem[];
  type: 'text' | 'checklist';
  color: NoteColor;
  labels: string[];
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  reminder?: string;
  taskId?: string; // Google Tasks ID
  createdAt: string;
  updatedAt: string;
}

export interface NoteTemplate {
  id: string;
  name: string;
  title: string;
  content: string;
  items: NoteItem[];
  type: 'text' | 'checklist';
  color: NoteColor;
  labels: string[];
  createdAt: string;
}

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
    type: 'text',
    color: 'yellow',
    labels: ['00. Templates'],
  },
  {
    name: 'Daily Priorities',
    title: 'Daily Priorities',
    content: '**Spiritual:** \n\n**Material:** \n\n**Financial:** \n\n**Business:** \n\n**Personal:** \n',
    items: [],
    type: 'text',
    color: 'blue',
    labels: ['00d. Daily Priorities'],
  },
  {
    name: 'Gratitude List',
    title: 'Gratitude List',
    content: '**Spiritual:** \n\n**Material:** \n\n**Relational:** \n\n**Financial:** \n\n**Health:** \n',
    items: [],
    type: 'text',
    color: 'green',
    labels: ['00a Gratitude Lists'],
  },
  {
    name: 'Pressing Needs',
    title: 'Pressing Needs',
    content: '**Urgent & Important:** \n\n**Important but Not Urgent:** \n\n**Urgent but Not Important:** \n\n**Delegate:** \n',
    items: [],
    type: 'text',
    color: 'red',
    labels: ['00a. Daily Pressing Needs'],
  },
  {
    name: 'Weekly Plan',
    title: 'Weekly Plan',
    content: '**Goals:** \n\n**Key Actions:** \n\n**Appointments:** \n\n**Review Points:** \n',
    items: [],
    type: 'text',
    color: 'purple',
    labels: ['01. Goals & Plans'],
  },
  {
    name: 'Quarterly Review',
    title: 'Quarterly Review',
    content: '**Wins:** \n\n**Challenges:** \n\n**Metrics:** \n\n**Next Quarter Focus:** \n\n**Adjustments:** \n',
    items: [],
    type: 'text',
    color: 'darkblue',
    labels: ['06. Performance Tracking'],
  },
];
