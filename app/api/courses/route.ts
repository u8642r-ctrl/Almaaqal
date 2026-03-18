import { NextRequest } from 'next/server';
import pool from '../../../lib/db';

export async function GET(req: NextRequest) {
  try {
    const result = await pool.query(`
      SELECT c.id, c.name, c.code, c.description, c.teacher_id, c.stage, c.term, c.department_id, c.created_at,
             t.name as teacher_name, t.department as teacher_department,
             d.name as department_name, d.id as department_id
      FROM courses c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN departments d ON c.department_id = d.id
      ORDER BY COALESCE(d.name, 'بدون قسم'), c.stage, c.term, c.name
    `);
    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'DB error', details: err.message }), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let name: string, code: string, description: string, teacher_id: string | null, stage: string | null, term: string | null, department_id: number | null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      name = (formData.get('title') as string) || (formData.get('name') as string) || '';
      code = formData.get('code') as string || '';
      description = formData.get('description') as string || '';
      teacher_id = formData.get('teacher_id') as string || null;
      stage = formData.get('stage') as string || null;
      term = formData.get('term') as string || null;
      department_id = formData.get('department_id') ? parseInt(formData.get('department_id') as string) : null;
    } else {
      const body = await req.json();
      name = body.title || body.name || '';
      code = body.code || '';
      description = body.description || '';
      teacher_id = body.teacher_id || null;
      stage = body.stage || null;
      term = body.term || null;
      department_id = body.department_id || null;
    }

    if (!name) {
      return new Response(JSON.stringify({ error: 'اسم المادة مطلوب' }), { status: 400 });
    }

    // إذا لم يتم توفير رمز، توليده تلقائياً
    if (!code) {
      const timestamp = Date.now().toString().slice(-4);
      code = `${name.substring(0, 3).toUpperCase()}-${stage}${term}-${timestamp}`;
    }

    const result = await pool.query(
      'INSERT INTO courses (name, code, description, teacher_id, stage, term, department_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, code, description || null, teacher_id || null, stage, term, department_id || null]
    );

    const courseId = result.rows[0].id;
    const courseStage = result.rows[0].stage;
    const courseDepartmentId = result.rows[0].department_id;

    // التسجيل التلقائي للطلاب المطابقين للمرحلة والقسم
    try {
      // جلب اسم القسم إذا كان محدداً
      let departmentName = null;
      if (courseDepartmentId) {
        const deptResult = await pool.query('SELECT name FROM departments WHERE id = $1', [courseDepartmentId]);
        departmentName = deptResult.rows[0]?.name;
      }

      // جلب الطلاب المطابقين للمرحلة والقسم
      let studentsQuery = 'SELECT id FROM students WHERE 1=1';
      const params: any[] = [];

      // مطابقة المرحلة إذا كانت محددة
      if (courseStage) {
        params.push(courseStage);
        studentsQuery += ` AND (stage = $${params.length} OR stage IS NULL)`;
      }

      // مطابقة القسم إذا كان محدد
      if (departmentName) {
        params.push(departmentName);
        studentsQuery += ` AND (department = $${params.length} OR department IS NULL)`;
      }

      const studentsResult = await pool.query(studentsQuery, params);
      for (const student of studentsResult.rows) {
        await pool.query(
          'INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) ON CONFLICT (student_id, course_id) DO NOTHING',
          [student.id, courseId]
        );
      }
    } catch (enrollErr) {
      console.log('تحذير: فشل تسجيل الطلاب في الكورس الجديد:', enrollErr);
      // نكمل حتى لو فشل التسجيل
    }

    return new Response(JSON.stringify(result.rows[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    let msg = 'DB error';
    if (err.code === '23505') msg = 'رمز المادة مستخدم مسبقاً';
    return new Response(JSON.stringify({ error: msg, details: err.message }), { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'رقم المادة مطلوب' }), { status: 400 });
  try {
    await pool.query('DELETE FROM courses WHERE id = $1', [id]);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'DB error', details: err.message }), { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return new Response(JSON.stringify({ error: 'رقم المادة مطلوب' }), { status: 400 });
  try {
    const body = await req.json();
    const name = body.title || body.name || '';
    const stage = body.stage || null;
    const term = body.term || null;
    const department_id = body.department_id || null;

    if (!name) {
      return new Response(JSON.stringify({ error: 'اسم المادة مطلوب' }), { status: 400 });
    }

    // جلب المادة الحالية للحفاظ على البيانات الأخرى
    const currentCourse = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);
    if (currentCourse.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'المادة غير موجودة' }), { status: 404 });
    }

    const course = currentCourse.rows[0];
    const code = body.code || course.code;
    const description = body.description !== undefined ? body.description : course.description;
    const teacher_id = body.teacher_id !== undefined ? body.teacher_id : course.teacher_id;

    await pool.query(
      'UPDATE courses SET name = $1, code = $2, description = $3, teacher_id = $4, stage = $5, term = $6, department_id = $7 WHERE id = $8',
      [name, code, description || null, teacher_id || null, stage, term, department_id || null, id]
    );
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    let msg = 'DB error';
    if (err.code === '23505') msg = 'رمز المادة مستخدم مسبقاً';
    return new Response(JSON.stringify({ error: msg, details: err.message }), { status: 500 });
  }
}
