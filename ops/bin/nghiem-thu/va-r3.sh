#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU VA-R3 — Máy trạng thái: CAS ghiDon (RF-13) + job quét NHẶT
# LẠI đơn kẹt cho_gui_wa (RF-14). Thi hành đúng BỐN phép của ④ trong PHIEU-VA-R3.md.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT DANH SÁCH. Không dòng nào chỉ nói "chạy xong".
#
# ⚠️ BẪY tổng vừa bắt (22/08, phiếu khác): `refute-tong-the-1.repro.mjs` in ✅/🔴 ra
# MÀN HÌNH nhưng LUÔN thoát `rc=0` dù có 🔴 bên trong — script đó không tự phán, nó chỉ
# IN. Cổng này CẤM đọc `rc` của lượt `node docs/.../refute-tong-the-1.repro.mjs` làm
# thước; nó CHỈ dùng để lấy STDOUT, rồi cổng tự cắt ĐÚNG khối F5 (RF-13) + F2 (RF-14)
# ra khỏi khối F1/F3/F4/F6 (đất VA-R1/VA-R2, KHÔNG phải việc phiếu này) và tự đếm 🔴
# trong hai khối đó — phải đúng 0. Tin rc=0 là "xanh" ở đây là lặp lại NGUYÊN VĂN cái
# bug đang vá (ghi log nói một đằng, trạng thái thật một nẻo).
#
#   bash ops/bin/nghiem-thu/va-r3.sh
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
# (khuôn va-r4.sh, thử cả hai đời Node).
dem_ca() {
  local ra
  ra="$(node --test "$@" 2>&1 | grep -E '^# (pass|fail) ' | awk '{print $2"="$3}' | paste -sd' ' -)"
  if [ -z "${ra}" ]; then
    ra="$(node --test "$@" 2>&1 | grep -E '^ℹ (pass|fail) ' | awk '{print $2"="$3}' | paste -sd' ' -)"
  fi
  printf '%s' "${ra:-LOI-NODE}"
}

echo "CỔNG NGHIỆM THU VA-R3 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"

# ═══ ①+② phần A · repro chung — CẮT đúng khối F5/F2, đếm 🔴 trong TỪNG khối (=0) ═
# Script tự dựng+tự dọn sandbox riêng của nó (refute_tongthe1, xem db/sandbox.js) —
# cổng này không đụng CSDL nào của script đó, chỉ đọc STDOUT.
muc "①+② phần A · refute-tong-the-1.repro.mjs — cắt khối F5 (RF-13) + F2 (RF-14), đếm 🔴"
REPRO_LOG="$(mktemp)"
if ! node docs/thi-cong/nhat-ky/refute-tong-the-1.repro.mjs > "${REPRO_LOG}" 2>&1; then
  so "lượt chạy repro" "rc≠0 — VẪN đọc tiếp STDOUT (rc không phải thước, xem cảnh báo đầu file)"
fi

KHOI_F5="$(awk '/═══ F5 ·/{f=1} /═══ F6 ·/{f=0} f' "${REPRO_LOG}")"
KHOI_F2="$(awk '/═══ F2 ·/{f=1} /═══ F3a ·/{f=0} f' "${REPRO_LOG}")"

if [ -z "${KHOI_F5}" ]; then
  truot "khối F5 không tìm thấy trong log repro — thước hỏng hay file đổi cấu trúc?"
else
  echo "${KHOI_F5}" | sed 's/^/   /'
  DO_F5=$(printf '%s' "${KHOI_F5}" | grep -c '🔴'); DO_F5=${DO_F5:-0}
  bang "①F5 (RF-13) — số dòng 🔴 trong khối" "${DO_F5}" "0"
fi

if [ -z "${KHOI_F2}" ]; then
  truot "khối F2 không tìm thấy trong log repro — thước hỏng hay file đổi cấu trúc?"
else
  echo "${KHOI_F2}" | sed 's/^/   /'
  DO_F2=$(printf '%s' "${KHOI_F2}" | grep -c '🔴'); DO_F2=${DO_F2:-0}
  bang "②F2 (RF-14) — số dòng 🔴 trong khối" "${DO_F2}" "0"
fi
rm -f "${REPRO_LOG}"

# ═══ ①+②+③ phần B · test/va-r3-cas-nhat-lai.test.js — bằng chứng KHÔNG phụ thuộc
#     lịch chạy I/O của repro chung (R3-1..R3-7: CAS song song · nhặt lại thành công ·
#     nhặt lại hỏng → cho_sale+viec_can_xu_ly · per-đơn không hỏng cả lô) ═════════════
muc "①+②+③ phần B · test/va-r3-cas-nhat-lai.test.js (in trước/sau R3-4/R3-5)"
node --test test/va-r3-cas-nhat-lai.test.js 2>&1 | tee /tmp/va-r3-out.txt \
  | grep -E '^\s+R3-|^✔|^✖|not ok' || true
CA_R3="$(dem_ca test/va-r3-cas-nhat-lai.test.js)"
bang "bộ ca VA-R3 (7 ca: R3-1..R3-7)" "${CA_R3}" "pass=7 fail=0"

# ═══ ④ Hồi quy — l3-m1 (chủ file bị đụng) + l3-m3 (dùng apDung/nhanPhanHoi làm vào) ═
# ⚠️ KHÔNG neo con số "pass=N" tuyệt đối: l3-m3-doc-y.test.js là đất SONG SONG của
# VA-R4 (đang chạy cùng lúc, xem đầu phiếu) — số ca ở FILE ĐÓ có thể tăng giữa hai lượt
# đo mà không phải hồi quy của VA-R3. Chỉ "fail" mới là thước — 0 tuyệt đối, không trôi.
muc "④ Hồi quy node --test l3-m1-*.test.js + l3-m3-*.test.js — interface giữ nguyên"
CA_REG="$(dem_ca test/l3-m1-may-trang-thai.test.js test/l3-m1-quet-don.test.js test/l3-m3-doc-y.test.js test/l3-m3-lich-nhac.test.js test/l3-m3-nhan-phan-hoi-wa.test.js)"
so "hồi quy l3-m1 + l3-m3 (5 file) — thô" "${CA_REG}"
REG_FAIL="$(printf '%s' "${CA_REG}" | grep -oE 'fail=[0-9]+' | cut -d= -f2)"
bang "hồi quy — số ca FAIL (thước duy nhất, pass=N chỉ để THAM KHẢO)" "${REG_FAIL:-LOI-NODE}" "0"

printf '\n═══ TỔNG: %d phép · %d ĐỎ ═══\n' "${PHEP}" "${LOI}"
[ "${LOI}" -eq 0 ] || exit 1
exit 0
