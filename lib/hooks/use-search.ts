"use client";

import { useQuery } from "@tanstack/react-query";

export function useSearch(workspaceId: string | null, query: string) {
  return useQuery({
    queryKey: ["search", workspaceId, query],
    queryFn: async () => {
      const params = new URLSearchParams({ workspaceId: workspaceId! });
      if (query) params.set("q", query);
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<
        {
          id: string;
          title: string;
          icon: string | null;
          type: string;
          parentId: string | null;
          updatedAt: string;
          snippet?: string | null;
        }[]
      >;
    },
    enabled: !!workspaceId && query.length > 0,
    placeholderData: (prev) => prev,
  });
}
