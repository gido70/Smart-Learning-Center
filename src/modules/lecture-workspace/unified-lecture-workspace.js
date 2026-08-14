/** مساحة المحاضرة الموحدة — مصدر واحد للأدوات المشتركة بين المباشر والمسجل. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  let sourceKind = 'live';
  let activeTool = 'summary';

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
  const toast = (message) => {
    const node = $('toast'); if (!node) return;
    node.textContent = message; node.classList.add('show');
    setTimeout(() => node.classList.remove('show'), 2400);
  };
  const compact = (value = '') => String(value).replace(/\s+/g, ' ').trim();
  const sentences = (text) => compact(text).split(/(?<=[.!؟؛])\s+/u).map(compact).filter((part) => part.length > 28);

  function currentEvidence() {
    const assistant = window.SLCLiveInteractionAssistant?.exportData?.() || {};
    const timelineEntries = $$('.lecture-event').map((node) => ({
      text: compact(`${node.querySelector('h4')?.textContent || ''} ${node.querySelector('p')?.textContent || ''}`),
      source: node.classList.contains('slide') ? 'عرض تقديمي' : 'سجل الجلسة',
      time: compact(node.querySelector('time')?.textContent || '')
    })).filter((entry) => entry.text);
    const timeline = timelineEntries.map((entry) => entry.text);
    const slideNotes = [
      $('slideTitleInput')?.value,
      $('slideNotesInput')?.value,
      ...$$('#lectureTimeline .lecture-event.slide').map((node) => compact(node.textContent))
    ].filter(Boolean);
    const transcript = compact(assistant.transcript || $('aiLiveTranscript')?.textContent || $('transcriptInput')?.value || '');
    const segments = [
      ...sentences(transcript).map((text) => ({ text, source: 'حديث المحاضر', time: '' })),
      ...slideNotes.map((text) => ({ text: compact(text), source: 'عرض تقديمي', time: '' })),
      ...timelineEntries
    ].filter((entry) => entry.text);
    return {
      transcript,
      timeline,
      slideNotes,
      segments,
      text: [transcript, ...slideNotes, ...timeline].filter(Boolean).join('. ')
    };
  }

  function sourceRef(evidence, index, fallbackType = 'حديث المحاضر') {
    const segment = evidence.segments?.[index];
    if (!segment) return `${fallbackType} · التوقيت غير متاح`;
    return `${segment.source || fallbackType} · ${segment.time || 'التوقيت غير متاح'}`;
  }

  function renderSummary(evidence) {
    if (evidence.text.length < 100) return 'لا يوجد نص أو شرائح كافية بعد. شغّل التفريغ أو افتح محاضرة محفوظة ثم أعد المحاولة.';
    try {
      const summary = window.slcLectureSummarizer?.buildSummary?.(evidence.text, 'المحاضرة الحالية');
      return `<pre class="knowledge-pre">${escapeHtml(summary || '')}</pre>`;
    } catch (_error) {
      const items = sentences(evidence.text).slice(0, 8);
      return `<h4>أهم المفاهيم الأولية</h4><ul>${items.map((item, index) => `<li>${escapeHtml(item)} <small>${sourceRef(evidence, index)}</small></li>`).join('')}</ul>`;
    }
  }

  function renderMindMap(evidence) {
    const items = sentences(evidence.text).slice(0, 7);
    if (!items.length) return 'لا توجد مادة كافية لبناء الخريطة.';
    const labels = items.map((item) => item.split(/\s+/).slice(0, 7).join(' '));
    return `<div class="lecture-mindmap"><strong>المحاضرة</strong>${labels.map((label, index) => `<span>${escapeHtml(label)}<small>${sourceRef(evidence, index)}</small></span>`).join('')}</div>`;
  }

  function renderQuiz(evidence) {
    const items = sentences(evidence.text).slice(0, 5);
    if (!items.length) return 'لا توجد مادة كافية لإنشاء الاختبار.';
    return `<ol class="lecture-quiz">${items.map((item, index) => `<li><b>ما الفكرة الأساسية في هذا المقطع؟</b><details><summary>إظهار الإجابة والتفسير</summary><p>${escapeHtml(item)}</p><small>${sourceRef(evidence, index)}</small></details></li>`).join('')}</ol>`;
  }

  function renderReview(evidence) {
    const items = sentences(evidence.text).slice(0, 6);
    if (!items.length) return 'لا توجد مادة كافية لإنشاء شرائح المراجعة.';
    return `<div class="review-slide-grid">${items.map((item, index) => `<article><span>${index + 1}</span><p>${escapeHtml(item)}</p><small>${sourceRef(evidence, index)}</small></article>`).join('')}</div>`;
  }

  function renderReport(evidence) {
    const items = sentences(evidence.text);
    if (!items.length) return 'لا توجد مادة كافية لإنشاء التقرير التطبيقي.';
    const concepts = items.slice(0, 4);
    const actions = items.filter((item) => /يمكن|تطبيق|ينبغي|يجب|خطوة|مشروع|بحث/u.test(item)).slice(0, 5);
    return `<div class="applied-report"><h4>القيمة المعرفية</h4><ul>${concepts.map((item, index) => `<li>${escapeHtml(item)} <small>${sourceRef(evidence, index)}</small></li>`).join('')}</ul><h4>فرص التطبيق والتحويل</h4><ul>${(actions.length ? actions : concepts).map((item) => `<li>حوّل هذه الفكرة إلى تجربة أو بحث قابل للتحقق: ${escapeHtml(item)}</li>`).join('')}</ul><p class="auth-note">هذه مسودة مستخرجة من المصدر، وليست حكمًا نهائيًا. راجع التوقيت أو الشريحة قبل اعتمادها.</p></div>`;
  }

  function searchEvidence(evidence, query) {
    const words = compact(query).toLowerCase().split(/\s+/).filter((word) => word.length > 2);
    if (!words.length) return 'اكتب كلمة أو مفهومًا محددًا.';
    const matches = evidence.segments.map((segment, index) => ({ item: segment.text, index, score: words.filter((word) => segment.text.toLowerCase().includes(word)).length }))
      .filter((entry) => entry.score).sort((a, b) => b.score - a.score).slice(0, 6);
    if (!matches.length) return 'لم أجد هذا المفهوم في النص أو الشرائح المتاحة. لا توجد إجابة مصطنعة.';
    return `<h4>مواضع موثقة من المحاضرة</h4><ul>${matches.map((entry) => `<li>${escapeHtml(entry.item)} <small>${sourceRef(evidence, entry.index)}</small></li>`).join('')}</ul>`;
  }

  function runTool() {
    const evidence = currentEvidence();
    const output = $('knowledgeToolOutput'); if (!output) return;
    if (activeTool === 'ask') {
      $('knowledgeQueryBox')?.classList.remove('hidden');
      output.innerHTML = 'اكتب سؤالك أو المفهوم، وسأعرض المواضع الموجودة في الحديث والشرائح مع المصدر.';
      return;
    }
    $('knowledgeQueryBox')?.classList.add('hidden');
    output.innerHTML = ({
      summary: renderSummary, mindmap: renderMindMap, quiz: renderQuiz,
      review: renderReview, report: renderReport
    })[activeTool]?.(evidence) || '';
  }

  function selectSource(button) {
    sourceKind = button.dataset.lectureSource;
    $$('#lectureSourceGrid button').forEach((item) => item.classList.toggle('active', item === button));
    $('recordedSourceInput')?.classList.toggle('hidden', !['recording', 'youtube'].includes(sourceKind));
    $('externalPlatformNotice')?.classList.toggle('hidden', sourceKind !== 'account_platform');
    if (sourceKind === 'saved') $('lectureLibrary')?.scrollIntoView({ behavior: 'smooth' });
    if (sourceKind === 'account_platform') toast('سجّل الدخول في نافذة المنصة الأصلية ثم شارك نافذة المحاضرة وصوت النظام');
  }

  function openSource() {
    const file = $('unifiedSourceFile')?.files?.[0];
    const url = $('unifiedSourceUrl')?.value.trim();
    if (sourceKind === 'recording' && file) {
      const preview = $('screenPreview');
      if (preview) {
        preview.srcObject = null; preview.src = URL.createObjectURL(file); preview.controls = true; preview.muted = false;
        $('presentationCapture')?.classList.remove('hidden'); $('captureEmpty')?.classList.add('hidden');
      }
      toast('تم فتح التسجيل في مساحة المحاضرة؛ شغّل أدوات التفريغ عند الحاجة.');
      return;
    }
    if (!url) return toast('ألصق رابطًا أو اختر ملفًا أولًا.');
    try { new URL(url); } catch (_error) { return toast('اكتب رابطًا صحيحًا يبدأ بـ http أو https.'); }
    window.open(url, '_blank', 'noopener');
    toast('فُتح المصدر الأصلي؛ يمكنك مشاركته من مساحة المحاضرة دون حفظ بيانات الدخول.');
  }

  function init() {
    $$('#lectureSourceGrid button').forEach((button) => button.addEventListener('click', () => selectSource(button)));
    $('chooseUnifiedFileBtn')?.addEventListener('click', () => $('unifiedSourceFile')?.click());
    $('openUnifiedSourceBtn')?.addEventListener('click', openSource);
    $$('.knowledge-tool-grid button').forEach((button) => button.addEventListener('click', () => {
      activeTool = button.dataset.knowledgeTool;
      $$('.knowledge-tool-grid button').forEach((item) => item.classList.toggle('active', item === button));
      runTool();
    }));
    $('knowledgeQueryBtn')?.addEventListener('click', () => {
      $('knowledgeToolOutput').innerHTML = searchEvidence(currentEvidence(), $('knowledgeQueryInput')?.value || '');
    });
    $('knowledgeQueryInput')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') $('knowledgeQueryBtn')?.click(); });
    if (location.hash === '#replay') {
      history.replaceState(null, '', '#live');
      setTimeout(() => $('lectureLibrary')?.scrollIntoView(), 200);
    }
  }

  window.SLCUnifiedLectureWorkspace = { currentEvidence, runTool };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
