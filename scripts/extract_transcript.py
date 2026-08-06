"""
استخراج نص المحاضرة من يوتيوب — بدون تحميل الفيديو أو مشاهدته.
يعتمد على captions الموجودة أصلاً على يوتيوب (تلقائية أو يدوية).
"""

import re
import sys
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
)


def extract_video_id(url: str) -> str:
    """يستخرج video_id من أي شكل رابط يوتيوب."""
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11}).*",
        r"youtu\.be\/([0-9A-Za-z_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"تعذّر استخراج video_id من الرابط: {url}")


def get_transcript(url: str, languages=("ar", "en")) -> dict:
    """
    يرجع dict فيه:
    - video_id
    - full_text: النص كاملاً مدمجاً
    - segments: قائمة [{text, start, duration}] للحفاظ على الطوابع الزمنية
    - language: اللغة المستخدمة فعلياً
    """
    video_id = extract_video_id(url)
    api = YouTubeTranscriptApi()

    try:
        transcript_list = api.list(video_id)
        # نحاول اللغات المفضلة أولاً، ثم أي لغة متاحة
        transcript = None
        for lang in languages:
            try:
                transcript = transcript_list.find_transcript([lang])
                break
            except NoTranscriptFound:
                continue
        if transcript is None:
            # نأخذ أول لغة متاحة (قد تكون مولّدة تلقائياً)
            transcript = next(iter(transcript_list))

        fetched = transcript.fetch()
        segments = [
            {"text": s.text, "start": s.start, "duration": s.duration}
            for s in fetched.snippets
        ]
        full_text = " ".join(s["text"] for s in segments)

        return {
            "video_id": video_id,
            "full_text": full_text,
            "segments": segments,
            "language": transcript.language_code,
            "duration_seconds": int(segments[-1]["start"] + segments[-1]["duration"]) if segments else 0,
        }

    except TranscriptsDisabled:
        raise RuntimeError(
            f"لا توجد captions متاحة لهذا الفيديو ({video_id}). "
            "الخيار البديل: تحميل الصوت فقط عبر yt-dlp ثم تفريغه بـ Whisper."
        )
    except VideoUnavailable:
        raise RuntimeError(f"الفيديو غير متاح: {video_id}")


def chunk_transcript(segments: list, chunk_minutes: int = 12) -> list:
    """
    يقسّم النص إلى أجزاء حسب الزمن (مهم لمحاضرات > 20 دقيقة)
    حتى لا يفقد التلخيص التفاصيل عند إرساله للـ AI دفعة واحدة.
    """
    if not segments:
        return []

    chunk_seconds = chunk_minutes * 60
    chunks = []
    current_chunk = {"start": segments[0]["start"], "text": ""}

    for seg in segments:
        if seg["start"] - current_chunk["start"] > chunk_seconds and current_chunk["text"]:
            chunks.append(current_chunk)
            current_chunk = {"start": seg["start"], "text": ""}
        current_chunk["text"] += " " + seg["text"]

    if current_chunk["text"]:
        chunks.append(current_chunk)

    return chunks


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("الاستخدام: python extract_transcript.py <youtube_url>")
        sys.exit(1)

    url = sys.argv[1]
    try:
        result = get_transcript(url)
        print(f"✅ تم الاستخراج — اللغة: {result['language']}")
        print(f"   المدة: {result['duration_seconds'] // 60} دقيقة")
        print(f"   عدد الكلمات تقريباً: {len(result['full_text'].split())}")
        chunks = chunk_transcript(result["segments"])
        print(f"   عدد الأجزاء الزمنية: {len(chunks)}")
    except Exception as e:
        print(f"❌ خطأ: {e}")
        sys.exit(1)
