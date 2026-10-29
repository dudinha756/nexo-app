/** Shared category vocabulary. Legacy keys remain stable for existing users. */
export const DEFAULT_CATEGORIES = [
  { id: "work", label: "Trabalho", color: "#DC775F", icon: "briefcase-business" },
  { id: "training", label: "Atividade física", color: "#5C9983", icon: "dumbbell" },
  { id: "class", label: "Aulas", color: "#8876BC", icon: "graduation-cap" },
  { id: "study", label: "Estudos", color: "#A08AC9", icon: "book-open" },
  { id: "personal", label: "Pessoal", color: "#B58A65", icon: "calendar-days" },
  { id: "birthday", label: "Aniversários", color: "#C575A0", icon: "cake" },
  { id: "dining", label: "Jantares e refeições", color: "#D28E54", icon: "utensils" },
  { id: "friends", label: "Amigos e encontros", color: "#6C91C3", icon: "users" },
  { id: "family", label: "Família", color: "#B68D7E", icon: "heart-handshake" },
  { id: "health", label: "Saúde", color: "#579F9A", icon: "heart-pulse" },
  { id: "leisure", label: "Lazer", color: "#8E9B5B", icon: "sun" },
  { id: "other", label: "Outros", color: "#8E939D", icon: "tag" }
] as const;

export type DefaultCategoryId = (typeof DEFAULT_CATEGORIES)[number]["id"];
export type CustomCategoryRow = { id: string; name: string; color: string; icon: string };
export function isDefaultCategory(value: unknown): value is DefaultCategoryId {
  return typeof value === "string" && DEFAULT_CATEGORIES.some(c => c.id === value);
}
export function validCategoryName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 2 && value.trim().length <= 60;
}
export function validCategoryColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}
export function validCategoryIcon(value: unknown): value is string {
  return typeof value === "string" && /^[a-z][a-z0-9-]{0,31}$/.test(value);
}
/** Keep the old academic association when a task predates categories. */
export function taskCategory(category: string | null | undefined, subjectId: string | null | undefined): DefaultCategoryId {
  return isDefaultCategory(category) ? category : (subjectId ? "study" : "personal");
}
