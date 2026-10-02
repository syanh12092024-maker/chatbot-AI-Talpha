#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU MB — MỘT BẢN (CR-02-10 · MB1–MB4).
#
# Luật canh (01-QUYET-DINH §14): phía mình chỉ có MỘT bot và MỘT giao diện; không màn nào, không cửa
# nào phải hỏi một tiến trình thứ ba để biết hay đổi điều bot đang làm; «page này bot trả lời» có
# đúng MỘT công tắc — cột `page.bot_ai_bat`.
#
# Bảy chỗ trôi về được, mỗi chỗ một phép:
#   ① tệp của bot v1 mọc lại (`src/server.js`, `src/pancake-poll.js`, màn `/admin`…) hoặc có mã import lại;
#   ② có mã gọi HTTP sang `/admin/api` hay cổng 3100;
#   ③ một nguồn công tắc thứ hai mọc lại (`ai-enabled.json` · `V3_PAGE_XU_LY` · `giao_bot_moi` · `v3_ai_bat`);
#   ④ hai tiến trình v3 không còn tự khởi động lõi (worker sẽ lại không nạp KB);
#   ⑤ chữ «bot cũ / bot mới / tiến trình bot» trở lại trên màn (chuỗi người dùng thấy);
#   ⑥ bộ ca MB1 · MB2 + thước bảng khai biến;
#   ⑦ gỡ nhầm thứ pancake-tool (team khác) đang mượn của cây này — `src/wa.js` + bốn gói npm
#      (đo 02/10 trên prod: ba timer của họ chạy `src/gui-canh-bao.js` → `import './wa.js'`).
#
# CỔNG KHÔNG CẦN CSDL cho ①–⑤ (đọc mã nguồn); ⑥ chạy bộ ca nên cần Postgres như `npm test`.
# Đảo-vá đã làm ở bộ ca (mb1: bỏ `loadKB()` ⇒ đỏ · mb2: khôi phục `napCongTacAi` ⇒ đỏ).
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

LOI=0; PHEP=0
muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-56s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP + 1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP + 1)); LOI=$((LOI + 1)); printf '   ✘ %s\n' "$1"; }
bang() {
  so "$1" "$2"
  if [ "$2" = "$3" ]; then dat "$1 = $3"; else truot "$1: thật=$2 · chờ=$3"; fi
}
# Đếm dòng KHÔNG phải chú thích khớp mẫu trong các thư mục mã chạy thật.
dem_ma() {
  grep -rnE "$1" src v3/src v3/chay-that.js db/di-tru db/migrate.js deploy ops/bin/local-dev.mjs 2>/dev/null \
    | grep -vE '^[^:]+:[0-9]+:\s*(//|\*|/\*|#|--)' | wc -l | tr -d ' '
}

printf '═══ CỔNG MB · một bản (CR-02-10) ═══\n'
printf 'cây: %s · %s\n' "${GOC}" "$(git rev-parse --short HEAD 2>/dev/null)"

muc "① Tệp của bot v1 không mọc lại"
CON=""
for t in src/server.js src/admin.js src/admin-ops.js src/admin-scripts.js src/pancake-poll.js src/handler.js \
         src/store.js src/scheduler-followup.js src/scheduler-miner.js src/miner.js \
         public/admin.html public/ops.html public/scripts.html; do
  [ -e "$t" ] && CON="${CON} $t"
done
bang "tệp v1 còn trên cây" "${CON:- 0}" " 0"
bang "mã import tệp v1 (server|admin*|pancake-poll|handler|store|wa)" \
  "$(dem_ma "(from|import\()\s*['\"\`][^'\"\`]*/(server|admin|admin-[a-z]+|pancake-poll|handler|store|wa|scheduler-followup|scheduler-miner|miner)\.js['\"\`]")" "0"
bang "script package.json chạy src/server.js" "$(grep -c 'src/server.js' package.json)" "0"

muc "② Không mã nào gọi sang tiến trình bot v1"
bang "lời gọi HTTP /admin/api" "$(dem_ma "fetch\([^)]*/admin/api|['\"\`]/admin/api")" "0"
bang "mã trỏ cổng 3100" "$(dem_ma "(localhost|127\.0\.0\.1):3100|PORT \|\| 3100")" "0"

muc "③ MỘT công tắc — cột page.bot_ai_bat"
bang "mã đọc ai-enabled.json làm công tắc (ngoài bộ di trú dò page lạc)" \
  "$(grep -rnE "ai-enabled\.json|isAiEnabled|setAiEnabled|listAiEnabled" src v3/src v3/chay-that.js 2>/dev/null | grep -vE '^[^:]+:[0-9]+:\s*(//|\*)' | wc -l | tr -d ' ')" "0"
bang "mã đọc V3_PAGE_XU_LY / V3_GIAO_PAGE_TREN_MAN" "$(dem_ma "V3_PAGE_XU_LY|V3_GIAO_PAGE_TREN_MAN")" "0"
bang "mã đọc cột giao_bot_moi / v3_ai_bat" "$(dem_ma "giao_bot_moi|v3_ai_bat|giaoBotMoi")" "0"
bang "worker nạp page theo bot_ai_bat" "$(grep -c 'WHERE bot_ai_bat = true' src/queue/page-routing.js)" "1"
bang "migration 030 gỡ hai cột cũ" "$(grep -cE 'DROP COLUMN IF EXISTS (giao_bot_moi|v3_ai_bat)' db/migrate/030_mot_cong_tac.up.sql 2>/dev/null)" "2"

muc "④ Hai tiến trình v3 tự khởi động lõi bot"
bang "v3/chay-that.js gọi khoiDongLoi" "$(grep -c 'khoiDongLoi(' v3/chay-that.js)" "1"
bang "src/queue/chay-worker.js gọi khoiDongLoi" "$(grep -c 'khoiDongLoi(' src/queue/chay-worker.js)" "1"
bang "/webhook nằm ở tiến trình v3" "$(grep -c "app.post('/webhook'" v3/chay-that.js)" "1"
bang "bộ cài chỉ dựng hai dịch vụ v3" "$(grep -c '^SERVICES=(aicloser-v3 aicloser-worker-v3)$' deploy/setup.sh)" "1"

muc "⑤ Màn không còn nói «bot cũ / bot mới / tiến trình bot»"
CHU="$(grep -rnE "bot cũ|Bot cũ|bot mới|Bot mới|tiến trình bot|Tiến trình bot|nối cầu|Cầu sang" v3/src/ui 2>/dev/null \
  | grep -vE '^[^:]+:[0-9]+:\s*(//|\*|/\*)' | grep -vE "thì bot mới|bot mới (gọi|dùng)|không còn «bot cũ" | wc -l | tr -d ' ')"
bang "chuỗi hiển thị còn chữ của thời hai bot" "${CHU}" "0"

muc "⑥ Bộ ca"
if node --env-file-if-exists=.env --import ./test/_an-toan.mjs --test test/mb1-loi-trong-tien-trinh.test.mjs \
     test/mb2-mot-cong-tac.test.mjs test/nguon-page-bot-moi.test.mjs v3/test/b/bien-moi-truong-khai-du.test.mjs \
     >/tmp/mb-test.txt 2>&1; then
  dat "mb1 · mb2 · nguon-page-bot-moi · bảng khai biến xanh ($(grep -c '^✔' /tmp/mb-test.txt) ca)"
else
  truot "bộ ca đỏ — xem /tmp/mb-test.txt"
fi

muc "⑦ Không gỡ nhầm thứ pancake-tool đang mượn (team khác)"
bang "src/wa.js còn trên cây (gui-canh-bao.js của họ import)" "$( [ -f src/wa.js ] && echo 1 || echo 0)" "1"
bang "gói họ import từ node_modules của mình còn khai" \
  "$(node -e 'const d=require("./package.json").dependencies||{};console.log(["@whiskeysockets/baileys","dotenv","qrcode","qrcode-terminal"].filter(k=>d[k]).length)')" "4"

printf '\n═══ %s/%s phép đạt ═══\n' "$((PHEP - LOI))" "${PHEP}"
[ "${LOI}" -eq 0 ] || exit 1
exit 0
