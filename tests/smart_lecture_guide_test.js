const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('assets/css/app.css', 'utf8');
const script = fs.readFileSync('src/modules/lecture-workspace/smart-lecture-guide.js', 'utf8');

[
  'openSmartLectureGuideBtn',
  'smartLectureGuideModal',
  'ابدأ في 3 خطوات',
  'اختيار مصدر المحاضرة',
  'أثناء المحاضرة المباشرة',
  'الحفظ وإنهاء الجلسة',
  'بعد المحاضرة',
  'lectureKnowledgeTools',
  'lectureLibrary'
].forEach((token) => {
  if (!html.includes(token)) throw new Error(`Missing guide token: ${token}`);
});

['smart-lecture-guide-card', 'smart-guide-choice-grid'].forEach((token) => {
  if (!css.includes(token)) throw new Error(`Missing guide style: ${token}`);
});

['Escape', 'scrollIntoView', 'aria-hidden'].forEach((token) => {
  if (!script.includes(token)) throw new Error(`Missing guide behavior: ${token}`);
});

console.log('SMART LECTURE GUIDE TEST PASSED');
