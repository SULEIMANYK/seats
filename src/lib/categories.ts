/**
 * The category list.
 *
 * Deliberately short. outbid.lol runs twenty-seven, which works at a million
 * visitors but would split a young board into a lot of empty buckets — a
 * category with one seat in it reads as a dead site, not a specialised one.
 * Add more when the seats exist to fill them.
 */
export const CATEGORIES = [
  "AI & Agents",
  "Developer Tools",
  "Design & Creative",
  "Marketing & Growth",
  "Sales & CRM",
  "Productivity",
  "Finance & Ops",
  "Data & Analytics",
  "Security & Compliance",
  "Hiring & People",
  "Ecommerce",
  "Social & Creator",
  "Education",
  "Health & Fitness",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isValidCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}
