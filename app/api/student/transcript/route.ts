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
      "SELECT id, stage as current_stage, department FROM students WHERE email = $1",
      [session.user.email]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json([]);
    }

    const studentId = studentResult.rows[0].id;
    const studentDepartment = studentResult.rows[0].department || null;

    // جلب جميع الكورسات المسجل فيها الطالب من جميع المراحل
    // مع الدرجات إذا كانت متوفرة
    const result = await pool.query(
      `SELECT e.id as enrollment_id,
              c.id as course_id, c.name as course_name, c.code as course_code,
              c.stage, c.term,
              d.name as department_name,
              g.id as grade_id, g.grade, g.semester, g.pass_type, g.created_at as grade_date,
              e.enrolled_at
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       LEFT JOIN departments d ON c.department_id = d.id
       LEFT JOIN grades g ON g.student_id = e.student_id AND g.course_id = e.course_id
       WHERE e.student_id = $1
         AND (
           c.department_id IS NULL
           OR ($2::text IS NOT NULL AND d.name = $2)
         )
       ORDER BY c.stage ASC NULLS LAST, c.term ASC NULLS LAST, c.name ASC`,
      [studentId, studentDepartment]
    );

    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
