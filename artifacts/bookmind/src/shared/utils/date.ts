/**
 * Formats a date using Intl.DateTimeFormat respecting the active locale.
 */
export function formatHeaderDate(date: Date = new Date(), locale: string = "es-MX"): string {
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const formatted = formatter.format(date);
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return date.toDateString();
  }
}

export function formatRelativeAdded(locale: string = "es-MX"): string {
  return locale === "es-MX" ? "Continuar leyendo" : "Continue reading";
}
