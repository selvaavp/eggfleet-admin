/** IST-facing currency display (matches product spec). */
export function formatINR(amount: number, opts?: { fractionDigits?: number }): string {
  const fd = opts?.fractionDigits ?? 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: fd,
    maximumFractionDigits: fd,
  }).format(amount);
}
