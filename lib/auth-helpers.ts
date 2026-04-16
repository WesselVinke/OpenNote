import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const DEFAULT_USER_EMAIL = "you@local";
const DEFAULT_USER_NAME = "You";

let cachedUserId: string | null = null;

export async function getAuthUser() {
  if (cachedUserId) {
    return { id: cachedUserId, name: DEFAULT_USER_NAME, email: DEFAULT_USER_EMAIL };
  }

  let user = await prisma.user.findUnique({ where: { email: DEFAULT_USER_EMAIL } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEFAULT_USER_EMAIL,
        name: DEFAULT_USER_NAME,
        emailVerified: new Date(),
      },
    });

    const workspace = await prisma.workspace.create({
      data: {
        name: "My Workspace",
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });

    await prisma.page.create({
      data: {
        title: "Getting Started",
        icon: "🚀",
        workspaceId: workspace.id,
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Welcome!" }] },
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Type / for blocks. Drag pages to reorder them." },
              ],
            },
          ],
        },
      },
    });
  }

  cachedUserId = user.id;
  return { id: user.id, name: user.name, email: user.email };
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export function notFound(msg = "Not found") {
  return NextResponse.json({ error: msg }, { status: 404 });
}

export async function checkWorkspaceAccess(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  return member;
}
