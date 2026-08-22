#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU VA-R4 — doc-y.js: phủ định KHÔNG được đọc thành xac_nhan
# (RF-20, §9b SO-DIEU-HANH-THI-CONG.md). Thi hành đúng BỐN phép của ④.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT DANH SÁCH. Không dòng nào chỉ nói "chạy xong".
# docY() là hàm THUẦN (không pool/await/đồng hồ/I-O, xem doc-y.js:9) — cổng này
# KHÔNG cần DB/mạng, chạy offline được (khác phần lớn cổng khác của dây chuyền này).
#
#   bash ops/bin/nghiem-thu/va-r4.sh
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
  case "$2" in
    *LOI-NODE*) truot "$1: câu đo HỎNG (LOI-NODE) — không đọc là đạt"; return ;;
  esac
  if [ "$2" = "$3" ]; then dat "$1 = $3"; else truot "$1: thật=$2 · chờ=$3"; fi
}

# Đếm pass/fail của `node --test` — bản Node của máy này in "ℹ pass N"/"ℹ fail N"
# (không phải "# pass N" như bản cũ hơn) — thử cả hai khuôn, khớp cả hai đời Node.
dem_ca() {
  local ra
  ra="$(node --test "$@" 2>&1 | grep -E '^# (pass|fail) ' | awk '{print $2"="$3}' | paste -sd' ' -)"
  if [ -z "${ra}" ]; then
    ra="$(node --test "$@" 2>&1 | grep -E '^ℹ (pass|fail) ' | awk '{print $2"="$3}' | paste -sd' ' -)"
  fi
  printf '%s' "${ra:-LOI-NODE}"
}

echo "CỔNG NGHIỆM THU VA-R4 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "docY() thuần — không DB, không mạng"

# ═══ ①②③ bộ ca VA-R4 — RF-20 (EN≥6/AR≥4 không xac_nhan) + nhánh cũ giữ nguyên ═══
# test/va-r4-doc-y-phu-dinh.test.js tự in "[ngôn ngữ] "câu" → nhánh" cho MỌI ca
# (console.log trong từng test) — chạy thẳng để phép ①②③ hiện NGUYÊN VĂN câu→nhánh,
# không chỉ một con số câm.
muc "①②③ test/va-r4-doc-y-phu-dinh.test.js — chạy đủ, in từng câu → nhánh"
node --test test/va-r4-doc-y-phu-dinh.test.js 2>&1 | tee /tmp/va-r4-out.txt | grep -E '^\s+\[|^✔|^✖|not ok' || true
CA_R4="$(dem_ca test/va-r4-doc-y-phu-dinh.test.js)"
bang "bộ ca VA-R4 — R4-1 phủ định EN(≥6)·R4-2 không hồi quy·R4-3 AR(≥4)·R4-4 no/لا mâu thuẫn" \
  "${CA_R4}" "pass=4 fail=0"

# ═══ ④ Hồi quy l3-m3 (doc-y là đầu vào trực tiếp của nhan-phan-hoi-wa) ═════════
# Chỉ 2 file THẬT SỰ import doc-y.js (đo bằng grep -l, không đoán):
# l3-m3-doc-y.test.js (ca đơn vị của chính doc-y) + l3-m3-nhan-phan-hoi-wa.test.js
# (bộ ca dùng docY làm đầu vào máy trạng thái phản hồi WA). l3-m3-lich-nhac.test.js
# KHÔNG import doc-y — ngoài phạm vi hồi quy của phiếu này, không gộp vào để khỏi
# làm loãng con số (luật "so DANH SÁCH, không so SỐ").
muc "④ hồi quy test/l3-m3-doc-y.test.js + test/l3-m3-nhan-phan-hoi-wa.test.js"
CA_L3M3="$(dem_ca test/l3-m3-doc-y.test.js test/l3-m3-nhan-phan-hoi-wa.test.js)"
bang "hồi quy L3-M3 (doc-y 8 ca + nhan-phan-hoi-wa 11 ca = 19)" "${CA_L3M3}" "pass=19 fail=0"

# ═══ TỔNG KẾT ═════════════════════════════════════════════════════════════════
printf '\n──────────────────────────────────────────────────────────────\n'
printf 'VA-R4 · PHÉP: %s · ĐẠT: %s · TRƯỢT: %s\n' "${PHEP}" "$((PHEP - LOI))" "${LOI}"
if [ "${LOI}" -eq 0 ]; then
  printf '✔ CỔNG VA-R4 XANH\n'
  exit 0
fi
printf '✘ CỔNG VA-R4 ĐỎ — %s phép trượt\n' "${LOI}"
exit 1
