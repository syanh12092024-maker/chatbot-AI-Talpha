#!/usr/bin/env bash
# Deploy the reviewed checkout already on the host. No git reset/pull, no secret generation.
# --check: read only. --apply: backup, migrate, install/restart all three services.
set -euo pipefail
APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
MODE="${1:---check}"
DEPLOY_MODE="${DEPLOY_MODE:-configure}"
[[ "$MODE" == --check || "$MODE" == --apply ]] || { echo 'Dùng --check hoặc --apply'; exit 2; }
[[ "$DEPLOY_MODE" == configure || "$DEPLOY_MODE" == pilot ]] || { echo 'DEPLOY_MODE: configure hoặc pilot'; exit 2; }
[[ "$APP_DIR" =~ ^/[A-Za-z0-9_./-]+$ ]] || { echo 'Đường deploy Linux không được có khoảng trắng/ký tự đặc biệt'; exit 2; }
cd "$APP_DIR"
NODE_BIN="$(command -v node)"
for bin in npm pg_dump pg_restore systemctl flock curl; do command -v "$bin" >/dev/null || { echo "Thiếu công cụ: $bin"; exit 1; }; done
[[ -f .env && -f package-lock.json ]] || { echo 'Thiếu .env hoặc package-lock.json'; exit 1; }
"$NODE_BIN" --env-file=.env deploy/preflight.mjs
# Existing drop-ins may override ExecStart or re-open sending after this script
# writes a closed-mode unit. Require them to be reviewed instead of ignoring them.
for service in aicloser aicloser-v3 aicloser-worker-v3; do
  overrides="$(systemctl show "$service" -p DropInPaths --value)"
  [[ -z "$overrides" ]] || { echo "Cần hợp nhất systemd drop-in của $service trước khi deploy: $overrides"; exit 1; }
done
if [[ "$DEPLOY_MODE" == pilot ]]; then
  "$NODE_BIN" --env-file=.env --input-type=module -e '
    const pages=(process.env.V3_PAGE_XU_LY||"").split(/[,\s]+/).filter(Boolean);
    if(pages.length!==1 || process.env.V3_PANCAKE_GUI!=="1" || process.env.PANCAKE_READONLY==="1" || process.env.V3_RAP_PROMPT_BAT!=="1") {
      console.error("Pilot cần đúng 1 Page, V3_PANCAKE_GUI=1, V3_RAP_PROMPT_BAT=1 và PANCAKE_READONLY khác 1");process.exit(1);
    }'
fi
if [[ "$MODE" == --check ]]; then
  echo "Preflight đạt. Kế hoạch: backup → dừng dịch vụ → npm ci → migrate → 3 services ($DEPLOY_MODE) → smoke test."
  exit 0
fi
[[ "$(id -u)" == 0 ]] || { echo '--apply cần quyền root để quản lý systemd'; exit 1; }
UNIT_DIR="${SYSTEMD_UNIT_DIR:-/etc/systemd/system}"
LOCK_FILE="${DEPLOY_LOCK_FILE:-/run/lock/aicloser-deploy.lock}"
mkdir -p "$UNIT_DIR"
exec 9>"$LOCK_FILE"
flock -n 9 || { echo 'Đang có lượt deploy khác'; exit 1; }
BACKUP_DIR="${BACKUP_DIR:-/var/backups/aicloser/$(date -u +%Y%m%dT%H%M%SZ)}"
[[ ! -e "$BACKUP_DIR" ]] || { echo 'Thư mục backup đã tồn tại'; exit 1; }
umask 077
mkdir -p "$BACKUP_DIR/units"
cp .env "$BACKUP_DIR/env"
SERVICES=(aicloser aicloser-v3 aicloser-worker-v3)
EXISTING=()
for service in "${SERVICES[@]}"; do
  if [[ "$(systemctl show "$service" -p LoadState --value)" != not-found ]]; then EXISTING+=("$service"); fi
  if [[ -f "$UNIT_DIR/$service.service" ]]; then cp "$UNIT_DIR/$service.service" "$BACKUP_DIR/units/"; fi
  systemctl is-active "$service" >"$BACKUP_DIR/$service.previous-state" || true
done
# Pause writes before the database snapshot. On failure keep services stopped; never
# resurrect an old live bot automatically after a partially completed deployment.
CHANGED=0
on_exit() {
  rc=$?
  if [[ $rc != 0 && $CHANGED == 1 ]]; then
    systemctl stop "${SERVICES[@]}" || true
    echo "Deploy chưa đạt; dịch vụ giữ dừng. Backup: $BACKUP_DIR. Không tự rollback database."
  fi
}
trap on_exit EXIT
CHANGED=1
if (( ${#EXISTING[@]} )); then systemctl stop "${EXISTING[@]}"; fi
"$NODE_BIN" --env-file=.env deploy/backup.mjs "$BACKUP_DIR"
npm ci --omit=dev
"$NODE_BIN" --env-file=.env db/migrate.js
"$NODE_BIN" --env-file=.env deploy/preflight.mjs --ready
# Always keep order creation closed at initial deployment; opening POS is a separate
# operator action after the chat pilot passes. Existing .env contents are unchanged.
write_unit() {
  local service="$1" entry="$2"
  cat >"$UNIT_DIR/$service.service" <<UNIT
[Unit]
Description=AI Closer V3 - $service
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=$NODE_BIN --env-file=$APP_DIR/.env $entry
Restart=on-failure
RestartSec=3
TimeoutStopSec=120
KillSignal=SIGTERM
Environment=NODE_ENV=production
Environment=V3_POS_GHI=0
StandardOutput=journal
StandardError=journal
UMask=0077
UNIT
  if [[ "$DEPLOY_MODE" == configure ]]; then
    cat >>"$UNIT_DIR/$service.service" <<'UNIT'
Environment=PANCAKE_READONLY=1
Environment=V3_PANCAKE_GUI=0
Environment=V3_PAGE_XU_LY=
UNIT
  fi
  # The server's old poller must stay closed during a V3-only pilot. V3 receives its
  # messages through the worker or webhook, not through the legacy poller.
  if [[ "$service" == aicloser ]]; then echo 'Environment=V3_LEGACY_POLL_OFF=1' >>"$UNIT_DIR/$service.service"; fi
  printf '\n[Install]\nWantedBy=multi-user.target\n' >>"$UNIT_DIR/$service.service"
  chmod 644 "$UNIT_DIR/$service.service"
}
write_unit aicloser src/server.js
write_unit aicloser-v3 v3/chay-that.js
write_unit aicloser-worker-v3 src/queue/chay-worker.js
systemctl daemon-reload
systemctl enable "${SERVICES[@]}"
systemctl restart "${SERVICES[@]}"
PORTS="$("$NODE_BIN" --env-file=.env --input-type=module -e 'console.log(`${process.env.PORT||3100} ${process.env.CHAYTHAT_CONG||3102}`)')"
read -r SERVER_PORT UI_PORT <<<"$PORTS"
for attempt in {1..20}; do
  if systemctl is-active --quiet aicloser && systemctl is-active --quiet aicloser-v3 && systemctl is-active --quiet aicloser-worker-v3 &&
    curl -fsS --max-time 2 "http://127.0.0.1:$SERVER_PORT/health" >/dev/null &&
    curl -fsS --max-time 2 "http://127.0.0.1:$UI_PORT/dang-nhap" >/dev/null; then
    echo "Deploy đạt ($DEPLOY_MODE). Backup: $BACKUP_DIR. UI: /van-hanh-v3 (HTTPS hoặc SSH tunnel)."
    exit 0
  fi
  sleep 1
done
echo 'Smoke test không đạt; xem journalctl cho từng service.'
exit 1
