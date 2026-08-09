(() => {
  'use strict';
  const esc = (v='') => String(v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = (m) => window.slcWorkspace?.toast(m) || alert(m);
  let currentCourse = null;

  function ensureModal() {
    if (document.getElementById('courseSeriesModal')) return;
    const node = document.createElement('div');
    node.className='modal'; node.id='courseSeriesModal'; node.setAttribute('aria-hidden','true');
    node.innerHTML=`<div class="modal-card lecture-modal-card course-series-card"><button class="modal-close" id="closeCourseSeries">×</button><span class="eyebrow">Course Series</span><h2 id="seriesTitle">أيام الدورة</h2><p class="auth-note" id="seriesMeta"></p><div id="seriesLectures"></div><button class="btn primary wide" id="buildCourseSummaryBtn">✨ إنشاء الخلاصة المجمعة للدورة</button><div id="seriesSummary" class="saved-summary-text hidden" style="margin-top:12px"></div></div>`;
    document.body.appendChild(node);
    document.getElementById('closeCourseSeries').onclick=close;
    node.addEventListener('click',e=>{if(e.target===node) close();});
    document.getElementById('buildCourseSummaryBtn').onclick=buildCombined;
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
    document.getElementById('seriesLectures').innerHTML=currentCourse.lectures.length?currentCourse.lectures.map((l,i)=>`<button class="series-day" data-id="${l.id}"><b>اليوم ${l.lecture_order||i+1}: ${esc(l.title)}</b><span>${esc(l.module_name||'')} ${l.duration_minutes?`· ${l.duration_minutes} دقيقة`:''} ${summaryIds.has(l.id)?'· ✅ ملخّصة':'· تحتاج خلاصة'}</span></button>`).join(''):'<p class="muted-note">لا توجد محاضرات مرتبطة بهذه الدورة بعد.</p>';
    document.querySelectorAll('.series-day').forEach(b=>b.onclick=()=>{localStorage.setItem('slc_current_course_id',courseId);localStorage.setItem('slc_current_lecture_id',b.dataset.id);close();document.querySelector('[data-view="workspace"]')?.click();});
    const saved=currentCourse.summaries.find(x=>!x.lecture_id)?.summary_html;
    const out=document.getElementById('seriesSummary'); out.textContent=saved||''; out.classList.toggle('hidden',!saved);
    const modal=document.getElementById('courseSeriesModal'); modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
  }

  function close(){const m=document.getElementById('courseSeriesModal');m?.classList.remove('open');m?.setAttribute('aria-hidden','true');}

  async function buildCombined(){
    const parts=currentCourse.summaries.filter(x=>x.lecture_id&&x.summary_html).map((x,i)=>`اليوم ${i+1}:\n${x.summary_html}`);
    if(!parts.length) return toast('لخّص يومًا واحدًا على الأقل أولًا.');
    let text=parts.join('\n\n');
    try{text=window.slcLectureSummarizer?.buildSummary(text,`الخلاصة المجمعة — ${currentCourse.title}`)||text;}catch(_e){}
    const {data:{user}}=await window.slcDB.auth.getUser();
    const {error}=await window.slcDB.from('slc_summaries').upsert({owner_id:user.id,course_id:currentCourse.id,lecture_id:null,summary_key:`course:${currentCourse.id}`,summary_html:text,updated_at:new Date().toISOString()},{onConflict:'summary_key'});
    if(error)return toast(error.message);
    const out=document.getElementById('seriesSummary');out.textContent=text;out.classList.remove('hidden');toast('تم حفظ الخلاصة المجمعة للدورة');
  }
  window.slcCourseSeries={open};
})();
