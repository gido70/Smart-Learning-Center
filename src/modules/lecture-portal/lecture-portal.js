/** بوابة المحاضرات الشخصية — تخزين Supabase مع فصل البيانات بحساب المالك. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  let lectures = [];
  let activeFilter = 'all';

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
  const toast = (message) => {
    const node = $('toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    setTimeout(() => node.classList.remove('show'), 2600);
  };
  const openModal = () => { $('lectureModal')?.classList.add('open'); $('lectureModal')?.setAttribute('aria-hidden', 'false'); };
  const closeModal = () => { $('lectureModal')?.classList.remove('open'); $('lectureModal')?.setAttribute('aria-hidden', 'true'); };

  async function currentUser() {
    if (!window.slcDB) return null;
    const { data } = await window.slcDB.auth.getUser();
    return data.user;
  }

  async function loadCourseOptions() {
    if (!window.slcDB || !await currentUser()) return;
    const { data, error } = await window.slcDB.from('slc_courses')
      .select('id,title,provider_name').order('created_at', { ascending: false });
    const select = $('lectureCourseInput');
    if (!select) return;
    if (error) {
      select.innerHTML = '<option value="">تعذر تحميل الكورسات</option>';
      return;
    }
    select.innerHTML = '<option value="">اختر الكورس</option>' + (data || []).map((course) =>
      `<option value="${course.id}">${escapeHtml(course.provider_name ? `${course.provider_name} — ${course.title}` : course.title)}</option>`
    ).join('');
  }

  function platformName(lecture) {
    return lecture.slc_courses?.provider_name || ({ youtube: 'YouTube', video: 'فيديو', audio: 'صوت', pdf: 'PDF' }[lecture.source_type]) || 'منصة خارجية';
  }

  function renderFilters() {
    const box = $('lecturePlatformFilters');
    if (!box) return;
    const platforms = [...new Set(lectures.map(platformName).filter(Boolean))];
    box.innerHTML = `<button class="${activeFilter === 'all' ? 'active' : ''}" data-platform-filter="all">كل المنصات</button>` + platforms.map((platform) =>
      `<button class="${activeFilter === platform ? 'active' : ''}" data-platform-filter="${escapeHtml(platform)}">${escapeHtml(platform)}</button>`
    ).join('');
    box.querySelectorAll('[data-platform-filter]').forEach((button) => button.addEventListener('click', () => {
      activeFilter = button.dataset.platformFilter;
      renderFilters();
      renderLectures();
    }));
  }

  function statusLabel(status) {
    return ({ not_started: 'لم أبدأ', watching: 'قيد المشاهدة', completed: 'شاهدتها', summarized: 'لُخّصت', review: 'تحتاج مراجعة' })[status] || 'لم أبدأ';
  }

  function renderLectures() {
    const box = $('replayCards');
    if (!box) return;
    const shown = activeFilter === 'all' ? lectures : lectures.filter((item) => platformName(item) === activeFilter);
    if (!shown.length) {
      box.innerHTML = '<article class="panel lecture-empty"><h3>لا توجد محاضرات في هذا القسم</h3><p>أضف أول محاضرة واربطها بكورس موجود.</p><button class="btn primary" id="emptyAddLectureBtn">＋ إضافة محاضرة</button></article>';
      $('emptyAddLectureBtn')?.addEventListener('click', openLectureModal);
      return;
    }
    box.innerHTML = shown.map((lecture, index) => {
      const color = ['green', 'purple', 'blue', 'orange'][index % 4];
      const moduleInfo = [lecture.module_name, lecture.lecture_order ? `المحاضرة ${lecture.lecture_order}` : null].filter(Boolean).join(' · ');
      return `<article class="content-card lecture-card" data-lecture-id="${lecture.id}" data-course-id="${lecture.course_id}">
        <div class="content-cover ${color}"><span class="tag">${escapeHtml(platformName(lecture))}</span><b>${lecture.duration_minutes ? `${lecture.duration_minutes} دقيقة` : statusLabel(lecture.status)}</b></div>
        <div class="content-body"><small>${escapeHtml(lecture.slc_courses?.title || 'كورس غير محدد')}</small><h3>${escapeHtml(lecture.title)}</h3><p>${escapeHtml(moduleInfo || lecture.notes || 'محاضرة محفوظة في بوابتك')}</p>
          <div class="card-meta"><span>${escapeHtml(statusLabel(lecture.status))}</span><div><button class="text-btn lecture-open">فتح</button> <button class="course-delete lecture-delete">حذف</button></div></div>
        </div></article>`;
    }).join('');
    box.querySelectorAll('.lecture-open').forEach((button) => button.addEventListener('click', () => openLecture(button.closest('.lecture-card'))));
    box.querySelectorAll('.lecture-delete').forEach((button) => button.addEventListener('click', () => deleteLecture(button.closest('.lecture-card'))));
  }

  async function loadLectures() {
    const box = $('replayCards');
    if (!box || !window.slcDB) return;
    if (!await currentUser()) {
      box.innerHTML = '<article class="panel"><h3>سجّل الدخول لعرض محاضراتك</h3></article>';
      return;
    }
    box.innerHTML = '<article class="panel">جاري تحميل بوابة المحاضرات...</article>';
    const { data, error } = await window.slcDB.from('slc_lectures')
      .select('id,course_id,title,source_url,source_type,open_mode,module_name,lecture_order,duration_minutes,status,notes,created_at,slc_courses(title,provider_name)')
      .order('lecture_order', { ascending: true }).order('created_at', { ascending: false });
    if (error) {
      box.innerHTML = `<article class="panel lecture-db-notice"><h3>يلزم تفعيل جدول المحاضرات مرة واحدة</h3><p>${escapeHtml(error.message)}</p><small>شغّل ملف SQL المرفق في Supabase ثم حدّث الصفحة.</small></article>`;
      return;
    }
    lectures = data || [];
    renderFilters();
    renderLectures();
  }

  function openLecture(card) {
    localStorage.setItem('slc_current_lecture_id', card.dataset.lectureId);
    localStorage.setItem('slc_current_course_id', card.dataset.courseId);
    document.querySelector('[data-view="workspace"]')?.click();
  }

  async function saveLecture() {
    const user = await currentUser();
    if (!user) return toast('سجّل الدخول أولاً.');
    const courseId = $('lectureCourseInput')?.value;
    const title = $('lectureTitleInput')?.value.trim();
    const sourceUrl = $('lectureUrlInput')?.value.trim();
    if (!courseId || !title || !sourceUrl) return toast('اختر الكورس واكتب عنوان المحاضرة ورابطها.');
    try { new URL(sourceUrl); } catch (_error) { return toast('اكتب رابطًا صحيحًا يبدأ بـ http أو https.'); }
    const button = $('saveLectureBtn');
    button.disabled = true;
    button.textContent = 'جاري الحفظ...';
    const { error } = await window.slcDB.from('slc_lectures').insert({
      owner_id: user.id,
      course_id: courseId,
      title,
      source_url: sourceUrl,
      source_type: $('lectureSourceTypeInput')?.value || 'external',
      open_mode: $('lectureOpenModeInput')?.value || 'auto',
      module_name: $('lectureModuleInput')?.value.trim() || null,
      lecture_order: Number($('lectureOrderInput')?.value || 0) || null,
      duration_minutes: Number($('lectureDurationInput')?.value || 0) || null,
      notes: $('lectureNotesInput')?.value.trim() || null,
      status: 'not_started'
    });
    button.disabled = false;
    button.textContent = 'حفظ المحاضرة';
    if (error) return toast(`تعذر الحفظ: ${error.message}`);
    ['lectureTitleInput', 'lectureUrlInput', 'lectureModuleInput', 'lectureOrderInput', 'lectureDurationInput', 'lectureNotesInput'].forEach((id) => { if ($(id)) $(id).value = ''; });
    closeModal();
    toast('تم حفظ المحاضرة في بوابتك');
    await loadLectures();
  }

  async function deleteLecture(card) {
    if (!confirm('هل تريد حذف هذه المحاضرة من بوابتك؟')) return;
    const { error } = await window.slcDB.from('slc_lectures').delete().eq('id', card.dataset.lectureId);
    if (error) return toast(`تعذر الحذف: ${error.message}`);
    toast('تم حذف المحاضرة');
    await loadLectures();
  }

  async function openLectureModal() {
    if (!await currentUser()) return toast('سجّل الدخول أولاً.');
    await loadCourseOptions();
    openModal();
  }

  $('addLectureBtn')?.addEventListener('click', openLectureModal);
  $('closeLectureModal')?.addEventListener('click', closeModal);
  $('lectureModal')?.addEventListener('click', (event) => { if (event.target === $('lectureModal')) closeModal(); });
  $('saveLectureBtn')?.addEventListener('click', saveLecture);
  document.querySelector('[data-view="replay"]')?.addEventListener('click', loadLectures);
  window.slcDB?.auth.onAuthStateChange(() => loadLectures());
  if (location.hash === '#replay') window.addEventListener('load', loadLectures);
})();
