(function () {
  const root = document.getElementById('digitalProductCamp');
  if (!root) return;

  const STORAGE_KEY = 'slc_digital_product_camp_v366';
  const axes = [
    { id: 1, title: 'من أنت؟ ومن عميلك؟', steps: [1,2,3,4], tone: 'teal' },
    { id: 2, title: 'ماذا تقدّم له؟', steps: [5,6,7,8,9], tone: 'blue' },
    { id: 3, title: 'كيف يصله منتجك؟', steps: [10,11,12,13,14], tone: 'violet' },
    { id: 4, title: 'كيف تربح منه؟', steps: [15,16,17], tone: 'amber' },
    { id: 5, title: 'كيف تصمّمه وتبنيه؟', steps: [18,19,20,21], tone: 'rose' },
    { id: 6, title: 'كيف تستدام وتنمو؟', steps: [22,23,24], tone: 'green' }
  ];

  const steps = [
    [1,1,'تحديد مجال الخبرة ورأس المال المعرفي','رأس المال المعرفي = سنوات التخصص + الإنتاج العلمي الموثق + الخبرة التطبيقية − ما هو متاح مجانًا ومكرر لدى غيرك',['ما الموضوع الذي كلما تحدثت فيه شعر الحضور أنهم أمام مرجعية لا مجرد متحدث؟','ما الذي تُسأل عنه بتكرار من زملائك أو طلابك أو جمهورك ولم تدوّنه بعد بصورة منهجية؟','أي من إنتاجك العلمي يمكن أن يتحول من معرفة محفوظة إلى منتج؟'],'بيان دقيق من جملة واحدة يحدد مجال خبرتك القابل للتحويل إلى منتج.'],
    [2,1,'اختيار العميل الأساسي','العميل الأساسي = الأشد معاناة من المشكلة ∩ الأقدر على الدفع ∩ الأسهل وصولًا عبر شبكتك',['من الذي يطرح عليك هذا السؤال بإلحاح أكبر من غيره؟','من الذي إن حصل على إجابتك غيّر مسار عمله أو بحثه أو مسيرته المهنية؟','أي شريحة تصلها اليوم فعليًا عبر منصاتك أو شبكتك؟'],'وصف دقيق لشريحة واحدة لا أكثر هي عميلك الأساسي.'],
    [3,1,'رحلة العميل الكاملة','قيمة المنتج = وضوح ما قبل + عمق الأثر أثناء + استدامة التحول بعد',['ما حال عميلك قبل أن يعرفك؟','ما الذي يجب أن يحدث أثناء رحلته معك ليتحقق التحول المنشود؟','كيف تريده أن يكون بعد ثلاثة أشهر من إتمام المنتج؟'],'خريطة رحلة مختصرة من ثلاث محطات: قبل، أثناء، بعد.'],
    [4,1,'تقدير حجم السوق المتاح','السوق المتاح = عدد أفراد الشريحة × نسبة القادرين والراغبين في الدفع × متوسط القيمة المدفوعة',['كم عدد من تصلهم مباشرة عبر شبكتك ومنصاتك؟','ما النسبة الواقعية ممن سيدفعون فعلًا؟','ما السعر الذي يليق بقيمة ما تقدمه؟'],'رقم تقديري أولي لحجم السوق المتاح لك.'],
    [5,2,'تحديد أهم عشر احتياجات','الاحتياج الأقوى = الألم المتكرر × غياب حل منهجي متاح × استعداد فوري للحل',['ما الأسئلة أو المشكلات العشر الأكثر تكرارًا لدى جمهورك؟','أيها لا يوجد له حل منهجي متاح حاليًا في السوق العربي؟'],'قائمة مرتبة بأولوية الاحتياجات الثلاثة الأولى التي سيعالجها منتجك.'],
    [6,2,'صياغة عرض القيمة الفريد','عرض القيمة الفريد = ما تقدمه − ما هو متاح في السوق + بصمتك العلمية الخاصة',['ما الذي تقدمه ولا يستطيع محتوى عام تقديمه؟','أي إسناد علمي أو تجربة ميدانية تمنح كلامك ثقلًا؟'],'جملة عرض قيمة واضحة وموجزة تستخدم في كل مادة تسويقية للمنتج.'],
    [7,2,'اختيار صيغة المنتج','الصيغة المثلى = طبيعة المحتوى + أسلوب تعلم العميل + الوقت المتاح للإنتاج',['هل معرفتك تحتاج تدرجًا تطبيقيًا أم عمقًا نظريًا موثقًا؟','هل يحتاج عميلك مرافقة حية أم اكتفاء ذاتيًا بالمحتوى المسجل؟'],'تحديد الصيغة النهائية المعتمدة للمنتج.'],
    [8,2,'تصميم رحلة التعلم والتحول','التحول المستهدف = الحالة النهائية المرجوة − الحالة الراهنة لدى العميل',['ما المهارة أو القناعة أو النتيجة الملموسة في ختام المنتج؟','كيف سيثبت العميل لنفسه أنه تغير فعلًا؟'],'بيان التحول النهائي بلغة قابلة للقياس والتحقق.'],
    [9,2,'بناء مخطط المحتوى','مخطط المحتوى = تسلسل منطقي من الوحدات، كل وحدة تفضي إلى نتيجة تعليمية واحدة واضحة',['ما الوحدات الأساسية التي يتكون منها المنتج؟','ما الترتيب المنطقي الأمثل بينها؟'],'مخطط أولي كامل للمنتج جاهز للانتقال إلى مرحلة الكتابة.'],
    [10,3,'تحديد نموذج التوزيع','قناة التوزيع المثلى = حيث يتواجد عميلك فعلًا × حيث تملك أنت مصداقية مسبقة',['أين يتواجد جمهورك المستهدف اليوم فعليًا؟','ما القنوات التي تملك فيها ثقلًا ومصداقية؟'],'تحديد قناة أو قنوات التوزيع الأساسية للمنتج.'],
    [11,3,'تصميم قمع التسويق','التحويل النهائي = عدد من يعرفونك × نسبة من يهتمون × نسبة من يقررون الشراء',['كيف يتعرف عليك الغريب أول مرة؟','ما الذي يبني ثقته بك؟','ما الذي يدفعه لاتخاذ قرار الشراء؟'],'قمع تسويقي واضح: الوعي، الاهتمام، القرار.'],
    [12,3,'صفحة الهبوط والعرض التسويقي','صفحة هبوط فعالة = وعد واضح + دليل مصداقية + دعوة صريحة للفعل',['ما الوعد الذي تقدمه في أول سبع ثوان؟','ما الدليل الذي يرفع الثقة فورًا؟'],'مسودة نصية أولى لصفحة الهبوط.'],
    [13,3,'تحديد القنوات العضوية والمدفوعة','مزيج القنوات = قنوات عضوية راسخة الثقة + قنوات مدفوعة تسرّع الوصول',['أي قنوات عضوية تملك فيها حضورًا حقيقيًا؟','ما الميزانية المعقولة لحملة مدفوعة؟'],'خطة قنوات أولية متوازنة بين العضوي والمدفوع.'],
    [14,3,'اختبار الرسالة التسويقية','رسالة جاهزة = رسالة أولية + تغذية راجعة من عينة حقيقية − الغموض',['من الأشخاص الذين يمثلون عميلك المثالي؟','ما الغموض الذي كشفته ردود فعلهم؟'],'رسالة تسويقية نهائية مختبرة وجاهزة للاعتماد.'],
    [15,4,'تحديد نموذج الإيراد','نموذج الإيراد الأنسب = طبيعة المنتج + تكرار الحاجة + رغبتك في المرافقة الحية',['هل المنتج يشترى مرة واحدة أم يحتاج اشتراكًا؟','هل ترغب بمرافقة حية للمشتركين؟'],'تحديد نموذج الإيراد المعتمد للمنتج.'],
    [16,4,'تسعير المنتج','السعر العادل = قيمة التحول لدى العميل − تكلفة الفرصة البديلة لديه',['كم يوفر المنتج من وقت أو مال أو فرص ضائعة؟','ما النطاق السعري الذي يليق بقيمة المنتج؟'],'سعر نهائي أو نطاق سعري مبرر للمنتج.'],
    [17,4,'تكلفة الاكتساب مقابل القيمة الدائمة','الجدوى تتحقق عندما تكون القيمة الدائمة للعميل أعلى من تكلفة الوصول إليه وإقناعه',['كم تقدر أن ينفق العميل معك عبر الزمن؟','كم تقدر تكلفة الوصول إليه وإقناعه؟'],'تقدير أولي لجدوى الاستثمار التسويقي في المنتج.'],
    [18,5,'إنتاج المحتوى العلمي','محتوى موثوق = دقة علمية + إفصاح عن المصادر + أسلوب تطبيقي مبسط دون إخلال بالعمق',['هل راجعت كل وحدة للتحقق من دقتها؟','هل أفصحت عن المصادر والمراجع؟'],'محتوى مكتمل ومراجع لكل وحدات المنتج.'],
    [19,5,'بناء التجربة التفاعلية','تجربة تفاعلية = محتوى + تمارين تطبيقية + نماذج جاهزة + اختبار ذاتي',['أي وحدة تحتاج تمرينًا عمليًا يثبت الفهم؟','ما النماذج أو القوالب الجاهزة التي ترافق كل وحدة؟'],'نسخة تفاعلية كاملة من الحقيبة أو المنتج.'],
    [20,5,'تجهيز البنية التقنية وبوابات الدفع','جاهزية تقنية = رفع صحيح للمحتوى + نظام جاهز + بوابة دفع مختبرة',['هل اختبرت تجربة العميل من البداية إلى النهاية؟'],'منتج مهيأ تقنيًا بالكامل وجاهز للمراجعة النهائية.'],
    [21,5,'مراجعة الجودة والاعتماد','منتج جاهز للاعتماد = سلامة علمية + سلامة تقنية + خلو من الملاحظات الجوهرية',['ما الملاحظات التي تلقيتها؟','هل عولجت جميع الملاحظات الجوهرية؟'],'اعتماد داخلي نهائي للمنتج جاهز للإطلاق.'],
    [22,6,'الإطلاق الرسمي','إطلاق ناجح = تجهيز مسبق كامل + توقيت مدروس + متابعة لحظية لأول 72 ساعة',['ما مؤشرات النجاح التي ستراقبها في اليوم الأول؟'],'تقرير إطلاق أولي موثق للمنتج.'],
    [23,6,'المتابعة والتحديث','استمرارية الأثر = مراجعة دورية منتظمة × استجابة سريعة لملاحظات العملاء',['كل كم مدة ستراجع تقارير الأداء؟','من المسؤول عن متابعة التحديث؟'],'خطة متابعة وتحديث مجدولة وواضحة المسؤوليات.'],
    [24,6,'خطة الاستدامة','استدامة المنتج = استدامة مالية + تحديث دوري + قرار واضح لمسار الأثر',['هل تريد المنتج مصدر دخل مستمر أم أثرًا وقفيًا كليًا أو جزئيًا؟','كيف ستضمن استمراره وتحديثه؟'],'قرار استدامة نهائي موثق يحدد مسار المنتج بعد المخيم.']
  ].map(x => ({id:x[0], axis:x[1], title:x[2], formula:x[3], questions:x[4], output:x[5]}));

  const defaults = { tab:'today', step:1, answers:{}, outputs:{}, completed:[], homework:[], notes:'', productTitle:'', productSummary:'', selectedLecture:'' };
  let state;
  try { state = { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
  catch (_) { state = { ...defaults }; }
  let lectures = [];

  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const esc = (v='') => { const d=document.createElement('div'); d.textContent=String(v); return d.innerHTML; };
  const step = () => steps.find(x => x.id === Number(state.step)) || steps[0];
  const doneCount = () => new Set(state.completed || []).size;
  const pct = () => Math.round(doneCount()/24*100);
  const nextIncomplete = () => steps.find(x => !(state.completed||[]).includes(x.id)) || steps[23];
  const pendingHomework = () => (state.homework||[]).filter(x => !x.done);
  const notify = m => typeof window.showToast === 'function' ? window.showToast(m) : alert(m);

  function addStyles(){
    if(document.getElementById('camp366styles')) return;
    const style=document.createElement('style'); style.id='camp366styles'; style.textContent=`
      #product-camp{padding:0!important}.camp366{min-height:calc(100vh - 78px);background:#f4f7fb;margin:-24px;padding:24px;direction:rtl;color:#172033}.camp366 *{box-sizing:border-box}.camp366-shell{max-width:1500px;margin:0 auto}.camp366-head{background:linear-gradient(125deg,#072f3b 0%,#0f766e 58%,#159a88 100%);border-radius:26px;padding:28px;color:white;position:relative;overflow:hidden}.camp366-head:after{content:'';position:absolute;width:360px;height:360px;border-radius:50%;background:#ffffff12;left:-80px;top:-160px}.camp366-eyebrow{font-size:12px;font-weight:800;opacity:.86}.camp366-head h1{margin:7px 0 8px;font-size:31px;line-height:1.35}.camp366-head p{margin:0;max-width:780px;line-height:1.8;opacity:.9}.camp366-headrow{display:flex;justify-content:space-between;gap:24px;align-items:center;position:relative;z-index:1}.camp366-score{background:#ffffff18;border:1px solid #ffffff2c;border-radius:20px;padding:15px 18px;min-width:230px}.camp366-score strong{font-size:29px}.camp366-track{height:9px;border-radius:20px;background:#ffffff2d;overflow:hidden;margin:8px 0}.camp366-track i{display:block;height:100%;background:#fff;border-radius:20px}.camp366-tabs{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;background:white;border:1px solid #e4eaf0;border-radius:18px;padding:7px;margin:14px 0;position:sticky;top:74px;z-index:8;box-shadow:0 8px 28px #0f172a0b}.camp366-tab{border:0;background:transparent;border-radius:12px;padding:11px 8px;font:inherit;font-weight:800;color:#64748b;cursor:pointer}.camp366-tab.active{background:#e7f7f3;color:#087568}.camp366-grid{display:grid;grid-template-columns:1.5fr .8fr;gap:16px}.camp366-card{background:#fff;border:1px solid #e3e9ef;border-radius:20px;padding:18px;box-shadow:0 9px 30px #0f172a08}.camp366-card h2,.camp366-card h3{margin-top:0}.camp366-sectionhead{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:14px}.camp366-badge{display:inline-flex;align-items:center;gap:5px;border-radius:99px;padding:5px 9px;font-size:12px;font-weight:800;background:#e8f8f4;color:#077767}.camp366-alert{background:linear-gradient(120deg,#fff7e8,#fff);border:1px solid #fedba4;border-radius:18px;padding:18px}.camp366-alert h2{font-size:24px;margin:8px 0}.camp366-output{background:#eef6ff;border:1px solid #cfe0f8;border-radius:14px;padding:13px;line-height:1.7}.camp366-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.camp366-btn{border:0;background:#e8f6f3;color:#087568;border-radius:12px;padding:10px 14px;font:inherit;font-weight:800;cursor:pointer}.camp366-btn.primary{background:#0f766e;color:#fff}.camp366-btn.dark{background:#172033;color:#fff}.camp366-btn.warn{background:#fff3da;color:#9a5c00}.camp366-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.camp366-stat{border:1px solid #e4eaf0;border-radius:15px;padding:13px;background:#fbfdff}.camp366-stat strong{display:block;font-size:23px;margin-bottom:3px}.camp366-stat span{font-size:12px;color:#728095}.camp366-home-mini{display:flex;flex-direction:column;gap:8px}.camp366-home-row{display:flex;align-items:center;gap:8px;padding:10px;border:1px solid #edf0f3;border-radius:12px}.camp366-home-row b{flex:1;font-size:13px}.camp366-lecture-list{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.camp366-lecture{border:1px solid #e2e8f0;border-radius:16px;padding:14px;background:white;cursor:pointer;text-align:right;font:inherit}.camp366-lecture:hover{border-color:#0f766e;background:#f6fffc}.camp366-lecture small{display:block;color:#718096;margin-top:5px}.camp366-axis-list{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}.camp366-axis{border:1px solid #e2e8f0;border-radius:17px;padding:14px;background:#fff;text-align:right;cursor:pointer;font:inherit}.camp366-axis.active{border-color:#0f766e;box-shadow:0 0 0 2px #0f766e18}.camp366-axis b{display:block;margin-bottom:5px}.camp366-axis small{color:#718096}.camp366-roadmap{display:grid;grid-template-columns:300px 1fr;gap:16px}.camp366-stepnav{display:flex;flex-direction:column;gap:7px;max-height:650px;overflow:auto}.camp366-step{border:1px solid #e3e8ee;background:#fff;border-radius:12px;padding:10px;text-align:right;font:inherit;cursor:pointer;display:flex;gap:9px;align-items:center}.camp366-step.active{border-color:#0f766e;background:#f0fbf8}.camp366-step.done{color:#15803d}.camp366-stepnum{width:31px;height:31px;border-radius:9px;background:#eef2f7;display:grid;place-items:center;font-size:12px;font-weight:900;flex:none}.camp366-step.active .camp366-stepnum{background:#0f766e;color:#fff}.camp366-formula{background:#fff8e9;border:1px solid #f7dfad;border-radius:14px;padding:13px;margin:12px 0;line-height:1.7}.camp366-question{margin:14px 0}.camp366-question label{display:block;font-weight:800;margin-bottom:6px;line-height:1.6}.camp366 textarea,.camp366 input,.camp366 select{width:100%;border:1px solid #d7dfe7;border-radius:12px;background:#fff;padding:11px 12px;font:inherit;color:#172033}.camp366 textarea{min-height:100px;resize:vertical;line-height:1.75}.camp366-workoutput{background:#edf6ff;border:1px solid #cddff5;border-radius:16px;padding:14px;margin-top:16px}.camp366-workoutput strong{display:block;color:#1b5ea8;margin-bottom:6px}.camp366-homework{display:grid;grid-template-columns:1fr 1fr;gap:10px}.camp366-hw{border:1px solid #e3e8ee;border-radius:15px;padding:13px;background:#fff}.camp366-hw.done{opacity:.55}.camp366-hwhead{display:flex;align-items:flex-start;gap:8px}.camp366-hwhead input{width:auto;margin-top:4px}.camp366-hwhead b{flex:1}.camp366-hwmeta{font-size:12px;color:#718096;margin:7px 0}.camp366-product-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.camp366-summary{white-space:pre-wrap;line-height:1.8;background:#f8fafc;border-radius:14px;padding:14px;border:1px solid #e2e8f0}.camp366-empty{padding:25px;text-align:center;color:#7b8797;border:1px dashed #ccd4dd;border-radius:15px}.camp366-version{position:absolute;left:18px;bottom:14px;font-size:11px;opacity:.7;z-index:2}.camp366-savebar{position:sticky;bottom:10px;background:#fffffff0;border:1px solid #dde5ec;border-radius:14px;padding:10px;display:flex;justify-content:flex-end;gap:8px;margin-top:15px;backdrop-filter:blur(8px)}
      @media(max-width:1050px){.camp366-grid,.camp366-roadmap,.camp366-product-grid{grid-template-columns:1fr}.camp366-axis-list{grid-template-columns:repeat(2,1fr)}.camp366-stepnav{max-height:300px}.camp366-headrow{align-items:flex-start;flex-direction:column}.camp366-score{width:100%}}
      @media(max-width:700px){.camp366{margin:-16px;padding:12px}.camp366-head{border-radius:18px;padding:18px}.camp366-head h1{font-size:23px}.camp366-tabs{grid-template-columns:repeat(5,minmax(92px,1fr));overflow-x:auto;top:62px}.camp366-tab{white-space:nowrap}.camp366-stats,.camp366-lecture-list,.camp366-homework,.camp366-axis-list{grid-template-columns:1fr}.camp366-card{padding:14px;border-radius:16px}.camp366-actions .camp366-btn{flex:1}.camp366-version{position:static;margin-top:12px}}
    `; document.head.appendChild(style);
  }

  function header(){
    return `<div class="camp366-head"><div class="camp366-headrow"><div><div class="camp366-eyebrow">مخيم صناعة المنتج الرقمي · مساحة عمل تنفيذية</div><h1>أعمل على منتجي داخل المخيم — خطوة بخطوة</h1><p>المحاضرة، واجب المدرب، ورقة العمل، والمخرج النهائي في مكان واحد. المنهج: 24 خطوة عبر 6 محاور.</p></div><div class="camp366-score"><small>تقدمي</small><div><strong>${doneCount()} / 24</strong> خطوة</div><div class="camp366-track"><i style="width:${pct()}%"></i></div><small>${pct()}% مكتمل · ${pendingHomework().length} واجب مفتوح</small></div></div><div class="camp366-version">Camp Workspace 3.6.6</div></div>`;
  }

  function tabs(){
    const items=[['today','اليوم'],['lectures','المحاضرات'],['roadmap','المسار 24'],['homework','الواجبات'],['product','ملف المنتج']];
    return `<div class="camp366-tabs">${items.map(x=>`<button class="camp366-tab ${state.tab===x[0]?'active':''}" data-tab="${x[0]}">${x[1]}</button>`).join('')}</div>`;
  }

  function renderToday(){
    const n=nextIncomplete(); const hw=pendingHomework()[0];
    return `<div class="camp366-grid"><div class="camp366-card camp366-alert"><div class="camp366-sectionhead"><span class="camp366-badge">المطلوب الآن</span><span class="camp366-badge">المحور ${n.axis}</span></div><h2>${n.id}. ${esc(n.title)}</h2><p>لا تنتقل عشوائيًا. أكمل هذه الورقة واحفظ المخرج المطلوب.</p><div class="camp366-output"><b>المخرج:</b> ${esc(n.output)}</div><div class="camp366-actions"><button class="camp366-btn primary" data-open-step="${n.id}">ابدأ ورقة العمل</button><button class="camp366-btn" data-tab="lectures">راجع محاضرة المخيم</button></div></div><aside class="camp366-card"><h3>لوحة التنفيذ السريعة</h3><div class="camp366-stats"><div class="camp366-stat"><strong>${doneCount()}</strong><span>خطوة مكتملة</span></div><div class="camp366-stat"><strong>${pendingHomework().length}</strong><span>واجب مفتوح</span></div><div class="camp366-stat"><strong>${lectures.length}</strong><span>محاضرة مخيم</span></div></div><div style="height:14px"></div><h3>أقرب واجب</h3>${hw?`<div class="camp366-home-row"><span>📌</span><b>${esc(hw.title)}</b><small>${hw.step?'خطوة '+hw.step:''}</small></div>`:'<div class="camp366-empty">لا يوجد واجب مفتوح الآن.</div>'}</aside></div><div class="camp366-card" style="margin-top:16px"><div class="camp366-sectionhead"><h3>مسار المخيم في نظرة واحدة</h3><button class="camp366-btn" data-tab="roadmap">افتح المسار الكامل</button></div><div class="camp366-axis-list">${axes.map(a=>{const c=a.steps.filter(id=>(state.completed||[]).includes(id)).length;return `<button class="camp366-axis" data-axis="${a.id}"><b>المحور ${a.id}: ${esc(a.title)}</b><small>${c} من ${a.steps.length} مكتملة</small></button>`}).join('')}</div></div><div class="camp366-grid" style="margin-top:16px"><div class="camp366-card"><div class="camp366-sectionhead"><h3>آخر الواجبات</h3><button class="camp366-btn" data-tab="homework">كل الواجبات</button></div><div class="camp366-home-mini">${(state.homework||[]).slice(-3).reverse().map(h=>`<div class="camp366-home-row"><span>${h.done?'✅':'📝'}</span><b>${esc(h.title)}</b><small>${h.step?'خطوة '+h.step:''}</small></div>`).join('')||'<div class="camp366-empty">لم تسجل واجبات بعد.</div>'}</div></div><div class="camp366-card"><h3>مذكرة المحاضرة السريعة</h3><textarea id="campQuickNote" placeholder="اكتب أي تكليف أو موعد أو فكرة يذكرها المدرب أثناء المحاضرة…">${esc(state.notes||'')}</textarea><div class="camp366-actions"><button class="camp366-btn primary" id="saveQuickNote">حفظ المذكرة</button></div></div></div>`;
  }

  function renderLectures(){
    return `<div class="camp366-card"><div class="camp366-sectionhead"><div><h2>محاضرات المخيم</h2><div class="camp366-eyebrow" style="color:#708095">اختر المحاضرة ثم افتح مساحة المحاضرة الذكية للتفريغ والنقاش و«اسأل المحاضرة».</div></div><button class="camp366-btn primary" id="openLive">فتح مساحة المحاضرة الذكية</button></div>${lectures.length?`<div class="camp366-lecture-list">${lectures.map((l,i)=>`<button class="camp366-lecture" data-lecture="${esc(l.id)}"><span class="camp366-badge">${l.scope==='local'?'محلي':'سحابي'}</span><h3>${esc(l.title||'محاضرة بلا عنوان')}</h3><small>${l.order?'المحاضرة '+l.order+' · ':''}${esc(l.course||'مخيم صناعة المنتج الرقمي')}</small></button>`).join('')}</div>`:'<div class="camp366-empty">لم تظهر محاضرات المخيم بعد. يمكنك فتح مساحة المحاضرة الذكية وحفظ الجلسة، ثم العودة هنا.</div>'}</div><div class="camp366-card" style="margin-top:16px"><h3>كيف أستخدم المحاضرة في الواجب؟</h3><div class="camp366-stats"><div class="camp366-stat"><strong>1</strong><span>افتح التفريغ والنقاش</span></div><div class="camp366-stat"><strong>2</strong><span>اسأل المحاضرة عن الواجب</span></div><div class="camp366-stat"><strong>3</strong><span>ارجع لورقة الخطوة واحفظ المخرج</span></div></div></div>`;
  }

  function renderRoadmap(){
    const current=step(); const activeAxis=axes.find(a=>a.id===current.axis);
    return `<div class="camp366-axis-list">${axes.map(a=>`<button class="camp366-axis ${a.id===current.axis?'active':''}" data-axis="${a.id}"><b>المحور ${a.id}</b><span>${esc(a.title)}</span><small>${a.steps.filter(id=>(state.completed||[]).includes(id)).length} / ${a.steps.length} مكتملة</small></button>`).join('')}</div><div class="camp366-roadmap"><aside class="camp366-card"><div class="camp366-sectionhead"><h3>${esc(activeAxis.title)}</h3><span class="camp366-badge">${activeAxis.steps[0]}–${activeAxis.steps[activeAxis.steps.length-1]}</span></div><div class="camp366-stepnav">${steps.filter(x=>x.axis===current.axis).map(x=>`<button class="camp366-step ${x.id===current.id?'active':''} ${(state.completed||[]).includes(x.id)?'done':''}" data-step="${x.id}"><span class="camp366-stepnum">${(state.completed||[]).includes(x.id)?'✓':x.id}</span><span>${esc(x.title)}</span></button>`).join('')}</div></aside><main class="camp366-card" id="campWorkArea"><div class="camp366-sectionhead"><div><span class="camp366-badge">الخطوة ${current.id}</span><h2 style="margin:8px 0 0">${esc(current.title)}</h2></div><span class="camp366-badge">${(state.completed||[]).includes(current.id)?'مكتملة':'قيد العمل'}</span></div><div class="camp366-formula"><b>المعادلة الإرشادية</b><br>${esc(current.formula)}</div>${current.questions.map((q,i)=>`<div class="camp366-question"><label>${i+1}. ${esc(q)}</label><textarea data-answer="${i}" placeholder="اكتب إجابتك العملية هنا…">${esc(((state.answers||{})[current.id]||{})[i]||'')}</textarea></div>`).join('')}<div class="camp366-workoutput"><strong>مخرج هذه الورقة</strong><p>${esc(current.output)}</p><textarea id="campStepOutput" placeholder="اكتب هنا الصيغة النهائية التي ستعتمدها…">${esc((state.outputs||{})[current.id]||'')}</textarea></div><div class="camp366-savebar"><button class="camp366-btn" id="saveStep">حفظ العمل</button><button class="camp366-btn dark" id="openLectureFromStep">اسأل المحاضرة</button><button class="camp366-btn primary" id="completeStep">${(state.completed||[]).includes(current.id)?'إعادة فتح الخطوة':'اعتماد كمكتملة'}</button></div></main></div>`;
  }

  function renderHomework(){
    return `<div class="camp366-card"><div class="camp366-sectionhead"><div><h2>واجبات المدرب</h2><div class="camp366-eyebrow" style="color:#708095">سجّل أي Homework فورًا واربطه بالخطوة المناسبة.</div></div><button class="camp366-btn primary" id="addHomework">＋ إضافة واجب</button></div>${(state.homework||[]).length?`<div class="camp366-homework">${state.homework.map((h,i)=>`<article class="camp366-hw ${h.done?'done':''}"><div class="camp366-hwhead"><input type="checkbox" data-hw-check="${i}" ${h.done?'checked':''}><b>${esc(h.title)}</b></div><div class="camp366-hwmeta">${h.step?'مرتبط بالخطوة '+h.step:'غير مرتبط بخطوة'}${h.due?' · الموعد: '+esc(h.due):''}</div><div class="camp366-actions">${h.step?`<button class="camp366-btn" data-open-step="${h.step}">فتح ورقة العمل</button>`:''}<button class="camp366-btn warn" data-hw-delete="${i}">حذف</button></div></article>`).join('')}</div>`:'<div class="camp366-empty">لا توجد واجبات مسجلة. اضغط «إضافة واجب» عند أول تكليف من المدرب.</div>'}</div>`;
  }

  function renderProduct(){
    const completedOutputs=steps.filter(x=>(state.outputs||{})[x.id]).map(x=>`<div class="camp366-summary"><b>${x.id}. ${esc(x.title)}</b>\n${esc(state.outputs[x.id])}</div>`).join('');
    return `<div class="camp366-product-grid"><div class="camp366-card"><h2>هوية المنتج الجاري بناؤه</h2><label>اسم المنتج</label><input id="productTitle" value="${esc(state.productTitle||'')}" placeholder="اسم مؤقت أو نهائي للمنتج"><div style="height:10px"></div><label>وصف مختصر</label><textarea id="productSummary" placeholder="ما المنتج؟ لمن؟ وما التحول الذي يقدمه؟">${esc(state.productSummary||'')}</textarea><div class="camp366-actions"><button class="camp366-btn primary" id="saveProduct">حفظ هوية المنتج</button></div></div><div class="camp366-card"><h2>حالة المنتج</h2><div class="camp366-stats"><div class="camp366-stat"><strong>${doneCount()}</strong><span>مخرج مكتمل</span></div><div class="camp366-stat"><strong>${24-doneCount()}</strong><span>مخرج متبقٍ</span></div><div class="camp366-stat"><strong>${pct()}%</strong><span>نسبة البناء</span></div></div></div></div><div class="camp366-card" style="margin-top:16px"><div class="camp366-sectionhead"><h2>مخرجاتي المجمعة</h2><span class="camp366-badge">تتكون تلقائيًا من أوراق العمل</span></div>${completedOutputs||'<div class="camp366-empty">لم تعتمد مخرجات بعد. ابدأ من «المسار 24».</div>'}</div>`;
  }

  function view(){
    if(state.tab==='lectures') return renderLectures();
    if(state.tab==='roadmap') return renderRoadmap();
    if(state.tab==='homework') return renderHomework();
    if(state.tab==='product') return renderProduct();
    return renderToday();
  }

  function render(){
    addStyles();
    root.innerHTML=`<div class="camp366"><div class="camp366-shell">${header()}${tabs()}<div id="camp366View">${view()}</div></div></div>`;
    bind();
  }

  function saveStepWork(){
    const current=step(); const answers={};
    root.querySelectorAll('[data-answer]').forEach(t=>answers[t.dataset.answer]=t.value.trim());
    state.answers[current.id]=answers;
    state.outputs[current.id]=(root.querySelector('#campStepOutput')?.value||'').trim();
    save(); notify('تم حفظ ورقة العمل');
  }

  function openLive(){ document.querySelector('[data-view="live"]')?.click(); }

  function bind(){
    root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.tab;save();render()}));
    root.querySelectorAll('[data-axis]').forEach(b=>b.addEventListener('click',()=>{const a=axes.find(x=>x.id===Number(b.dataset.axis));state.step=a.steps.find(id=>!(state.completed||[]).includes(id))||a.steps[0];state.tab='roadmap';save();render()}));
    root.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{state.step=Number(b.dataset.step);state.tab='roadmap';save();render()}));
    root.querySelectorAll('[data-open-step]').forEach(b=>b.addEventListener('click',()=>{state.step=Number(b.dataset.openStep);state.tab='roadmap';save();render()}));
    root.querySelector('#saveQuickNote')?.addEventListener('click',()=>{state.notes=root.querySelector('#campQuickNote').value.trim();save();notify('تم حفظ المذكرة')});
    root.querySelector('#saveStep')?.addEventListener('click',saveStepWork);
    root.querySelector('#completeStep')?.addEventListener('click',()=>{saveStepWork();const id=step().id,set=new Set(state.completed||[]);if(set.has(id))set.delete(id);else set.add(id);state.completed=[...set].sort((a,b)=>a-b);if(set.has(id)&&id<24)state.step=id+1;save();render()});
    root.querySelector('#openLectureFromStep')?.addEventListener('click',openLive);
    root.querySelector('#openLive')?.addEventListener('click',openLive);
    root.querySelector('#addHomework')?.addEventListener('click',()=>{const title=prompt('ما الواجب المطلوب من المدرب؟');if(!title)return;const stepNo=prompt('رقم الخطوة المرتبطة 1–24 (اختياري)');const due=prompt('موعد التسليم إن وجد (اختياري)');state.homework.push({title:title.trim(),step:/^(?:[1-9]|1\d|2[0-4])$/.test(stepNo||'')?Number(stepNo):null,due:(due||'').trim(),done:false});save();render()});
    root.querySelectorAll('[data-hw-check]').forEach(c=>c.addEventListener('change',()=>{state.homework[Number(c.dataset.hwCheck)].done=c.checked;save();render()}));
    root.querySelectorAll('[data-hw-delete]').forEach(b=>b.addEventListener('click',()=>{if(confirm('حذف هذا الواجب؟')){state.homework.splice(Number(b.dataset.hwDelete),1);save();render()}}));
    root.querySelector('#saveProduct')?.addEventListener('click',()=>{state.productTitle=root.querySelector('#productTitle').value.trim();state.productSummary=root.querySelector('#productSummary').value.trim();save();notify('تم حفظ هوية المنتج')});
    root.querySelectorAll('[data-lecture]').forEach(b=>b.addEventListener('click',()=>{state.selectedLecture=b.dataset.lecture;save();openLive()}));
  }

  async function loadLectures(){
    let items=[];
    if(window.slcDB){
      try{
        const {data:courses}=await window.slcDB.from('slc_courses').select('id,title,provider_name');
        const courseMap=new Map((courses||[]).map(c=>[String(c.id),c]));
        const {data,error}=await window.slcDB.from('slc_lectures').select('id,title,lecture_order,course_id,created_at,source_type,session_kind').order('created_at',{ascending:false});
        if(error) throw error;
        items=(data||[]).map(r=>{const c=courseMap.get(String(r.course_id))||{};return {id:String(r.id),title:r.title||'محاضرة بلا عنوان',order:r.lecture_order||0,course:c.title||'',provider:c.provider_name||'',scope:'cloud',source_type:r.source_type,session_kind:r.session_kind};}).filter(x=>/مخيم|المنتج\s*الرقمي|المحتوى\s*الرقمي|digital\s*(product|content)/i.test(`${x.title} ${x.course} ${x.provider}`));
      }catch(e){console.warn('Digital camp lectures:',e)}
    }
    try{
      const last=JSON.parse(localStorage.getItem('slc_live_studio_last_session_v352')||'null');
      if(last&&last.title&&!items.some(x=>x.title===last.title)) items.push({id:'local:last',title:last.title,order:0,course:'آخر جلسة محفوظة على هذا الجهاز',scope:'local'});
    }catch(_){}
    lectures=items;
    if(state.tab==='today'||state.tab==='lectures') render();
  }

  render();
  loadLectures();
})();