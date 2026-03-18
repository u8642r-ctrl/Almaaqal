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
    // First get student profile to check accessible stages
    const studentResult = await pool.query(
      "SELECT id, name, email, stage, department, accessible_stages FROM students WHERE email = $1",
      [session.user.email]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json({ error: "لم يتم العثور على بيانات الطالب" }, { status: 404 });
    }

    const student = studentResult.rows[0];
    let accessibleStages: string[] = [];

    // Parse accessible_stages
    if (student.accessible_stages && typeof student.accessible_stages === 'string') {
      try {
        accessibleStages = JSON.parse(student.accessible_stages);
      } catch (e) {
        accessibleStages = [];
      }
    } else if (Array.isArray(student.accessible_stages)) {
      accessibleStages = student.accessible_stages;
    }

    // If no accessible stages are defined, default to all stages (1-4)
    if (accessibleStages.length === 0) {
      accessibleStages = student.stage ? [student.stage] : ["1", "2", "3", "4"];
    }

    const studentDepartment = student.department || null;

    // Build the query to get student enrollments filtered by department
    const query = `
      SELECT
        e.id as enrollment_id,
        e.student_id,
        e.course_id,
        e.enrolled_at,
        e.is_carried_over,
        e.original_stage,
        e.status as enrollment_status,
        c.name as course_name,
        c.code as course_code,
        c.description as course_description,
        c.stage,
        c.term,
        d.name as department_name,
        t.name as teacher_name,
        g.id as grade_id,
        g.grade,
        g.pass_type,
        g.semester as grade_semester,
        g.created_at as grade_date
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN grades g ON g.student_id = e.student_id AND g.course_id = e.course_id
      WHERE e.student_id = $1
        AND (
          c.department_id IS NULL
          OR ($2::text IS NOT NULL AND d.name = $2)
        )
      ORDER BY c.stage ASC NULLS LAST, c.term ASC NULLS LAST, c.name ASC
    `;

    const result = await pool.query(query, [student.id, studentDepartment]);

    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error('Academic data fetch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}