import { useMemo, useState } from 'react';
import { FileUp, Plus, Trash2 } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { useFinanceStore } from '../../stores/financeStore';
import { generateId } from '../../utils/helpers';
import type { FinanceCurrency, FinanceKeywordRule } from '../../types';
import { FINANCE_EXPENSE_CATEGORIES, FINANCE_INCOME_CATEGORIES } from './financeConstants';
import { StatementImport } from './StatementImport';

const currencies: Array<{ code: FinanceCurrency; name: string }> = [
  { code: 'INR', name: 'Indian rupee' }, { code: 'NPR', name: 'Nepalese rupee' }, { code: 'USD', name: 'US dollar' },
  { code: 'EUR', name: 'Euro' }, { code: 'GBP', name: 'British pound' }, { code: 'CAD', name: 'Canadian dollar' },
  { code: 'AUD', name: 'Australian dollar' }, { code: 'JPY', name: 'Japanese yen' }, { code: 'SGD', name: 'Singapore dollar' },
  { code: 'NZD', name: 'New Zealand dollar' }, { code: 'CHF', name: 'Swiss franc' }, { code: 'CNY', name: 'Chinese yuan' },
  { code: 'AED', name: 'UAE dirham' }, { code: 'BDT', name: 'Bangladeshi taka' }, { code: 'PKR', name: 'Pakistani rupee' },
  { code: 'ZAR', name: 'South African rand' },
];

export function FinancePreferences() {
  const finance = useFinanceStore();
  const [importOpen, setImportOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState<string>(FINANCE_EXPENSE_CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const options = type === 'expense' ? FINANCE_EXPENSE_CATEGORIES : FINANCE_INCOME_CATEGORIES;
  const sortedRules = useMemo(() => [...finance.financeSettings.keywordRules].sort((a, b) => a.keyword.localeCompare(b.keyword)), [finance.financeSettings.keywordRules]);
  const changeType = (next: 'income' | 'expense') => { setType(next); setCategory(next === 'income' ? FINANCE_INCOME_CATEGORIES[0] : FINANCE_EXPENSE_CATEGORIES[0]); };
  const addRule = async () => {
    setError(''); setMessage(''); const value = keyword.trim();
    if (!value) { setError('Enter a keyword to match.'); return; }
    const exists = finance.financeSettings.keywordRules.some((rule) => rule.keyword.toLowerCase() === value.toLowerCase() && rule.type === type);
    if (exists) { setError('That keyword already has a rule for this type.'); return; }
    const rule: FinanceKeywordRule = { id: generateId(), keyword: value, type, category };
    try { await finance.saveSettings({ ...finance.financeSettings, keywordRules: [...finance.financeSettings.keywordRules, rule] }); setKeyword(''); setMessage('Category rule saved.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the rule.'); }
  };
  const removeRule = async (id: string) => {
    try { await finance.saveSettings({ ...finance.financeSettings, keywordRules: finance.financeSettings.keywordRules.filter((rule) => rule.id !== id) }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not remove the rule.'); }
  };
  const saveCurrency = async (value: FinanceCurrency) => {
    try { await finance.saveSettings({ ...finance.financeSettings, currency: value }); setMessage('Currency updated.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the currency.'); }
  };

  return <>
    <Card className="space-y-4 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-app-ink">Finance settings</h2><p className="text-xs text-app-subtle">Currency and your statement category suggestions.</p></div><Button variant="secondary" onClick={() => setImportOpen(true)}><FileUp size={16}/>Import statement CSV</Button></div>
      <label className="block max-w-sm"><span className="mb-1 block text-sm font-semibold text-app-ink">Currency</span><select value={finance.financeSettings.currency} onChange={(event) => void saveCurrency(event.target.value as FinanceCurrency)} className="min-h-10 w-full rounded-card border border-app-border bg-app-bg px-3 text-sm text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{currencies.map((item) => <option value={item.code} key={item.code}>{item.code} · {item.name}</option>)}</select></label>
      <div className="border-t border-app-border pt-4"><h3 className="text-sm font-bold text-app-ink">Category keywords</h3><p className="mt-1 text-xs text-app-subtle">CSV rows containing a keyword get this suggested category. You can change every suggestion before saving.</p><div className="mt-3 grid gap-2 sm:grid-cols-[minmax(8rem,1fr)_8rem_minmax(10rem,1.2fr)_auto] sm:items-end"><label className="block"><span className="mb-1 block text-xs font-semibold text-app-ink">Type</span><select value={type} onChange={(event) => changeType(event.target.value as typeof type)} className="min-h-10 w-full rounded-card border border-app-border bg-app-bg px-2 text-sm text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><option value="expense">Expense</option><option value="income">Income</option></select></label><label className="block"><span className="mb-1 block text-xs font-semibold text-app-ink">Keyword</span><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="e.g. swiggy" className="min-h-10 w-full rounded-card border border-app-border bg-app-bg px-3 text-sm text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" /></label><label className="block"><span className="mb-1 block text-xs font-semibold text-app-ink">Category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-10 w-full rounded-card border border-app-border bg-app-bg px-2 text-sm text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{options.map((item) => <option key={item}>{item}</option>)}</select></label><Button onClick={() => void addRule()}><Plus size={15}/>Add rule</Button></div>
        {sortedRules.length > 0 && <div className="mt-3 space-y-2">{sortedRules.map((rule) => <div key={rule.id} className="flex items-center gap-2 rounded-lg bg-app-bg px-3 py-2 text-xs"><code className="max-w-[40%] truncate rounded bg-app-muted px-1.5 py-1 text-app-ink">{rule.keyword}</code><span className="text-app-subtle">→</span><span className="min-w-0 flex-1 truncate font-medium text-app-ink">{rule.category} <span className="font-normal text-app-subtle">· {rule.type}</span></span><button type="button" aria-label={`Remove rule for ${rule.keyword}`} onClick={() => void removeRule(rule.id)} className="rounded p-1 text-app-subtle hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Trash2 size={14}/></button></div>)}</div>}
      </div>
      {error && <p role="alert" className="text-sm text-accent-strong">{error}</p>}{message && <p role="status" className="text-sm text-cat-green-ink">{message}</p>}
    </Card>
    <StatementImport isOpen={importOpen} onClose={() => setImportOpen(false)} />
  </>;
}
