import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Card, Button, EmptyState } from '../components/ui';
import { useMoodStore } from '../stores/moodStore';
import { MOOD_EMOJIS, MOOD_LABELS, type MoodLevel } from '../types';
import { formatDate } from '../utils/helpers';
import { Smile, Trash2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';

/**
 * Mood Journal — Log and track your daily mood with optional notes.
 * Features true black and white theme support.
 */
export default function MoodJournal() {
  const shouldReduceMotion = useReducedMotion();
  const { entries, addEntry, removeEntry, getTodayEntry } = useMoodStore();
  const [selectedMood, setSelectedMood] = useState<MoodLevel | null>(null);
  const [note, setNote] = useState('');

  const todayEntry = getTodayEntry();

  const handleLogMood = () => {
    if (selectedMood) {
      addEntry(selectedMood, note);
      setSelectedMood(null);
      setNote('');
    }
  };

  // Chart data for last 30 days
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const date = format(subDays(new Date(), 29 - i), 'yyyy-MM-dd');
    const entry = entries.find((e) => e.date === date);
    return {
      date: format(parseISO(date), 'MMM d'),
      mood: entry?.mood ?? null,
    };
  });

  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Log Today's Mood */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cat-teal">Daily check-in</p>
        <h3 className="mb-5 mt-1 text-xl font-bold tracking-tight text-app-ink sm:text-2xl">
          {todayEntry ? "Update Today's Mood" : "How are you feeling today?"}
        </h3>

        <div role="group" aria-label="Choose today's mood" className="flex flex-wrap justify-center gap-2 sm:gap-4">
          {([1, 2, 3, 4, 5] as MoodLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => setSelectedMood(level)}
              aria-pressed={selectedMood === level}
              className={`flex min-w-[58px] flex-col items-center gap-1.5 rounded-2xl p-3 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer ${
                selectedMood === level
                  ? 'bg-accent-soft ring-2 ring-accent shadow-card dark:bg-accent/15'
                  : 'hover:bg-app-muted'
              } ${
                todayEntry?.mood === level && selectedMood === null ? 'bg-cat-teal/10 ring-1 ring-cat-teal/40 dark:bg-cat-teal/10' : ''
              }`}
            >
              <span className="text-3xl">{MOOD_EMOJIS[level]}</span>
              <span className="text-xs font-medium text-app-subtle">{MOOD_LABELS[level]}</span>
            </button>
          ))}
        </div>

        {selectedMood && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, height: 'auto' }}
            className="mt-5 space-y-3"
          >
            <textarea
              className="w-full rounded-card border border-app-border bg-app-card px-4 py-3 text-app-ink shadow-sm placeholder:text-app-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              rows={3}
              placeholder="What's on your mind? (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setSelectedMood(null)}>Cancel</Button>
              <Button onClick={handleLogMood}>
                {todayEntry ? 'Update Mood' : 'Log Mood'}
              </Button>
            </div>
          </motion.div>
        )}
      </Card>

      {/* Mood Trend Chart */}
      {entries.length > 0 && (
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-app-ink">
            Mood Trend (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="moodGradient30" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-cat-teal)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-cat-teal)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-app-border)" />
              <XAxis dataKey="date" stroke="var(--color-app-subtle)" fontSize={11} interval="preserveStartEnd" />
              <YAxis domain={[1, 5]} stroke="var(--color-app-subtle)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--app-card)',
                  border: '1px solid var(--app-border)',
                  borderRadius: 'var(--radius-card)',
                  color: 'var(--app-ink)',
                  boxShadow: 'var(--shadow-card)',
                }}
              />
              <Area
                type="monotone"
                dataKey="mood"
                stroke="var(--color-cat-teal)"
                fill="url(#moodGradient30)"
                strokeWidth={2}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Past Entries */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-app-ink">Past Entries</h3>
        {sortedEntries.length === 0 ? (
          <EmptyState
            icon={Smile}
            title="No mood entries yet"
            description="Log your first mood above to start tracking how you feel."
          />
        ) : (
          <div className="space-y-3">
            {sortedEntries.slice(0, 14).map((entry) => (
              <Card key={entry.id} hover>
                <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cat-teal/10 text-2xl">{MOOD_EMOJIS[entry.mood as MoodLevel]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-app-ink">
                        {MOOD_LABELS[entry.mood as MoodLevel]}
                      </span>
                      <span className="text-xs text-app-subtle">{formatDate(entry.date)}</span>
                    </div>
                    {entry.note && (
                      <p className="mt-0.5 break-words text-sm text-app-subtle">{entry.note}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeEntry(entry.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
