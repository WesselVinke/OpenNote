"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useMembers, useInviteMember, useRemoveMember } from "@/lib/hooks/use-members";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your workspace and team.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="team" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="team" className="flex-1">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="pt-4">
            <TeamSection />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function TeamSection() {
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: members, isLoading } = useMembers(workspaceId);
  const inviteMember = useInviteMember(workspaceId);
  const removeMember = useRemoveMember(workspaceId);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteError("");
    try {
      await inviteMember.mutateAsync(inviteEmail.trim());
      setInviteEmail("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to invite";
      if (msg.includes("User not found")) {
        setInviteError("This person needs to create an account first.");
      } else {
        setInviteError(msg);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Invite a team member</Label>
        <div className="flex gap-2">
          <Input
            placeholder="teammate@example.com"
            value={inviteEmail}
            onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            className="flex-1"
          />
          <Button onClick={handleInvite} disabled={inviteMember.isPending || !inviteEmail.trim()} size="sm">
            {inviteMember.isPending ? "Inviting..." : "Invite"}
          </Button>
        </div>
        {inviteError && <p className="text-xs text-destructive">{inviteError}</p>}
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Members</Label>
        {isLoading ? (
          <div className="py-4 text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-1">
            {members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
                    {member.user.name?.[0] || member.user.email[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.user.name || member.user.email}
                    </p>
                    {member.user.name && (
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground rounded-md bg-muted px-2 py-0.5">
                    {member.role.toLowerCase()}
                  </span>
                  {member.role !== "OWNER" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeMember.mutate(member.user.id)}
                      disabled={removeMember.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
