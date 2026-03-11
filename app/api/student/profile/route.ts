import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool, { initDatabase } from "../../../../lib/db";

export async function GET() {
  await initDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    let result = await pool.query(
      "SELECT id, name, email, phone, department, created_at FROM students WHERE email = $1",
      [session.user.email]
    );

    // إذا لم يوجد سجل في جدول الطلاب، ننشئ واحد تلقائياً
    if (result.rows.length === 0) {
      const userName = session.user.name || "طالب";
      const insertResult = await pool.query(
        "INSERT INTO students (name, email) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET name = $1 RETURNING id, name, email, phone, department, created_at",
        [userName, session.user.email]
      );
      if (insertResult.rows.length > 0) {
        return NextResponse.json(insertResult.rows[0]);
      }
      return NextResponse.json({ error: "لم يتم العثور على بيانات الطالب" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
