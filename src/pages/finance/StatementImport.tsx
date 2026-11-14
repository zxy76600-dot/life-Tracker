import { useMemo, useState } from 'react';
import { AlertTriangle, FileUp, Upload } from 'lucide-react';
import { Button, Modal } from '../../components/ui';
import { useFinanceStore } from '../../stores/financeStore';
import type { FinanceKeywordRule } from '../../types';
import { parseCsv, parseStatementAmount, parseStatementDate } from './csvTools';
import { FINANCE_EXPENSE_CATEGORIES, FINANCE_INCOME_CATEGORIES } from './financeConstants';

type PreviewRow = { id: number; date: string; description: string; amount: number; type: 'income' | 'expense'; category: string; selected: boolean; duplicate: boolean; error: string };

function findHeader(headers: string[], pattern: RegExp) { return headers.findIndex((header) => pattern.test(header.toLowerCase())); }

export function StatementImport({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const finance = useFinanceStore();
  const [headers, setHeaders] = useState<string[]>([]);
  const [sourceRows, setSourceRows] = useState<string[][]>([]);
  const [dateColumn, setDateColumn] = useState(-1);
  const [descriptionColumn, setDescriptionColumn] = useState(-1);
  const [amountColumn, setAmountColumn] = useState(-1);
  const [debitColumn, setDebitColumn] = useState(-1);
  const [creditColumn, setCreditColumn] = useState(-1);
  const [mode, setMode] = useState<'amount' | 'debit-credit'>('amount');
  const [walletId, setWalletId] = useState('');
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const activeWallets = finance.wallets.filter((wallet) => !wallet.archivedAt);
  const selectClass = 'min-h-10 w-full rounded-card border border-app-border bg-app-bg px-3 text-sm text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
  const importable = preview.filter((item) => item.selected && !item.error);
  const dataRowCount = sourceRows.length;
  const close = () => { setHeaders([]); setSourceRows([]); setPreview([]); setError(''); setMessage(''); onClose(); };

  const onFile = async (file?: File) => {
    if (!file) return;
    setError(''); setMessage(''); setPreview([]);
    try {
      const parsed = parseCsv(await file.text());
      if (parsed.length < 2) throw new Error('The CSV needs a header row and at least one data row.');
      const nextHeaders = parsed[0].map((item, index) => item.trim() || `Column ${index + 1}`);
      const dateIndex = findHeader(nextHeaders, /date|posted|transaction/);
      const descriptionIndex = findHeader(nextHeaders, /description|details|narration|merchant|memo/);
      const debitIndex = findHeader(nextHeaders, /debit|withdrawal|spent/);
      const creditIndex = findHeader(nextHeaders, /credit|deposit|received/);
      const amountIndex = findHeader(nextHeaders, /amount|value/);
      setHeaders(nextHeaders); setSourceRows(parsed.slice(1)); setDateColumn(dateIndex); setDescriptionColumn(descriptionIndex);
      setDebitColumn(debitIndex); setCreditColumn(creditIndex); setAmountColumn(amountIndex);
      setMode(debitIndex >= 0 && creditIndex >= 0 ? 'debit-credit' : 'amount');
      setWalletId(activeWallets[0]?.id ?? '');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not read this CSV file.'); }
  };
  const duplicateFor = (row: Pick<PreviewRow, 'date' | 'description' | 'amount'>) => finance.transactions.some((item) => item.walletId === walletId && item.date === row.date && Math.round(item.amount * 100) === Math.round(row.amount * 100) && item.description.trim().toLocaleLowerCase() === row.description.trim().toLocaleLowerCase());
  const suggestedCategory = (description: string, type: PreviewRow['type']) => {
    const match = finance.financeSettings.keywordRules.find((rule: FinanceKeywordRule) => rule.type === type && rule.keyword.trim() && description.toLocaleLowerCase().includes(rule.keyword.trim().toLocaleLowerCase()));
    return match?.category ?? 'Other';
  };
  const buildPreview = () => {
    setError('');
    if (!walletId) { setError('Create or choose a wallet first.'); return; }
    if (dateColumn < 0 || descriptionColumn < 0 || (mode === 'amount' ? amountColumn < 0 : debitColumn < 0 || creditColumn < 0)) { setError('Choose a date, description and amount column (or both debit and credit columns).'); return; }
    const seen = new Set<string>();
    const rows = sourceRows.map((record, id): PreviewRow => {
      const date = parseStatementDate(record[dateColumn] ?? '');
      const description = (record[descriptionColumn] ?? '').trim();
      const first = mode === 'amount' ? parseStatementAmount(record[amountColumn] ?? '') : parseStatementAmount(record[debitColumn] ?? '');
      const second = mode === 'debit-credit' ? parseStatementAmount(record[creditColumn] ?? '') : null;
      let type: PreviewRow['type'] = 'expense'; let amount = 0; let issue = '';
      if (!date) issue = 'Invalid date';
      else if (!description) issue = 'Missing description';
      else if (mode === 'amount') {
        if (first == null || first === 0) issue = 'Invalid or zero amount';
        else { type = first < 0 ? 'expense' : 'income'; amount = Math.abs(first); }
      } else if (first == null || second == null || (first > 0 && second > 0)) issue = 'Invalid debit / credit amount';
      else if (first > 0) { type = 'expense'; amount = first; }
      else if (second > 0) { type = 'income'; amount = second; }
      else issue = 'No amount in debit or credit';
      amount = Math.round((amount + Number.EPSILON) * 100) / 100;
      const category = suggestedCategory(description, type);
      const duplicateKey = `${walletId}|${date ?? ''}|${amount.toFixed(2)}|${description.trim().toLocaleLowerCase()}`;
      const duplicate = !issue && (duplicateFor({ date: date ?? '', description, amount }) || seen.has(duplicateKey));
      if (!issue) seen.add(duplicateKey);
      return { id, date: date ?? '', description, amount, type, category, selected: !issue && !duplicate, duplicate, error: issue };
    });
    setPreview(rows);
  };
  const updateRow = (id: number, values: Partial<PreviewRow>) => setPreview((current) => {
    const changed = current.map((item) => item.id === id ? { ...item, ...values } : item);
    const seen = new Set<string>();
    return changed.map((item) => {
      let rowError = '';
      if (!parseStatementDate(item.date)) rowError = 'Invalid date';
      else if (!item.description.trim()) rowError = 'Missing description';
      else if (!Number.isFinite(item.amount) || item.amount <= 0) rowError = 'Invalid or zero amount';
      const key = `${walletId}|${item.date}|${item.amount.toFixed(2)}|${item.description.trim().toLocaleLowerCase()}`;
      const duplicate = !rowError && (duplicateFor(item) || seen.has(key));
      if (!rowError) seen.add(key);
      return { ...item, error: rowError, duplicate };
    });
  });
  const saveSelected = async () => {
    setError(''); setBusy(true); let saved = 0;
    try {
      for (const item of importable) {
        await finance.addTransaction({ type: item.type, amount: item.amount, category: item.category, description: item.description, date: item.date, walletId });
        saved += 1;
        updateRow(item.id, { selected: false, duplicate: true });
      }
      setPreview([]); setSourceRows([]); setHeaders([]); setMessage(`${saved} transaction${saved === 1 ? '' : 's'} imported.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : `Imported ${saved} rows before an error. Review the list and retry only the rows that remain.`); }
    finally { setBusy(false); }
  };
  const categoryOptions = useMemo(() => [...FINANCE_EXPENSE_CATEGORIES, ...FINANCE_INCOME_CATEGORIES].filter((item, index, items) => items.indexOf(item) === index), []);

  return <Modal isOpen={isOpen} onClose={close} title="Import a bank or UPI CSV">
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-app-subtle">The file is read only in this browser. It is never uploaded or saved. Review each row before confirming.</p>
      {!headers.length ? <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-app-border bg-app-bg p-5 text-center focus-within:ring-2 focus-within:ring-accent"><FileUp size={27} className="text-accent"/><span className="font-semibold text-app-ink">Choose a .csv file</span><span className="text-xs text-app-subtle">Headers should be in the first row.</span><input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void onFile(event.target.files?.[0])}/></label> : <>
        <label className="block"><span className="mb-1 block text-sm font-semibold text-app-ink">Wallet for these transactions</span><select className={selectClass} value={walletId} onChange={(event) => setWalletId(event.target.value)}>{activeWallets.map((wallet) => <option value={wallet.id} key={wallet.id}>{wallet.name}</option>)}</select></label>
        <div className="grid gap-3 sm:grid-cols-2"><MapSelect label="Date column" value={dateColumn} onChange={setDateColumn} headers={headers}/><MapSelect label="Description column" value={descriptionColumn} onChange={setDescriptionColumn} headers={headers}/></div>
        <div className="grid grid-cols-2 rounded-xl bg-app-muted p-1"><button type="button" aria-pressed={mode === 'amount'} onClick={() => setMode('amount')} className={`min-h-9 rounded-lg text-xs font-semibold ${mode === 'amount' ? 'bg-app-card text-app-ink shadow-card' : 'text-app-subtle'}`}>One amount column</button><button type="button" aria-pressed={mode === 'debit-credit'} onClick={() => setMode('debit-credit')} className={`min-h-9 rounded-lg text-xs font-semibold ${mode === 'debit-credit' ? 'bg-app-card text-app-ink shadow-card' : 'text-app-subtle'}`}>Debit and credit columns</button></div>
        {mode === 'amount' ? <MapSelect label="Amount column (negative = expense)" value={amountColumn} onChange={setAmountColumn} headers={headers}/> : <div className="grid gap-3 sm:grid-cols-2"><MapSelect label="Debit column" value={debitColumn} onChange={setDebitColumn} headers={headers}/><MapSelect label="Credit column" value={creditColumn} onChange={setCreditColumn} headers={headers}/></div>}
        <Button variant="secondary" onClick={buildPreview}><Upload size={16}/>Preview {dataRowCount} rows</Button>
      </>}
      {preview.length > 0 && <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-app-ink">Review rows</h3><span className="text-xs text-app-subtle">{importable.length} selected · duplicates start unchecked</span></div>
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">{preview.map((item) => <div key={item.id} className={`rounded-xl border p-3 ${item.error ? 'border-accent/40 bg-accent-soft/40' : item.duplicate ? 'border-cat-amber/40 bg-cat-amber/5' : 'border-app-border'}`}>
          <div className="flex items-start gap-2"><input type="checkbox" checked={item.selected} disabled={Boolean(item.error)} onChange={(event) => updateRow(item.id, { selected: event.target.checked })} aria-label={`Import row ${item.id + 1}`} className="mt-2 h-4 w-4 accent-[var(--color-accent)]"/>
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block text-[10px] font-semibold text-app-subtle">Date</span><input type="date" value={item.date} onChange={(event) => updateRow(item.id, { date: event.target.value })} className="min-h-8 w-full rounded-lg border border-app-border bg-app-bg px-2 text-xs text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"/></label>
              <label className="block"><span className="mb-1 block text-[10px] font-semibold text-app-subtle">Type</span><select value={item.type} onChange={(event) => updateRow(item.id, { type: event.target.value as PreviewRow['type'] })} className="min-h-8 w-full rounded-lg border border-app-border bg-app-bg px-2 text-xs text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><option value="expense">Expense</option><option value="income">Income</option></select></label>
              <label className="block sm:col-span-2"><span className="mb-1 block text-[10px] font-semibold text-app-subtle">Description</span><input value={item.description} onChange={(event) => updateRow(item.id, { description: event.target.value })} className="min-h-8 w-full rounded-lg border border-app-border bg-app-bg px-2 text-xs text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"/></label>
              <label className="block"><span className="mb-1 block text-[10px] font-semibold text-app-subtle">Amount</span><input type="number" min="0.01" step="0.01" value={item.amount || ''} onChange={(event) => updateRow(item.id, { amount: Number(event.target.value) })} className="min-h-8 w-full rounded-lg border border-app-border bg-app-bg px-2 text-xs text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"/></label>
              <label className="block"><span className="mb-1 block text-[10px] font-semibold text-app-subtle">Category</span><select value={item.category} onChange={(event) => updateRow(item.id, { category: event.target.value })} className="min-h-8 w-full rounded-lg border border-app-border bg-app-bg px-2 text-xs text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label>
            </div>
          </div>
          {item.duplicate && <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cat-amber-ink"><AlertTriangle size={13}/>Possible duplicate: same wallet, date, amount and description.</p>}{item.error && <p className="mt-2 text-xs font-semibold text-accent-strong">{item.error}</p>}
        </div>)}</div>
        <div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={() => setPreview([])}>Clear preview</Button><Button onClick={() => void saveSelected()} disabled={!importable.length || busy}>{busy ? 'Importing…' : `Import ${importable.length} selected`}</Button></div>
      </div>}
      {error && <p role="alert" className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-strong">{error}</p>}{message && <p role="status" className="rounded-lg bg-cat-green/10 px-3 py-2 text-sm text-cat-green-ink">{message}</p>}
    </div>
  </Modal>;
}

function MapSelect({ label, value, onChange, headers }: { label: string; value: number; onChange: (value: number) => void; headers: string[] }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-app-ink">{label}</span><select className="min-h-10 w-full rounded-card border border-app-border bg-app-bg px-2 text-xs text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" value={value} onChange={(event) => onChange(Number(event.target.value))}><option value={-1}>Choose column…</option>{headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header}</option>)}</select></label>;
}
