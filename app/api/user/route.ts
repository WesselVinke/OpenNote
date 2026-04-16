import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized, badRequest } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, name: true, email: true, image: true },
  });

  if (!user) return unauthorized();
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const body = await req.json();
  const data: { name?: string; image?: string } = {};

  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.image === "string") data.image = body.image;

  if (Object.keys(data).length === 0) return badRequest("No fields to update");

  const user = await prisma.user.update({
    where: { id: authUser.id },
    data,
    select: { id: true, name: true, email: true, image: true },
  });
  return NextResponse.json(user);
}
