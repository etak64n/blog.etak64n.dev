// Dates are shown in Japan time. Workers run in UTC, so without a time zone a post published
// shortly after midnight JST would show the previous day.
const parts = new Intl.DateTimeFormat("ja-JP", {
	timeZone: "Asia/Tokyo",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

/** `2026/11/13` */
export function formatDate(date: Date): string {
	const values = Object.fromEntries(parts.formatToParts(date).map((part) => [part.type, part.value]));
	return `${values.year}/${values.month}/${values.day}`;
}
