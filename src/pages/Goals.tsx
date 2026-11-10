import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
  const shouldReduceMotion = useReducedMotion();
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
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cat-green">Long-term progress</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-app-ink">Goals</h2>
          <p className="mt-1 text-sm text-app-subtle"><span className="font-semibold text-app-ink">{goals.filter((g) => g.completed).length} of {goals.length}</span> goals completed</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Add Goal
        </Button>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory('all')}
          className={`min-h-9 rounded-full px-4 py-2 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-app-bg cursor-pointer border ${
            filterCategory === 'all'
              ? 'border-accent-contrast bg-accent-contrast text-white shadow-accent'
              : 'border-app-border bg-app-card text-app-subtle hover:border-accent/30 hover:bg-accent-soft hover:text-app-ink dark:hover:bg-accent/10'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className={`min-h-9 rounded-full px-4 py-2 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-app-bg cursor-pointer border ${
              filterCategory === cat.value
                ? 'border-accent-contrast bg-accent-contrast text-white shadow-accent'
                : 'border-app-border bg-app-card text-app-subtle hover:border-accent/30 hover:bg-accent-soft hover:text-app-ink dark:hover:bg-accent/10'
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
                  layout={!shouldReduceMotion}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, x: -40 }}
                >
                  <Card className={`border-l-4 ${categoryInfo?.color === 'emerald' ? 'border-l-cat-green' : categoryInfo?.color === 'blue' ? 'border-l-cat-blue' : categoryInfo?.color === 'purple' ? 'border-l-cat-indigo' : categoryInfo?.color === 'amber' ? 'border-l-cat-amber' : categoryInfo?.color === 'cyan' ? 'border-l-cat-teal' : 'border-l-accent'}`}>
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
                          <h3 className={`text-lg font-semibold ${goal.completed ? 'text-app-subtle line-through' : 'text-app-ink'}`}>
                            {goal.title}
                          </h3>
                          {goal.description && (
                            <p className="mt-1 text-sm leading-6 text-app-subtle">{goal.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleGoalComplete(goal.id)}
                            aria-label={goal.completed ? 'Reopen goal' : 'Complete goal'}
                          >
                              {goal.completed ? <CheckCircle2 size={18} className="text-cat-green" /> : <Circle size={18} className="text-app-subtle" />}
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
                              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors motion-reduce:transition-none hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                            >
                              {milestone.completed ? (
                                <CheckCircle2 size={16} className="shrink-0 text-cat-green" />
                              ) : (
                                <Circle size={16} className="shrink-0 text-app-subtle" />
                              )}
                              <span
                                className={`text-sm ${
                                  milestone.completed ? 'text-app-subtle line-through' : 'text-app-ink'
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
            <label className="block text-sm font-medium text-app-ink">Description</label>
            <textarea
              className="w-full rounded-card border border-app-border bg-app-card px-4 py-3 text-app-ink shadow-sm placeholder:text-app-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              rows={2}
              placeholder="Optional description..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>

          {/* Category selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-app-ink">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  aria-pressed={newCategory === cat.value}
                  onClick={() => setNewCategory(cat.value)}
                  className={`min-h-9 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer border ${
                    newCategory === cat.value
                      ? 'border-accent-contrast bg-accent-contrast text-white shadow-accent'
                      : 'border-app-border bg-app-card text-app-subtle hover:border-accent/30 hover:bg-accent-soft hover:text-app-ink dark:hover:bg-accent/10'
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
            <label className="mb-2 block text-sm font-medium text-app-ink">
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
