-- Phase 1 (client-permission-leader): replace manager_access_intent ("keep"/"leave") with
-- manager_access_model ("approval"/"full"/"remove"). Existing rows get "approval" (the new default).
CREATE TYPE "public"."manager_access_model" AS ENUM('approval', 'full', 'remove');
--> statement-breakpoint
ALTER TABLE "client_handoffs" ADD COLUMN "manager_access_model" "manager_access_model" NOT NULL DEFAULT 'approval';
--> statement-breakpoint
ALTER TABLE "client_handoffs" DROP COLUMN "manager_access_intent";
--> statement-breakpoint
DROP TYPE "public"."manager_access_intent";
