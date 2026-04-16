"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Page } from "@prisma/client";
import type { DatabaseView } from "@/lib/types";

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function useDatabaseRows(databaseId: string | null) {
  return useQuery({
    queryKey: ["database-rows", databaseId],
    queryFn: () => fetcher<Page[]>(`/api/databases/${databaseId}/rows`),
    enabled: !!databaseId,
  });
}

export function useCreateRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      databaseId,
      title,
      rowProperties,
    }: {
      databaseId: string;
      title?: string;
      rowProperties?: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/databases/${databaseId}/rows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, rowProperties }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<Page>;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["database-rows", vars.databaseId] });
    },
  });
}

export function useDatabaseViews(databaseId: string | null) {
  return useQuery({
    queryKey: ["database-views", databaseId],
    queryFn: () => fetcher<DatabaseView[]>(`/api/databases/${databaseId}/views`),
    enabled: !!databaseId,
  });
}

export function useUpdateViews() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      databaseId,
      views,
    }: {
      databaseId: string;
      views: DatabaseView[];
    }) => {
      const res = await fetch(`/api/databases/${databaseId}/views`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(views),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<DatabaseView[]>;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["database-views", vars.databaseId] });
    },
  });
}
