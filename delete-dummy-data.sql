/*
   سكريبت حذف البيانات الوهمية/الافتراضية من النظام

   هذا السكريبت سيحذف:
   - الطالب الافتراضي
   - المدرس الافتراضي
   - المواد الافتراضية
   - البيانات المرتبطة (التسجيلات، الدرجات، الحضور)

   ملاحظة: سيتم الاحتفاظ بمستخدم الأدمن فقط
*/

-- بداية المعاملة
BEGIN;

-- 1. حذف بيانات الحضور للطلاب الافتراضيين
DELETE FROM attendance
WHERE student_id IN (
    SELECT id FROM students WHERE email = 'student@almaqal.edu.iq'
);

-- 2. حذف بيانات الدرجات للطلاب الافتراضيين
DELETE FROM grades
WHERE student_id IN (
    SELECT id FROM students WHERE email = 'student@almaqal.edu.iq'
);

-- 3. حذف تسجيلات الطلاب في المواد
DELETE FROM enrollments
WHERE student_id IN (
    SELECT id FROM students WHERE email = 'student@almaqal.edu.iq'
);

-- 4. حذف محتوى المواد والواجبات للمواد الافتراضية
DELETE FROM homework_grades
WHERE content_id IN (
    SELECT id FROM course_contents
    WHERE course_id IN (
        SELECT id FROM courses
        WHERE code IN ('CS101', 'CS102', 'CS201', 'CS202', 'CS301')
    )
);

DELETE FROM course_contents
WHERE course_id IN (
    SELECT id FROM courses
    WHERE code IN ('CS101', 'CS102', 'CS201', 'CS202', 'CS301')
);

-- 5. حذف التسجيلات في المواد الافتراضية
DELETE FROM enrollments
WHERE course_id IN (
    SELECT id FROM courses
    WHERE code IN ('CS101', 'CS102', 'CS201', 'CS202', 'CS301')
);

-- 6. حذف المواد الافتراضية
DELETE FROM courses
WHERE code IN ('CS101', 'CS102', 'CS201', 'CS202', 'CS301');

-- 7. حذف الطالب الافتراضي
DELETE FROM students WHERE email = 'student@almaqal.edu.iq';

-- 8. حذف المدرس الافتراضي
DELETE FROM teachers WHERE email = 'teacher@almaqal.edu.iq';

-- 9. حذف مستخدمي النظام الافتراضيين (عدا الأدمن)
DELETE FROM users
WHERE email IN ('student@almaqal.edu.iq', 'teacher@almaqal.edu.iq');

-- تأكيد المعاملة
COMMIT;

-- عرض النتائج
SELECT 'Users' as table_name, COUNT(*) as remaining_count FROM users
UNION ALL
SELECT 'Students', COUNT(*) FROM students
UNION ALL
SELECT 'Teachers', COUNT(*) FROM teachers
UNION ALL
SELECT 'Courses', COUNT(*) FROM courses
UNION ALL
SELECT 'Enrollments', COUNT(*) FROM enrollments;

-- رسالة تأكيد
SELECT 'تم حذف جميع البيانات الوهمية بنجاح! ✅' as message;