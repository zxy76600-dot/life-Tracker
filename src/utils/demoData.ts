import { format, subDays } from 'date-fns';
import type { Habit, Goal, MoodEntry, Workout, DailyHealth, Transaction } from '../types';

export function loadDemoData() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const d1 = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const d2 = format(subDays(new Date(), 2), 'yyyy-MM-dd');
  const d3 = format(subDays(new Date(), 3), 'yyyy-MM-dd');
  const d4 = format(subDays(new Date(), 4), 'yyyy-MM-dd');
  const d5 = format(subDays(new Date(), 5), 'yyyy-MM-dd');
  const d6 = format(subDays(new Date(), 6), 'yyyy-MM-dd');

  const habits: Habit[] = [
    {
      id: 'demo-h1',
      name: 'Morning Meditation (10 mins)',
      icon: 'check-square',
      color: 'purple',
      frequency: 'daily',
      createdAt: d6,
      completedDates: [today, d1, d2, d3, d4],
    },
    {
      id: 'demo-h2',
      name: 'Read 20 pages of a book',
      icon: 'check-square',
      color: 'blue',
      frequency: 'daily',
      createdAt: d6,
      completedDates: [today, d1, d2, d3, d4, d5, d6],
    },
    {
      id: 'demo-h3',
      name: 'Drink 2.5 Liters of water',
      icon: 'check-square',
      color: 'cyan',
      frequency: 'daily',
      createdAt: d6,
      completedDates: [today, d1, d2],
    },
    {
      id: 'demo-h4',
      name: 'No screens 1hr before bed',
      icon: 'check-square',
      color: 'emerald',
      frequency: 'daily',
      createdAt: d6,
      completedDates: [d1, d2],
    },
  ];

  const goals: Goal[] = [
    {
      id: 'demo-g1',
      title: 'Master Modern Web Development',
      description: 'Build portfolio-ready applications using React, TypeScript and Tailwind CSS',
      category: 'learning',
      targetDate: format(subDays(new Date(), -60), 'yyyy-MM-dd'),
      createdAt: d6,
      completed: false,
      milestones: [
        { id: 'm1', title: 'Learn React fundamentals and hooks', completed: true },
        { id: 'm2', title: 'Build a responsive personal dashboard', completed: true },
        { id: 'm3', title: 'Add animations and persistent state', completed: true },
        { id: 'm4', title: 'Deploy live on Vercel or Netlify', completed: false },
      ],
    },
    {
      id: 'demo-g2',
      title: 'Run a 10K Race',
      description: 'Complete my first 10-kilometer outdoor marathon in under 55 minutes',
      category: 'fitness',
      targetDate: format(subDays(new Date(), -90), 'yyyy-MM-dd'),
      createdAt: d6,
      completed: false,
      milestones: [
        { id: 'm5', title: 'Run continuous 3K without stopping', completed: true },
        { id: 'm6', title: 'Achieve 5K under 28 minutes', completed: true },
        { id: 'm7', title: 'Long run weekend: 8K trail', completed: false },
        { id: 'm8', title: 'Race day 10K registration', completed: false },
      ],
    },
    {
      id: 'demo-g3',
      title: 'Save $5,000 Emergency Fund',
      description: 'Keep a safety cushion of 3 months living expenses in high-yield savings',
      category: 'finance',
      targetDate: format(subDays(new Date(), -180), 'yyyy-MM-dd'),
      createdAt: d6,
      completed: false,
      milestones: [
        { id: 'm9', title: 'Automate weekly transfers of $150', completed: true },
        { id: 'm10', title: 'Reach first $2,500 milestone', completed: true },
        { id: 'm11', title: 'Hit full $5,000 target', completed: false },
      ],
    },
  ];

  const moodEntries: MoodEntry[] = [
    { id: 'demo-m1', date: today, mood: 5, note: 'Had a super productive coding session! Feeling energized.', tags: ['productive', 'happy'] },
    { id: 'demo-m2', date: d1, mood: 4, note: 'Good workout, finished reading chapter 4.', tags: ['relaxed'] },
    { id: 'demo-m3', date: d2, mood: 4, note: 'Balanced day with work and evening walk.', tags: ['calm'] },
    { id: 'demo-m4', date: d3, mood: 3, note: 'A bit tired after meetings, but okay overall.', tags: ['work'] },
    { id: 'demo-m5', date: d4, mood: 5, note: 'Weekend road trip with close friends!', tags: ['friends', 'outdoors'] },
    { id: 'demo-m6', date: d5, mood: 4, note: 'Great sleep and healthy meals.', tags: ['healthy'] },
    { id: 'demo-m7', date: d6, mood: 4, note: 'Set weekly goals and planned projects.', tags: ['planning'] },
  ];

  const workouts: Workout[] = [
    { id: 'demo-w1', name: '5K Sunset Run', type: 'cardio', duration: 32, calories: 340, date: today, notes: 'Felt great, smooth pace' },
    { id: 'demo-w2', name: 'Upper Body & Core', type: 'strength', duration: 45, calories: 290, date: d1, notes: 'Bench press and pullups' },
    { id: 'demo-w3', name: 'Vinyasa Flow Yoga', type: 'flexibility', duration: 25, calories: 120, date: d3, notes: 'Focus on breathing' },
  ];

  const dailyHealth: DailyHealth[] = [
    { date: today, sleepHours: 7.5, waterGlasses: 6 },
    { date: d1, sleepHours: 8.0, waterGlasses: 8 },
  ];

  const transactions: Transaction[] = [
    { id: 'demo-t1', type: 'income', amount: 3800, category: 'Salary', description: 'Monthly Tech Salary', date: today },
    { id: 'demo-t2', type: 'income', amount: 550, category: 'Freelance', description: 'Website Redesign Project', date: d2 },
    { id: 'demo-t3', type: 'expense', amount: 145, category: 'Food & Dining', description: 'Weekly Organic Groceries', date: today },
    { id: 'demo-t4', type: 'expense', amount: 65, category: 'Utilities', description: 'High-speed Fiber Internet', date: d1 },
    { id: 'demo-t5', type: 'expense', amount: 48, category: 'Transportation', description: 'Gas refill', date: d3 },
    { id: 'demo-t6', type: 'expense', amount: 120, category: 'Entertainment', description: 'Concert tickets', date: d4 },
    { id: 'demo-t7', type: 'expense', amount: 35, category: 'Healthcare', description: 'Vitamins & Supplements', date: d5 },
  ];

  localStorage.setItem('life-tracker-habits', JSON.stringify({ state: { habits }, version: 0 }));
  localStorage.setItem('life-tracker-goals', JSON.stringify({ state: { goals }, version: 0 }));
  localStorage.setItem('life-tracker-mood', JSON.stringify({ state: { entries: moodEntries }, version: 0 }));
  localStorage.setItem('life-tracker-fitness', JSON.stringify({ state: { workouts, dailyHealth }, version: 0 }));
  localStorage.setItem('life-tracker-finances', JSON.stringify({ state: { transactions }, version: 0 }));
}
