import type { Page, PageType, MemberRole, Workspace, User } from "@prisma/client";

export type { Page, PageType, MemberRole, Workspace, User };

export interface PageWithChildren extends Page {
  children: PageWithChildren[];
}

export interface PropertyDefinition {
  id: string;
  name: string;
  type: PropertyType;
  options?: SelectOption[];
  width?: number;
}

export type PropertyType =
  | "title"
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "status"
  | "date"
  | "checkbox"
  | "url"
  | "email"
  | "phone"
  | "created_time"
  | "last_edited_time";

export interface SelectOption {
  id: string;
  name: string;
  color: string;
}

export type ViewType = "table" | "board" | "gallery" | "calendar" | "list" | "timeline";

export type CalculationType = "none" | "count" | "count_values" | "count_unique" | "count_empty" | "count_not_empty" | "percent_empty" | "percent_not_empty" | "sum" | "average" | "median" | "min" | "max" | "range";

export interface DatabaseView {
  id: string;
  name: string;
  type: ViewType;
  filters: FilterRule[];
  sorts: SortRule[];
  groupBy?: string;
  visibleProperties: string[];
  calendarByProperty?: string;
  galleryCardSize?: "small" | "medium" | "large";
  timelineByProperty?: string;
  timelineEndProperty?: string;
  hideEmptyGroups?: boolean;
  calculations?: Record<string, CalculationType>;
  cardProperties?: string[];
}

export interface FilterRule {
  id: string;
  propertyId: string;
  operator: FilterOperator;
  value?: string | number | boolean;
}

export type FilterOperator =
  | "is"
  | "is_not"
  | "contains"
  | "does_not_contain"
  | "is_empty"
  | "is_not_empty"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "before"
  | "after"
  | "on_or_before"
  | "on_or_after"
  | "past_week"
  | "past_month"
  | "next_week"
  | "next_month";

export interface SortRule {
  id: string;
  propertyId: string;
  direction: "ascending" | "descending";
}

export interface RowPropertyValues {
  [propertyId: string]: unknown;
}

export interface WorkspaceWithMembers extends Workspace {
  members: {
    id: string;
    role: MemberRole;
    user: Pick<User, "id" | "name" | "email" | "image">;
  }[];
}
