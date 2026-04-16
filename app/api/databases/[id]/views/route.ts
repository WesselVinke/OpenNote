import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, notFound, checkWorkspaceAccess } from "@/lib/auth-helpers";
import type { DatabaseView } from "@/lib/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const database = await prisma.page.findUnique({
    where: { id, type: "DATABASE" },
    select: { dbViews: true, workspaceId: true },
  });
  if (!database) return notFound("Database not found");

  const member = await checkWorkspaceAccess(database.workspaceId, user.id!);
  if (!member) return notFound("Database not found");

  return NextResponse.json(database.dbViews || []);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const database = await prisma.page.findUnique({
    where: { id, type: "DATABASE" },
    select: { workspaceId: true },
  });
  if (!database) return notFound("Database not found");

  const member = await checkWorkspaceAccess(database.workspaceId, user.id!);
  if (!member) return notFound("Database not found");

  const views: DatabaseView[] = await req.json();

  const updated = await prisma.page.update({
    where: { id },
    data: { dbViews: views as unknown as Parameters<typeof prisma.page.update>[0]["data"]["dbViews"] },
    select: { dbViews: true },
  });

  return NextResponse.json(updated.dbViews);
}
