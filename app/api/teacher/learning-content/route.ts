import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool, { initDatabase } from "../../../../lib/db";

async function getTeacherBySession(sessionUser: { email?: string | null; name?: string | null }) {
  if (!sessionUser.email) return null;

  let result = await pool.query("SELECT id FROM teachers WHERE email = $1", [sessionUser.email]);

  if (result.rows.length === 0 && sessionUser.name) {
    const byName = await pool.query(
      "SELECT id FROM teachers WHERE name = $1 ORDER BY id ASC LIMIT 1",
      [sessionUser.name]
    );

    if (byName.rows.length > 0) {
      await pool.query("UPDATE teachers SET email = $1 WHERE id = $2", [sessionUser.email, byName.rows[0].id]);
      result = byName;
    }
  }

  if (result.rows.length === 0) {
    result = await pool.query(
      "INSERT INTO teachers (name, email) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id",
      [sessionUser.name || "تدريسي", sessionUser.email]
    );
  }

  if (result.rows.length === 0) return null;
  return result.rows[0].id as number;
}

export async function GET(req: NextRequest) {
  await initDatabase();

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const teacherId = await getTeacherBySession(session.user);
    if (!teacherId) return NextResponse.json([]);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    let query = `
      SELECT cc.id, cc.course_id, cc.content_type, cc.title, cc.description, cc.due_date,
             cc.file_name, cc.file_data, cc.created_at,
             c.name AS course_name
      FROM course_contents cc
      JOIN courses c ON c.id = cc.course_id
      WHERE cc.teacher_id = $1
    `;

    const params: any[] = [teacherId];

    if (type === "lecture" || type === "homework") {
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
    const teacherId = await getTeacherBySession(session.user);
    if (!teacherId) {
      return NextResponse.json({ error: "تعذر تحميل بيانات التدريسي" }, { status: 404 });
    }

    const { course_id, content_type, title, description, due_date, file } = await req.json();

    if (!course_id || !content_type || !title) {
      return NextResponse.json({ error: "المادة والنوع والعنوان مطلوبة" }, { status: 400 });
    }

    if (content_type !== "lecture" && content_type !== "homework") {
      return NextResponse.json({ error: "نوع المحتوى غير صالح" }, { status: 400 });
    }

    const ownsCourseResult = await pool.query(
      "SELECT id FROM courses WHERE id = $1 AND teacher_id = $2",
      [course_id, teacherId]
    );

    if (ownsCourseResult.rows.length === 0) {
      return NextResponse.json({ error: "لا يمكنك النشر في هذه المادة" }, { status: 403 });
    }

    const result = await pool.query(
      `INSERT INTO course_contents
        (course_id, teacher_id, content_type, title, description, due_date, file_name, file_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        course_id,
        teacherId,
        content_type,
        String(title).trim(),
        description ? String(description).trim() : null,
        due_date || null,
        file?.name || null,
        file?.data || null,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
