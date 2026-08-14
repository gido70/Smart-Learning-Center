const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('assets/js/app.js', 'utf8');
const moduleCode = fs.readFileSync('src/modules/lecture-workspace/unified-lecture-workspace.js', 'utf8');

assert(index.includes('مساحة المحاضرة الذكية'));
assert(index.includes('id="lectureLibrary"'));
assert(index.includes('id="lectureKnowledgeTools"'));
assert(!index.includes('data-view="replay"'));
assert(app.includes("requestedHash==='replay'?'live'"));
assert(app.includes('window.SLCNavigation={showView}'));
for (const tool of ['summary', 'ask', 'mindmap', 'quiz', 'review', 'report']) {
  assert(index.includes(`data-knowledge-tool="${tool}"`));
}
assert(moduleCode.includes("'التوقيت غير متاح'"));
assert(!moduleCode.includes('index) * 45'));

console.log('UNIFIED LECTURE WORKSPACE TEST PASSED');
