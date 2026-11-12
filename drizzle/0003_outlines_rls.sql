-- The outline of a workshop follows the rules of every workshop table:
-- the application may reach it only through a workshop the acting user
-- owns, and every change goes to the audit log. Deleting the workshop
-- (or the account, through delete_account) takes it along.
GRANT SELECT, INSERT, UPDATE, DELETE ON "outlines" TO distil_app;
--> statement-breakpoint
ALTER TABLE "outlines" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outlines" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_own_rows ON "outlines" FOR ALL TO distil_app
  USING (workshop_id IN (SELECT id FROM workshops))
  WITH CHECK (workshop_id IN (SELECT id FROM workshops));
--> statement-breakpoint
CREATE TRIGGER audit_outlines AFTER INSERT OR UPDATE OR DELETE ON "outlines"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
