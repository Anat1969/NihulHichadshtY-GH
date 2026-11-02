/**
 * Format an ISO date string or Date to DD-MM-YYYY for Hebrew UI display.
 * Handles ISO dates (YYYY-MM-DD), datetime strings, and Date objects.
 */
export function formatDate(input: string | Date | undefined | null): string {
  if (!input) return '—';
  try {
    if (typeof input === 'string') {
      // Handle ISO date YYYY-MM-DD
      const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
    }
    const d = new Date(input);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return '—';
  }
}

/**
 * Format date and time for display: DD-MM-YYYY HH:MM
 */
export function formatDateTime(input: string | Date | undefined | null): string {
  if (!input) return '—';
  try {
    const d = new Date(input);
    if (isNaN(d.getTime())) return formatDate(input);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  } catch {
    return formatDate(input);
  }
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
