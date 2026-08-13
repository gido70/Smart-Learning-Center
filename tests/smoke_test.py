from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
index=(root/'index.html').read_text(encoding='utf-8')
app=(root/'assets/js/app.js').read_text(encoding='utf-8')
required_views=['dashboard','advisor','live','replay','workspace','courses','inbox','micro','projects','graph','review','factory','chat','analytics','settings']
required_files=['index.html','assets/css/app.css','assets/js/app.js','AGENTS.md','CHANGELOG.md','src/core/module-registry.js','src/modules/live-learning/session-controls.js','docs/PLATFORM_FUNCTIONAL_AUDIT_AR.md']
errors=[]
for f in required_files:
    if not (root/f).exists(): errors.append(f'ملف مفقود: {f}')
for view in required_views:
    if f'id="{view}"' not in index: errors.append(f'واجهة مفقودة: {view}')
for token in ['watchInsideBtn','watchOutsideBtn','savePointBtn','lessonNotes','quickAddBtn']:
    if token not in index+app: errors.append(f'وظيفة أساسية مفقودة: {token}')
if 'dir="rtl"' not in index: errors.append('دعم RTL مفقود')
for token in ['addLectureBtn','lectureModal','lectureEditingId','editCurrentLectureBtn','deleteCurrentLectureBtn','localSummarizeBtn','notebookLmExportBtn','lecture-portal.js','lecture-summarizer.js','course-series.js','liveCourseSelect','courseFilters','courseSearchInput']:
    if token not in index: errors.append(f'بوابة المحاضرات مفقودة: {token}')
for token in ['pauseLiveBtn','resumeLiveBtn','reselectScreenBtn','liveAudioStatus','session-controls.js','liveAiCompanion','aiToggleListeningBtn','aiAnalyzeSlideBtn','aiSuggestionList','aiSlideSuggestionList','aiSpeechSuggestionList','exitFullscreenPreviewBtn','finish-live-scroll','live-interaction-assistant.js']:
    if token not in index: errors.append(f'تحكم الجلسة المباشرة مفقود: {token}')
if errors:
    print('SMOKE TEST FAILED')
    print('\n'.join(errors))
    sys.exit(1)
print('SMOKE TEST PASSED — جميع الوظائف الأساسية موجودة')
