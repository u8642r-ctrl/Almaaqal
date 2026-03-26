-- إصلاح قاعدة البيانات وإضافة المواد الدراسية للتدريسي

-- التأكد من وجود الأستاذ الافتراضي
INSERT INTO teachers (name, email, phone, department) VALUES
  ('د. حسين كاظم', 'teacher@almaqal.edu.iq', '07701234567', 'علوم الحاسوب')
ON CONFLICT (email) DO UPDATE SET
  name = 'د. حسين كاظم',
  phone = '07701234567',
  department = 'علوم الحاسوب';

-- الحصول على ID الأستاذ
DO $$
DECLARE
  teacher_id_var INTEGER;
BEGIN
  SELECT id INTO teacher_id_var FROM teachers WHERE email = 'teacher@almaqal.edu.iq';

  -- حذف المواد القديمة للأستاذ إذا كانت موجودة
  DELETE FROM courses WHERE teacher_id = teacher_id_var;

  -- إضافة المواد الدراسية الجديدة
  INSERT INTO courses (name, code, description, teacher_id) VALUES
    ('برمجة الويب', 'CS101', 'مقرر أساسي في تطوير تطبيقات الويب', teacher_id_var),
    ('قواعد البيانات', 'CS102', 'دراسة أنظمة إدارة قواعد البيانات', teacher_id_var),
    ('هياكل البيانات', 'CS103', 'مقرر متقدم في تنظيم البيانات', teacher_id_var),
    ('البرمجة الكائنية', 'CS104', 'مبادئ البرمجة الشيئية', teacher_id_var),
    ('الذكاء الاصطناعي', 'CS105', 'مقدمة في الذكاء الاصطناعي والتعلم الآلي', teacher_id_var);

  RAISE NOTICE 'تم إضافة المواد الدراسية بنجاح للأستاذ رقم %', teacher_id_var;
END $$;

-- التأكد من وجود الطالب الافتراضي
INSERT INTO students (name, email, phone, department) VALUES
  ('أحمد محمد علي', 'student@almaqal.edu.iq', '07801234567', 'علوم الحاسوب')
ON CONFLICT (email) DO NOTHING;

-- تسجيل الطالب في بعض المواد
DO $$
DECLARE
  student_id_var INTEGER;
  course_id_var INTEGER;
BEGIN
  SELECT id INTO student_id_var FROM students WHERE email = 'student@almaqal.edu.iq';

  -- تسجيل الطالب في المواد
  FOR course_id_var IN (SELECT id FROM courses LIMIT 3)
  LOOP
    INSERT INTO enrollments (student_id, course_id)
    VALUES (student_id_var, course_id_var)
    ON CONFLICT (student_id, course_id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'تم تسجيل الطالب في المواد بنجاح';
END $$;
