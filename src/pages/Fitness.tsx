import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Trash2, Dumbbell, Droplets, Moon } from 'lucide-react';
import { Card, Button, Input, Modal, EmptyState, Badge, Select } from '../components/ui';
import { useFitnessStore } from '../stores/fitnessStore';
import { formatDate } from '../utils/helpers';
import type { WorkoutType } from '../types';

/**
 * Fitness Page — Track workouts, sleep, and water intake with true black & white themes.
 */

const WORKOUT_TYPES: { value: WorkoutType; label: string }[] = [
  { value: 'cardio', label: '🏃 Cardio' },
  { value: 'strength', label: '💪 Strength' },
  { value: 'flexibility', label: '🧘 Flexibility' },
  { value: 'sports', label: '⚽ Sports' },
  { value: 'other', label: '🏋️ Other' },
];

export default function Fitness() {
  const shouldReduceMotion = useReducedMotion();
  const { workouts, addWorkout, removeWorkout, getTodayHealth, updateDailyHealth } = useFitnessStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutType, setWorkoutType] = useState<WorkoutType>('cardio');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const todayHealth = getTodayHealth();

  const handleAddWorkout = () => {
    if (workoutName.trim()) {
      addWorkout({
        name: workoutName.trim(),
        type: workoutType,
        duration: Number(duration) || 0,
        calories: Number(calories) || 0,
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setWorkoutName('');
      setDuration('');
      setCalories('');
      setIsModalOpen(false);
    }
  };

  const sortedWorkouts = [...workouts].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Daily Health Trackers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Water Intake */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-cat-teal/10 p-2.5">
              <Droplets size={20} className="text-cat-teal" />
            </div>
            <h3 className="font-semibold text-app-ink">Water Intake</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 8 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => updateDailyHealth({ waterGlasses: i + 1 })}
                  aria-label={`Log ${i + 1} glasses of water`}
                  aria-pressed={i < todayHealth.waterGlasses}
                  className={`h-9 w-9 rounded-xl text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cat-teal focus-visible:ring-offset-2 cursor-pointer ${
                    i < todayHealth.waterGlasses
                      ? 'bg-cat-teal text-white shadow-card'
                      : 'bg-app-muted text-app-subtle hover:bg-cat-teal/10'
                  }`}
                >
                  💧
                </button>
              ))}
            </div>
            <span className="text-xl font-bold text-cat-teal-ink tabular-nums">
              {todayHealth.waterGlasses}/8
            </span>
          </div>
        </Card>

        {/* Sleep Tracker */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-cat-indigo/10 p-2.5">
              <Moon size={20} className="text-cat-indigo" />
            </div>
            <h3 className="font-semibold text-app-ink">Sleep Hours</h3>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="12"
              step="0.5"
              value={todayHealth.sleepHours}
              onChange={(e) => updateDailyHealth({ sleepHours: Number(e.target.value) })}
              className="flex-1 accent-cat-indigo cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cat-indigo"
            />
            <span className="min-w-[4rem] text-xl font-bold text-cat-indigo tabular-nums">
              {todayHealth.sleepHours}h
            </span>
          </div>
          <p className="mt-2 text-xs text-app-subtle">
            {todayHealth.sleepHours >= 7 ? '✅ Great sleep!' : todayHealth.sleepHours >= 5 ? '⚠️ Could be better' : '😴 Get more rest!'}
          </p>
        </Card>
      </div>

      {/* Workouts Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold tracking-tight text-app-ink">Workouts</h3>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Log Workout
        </Button>
      </div>

      {/* Workouts List */}
      {sortedWorkouts.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No workouts logged"
          description="Start logging your workouts to track your fitness journey!"
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus size={18} />
              Log First Workout
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {sortedWorkouts.map((workout) => (
              <motion.div
                key={workout.id}
                layout={!shouldReduceMotion}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, x: -40 }}
              >
                <Card hover>
                  <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="break-words font-semibold text-app-ink">{workout.name}</h4>
                        <Badge variant="blue">
                          {WORKOUT_TYPES.find((t) => t.value === workout.type)?.label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-app-subtle sm:text-sm">
                        <span>{workout.duration} min</span>
                        {workout.calories > 0 && <span>{workout.calories} cal</span>}
                        <span>{formatDate(workout.date)}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeWorkout(workout.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Workout Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Workout">
        <div className="space-y-4">
          <Input
            label="Workout Name"
            placeholder="e.g., Morning Run"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            autoFocus
          />
          <Select
            label="Type"
            value={workoutType}
            onChange={(e) => setWorkoutType(e.target.value as WorkoutType)}
            options={WORKOUT_TYPES}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duration (min)"
              type="number"
              placeholder="30"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <Input
              label="Calories"
              type="number"
              placeholder="200"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddWorkout} disabled={!workoutName.trim()}>Log Workout</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
