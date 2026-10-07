// Dates are shown in Japan time. A front matter date such as `2026-10-06` is midnight UTC, which is
// the same calendar day in Japan.
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** `2026-10-06` */
export const formatDate = (date: Date) => formatter.format(date);
