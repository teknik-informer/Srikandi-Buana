-- Backfill the canonical membership email from already-linked accounts.
-- Existing account holders must not be asked to enter the same email twice.
WITH linked_member_emails AS (
  SELECT r.id, r.owner, lower(trim(u.email)) AS email
  FROM public.records r
  JOIN public.users u
    ON u.member_id = r.id
   AND u.workspace_owner = r.owner
  WHERE r.kind = 'anggota'
    AND u.role <> 'admin'
    AND coalesce(r.data::jsonb ->> 'email', '') = ''
    AND u.email !~* '\\.invalid$'
    AND u.email ~* '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'
)
UPDATE public.records r
SET data = jsonb_set(r.data::jsonb, '{email}', to_jsonb(m.email), true)::text,
    updated = now()::text
FROM linked_member_emails m
WHERE r.id = m.id
  AND r.owner = m.owner;

