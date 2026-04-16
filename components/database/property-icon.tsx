"use client";

import type { PropertyType } from "@/lib/types";
import {
  Type, Hash, Calendar, CheckSquare, Link, Mail, Phone,
  List, Tag, Clock, CircleDot, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<PropertyType, React.ComponentType<{ className?: string }>> = {
  title: FileText,
  text: Type,
  number: Hash,
  select: List,
  multi_select: Tag,
  status: CircleDot,
  date: Calendar,
  checkbox: CheckSquare,
  url: Link,
  email: Mail,
  phone: Phone,
  created_time: Clock,
  last_edited_time: Clock,
};

export function PropertyIcon({
  type,
  className,
}: {
  type: PropertyType;
  className?: string;
}) {
  const Icon = ICON_MAP[type] ?? Type;
  return <Icon className={cn("h-3.5 w-3.5 text-muted-foreground", className)} />;
}
