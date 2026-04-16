import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, notFound, checkWorkspaceAccess } from "@/lib/auth-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const database = await prisma.page.findUnique({
    where: { id, type: "DATABASE" },
  });
  if (!database) return notFound("Database not found");

  const member = await checkWorkspaceAccess(database.workspaceId, user.id!);
  if (!member) return notFound("Database not found");

  const rows = await prisma.page.findMany({
    where: {
      databaseId: id,
      type: "DATABASE_ROW",
      isDeleted: false,
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(rows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const database = await prisma.page.findUnique({
    where: { id, type: "DATABASE" },
  });
  if (!database) return notFound("Database not found");

  const member = await checkWorkspaceAccess(database.workspaceId, user.id!);
  if (!member) return notFound("Database not found");

  const body = await req.json();
  const { title, rowProperties } = body;

  const lastRow = await prisma.page.findFirst({
    where: { databaseId: id, isDeleted: false },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const row = await prisma.page.create({
    data: {
      title: title || "Untitled",
      type: "DATABASE_ROW",
      workspaceId: database.workspaceId,
      databaseId: id,
      sortOrder: (lastRow?.sortOrder ?? 0) + 1,
      rowProperties: rowProperties || {},
    },
  });

  return NextResponse.json(row, { status: 201 });
}
