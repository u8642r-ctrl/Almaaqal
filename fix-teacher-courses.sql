/*
   سكريبت حل مشكلة عدم ظهور المواد للتدريسي

   المشكلة: المواد مرتبطة بالمدرس الافتراضي فقط
   الحل: ربط المواد بالمدرس الجديد
*/

-- 1. إيجاد معرف المدرس الحالي (بناءً على البريد الإلكتروني)
-- استبدل YOUR_EMAIL_ADDRESS ببريد المدرس الفعلي
DO $$
DECLARE
    new_teacher_id INTEGER;
    default_teacher_id INTEGER;
    teacher_email VARCHAR(100) := 'YOUR_EMAIL_ADDRESS'; -- استبدل هذا بالبريد الفعلي
BEGIN
    -- الحصول على معرف المدرس الافتراضي
    SELECT id INTO default_teacher_id
    FROM teachers
    WHERE email = 'teacher@almaqal.edu.iq';

    -- الحصول على معرف المدرس الحالي
    SELECT id INTO new_teacher_id
    FROM teachers
    WHERE email = teacher_email;

    -- إذا لم يتم العثور على المدرس الجديد، إنشاؤه
    IF new_teacher_id IS NULL THEN
        INSERT INTO teachers (name, email, department)
        VALUES ('المدرس الجديد', teacher_email, 'علوم الحاسوب')
        RETURNING id INTO new_teacher_id;

        RAISE NOTICE 'تم إنشاء مدرس جديد بالمعرف: %', new_teacher_id;
    END IF;

    -- نقل جميع المواد من المدرس الافتراضي للمدرس الجديد
    IF default_teacher_id IS NOT NULL AND new_teacher_id IS NOT NULL THEN
        UPDATE courses
        SET teacher_id = new_teacher_id
        WHERE teacher_id = default_teacher_id;

        RAISE NOTICE 'تم نقل جميع المواد للمدرس الجديد بنجاح';
    END IF;

END $$;

-- 2. التحقق من النتائج
SELECT c.id, c.name, c.code, t.name as teacher_name, t.email as teacher_email
FROM courses c
LEFT JOIN teachers t ON c.teacher_id = t.id
ORDER BY c.name;