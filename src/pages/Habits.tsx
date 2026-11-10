import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Check, Trash2, Flame } from 'lucide-react';
import { Card, Button, Input, Modal, EmptyState, Badge } from '../components/ui';
import { useHabitStore } from '../stores/habitStore';
import { calculateStreak, getTodayStr } from '../utils/helpers';

/**
 * Habits Page — Track daily habits with streaks.
 * Supports white and true black themes.
 */

const HABIT_COLORS = ['blue', 'emerald', 'purple', 'amber', 'red', 'cyan'];

export default function Habits() {
  const shouldReduceMotion = useReducedMotion();
  const { habits, addHabit, removeHabit, toggleHabitCompletion } = useHabitStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');
  const today = getTodayStr();

  const handleAddHabit = () => {
    if (newHabitName.trim()) {
      addHabit({
        name: newHabitName.trim(),
        icon: 'check-square',
        color: selectedColor,
        frequency: 'daily',
      });
      setNewHabitName('');
      setSelectedColor('blue');
      setIsModalOpen(false);
    }
  };

  const completedToday = habits.filter((h) => h.completedDates.includes(today)).length;
  const completionRate = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header with stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink">Daily rhythm</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-app-ink">Habits</h2>
          <p className="mt-1 text-sm text-app-subtle"><span className="font-semibold text-app-ink">{completedToday} of {habits.length}</span> completed today · {completionRate}%</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Add Habit
        </Button>
      </div>

      {/* Habits List */}
      {habits.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No habits yet"
          description="Start building good habits! Add your first habit to begin tracking."
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus size={18} />
              Create First Habit
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {habits.map((habit) => {
              const isCompleted = habit.completedDates.includes(today);
              const streak = calculateStreak(habit.completedDates);

              const colorMap: Record<string, { bg: string; edge: string; tint: string }> = {
                blue: { bg: 'bg-cat-blue', edge: 'border-l-cat-blue', tint: 'bg-cat-blue/10 text-cat-blue' },
                emerald: { bg: 'bg-cat-green', edge: 'border-l-cat-green', tint: 'bg-cat-green/10 text-cat-green-ink' },
                purple: { bg: 'bg-cat-indigo', edge: 'border-l-cat-indigo', tint: 'bg-cat-indigo/10 text-cat-indigo' },
                amber: { bg: 'bg-cat-amber', edge: 'border-l-cat-amber', tint: 'bg-cat-amber/10 text-cat-amber-ink' },
                red: { bg: 'bg-accent-contrast', edge: 'border-l-accent', tint: 'bg-accent/10 text-app-ink' },
                cyan: { bg: 'bg-cat-teal', edge: 'border-l-cat-teal', tint: 'bg-cat-teal/10 text-cat-teal-ink' },
              };

              const colors = colorMap[habit.color] ?? colorMap.blue;

              return (
                <motion.div
                  key={habit.id}
                  layout={!shouldReduceMotion}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, x: -40 }}
                >
                  <Card hover className={`border-l-4 p-4 sm:p-5 ${colors.edge}`}>
                    <div className="flex items-center gap-3 sm:gap-4">
                      {/* Completion checkbox */}
                      <button
                        onClick={() => toggleHabitCompletion(habit.id)}
                        className={`
                          flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 cursor-pointer
                          transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-app-card
                          ${isCompleted
                            ? `${colors.bg} border-transparent text-white shadow-card`
                            : 'border-app-border bg-app-card text-transparent hover:border-accent/60'
                          }
                        `}
                        aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        <Check size={20} className={isCompleted ? 'text-white' : ''} />
                      </button>

                      {/* Habit info */}
                      <div className="flex-1">
                        <h3
                          className={`font-semibold ${
                            isCompleted ? 'text-app-subtle line-through' : 'text-app-ink'
                          }`}
                        >
                          {habit.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-2">
                          {streak > 0 && (
                            <Badge variant={habit.color === 'amber' ? 'amber' : 'emerald'} className={colors.tint}>
                              <Flame size={12} className="mr-1" aria-hidden="true" />
                              {streak} day streak
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHabit(habit.id)}
                        aria-label="Delete habit"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Habit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Habit">
        <div className="space-y-4">
          <Input
            label="Habit Name"
            placeholder="e.g., Meditate for 10 minutes"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
            autoFocus
          />

          {/* Color picker */}
          <div>
            <label className="mb-2 block text-sm font-medium text-app-ink">
              Color
            </label>
            <div className="flex gap-2">
              {HABIT_COLORS.map((color) => {
                const bgMap: Record<string, string> = {
                  blue: 'bg-cat-blue',
                  emerald: 'bg-cat-green',
                  purple: 'bg-cat-indigo',
                  amber: 'bg-cat-amber',
                  red: 'bg-accent',
                  cyan: 'bg-cat-teal',
                };
                return (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    type="button"
                    aria-pressed={selectedColor === color}
                    className={`h-9 w-9 rounded-full ${bgMap[color]} transition-opacity motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-app-card cursor-pointer
                      ${selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-app-card shadow-card' : 'opacity-60 hover:opacity-100'}
                    `}
                    aria-label={`Select ${color} color`}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddHabit} disabled={!newHabitName.trim()}>
              Add Habit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
