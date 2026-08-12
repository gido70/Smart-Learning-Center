(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SLCLiveSessionControls = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  class SessionClock {
    constructor(now = () => Date.now()) {
      this.now = now;
      this.status = "idle";
      this.accumulatedMs = 0;
      this.resumedAt = null;
    }

    start() {
      if (this.status !== "idle" && this.status !== "finished") return false;
      this.accumulatedMs = 0;
      this.resumedAt = this.now();
      this.status = "active";
      return true;
    }

    pause() {
      if (this.status !== "active") return false;
      this.accumulatedMs += this.now() - this.resumedAt;
      this.resumedAt = null;
      this.status = "paused";
      return true;
    }

    resume() {
      if (this.status !== "paused") return false;
      this.resumedAt = this.now();
      this.status = "active";
      return true;
    }

    finish() {
      if (this.status === "active") this.accumulatedMs += this.now() - this.resumedAt;
      if (this.status === "idle" || this.status === "finished") return false;
      this.resumedAt = null;
      this.status = "finished";
      return true;
    }

    elapsedSeconds() {
      const running = this.status === "active" ? this.now() - this.resumedAt : 0;
      return Math.max(0, Math.floor((this.accumulatedMs + running) / 1000));
    }

    restore(snapshot = {}) {
      this.accumulatedMs = Math.max(0, Number(snapshot.duration_seconds || 0) * 1000);
      this.status = snapshot.status === "finished" ? "finished" : "paused";
      this.resumedAt = null;
    }
  }

  function frameFingerprint(imageData, width, height) {
    const cells = 16;
    const values = [];
    for (let y = 0; y < cells; y += 1) {
      for (let x = 0; x < cells; x += 1) {
        const px = Math.min(width - 1, Math.floor((x + 0.5) * width / cells));
        const py = Math.min(height - 1, Math.floor((y + 0.5) * height / cells));
        const index = (py * width + px) * 4;
        values.push(Math.round((imageData[index] + imageData[index + 1] + imageData[index + 2]) / 3));
      }
    }
    return values;
  }

  function frameDifference(previous, current) {
    if (!previous || !current || previous.length !== current.length) return 1;
    const changed = current.reduce((total, value, index) => total + Math.abs(value - previous[index]), 0);
    return changed / (current.length * 255);
  }

  function isDistinctSlide(previous, current, threshold = 0.12) {
    return !previous || frameDifference(previous, current) >= threshold;
  }

  function recoverDraft(storage, key) {
    try {
      const parsed = JSON.parse(storage.getItem(key));
      return parsed && Array.isArray(parsed.slides) && Array.isArray(parsed.timeline) ? parsed : null;
    } catch (_error) {
      return null;
    }
  }

  function stopAllTracks(streams) {
    streams.filter(Boolean).forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
  }

  return { SessionClock, frameFingerprint, frameDifference, isDistinctSlide, recoverDraft, stopAllTracks };
});
