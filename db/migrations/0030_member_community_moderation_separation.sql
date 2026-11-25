-- Separation of authors and moderators; a member cannot report or review their own content.
CREATE OR REPLACE FUNCTION v9.protect_member_community_topic()
RETURNS trigger
LANGUAGE plpgsql
AS $community_topic_guard$
DECLARE
  membership_person uuid;
  membership_status text;
  member_valid_from date;
  member_valid_until date;
  account_person uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Community topics are retained for moderation and audit; withdraw or hide them instead.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending'
      OR NEW.moderated_by IS NOT NULL
      OR NEW.moderated_at IS NOT NULL
      OR NEW.updated_by <> NEW.author_user_id
    THEN
      RAISE EXCEPTION 'New community topics must enter the moderation queue as pending.';
    END IF;

    SELECT membership.person_id, membership.status, membership.valid_from, membership.valid_until
    INTO membership_person, membership_status, member_valid_from, member_valid_until
    FROM v9.memberships AS membership
    INNER JOIN v9.people AS person
      ON person.id = membership.person_id
      AND person.status = 'active'
    WHERE membership.id = NEW.membership_id
      AND membership.organization_id = NEW.organization_id;

    SELECT account.person_id
    INTO account_person
    FROM v9.user_accounts AS account
    WHERE account.id = NEW.author_user_id
      AND account.status = 'active';

    IF account_person IS NULL
      OR membership_person IS DISTINCT FROM account_person
      OR membership_status IS DISTINCT FROM 'active'
      OR (member_valid_from IS NOT NULL AND member_valid_from > current_date)
      OR (member_valid_until IS NOT NULL AND member_valid_until < current_date)
    THEN
      RAISE EXCEPTION 'Only a currently active member may create a community topic.';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.membership_id IS DISTINCT FROM OLD.membership_id
    OR NEW.author_user_id IS DISTINCT FROM OLD.author_user_id
  THEN
    RAISE EXCEPTION 'Community topic ownership and organization cannot be changed.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'pending'
      AND NEW.status = 'withdrawn'
      AND NEW.updated_by = OLD.author_user_id
      AND NEW.moderated_by IS NULL
      AND NEW.moderated_at IS NULL
    THEN
      RETURN NEW;
    END IF;

    IF OLD.status IN ('pending','published','hidden')
      AND NEW.status IN ('published','rejected','hidden')
      AND NEW.moderated_by IS NOT NULL
      AND NEW.moderated_by IS DISTINCT FROM OLD.author_user_id
      AND NEW.moderated_at IS NOT NULL
      AND NEW.updated_by = NEW.moderated_by
    THEN
      IF NEW.status IN ('rejected','hidden')
        AND (NEW.moderation_note IS NULL OR length(btrim(NEW.moderation_note)) < 3)
      THEN
        RAISE EXCEPTION 'Rejecting or hiding a community topic requires a moderation reason.';
      END IF;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid community topic moderation transition.';
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title OR NEW.body IS DISTINCT FROM OLD.body THEN
    IF OLD.status <> 'pending'
      OR NEW.updated_by <> OLD.author_user_id
      OR NEW.moderated_by IS DISTINCT FROM OLD.moderated_by
      OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at
      OR NEW.moderation_note IS DISTINCT FROM OLD.moderation_note
    THEN
      RAISE EXCEPTION 'Only the author may edit a pending community topic.';
    END IF;
  ELSIF NEW.moderated_by IS DISTINCT FROM OLD.moderated_by
    OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at
    OR NEW.moderation_note IS DISTINCT FROM OLD.moderation_note
  THEN
    RAISE EXCEPTION 'Moderation metadata may only change with a moderation status transition.';
  END IF;

  RETURN NEW;
END;
$community_topic_guard$;

CREATE OR REPLACE FUNCTION v9.protect_member_community_reply()
RETURNS trigger
LANGUAGE plpgsql
AS $community_reply_guard$
DECLARE
  membership_person uuid;
  membership_status text;
  member_valid_from date;
  member_valid_until date;
  account_person uuid;
  topic_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Community replies are retained for moderation and audit; withdraw or hide them instead.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending'
      OR NEW.moderated_by IS NOT NULL
      OR NEW.moderated_at IS NOT NULL
      OR NEW.updated_by <> NEW.author_user_id
    THEN
      RAISE EXCEPTION 'New community replies must enter the moderation queue as pending.';
    END IF;

    SELECT membership.person_id, membership.status, membership.valid_from, membership.valid_until
    INTO membership_person, membership_status, member_valid_from, member_valid_until
    FROM v9.memberships AS membership
    INNER JOIN v9.people AS person
      ON person.id = membership.person_id
      AND person.status = 'active'
    WHERE membership.id = NEW.membership_id
      AND membership.organization_id = NEW.organization_id;

    SELECT account.person_id
    INTO account_person
    FROM v9.user_accounts AS account
    WHERE account.id = NEW.author_user_id
      AND account.status = 'active';

    SELECT topic.status
    INTO topic_status
    FROM v9.member_community_topics AS topic
    WHERE topic.id = NEW.topic_id
      AND topic.organization_id = NEW.organization_id;

    IF account_person IS NULL
      OR membership_person IS DISTINCT FROM account_person
      OR membership_status IS DISTINCT FROM 'active'
      OR (member_valid_from IS NOT NULL AND member_valid_from > current_date)
      OR (member_valid_until IS NOT NULL AND member_valid_until < current_date)
      OR topic_status IS DISTINCT FROM 'published'
    THEN
      RAISE EXCEPTION 'Only an active member may reply to a published community topic.';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.topic_id IS DISTINCT FROM OLD.topic_id
    OR NEW.membership_id IS DISTINCT FROM OLD.membership_id
    OR NEW.author_user_id IS DISTINCT FROM OLD.author_user_id
  THEN
    RAISE EXCEPTION 'Community reply ownership, topic and organization cannot be changed.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'pending'
      AND NEW.status = 'withdrawn'
      AND NEW.updated_by = OLD.author_user_id
      AND NEW.moderated_by IS NULL
      AND NEW.moderated_at IS NULL
    THEN
      RETURN NEW;
    END IF;

    IF OLD.status IN ('pending','published','hidden')
      AND NEW.status IN ('published','rejected','hidden')
      AND NEW.moderated_by IS NOT NULL
      AND NEW.moderated_by IS DISTINCT FROM OLD.author_user_id
      AND NEW.moderated_at IS NOT NULL
      AND NEW.updated_by = NEW.moderated_by
    THEN
      IF NEW.status IN ('rejected','hidden')
        AND (NEW.moderation_note IS NULL OR length(btrim(NEW.moderation_note)) < 3)
      THEN
        RAISE EXCEPTION 'Rejecting or hiding a community reply requires a moderation reason.';
      END IF;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid community reply moderation transition.';
  END IF;

  IF NEW.body IS DISTINCT FROM OLD.body THEN
    IF OLD.status <> 'pending'
      OR NEW.updated_by <> OLD.author_user_id
      OR NEW.moderated_by IS DISTINCT FROM OLD.moderated_by
      OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at
      OR NEW.moderation_note IS DISTINCT FROM OLD.moderation_note
    THEN
      RAISE EXCEPTION 'Only the author may edit a pending community reply.';
    END IF;
  ELSIF NEW.moderated_by IS DISTINCT FROM OLD.moderated_by
    OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at
    OR NEW.moderation_note IS DISTINCT FROM OLD.moderation_note
  THEN
    RAISE EXCEPTION 'Moderation metadata may only change with a moderation status transition.';
  END IF;

  RETURN NEW;
END;
$community_reply_guard$;

CREATE OR REPLACE FUNCTION v9.protect_member_community_report()
RETURNS trigger
LANGUAGE plpgsql
AS $community_report_guard$
DECLARE
  reporter_person uuid;
  member_person uuid;
  membership_status text;
  member_valid_from date;
  member_valid_until date;
  target_membership uuid;
  target_status text;
  target_author uuid;
  topic_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Community reports are retained for moderation and audit.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'open' OR NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL THEN
      RAISE EXCEPTION 'New community reports must enter the review queue as open.';
    END IF;

    SELECT membership.person_id, membership.status, membership.valid_from, membership.valid_until
    INTO member_person, membership_status, member_valid_from, member_valid_until
    FROM v9.memberships AS membership
    INNER JOIN v9.people AS person
      ON person.id = membership.person_id
      AND person.status = 'active'
    WHERE membership.id = NEW.reporter_membership_id
      AND membership.organization_id = NEW.organization_id;

    SELECT account.person_id
    INTO reporter_person
    FROM v9.user_accounts AS account
    WHERE account.id = NEW.reporter_user_id
      AND account.status = 'active';

    IF reporter_person IS NULL
      OR reporter_person IS DISTINCT FROM member_person
      OR membership_status IS DISTINCT FROM 'active'
      OR (member_valid_from IS NOT NULL AND member_valid_from > current_date)
      OR (member_valid_until IS NOT NULL AND member_valid_until < current_date)
    THEN
      RAISE EXCEPTION 'Only a currently active member may report community content.';
    END IF;

    IF NEW.topic_id IS NOT NULL THEN
      SELECT topic.membership_id, topic.status, topic.author_user_id
      INTO target_membership, target_status, target_author
      FROM v9.member_community_topics AS topic
      WHERE topic.id = NEW.topic_id
        AND topic.organization_id = NEW.organization_id;
      IF target_status IS DISTINCT FROM 'published'
        OR target_membership = NEW.reporter_membership_id
        OR target_author IS NOT DISTINCT FROM NEW.reporter_user_id
      THEN
        RAISE EXCEPTION 'A member may report published content from another member only.';
      END IF;
    ELSE
      SELECT reply.membership_id, reply.status, reply.author_user_id, topic.status
      INTO target_membership, target_status, target_author, topic_status
      FROM v9.member_community_replies AS reply
      INNER JOIN v9.member_community_topics AS topic
        ON topic.id = reply.topic_id
        AND topic.organization_id = reply.organization_id
      WHERE reply.id = NEW.reply_id
        AND reply.organization_id = NEW.organization_id;
      IF target_status IS DISTINCT FROM 'published'
        OR topic_status IS DISTINCT FROM 'published'
        OR target_membership = NEW.reporter_membership_id
      THEN
        RAISE EXCEPTION 'A member may report published content from another member only.';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.reporter_membership_id IS DISTINCT FROM OLD.reporter_membership_id
    OR NEW.reporter_user_id IS DISTINCT FROM OLD.reporter_user_id
    OR NEW.topic_id IS DISTINCT FROM OLD.topic_id
    OR NEW.reply_id IS DISTINCT FROM OLD.reply_id
    OR NEW.reason IS DISTINCT FROM OLD.reason
    OR NEW.details IS DISTINCT FROM OLD.details
  THEN
    RAISE EXCEPTION 'Community report details are immutable after submission.';
  END IF;

  IF OLD.status <> 'open'
    OR NEW.status NOT IN ('resolved','dismissed')
    OR NEW.reviewed_by IS NULL
    OR NEW.reviewed_at IS NULL
    OR NEW.reviewed_by = OLD.reporter_user_id
  THEN
    RAISE EXCEPTION 'Only open community reports can be resolved or dismissed by a moderator.';
  END IF;

  RETURN NEW;
END;
$community_report_guard$;

INSERT INTO v9.schema_migrations (name, checksum)
VALUES ('0030_member_community_moderation_separation.sql', 'sha256:v9-member-community-moderation-separation-20261125')
ON CONFLICT (name) DO NOTHING;
