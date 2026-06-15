#!/usr/bin/env bash
set -euo pipefail

# Full "A Day at EggFleet" E2E pipeline -- Maestro (mobile driver app) +
# Playwright (admin web), driven entirely through the real UIs. No API calls
# are used for test setup or data creation.
#
# To test with different data, edit eggfleet-admin/e2e/data/test-data.ts and
# re-run this script with a NEW E2E_RUN_ID. Phase 1/2 (master data,
# inventory & assignments) are one-shot "Setup" steps for a given
# E2E_RUN_ID -- reusing an id that has already been set up will fail on
# duplicate-creation (vendor phone / route name / van number / driver phone
# / assignment uniqueness).
#
# Prerequisites:
#   - eggfleet-service running on http://localhost:3000 (api/v1)
#   - eggfleet-admin dev server running on http://localhost:5173
#   - An Android emulator or iOS simulator booted with the eggfleet app
#     installed (com.eggfleet.app)
#   - Maestro CLI installed (~/.maestro/bin/maestro)
#
# Usage (from eggfleet-admin/):
#   E2E_RUN_ID=100002 ./e2e/scripts/run-e2e.sh
#
# Wipe all data from the local dev DB and re-seed the admin user first
# (eggfleet-service/scripts/reset-local-db.ts), then run the full pipeline:
#   E2E_RUN_ID=100002 ./e2e/scripts/run-e2e.sh reset-and-run
#
# Just the reset (no tests, no E2E_RUN_ID needed):
#   ./e2e/scripts/run-e2e.sh reset
#
# Run a single phase only, e.g. just the admin Playwright specs:
#   E2E_RUN_ID=100002 ./e2e/scripts/run-e2e.sh playwright
# or just the mobile Maestro flows:
#   E2E_RUN_ID=100002 ./e2e/scripts/run-e2e.sh maestro

PHASE="${1:-all}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIN_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$ADMIN_DIR/.." && pwd)"
SERVICE_DIR="$REPO_ROOT/eggfleet-service"
MAESTRO_DIR="$REPO_ROOT/eggfleet/.maestro"

export PATH="$HOME/.maestro/bin:$PATH"

step() { echo; echo "==> $*"; }

run_reset() {
  step "Resetting local DB and re-seeding admin (eggfleet-service)"
  (cd "$SERVICE_DIR" && npm run db:reset:local)
}

# "reset" doesn't touch test data and doesn't need E2E_RUN_ID -- handle it
# before the E2E_RUN_ID check / Maestro env setup below.
if [[ "$PHASE" == "reset" ]]; then
  run_reset
  echo
  echo "DB reset complete."
  exit 0
fi

: "${E2E_RUN_ID:?Set E2E_RUN_ID, e.g. E2E_RUN_ID=100002 ./e2e/scripts/run-e2e.sh}"
export E2E_RUN_ID

if [[ "$PHASE" == "reset-and-run" ]]; then
  run_reset
  PHASE="all"
fi

# Build `-e KEY=value` args for `maestro test` from test-data.ts, for this
# E2E_RUN_ID (see generate-maestro-env.ts).
MAESTRO_ENV_ARGS=()
while IFS='=' read -r key val; do
  MAESTRO_ENV_ARGS+=(-e "${key}=${val}")
done < <(cd "$ADMIN_DIR" && npx tsx e2e/scripts/generate-maestro-env.ts)

run_maestro() {
  step "Maestro: $*"
  (cd "$MAESTRO_DIR" && maestro test "${MAESTRO_ENV_ARGS[@]}" "$@")
}

run_playwright() {
  step "Playwright: $*"
  (cd "$ADMIN_DIR" && npx playwright test "$@" --reporter=line)
}

run_setup_and_deliveries() {
  # Phase 1/2 (admin) -- master data, inventory purchases, assignments &
  # van loads, damaged eggs. Generates the VEHICLE_ASSIGNMENT ("New Van
  # Assignment") notifications checked by 8.1/8.2.
  run_playwright e2e/tests/01-master-data.spec.ts
  run_playwright e2e/tests/02-inventory-assignments.spec.ts

  # Phase 3/4/5 (mobile) -- D1/D2 deliveries, payment submissions, cash &
  # egg handovers, plus the change/forgot-password negative + OTP flows
  # (9.16-9.18).
  run_maestro 01-d1-login.yaml
  run_maestro 02-d1-del1-pay1.yaml
  run_maestro 03-d1-del2-pay2.yaml
  run_maestro 04-d1-handover-ho1.yaml
  run_maestro 05-d2-del3-pay3.yaml
  run_maestro 06-d2-del4-unpaid.yaml
  run_maestro 07-d2-collect-pay4.yaml
  run_maestro 08-d2-handover-ho2.yaml
  run_maestro 09-d1-change-password-negative.yaml
  run_maestro 10-d1-forgot-password.yaml
}

run_admin_review() {
  # Phase 4/5/6/7/8/9 (admin) -- verify/approve/reject payments & handovers,
  # vendor payments & expenses, dashboard reconciliation, notification panel
  # and edge/negative cases.
  run_playwright e2e/tests/04-payments-admin.spec.ts
  run_playwright e2e/tests/05-handovers-admin.spec.ts
  run_playwright e2e/tests/06-vendor-payments-expenses.spec.ts
  run_playwright e2e/tests/07-dashboard-reconciliation.spec.ts
  run_playwright e2e/tests/08-notifications-edge-cases.spec.ts
}

run_driver_notifications_and_status() {
  # Phase 8 (mobile) -- D1/D2 see the payment/handover decisions & van
  # assignment notifications from the steps above (8.1/8.2/8.5/8.6/8.9/8.10).
  run_maestro 11-d1-notifications.yaml
  run_maestro 12-d2-notifications.yaml

  # Phase 9.5/9.6 -- deactivate D2 (admin) -> mobile login is blocked ->
  # reactivate D2 (admin) -> mobile login succeeds again. This interleaving
  # is required because the status toggle only exists in the admin UI but
  # the pass/fail check only exists on mobile.
  run_playwright e2e/tests/09-driver-deactivate.spec.ts
  run_maestro 13-d2-login-deactivated.yaml
  run_playwright e2e/tests/10-driver-reactivate.spec.ts
  run_maestro 14-d2-login-reactivated.yaml
}

case "$PHASE" in
  all)
    run_setup_and_deliveries
    run_admin_review
    run_driver_notifications_and_status
    ;;
  maestro)
    run_maestro 01-d1-login.yaml
    run_maestro 02-d1-del1-pay1.yaml
    run_maestro 03-d1-del2-pay2.yaml
    run_maestro 04-d1-handover-ho1.yaml
    run_maestro 05-d2-del3-pay3.yaml
    run_maestro 06-d2-del4-unpaid.yaml
    run_maestro 07-d2-collect-pay4.yaml
    run_maestro 08-d2-handover-ho2.yaml
    run_maestro 09-d1-change-password-negative.yaml
    run_maestro 10-d1-forgot-password.yaml
    run_maestro 11-d1-notifications.yaml
    run_maestro 12-d2-notifications.yaml
    ;;
  playwright)
    run_playwright e2e/tests/01-master-data.spec.ts
    run_playwright e2e/tests/02-inventory-assignments.spec.ts
    run_admin_review
    ;;
  *)
    echo "Unknown phase '$PHASE' (expected: all | reset | reset-and-run | maestro | playwright)" >&2
    exit 1
    ;;
esac

echo
echo "All flows passed for E2E_RUN_ID=$E2E_RUN_ID"
