-- إصلاح بيانات التجربة القديمة: تحويل رابط الكورس وخلاصته القديمة إلى اليوم الأول.
-- مقيّد باسم دورة التجربة، ولا يغيّر أي دورة أخرى.

with target_courses as (
  select c.*
  from public.slc_courses c
  where c.title = 'إدارة فرق العمل والمجاميع البحثية بالذكاء الاصطناعي'
    and c.course_url is not null
    and exists (
      select 1 from public.slc_summaries s
      where s.course_id=c.id and s.lecture_id is null
    )
    and not exists (
      select 1 from public.slc_lectures l
      where l.course_id=c.id and l.lecture_order=1
    )
)
insert into public.slc_lectures (
  owner_id,course_id,title,source_url,source_type,open_mode,module_name,
  lecture_order,status,notes
)
select
  owner_id,id,'اليوم الأول',course_url,
  case when course_url ilike '%youtu%' then 'youtube' else 'external' end,
  'auto','القسم الأول',1,'summarized','تم إنشاؤها من بيانات التجربة القديمة'
from target_courses;

update public.slc_summaries s
set lecture_id=l.id,
    summary_key='lecture:'||l.id::text,
    updated_at=now()
from public.slc_lectures l
join public.slc_courses c on c.id=l.course_id
where s.course_id=l.course_id
  and s.lecture_id is null
  and l.lecture_order=1
  and c.title='إدارة فرق العمل والمجاميع البحثية بالذكاء الاصطناعي'
  and not exists (
    select 1 from public.slc_summaries other where other.lecture_id=l.id
  );

select c.title as course_title,l.lecture_order,l.title as lecture_title,
       case when s.id is null then 'تحتاج خلاصة' else 'ملخّصة' end as summary_status
from public.slc_courses c
join public.slc_lectures l on l.course_id=c.id
left join public.slc_summaries s on s.lecture_id=l.id
where c.title='إدارة فرق العمل والمجاميع البحثية بالذكاء الاصطناعي'
order by l.lecture_order;
