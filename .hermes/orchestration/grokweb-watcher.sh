#!/bin/sh
# One cron tick. Python supplies flock(2), bounded transport and strict intake.
# Owner configuration: GROKWEB_BOT (dedicated bot name/id), GROKWEB_REFS,
# GROKWEB_STAGING_URL, GROKWEB_STATE_DIR, GROKWEB_MAX_PER_DAY (at most 6),
# GROKWEB_ATTEMPTS (default 2 per SHA).
# No cron installation, secret provisioning, app builds or ledger writes here.
set -u
umask 077
GROKWEB_SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 0
export GROKWEB_SCRIPT_DIR
command -v python3 >/dev/null 2>&1 || exit 0
if [ "${1-}" != "--locked" ]; then
    exec python3 "$GROKWEB_SCRIPT_DIR/grokweb-parse.py" --lock "$0"
fi
python3 "$GROKWEB_SCRIPT_DIR/grokweb-parse.py" --tick "$0" || :
exit 0
