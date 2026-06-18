-- Enable storage if not already enabled
-- Note: This script should be run in the Supabase SQL Editor

-- 1. Create the bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 2. Set up RLS policies on storage.objects for the 'avatars' bucket

-- Policy 1: Allow public access to read all avatars
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Policy 2: Allow authenticated users to upload avatars
create policy "Users can upload their own avatars."
  on storage.objects for insert
  with check ( 
    bucket_id = 'avatars' 
    and auth.role() = 'authenticated'
  );

-- Policy 3: Allow authenticated users to update their own avatars
create policy "Users can update their own avatars."
  on storage.objects for update
  using ( 
    bucket_id = 'avatars' 
    and auth.role() = 'authenticated'
  );

-- Policy 4: Allow authenticated users to delete their own avatars
create policy "Users can delete their own avatars."
  on storage.objects for delete
  using ( 
    bucket_id = 'avatars' 
    and auth.role() = 'authenticated'
  );
