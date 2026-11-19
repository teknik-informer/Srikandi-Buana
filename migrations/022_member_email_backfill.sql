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
    AND u.email_verified_at IS NOT NULL
    AND coalesce(r.data::jsonb ->> 'email', '') = ''
    AND lower(u.email) NOT LIKE '%.invalid'
    AND position('@' in u.email) > 1
    AND position('.' in u.email) > position('@' in u.email) + 1
)
UPDATE public.records r
SET data = jsonb_set(r.data::jsonb, '{email}', to_jsonb(m.email), true)::text,
    updated = now()::text
FROM linked_member_emails m
WHERE r.id = m.id
  AND r.owner = m.owner;
