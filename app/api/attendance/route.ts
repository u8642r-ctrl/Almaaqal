import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import pool, { initDatabase } from "../../../lib/db";

// جلب سجلات الحضور
export async function GET(req: NextRequest) {
  await initDatabase();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("course_id");
  const studentId = searchParams.get("student_id");
  const date = searchParams.get("date");

  try {
    let query = `
      SELECT a.id, a.student_id, a.course_id, a.date, a.status, a.recorded_at,
             s.name as student_name, s.email as student_email,
             c.name as course_name, c.code as course_code
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN courses c ON a.course_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (courseId) {
      params.push(courseId);
      query += ` AND a.course_id = $${params.length}`;
    }
    if (studentId) {
      params.push(studentId);
      query += ` AND a.student_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      query += ` AND a.date = $${params.length}`;
    }

    query += " ORDER BY a.date DESC, a.recorded_at DESC";
    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// تسجيل حضور (عبر الباركود)
export async function POST(req: NextRequest) {
  await initDatabase();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const { student_id, course_id, date, status } = await req.json();
    
    if (!student_id || !course_id) {
      return NextResponse.json({ error: "معرّف الطالب والمادة مطلوبان" }, { status: 400 });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];
    const attendanceStatus = status || 'present';

    // التحقق من أن الطالب مسجّل في المادة - وإذا لم يكن، نسجله تلقائياً (في حالة مسح الباركود)
    const enrollCheck = await pool.query(
      "SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2",
      [student_id, course_id]
    );
    if (enrollCheck.rows.length === 0) {
      // تسجيل الطالب في المادة تلقائياً عند مسح باركود المحاضرة
      await pool.query(
        "INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [student_id, course_id]
      );
    }

    // تسجيل الحضور أو تحديثه إذا كان موجوداً
    const result = await pool.query(
      `INSERT INTO attendance (student_id, course_id, date, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (student_id, course_id, date)
       DO UPDATE SET status = $4, recorded_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [student_id, course_id, attendanceDate, attendanceStatus]
    );

    // جلب اسم الطالب للإرجاع
    const studentInfo = await pool.query("SELECT name, email FROM students WHERE id = $1", [student_id]);
    const record = {
      ...result.rows[0],
      student_name: studentInfo.rows[0]?.name,
      student_email: studentInfo.rows[0]?.email,
    };

    return NextResponse.json(record, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// حذف سجل حضور
export async function DELETE(req: NextRequest) {
  await initDatabase();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرّف السجل مطلوب" }, { status: 400 });

  try {
    await pool.query("DELETE FROM attendance WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
