-- المرحلة الأولى: سلاسل الدورات وأرشفة المحاضرة المباشرة

alter table public.slc_lectures alter column source_url drop not null;

alter table public.slc_lectures drop constraint if exists slc_lectures_source_type_check;
alter table public.slc_lectures add constraint slc_lectures_source_type_check
  check (source_type in ('youtube','external','video','audio','pdf','live'));

alter table public.slc_lectures add column if not exists session_kind text not null default 'recorded'
  check (session_kind in ('recorded','live'));
alter table public.slc_lectures add column if not exists live_payload jsonb not null default '{}'::jsonb;
alter table public.slc_lectures add column if not exists resource_links jsonb not null default '[]'::jsonb;
alter table public.slc_lectures add column if not exists archived_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('slc-live-assets','slc-live-assets',false,5242880,array['image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "slc_live_assets_select_own" on storage.objects;
drop policy if exists "slc_live_assets_insert_own" on storage.objects;
drop policy if exists "slc_live_assets_update_own" on storage.objects;
drop policy if exists "slc_live_assets_delete_own" on storage.objects;
create policy "slc_live_assets_select_own" on storage.objects for select to authenticated
  using (bucket_id='slc-live-assets' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "slc_live_assets_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id='slc-live-assets' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "slc_live_assets_update_own" on storage.objects for update to authenticated
  using (bucket_id='slc-live-assets' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "slc_live_assets_delete_own" on storage.objects for delete to authenticated
  using (bucket_id='slc-live-assets' and (storage.foldername(name))[1]=auth.uid()::text);
