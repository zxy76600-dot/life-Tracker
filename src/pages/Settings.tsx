import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, CreditCard, Dumbbell, HelpCircle, Palette, Search, Shield, Sparkles, Target, Wallet } from 'lucide-react';
import { Card } from '../components/ui';
import { APP_CHANGELOG, APP_VERSION, CONTACT_EMAIL } from '../appInfo';
import AccountSettings from './settings/AccountSettings';
import AppearanceSettings from './settings/AppearanceSettings';
import DataPrivacySettings from './settings/DataPrivacySettings';

const sections = [
  { id: 'account', label: 'Account', description: 'Profile, sign-in methods and password', icon: Shield, keywords: 'profile email password avatar security' },
  { id: 'appearance', label: 'Appearance', description: 'Theme, colors, text and navigation', icon: Palette, keywords: 'theme color dark light system font size motion sidebar' },
  { id: 'data-privacy', label: 'Data & Privacy', description: 'Backups, browser import and data controls', icon: Shield, keywords: 'export restore import backup clear data privacy' },
  { id: 'modules', label: 'Modules', description: 'Open settings available in each tracker', icon: Sparkles, keywords: 'habits todo finance fitness goals' },
  { id: 'about-help', label: 'About & Help', description: 'App information and helpful links', icon: HelpCircle, keywords: 'about help contact terms privacy version' },
] as const;

const moduleLinks = [
  { to: '/habits', title: 'Habits', description: 'Open habit tracking and your routines.', icon: Target },
  { to: '/todos', title: 'To-Do', description: 'Open your task list and recurring tasks.', icon: CreditCard },
  { to: '/finances', title: 'Finances', description: 'Open your wallets, currency and amount controls.', icon: Wallet },
  { to: '/fitness', title: 'Fitness', description: 'Open your plan setup and Hide Weight control.', icon: Dumbbell },
];

function SectionContent({ section }: { section: string }) {
  if (section === 'account') return <AccountSettings />;
  if (section === 'appearance') return <AppearanceSettings />;
  if (section === 'data-privacy') return <DataPrivacySettings />;
  if (section === 'modules') return <div className="grid gap-3 sm:grid-cols-2">{moduleLinks.map(({ to, title, description, icon: Icon }) => <Link key={to} to={to} className="rounded-card border border-app-border bg-app-card p-4 shadow-card transition-colors hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span className="flex items-center justify-between"><span className="rounded-xl bg-accent/10 p-2.5 text-accent"><Icon size={19} /></span><ChevronRight size={18} className="text-app-subtle" /></span><span className="mt-3 block font-semibold text-app-ink">{title}</span><span className="mt-1 block text-sm leading-5 text-app-subtle">{description}</span></Link>)}</div>;
  return <Card><h2 className="font-semibold text-app-ink">About Life Tracker</h2><p className="mt-2 text-sm leading-6 text-app-subtle">Life Tracker helps you keep habits, goals, mood, fitness and finances in one place.</p><p className="mt-2 text-xs text-app-subtle">Version {APP_VERSION}</p><h3 className="mt-5 font-semibold text-app-ink">Recent updates</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 text-app-subtle">{APP_CHANGELOG.map((item) => <li key={item}>{item}</li>)}</ul><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"><Link className="text-app-ink underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" to="/privacy">Privacy</Link><Link className="text-app-ink underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" to="/terms">Terms</Link><a className="text-app-ink underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href={`mailto:${CONTACT_EMAIL}`}>Contact</a></div></Card>;
}

export default function Settings() {
  const { section } = useParams();
  const [query, setQuery] = useState('');
  const validSection = sections.some((item) => item.id === section);
  const visibleSections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sections.filter((item) => !normalized || `${item.label} ${item.description} ${item.keywords}`.toLowerCase().includes(normalized));
  }, [query]);
  if (section && !validSection) return <Navigate to="/settings/account" replace />;
  const selected = sections.find((item) => item.id === section) ?? sections[0];
  const showMobileHome = !section;

  return <div className="mx-auto max-w-6xl space-y-5">
    <div><p className="text-sm font-semibold uppercase tracking-wider text-accent-contrast">Preferences</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-app-ink">Settings</h2><p className="mt-1 text-sm text-app-subtle">Manage your account and personalize Life Tracker.</p></div>
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Card className="hidden h-fit p-3 lg:block">
        <label className="relative mb-3 block"><span className="sr-only">Search settings</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search settings" className="min-h-10 w-full rounded-xl border border-app-border bg-app-muted pl-9 pr-3 text-sm text-app-ink outline-none placeholder:text-app-subtle focus-visible:ring-2 focus-visible:ring-accent" /></label>
        <nav aria-label="Settings sections" className="space-y-1">{visibleSections.map((item) => { const Icon = item.icon; return <Link key={item.id} to={`/settings/${item.id}`} aria-current={section === item.id ? 'page' : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${section === item.id ? 'bg-accent-soft text-app-ink' : 'text-app-subtle hover:bg-app-muted hover:text-app-ink'}`}><Icon size={18} /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span><span className="block truncate text-xs opacity-80">{item.description}</span></span><ChevronRight size={15} /></Link>; })}{visibleSections.length === 0 && <p className="px-3 py-4 text-sm text-app-subtle">No settings match “{query}”.</p>}</nav>
      </Card>
      <section className={`${showMobileHome ? 'hidden lg:block' : ''} min-w-0`} aria-label={`${selected.label} settings`}>
        <div className="mb-4 flex items-center gap-2 lg:hidden"><Link to="/settings" className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-medium text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ArrowLeft size={16} />All settings</Link><span className="text-sm text-app-subtle">/ {selected.label}</span></div>
        <div className="mb-4 hidden lg:block"><h3 className="text-lg font-bold text-app-ink">{selected.label}</h3><p className="text-sm text-app-subtle">{selected.description}</p></div>
        <SectionContent section={selected.id} />
      </section>
      {showMobileHome && <div className="lg:hidden"><label className="relative mb-3 block"><span className="sr-only">Search settings</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search settings" className="min-h-11 w-full rounded-xl border border-app-border bg-app-card pl-9 pr-3 text-sm text-app-ink outline-none placeholder:text-app-subtle focus-visible:ring-2 focus-visible:ring-accent" /></label><p className="mb-3 text-sm text-app-subtle">Choose a section to continue.</p>{visibleSections.map((item) => { const Icon = item.icon; return <Link key={item.id} to={`/settings/${item.id}`} className="mb-2 flex min-h-14 items-center gap-3 rounded-card border border-app-border bg-app-card p-3 shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span className="rounded-xl bg-accent/10 p-2 text-accent"><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-app-ink">{item.label}</span><span className="block truncate text-xs text-app-subtle">{item.description}</span></span><ChevronRight size={17} className="text-app-subtle" /></Link>; })}{visibleSections.length === 0 && <p className="py-4 text-sm text-app-subtle">No settings match “{query}”.</p>}</div>}
    </div>
  </div>;
}
