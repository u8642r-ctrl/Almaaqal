#!/bin/bash

# سكريپت تنظيف النظام من البيانات الوهمية

echo "🧹 بدء عملية تنظيف النظام من البيانات الوهمية..."

# التحقق من وجود ملف حذف البيانات
if [ ! -f "delete-dummy-data.sql" ]; then
    echo "❌ خطأ: ملف delete-dummy-data.sql غير موجود"
    exit 1
fi

# تنفيذ سكريبت حذف البيانات (يحتاج مستخدم لتحديد معلومات قاعدة البيانات)
echo "📋 لحذف البيانات الوهمية من قاعدة البيانات، قم بتنفيذ الأمر التالي:"
echo "psql -d your_database_name < delete-dummy-data.sql"
echo ""

# إعادة تشغيل التطبيق
echo "🔄 إعادة تشغيل التطبيق..."
npm run dev

echo ""
echo "✅ تم تنظيف النظام بنجاح!"
echo ""
echo "📖 للمزيد من المعلومات، اقرأ ملف CLEAN_SYSTEM_GUIDE.md"
echo ""
echo "🔐 معلومات تسجيل الدخول:"
echo "   الأدمن: admin@almaqal.edu.iq / admin2001"