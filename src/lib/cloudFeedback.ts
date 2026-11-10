export function reportCloudError(error: unknown) {
  const message = error instanceof Error ? error.message : 'A cloud data operation failed.';
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('life-tracker-cloud-error', { detail: message }));
  }
}

