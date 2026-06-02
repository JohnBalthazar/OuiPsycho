-- ============================================================
--  Oui Psycho! — Setup table commentaires (Supabase)
--  Copiez ce script dans : SQL Editor → New query → Run
-- ============================================================

-- 1. Créer la table
create table if not exists public.comments (
  id               uuid        default gen_random_uuid() primary key,
  article_id       text        not null,
  author_name      text        not null,
  author_email     text        default '',
  content          text        not null,
  status           text        default 'pending'
                               check (status in ('pending', 'approved', 'rejected')),
  flagged          boolean     default false,
  flag_count       integer     default 0,
  admin_reply      text        default null,
  admin_reply_date timestamptz default null,
  created_at       timestamptz default timezone('utc', now()) not null
);

-- 2. Activer Row Level Security (RLS)
alter table public.comments enable row level security;

-- 3. Politique : tout le monde peut soumettre un commentaire
create policy "allow_public_insert"
  on public.comments
  for insert
  with check (true);

-- 4. Politique : tout le monde peut lire les commentaires approuvés
create policy "allow_public_select_approved"
  on public.comments
  for select
  using (status = 'approved');

-- 5. Fonction RPC pour signaler un commentaire
--    (appelée avec la clé anon → sécurisée via SECURITY DEFINER)
create or replace function public.report_comment(comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.comments
  set
    flag_count = flag_count + 1,
    flagged    = true
  where
    id     = comment_id
    and status = 'approved';   -- on ne signale que les commentaires visibles
end;
$$;

-- 6. Index pour accélérer les requêtes par article
create index if not exists idx_comments_article_id
  on public.comments (article_id, status);

-- ✅ Setup terminé !
-- Allez dans : Project Settings → API
-- Copiez "Project URL" + "anon public" dans l'admin Oui Psycho! → Paramètres → Supabase
-- Copiez aussi "service_role secret" (pour la modération admin)
