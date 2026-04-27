-- Optional: run this in Supabase SQL editor if you want public image uploads.
insert into storage.buckets (id, name, public) values ('store-assets', 'store-assets', true)
on conflict (id) do nothing;
