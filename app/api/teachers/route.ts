import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT id, name, email, phone, department, created_at FROM teachers ORDER BY id DESC');
    return NextResponse.json(result.rows, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: 'خطأ في قاعدة البيانات', details: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, department, password } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: 'الاسم والبريد الإلكتروني مطلوبان' }, { status: 400 });
    }
    const result = await pool.query(
      'INSERT INTO teachers (name, email, phone, department) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone, department, created_at',
      [name, email, phone || null, department || null]
    );
    // إنشاء حساب تسجيل الدخول إذا تم توفير كلمة المرور
    if (password) {
      await pool.query(
        'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET password = $2, name = $3',
        [email, password, name, 'teacher']
      );
    }
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err: any) {
    let msg = 'خطأ في قاعدة البيانات';
    if (err.code === '23505') msg = 'البريد الإلكتروني مستخدم مسبقاً لهذا الأستاذ';
    return NextResponse.json({ error: msg, details: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'رقم الأستاذ مطلوب' }, { status: 400 });

  try {
    const { name, email, phone, department, password } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: 'الاسم والبريد الإلكتروني مطلوبان' }, { status: 400 });
    }

    // الحصول على الإيميل القديم
    const oldTeacherResult = await pool.query('SELECT email FROM teachers WHERE id = $1', [id]);
    const oldEmail = oldTeacherResult.rows[0]?.email;

    // تحديث بيانات الأستاذ
    await pool.query(
      'UPDATE teachers SET name = $1, email = $2, phone = $3, department = $4 WHERE id = $5',
      [name, email, phone || null, department || null, id]
    );

    // تحديث حساب تسجيل الدخول
    if (oldEmail) {
      // الحصول على الباسورد القديم قبل أي تغيير
      const userResult = await pool.query(
        'SELECT password FROM users WHERE email = $1 AND role = $2',
        [oldEmail, 'teacher']
      );
      const oldPassword = userResult.rows[0]?.password || '123456';

      // تحديد الباسورد النهائي - إذا تم إدخال باسورد جديد نستخدمه، وإلا نحتفظ بالقديم
      const finalPassword = password && password.trim() ? password.trim() : oldPassword;

      // حذف الحساب القديم إذا تغير الإيميل
      if (oldEmail !== email) {
        await pool.query('DELETE FROM users WHERE email = $1 AND role = $2', [oldEmail, 'teacher']);
      }

      // إنشاء أو تحديث حساب المستخدم
      await pool.query(
        `INSERT INTO users (email, password, name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email)
         DO UPDATE SET password = $2, name = $3`,
        [email, finalPassword, name, 'teacher']
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    let msg = 'خطأ في قاعدة البيانات';
    if (err.code === '23505') msg = 'البريد الإلكتروني مستخدم مسبقاً';
    return NextResponse.json({ error: msg, details: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  
  if (!id) return NextResponse.json({ error: 'رقم الأستاذ مطلوب' }, { status: 400 });
  
  try {
    // جلب بريد الأستاذ لحذف حساب الدخول
    const teacherResult = await pool.query('SELECT email FROM teachers WHERE id = $1', [id]);
    const teacherEmail = teacherResult.rows[0]?.email;
    
    await pool.query('DELETE FROM teachers WHERE id = $1', [id]);
    
    // حذف حساب تسجيل الدخول المرتبط
    if (teacherEmail) {
      await pool.query('DELETE FROM users WHERE email = $1 AND role = $2', [teacherEmail, 'teacher']);
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: 'خطأ في قاعدة البيانات', details: err.message }, { status: 500 });
  }
}