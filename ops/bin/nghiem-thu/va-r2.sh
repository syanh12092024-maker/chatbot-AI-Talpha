#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU VA-R2 — Cụm tiền + tạo đơn: RF-9 (đơn vị tiền ×hệ-số) ·
# RF-10 (mã 8 = packing) · RF-11 (phân trang nguồn b) · RF-12 (idempotent POST-rollback)
# · RF-21 (khoá hội thoại) · RF-15 (san_pham.page_id). Thi hành 7 phép của ④ PHIEU-VA-R2.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT DANH SÁCH. Không dòng nào chỉ nói "chạy xong".
#
# ⚠️ `refute-tong-the-1.repro.mjs` in ✅/🔴 nhưng LUÔN thoát rc=0 — cổng này CHỈ lấy
# STDOUT, tự cắt ĐÚNG bốn khối F1·F3·F4·F6 (đất VA-R2; F2/F5 là VA-R3) rồi đếm 🔴 = 0.
#
#   bash ops/bin/nghiem-thu/va-r2.sh
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
dem_ca() {
  local ra
  ra="$(node --env-file=.env --test "$@" 2>&1 | grep -E '^# (pass|fail) ' | awk '{print $2"="$3}' | paste -sd' ' -)"
  if [ -z "${ra}" ]; then
    ra="$(node --env-file=.env --test "$@" 2>&1 | grep -E '^ℹ (pass|fail) ' | awk '{print $2"="$3}' | paste -sd' ' -)"
  fi
  printf '%s' "${ra:-LOI-NODE}"
}
khoi() { # cắt khối từ «═══ $1 ·» tới «═══ $2 ·» (không gồm)
  awk -v a="═══ $1 ·" -v b="═══ $2 ·" 'index($0,a){f=1} index($0,b){f=0} f' "$3"
}
dem_do_khoi() { # in khối + đếm 🔴 (phép $1, khối $2..$3)
  local k; k="$(khoi "$2" "$3" "${REPRO_LOG}")"
  if [ -z "${k}" ]; then truot "$1: khối $2 không thấy trong log repro — thước đổi cấu trúc?"; return; fi
  echo "${k}" | sed 's/^/   /'
  local n; n=$(printf '%s' "${k}" | grep -c '🔴'); n=${n:-0}
  bang "$1 — số dòng 🔴 trong khối $2" "${n}" "0"
}

echo "CỔNG NGHIỆM THU VA-R2 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"

# ═══ ①③④ phần A · repro chung — cắt F3b (RF-9) · F1 (RF-10) · F6 (RF-11) · F4 (RF-12) ═
muc "①②③④ phần A · refute-tong-the-1.repro.mjs — cắt F1/F3a/F3b/F4/F6, đếm 🔴 từng khối"
REPRO_LOG="$(mktemp)"
node --env-file=.env docs/thi-cong/nhat-ky/refute-tong-the-1.repro.mjs > "${REPRO_LOG}" 2>&1 \
  || so "lượt chạy repro" "rc≠0 — VẪN đọc STDOUT (rc không phải thước)"
dem_do_khoi "②RF-10" F1  F2
dem_do_khoi "⑥RF-15" F3a F3b
dem_do_khoi "①RF-9"  F3b F4
dem_do_khoi "④RF-12" F4  F5
dem_do_khoi "③RF-11" F6  "KHÔNG-CÓ"
rm -f "${REPRO_LOG}"

# ═══ ②b · MỘT nguồn mã huỷ/hoàn: định nghĩa HUY_HOAN/MA_HOAN tự gõ trong src/orders ═══
muc "②b · grep định nghĩa tập mã huỷ/hoàn gõ tay (Set/[…]) trong src/orders + src/pos"
# Biên: tên ĐÚNG `MA_HOAN`/`HUY_HOAN` (không tính `NHOM_HUY_HOAN` của src/pos/ma-trang-thai.js
# — bản khai của tầng POS, cùng giá trị; ti-le-hoan.js read-only theo phiếu nên chưa gộp,
# nợ §9). Phép thứ 3 canh hai tập KHÔNG trôi khỏi nhau.
DINH_NGHIA="$(grep -nE '(^|[^A-Z_])(MA_HOAN|HUY_HOAN)\s*=\s*(new Set\(\[|Object\.freeze\(\[|\[)' src/orders/*.js src/pos/*.js || true)"
echo "${DINH_NGHIA}" | sed 's/^/   /'
bang "số định nghĩa MA_HOAN/HUY_HOAN gõ tay trong src/orders+src/pos" "$(printf '%s' "${DINH_NGHIA}" | grep -c . )" "1"
bang "định nghĩa đó ở ti-le-hoan.js" "$(printf '%s' "${DINH_NGHIA}" | grep -c 'ti-le-hoan.js')" "1"
bang "hang-cho.js dẫn HUY_HOAN từ MA_HOAN" "$(grep -c 'new Set(MA_HOAN' src/orders/hang-cho.js)" "1"
HAI_TAP="$(node -e "
Promise.all([import('./src/orders/ti-le-hoan.js'),import('./src/pos/ma-trang-thai.js')]).then(([a,b])=>
 console.log(JSON.stringify([...a.MA_HOAN].map(Number).sort())+'='+JSON.stringify([...b.NHOM_HUY_HOAN].map(Number).sort())))" 2>&1 | tail -1)"
bang "MA_HOAN ≡ NHOM_HUY_HOAN (không có 8)" "${HAI_TAP}" "[4,5,6,7]=[4,5,6,7]"

# ═══ ①–⑥ phần B · test/va-r2-tien-tao-don.test.js (R2-1..R2-8, in bảng từng tệ) ═══
muc "①–⑥ phần B · test/va-r2-tien-tao-don.test.js — đa tệ · mã 8 · trang 2 · rollback · khoá hội thoại · page_id"
node --env-file=.env --test test/va-r2-tien-tao-don.test.js 2>&1 \
  | grep -E '^\s{3}[A-Za-z0-9]|^✔|^✖|not ok' || true
bang "bộ ca VA-R2 (8 ca: R2-1..R2-8)" "$(dem_ca test/va-r2-tien-tao-don.test.js)" "pass=8 fail=0"

# ═══ ⑦ · migration 007 idempotent + down→up ; schema.sql khớp ; hồi quy ═════════
muc "⑦ migration 007 — trạng thái · lùi-về-ranh (down 1 bản = 007) · up lại · schema sinh khớp"
TT_TRUOC="$(node --env-file=.env db/migrate.js trang-thai 2>&1 | grep -c '✔ đã áp')"
so "bản đã áp trước phép" "${TT_TRUOC}"
GO="$(node --env-file=.env db/migrate.js down 2>&1 | grep -oE 'GỠ\s+\S+' | awk '{print $2}')"
bang "down gỡ đúng bản MỚI NHẤT" "${GO}" "007_idempotent_tao_don_va_don_vi_tien"
AP="$(node --env-file=.env db/migrate.js 2>&1 | grep -oE 'ÁP\s+\S+' | awk '{print $2}')"
bang "up áp lại đúng 007" "${AP}" "007_idempotent_tao_don_va_don_vi_tien"
bang "áp lần 2 = 0 bản (idempotent)" "$(node --env-file=.env db/migrate.js 2>&1 | grep -oE 'áp mới: [0-9]+' | awk '{print $3}')" "0"
bang "007 không thêm bảng (CREATE TABLE)" "$(grep -c '^CREATE TABLE' db/migrate/007_*.up.sql)" "0"
SCHEMA_CU="$(mktemp)"; cp db/schema.sql "${SCHEMA_CU}"
node --env-file=.env db/migrate.js schema >/dev/null 2>&1
bang "db/schema.sql khớp bản sinh từ migrate/ (diff)" "$(diff -q "${SCHEMA_CU}" db/schema.sql >/dev/null && echo khop || echo lech)" "khop"
rm -f "${SCHEMA_CU}"
IDX="$(node --env-file=.env -e "
import('./db/ket-noi.js').then(async m=>m.voiPool(async p=>{
 const r=await p.query(\"SELECT count(*)::int n FROM pg_indexes WHERE indexname='nhat_ky_pos_ket_qua_thanh_cong_moi_hang_cho'\");
 console.log(r.rows[0].n)}))" 2>&1 | tail -1)"
bang "index partial 007 tồn tại trên DB dev" "${IDX}" "1"

muc "⑦b hồi quy l3-m4 · l3-m2 · l1-m1 (chủ các file bị đụng) — thước: fail=0"
CA_REG="$(dem_ca test/l3-m4-duyet.test.js test/l3-m4-hang-cho.test.js test/l3-m2-loc-trung.test.js test/l3-m2-ti-le-hoan.test.js test/l1-m1-doc-pos.test.js test/l1-m1-ghi-nguoc.test.js)"
so "hồi quy 6 file — thô" "${CA_REG}"
REG_FAIL="$(printf '%s' "${CA_REG}" | grep -oE 'fail=[0-9]+' | cut -d= -f2)"
bang "hồi quy — số ca FAIL" "${REG_FAIL:-LOI-NODE}" "0"

printf '\n═══ TỔNG: %d phép · %d ĐỎ ═══\n' "${PHEP}" "${LOI}"
[ "${LOI}" -eq 0 ] || exit 1
exit 0
