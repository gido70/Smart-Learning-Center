"""
تلخيص هرمي للمحاضرة عبر Claude API.
يستخدم Map-Reduce للمحاضرات الطويلة (> 15 دقيقة) لتجنّب فقدان التفاصيل.

المخرجات:
- summary_quick: 5-10 نقاط سريعة
- summary_detailed: ملخص مقسّم بفصول زمنية
- summary_actionable: ماذا أستفيد / خطوات / أكواد / أخطاء محتملة
- knowledge_items: عناصر منفصلة قابلة للتخزين (كود، أمر، أداة...)
"""

import json
import os
from anthropic import Anthropic

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-6"

# ---------------------------------------------------------
# المرحلة 1 (Map): تلخيص كل جزء زمني على حدة
# ---------------------------------------------------------
CHUNK_SUMMARY_PROMPT = """أنت مساعد متخصص في تلخيص المحاضرات التقنية والتعليمية.
هذا جزء من محاضرة أطول (الدقيقة {start_min} فصاعداً). لخّص هذا الجزء فقط بدقة:

النص:
{chunk_text}

أعد ملخصاً موجزاً (3-6 جمل) يغطي:
- الأفكار الرئيسية في هذا الجزء
- أي كود، أمر، أو خطوة عملية وردت حرفياً
- أي تحذير أو خطأ شائع ذكره المتحدث

اكتب بالعربية، ملخصاً كثيفاً بدون حشو."""


def summarize_chunk(chunk_text: str, start_seconds: float) -> str:
    start_min = int(start_seconds // 60)
    response = client.messages.create(
        model=MODEL,
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": CHUNK_SUMMARY_PROMPT.format(
                start_min=start_min, chunk_text=chunk_text
            )
        }]
    )
    return response.content[0].text


# ---------------------------------------------------------
# المرحلة 2 (Reduce): دمج الملخصات الجزئية في تلخيص هرمي نهائي
# ---------------------------------------------------------
FINAL_SUMMARY_PROMPT = """لديك ملخصات جزئية لمحاضرة تعليمية كاملة (بالترتيب الزمني):

{combined_chunk_summaries}

المهمة: أنتج تلخيصاً هرمياً بصيغة JSON فقط، بدون أي نص إضافي قبله أو بعده، وفق البنية التالية بالضبط:

{{
  "summary_quick": ["نقطة 1", "نقطة 2", "... من 5 إلى 10 نقاط"],
  "summary_detailed": [
    {{"chapter": "عنوان الموضوع", "explanation": "شرح مفصل بجملتين إلى ثلاث"}}
  ],
  "summary_actionable": {{
    "benefit": "ماذا أستفيد من هذه المحاضرة بشكل عام؟",
    "steps": ["خطوة عملية 1", "خطوة عملية 2"],
    "files_or_configs": ["ما الملفات أو الإعدادات التي يجب تعديلها إن وجدت"],
    "common_mistakes": ["خطأ محتمل 1", "خطأ محتمل 2"]
  }},
  "knowledge_items": [
    {{"type": "code", "title": "عنوان مختصر", "content": "الكود أو الأمر كما ورد"}},
    {{"type": "concept", "title": "عنوان المفهوم", "content": "شرح موجز"}},
    {{"type": "tool", "title": "اسم الأداة", "content": "لماذا ذُكرت"}}
  ]
}}

ملاحظات:
- type في knowledge_items يجب أن يكون واحداً من: code, command, concept, tool, link, error_solution, prompt
- لا تخترع معلومات غير موجودة في الملخصات الجزئية
- أعد JSON صالحاً فقط (سيُحلَّل مباشرة عبر json.loads)"""


def generate_hierarchical_summary(chunk_summaries: list) -> dict:
    combined = "\n\n".join(
        f"[جزء {i+1}] {s}" for i, s in enumerate(chunk_summaries)
    )
    response = client.messages.create(
        model=MODEL,
        max_tokens=3000,
        messages=[{
            "role": "user",
            "content": FINAL_SUMMARY_PROMPT.format(combined_chunk_summaries=combined)
        }]
    )
    raw_text = response.content[0].text.strip()
    # تنظيف احتياطي لو أضاف الموديل ```json``` بالخطأ
    raw_text = raw_text.replace("```json", "").replace("```", "").strip()
    return json.loads(raw_text)


# ---------------------------------------------------------
# نقطة الدخول الرئيسية
# ---------------------------------------------------------
def summarize_lecture(chunks: list) -> dict:
    """
    chunks: قائمة [{start, text}] من extract_transcript.chunk_transcript()
    يرجع dict جاهز للتخزين المباشر في جدول lectures
    """
    if not chunks:
        raise ValueError("لا يوجد نص لتلخيصه")

    # لو المحاضرة قصيرة (جزء واحد فقط) نلخصها مباشرة بدون Map منفصل
    if len(chunks) == 1:
        chunk_summaries = [chunks[0]["text"][:8000]]  # حد أمان لطول المدخل
    else:
        print(f"⏳ تلخيص {len(chunks)} جزءاً (Map)...")
        chunk_summaries = [
            summarize_chunk(c["text"], c["start"]) for c in chunks
        ]

    print("⏳ دمج الملخصات في تلخيص هرمي نهائي (Reduce)...")
    final = generate_hierarchical_summary(chunk_summaries)
    return final


if __name__ == "__main__":
    import sys
    from extract_transcript import get_transcript, chunk_transcript

    if len(sys.argv) < 2:
        print("الاستخدام: python summarize.py <youtube_url>")
        sys.exit(1)

    url = sys.argv[1]
    print("⏳ استخراج النص من يوتيوب...")
    result = get_transcript(url)
    chunks = chunk_transcript(result["segments"])

    summary = summarize_lecture(chunks)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
