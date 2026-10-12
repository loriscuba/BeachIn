-- Foto (piatti, news, eventi, galleria del sito) nello Storage invece che come data URI nel database.
-- Bucket pubblico in lettura; l'app (ruolo anon, demo senza login) può solo caricare file nuovi in questo bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('beachin', 'beachin', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "beachin foto: caricamento anon" on storage.objects;
create policy "beachin foto: caricamento anon" on storage.objects
  for insert to anon with check (bucket_id = 'beachin');
