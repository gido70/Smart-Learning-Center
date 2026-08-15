(function () {
  const root = document.getElementById('digitalProductCamp');
  if (!root) return;

  const STORAGE_KEY = 'slc_digital_product_camp_v1';
  const phases = [
    { id: 1, days: '1–10', title: 'تأسيس المنتج', text: 'اختيار الفكرة والجمهور والمشكلة والوعد.' },
    { id: 2, days: '11–25', title: 'صناعة المحتوى', text: 'تحويل الخبرة إلى تجربة تعليمية تفاعلية قابلة للاستخدام.' },
    { id: 3, days: '26–38', title: 'نظام البيع', text: 'صفحة الهبوط والتسعير ومسار التسويق والدفع.' },
    { id: 4, days: '39–47', title: 'الإطلاق والتحسين', text: 'إطلاق أول نسخة وقياس الاستخدام وتحسينها.' }
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

  function render() {
    root.innerHTML = `
      <div class="camp-page-head">
        <div><span class="eyebrow">مسار تطبيقي لمدة 47 يومًا</span><h1>مختبر صناعة المنتج الرقمي</h1><p>حوّل كل محاضرة إلى قرار، وكل قرار إلى مهمة، وكل مهمة إلى منتج نافع.</p></div>
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
      <section class="card camp-lecture-output" id="campLectureOutput"><h2>من المحاضرة إلى المنتج</h2><p>هذه هي الحلقة الأهم: لا تُحفظ المحاضرة كمعلومة فقط، بل تتحول إلى أثر تنفيذي.</p><div class="camp-output-form"><input id="campLectureTitle" placeholder="عنوان محاضرة اليوم"><textarea id="campLearned" placeholder="ما الفكرة التي تعلمتها؟"></textarea><textarea id="campDecision" placeholder="ما القرار الذي اتخذته للمنتج؟"></textarea><textarea id="campNextAction" placeholder="ما المهمة التالية القابلة للتنفيذ؟"></textarea><button class="btn primary" id="campAddOutput">حفظ مخرج المحاضرة</button></div><div class="camp-output-list">${renderOutputs()}</div></section>
      <div class="camp-guide-modal" id="campGuideModal" hidden tabindex="-1">
        <button class="camp-guide-backdrop" data-close-camp-guide aria-label="إغلاق الدليل"></button>
        <article class="camp-guide-card" role="dialog" aria-modal="true" aria-labelledby="campGuideTitle">
          <button class="camp-guide-close" data-close-camp-guide aria-label="إغلاق">×</button>
          <span class="eyebrow">دليل مختبر صناعة المنتج الرقمي</span><h2 id="campGuideTitle">ابدأ في 3 خطوات</h2>
          <ol class="camp-guide-quick"><li><b>قبل المحاضرة الأولى:</b> راجع ميثاق المنتج وعدّل ما يلزم فقط، ثم احفظه.</li><li><b>أثناء المحاضرة:</b> افتح «المحاضرة الذكية» لتسجيل المعرفة، ثم ارجع إلى المخيم.</li><li><b>بعد المحاضرة:</b> اكتب ما تعلمته، والقرار الذي اتخذته، ومهمة واحدة قابلة للتنفيذ.</li></ol>
          <div class="camp-guide-sections">
            <section><h3>المنتج المقترح</h3><p>هو اتجاه العمل الحالي، وليس التزامًا نهائيًا. فائدته أن يمنع تشتت أفكار المخيم بين منتجات كثيرة.</p></section>
            <section><h3>مراحل الـ47 يومًا</h3><p>خريطة زمنية توضح أين أنت: تأسيس، محتوى، بيع، ثم إطلاق. لا تنتقل إلى البيع قبل وضوح الجمهور والمشكلة.</p></section>
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
    root.querySelector('#campSaveCharter').onclick = () => {
      state.title = root.querySelector('#campTitle').value.trim();
      state.audience = root.querySelector('#campAudience').value.trim();
      state.problem = root.querySelector('#campProblem').value.trim();
      state.promise = root.querySelector('#campPromise').value.trim(); save(); render(); notify('تم حفظ ميثاق المنتج');
    };
    root.querySelectorAll('[data-task]').forEach(input => input.onchange = () => {
      const id = Number(input.dataset.task);
      state.completedTasks = input.checked ? [...new Set([...state.completedTasks, id])] : state.completedTasks.filter(x => x !== id);
      save(); render();
    });
    root.querySelector('#campAddOutput').onclick = () => {
      const output = {
        title: root.querySelector('#campLectureTitle').value.trim(), learned: root.querySelector('#campLearned').value.trim(),
        decision: root.querySelector('#campDecision').value.trim(), nextAction: root.querySelector('#campNextAction').value.trim(), createdAt: new Date().toISOString()
      };
      if (!output.title || !output.learned || !output.nextAction) return notify('أكمل عنوان المحاضرة والفكرة والمهمة التالية');
      state.lectureOutputs.push(output); save(); render(); notify('تم ربط المحاضرة بالمنتج');
    };
    root.querySelectorAll('[data-delete-output]').forEach(button => button.onclick = () => {
      if (!confirm('حذف مخرج هذه المحاضرة؟')) return;
      state.lectureOutputs.splice(Number(button.dataset.deleteOutput), 1); save(); render();
    });
  }
  render();
})();
