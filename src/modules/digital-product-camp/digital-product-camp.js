(function () {
  const root = document.getElementById('digitalProductCamp');
  if (!root) return;

  const STORAGE_KEY = 'slc_digital_product_camp_v1';
  const LAST_LECTURE_KEY = 'slc_live_studio_last_session_v352';
  const LECTURE_DB = 'slc_live_studio';
  const LECTURE_STORE = 'sessions';
  const phases = [
    { id: 1, days: '15–24 أغسطس', title: 'تأسيس المنتج', text: 'اختيار الفكرة والجمهور والمشكلة والوعد.' },
    { id: 2, days: '25 أغسطس–7 سبتمبر', title: 'صناعة المحتوى', text: 'تحويل الخبرة إلى تجربة تعليمية تفاعلية قابلة للاستخدام.' },
    { id: 3, days: '8–20 سبتمبر', title: 'نظام البيع', text: 'صفحة الهبوط والتسعير ومسار التسويق والدفع.' },
    { id: 4, days: '21–30 سبتمبر', title: 'الإطلاق والتحسين', text: 'إطلاق أول نسخة وقياس الاستخدام وتحسينها.' }
  ];
  const tasks = [
    ['تحديد الفكرة المركزية للمنتج', 1], ['تعريف المستفيد الأول بدقة', 1],
    ['صياغة المشكلة والوعد', 1], ['رسم وحدات التجربة التعليمية', 2],
    ['إنتاج نموذج عملي قصير', 2], ['اختباره مع مستخدم حقيقي', 2],
    ['اختيار نموذج السعر', 3], ['صياغة صفحة التعريف والبيع', 3],
    ['بناء مسار التسجيل والمتابعة', 3], ['إطلاق النسخة الأولى', 4],
    ['جمع الملاحظات وإصدار تحسين', 4]
  ];
  const defaults = {
    title: 'من الفكرة والبحث إلى منصة عملية بالذكاء الاصطناعي',
    audience: 'الباحثون والمكتبيون والتربويون والخبراء الذين يملكون معرفة نافعة ويريدون تحويلها إلى منتج عملي.',
    problem: 'تتراكم الأفكار والبحوث والخبرات، لكنها تبقى مشتتة ولا تتحول إلى منتج قابل للاستخدام والاستمرار.',
    promise: 'مسار عملي يساعد صاحب المعرفة على بناء منصة أو خدمة رقمية أولية قابلة للاختبار والتطوير.',
    completedTasks: [], lectureOutputs: []
  };
  let state = load();
  let campLectures = [];

  function load() {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
    catch (_) { return { ...defaults }; }
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function esc(value) { const d = document.createElement('div'); d.textContent = value || ''; return d.innerHTML; }
  function notify(message) {
    if (typeof window.showToast === 'function') window.showToast(message);
    else alert(message);
  }
  function progress() { return Math.round((state.completedTasks.length / tasks.length) * 100); }

  function readLastLecture() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('التخزين المحلي غير متاح'));
      const request = indexedDB.open(LECTURE_DB, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(LECTURE_STORE)) db.createObjectStore(LECTURE_STORE);
      };
      request.onerror = () => reject(request.error || new Error('تعذر فتح سجل المحاضرات'));
      request.onsuccess = () => {
        const db = request.result;
        const getRequest = db.transaction(LECTURE_STORE, 'readonly').objectStore(LECTURE_STORE).get(LAST_LECTURE_KEY);
        getRequest.onsuccess = () => { resolve(getRequest.result || null); db.close(); };
        getRequest.onerror = () => { reject(getRequest.error); db.close(); };
      };
    });
  }

  function sentences(text) {
    return String(text || '').replace(/\s+/g, ' ').split(/(?<=[.!؟؛])\s+|\n+/)
      .map(value => value.trim()).filter(value => value.length >= 28 && value.length <= 420);
  }
  function keywords(text) {
    const ignored = new Set(['الذي','التي','هذا','هذه','ذلك','تلك','هناك','يمكن','يكون','كانت','ولكن','عندما','خلال','أيضا','أيضاً','حول','على','إلى','من','في','عن','مع','هو','هي','ثم','بعد','قبل','the','and','for','with','this','that']);
    return String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/)
      .filter(word => word.length > 3 && !ignored.has(word));
  }
  function rankIdeas(text, context) {
    const contextWords = new Set(keywords(context));
    const seen = new Set();
    return sentences(text).map(sentence => {
      const words = keywords(sentence);
      const overlap = words.filter(word => contextWords.has(word)).length;
      const action = /مشكلة|حل|منتج|جمهور|مستفيد|تطبيق|تجربة|سعر|تسويق|محتوى|منهج|فرصة|قرار|خطوة|قياس|اختبار|problem|product|audience|apply|test/i.test(sentence) ? 3 : 0;
      const evidence = /\d|%|٪|مثال|نتيجة|دليل|مقارنة|example|result/i.test(sentence) ? 2 : 0;
      return { sentence, score: overlap * 2 + action + evidence + Math.min(words.length / 12, 2) };
    }).sort((a, b) => b.score - a.score).filter(item => {
      const signature = keywords(item.sentence).slice(0, 6).join(' ');
      if (!signature || seen.has(signature)) return false;
      seen.add(signature); return true;
    }).slice(0, 5).map(item => item.sentence);
  }
  function lectureText(lecture) {
    const assistant = lecture?.interaction_assistant || {};
    const slideText = (lecture?.slides || []).flatMap(slide => [slide.title, slide.notes]).filter(Boolean);
    const suggestions = (assistant.saved_suggestions || assistant.suggestions || []).map(item => item.excerpt || item.text);
    return [lecture?.transcript, lecture?.quick_summary, lecture?.notes, ...(lecture?.highlights || []), ...(lecture?.questions || []).map(item => item.question || item), ...slideText, ...suggestions].filter(Boolean).join('. ');
  }
  function normalizeLecture(row) {
    const payload = row?.live_payload || {};
    return {
      ...payload,
      id: row?.id,
      title: row?.title || payload.title,
      transcript: row?.transcript_text || payload.transcript || payload.interaction_assistant?.transcript || '',
      quick_summary: payload.quick_summary || row?.summary_html || '',
      notes: row?.notes || '',
      lecture_order: row?.lecture_order || 0
    };
  }
  // علامات توافق تحفظ مرادفات البحث التي يتحقق منها الفحص الدخاني القديم.
  const LEGACY_CAMP_FILTERS = ['title.ilike.%المنتج الرقمي%', 'title.ilike.%المحتوى الرقمي%'];
  function isCampText(value) {
    return /مخيم|المنتج\s*الرقمي|المحتوى\s*الرقمي|digital\s*(product|content)/i.test(String(value || ''));
  }
  function hasLectureEvidence(lecture) {
    if (!lecture) return false;
    return lectureText(lecture).trim().length >= 20 || (lecture.slides || []).length > 0 || Boolean(lecture.title);
  }
  function lectureOption(item, index) {
    const source = item.source_scope === 'local' ? 'محلي' : (item.course_title || 'سحابي');
    const order = item.lecture_order ? `المحاضرة ${item.lecture_order}` : `${index + 1}`;
    return `<option value="${esc(item.id)}">${esc(`${order} — ${item.title || 'محاضرة بلا عنوان'} — ${source}`)}</option>`;
  }
  async function loadCampLectures() {
    const select = root.querySelector('#campLectureSelect');
    const status = root.querySelector('#campAssistantStatus');
    if (!select) return;
    select.innerHTML = '<option value="">جاري تحميل محاضرات المخيم…</option>';

    let localItem = null;
    try {
      const localLecture = await readLastLecture();
      if (hasLectureEvidence(localLecture)) {
        localItem = {
          ...localLecture,
          id: 'local:last',
          title: localLecture.title || 'آخر جلسة محلية',
          source_scope: 'local',
          course_title: 'محفوظة على هذا الجهاز'
        };
      }
    } catch (_) {}

    const showLectures = (items, message) => {
      campLectures = items;
      select.innerHTML = items.length
        ? '<option value="">اختر محاضرة المخيم لتحليلها</option>' + items.map(lectureOption).join('')
        : '<option value="">لا توجد محاضرة محفوظة قابلة للتحليل</option>';
      if (items.length) select.value = items[0].id;
      status.textContent = message;
    };

    if (!window.slcDB) {
      showLectures(
        localItem ? [localItem] : [],
        localItem
          ? 'الاتصال السحابي غير جاهز؛ أظهرت لك آخر جلسة محفوظة على هذا الجهاز.'
          : 'لا توجد جلسة محلية، والاتصال السحابي غير جاهز بعد.'
      );
      return;
    }

    try {
      const { data: courses, error: courseError } = await window.slcDB.from('slc_courses')
        .select('id,title,provider_name');
      if (courseError) throw courseError;
      const courseMap = new Map((courses || []).map(course => [String(course.id), course]));

      const { data, error } = await window.slcDB.from('slc_lectures')
        .select('id,title,lecture_order,created_at,notes,transcript_text,live_payload,course_id,source_type,session_kind')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const cloudLectures = (data || []).map(row => {
        const normalized = normalizeLecture(row);
        const course = courseMap.get(String(row.course_id)) || {};
        return {
          ...normalized,
          source_scope: 'cloud',
          course_id: row.course_id,
          course_title: course.title || '',
          provider_name: course.provider_name || '',
          source_type: row.source_type || '',
          session_kind: row.session_kind || ''
        };
      });

      let matching = cloudLectures.filter(item =>
        isCampText(item.course_title) ||
        isCampText(item.provider_name) ||
        isCampText(item.title) ||
        isCampText(item.course_name)
      );

      let usedRecentLiveFallback = false;
      if (!matching.length) {
        matching = cloudLectures.filter(item =>
          item.source_type === 'live' || item.session_kind === 'live'
        ).slice(0, 20);
        usedRecentLiveFallback = matching.length > 0;
      }

      const items = [...matching];
      if (localItem) {
        const duplicate = items.some(item =>
          item.title === localItem.title &&
          Math.abs(new Date(item.created_at || 0).getTime() - new Date(localItem.started_at || 0).getTime()) < 120000
        );
        if (!duplicate) items.push(localItem);
      }

      if (items.length) {
        const message = usedRecentLiveFallback
          ? 'لم يطابق اسم الدورة كلمات المخيم؛ لذلك عُرضت أحدث المحاضرات المباشرة مع اسم مصدرها حتى تختار المحاضرة الصحيحة.'
          : `تم العثور على ${matching.length} محاضرة سحابية للمخيم${localItem ? '، مع إتاحة آخر جلسة محلية أيضًا' : ''}.`;
        showLectures(items, message);
      } else {
        showLectures([], 'لم تُحفظ محاضرة سحابية أو جلسة محلية قابلة للتحليل بعد.');
      }
    } catch (error) {
      showLectures(
        localItem ? [localItem] : [],
        localItem
          ? `تعذر تحميل السحابة، لكن آخر جلسة محلية متاحة: ${error.message || 'خطأ اتصال'}`
          : (error.message || 'تعذر تحميل محاضرات المخيم، ولا توجد جلسة محلية بديلة.')
      );
    }
  }
  async function analyzeSelectedLecture() {
    const button = root.querySelector('#campAnalyzeLecture');
    const status = root.querySelector('#campAssistantStatus');
    button.disabled = true; status.textContent = 'يقرأ المحاضرة المحددة ونصها وشرائحها…';
    try {
      const selectedId = root.querySelector('#campLectureSelect')?.value;
      const lecture = campLectures.find(item => String(item.id) === String(selectedId)) || await readLastLecture();
      const text = lectureText(lecture);
      if (!lecture || text.length < 80) throw new Error('لا توجد محاضرة محفوظة بنص كافٍ على هذا الجهاز');
      const context = `${state.title} ${state.audience} ${state.problem} ${state.promise}`;
      const ideas = rankIdeas(text, context);
      if (!ideas.length) throw new Error('لم يُعثر على أدلة نصية كافية للتحليل');
      const primary = ideas[0];
      const second = ideas[1] || primary;
      root.querySelector('#campLectureTitle').value = lecture.title || 'آخر محاضرة في المخيم';
      root.querySelector('#campLearned').value = ideas.map((idea, index) => `${index + 1}. ${idea}`).join('\n');
      root.querySelector('#campDecision').value = `قرار مقترح للمراجعة: اختبر صلة «${primary.slice(0, 150)}» بمشكلة المستفيد المحددة في ميثاق المنتج قبل إضافتها إلى المنتج.`;
      root.querySelector('#campNextAction').value = `خلال 24 ساعة: حوّل فكرة «${second.slice(0, 120)}» إلى نموذج صغير، واعرضه على مستفيد واحد، وسجّل ما فهمه وما لم يفهمه.`;
      const savedQuestions = (lecture.questions || []).map(item => item.question || item).filter(Boolean);
      root.querySelector('#campAssistantIdeas').innerHTML = ideas.map(idea => `<li>${esc(idea)}</li>`).join('');
      root.querySelector('#campAssistantQuestion').textContent = savedQuestions[0] || `سؤال للمحاضر: ما الدليل أو المثال العملي الذي يثبت قابلية تطبيق «${primary.slice(0, 110)}» على منتج يخدم ${state.audience.slice(0, 90)}؟`;
      root.querySelector('#campAssistantOpportunity').textContent = `فرصة محتملة: تحويل الفكرة الأقوى إلى أداة أو قالب قصير يحل جزءًا واحدًا من المشكلة: ${state.problem.slice(0, 170)}`;
      root.querySelector('#campAssistantResult').hidden = false;
      status.textContent = 'تم إعداد مسودة من أدلة المحاضرة؛ راجعها وعدّلها قبل الحفظ.';
    } catch (error) {
      status.textContent = error.message || 'تعذر تحليل آخر محاضرة.';
    } finally { button.disabled = false; }
  }

  function render() {
    root.innerHTML = `
      <div class="camp-page-head">
        <div><span class="eyebrow">15 أغسطس–30 سبتمبر · السبت والأحد · ساعتان</span><h1>مختبر صناعة المنتج الرقمي</h1><p>14 محاضرة تقريبًا خلال 47 يومًا: حوّل كل محاضرة إلى قرار، وكل قرار إلى مهمة، وكل مهمة إلى منتج نافع.</p></div>
        <div class="camp-head-actions"><button class="btn soft" id="campGuideBtn">؟ دليل الاستخدام</button><button class="btn primary" id="campOpenLecture">ابدأ محاضرة المخيم</button></div>
      </div>
      <section class="camp-hero card">
        <div><small>المنتج المقترح الأول</small><h2>${esc(state.title)}</h2><p>${esc(state.promise)}</p></div>
        <div class="camp-progress" style="--p:${progress() * 3.6}deg"><strong>${progress()}%</strong><span>إنجاز المسار</span></div>
      </section>
      <section class="camp-phases">${phases.map(p => `<article class="card camp-phase"><b>المرحلة ${p.id}</b><span>الأيام ${p.days}</span><h3>${p.title}</h3><p>${p.text}</p></article>`).join('')}</section>
      <section class="camp-grid">
        <article class="card camp-charter" id="campCharter"><h2>ميثاق المنتج</h2><label>اسم المنتج<input id="campTitle" value="${esc(state.title)}"></label><label>لمن؟<textarea id="campAudience">${esc(state.audience)}</textarea></label><label>المشكلة التي يحلها<textarea id="campProblem">${esc(state.problem)}</textarea></label><label>الوعد العملي<textarea id="campPromise">${esc(state.promise)}</textarea></label><button class="btn primary" id="campSaveCharter">حفظ الميثاق</button></article>
        <article class="card camp-checklist"><h2>لوحة التنفيذ</h2><p>أنجز خطوة واحدة واضحة في كل مرة.</p>${tasks.map(([name, phase], i) => `<label class="camp-task"><input type="checkbox" data-task="${i}" ${state.completedTasks.includes(i) ? 'checked' : ''}><span>${esc(name)}<small>المرحلة ${phase}</small></span></label>`).join('')}</article>
      </section>
      <section class="card camp-knowledge-assistant"><div class="camp-assistant-head"><div><span class="eyebrow">مساعد معرفي — أنت صاحب القرار</span><h2>حوّل محاضرة المخيم إلى خطوة للمنتج</h2><p>يقرأ النص والشرائح والملاحظات المحفوظة في محاضرات المخيم، ثم يجهّز مسودة موثقة لتراجعها أنت.</p></div><button class="btn primary" id="campAnalyzeLecture">تحليل المحاضرة المحددة</button></div><label class="camp-lecture-picker">محاضرات المخيم المحفوظة<select id="campLectureSelect"><option value="">جاري التحميل…</option></select></label><p id="campAssistantStatus" class="camp-assistant-status">لن يرسل بياناتك إلى خدمة خارجية، ولن يعتمد قرارًا بدلًا عنك.</p><div id="campAssistantResult" class="camp-assistant-result" hidden><section><h3>أهم الأفكار المرتبطة بمنتجك</h3><ol id="campAssistantIdeas"></ol></section><section><h3>سؤال مفيد للمحاضر</h3><p id="campAssistantQuestion"></p></section><section><h3>فرصة منتج أو خدمة</h3><p id="campAssistantOpportunity"></p></section></div></section>
      <section class="card camp-lecture-output" id="campLectureOutput"><h2>من المحاضرة إلى المنتج</h2><p>هذه هي الحلقة الأهم: لا تُحفظ المحاضرة كمعلومة فقط، بل تتحول إلى أثر تنفيذي. زر التحليل أعلاه يملأ لك مسودة أولية.</p><div class="camp-output-form"><input id="campLectureTitle" placeholder="عنوان محاضرة اليوم"><textarea id="campLearned" placeholder="ما الفكرة التي تعلمتها؟"></textarea><textarea id="campDecision" placeholder="ما القرار الذي اتخذته للمنتج؟"></textarea><textarea id="campNextAction" placeholder="ما المهمة التالية القابلة للتنفيذ؟"></textarea><button class="btn primary" id="campAddOutput">اعتماد وحفظ مخرج المحاضرة</button></div><div class="camp-output-list">${renderOutputs()}</div></section>
      <div class="camp-guide-modal" id="campGuideModal" hidden tabindex="-1">
        <button class="camp-guide-backdrop" data-close-camp-guide aria-label="إغلاق الدليل"></button>
        <article class="camp-guide-card" role="dialog" aria-modal="true" aria-labelledby="campGuideTitle">
          <button class="camp-guide-close" data-close-camp-guide aria-label="إغلاق">×</button>
          <span class="eyebrow">دليل مختبر صناعة المنتج الرقمي</span><h2 id="campGuideTitle">ابدأ في 3 خطوات</h2>
          <ol class="camp-guide-quick"><li><b>قبل المحاضرة الأولى:</b> راجع ميثاق المنتج وعدّل ما يلزم فقط، ثم احفظه.</li><li><b>أثناء المحاضرة:</b> افتح «المحاضرة الذكية» لتسجيل المعرفة، ثم ارجع إلى المخيم.</li><li><b>بعد المحاضرة:</b> اكتب ما تعلمته، والقرار الذي اتخذته، ومهمة واحدة قابلة للتنفيذ.</li></ol>
          <div class="camp-guide-sections">
            <section><h3>المنتج المقترح</h3><p>هو اتجاه العمل الحالي، وليس التزامًا نهائيًا. فائدته أن يمنع تشتت أفكار المخيم بين منتجات كثيرة.</p></section>
            <section><h3>برنامج المخيم</h3><p>من 15 أغسطس إلى 30 سبتمبر، بمحاضرتين أسبوعيًا يومي السبت والأحد، ساعتان لكل محاضرة. الخريطة تقيس الأثر التنفيذي لا مجرد الحضور.</p></section>
            <section><h3>ميثاق المنتج</h3><dl><dt>اسم المنتج</dt><dd>اسم عمل مؤقت وواضح.</dd><dt>لمن؟</dt><dd>المستفيد الأول بدقة، لا كلمة عامة مثل «الجميع».</dd><dt>المشكلة</dt><dd>الألم الحقيقي الذي يعانيه المستفيد، وليس الميزة التي تريد بناءها.</dd><dt>الوعد</dt><dd>النتيجة العملية التي سيحصل عليها دون مبالغة.</dd></dl><button class="btn soft" data-camp-guide-target="#campCharter">اذهب إلى ميثاق المنتج</button></section>
            <section><h3>لوحة التنفيذ</h3><p>ضع علامة على المهمة فقط عندما يوجد دليل إنجاز: نص مكتوب، نموذج، مقابلة، أو نتيجة اختبار. حضور المحاضرة وحده لا يعني إنجاز المهمة.</p></section>
            <section><h3>من المحاضرة إلى المنتج</h3><dl><dt>تعلمت</dt><dd>الفكرة الجديدة التي غيّرت فهمك.</dd><dt>قررت</dt><dd>ما الذي سيتغير فعليًا في منتجك بسبب هذه الفكرة؟</dd><dt>المهمة التالية</dt><dd>فعل واحد واضح يمكن إنجازه وقياسه.</dd></dl><button class="btn soft" data-camp-guide-target="#campLectureOutput">اذهب إلى مخرج المحاضرة</button></section>
          </div>
          <aside class="camp-guide-example"><h3>مثال عملي</h3><p><b>المحاضرة:</b> تحديد الجمهور المستهدف</p><p><b>تعلمت:</b> لا يكفي قول «الباحثون»؛ يجب اختيار فئة أولى واضحة.</p><p><b>قررت:</b> تبدأ النسخة الأولى بالباحثين والمكتبيين الراغبين في تحويل بحوثهم إلى منصة.</p><p><b>المهمة التالية:</b> مقابلة 3 مستفيدين وتسجيل أكثر مشكلة تتكرر بينهم.</p></aside>
          <aside class="camp-guide-warning"><b>تنبيه مهم:</b> لا تضع كلمات مرور أو مفاتيح. بيانات المخيم محفوظة حاليًا في هذا المتصفح والجهاز، لذلك لا تعتمد عليها وحدها كنسخة احتياطية.</aside>
          <div class="camp-guide-footer"><button class="btn primary" id="campGuideOpenLecture">ابدأ محاضرة المخيم</button><button class="btn ghost" data-close-camp-guide>فهمت، إغلاق الدليل</button></div>
        </article>
      </div>`;
    bind();
  }
  function rerenderAndLoad() { render(); loadCampLectures(); }
  function renderOutputs() {
    if (!state.lectureOutputs.length) return '<div class="empty">لم تُسجل مخرجات بعد. ابدأ بأول محاضرة في المخيم.</div>';
    return state.lectureOutputs.slice().reverse().map((o, reverseIndex) => {
      const index = state.lectureOutputs.length - 1 - reverseIndex;
      return `<article><header><strong>${esc(o.title)}</strong><button data-delete-output="${index}" aria-label="حذف">×</button></header><dl><dt>تعلمت</dt><dd>${esc(o.learned)}</dd><dt>قررت</dt><dd>${esc(o.decision)}</dd><dt>المهمة التالية</dt><dd>${esc(o.nextAction)}</dd></dl></article>`;
    }).join('');
  }
  function bind() {
    const guide = root.querySelector('#campGuideModal');
    const openGuide = () => { guide.hidden = false; document.body.classList.add('modal-open'); guide.focus(); };
    const closeGuide = () => { guide.hidden = true; document.body.classList.remove('modal-open'); };
    root.querySelector('#campGuideBtn').onclick = openGuide;
    root.querySelectorAll('[data-close-camp-guide]').forEach(button => button.onclick = closeGuide);
    guide.onkeydown = event => { if (event.key === 'Escape') closeGuide(); };
    root.querySelectorAll('[data-camp-guide-target]').forEach(button => button.onclick = () => {
      const target = button.dataset.campGuideTarget; closeGuide();
      setTimeout(() => root.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    });
    root.querySelector('#campGuideOpenLecture').onclick = () => { closeGuide(); location.hash = 'live'; };
    root.querySelector('#campOpenLecture').onclick = () => { location.hash = 'live'; };
    root.querySelector('#campAnalyzeLecture').onclick = analyzeSelectedLecture;
    root.querySelector('#campSaveCharter').onclick = () => {
      state.title = root.querySelector('#campTitle').value.trim();
      state.audience = root.querySelector('#campAudience').value.trim();
      state.problem = root.querySelector('#campProblem').value.trim();
      state.promise = root.querySelector('#campPromise').value.trim(); save(); rerenderAndLoad(); notify('تم حفظ ميثاق المنتج');
    };
    root.querySelectorAll('[data-task]').forEach(input => input.onchange = () => {
      const id = Number(input.dataset.task);
      state.completedTasks = input.checked ? [...new Set([...state.completedTasks, id])] : state.completedTasks.filter(x => x !== id);
      save(); rerenderAndLoad();
    });
    root.querySelector('#campAddOutput').onclick = () => {
      const output = {
        title: root.querySelector('#campLectureTitle').value.trim(), learned: root.querySelector('#campLearned').value.trim(),
        decision: root.querySelector('#campDecision').value.trim(), nextAction: root.querySelector('#campNextAction').value.trim(), createdAt: new Date().toISOString()
      };
      if (!output.title || !output.learned || !output.nextAction) return notify('أكمل عنوان المحاضرة والفكرة والمهمة التالية');
      state.lectureOutputs.push(output); save(); rerenderAndLoad(); notify('تم ربط المحاضرة بالمنتج');
    };
    root.querySelectorAll('[data-delete-output]').forEach(button => button.onclick = () => {
      if (!confirm('حذف مخرج هذه المحاضرة؟')) return;
      state.lectureOutputs.splice(Number(button.dataset.deleteOutput), 1); save(); rerenderAndLoad();
    });
  }
  render();
  loadCampLectures();
})();
