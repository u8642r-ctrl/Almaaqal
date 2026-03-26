import { NextRequest, NextResponse } from "next/server";
import pool, { initDatabase } from "../../../../lib/db";
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    await initDatabase();

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "الرجاء إدخال البريد الإلكتروني" }, { status: 400 });
    }

    // البحث عن المستخدم في جدولي الطلاب والمدرسين
    const [studentResult, teacherResult] = await Promise.all([
      pool.query("SELECT id, name FROM students WHERE email = $1", [email]),
      pool.query("SELECT id, name FROM teachers WHERE email = $1", [email])
    ]);

    let userType = null;
    let userName = null;

    if (studentResult.rows.length > 0) {
      userType = "student";
      userName = studentResult.rows[0].name;
    } else if (teacherResult.rows.length > 0) {
      userType = "teacher";
      userName = teacherResult.rows[0].name;
    } else {
      return NextResponse.json({ error: "البريد الإلكتروني غير موجود في النظام" }, { status: 404 });
    }

    // إنشاء رمز عشوائي آمن
    const resetToken = crypto.randomBytes(32).toString('hex');

    // انتهاء صلاحية الرمز بعد ساعة واحدة
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // حذف الرموز القديمة للمستخدم إذا وجدت
    await pool.query(
      "DELETE FROM password_reset_tokens WHERE email = $1",
      [email]
    );

    // حفظ الرمز الجديد في قاعدة البيانات
    await pool.query(
      "INSERT INTO password_reset_tokens (email, token, user_type, expires_at) VALUES ($1, $2, $3, $4)",
      [email, resetToken, userType, expiresAt]
    );

    // في الواقع، هنا يجب إرسال البريد الإلكتروني
    // لكن للآن سنعطي الرمز في الاستجابة للاختبار
    const resetUrl = `${req.headers.get('origin')}/reset-password?token=${resetToken}`;

    return NextResponse.json({
      success: true,
      message: `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${email}`,
      // للاختبار فقط - في الواقع يجب إرسال الرابط بالبريد الإلكتروني
      resetUrl: resetUrl,
      userName: userName
    });

  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "فشل في معالجة الطلب" },
      { status: 500 }
    );
  }
}