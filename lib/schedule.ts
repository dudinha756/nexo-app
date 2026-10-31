export type EventRow = {
  id: string; title: string; day: string; start_time: string; end_time: string;
  category: string; custom_category_id?: string | null; repeat_weekly: boolean; repeat_yearly?: boolean; all_day?: boolean; task_id: string | null;
};
export type TaskRow = {
  id: string; title: string; notes: string; due_date: string;
  duration_minutes: number; priority: string; status: string; subject_id: string | null;
  category?: string | null; custom_category_id?: string | null;
};
export type SubjectRow = { id: string; name: string; color: string };

export function parseDay(s: string): Date { return new Date(s + "T12:00:00Z"); }
export function dateStr(d: Date): string { return d.toISOString().slice(0, 10); }
export function addDays(s: string, n: number): string {
  const d = parseDay(s); d.setUTCDate(d.getUTCDate() + n); return dateStr(d);
}
export function monday(s: string): string {
  const d = parseDay(s), offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset); return dateStr(d);
}
export function weekdaysMatch(a: string, b: string) {
  return parseDay(a).getUTCDay() === parseDay(b).getUTCDay();
}
export function occurs(e: EventRow, day: string) {
  return e.day === day || (e.repeat_weekly && e.day <= day && weekdaysMatch(e.day, day)) || (!!e.repeat_yearly && e.day <= day && e.day.slice(5)===day.slice(5));
}
export function minutes(t: string) {
  const [h, m] = t.slice(0, 5).split(":").map(Number); return h * 60 + m;
}
export function clock(n: number) { return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`; }
/** Resolve a calendar day and clock in the same timezone used for task booking. */
export function localDayAndTime(now: Date = new Date(), timeZone = "America/Fortaleza") {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { day: `${fields.year}-${fields.month}-${fields.day}`, time: `${fields.hour}:${fields.minute}` };
}
/** A booking must not begin in the past, including earlier today. */
export function slotHasStarted(day: string, startTime: string, nowDay: string, nowTime: string) {
  return day < nowDay || (day === nowDay && minutes(startTime) <= minutes(nowTime));
}
export function validDay(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = parseDay(v); return !Number.isNaN(d.getTime()) && dateStr(d) === v;
}
export function validClock(v: unknown): v is string {
  return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}
export function overlaps(a: number, b: number, c: number, d: number) { return a < d && b > c; }
export type ConflictWarning = { eventId: string; title: string; day: string; start_time: string; end_time: string };
/** Preview collisions without changing the user's calendar. Checks the next 400 days
 * for recurring events, even when their original start date is years in the past. */
export function potentialEventConflicts(
  candidate: EventRow, existing: EventRow[], referenceDay = dateStr(new Date()),
): ConflictWarning[] {
  if (candidate.all_day) return [];
  const recurring = candidate.repeat_weekly || candidate.repeat_yearly;
  const horizon = recurring ? 400 : 1;
  const firstDay = recurring && candidate.day < referenceDay ? referenceDay : candidate.day;
  const warnings: ConflictWarning[] = [];
  for (const e of existing) {
    if (e.id === candidate.id || e.all_day ||
        !overlaps(minutes(candidate.start_time), minutes(candidate.end_time), minutes(e.start_time), minutes(e.end_time))) continue;
    for (let offset = 0; offset < horizon; offset++) {
      const day = addDays(firstDay, offset);
      if (occurs(candidate, day) && occurs(e, day)) {
        warnings.push({ eventId: e.id, title: e.title, day, start_time: e.start_time, end_time: e.end_time });
        break;
      }
    }
    if (warnings.length >= 5) break;
  }
  return warnings;
}

export function suggestedSlots(task: TaskRow, events: EventRow[], today: string, timeNow: string) {
  if (task.status === "done" || task.due_date < today) return [];
  const booked = events.filter(e => e.task_id === task.id && !e.repeat_weekly && !e.repeat_yearly && !e.all_day)
    .reduce((sum, e) => sum + minutes(e.end_time) - minutes(e.start_time), 0);
  let remaining = Math.max(0, task.duration_minutes - booked);
  if (remaining < 15) return [];
  const sessions: { day: string; start_time: string; end_time: string }[] = [];
  for (let offset = 0; offset < 15 && remaining >= 15 && sessions.length < 5; offset++) {
    const day = addDays(today, offset);
    if (day > task.due_date) break;
    let start = 8 * 60;
    if (day === today) start = Math.max(start, Math.ceil((minutes(timeNow) + 30) / 15) * 15);
    const busy = events.filter(e => !e.all_day && occurs(e, day)).map(e => [minutes(e.start_time), minutes(e.end_time)]);
    const chosen = sessions.filter(s => s.day === day).map(s => [minutes(s.start_time), minutes(s.end_time)]);
    for (let at = start; at < 21 * 60 && remaining >= 15 && sessions.length < 5; at += 15) {
      const duration = Math.min(90, remaining);
      if (at + duration > 21 * 60) continue;
      if ([...busy, ...chosen].some(([a, b]) => overlaps(at, at + duration, a, b))) continue;
      const slot = { day, start_time: clock(at), end_time: clock(at + duration) };
      sessions.push(slot); chosen.push([at, at + duration]);
      remaining -= duration;
      at += duration - 15;
    }
  }
  return sessions;
}
