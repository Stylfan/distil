-- Security for Distil's data, as in Prismatic (see also ADR 0002): the
-- application's own role, row-level security that hides one account's
-- workshops from another, an audit log written by triggers that nobody can
-- rewrite, and the two privileged operations the application may call:
-- deleting an account completely, and deleting photos whose time is up.

-- The role the application connects as. It owns nothing, so row-level
-- security applies to it in full. scripts/migrate.mjs gives it LOGIN and
-- its password from DISTIL_APP_PASSWORD.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'distil_app') THEN
    CREATE ROLE distil_app NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO distil_app;
--> statement-breakpoint
-- Signing in happens before anyone is known, so these sit outside RLS
-- (as in Prismatic); usage_days holds counts only.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "users", "sessions", "passkeys", "recovery_codes", "auth_challenges", "usage_days"
TO distil_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "workshops", "photos", "photo_images", "notes" TO distil_app;
--> statement-breakpoint
-- The audit log can be read for one's own workshops and nothing else.
GRANT SELECT ON "audit_log" TO distil_app;
--> statement-breakpoint

-- The acting user, set per transaction by withUser() in src/db/client.ts.
CREATE OR REPLACE FUNCTION app_user_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.user_id', true), '')
$$;
--> statement-breakpoint

-- Workshops: an account sees and writes only its own.
ALTER TABLE "workshops" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "workshops" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_own_workshops ON "workshops" FOR ALL TO distil_app
  USING (owner_id = app_user_id()) WITH CHECK (owner_id = app_user_id());
--> statement-breakpoint

-- Everything that hangs off a workshop: reachable only through a workshop
-- the acting user owns. The subquery is itself filtered by the policy on
-- workshops.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['photos', 'photo_images', 'notes'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY app_own_rows ON %I FOR ALL TO distil_app
         USING (workshop_id IN (SELECT id FROM workshops))
         WITH CHECK (workshop_id IN (SELECT id FROM workshops))',
      t
    );
  END LOOP;
END
$$;
--> statement-breakpoint

ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_read_own_audit ON "audit_log" FOR SELECT TO distil_app
  USING (workshop_id IN (SELECT id FROM workshops));
--> statement-breakpoint

-- Row-change capture. SECURITY DEFINER, so the insert works although the
-- application role has no right to write the log itself. Passwords and
-- images never reach it: the sign-in tables and photo_images are not
-- audited.
CREATE OR REPLACE FUNCTION audit_row_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_workshop text;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_before := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_after := to_jsonb(NEW); END IF;
  IF TG_TABLE_NAME = 'workshops' THEN
    v_workshop := coalesce(v_after ->> 'id', v_before ->> 'id');
  ELSE
    v_workshop := coalesce(v_after ->> 'workshop_id', v_before ->> 'workshop_id');
  END IF;
  INSERT INTO audit_log (at, actor_user_id, table_name, operation, row_id, workshop_id, before, after)
  VALUES (
    (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
    app_user_id(),
    TG_TABLE_NAME,
    lower(TG_OP),
    coalesce(v_after ->> 'id', v_before ->> 'id'),
    v_workshop,
    v_before,
    v_after
  );
  RETURN coalesce(NEW, OLD);
END
$$;
--> statement-breakpoint

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['workshops', 'photos', 'notes'] LOOP
    EXECUTE format(
      'CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION audit_row_change()',
      t, t
    );
  END LOOP;
END
$$;
--> statement-breakpoint

-- Append-only: no role may update, delete or truncate the log. The single
-- exception is delete_account(), which sets distil.purge inside its own
-- transaction to erase an account completely (Haij's third rule).
CREATE OR REPLACE FUNCTION audit_block_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('distil.purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_log is append-only';
END
$$;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_update_delete
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_block_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_block_mutation();
--> statement-breakpoint

-- Deleting an account and everything it owns, its audit trail included.
-- Only the account itself may call it.
CREATE OR REPLACE FUNCTION delete_account(p_user text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_workshops text[];
BEGIN
  IF p_user IS DISTINCT FROM app_user_id() THEN
    RAISE EXCEPTION 'delete_account: not the signed-in account';
  END IF;
  SELECT coalesce(array_agg(id), '{}') INTO v_workshops FROM workshops WHERE owner_id = p_user;
  DELETE FROM workshops WHERE owner_id = p_user;
  PERFORM set_config('distil.purge', 'on', true);
  DELETE FROM audit_log WHERE workshop_id = ANY (v_workshops);
  PERFORM set_config('distil.purge', 'off', true);
  DELETE FROM sessions WHERE user_id = p_user;
  DELETE FROM users WHERE id = p_user;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION delete_account(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION delete_account(text) TO distil_app;
--> statement-breakpoint

-- Deleting every image whose 24 hours are up, whoever it belongs to. The
-- application cannot see other accounts' images, so this runs as the
-- owner; it can only delete, only images, and only expired ones, and it
-- marks the photo so the facilitator sees why the image is gone. Returns
-- how many were deleted.
CREATE OR REPLACE FUNCTION purge_expired_images(p_now bigint) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer;
BEGIN
  WITH gone AS (
    DELETE FROM photo_images WHERE expires_at <= p_now RETURNING photo_id
  )
  UPDATE photos SET image_deleted_at = p_now, updated_at = p_now
    WHERE id IN (SELECT photo_id FROM gone);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION purge_expired_images(bigint) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION purge_expired_images(bigint) TO distil_app;
