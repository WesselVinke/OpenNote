export const SIDEBAR_MIN_WIDTH = 240;
export const SIDEBAR_MAX_WIDTH = 480;
export const SIDEBAR_DEFAULT_WIDTH = 280;
export const AUTOSAVE_DEBOUNCE_MS = 500;

export const PAGE_ICON_DEFAULT = "📄";
export const DATABASE_ICON_DEFAULT = "🗃️";

export const MEMBER_ROLES = ["OWNER", "ADMIN", "MEMBER", "GUEST"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const SELECT_COLORS = [
  { name: "Default", bg: "bg-secondary", text: "text-secondary-foreground" },
  { name: "Gray", bg: "bg-gray-200 dark:bg-gray-700", text: "text-gray-700 dark:text-gray-200" },
  { name: "Brown", bg: "bg-amber-100 dark:bg-amber-900", text: "text-amber-800 dark:text-amber-100" },
  { name: "Orange", bg: "bg-orange-100 dark:bg-orange-900", text: "text-orange-800 dark:text-orange-100" },
  { name: "Yellow", bg: "bg-yellow-100 dark:bg-yellow-900", text: "text-yellow-800 dark:text-yellow-100" },
  { name: "Green", bg: "bg-green-100 dark:bg-green-900", text: "text-green-800 dark:text-green-100" },
  { name: "Blue", bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-800 dark:text-blue-100" },
  { name: "Purple", bg: "bg-purple-100 dark:bg-purple-900", text: "text-purple-800 dark:text-purple-100" },
  { name: "Pink", bg: "bg-pink-100 dark:bg-pink-900", text: "text-pink-800 dark:text-pink-100" },
  { name: "Red", bg: "bg-red-100 dark:bg-red-900", text: "text-red-800 dark:text-red-100" },
] as const;

export type StatusGroup = "todo" | "in_progress" | "complete";

export const STATUS_CATEGORIES: { name: string; group: StatusGroup; color: string; textColor: string; bgColor: string }[] = [
  {
    name: "To Do",
    group: "todo",
    color: "bg-gray-400",
    textColor: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
  },
  {
    name: "In Progress",
    group: "in_progress",
    color: "bg-blue-500",
    textColor: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-50 dark:bg-blue-950",
  },
  {
    name: "Done",
    group: "complete",
    color: "bg-green-500",
    textColor: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-50 dark:bg-green-950",
  },
];

export const DEFAULT_STATUS_OPTIONS = [
  { id: "not_started", name: "Not Started", color: "Default", group: "todo" },
  { id: "in_progress", name: "In Progress", color: "Blue", group: "in_progress" },
  { id: "done", name: "Done", color: "Green", group: "complete" },
];
