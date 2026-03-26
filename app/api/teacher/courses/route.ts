import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import pool, { initDatabase } from "../../../../lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const email = session.user.email;
  const name = session.user.name || "تدريسي";

  try {
    // تأكد من تهيئة قاعدة البيانات (ووجود الأستاذ الافتراضي لو لم يكن موجوداً)
    await initDatabase();

    // محاولة جلب الأستاذ بحسب الإيميل
    let teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE email = $1",
      [email]
    );

    // في حال عدم العثور، نحاول إنشاء سجل للأستاذ بهذا الإيميل ثم نعيد قراءته
    if (teacherResult.rows.length === 0) {
      await pool.query(
        "INSERT INTO teachers (name, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING",
        [name, email]
      );

      teacherResult = await pool.query(
        "SELECT id FROM teachers WHERE email = $1",
        [email]
      );
    }

    if (teacherResult.rows.length === 0) {
      // لا يوجد أستاذ مرتبط بهذا الإيميل حتى بعد المحاولة، نعيد قائمة فارغة
      return NextResponse.json([]);
    }

    const teacherId = teacherResult.rows[0].id;

    // التحقق من وجود مواد مرتبطة بهذا المدرس
    const teacherCoursesResult = await pool.query(
      "SELECT COUNT(*) FROM courses WHERE teacher_id = $1",
      [teacherId]
    );

    // إذا لم تكن هناك مواد مرتبطة بهذا المدرس، نربط المواد غير المرتبطة بأي مدرس
    if (parseInt(teacherCoursesResult.rows[0].count) === 0) {
      // ربط المواد غير المرتبطة بأي مدرس بهذا المدرس
      await pool.query(
        "UPDATE courses SET teacher_id = $1 WHERE teacher_id IS NULL",
        [teacherId]
      );
    }

    // جلب المواد التي يدرّسها الأستاذ مع عدد الطلاب المسجلين
    const result = await pool.query(
      `SELECT c.id, c.name, c.code, c.description, c.created_at,
              COUNT(e.id) as student_count
       FROM courses c
       LEFT JOIN enrollments e ON c.id = e.course_id
       WHERE c.teacher_id = $1
       GROUP BY c.id
       ORDER BY c.name`,
      [teacherId]
    );

    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
