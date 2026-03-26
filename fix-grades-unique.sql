-- إصلاح جدول الدرجات: حذف المكررات وإضافة UNIQUE constraint

-- 1. حذف السجلات المكررة (الاحتفاظ بالأحدث)
DELETE FROM grades a USING (
  SELECT MIN(id) as id, student_id, course_id, semester
  FROM grades
  GROUP BY student_id, course_id, semester
  HAVING COUNT(*) > 1
) b
WHERE a.student_id = b.student_id
  AND a.course_id = b.course_id
  AND a.semester = b.semester
  AND a.id > b.id;

-- 2. إضافة UNIQUE constraint
ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_student_course_semester_unique;
ALTER TABLE grades ADD CONSTRAINT grades_student_course_semester_unique UNIQUE (student_id, course_id, semester);

-- عرض النتائج
SELECT 'Grades table fixed successfully!' as status;