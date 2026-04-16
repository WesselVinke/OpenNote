"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Member {
  id: string;
  workspaceId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "GUEST";
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function useMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ["members", workspaceId],
    queryFn: () => fetcher<Member[]>(`/api/workspaces/${workspaceId}/members`),
    enabled: !!workspaceId,
  });
}

export function useInviteMember(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: "MEMBER" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to invite" }));
        throw new Error(data.error || "Failed to invite member");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", workspaceId] });
    },
  });
}

export function useRemoveMember(workspaceId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to remove" }));
        throw new Error(data.error || "Failed to remove member");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", workspaceId] });
    },
  });
}
