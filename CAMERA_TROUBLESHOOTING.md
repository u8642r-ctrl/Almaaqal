# حلول مشكلة الكاميرا في الهاتف

## المشكلة:
الكاميرا لا تعمل على الهاتف بسبب متطلبات الأمان في المتصفحات

## الحلول:

### 1️⃣ الحل الأسرع: استخدم ngrok (مجاني)

```bash
# تثبيت ngrok
npm install -g ngrok

# شغل السيرفر عادي
npm run dev

# في terminal آخر، شغل ngrok
ngrok http 3000
```

ستحصل على رابط HTTPS مثل: `https://abc123.ngrok.io`
استخدم هذا الرابط من الهاتف.

### 2️⃣ الحل الثاني: Self-Signed Certificate

```bash
# إنشاء شهادة SSL محلية
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout localhost-key.pem -out localhost-cert.pem

# تشغيل بـ HTTPS
npm run dev -- --experimental-https --experimental-https-key ./localhost-key.pem --experimental-https-cert ./localhost-cert.pem
```

### 3️⃣ الحل الثالث: استخدم mkcert

```bash
# تثبيت mkcert
# Windows (Chocolatey):
choco install mkcert

# إنشاء شهادة للـ IP المحلي
mkcert localhost 192.168.1.100

# تشغيل بـ HTTPS
npm run dev -- --experimental-https --experimental-https-key ./localhost+1-key.pem --experimental-https-cert ./localhost+1.pem
```

### 4️⃣ استخدم Chrome مع إعدادات خاصة

افتح Chrome بهذه المعاملات:
```
chrome --unsafely-treat-insecure-origin-as-secure=http://IP:3000 --user-data-dir=/tmp/foo
```

### 5️⃣ للتطوير فقط: تجاهل الأذونات

في Chrome (Android):
1. اذهب إلى `chrome://flags`
2. ابحث عن "insecure origins treated as secure"
3. أضف عنوان IP الخاص بك