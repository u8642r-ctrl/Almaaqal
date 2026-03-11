import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import pool from "../../../lib/db";

// جلب التسجيلات
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("student_id");
  const courseId = searchParams.get("course_id");

  try {
    let query = `
      SELECT e.id, e.student_id, e.course_id, e.enrolled_at,
             s.name as student_name, s.email as student_email,
             c.name as course_name, c.code as course_code
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN courses c ON e.course_id = c.id
    `;
    const params: any[] = [];

    if (studentId) {
      params.push(studentId);
      query += ` WHERE e.student_id = $${params.length}`;
    } else if (courseId) {
      params.push(courseId);
      query += ` WHERE e.course_id = $${params.length}`;
    }

    query += " ORDER BY e.enrolled_at DESC";
    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// تسجيل طالب في مادة
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const { student_id, course_id } = await req.json();
    if (!student_id || !course_id) {
      return NextResponse.json({ error: "معرّف الطالب والمادة مطلوبان" }, { status: 400 });
    }

    const result = await pool.query(
      "INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) RETURNING *",
      [student_id, course_id]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json({ error: "الطالب مسجّل في هذه المادة مسبقاً" }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// إلغاء تسجيل
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرّف التسجيل مطلوب" }, { status: 400 });

  try {
    await pool.query("DELETE FROM enrollments WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
