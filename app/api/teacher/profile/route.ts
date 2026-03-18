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
    let result = await pool.query(
      "SELECT id, name, email, phone, department, created_at FROM teachers WHERE email = $1",
      [session.user.email]
    );

    // إذا لم يوجد سجل أستاذ، ننشئه تلقائياً
    if (result.rows.length === 0) {
      result = await pool.query(
        "INSERT INTO teachers (name, email) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id, name, email, phone, department, created_at",
        [session.user.name || "تدريسي", session.user.email]
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "لم يتم العثور على بيانات الأستاذ" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
