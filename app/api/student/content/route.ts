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

    // جلب سجل الطالب بالإيميل
    const studentResult = await pool.query(
      "SELECT id FROM students WHERE email = $1",
      [session.user.email]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json([]);
    }

    const studentId = studentResult.rows[0].id;

    // الحصول على courseId من query parameters (اختياري)
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('course_id');

    let query = `
      SELECT
        cc.id, cc.course_id, cc.content_type, cc.title, cc.description,
        cc.due_date, cc.file_name, cc.created_at,
        c.name as course_name, c.code as course_code,
        t.name as teacher_name,
        CASE
          WHEN cc.content_type = 'lecture' THEN 'محاضرة'
          WHEN cc.content_type = 'homework' THEN 'واجب'
          ELSE cc.content_type
        END as content_type_arabic
      FROM course_contents cc
      JOIN courses c ON cc.course_id = c.id
      JOIN teachers t ON cc.teacher_id = t.id
      JOIN enrollments e ON c.id = e.course_id
      WHERE e.student_id = $1
    `;

    const queryParams = [studentId];

    if (courseId) {
      query += ` AND c.id = $2`;
      queryParams.push(courseId);
    }

    query += ` ORDER BY cc.created_at DESC`;

    const result = await pool.query(query, queryParams);

    return NextResponse.json(result.rows);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET content by ID (لعرض محتوى محدد)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    await initDatabase();

    // جلب سجل الطالب بالإيميل
    const studentResult = await pool.query(
      "SELECT id FROM students WHERE email = $1",
      [session.user.email]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json({ error: "لم يتم العثور على الطالب" }, { status: 404 });
    }

    const studentId = studentResult.rows[0].id;

    const body = await req.json();
    const { contentId } = body;

    if (!contentId) {
      return NextResponse.json({ error: "معرف المحتوى مطلوب" }, { status: 400 });
    }

    // التحقق من أن الطالب مسجل في المادة التي تحتوي على هذا المحتوى
    const contentResult = await pool.query(`
      SELECT
        cc.id, cc.course_id, cc.content_type, cc.title, cc.description,
        cc.due_date, cc.file_name, cc.file_data, cc.created_at,
        c.name as course_name, c.code as course_code,
        t.name as teacher_name
      FROM course_contents cc
      JOIN courses c ON cc.course_id = c.id
      JOIN teachers t ON cc.teacher_id = t.id
      JOIN enrollments e ON c.id = e.course_id
      WHERE cc.id = $1 AND e.student_id = $2
    `, [contentId, studentId]);

    if (contentResult.rows.length === 0) {
      return NextResponse.json({ error: "المحتوى غير موجود أو غير متاح لك" }, { status: 404 });
    }

    const content = contentResult.rows[0];

    // إرجاع المحتوى مع بيانات الملف
    return NextResponse.json({
      content: {
        ...content,
        has_file: !!content.file_name
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}