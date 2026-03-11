import { NextRequest } from 'next/server';
import pool from '../../../lib/db';

export async function GET(req: NextRequest) {
  try {
    const result = await pool.query(`
      SELECT c.id, c.name, c.code, c.description, c.teacher_id, c.created_at,
             t.name as teacher_name, t.department as teacher_department
      FROM courses c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      ORDER BY c.id DESC
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
    
    let name: string, code: string, description: string, teacher_id: string | null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      name = (formData.get('title') as string) || (formData.get('name') as string) || '';
      code = formData.get('code') as string || '';
      description = formData.get('description') as string || '';
      teacher_id = formData.get('teacher_id') as string || null;
    } else {
      const body = await req.json();
      name = body.title || body.name || '';
      code = body.code || '';
      description = body.description || '';
      teacher_id = body.teacher_id || null;
    }

    if (!name || !code) {
      return new Response(JSON.stringify({ error: 'اسم المادة والرمز مطلوبان' }), { status: 400 });
    }

    const result = await pool.query(
      'INSERT INTO courses (name, code, description, teacher_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, code, description || null, teacher_id || null]
    );
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
    const code = body.code || '';
    const description = body.description || '';
    const teacher_id = body.teacher_id || null;

    if (!name || !code) {
      return new Response(JSON.stringify({ error: 'اسم المادة والرمز مطلوبان' }), { status: 400 });
    }
    await pool.query(
      'UPDATE courses SET name = $1, code = $2, description = $3, teacher_id = $4 WHERE id = $5',
      [name, code, description || null, teacher_id || null, id]
    );
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    let msg = 'DB error';
    if (err.code === '23505') msg = 'رمز المادة مستخدم مسبقاً';
    return new Response(JSON.stringify({ error: msg, details: err.message }), { status: 500 });
  }
}
