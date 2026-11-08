import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Card, Button, Input, Modal, EmptyState, Badge, ProgressBar } from '../components/ui';
import { useGoalStore } from '../stores/goalStore';
import type { GoalCategory } from '../types';

/**
 * Goals Page — Set and track long-term goals with milestones.
 * Supports white and true black themes.
 */

const CATEGORIES: { value: GoalCategory; label: string; color: string }[] = [
  { value: 'health', label: '🏥 Health', color: 'emerald' },
  { value: 'career', label: '💼 Career', color: 'blue' },
  { value: 'learning', label: '📚 Learning', color: 'purple' },
  { value: 'finance', label: '💰 Finance', color: 'amber' },
  { value: 'personal', label: '🌟 Personal', color: 'red' },
  { value: 'fitness', label: '💪 Fitness', color: 'cyan' },
];

export default function Goals() {
  const { goals, addGoal, removeGoal, toggleMilestone, toggleGoalComplete } = useGoalStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<GoalCategory>('personal');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [milestoneInputs, setMilestoneInputs] = useState<string[]>(['']);
  const [filterCategory, setFilterCategory] = useState<GoalCategory | 'all'>('all');

  const handleAddGoal = () => {
    if (newTitle.trim()) {
      addGoal({
        title: newTitle.trim(),
        description: newDescription.trim(),
        category: newCategory,
        targetDate: newTargetDate,
        milestones: milestoneInputs.filter((m) => m.trim()),
      });
      resetForm();
    }
  };

  const resetForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewCategory('personal');
    setNewTargetDate('');
    setMilestoneInputs(['']);
    setIsModalOpen(false);
  };

  const filteredGoals = filterCategory === 'all'
    ? goals
    : goals.filter((g) => g.category === filterCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          {goals.filter((g) => g.completed).length} of {goals.length} goals completed
        </p>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Add Goal
        </Button>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory('all')}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer border ${
            filterCategory === 'all'
              ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-neutral-950'
              : 'border-neutral-200 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-white'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer border ${
              filterCategory === cat.value
                ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-neutral-950'
                : 'border-neutral-200 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Goals list */}
      {filteredGoals.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No goals yet"
          description="Set your first goal and break it down into achievable milestones."
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus size={18} />
              Set a Goal
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredGoals.map((goal) => {
              const completed = goal.milestones.filter((m) => m.completed).length;
              const total = goal.milestones.length;
              const progress = total > 0 ? (completed / total) * 100 : 0;
              const categoryInfo = CATEGORIES.find((c) => c.value === goal.category);

              return (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                >
                  <Card>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <Badge variant={(categoryInfo?.color ?? 'blue') as 'blue' | 'emerald' | 'purple' | 'amber' | 'red' | 'slate'}>
                              {categoryInfo?.label}
                            </Badge>
                            {goal.completed && (
                              <Badge variant="emerald">✅ Completed</Badge>
                            )}
                          </div>
                          <h3 className={`text-lg font-semibold ${goal.completed ? 'text-neutral-400 line-through dark:text-neutral-500' : 'text-neutral-900 dark:text-white'}`}>
                            {goal.title}
                          </h3>
                          {goal.description && (
                            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{goal.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleGoalComplete(goal.id)}
                            aria-label={goal.completed ? 'Reopen goal' : 'Complete goal'}
                          >
                            {goal.completed ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} className="text-neutral-400 dark:text-neutral-600" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGoal(goal.id)}
                            aria-label="Delete goal"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {total > 0 && (
                        <ProgressBar
                          value={progress}
                          color={categoryInfo?.color ?? 'blue'}
                        />
                      )}

                      {/* Milestones */}
                      {goal.milestones.length > 0 && (
                        <div className="space-y-2 pl-1">
                          {goal.milestones.map((milestone) => (
                            <button
                              key={milestone.id}
                              onClick={() => toggleMilestone(goal.id, milestone.id)}
                              className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60 cursor-pointer"
                            >
                              {milestone.completed ? (
                                <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                              ) : (
                                <Circle size={16} className="shrink-0 text-neutral-400 dark:text-neutral-600" />
                              )}
                              <span
                                className={`text-sm ${
                                  milestone.completed ? 'text-neutral-400 line-through dark:text-neutral-500' : 'text-neutral-700 dark:text-neutral-300'
                                }`}
                              >
                                {milestone.title}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Goal Modal */}
      <Modal isOpen={isModalOpen} onClose={resetForm} title="Set a New Goal">
        <div className="space-y-4">
          <Input
            label="Goal Title"
            placeholder="e.g., Run a marathon"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Description</label>
            <textarea
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 shadow-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              rows={2}
              placeholder="Optional description..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>

          {/* Category selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setNewCategory(cat.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer border ${
                    newCategory === cat.value
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-neutral-950'
                      : 'border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Target Date"
            type="date"
            value={newTargetDate}
            onChange={(e) => setNewTargetDate(e.target.value)}
          />

          {/* Milestones */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Milestones (optional)
            </label>
            {milestoneInputs.map((m, i) => (
              <div key={i} className="mb-2">
                <Input
                  placeholder={`Milestone ${i + 1}`}
                  value={m}
                  onChange={(e) => {
                    const updated = [...milestoneInputs];
                    updated[i] = e.target.value;
                    setMilestoneInputs(updated);
                  }}
                />
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMilestoneInputs([...milestoneInputs, ''])}
            >
              <Plus size={14} />
              Add Milestone
            </Button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleAddGoal} disabled={!newTitle.trim()}>Set Goal</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
