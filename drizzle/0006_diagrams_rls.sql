-- A photo's redrawn diagram follows the rules of every workshop table:
-- reachable only through a workshop the acting user owns, every change in
-- the audit log, and gone with the workshop or the account.
GRANT SELECT, INSERT, UPDATE, DELETE ON "diagrams" TO distil_app;
--> statement-breakpoint
ALTER TABLE "diagrams" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "diagrams" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY app_own_rows ON "diagrams" FOR ALL TO distil_app
  USING (workshop_id IN (SELECT id FROM workshops))
  WITH CHECK (workshop_id IN (SELECT id FROM workshops));
--> statement-breakpoint
CREATE TRIGGER audit_diagrams AFTER INSERT OR UPDATE OR DELETE ON "diagrams"
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
