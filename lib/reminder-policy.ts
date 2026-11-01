/** Optional reminders run only while the NEXO page is open and visible. */
export type ReminderSettings = {
  enabled: boolean;
  lead: number;
  categories: string[];
  maxDaily: number;
};
export const REMINDER_DAILY_LIMITS = [1, 3, 5, 10] as const;
export const DEFAULT_DAILY_LIMIT = 5;

/** Old saved preferences (without maxDaily) remain valid and get a safe default. */
export function normalizeReminderSettings(value: unknown): ReminderSettings | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.enabled !== "boolean" ||
      ![15, 30, 60].includes(raw.lead as number) ||
      !Array.isArray(raw.categories) ||
      !raw.categories.every(category => typeof category === "string")) return null;
  const maxDaily = REMINDER_DAILY_LIMITS.includes(raw.maxDaily as 1 | 3 | 5 | 10)
    ? raw.maxDaily as number : DEFAULT_DAILY_LIMIT;
  return {
    enabled: raw.enabled,
    lead: raw.lead as number,
    categories: [...new Set(raw.categories as string[])],
    maxDaily,
  };
}

export function maySendReminder(sentToday: number, maxDaily: number): boolean {
  return Number.isInteger(sentToday) && sentToday >= 0 &&
    REMINDER_DAILY_LIMITS.includes(maxDaily as 1 | 3 | 5 | 10) &&
    sentToday < maxDaily;
}
