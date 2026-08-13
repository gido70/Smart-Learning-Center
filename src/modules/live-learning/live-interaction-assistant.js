(() => {
  "use strict";

  const STORAGE_KEY = "slc_live_interaction_assistant_v1";
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const state = {
    recognition: null,
    listening: false,
    transcript: "",
    interim: "",
    suggestions: [],
    lastSuggestionText: "",
    ocrBusy: false,
    lastSlideSource: "",
    autoOcrTimer: null
  };

  const $ = (id) => document.getElementById(id);
  const nowSeconds = () => {
    const timer = $("studioTimer")?.textContent || "00:00:00";
    const parts = timer.split(":").map(Number);
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  };
  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved) return;
      state.transcript = saved.transcript || "";
      state.suggestions = Array.isArray(saved.suggestions) ? saved.suggestions : [];
    } catch (_error) {
      // يبدأ المساعد بحالة نظيفة إذا تلفت المسودة المحلية.
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      transcript: state.transcript,
      suggestions: state.suggestions,
      saved_at: new Date().toISOString()
    }));
    window.dispatchEvent(new CustomEvent("slc:assistant-updated", { detail: exportData() }));
  }

  function compactText(text, limit = 220) {
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, limit);
  }

  function meaningfulText(text) {
    const cleaned = compactText(text, 420);
    return cleaned.length >= 28 && cleaned !== state.lastSuggestionText;
  }

  function focusPhrase(text) {
    const words = compactText(text, 180)
      .replace(/[؟?!،,.;:()[\]{}]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !["الذي","التي","هذا","هذه","هناك","يمكن","يكون","كانت","ولكن","عندما","خلال","أيضا","أيضاً","حول","على","إلى","من","في"].includes(word));
    return words.slice(0, 7).join(" ") || compactText(text, 70);
  }

  function buildSuggestions(text, source, slideNumber = null) {
    if (!meaningfulText(text)) return;
    const excerpt = compactText(text, 260);
    const focus = focusPhrase(excerpt);
    state.lastSuggestionText = excerpt;
    const at = nowSeconds();
    const common = { at_seconds: at, source, slide_number: slideNumber, excerpt, status: "new" };

    addSuggestion({
      ...common,
      type: "question",
      title: "سؤال مقترح",
      text: `ما المقصود بـ «${focus}»؟ وما المثال العملي الذي يوضح أثره أو طريقة تطبيقه؟`
    });

    if (excerpt.length > 80) {
      addSuggestion({
        ...common,
        type: "intervention",
        title: "مداخلة مقترحة",
        text: `يمكن ربط هذه النقطة بالتطبيق العملي: «${focus}». ومن المفيد توضيح شروط نجاحها والمخاطر أو الاستثناءات المرتبطة بها.`
      });
    }
  }

  function addSuggestion(item) {
    const duplicate = state.suggestions.some((saved) =>
      saved.type === item.type && saved.text === item.text && Math.abs(saved.at_seconds - item.at_seconds) < 60
    );
    if (duplicate) return;
    state.suggestions.push({
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
      ...item
    });
    state.suggestions = state.suggestions.slice(-60);
    save();
    render();
  }

  function setStatus(message, tone = "") {
    const node = $("aiCompanionStatus");
    if (!node) return;
    node.textContent = message;
    node.className = `tag ${tone}`.trim();
  }

  function render() {
    const transcript = $("aiLiveTranscript");
    if (transcript) {
      transcript.textContent = state.transcript
        ? `${state.transcript}${state.interim ? ` ${state.interim}` : ""}`
        : "سيظهر التفريغ هنا بعد تشغيل الاستماع.";
    }
    const list = $("aiSuggestionList");
    if (!list) return;
    if (!state.suggestions.length) {
      list.innerHTML = '<div class="ai-suggestion-empty">لم تظهر مقترحات بعد. شغّل الاستماع أو حلّل الشريحة الحالية.</div>';
      return;
    }
    list.innerHTML = state.suggestions.slice().reverse().map((item) => `
      <article class="ai-suggestion-card ${item.type} ${item.status === "saved" ? "saved" : ""}" data-ai-id="${item.id}">
        <div class="ai-suggestion-head">
          <strong>${item.type === "question" ? "❓" : "💡"} ${escapeHtml(item.title)}</strong>
          <small>${formatTime(item.at_seconds)}${item.slide_number ? ` · شريحة ${item.slide_number}` : ""}</small>
        </div>
        <p>${escapeHtml(item.text)}</p>
        <details><summary>المقطع الذي بُني عليه الاقتراح</summary><small>${escapeHtml(item.excerpt)}</small></details>
        <div class="ai-suggestion-actions">
          <button data-ai-action="save">${item.status === "saved" ? "✓ محفوظة" : "حفظ للمناقشة"}</button>
          <button data-ai-action="copy">نسخ</button>
          <button data-ai-action="dismiss">استبعاد</button>
        </div>
      </article>
    `).join("");
  }

  function formatTime(seconds) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function configureRecognition() {
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = $("aiSpeechLanguage")?.value || "ar-SA";
    recognition.onstart = () => {
      state.listening = true;
      setStatus("● يستمع الآن", "red");
      const button = $("aiToggleListeningBtn");
      if (button) button.textContent = "■ إيقاف الاستماع";
    };
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) finalText += `${text} `;
        else interimText += `${text} `;
      }
      state.interim = compactText(interimText, 280);
      if (finalText.trim()) {
        const completed = compactText(finalText, 700);
        state.transcript = compactText(`${state.transcript} ${completed}`, 18000);
        buildSuggestions(completed, "speech");
        save();
      }
      render();
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed") setStatus("إذن الميكروفون مرفوض", "amber");
      else if (event.error !== "no-speech") setStatus(`تعذر التفريغ: ${event.error}`, "amber");
    };
    recognition.onend = () => {
      if (state.listening) {
        try { recognition.start(); } catch (_error) { state.listening = false; }
      }
      if (!state.listening) {
        setStatus("الاستماع متوقف", "blue");
        const button = $("aiToggleListeningBtn");
        if (button) button.textContent = "🎧 تشغيل الاستماع والتفريغ";
      }
    };
    return recognition;
  }

  function toggleListening() {
    if (!SpeechRecognition) {
      setStatus("التفريغ المباشر يحتاج Chrome أو Edge", "amber");
      return;
    }
    if (state.listening) {
      state.listening = false;
      state.recognition?.stop();
      return;
    }
    state.recognition = configureRecognition();
    try {
      state.recognition.start();
    } catch (_error) {
      setStatus("تعذر بدء الاستماع. أعد المحاولة.", "amber");
    }
  }

  function currentSlideContext() {
    const title = $("slideTitleInput")?.value || "";
    const notes = $("slideNotesInput")?.value || "";
    const meta = $("currentSlideMeta")?.textContent || "";
    const number = Number((meta.match(/الشريحة\s+(\d+)/) || [])[1] || 0) || null;
    const image = $("currentSlideThumb")?.querySelector("img")?.src || "";
    return { title, notes, number, image };
  }

  async function analyzeCurrentSlide(manual = true) {
    const slide = currentSlideContext();
    if (!slide.image && !slide.title && !slide.notes) {
      if (manual) setStatus("التقط شريحة أولًا", "amber");
      return;
    }
    let text = compactText(`${slide.title} ${slide.notes}`, 1500);
    if (slide.image && window.Tesseract && !state.ocrBusy) {
      state.ocrBusy = true;
      setStatus(`يقرأ الشريحة ${slide.number || ""}…`, "blue");
      try {
        const result = await window.Tesseract.recognize(slide.image, "ara+eng", {
          logger: (progress) => {
            if (progress.status === "recognizing text") {
              setStatus(`تحليل الشريحة ${Math.round((progress.progress || 0) * 100)}٪`, "blue");
            }
          }
        });
        text = compactText(`${text} ${result.data?.text || ""}`, 2500);
      } catch (_error) {
        if (manual) setStatus("تعذر OCR؛ استُخدم العنوان والملاحظات", "amber");
      } finally {
        state.ocrBusy = false;
      }
    }
    if (meaningfulText(text)) {
      buildSuggestions(text, "slide", slide.number);
      setStatus("تم تحليل الشريحة وحفظ المقترحات", "green");
    } else if (manual) {
      setStatus("لا يوجد نص كافٍ في الشريحة", "amber");
    }
  }

  function startAutoSlideWatch() {
    const thumb = $("currentSlideThumb");
    if (!thumb) return;
    const observer = new MutationObserver(() => {
      const slide = currentSlideContext();
      if (!slide.image || slide.image === state.lastSlideSource) return;
      state.lastSlideSource = slide.image;
      clearTimeout(state.autoOcrTimer);
      state.autoOcrTimer = setTimeout(() => analyzeCurrentSlide(false), 3500);
    });
    observer.observe(thumb, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  }

  function handleSuggestionAction(event) {
    const button = event.target.closest("[data-ai-action]");
    const card = event.target.closest("[data-ai-id]");
    if (!button || !card) return;
    const item = state.suggestions.find((entry) => entry.id === card.dataset.aiId);
    if (!item) return;
    if (button.dataset.aiAction === "save") {
      item.status = item.status === "saved" ? "new" : "saved";
      window.dispatchEvent(new CustomEvent("slc:assistant-save-suggestion", { detail: item }));
    } else if (button.dataset.aiAction === "copy") {
      navigator.clipboard?.writeText(item.text);
      setStatus("تم نسخ المقترح", "green");
    } else if (button.dataset.aiAction === "dismiss") {
      state.suggestions = state.suggestions.filter((entry) => entry.id !== item.id);
    }
    save();
    render();
  }

  function stopListening() {
    if (!state.listening) return;
    state.listening = false;
    state.recognition?.stop();
  }

  function beginSession() {
    stopListening();
    state.transcript = "";
    state.interim = "";
    state.suggestions = [];
    state.lastSuggestionText = "";
    state.lastSlideSource = "";
    save();
    render();
    setStatus("جاهز — شغّل الاستماع", "green");
  }

  function clearAssistant() {
    if (!window.confirm("هل تريد مسح التفريغ والمقترحات الخاصة بالجلسة الحالية؟")) return;
    state.transcript = "";
    state.interim = "";
    state.suggestions = [];
    state.lastSuggestionText = "";
    save();
    render();
    setStatus("تم مسح مساعد الجلسة", "blue");
  }

  function exportData() {
    return {
      transcript: state.transcript,
      suggestions: state.suggestions,
      saved_suggestions: state.suggestions.filter((item) => item.status === "saved"),
      generated_at: new Date().toISOString(),
      engine: "browser-speech-and-local-rules"
    };
  }

  function init() {
    load();
    $("aiToggleListeningBtn")?.addEventListener("click", toggleListening);
    $("aiAnalyzeSlideBtn")?.addEventListener("click", () => analyzeCurrentSlide(true));
    $("aiClearAssistantBtn")?.addEventListener("click", clearAssistant);
    $("aiSuggestionList")?.addEventListener("click", handleSuggestionAction);
    $("aiSpeechLanguage")?.addEventListener("change", () => {
      if (state.listening) {
        state.listening = false;
        state.recognition?.stop();
        setTimeout(toggleListening, 250);
      }
    });
    startAutoSlideWatch();
    render();
    setStatus(SpeechRecognition ? "جاهز — شغّل الاستماع" : "التفريغ يحتاج Chrome أو Edge", SpeechRecognition ? "green" : "amber");
  }

  window.SLCLiveInteractionAssistant = { exportData, analyzeCurrentSlide, stopListening, beginSession };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
