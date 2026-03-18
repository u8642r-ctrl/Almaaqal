import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import pool from "../../../lib/db";

// جلب الدرجات
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("student_id");
  const courseId = searchParams.get("course_id");

  try {
    let query = `
      SELECT g.id, g.student_id, g.course_id, g.grade, g.semester, g.pass_type, g.created_at,
             s.name as student_name, s.email as student_email,
             c.name as course_name, c.code as course_code
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN courses c ON g.course_id = c.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (studentId) {
      params.push(studentId);
      conditions.push(`g.student_id = $${params.length}`);
    }
    if (courseId) {
      params.push(courseId);
      conditions.push(`g.course_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY g.created_at DESC";
    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// إضافة درجة
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const { student_id, course_id, grade, semester, pass_type } = await req.json();
    if (!student_id || !course_id || grade === undefined) {
      return NextResponse.json({ error: "معرّف الطالب والمادة والدرجة مطلوبة" }, { status: 400 });
    }

    const result = await pool.query(
      "INSERT INTO grades (student_id, course_id, grade, semester, pass_type) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [student_id, course_id, grade, semester || "2025-2026", pass_type || "first_round"]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// تعديل درجة
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرّف الدرجة مطلوب" }, { status: 400 });

  try {
    const { grade, pass_type } = await req.json();
    await pool.query("UPDATE grades SET grade = $1, pass_type = COALESCE($2, pass_type) WHERE id = $3", [grade, pass_type || null, id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// حذف درجة
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرّف الدرجة مطلوب" }, { status: 400 });

  try {
    await pool.query("DELETE FROM grades WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
