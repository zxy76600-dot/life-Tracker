import { useState, useMemo } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { Card, Button, Badge, Modal } from '../ui';
import { useFitnessStore, getLocalMonday } from '../../stores/fitnessStore';
import { getExerciseById } from '../../data/exercises';
import type { FitnessPlanDay } from '../../types';
import { getTodayStr } from '../../utils/helpers';
import { WeeklyCheckinModal } from './WeeklyCheckinModal';
import {
  Calendar,
  Play,
  RotateCcw,
  ArrowRightLeft,
  Sparkles,
} from 'lucide-react';

interface WeekPlanViewProps {
  onStartWorkout: (planDay: FitnessPlanDay) => void;
}

export function WeekPlanView({ onStartWorkout }: WeekPlanViewProps) {
  const {
    customExercises,
    getCurrentPlan,
    skipOrMovePlanDay,
    workoutLogs,
    weeklyCheckins,
  } = useFitnessStore();

  const currentPlan = getCurrentPlan();
  const todayStr = getTodayStr();
  const mondayStr = currentPlan?.weekStartDate || getLocalMonday();
  const mondayDate = parseISO(mondayStr);

  const [movingDay, setMovingDay] = useState<FitnessPlanDay | null>(null);
  const [targetDayIndex, setTargetDayIndex] = useState<number>(0);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);

  // Check if week is ending or over (Friday..Sunday) or all planned workouts done
  const dayOfWeekIndex = (new Date().getDay() + 6) % 7;
  const isWeekEndingOrOver = dayOfWeekIndex >= 4;

  const sundayStr = format(addDays(mondayDate, 6), 'yyyy-MM-dd');
  const weekLogs = useMemo(() => {
    return workoutLogs.filter((l) => l.date >= mondayStr && l.date <= sundayStr);
  }, [workoutLogs, mondayStr, sundayStr]);

  const allPlannedDone = currentPlan
    ? currentPlan.days.every(
        (d) => d.isSkipped || weekLogs.some((l) => l.planDayId === d.id || l.date === d.scheduledDate),
      )
    : false;

  const showCheckinBanner = isWeekEndingOrOver || allPlannedDone;
  const hasCheckedInThisWeek = weeklyCheckins.some((c) => c.weekStartDate === mondayStr);

  // Generate 7 days for this Monday-to-Sunday week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(mondayDate, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayName = format(d, 'EEEE');
    const shortDay = format(d, 'EEE');
    const dayOfMonth = format(d, 'd');
    const isToday = dateStr === todayStr;

    // Find any planned day scheduled for this local date or day of week
    const plannedSession = currentPlan?.days.find(
      (p) => p.scheduledDate === dateStr,
    );

    return {
      index: i,
      dateStr,
      dayName,
      shortDay,
      dayOfMonth,
      isToday,
      plannedSession,
    };
  });

  const handleOpenMoveModal = (planDay: FitnessPlanDay) => {
    setMovingDay(planDay);
    setTargetDayIndex(planDay.dayOfWeek);
  };

  const handleConfirmMove = async () => {
    if (!movingDay) return;
    const targetDate = format(addDays(mondayDate, targetDayIndex), 'yyyy-MM-dd');

    try {
      await skipOrMovePlanDay(movingDay.id, {
        scheduledDate: targetDate,
      });
      setMovingDay(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not move planned session.');
    }
  };

  const handleToggleSkip = async (planDay: FitnessPlanDay) => {
    try {
      await skipOrMovePlanDay(planDay.id, {
        isSkipped: !planDay.isSkipped,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not update session.');
    }
  };

  if (!currentPlan) {
    return (
      <Card className="p-8 text-center space-y-3">
        <Calendar size={32} className="mx-auto text-app-subtle" />
        <h3 className="font-bold text-base text-app-ink">No Plan for This Week</h3>
        <p className="text-xs text-app-subtle max-w-sm mx-auto">
          Complete the Fitness setup wizard to generate your tailored weekly schedule.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* End-of-week Check-in Banner */}
      {showCheckinBanner && (
        <Card className="p-4 border-l-4 border-l-accent bg-accent/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent text-white shadow-accent">
              <Sparkles size={18} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-app-ink">
                {hasCheckedInThisWeek ? 'Weekly Check-In Completed' : 'Weekly Check-In Ready'}
              </h4>
              <p className="text-xs text-app-subtle">
                {hasCheckedInThisWeek
                  ? 'Your check-in reflections were saved and next week’s plan is ready.'
                  : 'Review your energy, sleep, and workouts to generate next week’s progressive overload plan.'}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setIsCheckinModalOpen(true)} className="shrink-0 text-xs">
            {hasCheckedInThisWeek ? 'Edit Check-In' : 'Complete Check-In →'}
          </Button>
        </Card>
      )}

      {/* Week Header info */}
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-accent" />
            <h3 className="font-bold text-base text-app-ink">This Week's Schedule</h3>
          </div>
          <p className="text-xs text-app-subtle mt-0.5">
            Week of {format(mondayDate, 'MMMM d, yyyy')} · {currentPlan.days.length} planned sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsCheckinModalOpen(true)}
            className="text-xs"
          >
            <Sparkles size={14} />
            {hasCheckedInThisWeek ? 'Check-In Done' : 'Weekly Check-In'}
          </Button>
          <Badge variant="blue">{currentPlan.goalMode.toUpperCase()} PLAN</Badge>
        </div>
      </Card>

      {/* 7 Days List (Mobile-friendly vertical cards with today highlighted) */}
      <div className="space-y-3">
        {weekDays.map((day) => {
          const session = day.plannedSession;

          return (
            <Card
              key={day.dateStr}
              className={`p-4 sm:p-5 transition-all ${
                day.isToday
                  ? 'border-2 border-accent bg-accent/5 ring-2 ring-accent/20'
                  : 'border border-app-border'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Date column */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex flex-col items-center justify-center w-12 h-12 rounded-card text-center shrink-0 ${
                      day.isToday
                        ? 'bg-accent text-white shadow-accent'
                        : 'bg-app-muted text-app-ink'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                      {day.shortDay}
                    </span>
                    <span className="text-base font-extrabold tabular-nums leading-none mt-0.5">
                      {day.dayOfMonth}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-app-ink">
                        {session ? session.name : 'Rest & Recovery'}
                      </h4>
                      {day.isToday && <Badge variant="red">TODAY</Badge>}
                      {session?.isSkipped && <Badge variant="slate">SKIPPED</Badge>}
                    </div>
                    <p className="text-xs text-app-subtle mt-0.5">
                      {session
                        ? `${session.exercises.length} exercises scheduled`
                        : 'Take time to stretch, hydrate, and sleep'}
                    </p>
                  </div>
                </div>

                {/* Session Actions */}
                {session ? (
                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-app-border/40 w-full sm:w-auto justify-end">
                    {!session.isSkipped ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => onStartWorkout(session)}
                          className="text-xs"
                        >
                          <Play size={14} />
                          Start Workout
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenMoveModal(session)}
                          className="text-xs"
                        >
                          <ArrowRightLeft size={13} />
                          Move
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleToggleSkip(session)}
                          className="text-xs px-2.5 py-1.5 rounded-card border border-app-border text-app-subtle hover:bg-app-muted hover:text-app-ink transition-colors cursor-pointer"
                        >
                          Skip
                        </button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleToggleSkip(session)}
                        className="text-xs"
                      >
                        <RotateCcw size={14} />
                        Unskip Session
                      </Button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-app-subtle italic hidden sm:block">
                    Rest Day
                  </span>
                )}
              </div>

              {/* Planned Exercises Preview */}
              {session && !session.isSkipped && session.exercises.length > 0 && (
                <div className="mt-3 pt-3 border-t border-app-border/40 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {session.exercises.map((ex, exIdx) => {
                    const exerciseData = getExerciseById(ex.exerciseId, customExercises);
                    return (
                      <div
                        key={exIdx}
                        className="flex items-center justify-between p-2 rounded-lg bg-app-muted/30 border border-app-border/40"
                      >
                        <span className="font-medium text-app-ink truncate mr-2">
                          {exerciseData?.name || ex.exerciseId}
                        </span>
                        <span className="text-[11px] text-app-subtle tabular-nums shrink-0">
                          {ex.targetSets} × {ex.minReps}-{ex.maxReps}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Move Session Modal (Only moves within this week!) */}
      {movingDay && (
        <Modal
          isOpen={Boolean(movingDay)}
          onClose={() => setMovingDay(null)}
          title={`Move "${movingDay.name}"`}
        >
          <div className="space-y-4 text-sm">
            <p className="text-xs text-app-subtle">
              Choose another day <strong>this week</strong> to reschedule this workout:
            </p>

            <div className="space-y-2">
              {weekDays.map((day) => {
                const isSelected = targetDayIndex === day.index;
                const isCurrent = movingDay.scheduledDate === day.dateStr;

                return (
                  <button
                    key={day.index}
                    type="button"
                    onClick={() => setTargetDayIndex(day.index)}
                    className={`w-full p-3 rounded-card border text-left flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-accent bg-accent/10 text-app-ink ring-2 ring-accent/30'
                        : 'border-app-border bg-app-card hover:bg-app-muted text-app-subtle'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-xs text-app-ink">
                        {day.dayName} ({day.shortDay}, {day.dayOfMonth})
                      </span>
                      {day.isToday && <Badge variant="red">TODAY</Badge>}
                      {isCurrent && <span className="text-[11px] text-app-subtle">(current)</span>}
                    </div>

                    {day.plannedSession && !isCurrent && (
                      <span className="text-[11px] text-cat-amber-ink">
                        Has: {day.plannedSession.name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-app-border">
              <Button variant="secondary" onClick={() => setMovingDay(null)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmMove}>
                Confirm Move
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {/* Weekly Check-In Modal */}
      {isCheckinModalOpen && (
        <WeeklyCheckinModal
          isOpen={isCheckinModalOpen}
          onClose={() => setIsCheckinModalOpen(false)}
          weekStartDate={mondayStr}
        />
      )}
    </div>
  );
}
