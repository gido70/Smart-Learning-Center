from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
index=(root/'index.html').read_text(encoding='utf-8')
app=(root/'assets/js/app.js').read_text(encoding='utf-8')
required_views=['dashboard','advisor','live','workspace','courses','inbox','micro','projects','graph','review','factory','chat','analytics','settings']
required_files=['index.html','assets/css/app.css','assets/js/app.js','AGENTS.md','CHANGELOG.md','src/core/module-registry.js','src/modules/live-learning/session-controls.js','src/modules/lecture-workspace/unified-lecture-workspace.js','docs/PLATFORM_FUNCTIONAL_AUDIT_AR.md']
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
for token in ['lectureSourceGrid','lectureKnowledgeTools','knowledgeToolOutput','unified-lecture-workspace.js','backToUnifiedLectureBtn','openKnowledgeToolsBtn']:
    if token not in index: errors.append(f'مساحة المحاضرة الموحدة مفقودة: {token}')
if 'data-view="replay"' in index: errors.append('واجهة المحاضرات المسجلة القديمة ما زالت ظاهرة بدل الدمج')
if "requestedHash==='replay'?'live'" not in app: errors.append('توافق رابط #replay القديم مفقود')
for token in ['data-view="product-camp"','id="product-camp"','digitalProductCamp','digital-product-camp.js']:
    if token not in index: errors.append(f'مختبر المنتج الرقمي مفقود: {token}')
camp=(root/'src/modules/digital-product-camp/digital-product-camp.js').read_text(encoding='utf-8') if (root/'src/modules/digital-product-camp/digital-product-camp.js').exists() else ''
for token in ['slc_digital_product_camp_v1','ميثاق المنتج','من المحاضرة إلى المنتج','lectureOutputs']:
    if token not in camp: errors.append(f'وظيفة مختبر المنتج الرقمي مفقودة: {token}')
for token in ['campGuideBtn','campGuideModal','ابدأ في 3 خطوات','مثال عملي','campGuideOpenLecture']:
    if token not in camp: errors.append(f'دليل مختبر المنتج الرقمي مفقود: {token}')
for token in ['campAnalyzeLecture','readLastLecture','rankIdeas','campAssistantOpportunity','اعتماد وحفظ مخرج المحاضرة']:
    if token not in camp: errors.append(f'مساعد تحويل المعرفة إلى منتج مفقود: {token}')
for token in ['pauseLiveBtn','resumeLiveBtn','reselectScreenBtn','liveAudioStatus','session-controls.js','liveAiCompanion','aiToggleListeningBtn','aiAnalyzeSlideBtn','aiSuggestionList','aiSlideSuggestionList','aiSpeechSuggestionList','exitFullscreenPreviewBtn','finish-live-scroll','live-interaction-assistant.js','autoCaptureBtn','restoreLiveDraftBtn','lectureHelperInput']:
    if token not in index: errors.append(f'تحكم الجلسة المباشرة مفقود: {token}')
live_studio=(root/'assets/js/live-studio.js').read_text(encoding='utf-8')
assistant=(root/'src/modules/live-learning/live-interaction-assistant.js').read_text(encoding='utf-8')
for token in ['clearCompletedWorkspace','SLCLiveInteractionAssistant?.endSession?.()','restoreSession?.(draft.interaction_assistant','toggleAutoCapture','🎤 صوتي: متوقف','slc_live_draft_available']:
    if token not in live_studio: errors.append(f'تنظيف الجلسة المباشرة مفقود: {token}')
for token in ['localStorage.removeItem(STORAGE_KEY)','restoreSession','endSession']:
    if token not in assistant: errors.append(f'عزل مساعد الجلسة مفقود: {token}')
for token in ['getSystemAudioTrack','recognition.start(audioTrack)','فعّل «صوت المحاضرة» أولًا','لن يُفتح الميكروفون']:
    if token not in (live_studio + assistant): errors.append(f'عزل صوت المحاضرة عن الميكروفون مفقود: {token}')
if errors:
    print('SMOKE TEST FAILED')
    print('\n'.join(errors))
    sys.exit(1)
print('SMOKE TEST PASSED — جميع الوظائف الأساسية موجودة')
