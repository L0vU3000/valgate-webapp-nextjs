-- Custom SQL migration file, put your code below! --

-- Handoffs accepted before the welcome banner existed shouldn't surface it
-- retroactively for clients who've been using their portfolio for weeks.
UPDATE client_handoffs
SET welcome_seen_at = accepted_at
WHERE status = 'accepted' AND accepted_at IS NOT NULL AND welcome_seen_at IS NULL;