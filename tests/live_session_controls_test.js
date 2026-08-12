const assert = require("node:assert/strict");
const {
  SessionClock,
  isDistinctSlide,
  recoverDraft,
  stopAllTracks
} = require("../src/modules/live-learning/session-controls.js");

let now = 1000;
const clock = new SessionClock(() => now);
assert.equal(clock.start(), true, "تبدأ الجلسة");
now += 5000;
assert.equal(clock.pause(), true, "تتوقف الجلسة مؤقتًا");
assert.equal(clock.elapsedSeconds(), 5, "يثبت التوقيت أثناء الإيقاف");
now += 4000;
assert.equal(clock.elapsedSeconds(), 5, "لا يحتسب وقت التوقف");
assert.equal(clock.resume(), true, "تستأنف الجلسة نفسها");
now += 3000;
assert.equal(clock.finish(), true, "تنتهي الجلسة");
assert.equal(clock.elapsedSeconds(), 8, "يحفظ الوقت الفعلي");

assert.equal(isDistinctSlide([20, 20, 20], [21, 19, 20]), false, "يتجاهل التغير الصغير");
assert.equal(isDistinctSlide([0, 0, 0], [255, 255, 255]), true, "يلتقط التغير الواضح");

const draft = { duration_seconds: 12, slides: [], timeline: [] };
assert.deepEqual(recoverDraft({ getItem: () => JSON.stringify(draft) }, "draft"), draft, "يستعيد المسودة");
assert.equal(recoverDraft({ getItem: () => "bad json" }, "draft"), null, "يتجاهل المسودة التالفة");

let stopped = 0;
const stream = { getTracks: () => [{ stop: () => { stopped += 1; } }, { stop: () => { stopped += 1; } }] };
stopAllTracks([stream]);
assert.equal(stopped, 2, "يوقف كل المسارات عند الإنهاء");

console.log("LIVE SESSION CONTROLS TEST PASSED");
