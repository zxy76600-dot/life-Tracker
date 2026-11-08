import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, EmptyState } from '../components/ui';
import { useMoodStore } from '../stores/moodStore';
import { useThemeStore } from '../stores/themeStore';
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
  const { entries, addEntry, removeEntry, getTodayEntry } = useMoodStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

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
    <div className="space-y-6">
      {/* Log Today's Mood */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
          {todayEntry ? "Update Today's Mood" : "How are you feeling today?"}
        </h3>

        <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
          {([1, 2, 3, 4, 5] as MoodLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => setSelectedMood(level)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl p-3.5 transition-all cursor-pointer ${
                selectedMood === level
                  ? 'scale-110 bg-neutral-100 ring-2 ring-neutral-900 shadow-sm dark:bg-neutral-800 dark:ring-white'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
              } ${
                todayEntry?.mood === level && selectedMood === null ? 'bg-neutral-100 ring-1 ring-neutral-300 dark:bg-neutral-800/60 dark:ring-neutral-700' : ''
              }`}
            >
              <span className="text-3xl">{MOOD_EMOJIS[level]}</span>
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{MOOD_LABELS[level]}</span>
            </button>
          ))}
        </div>

        {selectedMood && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-5 space-y-3"
          >
            <textarea
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 shadow-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
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
          <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Mood Trend (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="moodGradient30" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#262626' : '#e5e5e5'} />
              <XAxis dataKey="date" stroke={isDark ? '#737373' : '#a3a3a3'} fontSize={11} interval="preserveStartEnd" />
              <YAxis domain={[1, 5]} stroke={isDark ? '#737373' : '#a3a3a3'} fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#171717' : '#ffffff',
                  border: `1px solid ${isDark ? '#262626' : '#e5e5e5'}`,
                  borderRadius: '10px',
                  color: isDark ? '#ffffff' : '#0a0a0a',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Area
                type="monotone"
                dataKey="mood"
                stroke="#8b5cf6"
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
        <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Past Entries</h3>
        {sortedEntries.length === 0 ? (
          <EmptyState
            icon={Smile}
            title="No mood entries yet"
            description="Log your first mood above to start tracking how you feel."
          />
        ) : (
          <div className="space-y-2">
            {sortedEntries.slice(0, 14).map((entry) => (
              <Card key={entry.id} hover>
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{MOOD_EMOJIS[entry.mood as MoodLevel]}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-200">
                        {MOOD_LABELS[entry.mood as MoodLevel]}
                      </span>
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">{formatDate(entry.date)}</span>
                    </div>
                    {entry.note && (
                      <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{entry.note}</p>
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
