/**
 * The category list.
 *
 * This was deliberately short at first — fifteen buckets, on the reasoning
 * that a young board splits into a lot of empty ones. That reasoning was
 * about how the board *looks*; it ignored that someone submitting a product
 * has to find themselves in the list, and "Other" is where anything
 * unrepresented goes to be invisible. So the list is now broad enough that
 * most products land somewhere real.
 *
 * Every name from the original fifteen is kept verbatim: listings store the
 * category as text, so renaming one would orphan the rows already using it.
 *
 * Order is by family — build, design, market, sell, run, and so on — because
 * this is rendered as a list someone reads top to bottom, not searched.
 */
export const CATEGORIES = [
  // Build
  "AI & Agents",
  "Developer Tools",
  "APIs & Infrastructure",
  "Databases",
  "No-code & Automation",
  "Hardware & IoT",

  // Make
  "Design & Creative",
  "Video & Audio",
  "Photography",
  "Writing & Content",

  // Reach
  "Marketing & Growth",
  "SEO",
  "Advertising",
  "Email",
  "Social & Creator",
  "Community",

  // Sell
  "Sales & CRM",
  "Customer Support",
  "Ecommerce",
  "Marketplaces",

  // Run
  "Productivity",
  "Notes & Docs",
  "Project Management",
  "Scheduling & Calendar",
  "Finance & Ops",
  "Accounting & Invoicing",
  "Payments",
  "Data & Analytics",
  "Security & Compliance",
  "Privacy",
  "Legal",
  "Hiring & People",
  "HR & Payroll",

  // Elsewhere
  "Education",
  "Health & Fitness",
  "Mental Health",
  "Food & Drink",
  "Travel",
  "Real Estate",
  "Gaming",
  "Music",
  "News & Media",
  "Science & Research",
  "Crypto & Web3",
  "Sustainability",
  "Nonprofit",

  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isValidCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}
