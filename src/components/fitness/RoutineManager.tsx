import { useState } from 'react';
import { Card, Button, Input, Modal, EmptyState } from '../ui';
import { useFitnessStore } from '../../stores/fitnessStore';
import { getAllExercises, getExerciseById } from '../../data/exercises';
import { convertPlanDayToRoutine } from '../../utils/fitnessPlans';
import type { FitnessRoutine, FitnessRoutineExercise } from '../../types';
import {
  Plus,
  Copy,
  Trash2,
  Pencil,
  Play,
  Dumbbell,
  ArrowUp,
  ArrowDown,
  X,
  Sparkles,
} from 'lucide-react';

interface RoutineManagerProps {
  onStartWorkout?: (routine: FitnessRoutine) => void;
}

export function RoutineManager({ onStartWorkout }: RoutineManagerProps) {
  const {
    routines,
    customExercises,
    addRoutine,
    updateRoutine,
    duplicateRoutine,
    removeRoutine,
    getCurrentPlan,
  } = useFitnessStore();

  const allExercises = getAllExercises(customExercises);
  const currentPlan = getCurrentPlan();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<FitnessRoutineExercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const openNewRoutine = () => {
    setEditingRoutineId(null);
    setName('');
    setNotes('');
    setExercises([]);
    setSelectedExerciseId('');
    setError('');
    setIsEditorOpen(true);
  };

  const openEditRoutine = (routine: FitnessRoutine) => {
    setEditingRoutineId(routine.id);
    setName(routine.name);
    setNotes(routine.notes);
    setExercises(routine.exercises);
    setSelectedExerciseId('');
    setError('');
    setIsEditorOpen(true);
  };

  const handleAddExerciseToRoutine = () => {
    if (!selectedExerciseId) return;
    const ex = getExerciseById(selectedExerciseId, customExercises);
    if (!ex) return;

    const newRoutineExercise: FitnessRoutineExercise = {
      id: '',
      routineId: editingRoutineId || '',
      exerciseId: ex.id,
      targetSets: 3,
      minReps: 8,
      maxReps: 12,
      targetWeight: null,
      position: exercises.length,
    };

    setExercises([...exercises, newRoutineExercise]);
    setSelectedExerciseId('');
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleMoveExercise = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= exercises.length) return;
    const reordered = [...exercises];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, moved);
    setExercises(reordered);
  };

  const handleUpdateExerciseRow = (index: number, updates: Partial<FitnessRoutineExercise>) => {
    setExercises(
      exercises.map((item, i) => (i === index ? { ...item, ...updates } : item)),
    );
  };

  const handleSaveRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (exercises.length === 0) {
      setError('Please add at least one exercise to the routine.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingRoutineId) {
        await updateRoutine(editingRoutineId, {
          name: name.trim().slice(0, 100),
          notes: notes.slice(0, 2000),
          exercises,
        });
      } else {
        await addRoutine({
          name: name.trim().slice(0, 100),
          notes: notes.slice(0, 2000),
          exercises,
        });
      }
      setIsEditorOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save routine.');
    } finally {
      setSaving(false);
    }
  };

  const handleBaseOnPlanDay = async (dayIndex: number) => {
    if (!currentPlan || !currentPlan.days[dayIndex]) return;
    const day = currentPlan.days[dayIndex];
    const template = convertPlanDayToRoutine(day);
    try {
      await addRoutine(template);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not save routine.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Action Header */}
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base text-app-ink">Custom Routines</h3>
          <p className="text-xs text-app-subtle mt-0.5">
            Create, duplicate, and customize workout routines for quick logging.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openNewRoutine}>
            <Plus size={16} />
            Create Routine
          </Button>
        </div>
      </Card>

      {/* Convert from this week's plan helper */}
      {currentPlan && currentPlan.days.length > 0 && (
        <Card className="p-4 border-accent/20 bg-accent/5 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <span className="text-xs font-semibold text-app-ink">
              Base a Routine on This Week's Plan ({currentPlan.goalMode.toUpperCase()}):
            </span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {currentPlan.days.map((day, idx) => (
              <Button
                key={day.id}
                size="sm"
                variant="secondary"
                onClick={() => handleBaseOnPlanDay(idx)}
                className="text-xs"
              >
                <Plus size={14} />
                Save "{day.name}" as Routine
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Routine List */}
      {routines.length === 0 ? (
        <Card>
          <EmptyState
            icon={Dumbbell}
            title="No custom routines yet"
            description="Create your own routine with your favorite exercises and rep targets, or base one on your active plan!"
            action={
              <Button onClick={openNewRoutine}>
                <Plus size={16} />
                Create First Routine
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {routines.map((routine) => (
            <Card key={routine.id} className="p-4 sm:p-5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-base text-app-ink">{routine.name}</h4>
                    {routine.notes && (
                      <p className="text-xs text-app-subtle mt-0.5">{routine.notes}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-app-muted text-app-subtle">
                    {routine.exercises.length} exercise{routine.exercises.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Exercises list preview */}
                <div className="mt-3 divide-y divide-app-border/40 text-xs">
                  {routine.exercises.map((exItem, i) => {
                    const ex = getExerciseById(exItem.exerciseId, customExercises);
                    return (
                      <div key={i} className="py-1.5 flex items-center justify-between text-app-subtle">
                        <span className="font-medium text-app-ink">{ex?.name || exItem.exerciseId}</span>
                        <span>
                          {exItem.targetSets} sets × {exItem.minReps}-{exItem.maxReps} reps
                          {exItem.targetWeight ? ` @ ${exItem.targetWeight}kg` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-app-border flex items-center justify-between gap-2">
                {onStartWorkout && (
                  <Button size="sm" onClick={() => onStartWorkout(routine)}>
                    <Play size={14} />
                    Start Workout
                  </Button>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    onClick={() => duplicateRoutine(routine.id)}
                    aria-label={`Duplicate ${routine.name}`}
                    className="p-2 rounded-xl text-app-subtle hover:bg-app-muted hover:text-app-ink transition-colors cursor-pointer"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditRoutine(routine)}
                    aria-label={`Edit ${routine.name}`}
                    className="p-2 rounded-xl text-app-subtle hover:bg-app-muted hover:text-app-ink transition-colors cursor-pointer"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete routine "${routine.name}"?`)) {
                        removeRoutine(routine.id);
                      }
                    }}
                    aria-label={`Delete ${routine.name}`}
                    className="p-2 rounded-xl text-app-subtle hover:bg-app-muted hover:text-accent transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Routine Create / Edit Modal */}
      {isEditorOpen && (
        <Modal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          title={editingRoutineId ? 'Edit Routine' : 'Create Routine'}
        >
          <form onSubmit={handleSaveRoutine} className="space-y-4 text-sm max-h-[80vh] overflow-y-auto pr-1">
            <Input
              label="Routine Name"
              placeholder="e.g., Upper Body Strength"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              autoFocus
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-app-subtle mb-1.5">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes or cues for this routine…"
                rows={2}
                maxLength={2000}
                className="w-full rounded-card border border-app-border bg-app-card px-3 py-2 text-sm text-app-ink placeholder:text-app-subtle focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Exercise selection */}
            <div className="space-y-2 pt-2 border-t border-app-border">
              <label className="block text-xs font-semibold uppercase tracking-wider text-app-subtle">
                Routine Exercises ({exercises.length})
              </label>

              {exercises.length === 0 ? (
                <p className="text-xs text-app-subtle italic py-2">
                  No exercises added yet. Pick from the library below.
                </p>
              ) : (
                <div className="space-y-2">
                  {exercises.map((item, index) => {
                    const ex = getExerciseById(item.exerciseId, customExercises);
                    return (
                      <div
                        key={index}
                        className="p-3 rounded-card border border-app-border bg-app-card/60 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs text-app-ink">
                            {index + 1}. {ex?.name || item.exerciseId}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveExercise(index, -1)}
                              className="p-1 text-app-subtle hover:bg-app-muted rounded disabled:opacity-30"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              disabled={index === exercises.length - 1}
                              onClick={() => handleMoveExercise(index, 1)}
                              className="p-1 text-app-subtle hover:bg-app-muted rounded disabled:opacity-30"
                            >
                              <ArrowDown size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveExercise(index)}
                              className="p-1 text-app-subtle hover:text-accent rounded"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-app-subtle">Sets</span>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={item.targetSets}
                              onChange={(e) =>
                                handleUpdateExerciseRow(index, { targetSets: Number(e.target.value) || 1 })
                              }
                              className="w-full mt-0.5 rounded border border-app-border bg-app-card px-2 py-1 text-xs text-app-ink"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-app-subtle">Min Reps</span>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={item.minReps}
                              onChange={(e) =>
                                handleUpdateExerciseRow(index, { minReps: Number(e.target.value) || 1 })
                              }
                              className="w-full mt-0.5 rounded border border-app-border bg-app-card px-2 py-1 text-xs text-app-ink"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-app-subtle">Max Reps</span>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={item.maxReps}
                              onChange={(e) =>
                                handleUpdateExerciseRow(index, { maxReps: Number(e.target.value) || 1 })
                              }
                              className="w-full mt-0.5 rounded border border-app-border bg-app-card px-2 py-1 text-xs text-app-ink"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add exercise row */}
              <div className="flex gap-2 pt-2">
                <select
                  value={selectedExerciseId}
                  onChange={(e) => setSelectedExerciseId(e.target.value)}
                  className="flex-1 rounded-card border border-app-border bg-app-card px-3 py-2 text-xs text-app-ink focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Select an exercise to add…</option>
                  {allExercises.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.muscleGroup} • {e.equipment})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddExerciseToRoutine}
                  disabled={!selectedExerciseId}
                >
                  <Plus size={15} />
                  Add
                </Button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-card">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-app-border">
              <Button type="button" variant="secondary" onClick={() => setIsEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving ? 'Saving…' : editingRoutineId ? 'Save Routine' : 'Create Routine'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
