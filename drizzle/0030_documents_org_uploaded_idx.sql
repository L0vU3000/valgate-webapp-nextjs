CREATE INDEX "ix_documents_org_uploaded_id" ON "documents" ("org_id", "uploaded_at" DESC, "id" DESC);
