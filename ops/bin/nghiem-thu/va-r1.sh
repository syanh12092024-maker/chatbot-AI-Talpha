#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU VA-R1 — Bộ não không bắn HTTP GHI thật khi van đóng (RF-1) ·
# worker đọc van + nguonDangMo không mở nhầm (RF-2) · guard đủ cờ (RF-3). Sáu phép ④.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT DANH SÁCH. Không dòng nào chỉ nói "chạy xong".
# ⚠️ `refute-MANG-2.repro.mjs` in ✅/❌ nhưng LUÔN thoát rc=0 — cổng CHỈ lấy STDOUT, cắt
#    đúng khối S1·S3·S4 (đất VA-R1; S2/S5 là NÊN F4/F5, ngoài phiếu) rồi đếm ❌ = 0.
#
#   bash ops/bin/nghiem-thu/va-r1.sh
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

LOI=0
PHEP=0
muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-58s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP + 1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP + 1)); LOI=$((LOI + 1)); printf '   ✘ %s\n' "$1"; }
bang() {
  so "$1" "$2"
  case "$2" in *LOI-NODE*) truot "$1: câu đo HỎNG (LOI-NODE)"; return ;; esac
  if [ "$2" = "$3" ]; then dat "$1 = $3"; else truot "$1: thật=$2 · chờ=$3"; fi
}
dem_ca() {
  local ra
  ra="$(node --env-file=.env --experimental-test-module-mocks --test "$@" 2>&1 | grep -E '^# (pass|fail) ' | awk '{print $2"="$3}' | paste -sd' ' -)"
  [ -z "${ra}" ] && ra="$(node --env-file=.env --experimental-test-module-mocks --test "$@" 2>&1 | grep -E '^ℹ (pass|fail) ' | awk '{print $2"="$3}' | paste -sd' ' -)"
  printf '%s' "${ra:-LOI-NODE}"
}
khoi() { awk -v a="═══ $1 ·" -v b="═══ $2 ·" 'index($0,a){f=1} index($0,b){f=0} f' "$3"; }
dem_do_khoi() {
  local k; k="$(khoi "$2" "$3" "${REPRO_LOG}")"
  if [ -z "${k}" ]; then truot "$1: khối $2 không thấy trong log repro"; return; fi
  echo "${k}" | grep -v '^\[llm\]' | sed 's/^/   /'
  local n; n=$(printf '%s' "${k}" | grep -c '❌'); n=${n:-0}
  bang "$1 — số dòng ❌ trong khối $2" "${n}" "0"
}

echo "CỔNG NGHIỆM THU VA-R1 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
so "PANCAKE_READONLY trong .env (luật 1 §0a)" "$(grep -c '^PANCAKE_READONLY=1' .env)"

# ═══ ①②④ · repro MẢNG-2 — cắt S1 (RF-1 tool-loop) · S3 (RF-3) · S4 (RF-1 HTTP ghi) ═══
muc "①②④ refute-MANG-2.repro.mjs — cắt S1/S3/S4, đếm ❌ từng khối (S2/S5 = NÊN, ngoài phiếu)"
REPRO_LOG="$(mktemp)"
node --env-file=.env docs/thi-cong/nhat-ky/refute-MANG-2.repro.mjs > "${REPRO_LOG}" 2>&1 \
  || so "lượt chạy repro" "rc≠0 — VẪN đọc STDOUT (rc không phải thước)"
dem_do_khoi "②RF-1 S1 (van đóng ⇒ 0 lượt bộ não)" S1 S2
dem_do_khoi "④RF-3 S3 (guard đủ cờ qua handler-v3)" S3 S5
dem_do_khoi "①RF-1 S4 (executeTool ⇒ 0 HTTP GHI tới bẫy)" S4 "(sandbox"
GHI_S4="$(khoi S4 "(sandbox" "${REPRO_LOG}" | grep -oE 'GHI [0-9]+' | awk '{print $2}')"
bang "①RF-1 S4 — số lượt HTTP GHI tới bẫy" "${GHI_S4:-LOI-NODE}" "0"
DOC_S4="$(khoi S4 "(sandbox" "${REPRO_LOG}" | grep -oE 'ĐỌC [0-9]+' | awk '{print $2}')"
bang "⑤ĐỐI CHỨNG DƯƠNG S4 — đường ĐỌC (GET settings) vẫn chạy (>0)" "$([ "${DOC_S4:-0}" -gt 0 ] && echo co || echo khong)" "co"
rm -f "${REPRO_LOG}"

# ═══ ③ · RF-2 nguonDangMo — DB THẬT (host xa) + V3_NAP_DEV=1 + READONLY=1 ⇒ false; đổi cwd ⇒ vẫn false ═
muc "③ RF-2 nguonDangMo — DB xa ⇒ false · cwd khác (env vắng READONLY, đọc .env tuyệt đối) ⇒ false · localhost sandbox ⇒ true"
XA="postgres://u:p@169.58.33.8:5432/aicloser_v3"
R_XA="$(PANCAKE_READONLY=1 V3_NAP_DEV=1 DATABASE_URL_V3="${XA}" node -e "import('./src/queue/nap.js').then(m=>console.log(m.nguonDangMo()))" 2>/dev/null | tail -1)"
bang "READONLY=1 + V3_NAP_DEV=1 + DB 169.58.33.8 (từ gốc repo)" "${R_XA}" "false"
R_CWD="$(cd /tmp && env -u PANCAKE_READONLY V3_NAP_DEV=1 DATABASE_URL_V3="${XA}" node -e "import('${GOC}/src/queue/nap.js').then(m=>console.log((process.env.PANCAKE_READONLY===undefined)+'|'+m.nguonDangMo()))" 2>/dev/null | tail -1)"
bang "cwd=/tmp, process.env VẮNG READONLY (true) + DB xa ⇒ van" "${R_CWD}" "true|false"
R_CWD0="$(cd /tmp && env -u PANCAKE_READONLY -u V3_NAP_DEV node -e "import('${GOC}/src/queue/nap.js').then(m=>console.log(m.nguonDangMo()))" 2>/dev/null | tail -1)"
bang "cwd=/tmp, env vắng READONLY + vắng NAP_DEV (F2 biến thể 2 cũ ⇒ true)" "${R_CWD0}" "false"
R_GAN="$(PANCAKE_READONLY=1 V3_NAP_DEV=1 DATABASE_URL_V3="postgres://u:p@localhost:5433/x" node -e "import('./src/queue/nap.js').then(m=>console.log(m.nguonDangMo()))" 2>/dev/null | tail -1)"
bang "ĐỐI CHỨNG: READONLY=1 + NAP_DEV=1 + DB localhost (harness S4b)" "${R_GAN}" "true"

# ═══ ①–④ · test/va-r1-van-gui.test.js (R1-1..R1-6) ═══
muc "①–④ test/va-r1-van-gui.test.js — cổng verb/host · đối chứng van mở · S1 · worker · nguonDangMo · RF-3"
node --env-file=.env --test test/va-r1-van-gui.test.js 2>&1 | grep -E '^\s{3}[A-Za-z0-9]|^✔|^✖|not ok' || true
bang "bộ ca VA-R1 (6 ca: R1-1..R1-6)" "$(dem_ca test/va-r1-van-gui.test.js)" "pass=6 fail=0"

# ═══ ⑥ · hồi quy l2-m1 (cờ mock) + l2-m2/l2-m3 + l1-m2 cửa ═══
muc "⑥ hồi quy l2-m1 (cờ --experimental-test-module-mocks) · l2-m2 · l2-m3 · l1-m2 — thước: fail=0"
CA_REG="$(dem_ca test/l2-m1-hang-doi.test.js test/l2-m1-nhac-truong.test.js test/l2-m2-handler.test.js test/l2-m2-lop-tu-khoa.test.js test/l2-m3-handler.test.js test/l2-m3-ngan-sach-luot.test.js test/l2-m3-rap-prompt.test.js test/l1-m2-cua.test.js)"
so "hồi quy 8 file — thô" "${CA_REG}"
REG_FAIL="$(printf '%s' "${CA_REG}" | grep -oE 'fail=[0-9]+' | cut -d= -f2)"
bang "hồi quy — số ca FAIL" "${REG_FAIL:-LOI-NODE}" "0"
bang "file cấm KHÔNG bị đụng (git diff HEAD tools/closer/pancake/order-bridge/messenger)" "$(git diff --name-only HEAD -- src/tools.js src/closer.js src/pancake.js src/order-bridge.js src/messenger.js src/prompts.js src/fast-lane.js src/outbound-guard.js | wc -l | tr -d ' ')" "0"

printf '\n═══ TỔNG: %d phép · %d ĐỎ ═══\n' "${PHEP}" "${LOI}"
[ "${LOI}" -eq 0 ] || exit 1
exit 0
