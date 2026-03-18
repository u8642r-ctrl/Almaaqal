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
    const studentResult = await pool.query(
      "SELECT id FROM students WHERE email = $1",
      [session.user.email]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json([]);
    }

    const studentId = studentResult.rows[0].id;

    const result = await pool.query(
      `SELECT g.id, g.grade, g.semester, g.pass_type, g.created_at,
              c.name as course_name, c.code as course_code, c.stage as course_stage, c.term as course_term,
              COALESCE(e.is_carried_over, FALSE) as is_carried_over,
              COALESCE(e.original_stage, c.stage) as original_stage
       FROM grades g
       JOIN courses c ON g.course_id = c.id
       LEFT JOIN enrollments e ON e.student_id = $1 AND e.course_id = c.id
       WHERE g.student_id = $1
       ORDER BY g.created_at DESC`,
      [studentId]
    );

    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
