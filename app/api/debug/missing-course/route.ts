import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool, { initDatabase } from "../../../../lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    await initDatabase();

    const results: {
      students: any[];
      mathCourses: any[];
      carriedOverEnrollments: any[];
      husseinEnrollments: any[];
    } = {
      students: [],
      mathCourses: [],
      carriedOverEnrollments: [],
      husseinEnrollments: []
    };

    // 1. البحث عن الطالب حسين
    const studentQuery = `
      SELECT id, name, email, stage
      FROM students
      WHERE LOWER(name) LIKE LOWER('%حسين%')
         OR LOWER(name) LIKE LOWER('%سمير%')
         OR LOWER(name) LIKE LOWER('%عاشور%')
         OR LOWER(name) LIKE LOWER('%غالي%')
    `;
    const studentResult = await pool.query(studentQuery);
    results.students = studentResult.rows;

    // 2. البحث عن مادة الرياضايات
    const mathQuery = `
      SELECT id, name, code, stage, term
      FROM courses
      WHERE LOWER(name) LIKE LOWER('%رياض%')
         OR LOWER(name) LIKE LOWER('%math%')
         OR LOWER(code) LIKE LOWER('%math%')
    `;
    const mathResult = await pool.query(mathQuery);
    results.mathCourses = mathResult.rows;

    // 3. البحث عن التسجيلات المحملة
    const carriedOverQuery = `
      SELECT s.id as student_id, s.name as student_name,
             c.id as course_id, c.name as course_name,
             e.is_carried_over, e.original_stage, e.status, e.enrolled_at
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN courses c ON e.course_id = c.id
      WHERE e.is_carried_over = TRUE OR e.status = 'carried_over'
      ORDER BY e.enrolled_at DESC
      LIMIT 20
    `;
    const carriedResult = await pool.query(carriedOverQuery);
    results.carriedOverEnrollments = carriedResult.rows;

    // 4. إذا وُجد الطالب حسين، فحص تسجيلاته
    const husseinStudent = studentResult.rows.find(s =>
      s.name.includes('حسين') || s.name.includes('سمير') ||
      s.name.includes('عاشور') || s.name.includes('غالي')
    );

    if (husseinStudent) {
      const enrollmentQuery = `
        SELECT c.id as course_id, c.name as course_name, c.stage as course_stage, c.term,
               e.is_carried_over, e.original_stage, e.status, e.enrolled_at
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = $1
        ORDER BY c.stage, c.term, c.name
      `;
      const enrollmentResult = await pool.query(enrollmentQuery, [husseinStudent.id]);
      results.husseinEnrollments = enrollmentResult.rows;
    }

    return NextResponse.json(results);

  } catch (err: any) {
    console.error("Error debugging missing course:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}