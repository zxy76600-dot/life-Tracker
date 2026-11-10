import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export function CloudNotice() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const onError = (event: Event) => setMessage((event as CustomEvent<string>).detail);
    window.addEventListener('life-tracker-cloud-error', onError);
    return () => window.removeEventListener('life-tracker-cloud-error', onError);
  }, []);
  if (!message) return null;
  return <div role="alert" className="fixed bottom-20 right-4 z-50 flex max-w-md items-start gap-3 rounded-xl border border-red-300 bg-white p-4 text-sm text-red-700 shadow-lg dark:border-red-900 dark:bg-neutral-900 dark:text-red-300 lg:bottom-4"><span>{message}</span><button aria-label="Dismiss message" onClick={() => setMessage('')}><X size={16} /></button></div>;
}
