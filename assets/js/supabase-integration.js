(() => {
  'use strict';

  const SUPABASE_URL = 'https://nmbbahzzogspuuvpsxud.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tYmJhaHp6b2dzcHV1dnBzeHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MTY1MTYsImV4cCI6MjA5MzA5MjUxNn0.6yZNxZ_2ONQ-wyQSJtdvYpdJAxZfB-7C00ezEepUiqY';

  if (!window.supabase?.createClient) {
    console.error('Supabase client library was not loaded.');
    return;
  }

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.slcDB = db; // إتاحة العميل لملفات أخرى مثل workspace.js دون تكرار مفاتيح الاتصال

  const $ = (selector) => document.querySelector(selector);
  let currentUser = null;
  let selectedSourceType = 'youtube';
  const authMode = 'signin'; // المنصة شخصية: لا يوجد إنشاء حسابات من الواجهة

  const modalOpen = (el) => {
    if (!el) return;
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
  };
  const modalClose = (el) => {
    if (!el) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
  };
  const notify = (message) => {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 2600);
  };
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  function displayNameOf(user) {
    if (!user) return null;
    return 'عبدالرحمن';
  }

  function updateAuthUI() {
    const status = $('#authStatusBtn');
    const avatar = $('#userAvatar');
    const greeting = $('#dashboardGreeting');
    if (greeting) {
      const name = displayNameOf(currentUser);
      greeting.textContent = name ? `صباح الخير، ${name}` : 'صباح الخير';
    }
    if (!status) return;
    if (currentUser) {
      const email = currentUser.email || 'مستخدم';
      status.textContent = `متصل: ${email.split('@')[0]}`;
      status.classList.add('signed-in');
      status.title = 'اضغط لتسجيل الخروج';
      if (avatar) avatar.textContent = (displayNameOf(currentUser) || email).charAt(0).toUpperCase();
    } else {
      status.textContent = 'تسجيل الدخول';
      status.classList.remove('signed-in');
      status.title = 'تسجيل الدخول أو إنشاء حساب';
      if (avatar) avatar.textContent = 'ع';
    }
  }

  async function ensureAuthenticated() {
    if (currentUser) return true;
    modalOpen($('#authModal'));
    notify('سجّل الدخول أولًا لحفظ بياناتك');
    return false;
  }

  async function loadCourses() {
    const container = $('#courseCards');
    if (!container) return;
    if (!currentUser) {
      container.innerHTML = '<div class="empty-state"><h3>سجّل الدخول لعرض مكتبة كورساتك</h3><p>كل مستخدم يرى بياناته الخاصة فقط.</p></div>';
      return;
    }
    container.innerHTML = '<div class="loading-card">جاري تحميل الكورسات من Supabase...</div>';
    const { data, error } = await db
      .from('slc_courses')
      .select('id,title,provider_name,instructor_name,course_url,status,priority,progress_percent,created_at')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      container.innerHTML = `<div class="empty-state">تعذر تحميل الكورسات: ${escapeHtml(error.message)}</div>`;
      return;
    }
    if (!data?.length) {
      container.innerHTML = '<div class="empty-state"><h3>لا توجد كورسات بعد</h3><p>اضغط «إضافة كورس» وابدأ بإدخال أول دورة.</p></div>';
      return;
    }
    const statusLabel = { planned: 'مخطط', active: 'قيد التعلّم', paused: 'متوقف', completed: 'مكتمل', archived: 'مؤرشف' };
    container.innerHTML = data.map((course, index) => {
      const color = ['green', 'purple', 'blue', 'orange'][index % 4];
      const progress = Number(course.progress_percent || 0);
      return `<article class="content-card" data-course-id="${course.id}">
        <div class="content-cover ${color}"><span>${escapeHtml(course.provider_name || 'كورس')}</span><b>${progress}%</b></div>
        <div class="content-body"><h3>${escapeHtml(course.title)}</h3>
          <p>${escapeHtml(course.instructor_name || statusLabel[course.status] || 'قيد التنظيم')}</p>
          <div class="progress"><i style="width:${Math.min(100, Math.max(0, progress))}%"></i></div>
          <div class="card-meta"><span class="db-indicator">محفوظ في Supabase</span><div><button class="text-btn course-open">فتح</button> <button class="course-delete">حذف</button></div></div>
        </div></article>`;
    }).join('');

    container.querySelectorAll('.course-open').forEach((button) => button.addEventListener('click', () => {
      const card = button.closest('[data-course-id]');
      localStorage.setItem('slc_current_course_id', card.dataset.courseId);
      localStorage.removeItem('slc_current_lecture_id');
      if (window.slcCourseSeries) window.slcCourseSeries.open(card.dataset.courseId);
      else document.querySelector('[data-view="workspace"]')?.click();
    }));
    container.querySelectorAll('.course-delete').forEach((button) => button.addEventListener('click', async () => {
      const card = button.closest('[data-course-id]');
      if (!confirm('هل تريد حذف هذا الكورس؟ سيتم حذف المحاضرات التابعة له لاحقًا عند إضافتها.')) return;
      const { error } = await db.from('slc_courses').delete().eq('id', card.dataset.courseId);
      if (error) return notify(`تعذر الحذف: ${error.message}`);
      notify('تم حذف الكورس');
      await loadCourses();
    }));
  }

  async function loadInbox() {
    const board = $('#inboxBoard');
    if (!board || !currentUser) return;
    const { data, error } = await db
      .from('slc_sources')
      .select('id,title,source_type,platform_name,transcript_status,created_at,original_url')
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) {
      console.error(error);
      return;
    }
    const groups = { 'بانتظار المعالجة': [], 'قيد التحليل': [], 'جاهز للمراجعة': [] };
    (data || []).forEach((source) => {
      const item = [source.source_type.toUpperCase().slice(0, 4), source.title || source.original_url || 'مصدر دون عنوان'];
      if (['processing', 'queued'].includes(source.transcript_status)) groups['قيد التحليل'].push(item);
      else if (source.transcript_status === 'available') groups['جاهز للمراجعة'].push(item);
      else groups['بانتظار المعالجة'].push(item);
    });
    board.innerHTML = Object.entries(groups).map(([name, items]) => `<section class="board-col"><h3>${name} <span class="badge">${items.length}</span></h3>${items.length ? items.map((item) => `<article class="board-item"><span class="tag blue">${escapeHtml(item[0])}</span><h4>${escapeHtml(item[1])}</h4><p>محفوظ في قاعدة البيانات</p></article>`).join('') : '<article class="board-item"><p>لا توجد عناصر في هذه المرحلة.</p></article>'}</section>`).join('');
  }

  async function saveCourse() {
    if (!(await ensureAuthenticated())) return;
    const title = $('#courseTitleInput')?.value.trim();
    if (!title) return notify('اكتب اسم الكورس أولًا');
    const button = $('#saveCourseBtn');
    button.disabled = true;
    button.textContent = 'جاري الحفظ...';
    const payload = {
      owner_id: currentUser.id,
      title,
      provider_name: $('#courseProviderInput')?.value.trim() || null,
      instructor_name: $('#courseInstructorInput')?.value.trim() || null,
      course_url: $('#courseUrlInput')?.value.trim() || null,
      source_platform: $('#courseProviderInput')?.value.trim() || null,
      status: $('#courseStatusInput')?.value || 'active',
      priority: Number($('#coursePriorityInput')?.value || 3)
    };
    const { error } = await db.from('slc_courses').insert(payload);
    button.disabled = false;
    button.textContent = 'حفظ الكورس';
    if (error) return notify(`تعذر حفظ الكورس: ${error.message}`);
    ['#courseTitleInput', '#courseProviderInput', '#courseInstructorInput', '#courseUrlInput'].forEach((id) => { if ($(id)) $(id).value = ''; });
    modalClose($('#courseModal'));
    notify('تم حفظ الكورس في Supabase');
    await loadCourses();
  }

  async function saveSource() {
    if (!(await ensureAuthenticated())) return;
    const title = $('#sourceTitleInput')?.value.trim();
    const url = $('#sourceUrlInput')?.value.trim();
    if (!title && !url) return notify('اكتب عنوانًا أو ألصق رابطًا');
    const button = $('#saveSourceBtn');
    button.disabled = true;
    button.textContent = 'جاري الحفظ...';
    const payload = {
      owner_id: currentUser.id,
      source_type: selectedSourceType,
      title: title || url,
      original_url: url || null,
      platform_name: selectedSourceType,
      embed_status: 'unknown',
      transcript_status: 'not_requested'
    };
    const { error } = await db.from('slc_sources').insert(payload);
    button.disabled = false;
    button.textContent = 'إضافة إلى صندوق المعرفة';
    if (error) return notify(`تعذر حفظ المصدر: ${error.message}`);
    $('#sourceTitleInput').value = '';
    $('#sourceUrlInput').value = '';
    modalClose($('#addModal'));
    notify('تم حفظ المصدر في صندوق المعرفة');
    await loadInbox();
  }

  async function submitAuth() {
    const email = $('#authEmailInput')?.value.trim();
    const password = $('#authPasswordInput')?.value || '';
    const message = $('#authMessage');
    if (!email || password.length < 6) {
      message.className = 'auth-message error';
      message.textContent = 'أدخل بريدًا صحيحًا وكلمة مرور من 6 أحرف على الأقل.';
      return;
    }
    const button = $('#authSubmitBtn');
    button.disabled = true;
    button.textContent = 'يرجى الانتظار...';
    const result = await db.auth.signInWithPassword({ email, password });
    button.disabled = false;
    button.textContent = 'تسجيل الدخول';
    if (result.error) {
      message.className = 'auth-message error';
      message.textContent = result.error.message;
      return;
    }
    modalClose($('#authModal'));
    notify('تم تسجيل الدخول بنجاح');
  }

  $('#authStatusBtn')?.addEventListener('click', async () => {
    if (currentUser) {
      if (!confirm('هل تريد تسجيل الخروج؟')) return;
      await db.auth.signOut();
      notify('تم تسجيل الخروج');
    } else {
      modalOpen($('#authModal'));
    }
  });
  $('#closeAuthModal')?.addEventListener('click', () => modalClose($('#authModal')));
  $('#authSubmitBtn')?.addEventListener('click', submitAuth);
  $('#authPasswordInput')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') submitAuth(); });

  $('#addCourseBtn')?.addEventListener('click', async () => { if (await ensureAuthenticated()) modalOpen($('#courseModal')); });
  $('#closeCourseModal')?.addEventListener('click', () => modalClose($('#courseModal')));
  $('#saveCourseBtn')?.addEventListener('click', saveCourse);
  $('#saveSourceBtn')?.addEventListener('click', saveSource);

  document.querySelectorAll('#sourceTypeGrid [data-source]').forEach((button) => button.addEventListener('click', () => {
    selectedSourceType = button.dataset.source;
    document.querySelectorAll('#sourceTypeGrid [data-source]').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
  }));

  db.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();
    await Promise.all([loadCourses(), loadInbox()]);
  });

  (async () => {
    const { data } = await db.auth.getSession();
    currentUser = data.session?.user || null;
    updateAuthUI();
    await Promise.all([loadCourses(), loadInbox()]);
    if (!currentUser) modalOpen($('#authModal'));
  })();
})();
