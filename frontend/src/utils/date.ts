export const parseUTCDate = (dateStr: string | Date | undefined | null): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  if (typeof dateStr === 'string') {
    let cleanStr = dateStr.trim();
    // Replace space between date and time with 'T' if it matches YYYY-MM-DD HH:MM...
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(cleanStr)) {
      cleanStr = cleanStr.replace(/\s+/, 'T');
    }
    // If it lacks timezone offset, append 'Z' to treat as UTC
    if (!cleanStr.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(cleanStr)) {
      cleanStr = cleanStr + 'Z';
    }
    return new Date(cleanStr);
  }
  return new Date(dateStr);
};

export const formatDate = (dateStr: string | Date | undefined | null, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string => {
  if (!dateStr) return '';
  const date = parseUTCDate(dateStr);
  return date.toLocaleDateString([], options);
};

export const formatTime = (dateStr: string | Date | undefined | null, options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' }): string => {
  if (!dateStr) return '';
  const date = parseUTCDate(dateStr);
  return date.toLocaleTimeString([], options);
};
