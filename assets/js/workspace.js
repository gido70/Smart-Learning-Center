/**
 * workspace.js — مساحة عمل المحاضرة
 * يربط بيانات الكورس الحقيقية (من Supabase) بالواجهة بدل النموذج الثابت،
 * ويضيف تلخيصاً حقيقياً عبر Claude API بناءً على نص يلصقه المستخدم.
 */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const CLAUDE_MODEL = 'claude-sonnet-4-6';
  const KEY_STORAGE = 'slc_anthropic_key';

  function extractYouTubeId(url) {
    if (!url) return null;
    const patterns = [/(?:v=|\/)([0-9A-Za-z_-]{11}).*/, /youtu\.be\/([0-9A-Za-z_-]{11})/];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  function toast(message) {
    const node = $('toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    setTimeout(() => node.classList.remove('show'), 2600);
  }

  function renderSummary(html, isSaved) {
    const placeholder = $('summaryPlaceholder');
    const result = $('summaryResult');
    placeholder.classList.add('hidden');
    result.classList.remove('hidden');
    const savedNote = isSaved
      ? '<p class="muted-note">✅ هذه خلاصة محفوظة مسبقاً — لم تُستهلك تكلفة API لعرضها.</p>'
      : '';
    result.innerHTML = `${savedNote}${html}<button class="btn soft wide" id="redoSummaryBtn" style="margin-top:12px">🔁 تلخيص نص آخر</button>`;
    $('redoSummaryBtn')?.addEventListener('click', () => {
      placeholder.classList.remove('hidden');
      result.classList.add('hidden');
    });
  }

  async function saveSummaryToDatabase(html) {
    const courseId = localStorage.getItem('slc_current_course_id');
    if (!courseId || !window.slcDB) return;
    const { data: { user } } = await window.slcDB.auth.getUser();
    if (!user) return;
    const { error } = await window.slcDB
      .from('slc_summaries')
      .upsert(
        { course_id: courseId, owner_id: user.id, summary_html: html, updated_at: new Date().toISOString() },
        { onConflict: 'course_id' }
      );
    if (error) console.error('تعذر حفظ الخلاصة:', error);
  }

  // ------------------------------------------------------------
  // تحميل بيانات الكورس الحقيقي المحدَّد من مكتبة الكورسات
  // ------------------------------------------------------------
  async function loadWorkspace() {
    const courseId = localStorage.getItem('slc_current_course_id');
    const titleEl = $('workspaceTitle');
    const metaEl = $('workspaceMeta');
    const frame = $('lessonFrame');
    const outsideBtn = $('watchOutsideBtn');
    if (!titleEl || !window.slcDB) return;

    if (!courseId) {
      titleEl.textContent = 'لم يُحدَّد أي كورس بعد';
      metaEl.textContent = 'اذهب إلى «مكتبة الكورسات» واضغط «فتح» على أي كورس.';
      return;
    }

    titleEl.textContent = 'جاري التحميل...';
    const { data: course, error } = await window.slcDB
      .from('slc_courses')
      .select('id,title,provider_name,course_url')
      .eq('id', courseId)
      .single();

    if (error || !course) {
      titleEl.textContent = 'تعذر تحميل بيانات الكورس';
      metaEl.textContent = error ? error.message : 'الكورس غير موجود.';
      return;
    }

    titleEl.textContent = course.title || 'بدون عنوان';
    metaEl.textContent = `${course.provider_name || 'مصدر غير محدد'} · ${course.course_url || ''}`;

    const videoId = extractYouTubeId(course.course_url);
    if (videoId && frame) {
      frame.src = `https://www.youtube.com/embed/${videoId}?rel=0`;
    }
    if (outsideBtn && course.course_url) {
      outsideBtn.href = course.course_url;
    }

    // إعادة ضبط منطقة التلخيص عند تبديل الكورس
    const placeholder = $('summaryPlaceholder');
    const result = $('summaryResult');
    const transcriptInput = $('transcriptInput');
    if (transcriptInput) transcriptInput.value = '';

    // هل توجد خلاصة محفوظة مسبقاً لهذا الكورس؟ اعرضها فوراً بدل تلخيص جديد
    const { data: savedSummary } = await window.slcDB
      .from('slc_summaries')
      .select('summary_html, updated_at')
      .eq('course_id', courseId)
      .maybeSingle();

    if (savedSummary?.summary_html) {
      renderSummary(savedSummary.summary_html, true);
    } else if (placeholder && result) {
      placeholder.classList.remove('hidden');
      result.classList.add('hidden');
      result.innerHTML = '';
    }
  }

  // ------------------------------------------------------------
  // مفتاح Claude API الخاص بالمستخدم (يُطلب مرة واحدة فقط ويُحفظ محلياً)
  // ------------------------------------------------------------
  function getApiKey() {
    let key = localStorage.getItem(KEY_STORAGE);
    if (!key) {
      key = prompt(
        'أدخل مفتاح Claude API الخاص بك (يبدأ بـ sk-ant-...).\nيُحفظ في متصفحك فقط ولا يُرسل لأي مكان آخر غير Anthropic مباشرة.'
      );
      if (key) localStorage.setItem(KEY_STORAGE, key.trim());
    }
    return key ? key.trim() : null;
  }

  const SUMMARY_PROMPT = `أنت مساعد متخصص في تلخيص المحاضرات التعليمية باللغة العربية.
لخّص نص المحاضرة التالي بصيغة HTML بسيطة (استخدم <h4> و<ul><li> فقط، بدون أي وسوم أخرى)، على هذا الترتيب بالضبط:

<h4>الخلاصة السريعة</h4>
<ul> من 5 إلى 8 نقاط رئيسية </ul>

<h4>ماذا أستفيد عملياً</h4>
<ul> خطوات أو أفكار قابلة للتطبيق مباشرة </ul>

<h4>أخطاء أو تحذيرات ذكرها المحاضر</h4>
<ul> إن وُجدت، وإلا اكتب "لم يُذكر شيء" </ul>

النص:
"""
{{TRANSCRIPT}}
"""

أعد HTML فقط بدون أي شرح أو مقدمة.`;

  async function summarizeNow() {
    const transcriptInput = $('transcriptInput');
    const text = transcriptInput?.value.trim();
    if (!text || text.length < 50) {
      toast('الصق نص المحاضرة كاملاً أولاً (أقل من 50 حرفاً غير كافٍ).');
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      toast('تحتاج مفتاح Claude API للمتابعة.');
      return;
    }

    const btn = $('summarizeBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ جاري التلخيص...';

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: SUMMARY_PROMPT.replace('{{TRANSCRIPT}}', text.slice(0, 20000))
          }]
        })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error?.message || `خطأ HTTP ${response.status}`);
      }

      const data = await response.json();
      const html = data?.content?.[0]?.text || '<p>لم يصل رد صالح من النموذج.</p>';

      renderSummary(html, false);
      await saveSummaryToDatabase(html);
      toast('تم التلخيص وحفظه بنجاح');
    } catch (error) {
      console.error(error);
      toast(`تعذر التلخيص: ${error.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  document.querySelector('[data-view="workspace"]')?.addEventListener('click', loadWorkspace);
  $('summarizeBtn')?.addEventListener('click', summarizeNow);

  // لو فُتحت الصفحة مباشرة على مساحة المحاضرة (رابط بهاش #workspace)
  if (location.hash === '#workspace') {
    window.addEventListener('load', loadWorkspace);
  }

  // ------------------------------------------------------------
  // البحث الحقيقي: عناوين الكورسات + نصوص الخلاصات المحفوظة معاً
  // ------------------------------------------------------------
  function excerptAround(text, query) {
    const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const index = plain.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return plain.slice(0, 90);
    const start = Math.max(0, index - 30);
    return (start > 0 ? '…' : '') + plain.slice(start, start + 110) + '…';
  }

  function openCourseFromSearch(courseId) {
    localStorage.setItem('slc_current_course_id', courseId);
    $('searchResults')?.classList.add('hidden');
    if ($('globalSearch')) $('globalSearch').value = '';
    document.querySelector('[data-view="workspace"]')?.click();
  }

  async function runGlobalSearch(query) {
    const box = $('searchResults');
    if (!box || !window.slcDB) return;
    if (query.trim().length < 2) {
      box.classList.add('hidden');
      return;
    }

    const [{ data: courses }, { data: summaries }] = await Promise.all([
      window.slcDB.from('slc_courses').select('id,title,provider_name').ilike('title', `%${query}%`).limit(6),
      window.slcDB.from('slc_summaries').select('course_id,summary_html').ilike('summary_html', `%${query}%`).limit(6)
    ]);

    const courseIds = new Set((courses || []).map((c) => c.id));
    const extraIds = (summaries || []).map((s) => s.course_id).filter((id) => !courseIds.has(id));

    let extraCourses = [];
    if (extraIds.length) {
      const { data } = await window.slcDB.from('slc_courses').select('id,title,provider_name').in('id', extraIds);
      extraCourses = data || [];
    }

    const results = [
      ...(courses || []).map((course) => ({
        id: course.id,
        title: course.title,
        snippet: course.provider_name || 'عنوان مطابق',
        icon: '🎓'
      })),
      ...extraCourses.map((course) => {
        const match = (summaries || []).find((s) => s.course_id === course.id);
        return {
          id: course.id,
          title: course.title,
          snippet: match ? excerptAround(match.summary_html, query) : '',
          icon: '📝'
        };
      })
    ];

    if (!results.length) {
      box.innerHTML = '<div class="search-empty">لا نتائج مطابقة</div>';
      box.classList.remove('hidden');
      return;
    }

    box.innerHTML = results
      .map((r) => `<button class="search-result-item" data-course-id="${r.id}"><h4>${r.icon} ${r.title}</h4><p>${r.snippet}</p></button>`)
      .join('');
    box.querySelectorAll('.search-result-item').forEach((btn) => {
      btn.addEventListener('click', () => openCourseFromSearch(btn.dataset.courseId));
    });
    box.classList.remove('hidden');
  }

  let searchDebounce;
  const searchInput = document.getElementById('globalSearch');
  searchInput?.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => runGlobalSearch(e.target.value), 350);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) $('searchResults')?.classList.add('hidden');
  });
})();

