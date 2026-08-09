
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const state = {
    mode: "audio",
    active: false,
    startedAt: null,
    timerId: null,
    stream: null,
    slideCount: 0,
    events: [],
    slides: [],
    questions: [],
    highlights: [],
    currentSlideDataUrl: null,
    important: false,
    revisitedSlideNumbers: []
  };

  const el = {
    modeSwitch: $("captureModeSwitch"),
    start: $("startLiveBtn"),
    finish: $("finishLiveBtn"),
    screen: $("studioScreen"),
    audioPlaceholder: $("audioPlaceholder"),
    presentationCapture: $("presentationCapture"),
    screenPreview: $("screenPreview"),
    slideCanvas: $("slideCanvas"),
    captureEmpty: $("captureEmpty"),
    modeLabel: $("studioModeLabel"),
    timer: $("studioTimer"),
    statusBadge: $("liveStatusBadge"),
    saveState: $("liveSaveState"),
    shareScreen: $("shareScreenBtn"),
    captureSlide: $("captureSlideBtn"),
    mic: $("microphoneBtn"),
    systemAudio: $("systemAudioBtn"),
    slideBadge: $("slideNumberBadge"),
    timeline: $("lectureTimeline"),
    slideMeta: $("currentSlideMeta"),
    slideImportance: $("slideImportance"),
    slideThumb: $("currentSlideThumb"),
    slideTitle: $("slideTitleInput"),
    slideNotes: $("slideNotesInput"),
    markImportant: $("markImportantBtn"),
    markRevisited: $("markRevisitedBtn"),
    saveSlideCard: $("saveSlideCardBtn"),
    summaryText: $("liveTranslationText"),
    refreshSummary: $("refreshLiveSummaryBtn"),
    highlights: $("liveHighlightsList"),
    question: $("liveQuestionInput"),
    questionBtn: $("liveQuestionBtn"),
    answer: $("liveAnswer"),
    exportJson: $("exportLiveJsonBtn"),
    exportTxt: $("exportLiveTxtBtn"),
    finishModal: $("finishLiveModal"),
    closeFinishModal: $("closeFinishLiveModal"),
    confirmFinish: $("confirmFinishLiveBtn"),
    lectureTitle: $("liveLectureTitle"),
    courseName: $("liveCourseName")
  };

  const formatTime = (seconds) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const elapsed = () => state.startedAt ? Math.floor((Date.now() - state.startedAt) / 1000) : 0;

  const toast = (message) => {
    const node = $("toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    setTimeout(() => node.classList.remove("show"), 2200);
  };

  function saveLocal() {
    const payload = buildLectureFile();
    localStorage.setItem("slc_live_studio_draft_v301", JSON.stringify(payload));
    if (el.saveState) {
      el.saveState.textContent = `● حُفظت المسودة ${new Date().toLocaleTimeString("ar")}`;
    }
  }

  function enrichSlides() {
    // يحسب مدة بقاء كل شريحة على الشاشة، وهل كُتبت عليها ملاحظة،
    // وكم سؤالاً طُرح أثناء عرضها — يُبنى وقت التصدير فقط، لا يُخزَّن مباشرة أثناء الجلسة.
    return state.slides.map((slide, index) => {
      const next = state.slides[index + 1];
      const windowEnd = next ? next.captured_at_seconds : elapsed();
      const questionsDuringSlide = state.questions.filter((q) => q.slide_id === slide.id).length;
      return {
        ...slide,
        duration_seconds: Math.max(0, windowEnd - slide.captured_at_seconds),
        has_note: Boolean(slide.notes && slide.notes.trim()),
        question_count: questionsDuringSlide
      };
    });
  }

  function buildLectureFile() {
    return {
      version: "3.0.1",
      mode: state.mode,
      active: state.active,
      title: el.lectureTitle?.value.trim() || "",
      course_name: el.courseName?.value.trim() || "",
      started_at: state.startedAt ? new Date(state.startedAt).toISOString() : null,
      duration_seconds: elapsed(),
      slides: enrichSlides(),
      timeline: state.events,
      questions: state.questions,
      highlights: state.highlights,
      quick_summary: el.summaryText?.textContent || "",
      saved_at: new Date().toISOString()
    };
  }

  function switchMode(mode) {
    state.mode = mode;
    $$("#captureModeSwitch [data-capture-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.captureMode === mode);
    });

    const labels = {
      audio: "وضع الصوت",
      presentation: "وضع العرض التقديمي",
      hybrid: "الوضع الهجين"
    };
    el.modeLabel.textContent = labels[mode];

    const showPresentation = mode !== "audio";
    el.presentationCapture.classList.toggle("hidden", !showPresentation);
    el.audioPlaceholder.classList.toggle("hidden", showPresentation);
    el.shareScreen.disabled = !showPresentation;
    el.captureSlide.disabled = !showPresentation;
    el.mic.classList.toggle("active", mode === "audio" || mode === "hybrid");
    el.systemAudio.classList.toggle("active", mode === "audio" || mode === "hybrid");

    addEvent("mode", "تغيير وضع الالتقاط", `تم اختيار ${labels[mode]}`, "⚙");
    saveLocal();
  }

  function startSession() {
    if (state.active) {
      toast("الجلسة تعمل بالفعل");
      return;
    }
    state.active = true;
    state.startedAt = Date.now();
    el.start.textContent = "● الجلسة تعمل";
    el.start.disabled = true;
    el.statusBadge.textContent = "LIVE";
    el.statusBadge.className = "tag red";
    state.timerId = setInterval(() => {
      el.timer.textContent = formatTime(elapsed());
    }, 1000);
    addEvent("session", "بدء الجلسة", `بدأت الجلسة في ${new Date().toLocaleTimeString("ar")}`, "●");
    saveLocal();
    toast("بدأت جلسة التعلم المباشر");
  }

  async function shareScreen() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast("المتصفح لا يدعم مشاركة الشاشة. استخدم Chrome أو Edge.");
      return;
    }
    try {
      state.stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 5, max: 10 } },
        audio: state.mode === "hybrid"
      });
      el.screenPreview.srcObject = state.stream;
      el.captureEmpty.classList.add("hidden");
      el.shareScreen.classList.add("active");
      addEvent("screen", "بدء مشاركة الشاشة", "تم اختيار نافذة أو شاشة للعرض التقديمي.", "🖥");
      state.stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        el.captureEmpty.classList.remove("hidden");
        el.shareScreen.classList.remove("active");
        addEvent("screen", "انتهاء مشاركة الشاشة", "توقفت مشاركة الشاشة.", "■");
      });
      saveLocal();
      toast("تم ربط شاشة العرض");
    } catch (error) {
      if (error.name !== "NotAllowedError") console.error(error);
      toast("لم يتم اختيار شاشة العرض");
    }
  }

  async function startMic() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast("المتصفح لا يدعم التقاط الصوت من الميكروفون.");
      return;
    }
    try {
      state.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      el.mic.classList.add("active");
      el.captureEmpty.classList.add("hidden");
      addEvent("audio", "تفعيل الميكروفون", "بدأ التقاط الصوت من الميكروفون.", "🎤");
      state.micStream.getAudioTracks()[0]?.addEventListener("ended", () => {
        el.mic.classList.remove("active");
        if (!state.stream && !state.systemAudioStream) el.captureEmpty.classList.remove("hidden");
        addEvent("audio", "توقف الميكروفون", "توقف التقاط الصوت من الميكروفون.", "■");
      });
      saveLocal();
      toast("تم تفعيل الميكروفون");
    } catch (error) {
      if (error.name === "NotAllowedError") {
        toast("رفض المتصفح إذن الميكروفون. فعّله من إعدادات الموقع (🔒 بجانب الرابط).");
      } else {
        console.error(error);
        toast("تعذر الوصول للميكروفون.");
      }
    }
  }

  async function startSystemAudio() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast("المتصفح لا يدعم التقاط صوت النظام. استخدم Chrome أو Edge.");
      return;
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const audioTracks = displayStream.getAudioTracks();
      if (!audioTracks.length) {
        displayStream.getTracks().forEach((track) => track.stop());
        toast("لم تختر مشاركة الصوت. أعد المحاولة وفعّل خيار \"مشاركة الصوت\" في نافذة المتصفح.");
        return;
      }
      displayStream.getVideoTracks().forEach((track) => track.stop());
      state.systemAudioStream = displayStream;
      el.systemAudio.classList.add("active");
      el.captureEmpty.classList.add("hidden");
      addEvent("audio", "تفعيل صوت النظام", "بدأ التقاط صوت النظام (صوت Zoom مثلاً).", "🔊");
      audioTracks[0]?.addEventListener("ended", () => {
        el.systemAudio.classList.remove("active");
        if (!state.stream && !state.micStream) el.captureEmpty.classList.remove("hidden");
        addEvent("audio", "توقف صوت النظام", "توقف التقاط صوت النظام.", "■");
      });
      saveLocal();
      toast("تم تفعيل صوت النظام");
    } catch (error) {
      if (error.name !== "NotAllowedError") console.error(error);
      toast("لم يتم تفعيل صوت النظام");
    }
  }

  function captureSlide() {
    if (!state.stream || !el.screenPreview.videoWidth) {
      toast("اختر شاشة Zoom أولًا");
      return;
    }
    const canvas = el.slideCanvas;
    const video = el.screenPreview;
    const maxWidth = 1280;
    const ratio = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * ratio);
    canvas.height = Math.round(video.videoHeight * ratio);
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.78);

    state.slideCount += 1;
    state.currentSlideDataUrl = dataUrl;
    state.important = false;
    el.slideBadge.textContent = `الشريحة ${state.slideCount}`;
    el.slideMeta.textContent = `الشريحة ${state.slideCount} · ${formatTime(elapsed())}`;
    el.slideImportance.textContent = "عادية";
    el.slideImportance.className = "tag blue";
    el.slideTitle.value = `الشريحة ${state.slideCount}`;
    el.slideNotes.value = "";
    el.slideThumb.innerHTML = `<img alt="الشريحة الحالية" src="${dataUrl}">`;

    const slide = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${state.slideCount}`,
      number: state.slideCount,
      captured_at_seconds: elapsed(),
      title: el.slideTitle.value,
      notes: "",
      important: false,
      revisited: false,
      image_data_url: dataUrl
    };
    state.slides.push(slide);
    if (el.markRevisited) el.markRevisited.textContent = "🔁 عاد إليها المحاضر";
    addEvent("slide", `الشريحة ${state.slideCount}`, "تم حفظ لقطة من شاشة العرض.", "🖼", slide.id);
    saveLocal();
    toast(`تم حفظ الشريحة ${state.slideCount}`);
  }

  function addEvent(type, title, text, icon = "•", relatedId = null) {
    const event = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      type,
      at_seconds: elapsed(),
      title,
      text,
      icon,
      related_id: relatedId
    };
    state.events.push(event);
    renderTimeline();
  }

  function renderTimeline() {
    if (!state.events.length) {
      el.timeline.innerHTML = '<div class="timeline-empty">ابدأ الجلسة أو احفظ أول شريحة ليظهر الخط الزمني هنا.</div>';
      return;
    }
    el.timeline.innerHTML = state.events.map((event) => `
      <article class="lecture-event ${event.type === "slide" ? "slide" : event.type === "question" ? "question" : event.type === "important" ? "important" : event.type === "note" ? "note" : ""}">
        <time>${formatTime(event.at_seconds)}</time>
        <span class="event-icon">${event.icon}</span>
        <div><h4>${escapeHtml(event.title)}</h4><p>${escapeHtml(event.text || "")}</p></div>
        <button data-event-id="${event.id}">عرض</button>
      </article>
    `).join("");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function markImportant() {
    if (!state.slides.length) {
      toast("احفظ شريحة أولًا");
      return;
    }
    state.important = !state.important;
    const slide = state.slides[state.slides.length - 1];
    slide.important = state.important;
    el.slideImportance.textContent = state.important ? "مهمة" : "عادية";
    el.slideImportance.className = state.important ? "tag red" : "tag blue";
    el.markImportant.textContent = state.important ? "★ تم تعليمها كمهمة" : "⭐ مهمة";
    if (state.important) {
      const highlight = `${slide.title || `الشريحة ${slide.number}`}: ${el.slideNotes.value.trim() || "شريحة مهمة"}`;
      state.highlights.push(highlight);
      addEvent("important", "شريحة مهمة", highlight, "⭐", slide.id);
      renderHighlights();
    }
    saveLocal();
  }

  function markRevisited() {
    if (!state.slides.length) {
      toast("احفظ شريحة أولًا");
      return;
    }
    const slide = state.slides[state.slides.length - 1];
    slide.revisited = !slide.revisited;
    el.markRevisited.textContent = slide.revisited ? "✓ عاد إليها المحاضر" : "🔁 عاد إليها المحاضر";
    if (slide.revisited) {
      addEvent("revisit", "عودة لشريحة سابقة", slide.title || `الشريحة ${slide.number}`, "🔁", slide.id);
    }
    saveLocal();
  }

  function saveSlideCard() {
    if (!state.slides.length) {
      toast("احفظ شريحة أولًا");
      return;
    }
    const slide = state.slides[state.slides.length - 1];
    slide.title = el.slideTitle.value.trim() || `الشريحة ${slide.number}`;
    slide.notes = el.slideNotes.value.trim();
    slide.important = state.important;

    addEvent("note", "بطاقة معرفة للشريحة", slide.notes || slide.title, "🧠", slide.id);
    if (slide.notes) {
      state.highlights.push(slide.notes);
      renderHighlights();
    }
    saveLocal();
    toast("تم حفظ بيانات الشريحة كبطاقة محلية");
  }

  function renderHighlights() {
    if (!state.highlights.length) {
      el.highlights.innerHTML = "<li>لم يتم تحديد نقاط مهمة بعد.</li>";
      return;
    }
    el.highlights.innerHTML = state.highlights.slice(-6).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function refreshSummary() {
    const notes = state.slides.map((slide) => slide.notes).filter(Boolean);
    const important = state.highlights.filter(Boolean);
    const questions = state.questions.map((item) => item.question);
    const parts = [];
    if (important.length) parts.push(`أهم النقاط: ${important.slice(-3).join("، ")}`);
    if (notes.length) parts.push(`ملاحظات الشرائح: ${notes.slice(-3).join("، ")}`);
    if (questions.length) parts.push(`أسئلة للمتابعة: ${questions.slice(-2).join("، ")}`);
    el.summaryText.textContent = parts.length ? parts.join("\n\n") : "لا توجد بيانات كافية بعد. احفظ بعض الشرائح أو أضف ملاحظات.";
    saveLocal();
    toast("تم تحديث الخلاصة الأولية");
  }

  function saveQuestion() {
    const question = el.question.value.trim();
    if (!question) return;
    const currentSlide = state.slides[state.slides.length - 1] || null;
    const item = { question, at_seconds: elapsed(), slide_id: currentSlide?.id || null };
    state.questions.push(item);
    addEvent("question", "سؤال أثناء المحاضرة", question, "❓");
    el.answer.textContent = "تم حفظ السؤال. سيظهر ضمن ملف المحاضرة للمراجعة والإجابة لاحقًا.";
    el.question.value = "";
    saveLocal();
    toast("تم حفظ السؤال");
  }

  function openFinishModal() {
    el.finishModal.classList.add("open");
    el.finishModal.setAttribute("aria-hidden", "false");
  }

  function closeFinishModal() {
    el.finishModal.classList.remove("open");
    el.finishModal.setAttribute("aria-hidden", "true");
  }

  function confirmFinish() {
    state.active = false;
    clearInterval(state.timerId);
    if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
    el.statusBadge.textContent = "انتهت";
    el.statusBadge.className = "tag green";
    el.start.disabled = false;
    el.start.textContent = "● بدء جلسة جديدة";
    refreshSummary();
    saveLocal();
    closeFinishModal();
    toast("تم إنشاء ملف المحاضرة وحفظه محليًا");
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportJson() {
    const data = buildLectureFile();
    download(`smart-learning-live-${Date.now()}.json`, JSON.stringify(data, null, 2), "application/json;charset=utf-8");
  }

  function exportTxt() {
    const data = buildLectureFile();
    const lines = [
      `العنوان: ${data.title || "محاضرة مباشرة"}`,
      `الدورة: ${data.course_name || "غير محدد"}`,
      `الوضع: ${data.mode}`,
      `المدة: ${formatTime(data.duration_seconds)}`,
      "",
      "=== الخلاصة ===",
      data.quick_summary,
      "",
      "=== الخط الزمني ===",
      ...data.timeline.map((event) => `${formatTime(event.at_seconds)} — ${event.title}: ${event.text || ""}`),
      "",
      "=== الشرائح ===",
      ...data.slides.map((slide) => `الشريحة ${slide.number}: ${slide.title} (${formatTime(slide.duration_seconds)}${slide.revisited ? " · تمت العودة إليها" : ""}${slide.question_count ? ` · ${slide.question_count} سؤال` : ""})\n${slide.notes || ""}`),
      "",
      "=== الأسئلة ===",
      ...data.questions.map((item) => `${formatTime(item.at_seconds)} — ${item.question}`)
    ];
    download(`smart-learning-live-${Date.now()}.txt`, lines.join("\n"), "text/plain;charset=utf-8");
  }

  el.modeSwitch?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-capture-mode]");
    if (button) switchMode(button.dataset.captureMode);
  });
  el.start?.addEventListener("click", startSession);
  el.shareScreen?.addEventListener("click", shareScreen);
  el.mic?.addEventListener("click", startMic);
  el.systemAudio?.addEventListener("click", startSystemAudio);
  el.captureSlide?.addEventListener("click", captureSlide);
  el.markImportant?.addEventListener("click", markImportant);
  el.markRevisited?.addEventListener("click", markRevisited);
  el.saveSlideCard?.addEventListener("click", saveSlideCard);
  el.refreshSummary?.addEventListener("click", refreshSummary);
  el.questionBtn?.addEventListener("click", saveQuestion);
  el.question?.addEventListener("keydown", (event) => { if (event.key === "Enter") saveQuestion(); });
  el.finish?.addEventListener("click", openFinishModal);
  el.closeFinishModal?.addEventListener("click", closeFinishModal);
  el.confirmFinish?.addEventListener("click", confirmFinish);
  el.exportJson?.addEventListener("click", exportJson);
  el.exportTxt?.addEventListener("click", exportTxt);
  el.slideNotes?.addEventListener("input", () => {
    if (state.slides.length) state.slides[state.slides.length - 1].notes = el.slideNotes.value;
    saveLocal();
  });
  el.slideTitle?.addEventListener("input", () => {
    if (state.slides.length) state.slides[state.slides.length - 1].title = el.slideTitle.value;
    saveLocal();
  });

  el.shareScreen.disabled = true;
  el.captureSlide.disabled = true;
  renderTimeline();
  renderHighlights();
})();
