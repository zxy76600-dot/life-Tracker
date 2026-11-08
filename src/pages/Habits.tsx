import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {completedToday} of {habits.length} completed today ({completionRate}%)
          </p>
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

              const colorMap: Record<string, { bg: string; border: string; text: string }> = {
                blue: { bg: 'bg-blue-500', border: 'border-blue-500/30', text: 'text-blue-500' },
                emerald: { bg: 'bg-emerald-500', border: 'border-emerald-500/30', text: 'text-emerald-500' },
                purple: { bg: 'bg-purple-500', border: 'border-purple-500/30', text: 'text-purple-500' },
                amber: { bg: 'bg-amber-500', border: 'border-amber-500/30', text: 'text-amber-500' },
                red: { bg: 'bg-red-500', border: 'border-red-500/30', text: 'text-red-500' },
                cyan: { bg: 'bg-cyan-500', border: 'border-cyan-500/30', text: 'text-cyan-500' },
              };

              const colors = colorMap[habit.color] ?? colorMap.blue;

              return (
                <motion.div
                  key={habit.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                >
                  <Card hover>
                    <div className="flex items-center gap-4">
                      {/* Completion checkbox */}
                      <button
                        onClick={() => toggleHabitCompletion(habit.id)}
                        className={`
                          flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 cursor-pointer
                          transition-all duration-300
                          ${isCompleted
                            ? `${colors.bg} border-transparent text-white shadow-sm`
                            : `border-neutral-300 text-transparent hover:${colors.border} dark:border-neutral-700`
                          }
                        `}
                        aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        <Check size={20} className={isCompleted ? 'text-white' : ''} />
                      </button>

                      {/* Habit info */}
                      <div className="flex-1">
                        <h3
                          className={`font-medium ${
                            isCompleted ? 'text-neutral-400 line-through dark:text-neutral-500' : 'text-neutral-900 dark:text-neutral-100'
                          }`}
                        >
                          {habit.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-2">
                          {streak > 0 && (
                            <Badge variant={habit.color === 'amber' ? 'amber' : 'emerald'}>
                              <Flame size={12} className="mr-1" />
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
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Color
            </label>
            <div className="flex gap-2">
              {HABIT_COLORS.map((color) => {
                const bgMap: Record<string, string> = {
                  blue: 'bg-blue-500',
                  emerald: 'bg-emerald-500',
                  purple: 'bg-purple-500',
                  amber: 'bg-amber-500',
                  red: 'bg-red-500',
                  cyan: 'bg-cyan-500',
                };
                return (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`h-8 w-8 rounded-full ${bgMap[color]} transition-all cursor-pointer
                      ${selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-white dark:ring-offset-neutral-900' : 'opacity-60 hover:opacity-100'}
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
