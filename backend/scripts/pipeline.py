"""
Pipeline الكامل: رابط يوتيوب → استخراج → تلخيص هرمي → تخزين في Supabase
هذا هو السكربت الذي تستخدمه فعلياً يومياً.

الاستخدام:
    python pipeline.py "https://youtube.com/watch?v=XXXXX" --project "أكاديمية الفلاح" --importance 5
"""

import os
import sys
import argparse
from dotenv import load_dotenv
from supabase import create_client
from extract_transcript import get_transcript, chunk_transcript
from summarize import summarize_lecture

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")


def get_or_create_project(supabase, user_id: str, project_name: str) -> str:
    existing = (
        supabase.table("projects")
        .select("id")
        .eq("user_id", user_id)
        .eq("name", project_name)
        .execute()
    )
    if existing.data:
        return existing.data[0]["id"]

    created = (
        supabase.table("projects")
        .insert({"user_id": user_id, "name": project_name})
        .execute()
    )
    return created.data[0]["id"]


def run_pipeline(url: str, user_id: str, project_name: str = None, importance: int = 3):
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 1. إنشاء سجل أولي بحالة "processing"
    lecture = (
        supabase.table("lectures")
        .insert({
            "user_id": user_id,
            "source_url": url,
            "processing_status": "extracting",
        })
        .execute()
    ).data[0]
    lecture_id = lecture["id"]

    try:
        # 2. استخراج النص
        print("⏳ استخراج transcript...")
        transcript = get_transcript(url)
        chunks = chunk_transcript(transcript["segments"])

        supabase.table("lectures").update({
            "video_id": transcript["video_id"],
            "transcript_raw": transcript["full_text"],
            "duration_seconds": transcript["duration_seconds"],
            "processing_status": "summarizing",
        }).eq("id", lecture_id).execute()

        # 3. التلخيص الهرمي
        summary = summarize_lecture(chunks)

        # 4. ربط بمشروع إن وُجد
        project_id = None
        if project_name:
            project_id = get_or_create_project(supabase, user_id, project_name)

        # 5. تحديث السجل بالنتائج الكاملة
        supabase.table("lectures").update({
            "summary_quick": summary.get("summary_quick"),
            "summary_detailed": summary.get("summary_detailed"),
            "summary_actionable": summary.get("summary_actionable"),
            "project_id": project_id,
            "processing_status": "done",
            "status": "summary_only",
        }).eq("id", lecture_id).execute()

        # 6. تخزين عناصر بنك المعرفة كصفوف منفصلة (قابلة للبحث لاحقاً)
        knowledge_items = summary.get("knowledge_items", [])
        if knowledge_items:
            rows = [
                {
                    "user_id": user_id,
                    "lecture_id": lecture_id,
                    "item_type": item.get("type", "other"),
                    "title": item.get("title", ""),
                    "content": item.get("content", ""),
                }
                for item in knowledge_items
            ]
            supabase.table("knowledge_items").insert(rows).execute()

        print(f"✅ تم بنجاح — lecture_id: {lecture_id}")
        print(f"   نقاط الملخص السريع: {len(summary.get('summary_quick', []))}")
        print(f"   عناصر بنك المعرفة: {len(knowledge_items)}")
        return lecture_id

    except Exception as e:
        supabase.table("lectures").update({
            "processing_status": "failed",
            "processing_error": str(e),
        }).eq("id", lecture_id).execute()
        print(f"❌ فشل: {e}")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="معالجة محاضرة يوتيوب كاملة")
    parser.add_argument("url", help="رابط يوتيوب")
    parser.add_argument("--user-id", required=True, help="معرف المستخدم في Supabase (auth.users.id)")
    parser.add_argument("--project", default=None, help="اسم المشروع المرتبط")
    parser.add_argument("--importance", type=int, default=3, help="درجة الأهمية 1-5")
    args = parser.parse_args()

    run_pipeline(args.url, args.user_id, args.project, args.importance)
