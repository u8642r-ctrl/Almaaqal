import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool from "../../../../lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, phone, department, created_at FROM teachers WHERE email = $1",
      [session.user.email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "لم يتم العثور على بيانات الأستاذ" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
