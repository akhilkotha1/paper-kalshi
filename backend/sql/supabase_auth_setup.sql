
-- Link profiles.id to auth.users.id 
alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id)
  on delete cascade;

-- Auto-create a profile row whenever someone signs up via
-- Supabase Auth, so you never have to remember to do it in
-- application code.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();