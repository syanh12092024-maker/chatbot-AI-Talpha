#!/usr/bin/env bash
# Cài & chạy AI Closer trên VPS (Ubuntu/Debian, chạy dưới quyền root).
# Chạy lại nhiều lần được (idempotent): dùng để cài mới HOẶC cập nhật code.
#   bash deploy/setup.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/aicloser}"
REPO="${REPO:-https://github.com/syanh12092024-maker/chatbot-AI-Talpha.git}"
BRANCH="${BRANCH:-main}"

echo "== 1) Cài Node.js 20 + git (nếu thiếu) =="
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs git
else
  command -v git >/dev/null 2>&1 || apt-get install -y git
fi
node -v

echo "== 2) Lấy/cập nhật mã nguồn về $APP_DIR =="
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --all --quiet
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
fi

cd "$APP_DIR"
echo "== 3) Cài thư viện =="
npm ci --omit=dev 2>/dev/null || npm install --omit=dev

if [ ! -f "$APP_DIR/.env" ]; then
  echo "!! CHƯA CÓ $APP_DIR/.env — hãy tạo file .env (secrets) rồi chạy lại script này."
  echo "   Xem mẫu tại .env.example"
fi

echo "== 4) Tạo dịch vụ systemd (tự chạy khi bật máy + tự bật lại khi crash) =="
NODE_BIN="$(command -v node)"
cat >/etc/systemd/system/aicloser.service <<UNIT
[Unit]
Description=AI Closer (Messenger/Pancake bot + dashboard)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=$NODE_BIN src/server.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production
StandardOutput=append:/var/log/aicloser.log
StandardError=append:/var/log/aicloser.log

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable aicloser >/dev/null 2>&1 || true
systemctl restart aicloser

echo "== 5) Trạng thái =="
sleep 2
systemctl --no-pager status aicloser | head -12 || true
echo
echo "Xong. Log realtime: journalctl -u aicloser -f   (hoặc tail -f /var/log/aicloser.log)"
echo "Dashboard: http://<IP-VPS>:$(grep -E '^PORT=' "$APP_DIR/.env" 2>/dev/null | cut -d= -f2 || echo 3100)/admin"
