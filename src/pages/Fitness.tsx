import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className="space-y-6">
      {/* Daily Health Trackers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Water Intake */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-cyan-500/10 p-2.5 dark:bg-cyan-500/15">
              <Droplets size={20} className="text-cyan-500" />
            </div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">Water Intake</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 8 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => updateDailyHealth({ waterGlasses: i + 1 })}
                  className={`h-9 w-9 rounded-xl text-sm transition-all cursor-pointer ${
                    i < todayHealth.waterGlasses
                      ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/30'
                      : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:hover:bg-neutral-700'
                  }`}
                  aria-label={`Log ${i + 1} glasses of water`}
                >
                  💧
                </button>
              ))}
            </div>
            <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
              {todayHealth.waterGlasses}/8
            </span>
          </div>
        </Card>

        {/* Sleep Tracker */}
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-indigo-500/10 p-2.5 dark:bg-indigo-500/15">
              <Moon size={20} className="text-indigo-500" />
            </div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">Sleep Hours</h3>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="12"
              step="0.5"
              value={todayHealth.sleepHours}
              onChange={(e) => updateDailyHealth({ sleepHours: Number(e.target.value) })}
              className="flex-1 accent-indigo-500 cursor-pointer"
            />
            <span className="min-w-[4rem] text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {todayHealth.sleepHours}h
            </span>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {todayHealth.sleepHours >= 7 ? '✅ Great sleep!' : todayHealth.sleepHours >= 5 ? '⚠️ Could be better' : '😴 Get more rest!'}
          </p>
        </Card>
      </div>

      {/* Workouts Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Workouts</h3>
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
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
              >
                <Card hover>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-neutral-900 dark:text-white">{workout.name}</h4>
                        <Badge variant="blue">
                          {WORKOUT_TYPES.find((t) => t.value === workout.type)?.label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex gap-4 text-sm text-neutral-500 dark:text-neutral-400">
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
