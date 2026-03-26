/**
 * سكربت لتطبيق التحديثات الجديدة على قاعدة البيانات
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.PGHOST,
        port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
      }
);

async function updateDatabase() {
  try {
    console.log('🔄 جاري تطبيق التحديثات على قاعدة البيانات...\n');

    // إضافة الأعمدة الجديدة
    const alterQueries = [
      { query: "ALTER TABLE students ADD COLUMN IF NOT EXISTS stage VARCHAR(10)", desc: "إضافة حقل المرحلة للطلاب" },
      { query: "ALTER TABLE students ADD COLUMN IF NOT EXISTS accessible_stages TEXT", desc: "إضافة حقل المراحل المتاحة" },
      { query: "ALTER TABLE courses ADD COLUMN IF NOT EXISTS stage VARCHAR(10)", desc: "إضافة حقل المرحلة للمواد" },
      { query: "ALTER TABLE courses ADD COLUMN IF NOT EXISTS term VARCHAR(10)", desc: "إضافة حقل الكورس للمواد" },
      { query: "ALTER TABLE courses ADD COLUMN IF NOT EXISTS department_id INTEGER", desc: "إضافة حقل القسم للمواد" },
      { query: "ALTER TABLE grades ADD COLUMN IF NOT EXISTS pass_type VARCHAR(20) DEFAULT 'first_round'", desc: "إضافة نوع النجاح" },
      { query: "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS is_carried_over BOOLEAN DEFAULT FALSE", desc: "إضافة حقل المادة المرحلة" },
      { query: "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS original_stage VARCHAR(10)", desc: "إضافة المرحلة الأصلية" },
      { query: "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'", desc: "إضافة حالة التسجيل" },
    ];

    console.log('📝 إضافة الأعمدة الجديدة:\n');
    for (const {query, desc} of alterQueries) {
      try {
        await pool.query(query);
        console.log(`   ✅ ${desc}`);
      } catch (err) {
        if (err.code !== '42701') { // 42701 = column already exists
          console.log(`   ⚠️  ${desc} - ${err.message}`);
        } else {
          console.log(`   ⏭️  ${desc} - موجود مسبقاً`);
        }
      }
    }

    // إنشاء جداول جديدة
    console.log('\n📊 إنشاء الجداول الجديدة:\n');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_contents (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
        content_type VARCHAR(20) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        due_date TIMESTAMP NULL,
        file_name VARCHAR(255),
        file_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ جدول المحتوى التعليمي (course_contents)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS homework_grades (
        id SERIAL PRIMARY KEY,
        content_id INTEGER REFERENCES course_contents(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        submission_text TEXT,
        submitted_at TIMESTAMP NULL,
        grade DECIMAL(5,2),
        feedback TEXT,
        graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(content_id, student_id)
      )
    `);
    console.log('   ✅ جدول درجات الواجبات (homework_grades)');

    // تحديث البيانات
    console.log('\n🔄 تحديث البيانات:\n');

    // تحديث الطالب الافتراضي
    await pool.query(`
      UPDATE students
      SET stage = '3', accessible_stages = '["1","2","3"]'
      WHERE email = 'student@almaqal.edu.iq'
    `);
    console.log('   ✅ تحديث بيانات الطالب الافتراضي (المرحلة الثالثة)');

    // تحديث المواد الدراسية
    const teacherResult = await pool.query(
      "SELECT id FROM teachers WHERE email = $1",
      ['teacher@almaqal.edu.iq']
    );

    if (teacherResult.rows.length > 0) {
      const teacherId = teacherResult.rows[0].id;

      await pool.query(`
        INSERT INTO courses (name, code, description, teacher_id, stage, term) VALUES
          ('برمجة الويب', 'CS101', 'مقرر أساسي في تطوير تطبيقات الويب', $1, '1', 'كورس_اول'),
          ('قواعد البيانات', 'CS102', 'دراسة أنظمة إدارة قواعد البيانات', $1, '1', 'كورس_ثاني'),
          ('هياكل البيانات', 'CS201', 'مقرر متقدم في تنظيم البيانات', $1, '2', 'كورس_اول'),
          ('البرمجة الكائنية', 'CS202', 'مبادئ البرمجة الشيئية', $1, '2', 'كورس_ثاني'),
          ('الذكاء الاصطناعي', 'CS301', 'مقدمة في الذكاء الاصطناعي', $1, '3', 'كورس_اول')
        ON CONFLICT (code) DO UPDATE SET
          stage = EXCLUDED.stage,
          term = EXCLUDED.term,
          teacher_id = EXCLUDED.teacher_id
      `, [teacherId]);

      console.log('   ✅ تحديث المواد الدراسية مع المراحل والكورسات');
    }

    // تحديث accessible_stages للطلاب غير المحدثين
    await pool.query(`
      UPDATE students
      SET accessible_stages = CASE
        WHEN stage = '4' THEN '["1","2","3","4"]'
        WHEN stage = '3' THEN '["1","2","3"]'
        WHEN stage = '2' THEN '["1","2"]'
        WHEN stage = '1' THEN '["1"]'
        ELSE '["1"]'
      END
      WHERE (accessible_stages IS NULL OR accessible_stages = '') AND stage IS NOT NULL
    `);
    console.log('   ✅ تحديث المراحل المتاحة لجميع الطلاب');

    console.log('\n✅ تم تطبيق جميع التحديثات بنجاح!\n');
    console.log('📊 ملخص التحديثات:');
    console.log('   ✅ إضافة حقول المراحل (stage) والكورسات (term)');
    console.log('   ✅ إضافة جداول المحتوى التعليمي والواجبات');
    console.log('   ✅ تحديث المواد الدراسية لتحتوي على مراحل وكورسات');
    console.log('   ✅ تحديث بيانات الطالب الافتراضي');
    console.log('\n🎉 قاعدة البيانات جاهزة الآن!\n');

  } catch (error) {
    console.error('❌ حدث خطأ:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

updateDatabase();

