(() => {
  'use strict';
  const esc = (v='') => String(v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = (m) => { if (window.slcWorkspace?.toast) window.slcWorkspace.toast(m); else alert(m); };
  let currentCourse = null;

  function ensureModal() {
    if (document.getElementById('courseSeriesModal')) return;
    const node = document.createElement('div');
    node.className='modal'; node.id='courseSeriesModal'; node.setAttribute('aria-hidden','true');
    node.innerHTML=`<div class="modal-card lecture-modal-card course-series-card"><button class="modal-close" id="closeCourseSeries">×</button><span class="eyebrow">Course Series</span><h2 id="seriesTitle">أيام الدورة</h2><p class="auth-note" id="seriesMeta"></p><div id="seriesLectures"></div><button class="btn primary wide" id="buildCourseSummaryBtn">✨ إنشاء الخلاصة المجمعة للدورة</button><div id="seriesSummary" class="saved-summary-text hidden" style="margin-top:12px"></div><button class="btn ghost wide hidden" id="deleteCourseSummaryBtn" style="margin-top:8px">حذف الخلاصة المجمعة</button></div>`;
    document.body.appendChild(node);
    document.getElementById('closeCourseSeries').onclick=close;
    node.addEventListener('click',e=>{if(e.target===node) close();});
    document.getElementById('buildCourseSummaryBtn').onclick=buildCombined;
    document.getElementById('deleteCourseSummaryBtn').onclick=deleteCombined;
  }

  async function open(courseId) {
    ensureModal();
    if (!window.slcDB) return toast('قاعدة البيانات غير متاحة.');
    const [{data:course},{data:lectures,error},{data:summaries}] = await Promise.all([
      window.slcDB.from('slc_courses').select('id,title,provider_name,instructor_name').eq('id',courseId).maybeSingle(),
      window.slcDB.from('slc_lectures').select('id,title,module_name,lecture_order,duration_minutes,status,source_type').eq('course_id',courseId).order('lecture_order',{ascending:true}).order('created_at',{ascending:true}),
      window.slcDB.from('slc_summaries').select('lecture_id,summary_html').eq('course_id',courseId)
    ]);
    if(error) return toast(error.message);
    currentCourse={...course,lectures:lectures||[],summaries:summaries||[]};
    document.getElementById('seriesTitle').textContent=course?.title||'الدورة';
    document.getElementById('seriesMeta').textContent=[course?.provider_name,course?.instructor_name,`${currentCourse.lectures.length} محاضرة`].filter(Boolean).join(' · ');
    const summaryIds=new Set(currentCourse.summaries.filter(x=>x.lecture_id).map(x=>x.lecture_id));
    document.getElementById('seriesLectures').innerHTML=currentCourse.lectures.length?currentCourse.lectures.map((l,i)=>`<article class="series-day" data-id="${l.id}"><div class="series-day-main"><b>اليوم ${l.lecture_order||i+1}: ${esc(l.title)}</b><span>${esc(l.module_name||'')} ${l.duration_minutes?`· ${l.duration_minutes} دقيقة`:''} ${summaryIds.has(l.id)?'· ✅ ملخّصة':'· تحتاج خلاصة'}</span></div><div class="series-day-actions"><button class="text-btn series-open">فتح</button><button class="text-btn series-edit">تعديل</button><button class="course-delete series-delete">حذف</button></div></article>`).join(''):'<p class="muted-note">لا توجد محاضرات مرتبطة بهذه الدورة بعد. أضف محاضرة واختر هذا الكورس.</p>';
    document.querySelectorAll('.series-open').forEach(b=>b.onclick=()=>openLecture(courseId,b.closest('.series-day').dataset.id));
    document.querySelectorAll('.series-edit').forEach(b=>b.onclick=()=>{close();window.slcLecturePortal?.openEditLecture(b.closest('.series-day').dataset.id);});
    document.querySelectorAll('.series-delete').forEach(b=>b.onclick=async()=>{const ok=await window.slcLecturePortal?.deleteById(b.closest('.series-day').dataset.id);if(ok)open(courseId);});
    const saved=currentCourse.summaries.find(x=>!x.lecture_id)?.summary_html;
    const out=document.getElementById('seriesSummary'); out.textContent=saved||''; out.classList.toggle('hidden',!saved||!currentCourse.lectures.length);
    document.getElementById('deleteCourseSummaryBtn').classList.toggle('hidden',!saved||!currentCourse.lectures.length);
    const build=document.getElementById('buildCourseSummaryBtn');
    const summarizedCount=currentCourse.summaries.filter(x=>x.lecture_id&&x.summary_html).length;
    build.disabled=!currentCourse.lectures.length||!summarizedCount;
    build.textContent=!currentCourse.lectures.length?'أضف محاضرات أولًا':!summarizedCount?'لخّص أحد أيام الدورة أولًا':'✨ إنشاء الخلاصة المجمعة للدورة';
    const modal=document.getElementById('courseSeriesModal'); modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
  }

  function close(){const m=document.getElementById('courseSeriesModal');m?.classList.remove('open');m?.setAttribute('aria-hidden','true');}
  function openLecture(courseId,lectureId){localStorage.setItem('slc_current_course_id',courseId);localStorage.setItem('slc_current_lecture_id',lectureId);close();window.SLCNavigation?.showView('workspace');}

  async function buildCombined(){
    const parts=currentCourse.summaries.filter(x=>x.lecture_id&&x.summary_html).map((x,i)=>`اليوم ${i+1}:\n${x.summary_html}`);
    if(!parts.length) return toast('لخّص يومًا واحدًا على الأقل أولًا.');
    let text=parts.join('\n\n');
    try{text=window.slcLectureSummarizer?.buildSummary(text,`الخلاصة المجمعة — ${currentCourse.title}`)||text;}catch(_e){}
    const {data:{user}}=await window.slcDB.auth.getUser();
    const {error}=await window.slcDB.from('slc_summaries').upsert({owner_id:user.id,course_id:currentCourse.id,lecture_id:null,summary_key:`course:${currentCourse.id}`,summary_html:text,updated_at:new Date().toISOString()},{onConflict:'summary_key'});
    if(error)return toast(error.message);
    const out=document.getElementById('seriesSummary');out.textContent=text;out.classList.remove('hidden');document.getElementById('deleteCourseSummaryBtn').classList.remove('hidden');toast('تم حفظ الخلاصة المجمعة للدورة');
  }
  async function deleteCombined(){
    if(!confirm('هل تريد حذف الخلاصة المجمعة فقط؟ لن تُحذف المحاضرات أو خلاصاتها الفردية.'))return;
    const {error}=await window.slcDB.from('slc_summaries').delete().eq('course_id',currentCourse.id).is('lecture_id',null);
    if(error)return toast(error.message);
    document.getElementById('seriesSummary').textContent='';document.getElementById('seriesSummary').classList.add('hidden');document.getElementById('deleteCourseSummaryBtn').classList.add('hidden');toast('تم حذف الخلاصة المجمعة');
  }
  window.slcCourseSeries={open};
})();
