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
  return <div role="alert" className="fixed bottom-24 left-4 right-4 z-50 flex max-w-md items-start gap-3 rounded-card-lg border border-accent/20 bg-app-card p-4 text-sm text-app-ink shadow-card-hover sm:left-auto sm:right-5 lg:bottom-5"><span className="flex-1 leading-5">{message}</span><button type="button" aria-label="Dismiss message" onClick={() => setMessage('')} className="rounded-lg p-1 text-app-subtle hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><X size={16} /></button></div>;
}
