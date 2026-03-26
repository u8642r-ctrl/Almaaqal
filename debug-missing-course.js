const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'ALMAAQAL',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '1980',
});

async function debugMissingCourse() {
  try {
    console.log('🔍 البحث عن الطالب حسين سمير عاشور غالي...');

    // 1. البحث عن الطالب
    const studentQuery = `
      SELECT id, name, email, stage
      FROM students
      WHERE LOWER(name) LIKE LOWER('%حسين%')
         OR LOWER(name) LIKE LOWER('%سمير%')
         OR LOWER(name) LIKE LOWER('%عاشور%')
         OR LOWER(name) LIKE LOWER('%غالي%')
    `;
    const studentResult = await pool.query(studentQuery);

    console.log('📋 الطلاب الموجودين:', studentResult.rows.length);
    studentResult.rows.forEach(student => {
      console.log(`  - ${student.name} (ID: ${student.id}, المرحلة: ${student.stage}, الإيميل: ${student.email})`);
    });

    // 2. البحث عن مادة الرياضايات
    console.log('\n🔍 البحث عن مادة الرياضايات...');
    const mathQuery = `
      SELECT id, name, code, stage, term
      FROM courses
      WHERE LOWER(name) LIKE LOWER('%رياض%')
         OR LOWER(name) LIKE LOWER('%math%')
         OR LOWER(code) LIKE LOWER('%math%')
    `;
    const mathResult = await pool.query(mathQuery);

    console.log('📚 المواد الرياضية الموجودة:', mathResult.rows.length);
    mathResult.rows.forEach(course => {
      console.log(`  - ${course.name} (ID: ${course.id}, المرحلة: ${course.stage}, الفصل: ${course.term})`);
    });

    // 3. البحث عن التسجيلات المحملة
    console.log('\n🔄 فحص التسجيلات المحملة...');
    const carriedOverQuery = `
      SELECT s.name as student_name, c.name as course_name,
             e.is_carried_over, e.original_stage, e.status, e.enrolled_at
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN courses c ON e.course_id = c.id
      WHERE e.is_carried_over = TRUE OR e.status = 'carried_over'
      ORDER BY e.enrolled_at DESC
    `;
    const carriedResult = await pool.query(carriedOverQuery);

    console.log('🔄 المواد المحملة:', carriedResult.rows.length);
    carriedResult.rows.forEach(row => {
      console.log(`  - ${row.student_name}: ${row.course_name} (محملة: ${row.is_carried_over}, الحالة: ${row.status}, المرحلة الأصلية: ${row.original_stage})`);
    });

    // 4. إذا وُجد الطالب، فحص تسجيلاته
    if (studentResult.rows.length > 0) {
      const targetStudent = studentResult.rows.find(s =>
        s.name.includes('حسين') || s.name.includes('سمير') ||
        s.name.includes('عاشور') || s.name.includes('غالي')
      ) || studentResult.rows[0];

      console.log(`\n👤 فحص تسجيلات الطالب: ${targetStudent.name}`);

      const enrollmentQuery = `
        SELECT c.name as course_name, c.stage as course_stage, c.term,
               e.is_carried_over, e.original_stage, e.status, e.enrolled_at
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = $1
        ORDER BY c.stage, c.term, c.name
      `;
      const enrollmentResult = await pool.query(enrollmentQuery, [targetStudent.id]);

      console.log(`📝 تسجيلات الطالب (${enrollmentResult.rows.length} مادة):`);
      enrollmentResult.rows.forEach(enrollment => {
        console.log(`  - ${enrollment.course_name} (مرحلة ${enrollment.course_stage}, ${enrollment.term}) - محملة: ${enrollment.is_carried_over} - حالة: ${enrollment.status}`);
      });
    }

  } catch (error) {
    console.error('❌ خطأ:', error.message);
  } finally {
    await pool.end();
  }
}

debugMissingCourse();