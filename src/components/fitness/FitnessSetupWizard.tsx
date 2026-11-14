import { useState } from 'react';
import { Card, Button, Modal } from '../ui';
import type {
  FitnessEquipment,
  FitnessExperience,
  FitnessGoalMode,
  FitnessProfile,
  FitnessUnit,
} from '../../types';
import { useFitnessStore } from '../../stores/fitnessStore';
import { generateFitnessPlan } from '../../utils/fitnessPlans';
import { ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

interface SetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfile?: FitnessProfile | null;
}

export function FitnessSetupWizard({ isOpen, onClose, initialProfile }: SetupWizardProps) {
  const { updateProfile, setPlan, getCurrentPlan } = useFitnessStore();

  const [goalMode, setGoalMode] = useState<FitnessGoalMode>(initialProfile?.goalMode || 'basic');
  const [experience, setExperience] = useState<FitnessExperience>(initialProfile?.experience || 'beginner');
  const [trainingDays, setTrainingDays] = useState<number>(initialProfile?.trainingDaysPerWeek || 3);
  const [equipment, setEquipment] = useState<FitnessEquipment>(initialProfile?.equipment || 'gym');
  const [units, setUnits] = useState<FitnessUnit>(initialProfile?.units || 'kg');
  const [confirmed18, setConfirmed18] = useState<boolean>(initialProfile?.confirmed18OrOlder || false);
  const [hideWeight, setHideWeight] = useState<boolean>(initialProfile?.hideWeight || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isAdultMode = goalMode === 'bulk' || goalMode === 'cut';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isAdultMode && !confirmed18) {
      setError('Bulk and Cut modes require confirming you are 18 or older. You can also select Basic Fitness.');
      return;
    }

    setSaving(true);
    try {
      const profile: FitnessProfile = {
        goalMode: isAdultMode && !confirmed18 ? 'basic' : goalMode,
        experience,
        trainingDaysPerWeek: trainingDays,
        equipment,
        units,
        confirmed18OrOlder: confirmed18,
        hideWeight,
      };

      await updateProfile(profile);

      // If user doesn't have an active plan for this week, generate one
      if (!getCurrentPlan() && profile.goalMode !== 'custom') {
        const generated = generateFitnessPlan(profile);
        await setPlan(generated);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save fitness profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialProfile ? 'Edit Fitness Profile' : 'Fitness Setup'}>
      <form onSubmit={handleSubmit} className="space-y-5 text-sm">
        {/* Goal Mode */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-app-subtle mb-2">
            Goal Mode
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { id: 'basic', label: 'Basic Fitness', desc: 'Consistency & health' },
              { id: 'bulk', label: 'Bulk (18+)', desc: 'Build muscle' },
              { id: 'cut', label: 'Cut (18+)', desc: 'Fat loss' },
              { id: 'custom', label: 'Custom', desc: 'Build your own' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setGoalMode(mode.id as FitnessGoalMode)}
                className={`flex flex-col items-start p-3 rounded-card border text-left transition-colors cursor-pointer ${
                  goalMode === mode.id
                    ? 'border-accent bg-accent/10 text-app-ink ring-2 ring-accent/30'
                    : 'border-app-border bg-app-card hover:bg-app-muted text-app-subtle'
                }`}
              >
                <span className="font-semibold text-xs text-app-ink">{mode.label}</span>
                <span className="text-[11px] mt-0.5">{mode.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 18+ Confirmation required for Bulk and Cut */}
        {isAdultMode && (
          <Card className="border-cat-amber/30 bg-cat-amber/5 p-3.5 space-y-2">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-cat-amber shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-app-ink">Age Check (No date of birth stored)</p>
                <p className="text-app-subtle mt-0.5">
                  Bulk and Cut modes are designed for adults. If you are under 18, please select Basic Fitness.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed18}
                onChange={(e) => setConfirmed18(e.target.checked)}
                className="h-4 w-4 rounded border-app-border accent-[var(--color-accent)] focus:ring-accent"
              />
              <span className="text-xs font-medium text-app-ink">I am 18 or older</span>
            </label>
          </Card>
        )}

        {/* Experience Level */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-app-subtle mb-2">
            Experience Level
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'beginner', label: 'Beginner', desc: '< 1 year regular lifting' },
              { id: 'intermediate', label: 'Intermediate', desc: '1+ years consistent training' },
            ].map((exp) => (
              <button
                key={exp.id}
                type="button"
                onClick={() => setExperience(exp.id as FitnessExperience)}
                className={`p-3 rounded-card border text-left transition-colors cursor-pointer ${
                  experience === exp.id
                    ? 'border-accent bg-accent/10 text-app-ink ring-2 ring-accent/30'
                    : 'border-app-border bg-app-card hover:bg-app-muted text-app-subtle'
                }`}
              >
                <p className="font-semibold text-xs text-app-ink">{exp.label}</p>
                <p className="text-[11px] text-app-subtle mt-0.5">{exp.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Training Days per Week */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-app-subtle mb-2">
            Training Days per Week
          </label>
          <div className="flex gap-2">
            {[3, 4, 5].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setTrainingDays(days)}
                className={`flex-1 py-2.5 rounded-card border text-center font-bold text-sm transition-colors cursor-pointer ${
                  trainingDays === days
                    ? 'border-accent bg-accent text-white shadow-accent'
                    : 'border-app-border bg-app-card hover:bg-app-muted text-app-ink'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>
        </div>

        {/* Equipment & Units */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-app-subtle mb-2">
              Equipment Available
            </label>
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value as FitnessEquipment)}
              className="w-full rounded-card border border-app-border bg-app-card px-3 py-2 text-sm text-app-ink focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="gym">Full Gym (Barbell & Machines)</option>
              <option value="dumbbells">Dumbbells Only</option>
              <option value="bodyweight">Bodyweight Only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-app-subtle mb-2">
              Units
            </label>
            <div className="flex gap-2">
              {(['kg', 'lb'] as FitnessUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnits(u)}
                  className={`flex-1 py-2 rounded-card border text-center font-semibold text-sm transition-colors cursor-pointer ${
                    units === u
                      ? 'border-accent bg-accent text-white shadow-accent'
                      : 'border-app-border bg-app-card hover:bg-app-muted text-app-ink'
                  }`}
                >
                  {u.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hide weight toggle */}
        <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={hideWeight}
            onChange={(e) => setHideWeight(e.target.checked)}
            className="h-4 w-4 rounded border-app-border accent-[var(--color-accent)] focus:ring-accent"
          />
          <span className="text-xs text-app-subtle">
            Hide body weight everywhere (focus entirely on strength and consistency)
          </span>
        </label>

        {/* Medical disclaimer note */}
        <div className="rounded-card border border-app-border bg-app-muted/50 p-3 text-[11px] leading-5 text-app-subtle flex items-start gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-app-subtle" />
          <span>
            <strong>General guidance, not medical advice.</strong> If you're pregnant, have a medical condition or injury, or find dieting stressful, talk to a doctor or dietitian.
          </span>
        </div>

        {error && (
          <p role="alert" className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-card border border-red-200 dark:border-red-800">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Sparkles size={16} />
            {saving ? 'Saving…' : initialProfile ? 'Save Changes' : 'Create My Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
