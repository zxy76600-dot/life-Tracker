import { useState, useEffect, useMemo } from 'react';
import { Card, Button, Modal, Badge } from '../ui';
import { useFitnessStore } from '../../stores/fitnessStore';
import { getAllExercises, getExerciseById } from '../../data/exercises';
import {
  getPreviousExercisePerformance,
  isPersonalRecord,
  calculateWorkoutSummary,
} from '../../utils/fitnessHistory';
import { RestTimer } from './RestTimer';
import type {
  FitnessPlanDay,
  FitnessRoutine,
  FitnessSetLog,
  FitnessWorkoutLog,
} from '../../types';
import { generateId, getTodayStr } from '../../utils/helpers';
import {
  Check,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  AlertCircle,
  X,
  Dumbbell,
} from 'lucide-react';

const DRAFT_KEY = 'life-tracker-fitness-workout-draft';

export interface WorkoutExerciseGroup {
  exerciseId: string;
  sets: Array<{
    id: string; // stable set ID
    setNumber: number;
    reps: number;
    weight: number | null;
    completed: boolean;
    isPr: boolean;
  }>;
}

export interface InProgressDraft {
  id: string; // stable workout log ID
  name: string;
  planDayId?: string | null;
  routineId?: string | null;
  date: string;
  startedAt: string;
  notes: string;
  exerciseGroups: WorkoutExerciseGroup[];
}

interface WorkoutLoggerProps {
  initialPlanDay?: FitnessPlanDay | null;
  initialRoutine?: FitnessRoutine | null;
  onClose: () => void;
  onFinished?: () => void;
}

export function WorkoutLogger({
  initialPlanDay,
  initialRoutine,
  onClose,
  onFinished,
}: WorkoutLoggerProps) {
  const {
    customExercises,
    workoutLogs,
    profile,
    addWorkoutLog,
  } = useFitnessStore();

  const allExercises = useMemo(() => getAllExercises(customExercises), [customExercises]);
  const isBodyweightMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const ex of allExercises) {
      map[ex.id] = ex.isBodyweight;
    }
    return map;
  }, [allExercises]);

  // Load from draft in localStorage or initialize from props
  const [draft, setDraft] = useState<InProgressDraft>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as InProgressDraft;
        if (parsed && parsed.id && Array.isArray(parsed.exerciseGroups)) {
          return parsed;
        }
      }
    } catch {
      // Safe fallback
    }

    const id = generateId();
    const today = getTodayStr();
    const startedAt = new Date().toISOString();

    if (initialPlanDay) {
      return {
        id,
        name: initialPlanDay.name,
        planDayId: initialPlanDay.id,
        routineId: null,
        date: today,
        startedAt,
        notes: '',
        exerciseGroups: initialPlanDay.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: Array.from({ length: ex.targetSets }, (_, i) => ({
            id: generateId(),
            setNumber: i + 1,
            reps: ex.minReps || 10,
            weight: ex.targetWeight ?? (isBodyweightMap[ex.exerciseId] ? null : 20),
            completed: false,
            isPr: false,
          })),
        })),
      };
    }

    if (initialRoutine) {
      return {
        id,
        name: initialRoutine.name,
        planDayId: null,
        routineId: initialRoutine.id,
        date: today,
        startedAt,
        notes: initialRoutine.notes || '',
        exerciseGroups: initialRoutine.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: Array.from({ length: ex.targetSets }, (_, i) => ({
            id: generateId(),
            setNumber: i + 1,
            reps: ex.minReps || 10,
            weight: ex.targetWeight ?? (isBodyweightMap[ex.exerciseId] ? null : 20),
            completed: false,
            isPr: false,
          })),
        })),
      };
    }

    return {
      id,
      name: 'Workout Session',
      planDayId: null,
      routineId: null,
      date: today,
      startedAt,
      notes: '',
      exerciseGroups: [],
    };
  });

  const [restTimerOpen, setRestTimerOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [addExerciseModalOpen, setAddExerciseModalOpen] = useState(false);
  const [selectedNewExId, setSelectedNewExId] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftRestoredBanner, setDraftRestoredBanner] = useState(() => {
    try {
      return Boolean(localStorage.getItem(DRAFT_KEY));
    } catch {
      return false;
    }
  });

  // Autosave draft to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Safe ignore quota or privacy mode errors
    }
  }, [draft]);

  const updateSet = (
    groupIndex: number,
    setIndex: number,
    field: 'reps' | 'weight' | 'completed',
    value: number | boolean | null,
  ) => {
    setDraft((prev) => {
      const newGroups = prev.exerciseGroups.map((group, gIdx) => {
        if (gIdx !== groupIndex) return group;

        const updatedSets = group.sets.map((set, sIdx) => {
          if (sIdx !== setIndex) return set;

          const updated = { ...set, [field]: value };
          const ex = getExerciseById(group.exerciseId, customExercises);
          const isBodyweight = ex?.isBodyweight || false;

          // Check if this set is now a PR
          const isPr = isPersonalRecord(
            group.exerciseId,
            updated.reps,
            updated.weight,
            isBodyweight,
            workoutLogs,
          );
          updated.isPr = isPr;

          return updated;
        });

        return { ...group, sets: updatedSets };
      });

      return { ...prev, exerciseGroups: newGroups };
    });
  };

  const addSetToGroup = (groupIndex: number) => {
    setDraft((prev) => {
      const newGroups = prev.exerciseGroups.map((group, idx) => {
        if (idx !== groupIndex) return group;
        const lastSet = group.sets[group.sets.length - 1];
        const nextSetNum = group.sets.length + 1;
        const newSet = {
          id: generateId(),
          setNumber: nextSetNum,
          reps: lastSet ? lastSet.reps : 10,
          weight: lastSet ? lastSet.weight : null,
          completed: false,
          isPr: false,
        };
        return { ...group, sets: [...group.sets, newSet] };
      });
      return { ...prev, exerciseGroups: newGroups };
    });
  };

  const removeSetFromGroup = (groupIndex: number, setIndex: number) => {
    setDraft((prev) => {
      const newGroups = prev.exerciseGroups.map((group, idx) => {
        if (idx !== groupIndex) return group;
        const filtered = group.sets
          .filter((_, sIdx) => sIdx !== setIndex)
          .map((s, reIdx) => ({ ...s, setNumber: reIdx + 1 }));
        return { ...group, sets: filtered };
      });
      return { ...prev, exerciseGroups: newGroups };
    });
  };

  const removeExerciseGroup = (groupIndex: number) => {
    setDraft((prev) => ({
      ...prev,
      exerciseGroups: prev.exerciseGroups.filter((_, idx) => idx !== groupIndex),
    }));
  };

  const handleAddExerciseToWorkout = () => {
    if (!selectedNewExId) return;
    const ex = getExerciseById(selectedNewExId, customExercises);
    if (!ex) return;

    const newGroup: WorkoutExerciseGroup = {
      exerciseId: ex.id,
      sets: [
        {
          id: generateId(),
          setNumber: 1,
          reps: 10,
          weight: ex.isBodyweight ? null : 20,
          completed: false,
          isPr: false,
        },
        {
          id: generateId(),
          setNumber: 2,
          reps: 10,
          weight: ex.isBodyweight ? null : 20,
          completed: false,
          isPr: false,
        },
        {
          id: generateId(),
          setNumber: 3,
          reps: 10,
          weight: ex.isBodyweight ? null : 20,
          completed: false,
          isPr: false,
        },
      ],
    };

    setDraft((prev) => ({
      ...prev,
      exerciseGroups: [...prev.exerciseGroups, newGroup],
    }));
    setSelectedNewExId('');
    setAddExerciseModalOpen(false);
  };

  // Summary calculations
  const allFlattenedSets: FitnessSetLog[] = useMemo(() => {
    const list: FitnessSetLog[] = [];
    for (const group of draft.exerciseGroups) {
      for (const s of group.sets) {
        list.push({
          id: s.id,
          workoutLogId: draft.id,
          exerciseId: group.exerciseId,
          setNumber: s.setNumber,
          reps: s.reps,
          weight: s.weight,
          completed: s.completed,
          isPr: s.isPr,
        });
      }
    }
    return list;
  }, [draft]);

  const summary = useMemo(
    () => calculateWorkoutSummary(allFlattenedSets, isBodyweightMap),
    [allFlattenedSets, isBodyweightMap],
  );

  const handleTapFinish = () => {
    setSaveError('');
    setSummaryModalOpen(true);
  };

  const handleConfirmSaveToCloud = async () => {
    setIsSubmitting(true);
    setSaveError('');
    try {
      const completedSets = allFlattenedSets.filter((s) => s.completed);
      if (completedSets.length === 0) {
        throw new Error('Please complete at least one set before saving your workout.');
      }

      const logToSave: FitnessWorkoutLog = {
        id: draft.id,
        planDayId: draft.planDayId,
        routineId: draft.routineId,
        name: draft.name,
        date: draft.date,
        startedAt: draft.startedAt,
        completedAt: new Date().toISOString(),
        notes: draft.notes,
        sets: completedSets,
        createdAt: new Date().toISOString(),
      };

      await addWorkoutLog(logToSave);

      // ONLY clear draft from localStorage AFTER cloud save succeeds!
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // safe ignore
      }

      setSummaryModalOpen(false);
      if (onFinished) onFinished();
      onClose();
    } catch (err) {
      // Keep draft intact so the user does NOT lose anything
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Could not save workout to cloud. Your draft is preserved; tap Finish to retry.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscardDraft = () => {
    if (window.confirm('Discard this workout? Unsaved progress will be lost.')) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
      onClose();
    }
  };

  const unitLabel = profile?.units || 'kg';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app-bg text-app-ink overflow-hidden">
      {/* Top Bar */}
      <header className="border-b border-app-border bg-app-card px-4 py-3 shrink-0 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="font-bold text-lg text-app-ink bg-transparent border-b border-transparent hover:border-app-border focus:border-accent focus:outline-none truncate max-w-[220px] sm:max-w-md"
          />
          <p className="text-xs text-app-subtle">
            {summary.totalSets} completed sets · {summary.totalReps} total reps
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRestTimerOpen(!restTimerOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
              restTimerOpen
                ? 'border-accent bg-accent/10 text-accent ring-2 ring-accent/20'
                : 'border-app-border bg-app-muted text-app-ink hover:border-accent/40'
            }`}
          >
            <Clock size={14} />
            <span>Timer</span>
          </button>

          <Button size="sm" onClick={handleTapFinish} className="px-4">
            Finish
          </Button>

          <button
            type="button"
            onClick={handleDiscardDraft}
            className="p-1.5 rounded-lg text-app-subtle hover:text-accent hover:bg-app-muted cursor-pointer"
            aria-label="Discard workout"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Floating Rest Timer Window (if active) */}
      {restTimerOpen && (
        <div className="px-4 py-2 bg-app-muted/30 border-b border-app-border shrink-0 max-w-xl mx-auto w-full">
          <RestTimer onClose={() => setRestTimerOpen(false)} />
        </div>
      )}

      {/* Draft Restored Banner */}
      {draftRestoredBanner && (
        <div className="bg-accent/10 border-b border-accent/20 px-4 py-2 text-xs flex items-center justify-between text-app-ink shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <span>In-progress workout draft safely restored from your device.</span>
          </div>
          <button
            type="button"
            onClick={() => setDraftRestoredBanner(false)}
            className="font-bold text-app-subtle hover:text-app-ink"
          >
            ✕
          </button>
        </div>
      )}

      {/* Workout Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 max-w-3xl mx-auto w-full">
        {draft.exerciseGroups.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <Dumbbell size={32} className="mx-auto text-app-subtle" />
            <h3 className="font-bold text-base text-app-ink">Empty Workout</h3>
            <p className="text-xs text-app-subtle max-w-sm mx-auto">
              Add your first exercise to start logging sets, weights, and reps.
            </p>
            <Button onClick={() => setAddExerciseModalOpen(true)}>
              <Plus size={16} />
              Add Exercise
            </Button>
          </Card>
        ) : (
          draft.exerciseGroups.map((group, groupIdx) => {
            const ex = getExerciseById(group.exerciseId, customExercises);
            const isBodyweight = ex?.isBodyweight || false;
            const prevStats = getPreviousExercisePerformance(group.exerciseId, workoutLogs);

            return (
              <Card key={group.exerciseId} className="p-4 sm:p-5 space-y-3 border border-app-border">
                {/* Exercise Header */}
                <div className="flex items-start justify-between gap-2 border-b border-app-border/40 pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-app-ink">{ex?.name || group.exerciseId}</h4>
                      {isBodyweight && <Badge variant="emerald">Bodyweight</Badge>}
                    </div>
                    {prevStats && (
                      <p className="text-xs text-app-subtle mt-0.5">
                        Previous best: {prevStats.lastWeight !== null ? `${prevStats.lastWeight}${unitLabel} × ` : ''}
                        {prevStats.lastReps} reps
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExerciseGroup(groupIdx)}
                    aria-label={`Remove ${ex?.name || 'exercise'}`}
                    className="p-1 text-app-subtle hover:text-accent rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Set Rows Column Header */}
                <div className="grid grid-cols-[2.5rem_1fr_1fr_3.5rem_2rem] gap-2 text-[11px] font-bold uppercase tracking-wider text-app-subtle px-1">
                  <span>Set</span>
                  {!isBodyweight ? <span>Weight ({unitLabel})</span> : <span>Mode</span>}
                  <span>Reps</span>
                  <span className="text-center">Done</span>
                  <span></span>
                </div>

                {/* Set Rows */}
                <div className="space-y-2">
                  {group.sets.map((set, setIdx) => (
                    <div
                      key={set.id}
                      className={`grid grid-cols-[2.5rem_1fr_1fr_3.5rem_2rem] items-center gap-2 p-2 rounded-card border transition-colors ${
                        set.completed
                          ? 'border-cat-green/30 bg-cat-green/5'
                          : 'border-app-border bg-app-card/70'
                      }`}
                    >
                      {/* Set Number & PR Badge */}
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-sm tabular-nums text-app-ink">{set.setNumber}</span>
                        {set.isPr && (
                          <span
                            title="Personal Record!"
                            className="mt-0.5 text-[9px] font-extrabold uppercase px-1 rounded bg-cat-amber/20 text-cat-amber-ink"
                          >
                            PR
                          </span>
                        )}
                      </div>

                      {/* Weight Stepper (Hidden if bodyweight) */}
                      {!isBodyweight ? (
                        <div className="flex items-center rounded-lg border border-app-border bg-app-card overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              updateSet(
                                groupIdx,
                                setIdx,
                                'weight',
                                Math.max(0, Math.round(((set.weight || 0) - 2.5) * 10) / 10),
                              )
                            }
                            aria-label="Decrease weight by 2.5"
                            className="h-10 w-9 flex items-center justify-center font-bold text-sm text-app-subtle hover:bg-app-muted active:bg-app-border shrink-0 cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            min="0"
                            value={set.weight ?? ''}
                            onChange={(e) =>
                              updateSet(
                                groupIdx,
                                setIdx,
                                'weight',
                                e.target.value === '' ? null : Number(e.target.value),
                              )
                            }
                            className="w-full text-center font-semibold text-sm tabular-nums text-app-ink bg-transparent focus:outline-none py-1"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateSet(
                                groupIdx,
                                setIdx,
                                'weight',
                                Math.round(((set.weight || 0) + 2.5) * 10) / 10,
                              )
                            }
                            aria-label="Increase weight by 2.5"
                            className="h-10 w-9 flex items-center justify-center font-bold text-sm text-app-subtle hover:bg-app-muted active:bg-app-border shrink-0 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center text-xs font-medium text-app-subtle">
                          Bodyweight
                        </div>
                      )}

                      {/* Reps Stepper */}
                      <div className="flex items-center rounded-lg border border-app-border bg-app-card overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            updateSet(groupIdx, setIdx, 'reps', Math.max(0, set.reps - 1))
                          }
                          aria-label="Decrease reps by 1"
                          className="h-10 w-9 flex items-center justify-center font-bold text-sm text-app-subtle hover:bg-app-muted active:bg-app-border shrink-0 cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={set.reps}
                          onChange={(e) =>
                            updateSet(
                              groupIdx,
                              setIdx,
                              'reps',
                              Math.max(0, parseInt(e.target.value, 10) || 0),
                            )
                          }
                          className="w-full text-center font-semibold text-sm tabular-nums text-app-ink bg-transparent focus:outline-none py-1"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateSet(groupIdx, setIdx, 'reps', set.reps + 1)
                          }
                          aria-label="Increase reps by 1"
                          className="h-10 w-9 flex items-center justify-center font-bold text-sm text-app-subtle hover:bg-app-muted active:bg-app-border shrink-0 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Checkmark Button (Done) */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextCompleted = !set.completed;
                          updateSet(groupIdx, setIdx, 'completed', nextCompleted);
                          // Auto open rest timer if marked complete
                          if (nextCompleted && !restTimerOpen) {
                            setRestTimerOpen(true);
                          }
                        }}
                        aria-label={`Mark set ${set.setNumber} as ${set.completed ? 'incomplete' : 'complete'}`}
                        className={`h-10 w-10 mx-auto flex items-center justify-center rounded-xl border-2 transition-all cursor-pointer ${
                          set.completed
                            ? 'border-cat-green bg-cat-green text-white shadow-sm'
                            : 'border-app-border text-transparent hover:border-accent hover:text-accent/30'
                        }`}
                      >
                        <Check size={18} strokeWidth={3} />
                      </button>

                      {/* Remove set button */}
                      <button
                        type="button"
                        onClick={() => removeSetFromGroup(groupIdx, setIdx)}
                        aria-label={`Delete set ${set.setNumber}`}
                        className="p-1 text-app-subtle hover:text-accent rounded opacity-60 hover:opacity-100"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Set Button */}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => addSetToGroup(groupIdx)}
                  className="w-full text-xs mt-1"
                >
                  <Plus size={14} />
                  Add Set
                </Button>
              </Card>
            );
          })
        )}

        {/* Add Another Exercise to Workout */}
        {draft.exerciseGroups.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => setAddExerciseModalOpen(true)}
            className="w-full py-3"
          >
            <Plus size={16} />
            Add Another Exercise
          </Button>
        )}
      </main>

      {/* Add Exercise Modal */}
      {addExerciseModalOpen && (
        <Modal
          isOpen={addExerciseModalOpen}
          onClose={() => setAddExerciseModalOpen(false)}
          title="Add Exercise to Workout"
        >
          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-app-subtle mb-1.5">
                Choose Exercise
              </label>
              <select
                value={selectedNewExId}
                onChange={(e) => setSelectedNewExId(e.target.value)}
                className="w-full rounded-card border border-app-border bg-app-card px-3 py-2 text-sm text-app-ink focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Select an exercise…</option>
                {allExercises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.muscleGroup} • {e.equipment})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
              <Button variant="secondary" onClick={() => setAddExerciseModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddExerciseToWorkout} disabled={!selectedNewExId}>
                <Plus size={15} />
                Add to Workout
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Finish Summary Modal */}
      {summaryModalOpen && (
        <Modal
          isOpen={summaryModalOpen}
          onClose={() => setSummaryModalOpen(false)}
          title="Workout Summary"
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-app-muted/50 p-3 rounded-card border border-app-border">
                <span className="text-xs text-app-subtle">Sets Completed</span>
                <p className="text-xl font-extrabold text-app-ink mt-1 tabular-nums">
                  {summary.totalSets}
                </p>
              </div>

              <div className="bg-app-muted/50 p-3 rounded-card border border-app-border">
                <span className="text-xs text-app-subtle">Total Reps</span>
                <p className="text-xl font-extrabold text-app-ink mt-1 tabular-nums">
                  {summary.totalReps}
                </p>
              </div>

              <div className="bg-app-muted/50 p-3 rounded-card border border-app-border">
                <span className="text-xs text-app-subtle">Total Volume</span>
                <p className="text-xl font-extrabold text-app-ink mt-1 tabular-nums">
                  {summary.totalVolume > 0 ? `${summary.totalVolume} ${unitLabel}` : '—'}
                </p>
              </div>

              <div className="bg-app-muted/50 p-3 rounded-card border border-app-border">
                <span className="text-xs text-app-subtle">PRs Set</span>
                <p className="text-xl font-extrabold text-cat-amber-ink mt-1 tabular-nums">
                  {summary.prCount > 0 ? `🏆 ${summary.prCount}` : '—'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-app-subtle mb-1.5">
                Workout Notes (optional)
              </label>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="How did this session feel? (energy, form, milestones)…"
                rows={2}
                maxLength={2000}
                className="w-full rounded-card border border-app-border bg-app-card px-3 py-2 text-sm text-app-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Error display if cloud save fails */}
            {saveError && (
              <div
                role="alert"
                className="rounded-card border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300 space-y-1"
              >
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle size={16} />
                  <span>Cloud Save Error</span>
                </div>
                <p>{saveError}</p>
                <p className="text-[11px] text-red-600 dark:text-red-400">
                  Your workout draft is safe on this device. You can tap "Save to Cloud" to retry.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-app-border">
              <Button
                variant="secondary"
                onClick={() => setSummaryModalOpen(false)}
                disabled={isSubmitting}
              >
                Back to Workout
              </Button>
              <Button onClick={handleConfirmSaveToCloud} disabled={isSubmitting}>
                {isSubmitting ? 'Saving to Cloud…' : 'Save to Cloud'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
