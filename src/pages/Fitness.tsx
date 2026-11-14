import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Plus,
  Trash2,
  Dumbbell,
  Droplets,
  Moon,
  Sparkles,
  Sliders,
  Calendar,
  BookOpen,
  TrendingUp,
  AlertCircle,
  Play,
} from 'lucide-react';
import { Card, Button, Input, Modal, EmptyState, Badge, Select } from '../components/ui';
import { useFitnessStore } from '../stores/fitnessStore';
import { formatDate, getTodayStr } from '../utils/helpers';
import type { FitnessGoalMode, FitnessPlanDay, FitnessRoutine, WorkoutType } from '../types';
import { FitnessSetupWizard } from '../components/fitness/FitnessSetupWizard';
import { ExerciseLibrary } from '../components/fitness/ExerciseLibrary';
import { RoutineManager } from '../components/fitness/RoutineManager';
import { WeekPlanView } from '../components/fitness/WeekPlanView';
import { WorkoutLogger } from '../components/fitness/WorkoutLogger';
import { generateFitnessPlan } from '../utils/fitnessPlans';

type FitnessTab = 'today' | 'plan' | 'library' | 'progress';

const DRAFT_KEY = 'life-tracker-fitness-workout-draft';

const WORKOUT_TYPES: { value: WorkoutType; label: string }[] = [
  { value: 'cardio', label: '🏃 Cardio' },
  { value: 'strength', label: '💪 Strength' },
  { value: 'flexibility', label: '🧘 Flexibility' },
  { value: 'sports', label: '⚽ Sports' },
  { value: 'other', label: '🏋️ Other' },
];

const MODE_CONFIG: Record<
  FitnessGoalMode,
  { label: string; badge: string; colorClass: string; badgeVariant: 'red' | 'blue' | 'emerald' | 'purple' }
> = {
  basic: {
    label: 'Basic Fitness',
    badge: 'Consistency & Health',
    colorClass: 'text-accent',
    badgeVariant: 'red',
  },
  bulk: {
    label: 'Bulk (Hypertrophy)',
    badge: 'Muscle & Strength (18+)',
    colorClass: 'text-cat-indigo',
    badgeVariant: 'purple',
  },
  cut: {
    label: 'Cut (Preservation)',
    badge: 'Lean & Strong (18+)',
    colorClass: 'text-cat-teal',
    badgeVariant: 'blue',
  },
  custom: {
    label: 'Custom Routine Mode',
    badge: 'Self-Directed',
    colorClass: 'text-app-ink',
    badgeVariant: 'emerald',
  },
};

export default function Fitness() {
  const shouldReduceMotion = useReducedMotion();
  const {
    workouts,
    addWorkout,
    removeWorkout,
    getTodayHealth,
    updateDailyHealth,
    profile,
    isLoaded,
    isLoading,
    loadFitnessData,
    setPlan,
    getCurrentPlan,
  } = useFitnessStore();

  const [activeTab, setActiveTab] = useState<FitnessTab>('today');
  const [planSubTab, setPlanSubTab] = useState<'week' | 'routines'>('week');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);

  // Full-screen mobile workout logger states
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);
  const [activePlanDay, setActivePlanDay] = useState<FitnessPlanDay | null>(null);
  const [activeRoutine, setActiveRoutine] = useState<FitnessRoutine | null>(null);

  // Check if an in-progress draft is waiting in localStorage
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    try {
      setHasDraft(Boolean(localStorage.getItem(DRAFT_KEY)));
    } catch {
      setHasDraft(false);
    }
  }, [isLoggerOpen]);

  // Legacy workout form
  const [workoutName, setWorkoutName] = useState('');
  const [workoutType, setWorkoutType] = useState<WorkoutType>('cardio');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');

  const todayHealth = getTodayHealth();
  const todayStr = getTodayStr();

  useEffect(() => {
    if (!isLoaded && !isLoading) {
      void loadFitnessData();
    }
  }, [isLoaded, isLoading, loadFitnessData]);

  // If loaded and no profile exists yet, open setup wizard automatically
  useEffect(() => {
    if (isLoaded && !profile) {
      setIsWizardOpen(true);
    }
  }, [isLoaded, profile]);

  // Ensure current plan exists if profile exists
  useEffect(() => {
    if (profile && profile.goalMode !== 'custom' && !getCurrentPlan()) {
      const generated = generateFitnessPlan(profile);
      void setPlan(generated);
    }
  }, [profile, getCurrentPlan, setPlan]);

  const handleStartWorkout = (planDay?: FitnessPlanDay | null, routine?: FitnessRoutine | null) => {
    setActivePlanDay(planDay ?? null);
    setActiveRoutine(routine ?? null);
    setIsLoggerOpen(true);
  };

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
      setIsWorkoutModalOpen(false);
    }
  };

  const sortedWorkouts = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
  const currentMode = profile?.goalMode || 'basic';
  const modeInfo = MODE_CONFIG[currentMode];
  const currentPlan = getCurrentPlan();
  const todayPlannedSession = currentPlan?.days.find(
    (d) => d.scheduledDate === todayStr && !d.isSkipped,
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header with Mode Badge & Settings */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-app-ink sm:text-3xl">Fitness</h1>
            <Badge variant={modeInfo.badgeVariant}>{modeInfo.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-app-subtle">
            {profile
              ? `${modeInfo.badge} · ${profile.trainingDaysPerWeek} days/wk · ${profile.equipment.toUpperCase()} · ${profile.units.toUpperCase()}`
              : 'Consistent strength and daily healthy habits.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsWizardOpen(true)}
            className="text-xs"
          >
            <Sliders size={15} />
            {profile ? 'Edit Profile' : 'Setup Profile'}
          </Button>

          <Button
            size="sm"
            onClick={() => handleStartWorkout(todayPlannedSession || null, null)}
            className="text-xs"
          >
            <Play size={14} />
            Start Workout
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-app-border">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px" aria-label="Fitness Sections">
          {[
            { id: 'today', label: 'Today', icon: Dumbbell },
            { id: 'plan', label: 'Plan & Routines', icon: Calendar },
            { id: 'library', label: 'Exercise Library', icon: BookOpen },
            { id: 'progress', label: 'Progress & History', icon: TrendingUp },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as FitnessTab)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2 py-3 px-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
                  active
                    ? 'border-accent text-accent font-bold'
                    : 'border-transparent text-app-subtle hover:text-app-ink hover:border-app-border'
                }`}
              >
                <tab.icon size={17} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab 1: Today */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {/* In-Progress Draft Resume Banner */}
          {hasDraft && (
            <Card className="border-accent/30 bg-accent/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-accent">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent text-white shadow-accent">
                  <Play size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-app-ink">Workout In-Progress</h4>
                  <p className="text-xs text-app-subtle">
                    You have an unfinished workout draft saved on this device.
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => setIsLoggerOpen(true)} className="shrink-0 text-xs">
                Resume Workout →
              </Button>
            </Card>
          )}

          {/* Daily Health Trackers (Sleep & Water) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Water Intake */}
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-cat-teal/10 p-2.5 text-cat-teal">
                  <Droplets size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-app-ink">Water Intake</h3>
                  <p className="text-xs text-app-subtle">8 glasses daily recommendation</p>
                </div>
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
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-xl bg-cat-indigo/10 p-2.5 text-cat-indigo">
                  <Moon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-app-ink">Sleep Hours</h3>
                  <p className="text-xs text-app-subtle">Aim for 7-9 hours of restful sleep</p>
                </div>
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
                {todayHealth.sleepHours >= 7 ? '✅ Well rested!' : todayHealth.sleepHours >= 5 ? '⚠️ Could be better' : '😴 Rest and recover'}
              </p>
            </Card>
          </div>

          {/* Today's Planned Workout Card */}
          {todayPlannedSession ? (
            <Card className="p-4 sm:p-5 border-l-4 border-l-accent space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                    Today's Scheduled Session
                  </span>
                  <h3 className="text-lg font-bold text-app-ink mt-0.5">
                    {todayPlannedSession.name}
                  </h3>
                  <p className="text-xs text-app-subtle">
                    {todayPlannedSession.exercises.length} rep-based exercises planned for today.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleStartWorkout(todayPlannedSession, null)}>
                    <Play size={14} />
                    Start Today's Workout
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setActiveTab('plan')}>
                    View Week
                  </Button>
                </div>
              </div>
            </Card>
          ) : currentPlan ? (
            <Card className="p-4 sm:p-5 border-dashed space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-app-subtle">
                    Today
                  </span>
                  <h3 className="text-base font-bold text-app-ink mt-0.5">
                    Rest & Recovery Day
                  </h3>
                  <p className="text-xs text-app-subtle">
                    No session scheduled for today. You can still do an ad-hoc workout or view your week schedule.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleStartWorkout(null, null)}>
                    <Plus size={14} />
                    Log Custom Workout
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setActiveTab('plan')}>
                    View Plan
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-5 border-dashed flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-app-ink">No Plan Configured</h4>
                <p className="text-xs text-app-subtle mt-0.5">Set up your fitness profile to generate a tailored workout plan.</p>
              </div>
              <Button size="sm" onClick={() => setIsWizardOpen(true)}>
                <Sparkles size={16} />
                Set Up Fitness Profile
              </Button>
            </Card>
          )}

          {/* Quick Workouts List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold tracking-tight text-app-ink">Recent Workouts</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setIsWorkoutModalOpen(true)}>
                  <Plus size={15} />
                  Quick General Entry
                </Button>
              </div>
            </div>

            {sortedWorkouts.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Dumbbell}
                  title="No workouts logged"
                  description="Start a planned workout above or log a general fitness entry!"
                  action={
                    <Button onClick={() => handleStartWorkout(todayPlannedSession || null, null)}>
                      <Play size={16} />
                      Start First Workout
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {sortedWorkouts.slice(0, 5).map((workout) => (
                    <motion.div
                      key={workout.id}
                      layout={!shouldReduceMotion}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldReduceMotion ? undefined : { opacity: 0, x: -40 }}
                    >
                      <Card hover className="p-4">
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
          </div>
        </div>
      )}

      {/* Tab 2: Plan & Routines */}
      {activeTab === 'plan' && (
        <div className="space-y-5">
          {/* Sub-tab pills */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPlanSubTab('week')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                planSubTab === 'week'
                  ? 'bg-accent text-white shadow-sm'
                  : 'bg-app-muted text-app-subtle hover:text-app-ink'
              }`}
            >
              This Week's Plan
            </button>
            <button
              type="button"
              onClick={() => setPlanSubTab('routines')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                planSubTab === 'routines'
                  ? 'bg-accent text-white shadow-sm'
                  : 'bg-app-muted text-app-subtle hover:text-app-ink'
              }`}
            >
              Custom Routines
            </button>
          </div>

          {planSubTab === 'week' ? (
            <WeekPlanView
              onStartWorkout={(planDay) => handleStartWorkout(planDay, null)}
            />
          ) : (
            <RoutineManager
              onStartWorkout={(routine) => handleStartWorkout(null, routine)}
            />
          )}
        </div>
      )}

      {/* Tab 3: Exercise Library */}
      {activeTab === 'library' && (
        <div>
          <ExerciseLibrary />
        </div>
      )}

      {/* Tab 4: Progress & History */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          <Card className="p-5 text-center space-y-2">
            <TrendingUp size={32} className="mx-auto text-accent" />
            <h3 className="font-bold text-base text-app-ink">Fitness History & Progress</h3>
            <p className="text-xs text-app-subtle max-w-md mx-auto">
              Workout logs, volume trends, and weekly check-ins will appear here. Full analytics arriving in Stage 4.
            </p>
          </Card>

          {/* Full history of workouts */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-app-ink">All Logged Workouts ({sortedWorkouts.length})</h4>
            {sortedWorkouts.length === 0 ? (
              <p className="text-xs text-app-subtle italic">No workout history recorded yet.</p>
            ) : (
              sortedWorkouts.map((workout) => (
                <Card key={workout.id} className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-app-ink">{workout.name}</p>
                    <p className="text-xs text-app-subtle mt-0.5">
                      {workout.duration} min · {formatDate(workout.date)} · {workout.type}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeWorkout(workout.id)}>
                    <Trash2 size={15} />
                  </Button>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Medical Disclaimer Note at Footer */}
      <div className="rounded-card border border-app-border bg-app-muted/40 p-3.5 text-xs text-app-subtle flex items-start gap-2.5">
        <AlertCircle size={17} className="shrink-0 text-app-subtle mt-0.5" />
        <span>
          <strong>General guidance, not medical advice.</strong> If you're pregnant, have a medical condition or injury, or find dieting stressful, talk to a doctor or dietitian.
        </span>
      </div>

      {/* Setup Wizard Modal */}
      <FitnessSetupWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        initialProfile={profile}
      />

      {/* Full-Screen Workout Logger */}
      {isLoggerOpen && (
        <WorkoutLogger
          initialPlanDay={activePlanDay}
          initialRoutine={activeRoutine}
          onClose={() => {
            setIsLoggerOpen(false);
            setActivePlanDay(null);
            setActiveRoutine(null);
          }}
          onFinished={() => {
            setIsLoggerOpen(false);
            setActivePlanDay(null);
            setActiveRoutine(null);
          }}
        />
      )}

      {/* Add Quick General Workout Modal (Legacy preserved) */}
      <Modal isOpen={isWorkoutModalOpen} onClose={() => setIsWorkoutModalOpen(false)} title="Log Quick Workout">
        <div className="space-y-4">
          <Input
            label="Workout Name"
            placeholder="e.g., Morning Run or Gym Session"
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
            <Button variant="secondary" onClick={() => setIsWorkoutModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddWorkout} disabled={!workoutName.trim()}>
              Log Workout
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
