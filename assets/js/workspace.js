/**
 * workspace.js — مساحة عمل المحاضرة الشخصية
 * يدعم YouTube والمصادر الخارجية والملفات المباشرة، ويحفظ الخلاصة المحلية.
 */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let currentWorkspaceRecord = null;
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  function toast(message) {
    const node = $('toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    setTimeout(() => node.classList.remove('show'), 2800);
  }

  function extractYouTubeId(url = '') {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([0-9A-Za-z_-]{11})/);
    return match?.[1] || null;
  }

  function setPlayer(url, sourceType = 'external', openMode = 'auto') {
    const frame = $('lessonFrame');
    const fallback = $('embedFallback');
    const badge = $('embedBadge');
    const outside = $('watchOutsideBtn');
    if (!frame || !fallback || !badge || !outside) return;

    frame.src = 'about:blank';
    outside.href = url || '#';
    fallback.querySelector('a').href = url || '#';
    const youtubeId = extractYouTubeId(url);
    const directInternal = ['youtube', 'video', 'audio', 'pdf'].includes(sourceType);
    const externalOnly = openMode === 'external';

    if (!url) {
      frame.style.display = 'none';
      fallback.classList.add('show');
      outside.classList.add('hidden');
      fallback.querySelector('a').classList.add('hidden');
      const heading = fallback.querySelector('h3');
      const note = fallback.querySelector('p');
      if (heading) heading.textContent = 'محاضرة معرفية بلا تسجيل فيديو';
      if (note) note.textContent = 'النص والشرائح والخلاصة محفوظة أدناه ويمكن البحث فيها ودراستها. الصوت يبقى محليًا على هذا الجهاز إذا احتفظت به.';
      badge.textContent = '● نص وشرائح محفوظة';
      badge.className = 'embed-badge supported';
      return;
    }

    outside.classList.remove('hidden');
    fallback.querySelector('a').classList.remove('hidden');
    if (externalOnly) {
      frame.style.display = 'none';
      fallback.classList.add('show');
      badge.textContent = '● يفتح في المصدر الأصلي';
      badge.className = 'embed-badge blocked';
      return;
    }

    frame.style.display = 'block';
    fallback.classList.remove('show');
    frame.src = youtubeId ? `https://www.youtube.com/embed/${youtubeId}?rel=0` : url;
    badge.textContent = directInternal ? '● عرض داخلي متاح' : '● تجربة العرض داخل المنصة';
    badge.className = directInternal ? 'embed-badge supported' : 'embed-badge';
  }

  function renderSummary(text, isSaved = true) {
    const placeholder = $('summaryPlaceholder');
    const result = $('summaryResult');
    if (!placeholder || !result) return;
    result.innerHTML = '';
    const note = document.createElement('p');
    note.className = 'muted-note';
    note.textContent = isSaved ? '✅ خلاصة محفوظة داخل محاضرتك' : 'الخلاصة';
    const body = document.createElement('div');
    body.className = 'saved-summary-text';
    body.textContent = text;
    const edit = document.createElement('button');
    edit.className = 'btn soft wide';
    edit.textContent = 'تعديل أو استبدال الخلاصة';
    edit.addEventListener('click', () => {
      if ($('transcriptInput')) $('transcriptInput').focus();
      placeholder.classList.remove('hidden');
      result.classList.add('hidden');
    });
    const remove = document.createElement('button');
    remove.className = 'btn ghost wide';
    remove.style.marginTop = '8px';
    remove.textContent = 'حذف الخلاصة وإعادة التلخيص';
    remove.addEventListener('click', deleteCurrentSummary);
    result.append(note, body, edit, remove);
    placeholder.classList.add('hidden');
    result.classList.remove('hidden');
  }

  async function getCurrentRecord() {
    if (!window.slcDB) return null;
    const lectureId = localStorage.getItem('slc_current_lecture_id');
    if (lectureId) {
      const { data } = await window.slcDB.from('slc_lectures')
        .select('id,course_id,title,source_url,source_type,open_mode,module_name,lecture_order,duration_minutes,status,notes,transcript_text,live_payload,last_position_seconds,slc_courses(title,provider_name)')
        .eq('id', lectureId).maybeSingle();
      if (data) return { kind: 'lecture', ...data };
    }
    const courseId = localStorage.getItem('slc_current_course_id');
    if (!courseId) return null;
    const { data } = await window.slcDB.from('slc_courses')
      .select('id,title,provider_name,course_url').eq('id', courseId).maybeSingle();
    return data ? { kind: 'course', ...data } : null;
  }

  async function loadWorkspace() {
    const title = $('workspaceTitle');
    const meta = $('workspaceMeta');
    if (!title || !window.slcDB) return;
    title.textContent = 'جاري تحميل المحاضرة...';
    const record = await getCurrentRecord();
    currentWorkspaceRecord = record;
    if (!record) {
      title.textContent = 'لم تُحدَّد محاضرة بعد';
      meta.textContent = 'اذهب إلى «بوابة المحاضرات» واختر المحاضرة المطلوبة.';
      return;
    }

    const isLecture = record.kind === 'lecture';
    $('editCurrentLectureBtn')?.classList.toggle('hidden', !isLecture);
    $('deleteCurrentLectureBtn')?.classList.toggle('hidden', !isLecture);
    const url = isLecture ? record.source_url : record.course_url;
    const provider = isLecture ? record.slc_courses?.provider_name : record.provider_name;
    title.textContent = record.title || 'بدون عنوان';
    meta.textContent = [provider, record.module_name, record.duration_minutes ? `${record.duration_minutes} دقيقة` : null]
      .filter(Boolean).join(' · ') || url || 'مصدر محفوظ';
    setPlayer(url, isLecture ? record.source_type : (extractYouTubeId(url) ? 'youtube' : 'external'), record.open_mode || 'auto');
    $('lastPoint').textContent = formatSeconds(record.last_position_seconds || 0);

    const summaryQuery = window.slcDB.from('slc_summaries').select('summary_html');
    const { data: summary } = isLecture
      ? await summaryQuery.eq('lecture_id', record.id).maybeSingle()
      : await summaryQuery.eq('course_id', record.id).is('lecture_id', null).maybeSingle();
    if (summary?.summary_html) renderSummary(summary.summary_html);
    else {
      $('summaryPlaceholder')?.classList.remove('hidden');
      $('summaryResult')?.classList.add('hidden');
    }
    if ($('lessonNotes')) $('lessonNotes').value = record.notes || '';
    const savedTranscript = record.transcript_text || record.live_payload?.transcript || record.live_payload?.interaction_assistant?.transcript || '';
    if ($('transcriptInput')) $('transcriptInput').value = savedTranscript;
  }

  function formatSeconds(value) {
    const total = Number(value || 0);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  async function saveSummaryText(text, transcript = '') {
    text = String(text || '').trim();
    if (!text) return toast('لا توجد خلاصة لحفظها.');
    const record = await getCurrentRecord();
    const { data: { user } } = await window.slcDB.auth.getUser();
    if (!record || !user) return toast('سجّل الدخول واختر محاضرة أولاً.');
    const payload = {
      owner_id: user.id,
      course_id: record.kind === 'lecture' ? record.course_id : record.id,
      lecture_id: record.kind === 'lecture' ? record.id : null,
      summary_key: record.kind === 'lecture' ? `lecture:${record.id}` : `course:${record.id}`,
      summary_html: text,
      updated_at: new Date().toISOString()
    };
    const { error } = await window.slcDB.from('slc_summaries').upsert(payload, { onConflict: 'summary_key' });
    if (error) return toast(`تعذر حفظ الخلاصة: ${error.message}`);
    if (transcript && record.kind === 'lecture') {
      await window.slcDB.from('slc_lectures').update({ transcript_text: transcript, updated_at: new Date().toISOString() }).eq('id', record.id);
    }
    renderSummary(text);
    toast('تم حفظ الخلاصة داخل المحاضرة');
  }

  async function deleteCurrentSummary() {
    if (!confirm('هل تريد حذف الخلاصة الحالية؟ سيبقى نص المحاضرة محفوظًا لإعادة التلخيص.')) return;
    const record = await getCurrentRecord();
    if (!record || !window.slcDB) return toast('تعذر تحديد المحاضرة.');
    let query = window.slcDB.from('slc_summaries').delete();
    query = record.kind === 'lecture' ? query.eq('lecture_id', record.id) : query.eq('course_id', record.id).is('lecture_id', null);
    const { error } = await query;
    if (error) return toast(`تعذر حذف الخلاصة: ${error.message}`);
    $('summaryPlaceholder')?.classList.remove('hidden');
    $('summaryResult')?.classList.add('hidden');
    toast('تم حذف الخلاصة. يمكنك إنشاء خلاصة جديدة الآن.');
  }

  async function runGlobalSearch(query) {
    const box = $('searchResults');
    if (!box || !window.slcDB) return;
    const term = query.trim();
    if (term.length < 2) return box.classList.add('hidden');
    const pattern = `%${term}%`;
    const [coursesResult, lecturesResult, summariesResult] = await Promise.all([
      window.slcDB.from('slc_courses').select('id,title,provider_name').or(`title.ilike.${pattern},provider_name.ilike.${pattern}`).limit(6),
      window.slcDB.from('slc_lectures').select('id,course_id,title,module_name,notes,transcript_text,slc_courses(title,provider_name)').or(`title.ilike.${pattern},module_name.ilike.${pattern},notes.ilike.${pattern},transcript_text.ilike.${pattern}`).limit(8),
      window.slcDB.from('slc_summaries').select('lecture_id,course_id,summary_html').ilike('summary_html', pattern).limit(6)
    ]);
    const items = [];
    (coursesResult.data || []).forEach((course) => items.push({ type: 'course', id: course.id, title: course.title, meta: course.provider_name || 'كورس', icon: '🎓' }));
    (lecturesResult.data || []).forEach((lecture) => items.push({ type: 'lecture', id: lecture.id, courseId: lecture.course_id, title: lecture.title, meta: `${lecture.slc_courses?.provider_name || 'محاضرة'} · ${lecture.module_name || lecture.slc_courses?.title || ''}`, icon: '▶' }));
    (summariesResult.data || []).forEach((summary) => items.push({ type: summary.lecture_id ? 'lecture' : 'course', id: summary.lecture_id || summary.course_id, courseId: summary.course_id, title: 'نتيجة من داخل خلاصة محفوظة', meta: summary.summary_html.slice(0, 110), icon: '📝' }));
    const unique = [...new Map(items.map((item) => [`${item.type}-${item.id}`, item])).values()].slice(0, 12);
    box.innerHTML = unique.length ? unique.map((item) => `<button class="search-result-item" data-result-type="${item.type}" data-result-id="${item.id}" data-course-id="${item.courseId || item.id}"><h4>${item.icon} ${escapeHtml(item.title)}</h4><p>${escapeHtml(item.meta)}</p></button>`).join('') : '<div class="search-empty">لا نتائج مطابقة داخل محاضراتك</div>';
    box.classList.remove('hidden');
    box.querySelectorAll('.search-result-item').forEach((button) => button.addEventListener('click', () => {
      localStorage.setItem('slc_current_course_id', button.dataset.courseId);
      if (button.dataset.resultType === 'lecture') localStorage.setItem('slc_current_lecture_id', button.dataset.resultId);
      else localStorage.removeItem('slc_current_lecture_id');
      box.classList.add('hidden');
      window.SLCNavigation?.showView('workspace');
    }));
  }

  window.addEventListener('hashchange',()=>{if(location.hash==='#workspace')loadWorkspace();});
  $('editCurrentLectureBtn')?.addEventListener('click',()=>{if(currentWorkspaceRecord?.kind==='lecture')window.slcLecturePortal?.openEditLecture(currentWorkspaceRecord.id);});
  $('deleteCurrentLectureBtn')?.addEventListener('click',async()=>{if(currentWorkspaceRecord?.kind!=='lecture')return;const ok=await window.slcLecturePortal?.deleteById(currentWorkspaceRecord.id);if(ok){localStorage.removeItem('slc_current_lecture_id');window.SLCNavigation?.showView('live');setTimeout(()=>$('lectureLibrary')?.scrollIntoView({behavior:'smooth'}),180);}});
  $('backToUnifiedLectureBtn')?.addEventListener('click',()=>{window.SLCNavigation?.showView('live');setTimeout(()=>$('lectureLibrary')?.scrollIntoView({behavior:'smooth'}),180);});
  $('openKnowledgeToolsBtn')?.addEventListener('click',()=>{window.SLCNavigation?.showView('live');setTimeout(()=>$('lectureKnowledgeTools')?.scrollIntoView({behavior:'smooth'}),180);});
  let debounce;
  $('globalSearch')?.addEventListener('input', (event) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => runGlobalSearch(event.target.value), 320);
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.search-wrap')) $('searchResults')?.classList.add('hidden');
  });
  if (location.hash === '#workspace') window.addEventListener('load', loadWorkspace);
  window.slcWorkspace = { getCurrentRecord, renderSummary, saveSummaryText, deleteCurrentSummary, toast };
})();
