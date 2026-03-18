import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool, { initDatabase } from "../../../../lib/db";

async function getTeacherIdBySessionEmail(email: string) {
  const teacherResult = await pool.query("SELECT id, department FROM teachers WHERE email = $1", [email]);
  if (teacherResult.rows.length === 0) return null;
  return {
    id: teacherResult.rows[0].id as number,
    department: (teacherResult.rows[0].department as string | null) || null,
  };
}

export async function GET(req: NextRequest) {
  await initDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const teacher = await getTeacherIdBySessionEmail(session.user.email);
    if (!teacher) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    let query = `
      SELECT cc.id, cc.course_id, cc.content_type, cc.title, cc.description, cc.due_date, cc.created_at,
             c.name AS course_name, c.code AS course_code
      FROM course_contents cc
      JOIN courses c ON c.id = cc.course_id
      WHERE cc.teacher_id = $1
    `;
    const params: any[] = [teacher.id];

    if (type && (type === "lecture" || type === "homework")) {
      params.push(type);
      query += ` AND cc.content_type = $${params.length}`;
    }

    query += " ORDER BY cc.created_at DESC";

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await initDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const teacher = await getTeacherIdBySessionEmail(session.user.email);
    if (!teacher) {
      return NextResponse.json({ error: "لم يتم العثور على بيانات الأستاذ" }, { status: 404 });
    }

    const { course_id, content_type, title, description, due_date, file } = await req.json();

    if (!course_id || !content_type || !title) {
      return NextResponse.json(
        { error: "المادة ونوع المحتوى والعنوان مطلوبة" },
        { status: 400 }
      );
    }

    if (content_type !== "lecture" && content_type !== "homework") {
      return NextResponse.json({ error: "نوع المحتوى غير صالح" }, { status: 400 });
    }

    const ownsCourseResult = await pool.query(
      `SELECT c.id
       FROM courses c
       LEFT JOIN departments d ON c.department_id = d.id
       WHERE c.id = $1
         AND (
           c.teacher_id = $2
           OR (
             c.teacher_id IS NULL
             AND ($3::text IS NOT NULL AND d.name = $3)
           )
         )`,
      [course_id, teacher.id, teacher.department]
    );

    if (ownsCourseResult.rows.length === 0) {
      return NextResponse.json({ error: "لا يمكنك النشر في هذه المادة" }, { status: 403 });
    }

    const result = await pool.query(
      `INSERT INTO course_contents (course_id, teacher_id, content_type, title, description, due_date, file_name, file_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [course_id, teacher.id, content_type, title, description || null, due_date || null, file?.name || null, file?.data || null]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
