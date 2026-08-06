# Course Hub — MVP

منصة شخصية لتحويل محاضرات يوتيوب إلى ملخصات هرمية قابلة للتطبيق، بدون مشاهدة كاملة.

## البنية

```
course-hub/
├── sql/schema.sql              # قاعدة البيانات الكاملة (Supabase + RLS)
├── scripts/
│   ├── extract_transcript.py   # استخراج النص من يوتيوب (بدون تحميل فيديو)
│   ├── summarize.py            # تلخيص هرمي عبر Claude API (Map-Reduce)
│   └── pipeline.py             # يربط الاثنين + يخزّن في Supabase
├── requirements.txt
└── .env.example
```

## آلية العمل

```
رابط يوتيوب
   ↓ extract_transcript.py (يستخدم captions الموجودة، لا تحميل فيديو)
النص الكامل + تقسيم زمني (chunks كل ~12 دقيقة)
   ↓ summarize.py
   ├─ Map: تلخيص كل جزء زمني على حدة (يحافظ على التفاصيل)
   └─ Reduce: دمج الملخصات في JSON هرمي (سريع/تفصيلي/تطبيقي + بنك معرفة)
   ↓ pipeline.py
تخزين في Supabase (RLS مفعّل — كل مستخدم يرى بياناته فقط)
```

## الإعداد (خطوة بخطوة)

### 1. Supabase
- أنشئ مشروع جديد على supabase.com
- افتح SQL Editor → الصق محتوى `sql/schema.sql` → Run
- من Settings → API، انسخ `Project URL` و `anon/service key`

### 2. متغيرات البيئة
```bash
cp .env.example .env
# املأ القيم الثلاث: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_KEY
```

### 3. التثبيت والتشغيل
```bash
pip install -r requirements.txt
cd scripts
python pipeline.py "https://youtube.com/watch?v=XXXXXXXXXXX" --user-id "YOUR_SUPABASE_USER_ID"
```

> **user-id**: لأن الجداول مبنية على RLS بـ `auth.users`، تحتاج مستخدم حقيقي في Supabase Auth (حتى لنفسك). أنشئه من Authentication → Users → Add User، وانسخ الـ UUID.

## ⚠️ ملاحظة مهمة حول الاختبار

الكود لم يُختبر داخل بيئة التطوير الحالية لأن شبكتها تحجب الوصول لـ youtube.com (قيود أمان في بيئة Claude). **الكود صحيح صياغياً ومنطقياً** (تم التحقق منه)، لكن يجب اختباره فعلياً على جهازك أو سيرفرك حيث الشبكة مفتوحة. الخطوة الأولى بعد التنزيل:

```bash
python scripts/extract_transcript.py "رابط أي فيديو يوتيوب عندك captions"
```

لو ظهرت النتيجة بنجاح، الأساس يعمل وننتقل للخطوة التالية.

## ما هو ناقص عمداً في هذا الـ MVP (حسب الخطة المرحلية)

- ❌ واجهة ويب (نبدأ بـ CLI للتحقق من الفكرة، الواجهة تأتي بعد التأكد من الجودة)
- ❌ نظام مراجعة متباعدة (Spaced Repetition)
- ❌ بحث دلالي (pgvector) — البحث النصي البسيط (`idx_lectures_search`) كافٍ الآن
- ❌ دعم منصات الاشتراك (يوتيوب فقط في هذه المرحلة، حسب الاتفاق)
- ❌ نظام مستخدمين متعدد / اشتراكات مدفوعة

## الخطوة التالية المقترحة

1. اختبر `extract_transcript.py` على 2-3 فيديوهات حقيقية من مكتبتك
2. اختبر `pipeline.py` كاملاً على محاضرة واحدة، راجع جودة `summary_actionable`
3. لو الجودة ممتازة → نبني واجهة ويب بسيطة (Next.js أو حتى HTML/JS بسيط) فوق نفس الـ backend
4. لو الجودة تحتاج تحسين → نعدّل الـ prompts في `summarize.py` فقط (لا حاجة لإعادة بناء أي شيء آخر)
