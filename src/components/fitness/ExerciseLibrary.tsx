import { useState, useMemo } from 'react';
import { Card, Button, Input, Modal, Badge, EmptyState } from '../ui';
import { filterExercises, getAllExercises } from '../../data/exercises';
import { useFitnessStore } from '../../stores/fitnessStore';
import type { Exercise, FitnessEquipment, MuscleGroup } from '../../types';
import { Search, Plus, Trash2, Dumbbell } from 'lucide-react';

const MUSCLE_GROUPS: { value: MuscleGroup | 'all'; label: string }[] = [
  { value: 'all', label: 'All Muscles' },
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'legs', label: 'Legs' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'arms', label: 'Arms' },
  { value: 'core', label: 'Core' },
];

const EQUIPMENT_OPTIONS: { value: FitnessEquipment | 'all'; label: string }[] = [
  { value: 'all', label: 'All Equipment' },
  { value: 'gym', label: 'Gym' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'bodyweight', label: 'Bodyweight' },
];

export function ExerciseLibrary() {
  const { customExercises, addCustomExercise, removeCustomExercise } = useFitnessStore();

  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<FitnessEquipment | 'all'>('all');

  const [inspectExercise, setInspectExercise] = useState<Exercise | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state for adding custom exercise
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>('chest');
  const [customEquipment, setCustomEquipment] = useState<FitnessEquipment>('dumbbells');
  const [customIsBodyweight, setCustomIsBodyweight] = useState(false);
  const [customCue1, setCustomCue1] = useState('');
  const [customCue2, setCustomCue2] = useState('');
  const [customSubstitutes, setCustomSubstitutes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const allExercises = useMemo(() => getAllExercises(customExercises), [customExercises]);

  const filteredExercises = useMemo(() => {
    return filterExercises(allExercises, search, selectedMuscle, selectedEquipment);
  }, [allExercises, search, selectedMuscle, selectedEquipment]);

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    setFormError('');
    setIsSaving(true);
    try {
      const cues: string[] = [];
      if (customCue1.trim()) cues.push(customCue1.trim());
      if (customCue2.trim()) cues.push(customCue2.trim());

      await addCustomExercise({
        name: customName.trim().slice(0, 100),
        muscleGroup: customMuscle,
        equipment: customEquipment,
        isBodyweight: customIsBodyweight,
        formCues: cues.slice(0, 10),
        substitutes: customSubstitutes.slice(0, 10),
      });

      // Reset form
      setCustomName('');
      setCustomCue1('');
      setCustomCue2('');
      setCustomSubstitutes([]);
      setIsAddModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save custom exercise.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and Filter Bar */}
      <Card className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercise library by name or cue…"
              className="w-full pl-9 pr-3 py-2 rounded-card border border-app-border bg-app-card text-sm text-app-ink placeholder:text-app-subtle focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="shrink-0">
            <Plus size={16} />
            Add Custom Exercise
          </Button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-app-border/50 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {MUSCLE_GROUPS.map((mg) => (
              <button
                key={mg.value}
                type="button"
                onClick={() => setSelectedMuscle(mg.value)}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedMuscle === mg.value
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-app-muted text-app-subtle hover:text-app-ink'
                }`}
              >
                {mg.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-app-border mx-1 hidden sm:block" />

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {EQUIPMENT_OPTIONS.map((eq) => (
              <button
                key={eq.value}
                type="button"
                onClick={() => setSelectedEquipment(eq.value)}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedEquipment === eq.value
                    ? 'bg-accent-contrast text-white shadow-sm'
                    : 'bg-app-muted text-app-subtle hover:text-app-ink'
                }`}
              >
                {eq.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Exercises Grid */}
      {filteredExercises.length === 0 ? (
        <Card>
          <EmptyState
            icon={Dumbbell}
            title="No exercises found"
            description="Try clearing your filters or search term, or add a custom exercise."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExercises.map((exercise) => {
            const isCustom = exercise.id.startsWith('custom:');
            return (
              <button
                key={exercise.id}
                type="button"
                onClick={() => setInspectExercise(exercise)}
                className="w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-card-lg"
              >
                <Card
                  hover
                  className="p-4 h-full flex flex-col justify-between border border-app-border hover:border-accent/40"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm text-app-ink break-words">{exercise.name}</h4>
                      {isCustom && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent shrink-0">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="blue">{exercise.muscleGroup}</Badge>
                      <Badge variant={exercise.equipment === 'gym' ? 'purple' : exercise.equipment === 'dumbbells' ? 'amber' : 'emerald'}>
                        {exercise.equipment}
                      </Badge>
                      {exercise.isBodyweight && <Badge variant="emerald">Bodyweight</Badge>}
                    </div>
                    {exercise.formCues.length > 0 && (
                      <p className="mt-2.5 text-xs text-app-subtle line-clamp-2 leading-relaxed">
                        💡 {exercise.formCues[0]}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-app-border flex items-center justify-between text-[11px] text-app-subtle">
                    <span>{exercise.substitutes.length} substitute{exercise.substitutes.length === 1 ? '' : 's'}</span>
                    <span className="text-accent font-medium">Details →</span>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      {/* Exercise Detail Modal */}
      {inspectExercise && (
        <Modal
          isOpen={Boolean(inspectExercise)}
          onClose={() => setInspectExercise(null)}
          title={inspectExercise.name}
        >
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="blue">{inspectExercise.muscleGroup.toUpperCase()}</Badge>
              <Badge variant="amber">{inspectExercise.equipment.toUpperCase()}</Badge>
              {inspectExercise.isBodyweight && <Badge variant="emerald">BODYWEIGHT</Badge>}
              {inspectExercise.id.startsWith('custom:') && <Badge variant="purple">CUSTOM EXERCISE</Badge>}
            </div>

            <div>
              <h5 className="font-semibold text-xs text-app-ink uppercase tracking-wider mb-2">Form Cues</h5>
              {inspectExercise.formCues.length > 0 ? (
                <ul className="space-y-2 text-xs text-app-subtle">
                  {inspectExercise.formCues.map((cue, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-app-muted/40 p-2.5 rounded-card">
                      <span className="text-accent font-bold">✓</span>
                      <span>{cue}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-app-subtle">No specific form cues recorded.</p>
              )}
            </div>

            <div>
              <h5 className="font-semibold text-xs text-app-ink uppercase tracking-wider mb-2">Equipment Substitutes</h5>
              {inspectExercise.substitutes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {inspectExercise.substitutes.map((subId) => {
                    const subEx = allExercises.find((e) => e.id === subId);
                    return (
                      <button
                        key={subId}
                        type="button"
                        onClick={() => {
                          if (subEx) setInspectExercise(subEx);
                        }}
                        className="text-xs px-2.5 py-1 rounded-card border border-app-border bg-app-card hover:bg-app-muted text-app-ink transition-colors cursor-pointer"
                      >
                        {subEx?.name || subId} ({subEx?.equipment || 'alt'})
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-app-subtle">No substitutes assigned.</p>
              )}
            </div>

            <div className="pt-3 border-t border-app-border flex justify-between items-center">
              {inspectExercise.id.startsWith('custom:') ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if (window.confirm(`Delete custom exercise "${inspectExercise.name}"?`)) {
                      await removeCustomExercise(inspectExercise.id);
                      setInspectExercise(null);
                    }
                  }}
                >
                  <Trash2 size={15} />
                  Delete Custom Exercise
                </Button>
              ) : (
                <span className="text-xs text-app-subtle">Built-in exercise</span>
              )}
              <Button variant="secondary" size="sm" onClick={() => setInspectExercise(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Custom Exercise Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add Custom Exercise"
        >
          <form onSubmit={handleCreateCustom} className="space-y-4 text-sm">
            <Input
              label="Exercise Name"
              placeholder="e.g., Incline Cable Flye"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              maxLength={100}
              required
              autoFocus
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-app-subtle mb-1.5">
                  Muscle Group
                </label>
                <select
                  value={customMuscle}
                  onChange={(e) => setCustomMuscle(e.target.value as MuscleGroup)}
                  className="w-full rounded-card border border-app-border bg-app-card px-3 py-2 text-sm text-app-ink focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="chest">Chest</option>
                  <option value="back">Back</option>
                  <option value="legs">Legs</option>
                  <option value="shoulders">Shoulders</option>
                  <option value="arms">Arms</option>
                  <option value="core">Core</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-app-subtle mb-1.5">
                  Equipment
                </label>
                <select
                  value={customEquipment}
                  onChange={(e) => setCustomEquipment(e.target.value as FitnessEquipment)}
                  className="w-full rounded-card border border-app-border bg-app-card px-3 py-2 text-sm text-app-ink focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="gym">Gym / Barbell / Cable</option>
                  <option value="dumbbells">Dumbbells</option>
                  <option value="bodyweight">Bodyweight Only</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={customIsBodyweight}
                onChange={(e) => setCustomIsBodyweight(e.target.checked)}
                className="h-4 w-4 rounded border-app-border accent-[var(--color-accent)]"
              />
              <span className="text-xs text-app-ink">Bodyweight movement (weight hidden in logger)</span>
            </label>

            <Input
              label="Form Cue 1 (optional)"
              placeholder="e.g., Keep chest elevated and shoulder blades pinned."
              value={customCue1}
              onChange={(e) => setCustomCue1(e.target.value)}
              maxLength={150}
            />

            <Input
              label="Form Cue 2 (optional)"
              placeholder="e.g., Lower controlled for 2 seconds."
              value={customCue2}
              onChange={(e) => setCustomCue2(e.target.value)}
              maxLength={150}
            />

            {formError && (
              <p role="alert" className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-card">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
              <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || !customName.trim()}>
                {isSaving ? 'Saving…' : 'Save Exercise'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
