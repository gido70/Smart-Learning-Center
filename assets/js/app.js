const $=(s)=>document.querySelector(s), $$=(s)=>document.querySelectorAll(s);
const views=$$('.view'), navItems=$$('.nav-item[data-view]');
function showView(id){views.forEach(v=>v.classList.toggle('active',v.id===id));navItems.forEach(n=>n.classList.toggle('active',n.dataset.view===id));window.scrollTo({top:0,behavior:'smooth'});$('#sidebar').classList.remove('open');location.hash=id==='dashboard'?'':id}
navItems.forEach(n=>n.addEventListener('click',()=>showView(n.dataset.view)));$$('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));
$('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
const modal=$('#addModal');function openModal(){modal.classList.add('open');modal.setAttribute('aria-hidden','false')}function closeModal(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}
$('#quickAddBtn').addEventListener('click',openModal);$('#openAddModal')?.addEventListener('click',openModal);$('#closeModal').addEventListener('click',closeModal);modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
$$('.modal .btn.primary').forEach(b=>b.addEventListener('click',()=>{closeModal();toast('تمت إضافة المصدر إلى صندوق المعرفة')}));
$('#analyzeBtn')?.addEventListener('click',()=>toast('تم تحليل المحاضرة وعرض قرار المشاهدة'));
$('#startLiveBtn')?.addEventListener('click',e=>{e.target.textContent='■ إيقاف الجلسة';toast('بدأت الجلسة التجريبية: الترجمة والتلخيص يعملان الآن')});
$$('.choice').forEach(b=>b.addEventListener('click',()=>{$$('.choice').forEach(x=>x.classList.remove('active'));b.classList.add('active')}));
$$('.time-pills button').forEach(b=>b.addEventListener('click',()=>{$$('.time-pills button').forEach(x=>x.classList.remove('active'));b.classList.add('active')}));

document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus()}if(e.key==='Escape')closeModal()});
$('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){toast(`جاري البحث عن: ${e.target.value}`);showView('chat')}});

const replay=[['تحليل سياسات RLS في Supabase','02:18:40','90% فائدة في 24 دقيقة','green'],['بناء وكيل ذكاء اصطناعي في n8n','01:42:15','8 فصول · 12 خطوة عملية','purple'],['GitHub Actions للمبتدئين','03:05:00','يمكن تجاوز 41% من المحتوى','blue'],['أساسيات المحادثة الإنجليزية','01:15:20','34 مفردة · 12 تمريناً','orange'],['Whisper والتفريغ الصوتي','00:58:11','جاهز للمراجعة','green'],['بناء واجهة موبايل احترافية','02:44:02','مرتبط بمشروعين','purple']];
$('#replayCards').innerHTML=replay.map(x=>`<article class="content-card"><div class="content-cover ${x[3]}"><span class="tag">محاضرة مسجلة</span><b>${x[1]}</b></div><div class="content-body"><h3>${x[0]}</h3><p>${x[2]}</p><div class="card-meta"><span>تم التحليل</span><button class="text-btn">فتح</button></div></div></article>`).join('');
const courses=[['Supabase من الصفر إلى الاحتراف','12 محاضرة','57%','green'],['أتمتة الأعمال باستخدام n8n','18 محاضرة','31%','purple'],['اللغة الإنجليزية للمحادثة','40 محاضرة','22%','orange'],['GitHub وGitHub Pages','16 محاضرة','68%','blue'],['الذكاء الاصطناعي للمكتبات','10 محاضرات','45%','green'],['صناعة المحتوى بالذكاء الاصطناعي','14 محاضرة','12%','purple']];
$('#courseCards').innerHTML=courses.map(x=>`<article class="content-card"><div class="content-cover ${x[3]}"><span>${x[1]}</span><b>${x[2]}</b></div><div class="content-body"><h3>${x[0]}</h3><div class="progress"><i style="width:${x[2]}"></i></div><div class="card-meta"><span>آخر نشاط اليوم</span><button class="text-btn">متابعة</button></div></div></article>`).join('');
const cols={"بانتظار المعالجة":[['YT','وكيل AI كامل في n8n'],['X','خيط عن RAG والبحث الدلالي']],"قيد التحليل":[['IG','أخطاء GitHub الشائعة'],['PDF','دليل Supabase Security']],"جاهز للمراجعة":[['TK','فكرة أتمتة في 90 ثانية'],['FB','شرح سريع لـ Webhooks']]};
$('#inboxBoard').innerHTML=Object.entries(cols).map(([k,arr])=>`<section class="board-col"><h3>${k} <span class="badge">${arr.length}</span></h3>${arr.map(a=>`<article class="board-item"><span class="tag blue">${a[0]}</span><h4>${a[1]}</h4><p>أضيف اليوم · اضغط لفتح التفاصيل</p></article>`).join('')}</section>`).join('');
const micro=[['YT','3 طرق لتقليل تكلفة API','01:18'],['IG','كيف تكتب Prompt أفضل؟','00:47'],['TK','فكرة سريعة في Supabase','01:09'],['X','معلومة مهمة عن RLS','00:36'],['FB','شرح GitHub Pages','02:14'],['IG','نصيحة لتنظيم الكورسات','00:55']];
$('#microCards').innerHTML=micro.map((x,i)=>`<article class="micro-card"><div class="micro-cover">${x[0]}<small>${x[2]}</small></div><div class="micro-body"><h3>${x[1]}</h3><p>خلاصة · فكرة عملية · مرتبط بمشروع</p></div></article>`).join('');
const projects=[['أكاديمية الفلاح','7 مفاهيم مكتملة · 3 تحتاج مراجعة',['✓ Authentication','✓ RLS Policies','◌ Notifications']],['مركز التعلّم الذكي','12 مفهوماً · 5 مصادر جديدة',['✓ Knowledge Inbox','◌ Live Mode','◌ Semantic Search']],['حين تنطق الصور','8 مفاهيم · 4 مطبقة',['✓ Webhooks','✓ Google Sheets','◌ Auto Publishing']]];
$('#projectCards').innerHTML=projects.map(p=>`<article class="project-card"><span class="tag green">مشروع نشط</span><h3>${p[0]}</h3><p>${p[1]}</p><div class="project-checks">${p[2].map(s=>`<span>${s}</span>`).join('')}</div><button class="btn soft" style="margin-top:14px">فتح المشروع</button></article>`).join('');

const hash=location.hash.replace('#','');if(hash&&document.getElementById(hash))showView(hash);

// Learning Workspace interactions
const watchInsideBtn=$('#watchInsideBtn'), watchOutsideBtn=$('#watchOutsideBtn'), lessonFrame=$('#lessonFrame'), embedFallback=$('#embedFallback'), embedBadge=$('#embedBadge');
function setEmbedState(supported){
  if(!lessonFrame||!embedFallback||!embedBadge)return;
  lessonFrame.style.display=supported?'block':'none';
  embedFallback.classList.toggle('show',!supported);
  embedBadge.textContent=supported?'● يدعم العرض داخل المنصة':'● المصدر الأصلي فقط';
  embedBadge.classList.toggle('supported',supported);embedBadge.classList.toggle('blocked',!supported);
  watchInsideBtn.disabled=!supported;watchInsideBtn.style.opacity=supported?'1':'.55';
}
$('#toggleEmbedBtn')?.addEventListener('click',()=>{const nowBlocked=embedFallback.classList.contains('show');setEmbedState(nowBlocked);toast(nowBlocked?'تم تفعيل العرض الداخلي التجريبي':'تمت محاكاة مصدر يمنع التضمين')});
$('#resumeBtn')?.addEventListener('click',()=>{showView('workspace');toast('سيتم الاستئناف من آخر نقطة محفوظة: '+($('#lastPoint')?.textContent||'24:36'))});
$('#savePointBtn')?.addEventListener('click',()=>{const point='31:42';$('#lastPoint').textContent=point;$('#workspaceMeta').textContent='YouTube · ساعتان و18 دقيقة · آخر مشاهدة عند '+point;localStorage.setItem('slc_last_point',point);toast('تم حفظ نقطة التوقف عند '+point)});
const savedPoint=localStorage.getItem('slc_last_point');if(savedPoint&&$('#lastPoint')){$('#lastPoint').textContent=savedPoint;$('#workspaceMeta').textContent='YouTube · ساعتان و18 دقيقة · آخر مشاهدة عند '+savedPoint}
$$('.workspace-tabs button').forEach(btn=>btn.addEventListener('click',()=>{$$('.workspace-tabs button').forEach(b=>b.classList.remove('active'));$$('.workspace-tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');$('#'+btn.dataset.tab+'Tab').classList.add('active')}));
$('#saveNotesBtn')?.addEventListener('click',()=>{localStorage.setItem('slc_lesson_notes',$('#lessonNotes').value);toast('تم حفظ ملاحظات المحاضرة')});
if($('#lessonNotes'))$('#lessonNotes').value=localStorage.getItem('slc_lesson_notes')||'';
$('#workspaceAskBtn')?.addEventListener('click',()=>{$('#workspaceAnswer').textContent='إجابة تجريبية: يشرح المحاضر تفعيل RLS وربط السياسة بالمستخدم الحالي عند الدقيقة 36:10.';toast('تم تحليل السؤال داخل سياق المحاضرة')});
$$('#replayCards .text-btn, #courseCards .text-btn').forEach(b=>b.addEventListener('click',()=>showView('workspace')));
