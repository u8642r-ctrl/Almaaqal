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

    // توافق مع البيانات القديمة: البحث بالاسم إذا لم نجد بالبريد
    if (result.rows.length === 0 && session.user.name) {
      const byName = await pool.query(
        "SELECT id, name, email, phone, department, created_at FROM teachers WHERE name = $1 ORDER BY id ASC LIMIT 1",
        [session.user.name]
      );

      if (byName.rows.length > 0) {
        await pool.query(
          "UPDATE teachers SET email = $1 WHERE id = $2",
          [session.user.email, byName.rows[0].id]
        );
        result = byName;
      }
    }

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
