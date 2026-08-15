
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const controls = window.SLCLiveSessionControls;
  const clock = new controls.SessionClock();
  const DRAFT_KEY = "slc_live_studio_draft_v352";
  const LAST_SESSION_KEY = "slc_live_studio_last_session_v352";
  const DRAFT_DB_NAME = "slc_live_studio";
  const DRAFT_STORE_NAME = "sessions";

  function openDraftDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error("IndexedDB غير متاح"));
      const request = indexedDB.open(DRAFT_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) db.createObjectStore(DRAFT_STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("تعذر فتح التخزين المحلي"));
    });
  }

  async function writeStoredSession(key, value) {
    const db = await openDraftDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(DRAFT_STORE_NAME, "readwrite");
      transaction.objectStore(DRAFT_STORE_NAME).put(value, key);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }

  async function readStoredSession(key) {
    const db = await openDraftDatabase();
    const value = await new Promise((resolve, reject) => {
      const transaction = db.transaction(DRAFT_STORE_NAME, "readonly");
      const request = transaction.objectStore(DRAFT_STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value;
  }

  async function deleteStoredSession(key) {
    try {
      const db = await openDraftDatabase();
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(DRAFT_STORE_NAME, "readwrite");
        transaction.objectStore(DRAFT_STORE_NAME).delete(key);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
      db.close();
    } catch (_error) {
      // لا تمنع عملية الإنهاء إذا تعذر تنظيف التخزين.
    }
    localStorage.removeItem(key);
  }

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
    revisitedSlideNumbers: [],
    status: "idle",
    autoCaptureId: null,
    lastFingerprint: null,
    slideFingerprints: [],
    recorder: null,
    recordingChunks: [],
    recordingBlob: null,
    transcript: "",
    replacingScreen: false,
    autoCaptureEnabled: true,
    pendingFingerprint: null,
    pendingFingerprintChecks: 0
  };

  const el = {
    modeSwitch: $("captureModeSwitch"),
    start: $("startLiveBtn"),
    pause: $("pauseLiveBtn"),
    resume: $("resumeLiveBtn"),
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
    reselectScreen: $("reselectScreenBtn"),
    captureSlide: $("captureSlideBtn"),
    mic: $("microphoneBtn"),
    systemAudio: $("systemAudioBtn"),
    autoCapture: $("autoCaptureBtn"),
    restoreDraftButton: $("restoreLiveDraftBtn"),
    audioStatus: $("liveAudioStatus"),
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
    exportAudio: $("exportLiveAudioBtn"),
    finishModal: $("finishLiveModal"),
    closeFinishModal: $("closeFinishLiveModal"),
    confirmFinish: $("confirmFinishLiveBtn"),
    lectureTitle: $("liveLectureTitle"),
    courseSelect: $("liveCourseSelect"),
    recordingUrl: $("liveRecordingUrl"),
    lectureOrder: $("liveLectureOrder"),
    sourceTools: $("studioSourceTools"),
    toggleTools: $("toggleStudioToolsBtn"),
    zoomIn: $("zoomInPreviewBtn"),
    zoomOut: $("zoomOutPreviewBtn"),
    fitPreview: $("fitPreviewBtn"),
    fullscreenPreview: $("fullscreenPreviewBtn"),
    exitFullscreenPreview: $("exitFullscreenPreviewBtn"),
    saveDraft: $("saveLiveDraftBtn"),
    discardSession: $("discardLiveSessionBtn"),
    slideViewerModal: $("slideViewerModal"),
    closeSlideViewer: $("closeSlideViewerBtn"),
    slideViewerImage: $("slideViewerImage"),
    slideViewerTitle: $("slideViewerTitle"),
    slideViewerMeta: $("slideViewerMeta"),
    previousSlide: $("previousSlideBtn"),
    nextSlide: $("nextSlideBtn")
  };
  let previewScale = 1;
  let viewedSlideIndex = -1;

  const formatTime = (seconds) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const elapsed = () => clock.elapsedSeconds();

  const toast = (message) => {
    const node = $("toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    setTimeout(() => node.classList.remove("show"), 2200);
  };

  async function saveLocal() {
    const payload = buildLectureFile();
    try {
      await writeStoredSession(DRAFT_KEY, payload);
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        ...payload,
        slides: payload.slides.map(({ image_data_url, ...slide }) => slide)
      }));
      if (el.saveState) el.saveState.textContent = `● حُفظت المسودة ${new Date().toLocaleTimeString("ar")}`;
    } catch (_error) {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          ...payload,
          slides: payload.slides.map(({ image_data_url, ...slide }) => slide)
        }));
        if (el.saveState) el.saveState.textContent = "● حُفظت البيانات دون صور كاملة";
      } catch (_fallbackError) {
        if (el.saveState) el.saveState.textContent = "تعذر حفظ المسودة: مساحة المتصفح ممتلئة";
      }
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
    const interactionAssistant = window.SLCLiveInteractionAssistant?.exportData?.() || null;
    const combinedTranscript = [state.transcript, interactionAssistant?.transcript].filter(Boolean).join(" ").trim();
    return {
      version: "3.5.5",
      mode: state.mode,
      active: state.active,
      status: state.status,
      title: el.lectureTitle?.value.trim() || "",
      course_id: el.courseSelect?.value || null,
      course_name: el.courseSelect?.selectedOptions?.[0]?.textContent || "",
      recording_url: el.recordingUrl?.value.trim() || "",
      lecture_order: Number(el.lectureOrder?.value || 0) || null,
      started_at: state.startedAt ? new Date(state.startedAt).toISOString() : null,
      duration_seconds: elapsed(),
      slides: enrichSlides(),
      timeline: state.events,
      questions: state.questions,
      highlights: state.highlights,
      transcript: combinedTranscript,
      interaction_assistant: interactionAssistant,
      recording: state.recordingBlob ? { type: state.recordingBlob.type, size: state.recordingBlob.size } : null,
      quick_summary: combinedTranscript ? (el.summaryText?.textContent || "") : "",
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
    addEvent("mode", "تغيير وضع الالتقاط", `تم اختيار ${labels[mode]}`, "⚙");
    saveLocal();
  }

  function resetFinishedSession() {
    if (state.status !== "finished") return;
    state.startedAt = null;
    state.events = [];
    state.slides = [];
    state.questions = [];
    state.highlights = [];
    state.slideCount = 0;
    state.currentSlideDataUrl = null;
    state.slideFingerprints = [];
    state.lastFingerprint = null;
    state.recordingChunks = [];
    state.recordingBlob = null;
    state.recorder = null;
    state.transcript = "";
    window.SLCLiveInteractionAssistant?.endSession?.();
    el.timer.textContent = "00:00:00";
    renderTimeline();
    renderHighlights();
  }

  async function clearCompletedWorkspace() {
    await deleteStoredSession(DRAFT_KEY);
    localStorage.removeItem("slc_live_draft_available");
    el.restoreDraftButton?.classList.add("hidden");
    resetFinishedSession();
    state.status = "idle";
    state.active = false;
    if (el.lectureTitle) el.lectureTitle.value = "";
    if (el.recordingUrl) el.recordingUrl.value = "";
    if (el.lectureOrder) el.lectureOrder.value = "";
    if (el.courseSelect) el.courseSelect.value = "";
    if (el.slideTitle) el.slideTitle.value = "";
    if (el.slideNotes) el.slideNotes.value = "";
    if (el.slideThumb) el.slideThumb.innerHTML = "<span>ستظهر آخر شريحة محفوظة هنا.</span>";
    el.start.disabled = false;
    el.start.textContent = "● بدء جلسة جديدة";
    el.pause.disabled = true;
    el.resume.disabled = true;
    el.statusBadge.textContent = "غير متصل";
    el.statusBadge.className = "tag red";
    if (el.saveState) el.saveState.textContent = "● جاهز لجلسة جديدة";
    syncSessionActionButtons();
  }

  function startSession() {
    if (state.active) return toast("الجلسة تعمل بالفعل");
    if (state.status === "paused") return toast("استخدم زر متابعة لاستكمال الجلسة الحالية");
    resetFinishedSession();
    window.SLCLiveInteractionAssistant?.beginSession?.();
    if (!clock.start()) return toast("تعذر بدء جلسة جديدة");
    state.active = true;
    state.status = "active";
    state.startedAt = Date.now();
    el.start.textContent = "● الجلسة تعمل";
    el.start.disabled = true;
    el.pause.disabled = false;
    el.resume.disabled = true;
    syncSessionActionButtons();
    el.statusBadge.textContent = "LIVE";
    el.statusBadge.className = "tag red";
    state.timerId = setInterval(() => {
      el.timer.textContent = formatTime(elapsed());
    }, 1000);
    addEvent("session", "بدء الجلسة", `بدأت الجلسة في ${new Date().toLocaleTimeString("ar")}`, "●");
    saveLocal();
    startRecorder();
    startAutoCapture();
    toast("بدأت جلسة التعلم المباشر");
  }

  function pauseSession() {
    if (!clock.pause()) return toast("لا توجد جلسة نشطة لإيقافها");
    state.active = false;
    state.status = "paused";
    clearInterval(state.timerId);
    stopAutoCapture();
    if (state.recorder?.state === "recording") state.recorder.pause();
    el.pause.disabled = true;
    el.resume.disabled = false;
    syncSessionActionButtons();
    el.statusBadge.textContent = "متوقفة مؤقتًا";
    el.statusBadge.className = "tag amber";
    addEvent("session", "إيقاف مؤقت", "توقف التوقيت والتسجيل والالتقاط التلقائي.", "⏸");
    saveLocal();
  }

  function resumeSession() {
    if (!clock.resume()) return toast("لا توجد جلسة متوقفة للمتابعة");
    state.active = true;
    state.status = "active";
    if (state.recorder?.state === "paused") state.recorder.resume(); else startRecorder();
    state.timerId = setInterval(() => { el.timer.textContent = formatTime(elapsed()); }, 1000);
    startAutoCapture();
    el.pause.disabled = false;
    el.resume.disabled = true;
    syncSessionActionButtons();
    el.statusBadge.textContent = "LIVE";
    el.statusBadge.className = "tag red";
    addEvent("session", "متابعة الجلسة", "استؤنف التوقيت والتسجيل والالتقاط.", "▶");
    saveLocal();
  }

  async function shareScreen(forceReplace = false) {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast("المتصفح لا يدعم مشاركة الشاشة. استخدم Chrome أو Edge.");
      return;
    }
    if (state.stream?.getVideoTracks().some((track) => track.readyState === "live") && !forceReplace) {
      state.replacingScreen = true;
      controls.stopAllTracks([state.stream]);
      state.stream = null;
      state.replacingScreen = false;
      el.screenPreview.srcObject = null;
      el.captureEmpty.classList.remove("hidden");
      el.shareScreen.classList.remove("active");
      el.shareScreen.setAttribute("aria-pressed", "false");
      el.shareScreen.textContent = "🖥 مشاركة العرض: متوقفة";
      stopAutoCapture();
      await restartRecorder();
      updateAudioStatus();
      return toast("تم إيقاف مشاركة العرض");
    }
    try {
      state.replacingScreen = Boolean(state.stream);
      if (state.stream) controls.stopAllTracks([state.stream]);
      state.stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 5, max: 10 } },
        audio: state.mode === "hybrid"
      });
      el.screenPreview.srcObject = state.stream;
      el.captureEmpty.classList.add("hidden");
      el.shareScreen.classList.add("active");
      el.shareScreen.setAttribute("aria-pressed", "true");
      el.shareScreen.textContent = "🖥 مشاركة العرض: تعمل";
      addEvent("screen", "بدء مشاركة الشاشة", "تم اختيار نافذة أو شاشة للعرض التقديمي.", "🖥");
      state.replacingScreen = false;
      state.stream.getVideoTracks()[0]?.addEventListener("ended", async () => {
        if (state.replacingScreen) return;
        el.captureEmpty.classList.remove("hidden");
        el.shareScreen.classList.remove("active");
        el.shareScreen.setAttribute("aria-pressed", "false");
        el.shareScreen.textContent = "🖥 مشاركة العرض: متوقفة";
        addEvent("screen", "انتهاء مشاركة الشاشة", "توقفت مشاركة الشاشة؛ حُفظت الجلسة كمسودة للمراجعة.", "■");
        await saveInterruptedDraft();
      });
      startAutoCapture();
      updateAudioStatus();
      if (state.active) startRecorder();
      saveLocal();
      toast("تم ربط شاشة العرض");
    } catch (error) {
      state.replacingScreen = false;
      if (error.name !== "NotAllowedError") console.error(error);
      toast("لم يتم اختيار شاشة العرض");
    }
  }

  async function startMic() {
    if (state.micStream?.getAudioTracks().some((track) => track.readyState === "live")) {
      controls.stopAllTracks([state.micStream]);
      state.micStream = null;
      el.mic.classList.remove("active");
      el.mic.setAttribute("aria-pressed", "false");
      el.mic.textContent = "🎤 صوتي: متوقف";
      addEvent("audio", "إيقاف الميكروفون", "تم منع التقاط الأصوات المحيطة.", "■");
      updateAudioStatus();
      await restartRecorder();
      return toast("تم إيقاف ميكروفونك");
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast("المتصفح لا يدعم التقاط الصوت من الميكروفون.");
      return;
    }
    try {
      state.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      el.mic.classList.add("active");
      el.mic.setAttribute("aria-pressed", "true");
      el.mic.textContent = "🔴 صوتي: يعمل — اضغط للإيقاف";
      el.captureEmpty.classList.add("hidden");
      addEvent("audio", "تفعيل الميكروفون", "بدأ التقاط الصوت من الميكروفون.", "🎤");
      state.micStream.getAudioTracks()[0]?.addEventListener("ended", () => {
        el.mic.classList.remove("active");
        el.mic.setAttribute("aria-pressed", "false");
        el.mic.textContent = "🎤 صوتي: متوقف";
        if (!state.stream && !state.systemAudioStream) el.captureEmpty.classList.remove("hidden");
        addEvent("audio", "توقف الميكروفون", "توقف التقاط الصوت من الميكروفون.", "■");
        updateAudioStatus();
      });
      updateAudioStatus();
      await restartRecorder();
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
    if (state.systemAudioStream?.getAudioTracks().some((track) => track.readyState === "live")) {
      controls.stopAllTracks([state.systemAudioStream]);
      state.systemAudioStream = null;
      window.dispatchEvent(new CustomEvent("slc:system-audio-changed", { detail: { track: null } }));
      el.systemAudio.classList.remove("active");
      el.systemAudio.setAttribute("aria-pressed", "false");
      el.systemAudio.textContent = "🔊 صوت المحاضرة: متوقف";
      addEvent("audio", "إيقاف صوت المحاضرة", "توقف التقاط صوت النظام.", "■");
      updateAudioStatus();
      await restartRecorder();
      return toast("تم إيقاف صوت المحاضرة");
    }
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
      window.dispatchEvent(new CustomEvent("slc:system-audio-changed", { detail: { track: audioTracks[0] } }));
      el.systemAudio.classList.add("active");
      el.systemAudio.setAttribute("aria-pressed", "true");
      el.systemAudio.textContent = "🔊 صوت المحاضرة: يعمل — اضغط للإيقاف";
      el.captureEmpty.classList.add("hidden");
      addEvent("audio", "تفعيل صوت النظام", "بدأ التقاط صوت النظام (صوت Zoom مثلاً).", "🔊");
      audioTracks[0]?.addEventListener("ended", () => {
        state.systemAudioStream = null;
        window.dispatchEvent(new CustomEvent("slc:system-audio-changed", { detail: { track: null } }));
        el.systemAudio.classList.remove("active");
        el.systemAudio.setAttribute("aria-pressed", "false");
        el.systemAudio.textContent = "🔊 صوت المحاضرة: متوقف";
        if (!state.stream && !state.micStream) el.captureEmpty.classList.remove("hidden");
        addEvent("audio", "توقف صوت النظام", "توقف التقاط صوت النظام.", "■");
        updateAudioStatus();
      });
      updateAudioStatus();
      await restartRecorder();
      saveLocal();
      toast("تم تفعيل صوت النظام");
    } catch (error) {
      if (error.name !== "NotAllowedError") console.error(error);
      toast("لم يتم تفعيل صوت النظام");
    }
  }

  function captureSlide(source = "manual", fingerprint = null) {
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

    if (!fingerprint) {
      const sample = document.createElement("canvas");
      sample.width = 160; sample.height = Math.max(90, Math.round(160 * canvas.height / canvas.width));
      const sampleContext = sample.getContext("2d", { willReadFrequently: true });
      sampleContext.drawImage(canvas, 0, 0, sample.width, sample.height);
      fingerprint = controls.frameFingerprint(sampleContext.getImageData(0, 0, sample.width, sample.height).data, sample.width, sample.height);
    }
    if (fingerprint && source === "automatic" && state.slideFingerprints.some((saved) => !controls.isDistinctSlide(saved, fingerprint))) return false;
    if (fingerprint) {
      state.lastFingerprint = fingerprint;
      state.slideFingerprints.push(fingerprint);
    }
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
      image_data_url: dataUrl,
      capture_source: source
    };
    state.slides.push(slide);
    if (el.markRevisited) el.markRevisited.textContent = "🔁 عاد إليها المحاضر";
    addEvent("slide", `الشريحة ${state.slideCount}`, "تم حفظ لقطة من شاشة العرض.", "🖼", slide.id);
    saveLocal();
    toast(`تم حفظ الشريحة ${state.slideCount}`);
    return true;
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
    const assistantTranscript = window.SLCLiveInteractionAssistant?.exportData?.()?.transcript || "";
    const notes = state.slides.flatMap((slide) => [slide.title, slide.notes]).filter(Boolean);
    const important = state.highlights.filter(Boolean);
    const questions = state.questions.map((item) => item.question).filter(Boolean);
    const sourceText = [state.transcript, assistantTranscript, ...notes, ...important, ...questions].filter(Boolean).join(". ").trim();
    if (!sourceText) {
      el.summaryText.textContent = "لا يتوفر نص حقيقي للتلخيص. احتفظ بالتسجيل واستخدم محرك تفريغ معتمد لاحقًا.";
      return toast("لا يمكن إنشاء ملخص دون نص حقيقي");
    }
    try {
      const detailed = window.slcLectureSummarizer?.buildSummary?.(sourceText, el.lectureTitle?.value.trim() || "المحاضرة الحالية");
      if (detailed) el.summaryText.textContent = detailed;
      else throw new Error("summarizer unavailable");
    } catch (_error) {
      const parts = [];
      if (important.length) parts.push(`أهم النقاط: ${important.slice(-5).join("، ")}`);
      if (notes.length) parts.push(`ملاحظات الشرائح: ${notes.slice(-5).join("، ")}`);
      if (questions.length) parts.push(`أسئلة للمتابعة: ${questions.slice(-4).join("، ")}`);
      el.summaryText.textContent = parts.length ? parts.join("\n\n") : sourceText.slice(0, 1200);
    }
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
    loadCourseOptions();
    el.finishModal.classList.add("open");
    el.finishModal.setAttribute("aria-hidden", "false");
  }

  function closeFinishModal() {
    el.finishModal.classList.remove("open");
    el.finishModal.setAttribute("aria-hidden", "true");
  }

  function closeFinishAndResetView(message) {
    closeFinishModal();
    window.scrollTo({ top: 0, behavior: "smooth" });
    el.finishModal?.querySelector(".finish-live-scroll")?.scrollTo({ top: 0 });
    if (message) toast(message);
  }

  function setFinishBusy(busy, label = "حفظ كمحاضرة مكتملة") {
    [el.confirmFinish, el.saveDraft, el.discardSession, el.closeFinishModal].forEach((button) => {
      if (button) button.disabled = busy;
    });
    if (el.confirmFinish) el.confirmFinish.textContent = busy ? "جاري الحفظ..." : label;
  }

  function dataUrlToBlob(dataUrl) {
    const [header, body] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bytes = atob(body); const array = new Uint8Array(bytes.length);
    for (let i=0;i<bytes.length;i+=1) array[i]=bytes.charCodeAt(i);
    return new Blob([array],{type:mime});
  }

  async function loadCourseOptions() {
    if (!el.courseSelect || !window.slcDB) return;
    const { data } = await window.slcDB.from('slc_courses').select('id,title,provider_name').order('created_at',{ascending:false});
    el.courseSelect.innerHTML='<option value="">اختر الدورة</option>'+(data||[]).map(c=>`<option value="${c.id}">${escapeHtml(c.provider_name?`${c.provider_name} — ${c.title}`:c.title)}</option>`).join('');
  }

  async function uploadSlides(userId, lectureId) {
    const saved=[];
    for (const slide of state.slides) {
      let storage_path=null;
      if (slide.image_data_url) {
        const path=`${userId}/${lectureId}/slide-${String(slide.number).padStart(3,'0')}.jpg`;
        const { error }=await window.slcDB.storage.from('slc-live-assets').upload(path,dataUrlToBlob(slide.image_data_url),{contentType:'image/jpeg',upsert:true});
        if (!error) storage_path=path;
      }
      const { image_data_url, ...metadata }=slide;
      saved.push({...metadata,storage_path});
    }
    return saved;
  }

  function renderFinishedState() {
    el.statusBadge.textContent = "انتهت";
    el.statusBadge.className = "tag green";
    el.start.disabled = false;
    el.start.textContent = "● بدء جلسة جديدة";
    el.pause.disabled = true;
    el.resume.disabled = true;
    syncSessionActionButtons();
  }

  async function confirmFinish() {
    const title=el.lectureTitle?.value.trim();
    const courseId=el.courseSelect?.value;
    if (window.slcDB && (!title || !courseId)) return toast('اكتب عنوان المحاضرة واختر الدورة.');
    setFinishBusy(true);
    try {
    await finishMedia();
    renderFinishedState();
    const localFile = buildLectureFile();
    try {
      await writeStoredSession(LAST_SESSION_KEY, { ...localFile, recording_blob: state.recordingBlob });
    } catch (_error) {
      if (el.saveState) el.saveState.textContent = "تعذر حفظ النسخة الكاملة؛ نزّل الملفات قبل مغادرة الصفحة";
    }
    await deleteStoredSession(DRAFT_KEY);
    if (state.recordingBlob && el.saveState) el.saveState.textContent = "تم حفظ الصوت مؤقتًا على هذا الجهاز — نزّله عند الحاجة";
    if (!window.slcDB) {
      setFinishBusy(false);
      await clearCompletedWorkspace();
      closeFinishAndResetView("تم إنهاء الجلسة وحفظها محليًا");
      return;
    }
    refreshSummary();
    const file=buildLectureFile();
    const {data:{user}}=await window.slcDB.auth.getUser();
    if (!user) { setFinishBusy(false); return toast('سجّل الدخول أولًا.'); }
    const {data:lecture,error}=await window.slcDB.from('slc_lectures').insert({owner_id:user.id,course_id:courseId,title,source_url:file.recording_url||null,source_type:'live',open_mode:file.recording_url?'external':'auto',module_name:'محاضرة مباشرة',lecture_order:file.lecture_order,duration_minutes:Math.max(1,Math.round(file.duration_seconds/60)),status:'completed',session_kind:'live',notes:file.highlights.join('\n'),transcript_text:file.transcript||null,archived_at:new Date().toISOString(),live_payload:{mode:file.mode,started_at:file.started_at,duration_seconds:file.duration_seconds,timeline:file.timeline,questions:file.questions,highlights:file.highlights,quick_summary:file.quick_summary}}).select('id').single();
    if(error){setFinishBusy(false);return toast(`تعذر حفظ المحاضرة: ${error.message}`);}
    const slides=await uploadSlides(user.id,lecture.id);
    await window.slcDB.from('slc_lectures').update({live_payload:{...file,slides,slides_count:slides.length}}).eq('id',lecture.id);
    if(file.quick_summary && file.quick_summary.length>20) await window.slcDB.from('slc_summaries').upsert({owner_id:user.id,course_id:courseId,lecture_id:lecture.id,summary_key:`lecture:${lecture.id}`,summary_html:file.quick_summary,updated_at:new Date().toISOString()},{onConflict:'summary_key'});
    localStorage.setItem('slc_current_course_id',courseId);localStorage.setItem('slc_current_lecture_id',lecture.id);
    localStorage.removeItem(DRAFT_KEY);
    setFinishBusy(false);
    await clearCompletedWorkspace();
    closeFinishAndResetView("تم حفظ المحاضرة المباشرة في المكتبة");
    } catch (error) {
      console.error(error);
      setFinishBusy(false);
      toast("تعذر إكمال الحفظ. بقيت الجلسة محفوظة محليًا ويمكن إعادة المحاولة.");
    }
  }

  function audioTracks() {
    return [state.stream, state.micStream, state.systemAudioStream]
      .filter(Boolean).flatMap((stream) => stream.getAudioTracks()).filter((track) => track.readyState === "live");
  }

  function updateAudioStatus() {
    const tracks = audioTracks();
    const connected = tracks.length > 0;
    const recording = state.recorder?.state === "recording";
    el.audioStatus.textContent = recording
      ? `● الصوت يُسجل فعليًا (${tracks.length} مصدر)`
      : connected
        ? "الصوت متصل — سيبدأ التسجيل مع الجلسة"
        : "لا يوجد صوت مسجل — اختر صوت المحاضرة أو أضف ميكروفونك";
    el.audioStatus.classList.toggle("connected", connected);
  }

  async function stopRecorder() {
    if (!state.recorder || state.recorder.state === "inactive") return;
    await new Promise((resolve) => {
      state.recorder.addEventListener("stop", resolve, { once: true });
      state.recorder.stop();
    });
    if (state.recordingChunks.length) {
      state.recordingBlob = new Blob(state.recordingChunks, { type: state.recorder.mimeType || "audio/webm" });
    }
  }

  async function restartRecorder() {
    if (!state.active) return;
    await stopRecorder();
    startRecorder();
  }

  function startRecorder() {
    if (!state.active || ["recording", "paused"].includes(state.recorder?.state) || typeof MediaRecorder === "undefined") return;
    const tracks = audioTracks();
    updateAudioStatus();
    if (!tracks.length) return;
    try {
      state.recorder = new MediaRecorder(new MediaStream(tracks));
      state.recorder.ondataavailable = (event) => { if (event.data.size) state.recordingChunks.push(event.data); };
      state.recorder.onstop = () => {
        if (state.recordingChunks.length) state.recordingBlob = new Blob(state.recordingChunks, { type: state.recorder.mimeType || "audio/webm" });
      };
      state.recorder.start(1000);
      updateAudioStatus();
    } catch (error) {
      console.error(error);
      updateAudioStatus();
    }
  }

  function stopAutoCapture() {
    clearInterval(state.autoCaptureId);
    state.autoCaptureId = null;
  }

  function startAutoCapture() {
    stopAutoCapture();
    if (!state.active || !state.stream || !state.autoCaptureEnabled) return;
    let unchangedChecks = 0;
    state.autoCaptureId = setInterval(() => {
      const video = el.screenPreview;
      if (!video.videoWidth || !state.active) return;
      const canvas = document.createElement("canvas");
      canvas.width = 160; canvas.height = Math.max(90, Math.round(160 * video.videoHeight / video.videoWidth));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const fingerprint = controls.frameFingerprint(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
      if (controls.isDistinctSlide(state.lastFingerprint, fingerprint, 0.055)) {
        const sameCandidate = state.pendingFingerprint && !controls.isDistinctSlide(state.pendingFingerprint, fingerprint, 0.025);
        state.pendingFingerprint = fingerprint;
        state.pendingFingerprintChecks = sameCandidate ? state.pendingFingerprintChecks + 1 : 1;
        if (state.pendingFingerprintChecks >= 2) {
          unchangedChecks = 0;
          state.pendingFingerprint = null;
          state.pendingFingerprintChecks = 0;
          captureSlide("automatic", fingerprint);
          if (el.audioStatus) el.audioStatus.textContent = `● رُصدت شريحة جديدة الآن · ${formatTime(elapsed())}`;
        }
      } else {
        state.pendingFingerprint = null;
        state.pendingFingerprintChecks = 0;
        unchangedChecks += 1;
        if (unchangedChecks % 5 === 0 && el.audioStatus) el.audioStatus.textContent = `مراقبة العرض تعمل · آخر فحص ${formatTime(elapsed())}`;
      }
    }, 900);
  }

  function toggleAutoCapture() {
    state.autoCaptureEnabled = !state.autoCaptureEnabled;
    el.autoCapture?.setAttribute("aria-pressed", String(state.autoCaptureEnabled));
    if (el.autoCapture) el.autoCapture.textContent = state.autoCaptureEnabled ? "⚡ الالتقاط التلقائي: سريع" : "⏸ الالتقاط التلقائي: متوقف";
    if (state.autoCaptureEnabled) startAutoCapture(); else stopAutoCapture();
    toast(state.autoCaptureEnabled ? "تم تشغيل متابعة الشرائح السريعة" : "تم إيقاف الالتقاط التلقائي");
  }

  async function finishMedia() {
    window.SLCLiveInteractionAssistant?.stopListening?.();
    clock.finish();
    state.active = false;
    state.status = "finished";
    clearInterval(state.timerId);
    stopAutoCapture();
    await stopRecorder();
    controls.stopAllTracks([state.stream, state.micStream, state.systemAudioStream]);
    state.stream = null; state.micStream = null; state.systemAudioStream = null;
    el.screenPreview.srcObject = null;
    el.mic.classList.remove("active");
    el.mic.setAttribute("aria-pressed", "false");
    el.mic.textContent = "🎤 صوتي: متوقف";
    el.systemAudio.classList.remove("active");
    el.systemAudio.setAttribute("aria-pressed", "false");
    el.systemAudio.textContent = "🔊 صوت المحاضرة: متوقف";
    el.shareScreen.classList.remove("active");
    el.shareScreen.setAttribute("aria-pressed", "false");
    el.shareScreen.textContent = "🖥 مشاركة العرض: متوقفة";
    updateAudioStatus();
    syncSessionActionButtons();
  }

  async function saveInterruptedDraft() {
    if (!["active", "paused"].includes(state.status)) {
      updateAudioStatus();
      return;
    }
    await finishMedia();
    state.status = "draft";
    syncSessionActionButtons();
    await writeStoredSession(DRAFT_KEY, buildLectureFile()).catch(() => saveLocal());
    el.statusBadge.textContent = "مسودة — انتهت مشاركة الشاشة";
    el.statusBadge.className = "tag amber";
    if (el.saveState) el.saveState.textContent = "● حُفظت مسودة آمنة بانتظار المراجعة";
    toast("انتهت مشاركة الشاشة وحُفظت الجلسة كمسودة");
  }

  async function keepSessionAsDraft() {
    setFinishBusy(true);
    try {
    await finishMedia();
    state.status = "draft";
    await writeStoredSession(DRAFT_KEY, buildLectureFile()).catch(() => saveLocal());
    localStorage.setItem("slc_live_draft_available", "1");
    setFinishBusy(false);
    state.status = "finished";
    resetFinishedSession();
    state.status = "idle";
    el.start.disabled = false;
    el.start.textContent = "● بدء جلسة جديدة";
    el.pause.disabled = true;
    el.resume.disabled = true;
    el.statusBadge.textContent = "غير متصل";
    el.statusBadge.className = "tag red";
    el.restoreDraftButton?.classList.remove("hidden");
    syncSessionActionButtons();
    closeFinishAndResetView("تم حفظ المسودة وإغلاق الجلسة — استعدها من الزر أعلى الصفحة");
    } catch (error) {
      console.error(error);
      setFinishBusy(false);
      toast("تعذر إغلاق المسودة، لكن بيانات الجلسة المحلية لم تُحذف.");
    }
  }

  async function discardCurrentSession() {
    if (!window.confirm("هل تريد حذف هذه الجلسة غير المعتمدة نهائيًا؟ لن تُحذف محاضرات المكتبة.")) return;
    await finishMedia();
    await deleteStoredSession(DRAFT_KEY);
    localStorage.removeItem("slc_live_draft_available");
    el.restoreDraftButton?.classList.add("hidden");
    closeFinishAndResetView();
    resetFinishedSession();
    state.status = "idle";
    renderFinishedState();
    el.statusBadge.textContent = "غير متصل";
    el.statusBadge.className = "tag red";
    toast("تم حذف الجلسة الحالية غير المعتمدة");
  }

  function syncSessionActionButtons() {
    const canFinish = ["active", "paused", "draft"].includes(state.status);
    $$("[data-live-finish]").forEach((button) => { button.disabled = !canFinish; });
    $$("[data-live-cancel]").forEach((button) => { button.disabled = !canFinish; });
  }

  function setPreviewScale(value) {
    previewScale = Math.max(0.6, Math.min(2.5, value));
    if (el.screenPreview) el.screenPreview.style.transform = `scale(${previewScale})`;
  }

  function openSlideViewerById(slideId) {
    const index = state.slides.findIndex((slide) => slide.id === slideId);
    if (index < 0 || !state.slides[index].image_data_url) return toast("لا توجد صورة محفوظة لهذا العنصر");
    viewedSlideIndex = index;
    renderSlideViewer();
    el.slideViewerModal.classList.add("open");
    el.slideViewerModal.setAttribute("aria-hidden", "false");
  }

  function renderSlideViewer() {
    const slide = state.slides[viewedSlideIndex];
    if (!slide) return;
    el.slideViewerImage.src = slide.image_data_url;
    el.slideViewerTitle.textContent = slide.title || `الشريحة ${slide.number}`;
    el.slideViewerMeta.textContent = `الشريحة ${slide.number} · ${formatTime(slide.captured_at_seconds)}`;
    el.previousSlide.disabled = viewedSlideIndex <= 0;
    el.nextSlide.disabled = viewedSlideIndex >= state.slides.length - 1;
  }

  async function restoreDraft() {
    let draft = null;
    try {
      draft = await readStoredSession(DRAFT_KEY);
    } catch (_error) {
      draft = controls.recoverDraft(localStorage, DRAFT_KEY);
    }
    if (!draft || (!draft.active && !["paused", "draft"].includes(draft.status))) return;
    state.mode = draft.mode || "audio";
    state.status = "paused";
    state.slides = draft.slides || [];
    state.events = draft.timeline || [];
    state.questions = draft.questions || [];
    state.highlights = draft.highlights || [];
    window.SLCLiveInteractionAssistant?.restoreSession?.(draft.interaction_assistant || {});
    state.slideCount = state.slides.length;
    clock.restore(draft);
    el.timer.textContent = formatTime(elapsed());
    el.start.disabled = true;
    el.resume.disabled = false;
    el.statusBadge.textContent = "مسودة مستعادة — متوقفة";
    el.statusBadge.className = "tag amber";
    renderTimeline(); renderHighlights();
    toast("تمت استعادة الجلسة المؤقتة؛ أعد توصيل مصادر الوسائط ثم تابع");
    el.restoreDraftButton?.classList.add("hidden");
  }

  window.addEventListener("beforeunload", (event) => {
    if (state.status !== "active" && state.status !== "paused") return;
    saveLocal();
    event.preventDefault();
    event.returnValue = "";
  });

  function download(filename, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
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
      "=== النص الكامل للمحاضرة ===",
      data.transcript || "لا يوجد نص محفوظ",
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

  async function exportAudio() {
    let blob = state.recordingBlob;
    if (!blob) {
      const saved = await readStoredSession(LAST_SESSION_KEY).catch(() => null);
      blob = saved?.recording_blob || null;
    }
    if (!blob) return toast("لا توجد نسخة صوت محلية متاحة على هذا الجهاز");
    download(`smart-learning-recording-${Date.now()}.webm`, blob, blob.type || "audio/webm");
  }

  window.addEventListener("slc:assistant-save-suggestion", (event) => {
    const item = event.detail;
    if (!item?.text) return;
    const alreadySaved = state.events.some((entry) => entry.assistant_id === item.id);
    if (alreadySaved) return;
    if (item.type === "question") {
      state.questions.push({
        question: item.text,
        at_seconds: item.at_seconds ?? elapsed(),
        slide_id: null,
        source: item.source || "assistant",
        assistant_id: item.id
      });
      addEvent("question", "سؤال مقترح محفوظ", item.text, "❓");
    } else {
      state.highlights.push(item.text);
      addEvent("important", "مداخلة مقترحة محفوظة", item.text, "💡");
      renderHighlights();
    }
    const lastEvent = state.events[state.events.length - 1];
    if (lastEvent) lastEvent.assistant_id = item.id;
    saveLocal();
  });

  window.SLCLiveAudio = {
    getSystemAudioTrack: () => state.systemAudioStream?.getAudioTracks()?.find((track) => track.readyState === "live") || null
  };

  el.modeSwitch?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-capture-mode]");
    if (button) switchMode(button.dataset.captureMode);
  });
  el.start?.addEventListener("click", startSession);
  el.pause?.addEventListener("click", pauseSession);
  el.resume?.addEventListener("click", resumeSession);
  el.shareScreen?.addEventListener("click", () => shareScreen(false));
  el.reselectScreen?.addEventListener("click", () => shareScreen(true));
  el.mic?.addEventListener("click", startMic);
  el.systemAudio?.addEventListener("click", startSystemAudio);
  el.autoCapture?.addEventListener("click", toggleAutoCapture);
  el.restoreDraftButton?.addEventListener("click", restoreDraft);
  el.captureSlide?.addEventListener("click", () => captureSlide("manual"));
  el.markImportant?.addEventListener("click", markImportant);
  el.markRevisited?.addEventListener("click", markRevisited);
  el.saveSlideCard?.addEventListener("click", saveSlideCard);
  el.refreshSummary?.addEventListener("click", refreshSummary);
  el.questionBtn?.addEventListener("click", saveQuestion);
  el.question?.addEventListener("keydown", (event) => { if (event.key === "Enter") saveQuestion(); });
  el.finish?.addEventListener("click", openFinishModal);
  $$("[data-live-finish]").forEach((button) => button.addEventListener("click", openFinishModal));
  $$("[data-live-cancel]").forEach((button) => button.addEventListener("click", discardCurrentSession));
  el.closeFinishModal?.addEventListener("click", closeFinishModal);
  el.confirmFinish?.addEventListener("click", confirmFinish);
  el.saveDraft?.addEventListener("click", keepSessionAsDraft);
  el.discardSession?.addEventListener("click", discardCurrentSession);
  el.toggleTools?.addEventListener("click", () => {
    const collapsed = el.sourceTools.classList.toggle("collapsed");
    el.toggleTools.setAttribute("aria-expanded", String(!collapsed));
    el.toggleTools.textContent = collapsed ? "☰ أدوات التسجيل" : "× إخفاء أدوات التسجيل";
  });
  el.zoomIn?.addEventListener("click", () => setPreviewScale(previewScale + 0.15));
  el.zoomOut?.addEventListener("click", () => setPreviewScale(previewScale - 0.15));
  el.fitPreview?.addEventListener("click", () => setPreviewScale(1));
  el.fullscreenPreview?.addEventListener("click", () => el.screen?.requestFullscreen?.());
  el.exitFullscreenPreview?.addEventListener("click", () => document.exitFullscreen?.());
  document.addEventListener("fullscreenchange", () => {
    el.exitFullscreenPreview?.classList.toggle("hidden", document.fullscreenElement !== el.screen);
    if (el.fullscreenPreview) el.fullscreenPreview.classList.toggle("hidden", document.fullscreenElement === el.screen);
  });
  el.timeline?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-event-id]");
    if (!button) return;
    const lectureEvent = state.events.find((item) => item.id === button.dataset.eventId);
    if (lectureEvent?.related_id) openSlideViewerById(lectureEvent.related_id);
    else toast("لا توجد صورة مرتبطة بهذا العنصر");
  });
  el.closeSlideViewer?.addEventListener("click", () => {
    el.slideViewerModal.classList.remove("open");
    el.slideViewerModal.setAttribute("aria-hidden", "true");
  });
  el.previousSlide?.addEventListener("click", () => { if (viewedSlideIndex > 0) { viewedSlideIndex -= 1; renderSlideViewer(); } });
  el.nextSlide?.addEventListener("click", () => { if (viewedSlideIndex < state.slides.length - 1) { viewedSlideIndex += 1; renderSlideViewer(); } });
  el.exportJson?.addEventListener("click", exportJson);
  el.exportTxt?.addEventListener("click", exportTxt);
  el.exportAudio?.addEventListener("click", exportAudio);
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
  updateAudioStatus();
  syncSessionActionButtons();
  if (localStorage.getItem("slc_live_draft_available") === "1") el.restoreDraftButton?.classList.remove("hidden");
})();
