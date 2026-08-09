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
  const NOISE = /^(?:السلام عليكم|وعليكم السلام|شكرا|شكراً|اهلا|أهلا|مرحبا|طيب|تمام|نعم|ايوه|أيوه|هل الصوت|واضح الصوت|من لديه سؤال|أي سؤال|نشوفكم|يعطيكم العافية)/;
  const DIALECT_RULES = [
    [/كل العمليات اللي/gu,'جميع العمليات التي'],[/\bنقدر نستفيد\b/gu,'يمكننا الاستفادة'],[/\bونقدر نستفيد\b/gu,'ويمكننا الاستفادة'],
    [/\bعايزين نستخدم\b/gu,'نريد استخدام'],[/\bعاوزين نستخدم\b/gu,'نريد استخدام'],[/من اول العمل/gu,'منذ بداية العمل'],
    [/\bما نعتقدش\b/gu,'لا نعتقد'],[/\bما عندناش\b/gu,'ليس لدينا'],[/\bما عنديش\b/gu,'ليس لدي'],[/\bمفيش\b/gu,'لا يوجد'],
    [/\bمش بيتعب\b/gu,'لا يتعب'],[/\bمش موجود\b/gu,'غير موجود'],[/\bمش\b/gu,'ليس'],
    [/\bاحنا\b/gu,'نحن'],[/\bإحنا\b/gu,'نحن'],[/\bعايزين\b/gu,'نريد'],[/\bعاوزين\b/gu,'نريد'],[/\bعايز\b/gu,'أريد'],[/\bعاوز\b/gu,'أريد'],
    [/\bهكون\b/gu,'سأكون'],[/\bهحس\b/gu,'سأدرك'],[/\bهنكون\b/gu,'سنكون'],[/\bهنعمل\b/gu,'سننفذ'],[/\bبنعمل\b/gu,'ننفذ'],[/\bبنستخدم\b/gu,'نستخدم'],
    [/\bبنفكر\b/gu,'نفكر'],[/\bبنشوف\b/gu,'نرى'],[/\bبيفكر\b/gu,'يفكر'],[/\bبيستخدم\b/gu,'يستخدم'],[/\bبيعمل\b/gu,'يعمل'],[/\bبيتعب\b/gu,'يتعب'],
    [/\bبتاعنا\b/gu,'الخاص بنا'],[/\bبتاع\b/gu,'الخاص بـ'],[/\bدلوقتي\b/gu,'الآن'],[/\bكده\b/gu,'هكذا'],[/\bكدا\b/gu,'هكذا'],[/\bازاي\b/gu,'كيف'],
    [/\bإزاي\b/gu,'كيف'],[/\bليه\b/gu,'لماذا'],[/\bاللي\b/gu,'الذي'],[/\bما نقدرش\b/gu,'لا نستطيع'],[/\bنقدر\b/gu,'يمكننا'],
    [/\bاقدر\b/gu,'أستطيع'],[/\bأقدر\b/gu,'أستطيع'],[/\bاشوف\b/gu,'أرى'],[/\bأشوف\b/gu,'أرى'],[/\bبيها\b/gu,'منها'],[/\bزينا\b/gu,'مثلنا'],[/\bمن اول\b/gu,'منذ البداية'],[/\bكتر\b/gu,'كثرة'],
    [/\bهسي\b/gu,'الآن'],[/\bهسه\b/gu,'الآن'],[/\bزول\b/gu,'شخص'],[/\bشديد\b/gu,'جدًا'],[/\bدا\b/gu,'هذا'],[/\bدي\b/gu,'هذه'],
    [/\bالحين\b/gu,'الآن'],[/\bوايد\b/gu,'كثيرًا'],[/\bشلون\b/gu,'كيف'],[/\bمو\b/gu,'ليس'],[/\bأبي\b/gu,'أريد'],
    [/\bبدنا\b/gu,'نريد'],[/\bشو\b/gu,'ماذا'],[/\bهلق\b/gu,'الآن'],[/\bهيك\b/gu,'هكذا'],[/\bبدي\b/gu,'أريد']
  ];
  const FILLERS = /(?:^|[،,؛]\s*|\s+)(?:يعني|طيب|تمام|بصراحة|الحقيقة|طبعًا|طبعا|بقى|اه|آه|أمم|مثلا كده|زي ما قلنا)(?=\s|[،,؛.!؟]|$)/gu;

  function normalize(value = '') {
    return String(value).replace(/[\u064B-\u065F\u0670ـ]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').toLowerCase();
  }

  function tokens(value) {
    return normalize(value).match(/[\p{L}\p{N}]{3,}/gu)?.filter((word) => !STOP.has(word)) || [];
  }

  function cleanTranscript(raw) {
    let text = String(raw || '')
      .replace(/\r/g, '\n')
      .replace(/^\s*(?:\[)?\d{1,2}:\d{2}(?::\d{2})?(?:\])?\s*/gm, '')
      .replace(/(?<![\p{L}\p{N}])\d{1,2}:\d{2}(?::\d{2})?(?![\p{L}\p{N}])/gu, ' ')
      .replace(/(?:^|\s)(?:من\s+)?(?:ال)?ساعة\s*و?\s*\d+\s*(?:دقيقة|دقائق)(?:\s*و?\s*\d+\s*(?:ثانية|ثوان|ثواني))?(?![\p{L}\p{N}])/gu, ' ')
      .replace(/(?<![\p{L}\p{N}])\d+\s*(?:ساعة|ساعات|ساعتان)(?:\s*و?\s*\d+\s*(?:دقيقة|دقائق))?(?:\s*و?\s*\d+\s*(?:ثانية|ثوان|ثواني))?(?![\p{L}\p{N}])/gu, ' ')
      .replace(/(?<![\p{L}\p{N}])\d+\s*(?:دقيقة|دقائق)(?:\s*و?\s*\d+\s*(?:ثانية|ثوان|ثواني))?(?![\p{L}\p{N}])/gu, ' ')
      .replace(/(?<![\p{L}\p{N}])\d+\s*(?:ثانية|ثوان|ثواني)(?![\p{L}\p{N}])/gu, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
    DIALECT_RULES.forEach(([pattern,replacement])=>{
      // \b لا يتعرّف إلى حدود الكلمات العربية في JavaScript؛ نحوله إلى حد Unicode حقيقي.
      const source = pattern.source.startsWith('\\b') && pattern.source.endsWith('\\b')
        ? `(?<![\\p{L}\\p{N}_])${pattern.source.slice(2,-2)}(?![\\p{L}\\p{N}_])`
        : pattern.source;
      text=text.replace(new RegExp(source, pattern.flags),replacement);
    });
    return text.replace(FILLERS,' ').replace(/\s+([،؛.!؟])/g,'$1').replace(/ {2,}/g,' ').trim();
  }

  function splitSentences(text) {
    return text.split(/(?<=[.!؟!?؛])\s+|\n+/u)
      .map((sentence) => sentence.replace(/^[-–—•\s]+/, '').trim())
      .filter((sentence) => sentence.length >= 32 && sentence.length <= 420 && tokens(sentence).length >= 5 && !NOISE.test(normalize(sentence)))
      .filter((sentence)=>!/(?:^|\s)(?:ساعة|دقيقة|ثانية|ثواني)(?:\s|$)/u.test(sentence))
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

  function uniqueAcross(groups) {
    const used = [];
    return groups.map((group) => group.filter((item) => {
      if (used.some((picked) => similarity(item, picked) > 0.48)) return false;
      used.push(item); return true;
    }));
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
    // ملخص ثابت الحجم تقريباً مهما طالت المحاضرة: القيمة لا إعادة كتابة النص.
    const executive = choose(sentences, Math.min(10, Math.max(7, Math.ceil(Math.log2(sentences.length) * 1.15))), freq);
    const bySignal = (name, limit) => choose(sentences.filter((item) => SIGNALS[name].test(normalize(item.text))), limit, freq);
    let actions = bySignal('action', 6);
    let notes = choose([
      ...sentences.filter((item) => SIGNALS.definition.test(normalize(item.text))),
      ...sentences.filter((item) => SIGNALS.warning.test(normalize(item.text))),
      ...sentences.filter((item) => SIGNALS.example.test(normalize(item.text)))
    ], 5, freq);
    [actions, notes] = uniqueAcross([actions.filter((item) => !executive.some((main) => similarity(item, main) > 0.48)), notes]);
    const urls = [...new Set(String(raw).match(/https?:\/\/[^\s<>"']+/gi) || [])].slice(0, 15);
    const topWords = keywords(sentences, 12);
    const opening = executive.slice(0, 2).map((item) => item.text).join(' ');
    const takeaways = executive.slice(2);
    return `# خلاصة المحاضرة: ${title}\n\n## موضوع المحاضرة وفائدتها\n${opening}\n\n## أهم النتائج والأفكار\n${bullets(takeaways, 'لم تتوفر أفكار واضحة كافية في النص.')}\n\n## كيف أستفيد منها عمليًا؟\n${bullets(actions, 'لم تتضمن المحاضرة خطوات تطبيقية صريحة؛ فائدتها معرفية أو تفسيرية بالدرجة الأولى.')}\n\n## ملاحظات مهمة للرجوع إليها\n${bullets(notes, 'لا توجد ملاحظات إضافية مؤثرة خارج الخلاصة.')}\n\n## المواقع والروابط المذكورة\n${urls.length ? urls.map((url) => `- ${url}`).join('\n') : '- لم يظهر رابط مكتوب بوضوح داخل نص المحاضرة.'}\n\n## كلمات تساعد في البحث داخل المنصة\n${topWords.join('، ')}\n\n> صيغت الخلاصة بالعربية الفصحى المبسطة، وحُذفت التوقيتات والمقدمات والتكرار والنقاشات غير الضرورية.`;
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
