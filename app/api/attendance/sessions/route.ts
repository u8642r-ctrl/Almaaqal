import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool, { initDatabase } from "../../../../lib/db";

// إنشاء جدول الجلسات إذا لم يكن موجوداً
async function ensureSessionsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lecture_sessions (
      id SERIAL PRIMARY KEY,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      teacher_id INTEGER,
      session_code VARCHAR(50) UNIQUE NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      expires_at TIMESTAMPTZ NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // تحديث العمود القديم إذا كان بدون timezone
  await pool.query(`ALTER TABLE lecture_sessions ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC'`).catch(() => {});
  await pool.query(`ALTER TABLE lecture_sessions ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC'`).catch(() => {});
}

// جلب جلسة نشطة
export async function GET(req: NextRequest) {
  await initDatabase();
  await ensureSessionsTable();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const courseId = searchParams.get("course_id");

  try {
    if (code) {
      // البحث بالرمز (للطالب عند المسح)
      const result = await pool.query(
        `SELECT ls.*, c.name as course_name, c.code as course_code, t.name as teacher_name
         FROM lecture_sessions ls
         JOIN courses c ON ls.course_id = c.id
         LEFT JOIN teachers t ON ls.teacher_id = t.id
         WHERE ls.session_code = $1 AND ls.is_active = true AND ls.expires_at > NOW()`,
        [code]
      );
      if (result.rows.length === 0) {
        return NextResponse.json({ error: "رمز الجلسة غير صالح أو منتهي الصلاحية" }, { status: 404 });
      }
      return NextResponse.json(result.rows[0]);
    }

    if (courseId) {
      // جلب جلسات المادة اليوم (للأستاذ)
      const result = await pool.query(
        `SELECT ls.*, c.name as course_name, c.code as course_code
         FROM lecture_sessions ls
         JOIN courses c ON ls.course_id = c.id
         WHERE ls.course_id = $1 AND ls.date = CURRENT_DATE
         ORDER BY ls.created_at DESC`,
        [courseId]
      );
      return NextResponse.json(result.rows);
    }

    return NextResponse.json({ error: "يجب تحديد code أو course_id" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// إنشاء جلسة محاضرة جديدة (الأستاذ)
export async function POST(req: NextRequest) {
  await initDatabase();
  await ensureSessionsTable();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const { course_id, duration_minutes } = await req.json();
    if (!course_id) {
      return NextResponse.json({ error: "معرّف المادة مطلوب" }, { status: 400 });
    }

    // جلب teacher_id
    const email = (session.user as any)?.email;
    const teacherRes = await pool.query("SELECT id FROM teachers WHERE email = $1", [email]);
    const teacherId = teacherRes.rows[0]?.id || null;

    // إلغاء أي جلسة سابقة نشطة لنفس المادة اليوم
    await pool.query(
      `UPDATE lecture_sessions SET is_active = false 
       WHERE course_id = $1 AND date = CURRENT_DATE AND is_active = true`,
      [course_id]
    );

    // توليد رمز فريد
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const sessionCode = `LEC-${course_id}-${randomPart}`;

    // مدة الصلاحية (افتراضي 90 دقيقة)
    const minutes = duration_minutes || 90;

    const result = await pool.query(
      `INSERT INTO lecture_sessions (course_id, teacher_id, session_code, expires_at)
       VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::INTERVAL) RETURNING *`,
      [course_id, teacherId, sessionCode, minutes]
    );

    // جلب اسم المادة
    const courseRes = await pool.query("SELECT name, code FROM courses WHERE id = $1", [course_id]);

    return NextResponse.json({
      ...result.rows[0],
      course_name: courseRes.rows[0]?.name,
      course_code: courseRes.rows[0]?.code,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// إنهاء جلسة
export async function DELETE(req: NextRequest) {
  await initDatabase();
  await ensureSessionsTable();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرّف الجلسة مطلوب" }, { status: 400 });

  try {
    await pool.query("UPDATE lecture_sessions SET is_active = false WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
