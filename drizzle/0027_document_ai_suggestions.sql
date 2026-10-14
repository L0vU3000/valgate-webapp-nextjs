-- ai-suggestions: the property fields a document disagrees with, written once when the document is
-- read, so revisiting the page recalls the answer instead of paying for the same read again.
-- Shape: [{ field, label, current, suggested, next, status }] where status is "pending" | "accepted"
-- | "dismissed". The per-entry status is the point: a decision sticks, so an answered suggestion
-- stops being a suggestion instead of nagging on every visit.
-- NULL means "never read against the property" — distinct from [] which means "read, and it agrees".
-- Hand-authored (drizzle-kit generate is blocked by a pre-existing snapshot collision, see 0025).
-- IF NOT EXISTS keeps this idempotent on branches where the column already exists.
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "ai_suggestions" jsonb;
