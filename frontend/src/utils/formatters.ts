// Format currency in Pakistani Rupees (PKR / Rs.)
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'Rs. 0';
  }
  const rounded = Math.round(amount);
  return `Rs. ${rounded.toLocaleString('en-PK')}`;
}

// Format optical sphere / cylinder values with sign (e.g. +1.50 or -2.25)
export function formatOpticalDiopter(val: string | number | undefined | null): string {
  if (val === undefined || val === null || val === '') {
    return '-';
  }
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return String(val);
  const formatted = num.toFixed(2);
  return num > 0 ? `+${formatted}` : formatted;
}

// Format axis in degrees (e.g. 180°)
export function formatOpticalAxis(val: string | number | undefined | null): string {
  if (val === undefined || val === null || val === '') {
    return '-';
  }
  return `${val}°`;
}

// Format date nicely
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

// Format relative time (e.g. 10 mins ago)
export function formatRelativeTime(dateString: string | undefined | null): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
  } catch {
    return dateString || '';
  }
}
