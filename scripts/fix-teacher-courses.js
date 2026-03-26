/**
 * سكربت لإصلاح المواد الدراسية للتدريسي
 * يقوم بإضافة مواد دراسية افتراضية للتدريسي الافتراضي
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

async function fixTeacherCourses() {
  try {
    console.log('🔧 جاري إصلاح المواد الدراسية للتدريسي...\n');

    // 1. التحقق من وجود الأستاذ
    const teacherResult = await pool.query(
      "SELECT id, name, email FROM teachers WHERE email = $1",
      ['teacher@almaqal.edu.iq']
    );

    if (teacherResult.rows.length === 0) {
      console.log('❌ لم يتم العثور على الأستاذ الافتراضي');
      console.log('➕ جاري إنشاء الأستاذ الافتراضي...');

      await pool.query(
        `INSERT INTO teachers (name, email, phone, department) VALUES
         ('د. حسين كاظم', 'teacher@almaqal.edu.iq', '07701234567', 'علوم الحاسوب')
         ON CONFLICT (email) DO NOTHING`
      );

      const newTeacher = await pool.query(
        "SELECT id FROM teachers WHERE email = 'teacher@almaqal.edu.iq'"
      );

      teacherId = newTeacher.rows[0].id;
      console.log('✅ تم إنشاء الأستاذ بنجاح - ID:', teacherId);
    } else {
      const teacherId = teacherResult.rows[0].id;
      console.log('✅ تم العثور على الأستاذ:', teacherResult.rows[0].name);
      console.log('   البريد الإلكتروني:', teacherResult.rows[0].email);
      console.log('   المعرف (ID):', teacherId, '\n');

      // 2. فحص المواد الحالية
      const currentCourses = await pool.query(
        "SELECT id, name, code FROM courses WHERE teacher_id = $1",
        [teacherId]
      );

      console.log('📚 المواد الحالية المسندة للأستاذ:', currentCourses.rows.length);
      if (currentCourses.rows.length > 0) {
        currentCourses.rows.forEach((course, index) => {
          console.log(`   ${index + 1}. ${course.name} (${course.code})`);
        });
      }
      console.log();

      // 3. إضافة المواد الجديدة
      console.log('➕ جاري إضافة المواد الدراسية...');

      const courses = [
        ['برمجة الويب', 'CS101', 'مقرر أساسي في تطوير تطبيقات الويب'],
        ['قواعد البيانات', 'CS102', 'دراسة أنظمة إدارة قواعد البيانات'],
        ['هياكل البيانات', 'CS103', 'مقرر متقدم في تنظيم البيانات'],
        ['البرمجة الكائنية', 'CS104', 'مبادئ البرمجة الشيئية'],
        ['الذكاء الاصطناعي', 'CS105', 'مقدمة في الذكاء الاصطناعي والتعلم الآلي'],
      ];

      let addedCount = 0;
      let skippedCount = 0;

      for (const [name, code, description] of courses) {
        try {
          const result = await pool.query(
            `INSERT INTO courses (name, code, description, teacher_id)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (code) DO UPDATE SET
               name = $1,
               description = $3,
               teacher_id = $4
             RETURNING id`,
            [name, code, description, teacherId]
          );

          if (result.rowCount > 0) {
            console.log(`   ✅ تمت إضافة: ${name} (${code})`);
            addedCount++;
          }
        } catch (err) {
          console.log(`   ⚠️  تم تخطي: ${name} (${code}) - موجود مسبقاً`);
          skippedCount++;
        }
      }

      console.log();
      console.log('📊 الإحصائيات:');
      console.log(`   ✅ المواد المضافة/المحدثة: ${addedCount}`);
      console.log(`   ⏭️  المواد المتخطاة: ${skippedCount}`);
      console.log(`   📚 إجمالي المواد: ${courses.length}`);
      console.log();

      // 4. عرض النتيجة النهائية
      const finalCourses = await pool.query(
        `SELECT c.id, c.name, c.code, c.description, COUNT(e.id) as student_count
         FROM courses c
         LEFT JOIN enrollments e ON c.id = e.course_id
         WHERE c.teacher_id = $1
         GROUP BY c.id
         ORDER BY c.code`,
        [teacherId]
      );

      console.log('✅ المواد النهائية المسندة للأستاذ:');
      finalCourses.rows.forEach((course, index) => {
        console.log(`   ${index + 1}. ${course.name} (${course.code})`);
        console.log(`      📝 ${course.description}`);
        console.log(`      👥 عدد الطلاب: ${course.student_count}`);
      });
    }

    console.log('\n🎉 تم إصلاح المواد الدراسية بنجاح!\n');

  } catch (error) {
    console.error('❌ حدث خطأ:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fixTeacherCourses();
