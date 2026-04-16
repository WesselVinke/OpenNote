"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: () => fetcher("/api/workspaces"),
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}
