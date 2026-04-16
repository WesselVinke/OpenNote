"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Page } from "@prisma/client";

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function usePage(pageId: string | null) {
  return useQuery({
    queryKey: ["page", pageId],
    queryFn: () => fetcher<Page & { children: Page[] }>(`/api/pages/${pageId}`),
    enabled: !!pageId,
  });
}

export function usePageTree(workspaceId: string | null) {
  return useQuery({
    queryKey: ["page-tree", workspaceId],
    queryFn: () =>
      fetcher<
        {
          id: string;
          title: string;
          icon: string | null;
          type: string;
          parentId: string | null;
          isFavorite: boolean;
          sortOrder: number;
        }[]
      >(`/api/pages/tree?workspaceId=${workspaceId}`),
    enabled: !!workspaceId,
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      parentId?: string;
      title?: string;
      type?: string;
      icon?: string;
      databaseId?: string;
    }) => {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<Page>;
    },
    onSuccess: (page) => {
      qc.invalidateQueries({ queryKey: ["page-tree", page.workspaceId] });
    },
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Page>) => {
      const res = await fetch(`/api/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<Page>;
    },
    onSuccess: (page) => {
      qc.invalidateQueries({ queryKey: ["page", page.id] });
      qc.invalidateQueries({ queryKey: ["page-tree", page.workspaceId] });
      if (page.databaseId) {
        qc.invalidateQueries({ queryKey: ["database-rows", page.databaseId] });
      }
      if (page.type === "DATABASE") {
        qc.invalidateQueries({ queryKey: ["database-rows", page.id] });
      }
    },
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/pages/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["page-tree"] });
      qc.invalidateQueries({ queryKey: ["database-rows"] });
      qc.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}
