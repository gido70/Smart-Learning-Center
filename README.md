# Smart Learning Center – Vision 2.0

منصة عبدالرحمن الشخصية لتنظيم المحاضرات والتعلّم وإدارة المعرفة.

## ما تتضمنه النسخة

- Dashboard شامل
- AI Learning Advisor
- Live Learning Companion
- Replay Center
- Course Library
- Knowledge Inbox
- Micro Learning Center
- Project Intelligence
- Knowledge Graph
- Spaced Review
- Knowledge Factory
- Ask Your Knowledge
- Analytics
- Settings

## التشغيل

ارفع جميع الملفات والمجلدات إلى جذر مستودع GitHub Pages نفسه.
يجب أن يكون `index.html` في الجذر مباشرة.

## ما يعمل في 3.1.0

- الدخول بالحساب الشخصي الحالي.
- حفظ الكورسات والمصادر في Supabase.
- بوابة محاضرات تربط YouTube والمنصات الخارجية والملفات المباشرة بالكورسات.
- عرض داخلي عندما يسمح المصدر، مع فتح المصدر الأصلي دائمًا عند المنع.
- بحث موحد في الكورسات والمحاضرات والملاحظات والخلاصات.
- إعداد نص المحاضرة للتلخيص عبر اشتراك ChatGPT دون مفتاح API ثم حفظ الخلاصة.

قبل استخدام بوابة المحاضرات شغّل `sql/2026-08-09_lecture_portal.sql` مرة واحدة في Supabase.

## ملاحظة

ما زالت الترجمة المباشرة والتفريغ الصوتي والمعالجة الآلية الكاملة مراحل لاحقة. ملفات Claude الخلفية القديمة غير موصولة بالواجهة في هذه النسخة.

تم الاحتفاظ بالسكربتات الأصلية وقاعدة البيانات الأولية داخل مجلد `backend/`.
