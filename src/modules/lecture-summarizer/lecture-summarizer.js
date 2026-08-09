/**
 * Scientific Arabic lecture summarizer — local, extractive and coverage-aware.
 * It never sends lecture text to an external service.
 */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const STOP = new Set(('في من على إلى الى عن أن ان إن كان كانت يكون تكون هذا هذه ذلك تلك هناك هنا مع كما كل ثم أو او و لا ما لم لن قد لقد هو هي هم هن نحن أنا انت أنت بين عند بعد قبل حتى إذا اذا حيث الذي التي الذين أيضا ايضا جداً جدا ضمن عبر لدى عليه عليها منه منها فيها فيه بها به لها له لأن لان وإنما اما أما أي اي بعض أكثر اكثر أقل اقل غير نفس فقط خلال حول مرة شيء ذلك هذه هؤلاء وهي وهو وهم وقد ولا').split(/\s+/));
  const SIGNALS = {
    action: /(?:يجب|ينبغي|يمكن|نستطيع|خطو|تطبيق|عملي|نفعل|نقوم|استخدم|طريقة|آلية|إجراء)/,
    example: /(?:مثال|مثلاً|مثلا|على سبيل المثال|تجربة|حالة|دليل|برهان|نتيجة)/,
    warning: /(?:انتبه|تحذير|خطأ|مشكلة|خطر|لا ينبغي|تجنب|احذر|عيب|ملاحظة مهمة)/,
    definition: /(?:تعريف|يعني|يُقصد|يقصد|مفهوم|مصطلح|هو عبارة|هي عبارة|نسميه)/
  };

  function normalize(value = '') {
    return String(value).replace(/[\u064B-\u065F\u0670ـ]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').toLowerCase();
  }

  function tokens(value) {
    return normalize(value).match(/[\p{L}\p{N}]{3,}/gu)?.filter((word) => !STOP.has(word)) || [];
  }

  function cleanTranscript(raw) {
    return String(raw || '')
      .replace(/\r/g, '\n')
      .replace(/^\s*(?:\[)?\d{1,2}:\d{2}(?::\d{2})?(?:\])?\s*/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  function splitSentences(text) {
    return text.split(/(?<=[.!؟!?؛])\s+|\n+/u)
      .map((sentence) => sentence.replace(/^[-–—•\s]+/, '').trim())
      .filter((sentence) => sentence.length >= 24 && tokens(sentence).length >= 4)
      .map((text, index) => ({ text, index, words: tokens(text) }));
  }

  function frequency(sentences) {
    const counts = new Map();
    sentences.flatMap((item) => item.words).forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
    const max = Math.max(1, ...counts.values());
    counts.forEach((value, key) => counts.set(key, value / max));
    return counts;
  }

  function sentenceScore(sentence, freq) {
    const unique = [...new Set(sentence.words)];
    const lexical = unique.reduce((sum, word) => sum + (freq.get(word) || 0), 0) / Math.sqrt(Math.max(1, unique.length));
    const signal = Object.values(SIGNALS).reduce((sum, re) => sum + (re.test(normalize(sentence.text)) ? 0.18 : 0), 0);
    const lengthFit = sentence.text.length >= 55 && sentence.text.length <= 280 ? 0.16 : 0;
    return lexical + signal + lengthFit;
  }

  function similarity(a, b) {
    const left = new Set(a.words); const right = new Set(b.words);
    const intersection = [...left].filter((word) => right.has(word)).length;
    return intersection / Math.max(1, new Set([...left, ...right]).size);
  }

  function choose(candidates, count, freq, used = []) {
    return candidates.map((item) => ({ ...item, score: sentenceScore(item, freq) }))
      .sort((a, b) => b.score - a.score)
      .filter((item) => !used.some((picked) => similarity(item, picked) > 0.62))
      .slice(0, count).sort((a, b) => a.index - b.index);
  }

  function keywords(sentences, limit = 12) {
    const counts = new Map();
    sentences.flatMap((item) => [...new Set(item.words)]).forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
    return [...counts.entries()].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([word]) => word);
  }

  function bullets(items, fallback) {
    return items.length ? items.map((item) => `- ${item.text}`).join('\n') : `- ${fallback}`;
  }

  function buildSummary(raw, title = 'المحاضرة') {
    const cleaned = cleanTranscript(raw);
    const sentences = splitSentences(cleaned);
    if (sentences.length < 3) throw new Error('النص قصير أو غير واضح بما يكفي. ألصق نص المحاضرة كاملاً.');
    const freq = frequency(sentences);
    const sectionCount = Math.min(12, Math.max(4, Math.ceil(sentences.length / 14)));
    const size = Math.ceil(sentences.length / sectionCount);
    const sections = [];
    const represented = [];
    for (let start = 0; start < sentences.length; start += size) {
      const group = sentences.slice(start, start + size);
      const target = Math.min(4, Math.max(2, Math.ceil(group.length / 4)));
      let selected = choose(group, target, freq, represented);
      // لا نترك أي جزء بلا تمثيل حتى عندما تتشابه صياغته مع جزء سابق.
      if (!selected.length) selected = choose(group, target, freq);
      represented.push(...selected);
      sections.push({ selected, words: keywords(group, 4) });
    }
    const executive = choose(sentences, Math.min(14, Math.max(7, Math.ceil(sentences.length * 0.09))), freq);
    const bySignal = (name, limit) => choose(sentences.filter((item) => SIGNALS[name].test(normalize(item.text))), limit, freq);
    const concepts = bySignal('definition', 10);
    const actions = bySignal('action', 10);
    const examples = bySignal('example', 8);
    const warnings = bySignal('warning', 8);
    const topWords = keywords(sentences, 16);
    const themes = sections.map((section, index) => `### المحور ${index + 1}: ${section.words.join('، ') || `الجزء ${index + 1}`}\n${bullets(section.selected, 'لم تظهر جملة مكتملة في هذا الجزء؛ راجع النص الأصلي.')}`).join('\n\n');
    const questions = topWords.slice(0, 8).map((word, index) => `${index + 1}. اشرح فكرة «${word}» كما وردت في المحاضرة، وما علاقتها بالمحاور الأخرى؟`).join('\n');
    const coverage = Math.round((sections.filter((section) => section.selected.length).length / sections.length) * 100);
    return `# الخلاصة العلمية: ${title}\n\n## الخلاصة التنفيذية\n${bullets(executive, 'لم تتوفر أفكار كافية.')}\n\n## محاور المحاضرة بالتسلسل\n${themes}\n\n## المفاهيم والتعريفات الأساسية\n${bullets(concepts, `الكلمات المركزية في النص: ${topWords.join('، ')}.`)}\n\n## التطبيقات والخطوات العملية\n${bullets(actions, 'لم يذكر النص خطوات عملية صريحة.')}\n\n## الأمثلة والأدلة والحالات\n${bullets(examples, 'لم يذكر النص أمثلة صريحة.')}\n\n## التنبيهات والأخطاء والملاحظات المهمة\n${bullets(warnings, 'لم يذكر النص تحذيرات صريحة.')}\n\n## مصطلحات البحث\n${topWords.map((word) => `- ${word}`).join('\n')}\n\n## أسئلة للمراجعة والاستيعاب\n${questions}\n\n## مؤشر التغطية\n- غُطيت ${sections.filter((section) => section.selected.length).length} من ${sections.length} أجزاء زمنية/موضوعية (${coverage}%).\n- التلخيص مستخرج من كلام المحاضر ولا يضيف معلومات خارج النص؛ يُنصح بمراجعة المحاور المرتبطة ببحث أو قرار مهم.`;
  }

  async function summarizeNow() {
    const button = $('localSummarizeBtn');
    const status = $('summaryEngineStatus');
    const raw = $('transcriptInput')?.value.trim();
    if (!raw || raw.length < 100) return window.slcWorkspace?.toast('ألصق نص المحاضرة كاملاً أولاً.');
    button.disabled = true; status.textContent = 'جارٍ تحليل جميع أجزاء المحاضرة وبناء المحاور...';
    try {
      const record = await window.slcWorkspace?.getCurrentRecord();
      const summary = buildSummary(raw, record?.title || $('workspaceTitle')?.textContent || 'المحاضرة');
      await window.slcWorkspace?.saveSummaryText(summary, cleanTranscript(raw));
      status.textContent = 'اكتمل التلخيص الشامل وحُفظ داخل المحاضرة وأصبح قابلاً للبحث.';
    } catch (error) {
      status.textContent = error.message;
      window.slcWorkspace?.toast(error.message);
    } finally { button.disabled = false; }
  }

  async function prepareNotebookLM() {
    const raw = $('transcriptInput')?.value.trim();
    if (!raw || raw.length < 100) return window.slcWorkspace?.toast('ألصق نص المحاضرة أولاً.');
    const record = await window.slcWorkspace?.getCurrentRecord();
    const prompt = `حلّل هذه المحاضرة تحليلاً علمياً شاملاً دون إسقاط أي محور. أخرج: خلاصة تنفيذية، المحاور بالتسلسل، المفاهيم والتعريفات، الأدلة والأمثلة، التطبيقات، التنبيهات، أسئلة مراجعة، وإحالات إلى مواضع النص. لا تضف معلومات غير موجودة في المصدر.\n\nالعنوان: ${record?.title || 'محاضرة'}\n\n${cleanTranscript(raw)}`;
    const blob = new Blob([prompt], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `notebooklm-${Date.now()}.txt`; link.click(); URL.revokeObjectURL(link.href);
    window.slcWorkspace?.toast('تم تنزيل ملف منظم وجاهز لإضافته إلى NotebookLM اختيارياً.');
  }

  $('localSummarizeBtn')?.addEventListener('click', summarizeNow);
  $('notebookLmExportBtn')?.addEventListener('click', prepareNotebookLM);
  window.slcLectureSummarizer = { buildSummary, cleanTranscript };
})();
