import type { NextRequest } from 'next/server';
import pool from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const res = await pool.query('SELECT NOW()');
    return new Response(JSON.stringify({ time: res.rows[0] }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Unable to connect' }), {
      status: 500,
    });
  }
}
