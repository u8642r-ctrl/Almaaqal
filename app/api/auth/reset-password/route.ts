import { NextRequest, NextResponse } from "next/server";
import pool, { initDatabase } from "../../../../lib/db";

export async function POST(req: NextRequest) {
  try {
    await initDatabase();

    const { token, newPassword, confirmPassword } = await req.json();

    if (!token || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "كلمتا المرور غير متطابقتين" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
    }

    // البحث عن رمز إعادة التعيين
    const tokenResult = await pool.query(
      "SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()",
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json({ error: "رمز إعادة التعيين غير صالح أو منتهي الصلاحية" }, { status: 400 });
    }

    const resetData = tokenResult.rows[0];
    const { email, user_type } = resetData;

    // تحديث كلمة المرور في الجدول المناسب
    if (user_type === "student") {
      await pool.query(
        "UPDATE users SET password = $1 WHERE email = $2 AND role = 'student'",
        [newPassword, email]
      );
    } else if (user_type === "teacher") {
      await pool.query(
        "UPDATE users SET password = $1 WHERE email = $2 AND role = 'teacher'",
        [newPassword, email]
      );
    }

    // تعليم الرمز كمستخدم
    await pool.query(
      "UPDATE password_reset_tokens SET used = TRUE WHERE id = $1",
      [resetData.id]
    );

    return NextResponse.json({
      success: true,
      message: "تم تغيير كلمة المرور بنجاح"
    });

  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "فشل في تغيير كلمة المرور" },
      { status: 500 }
    );
  }
}