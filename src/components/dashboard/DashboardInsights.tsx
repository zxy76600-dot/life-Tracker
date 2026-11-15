import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts';
import { useReducedMotion } from 'framer-motion';
import { Flame, ListTodo, Dumbbell, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/helpers';
import { useThemeStore } from '../../stores/themeStore';
import { DashboardCard } from './DashboardCard';

export interface WeekChartPoint { date: string; day: string; tasks: number; habits: number }
export interface MoodChartPoint { date: string; day: string; mood: number | null }
export interface DashboardStat {
  id: 'streak' | 'tasks' | 'workouts' | 'balance';
  label: string;
  value: number;
  detail: string;
  sparkline: number[];
  planned?: number;
}

function useCountUp(value: number, reduceMotion: boolean) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduceMotion) { setShown(value); return; }
    const started = performance.now();
    const duration = 520;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setShown(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduceMotion]);
  return shown;
}

function StatCard({ stat, currency, hideAmounts }: { stat: DashboardStat; currency: string; hideAmounts: boolean }) {
  const systemReduceMotion = useReducedMotion();
  const preferenceReduceMotion = useThemeStore((state) => state.reduceMotion);
  const reduceMotion = systemReduceMotion || preferenceReduceMotion;
  const animated = useCountUp(stat.value, Boolean(reduceMotion));
  const isMoney = stat.id === 'balance';
  const shown = isMoney && hideAmounts
    ? '••••••'
    : isMoney
      ? formatCurrency(animated, currency)
      : stat.id === 'workouts'
        ? `${Math.round(animated)} / ${stat.planned ?? 0}`
        : stat.id === 'streak'
          ? `${Math.round(animated)} days`
          : `${Math.round(animated)}`;
  const tone = stat.id === 'streak' ? 'text-cat-amber' : stat.id === 'tasks' ? 'text-cat-blue' : stat.id === 'workouts' ? 'text-cat-teal' : 'text-cat-green-ink';
  const Icon = stat.id === 'streak' ? Flame : stat.id === 'tasks' ? ListTodo : stat.id === 'workouts' ? Dumbbell : TrendingUp;

  return (
    <DashboardCard label={stat.label} className="flex min-h-[146px] flex-col justify-between p-4 sm:p-4">
      <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-medium text-app-subtle">{stat.label}</p><p aria-label={shown} className="mt-2 text-2xl font-extrabold leading-none tracking-tight text-app-ink tabular-nums">{shown}</p><p className="mt-2 text-[11px] leading-4 text-app-subtle">{stat.detail}</p></div><span className={`rounded-xl bg-app-bg p-2 ${tone}`}><Icon size={18} aria-hidden="true" /></span></div>
      <div className="mt-2 h-7 w-24 self-end" role="img" aria-label={isMoney && hideAmounts ? 'Balance trend hidden' : `${stat.label} recent trend`}>
        {isMoney && hideAmounts ? <div className="mt-3 h-px w-full bg-app-border" /> : <ResponsiveContainer width="100%" height="100%"><LineChart data={stat.sparkline.map((value, index) => ({ index, value }))}><Line type="monotone" dataKey="value" stroke="var(--color-accent-contrast)" strokeWidth={2} dot={false} isAnimationActive={!reduceMotion} /></LineChart></ResponsiveContainer>}
      </div>
    </DashboardCard>
  );
}

const tooltipStyle = { backgroundColor: 'var(--app-card)', border: '1px solid var(--app-border)', borderRadius: 'var(--radius-card)', color: 'var(--app-ink)', boxShadow: 'var(--shadow-card)' };
const axisTick = { fill: 'var(--app-subtle)', fontSize: 10 };

export function DashboardInsights({ weekData, moodData, stats, currency, hideAmounts }: { weekData: WeekChartPoint[]; moodData: MoodChartPoint[]; stats: DashboardStat[]; currency: string; hideAmounts: boolean }) {
  const hasWeekActivity = weekData.some((item) => item.tasks > 0 || item.habits > 0);
  const hasMood = moodData.some((item) => item.mood !== null);
  const systemReduceMotion = useReducedMotion();
  const preferenceReduceMotion = useThemeStore((state) => state.reduceMotion);
  const reduceMotion = systemReduceMotion || preferenceReduceMotion;

  return <>
    {stats.map((stat) => <StatCard key={stat.id} stat={stat} currency={currency} hideAmounts={hideAmounts} />)}

    <DashboardCard label="This week" className="xl:col-span-2">
      <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-subtle">Monday to Sunday</p><h2 className="mt-1 text-lg font-bold text-app-ink">This week</h2></div>
      {hasWeekActivity ? <>
        <div className="mt-4 h-[205px] min-w-0" role="img" aria-label="Daily completed tasks and habits this week">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={weekData} margin={{ top: 8, right: 6, left: -22, bottom: 2 }} barGap={4}>
            <CartesianGrid stroke="var(--app-border)" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={false} interval={0} />
            <YAxis allowDecimals={false} width={28} tick={axisTick} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [value, name === 'tasks' ? 'Tasks completed' : 'Habits completed']} labelFormatter={(label) => String(label)} />
            <Bar dataKey="tasks" name="Tasks completed" fill="var(--color-accent-contrast)" radius={[5, 5, 0, 0]} maxBarSize={20} isAnimationActive={!reduceMotion} />
            <Bar dataKey="habits" name="Habits completed" fill="var(--color-cat-indigo)" radius={[5, 5, 0, 0]} maxBarSize={20} isAnimationActive={!reduceMotion} />
          </BarChart></ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-app-subtle"><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-accent-contrast" />Tasks completed</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-cat-indigo" />Habits completed</span></div>
      </> : <div className="mt-4 flex h-[205px] items-center justify-center rounded-2xl bg-app-bg px-4 text-center text-sm text-app-subtle">No completions logged this week yet. Every small step counts.</div>}
    </DashboardCard>

    <DashboardCard label="Mood over the last seven days">
      <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-subtle">Last 7 days</p><h2 className="mt-1 text-lg font-bold text-app-ink">Mood</h2></div>
      {hasMood ? <>
        <div className="mt-4 h-[205px] min-w-0" role="img" aria-label="Mood scores over the last seven days, on a scale from one to five">
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={moodData} margin={{ top: 8, right: 6, left: -20, bottom: 2 }}>
            <defs><linearGradient id="dashboardMoodFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-cat-teal)" stopOpacity={0.28} /><stop offset="100%" stopColor="var(--color-cat-teal)" stopOpacity={0.02} /></linearGradient></defs>
            <CartesianGrid stroke="var(--app-border)" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={false} interval={0} />
            <YAxis domain={[1, 5]} ticks={[1, 3, 5]} width={28} tick={axisTick} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value ?? 'No entry', 'Mood score']} />
            <Area type="monotone" dataKey="mood" stroke="var(--color-cat-teal)" strokeWidth={2.5} fill="url(#dashboardMoodFill)" connectNulls={false} isAnimationActive={!reduceMotion} activeDot={{ r: 4 }} />
          </AreaChart></ResponsiveContainer>
        </div>
        <p className="mt-2 inline-flex items-center gap-2 text-xs text-app-subtle"><i className="h-2.5 w-2.5 rounded-full bg-cat-teal" />Mood score · 1 to 5</p>
      </> : <div className="mt-4 flex h-[205px] flex-col items-center justify-center rounded-2xl bg-app-bg px-4 text-center"><p className="text-sm font-medium text-app-ink">A little reflection goes a long way.</p><Link to="/mood" className="mt-2 inline-flex min-h-10 items-center text-xs font-semibold text-app-ink underline decoration-accent underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Log today’s mood</Link></div>}
    </DashboardCard>
  </>;
}
