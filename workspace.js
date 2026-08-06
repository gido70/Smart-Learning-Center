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
    if (placeholder) placeholder.classList.remove('hidden');
    if (result) {
      result.classList.add('hidden');
      result.innerHTML = '';
    }
    const transcriptInput = $('transcriptInput');
    if (transcriptInput) transcriptInput.value = '';
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

      const placeholder = $('summaryPlaceholder');
      const result = $('summaryResult');
      placeholder.classList.add('hidden');
      result.classList.remove('hidden');
      result.innerHTML = `${html}<button class="btn soft wide" id="redoSummaryBtn" style="margin-top:12px">🔁 تلخيص نص آخر</button>`;
      $('redoSummaryBtn')?.addEventListener('click', () => {
        placeholder.classList.remove('hidden');
        result.classList.add('hidden');
      });
      toast('تم التلخيص بنجاح');
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
})();
