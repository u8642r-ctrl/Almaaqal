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
    const studentResult = await pool.query(
      "SELECT id, department FROM students WHERE email = $1",
      [session.user.email]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json([]);
    }

    const studentId = studentResult.rows[0].id;
    const studentDepartment = studentResult.rows[0].department || null;

    const result = await pool.query(
      `SELECT cc.id,
              cc.content_type,
              cc.title,
              cc.description,
              cc.due_date,
              cc.created_at,
              c.id AS course_id,
              c.name AS course_name,
              c.code AS course_code,
              d.name AS department_name,
              hg.grade AS homework_grade,
              hg.feedback AS homework_feedback,
              hg.graded_at
       FROM course_contents cc
       JOIN courses c ON c.id = cc.course_id
       JOIN enrollments e ON e.course_id = c.id AND e.student_id = $1
       LEFT JOIN departments d ON d.id = c.department_id
       LEFT JOIN homework_grades hg ON hg.content_id = cc.id AND hg.student_id = $1
       WHERE (
         c.department_id IS NULL
         OR ($2::text IS NOT NULL AND d.name = $2)
       )
       ORDER BY cc.created_at DESC`,
      [studentId, studentDepartment]
    );

    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
