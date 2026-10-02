#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL15b — NGƯỜI + VAI THEO HRM: tạo tài khoản (chưa mật khẩu) · MKT → Marketer ở team mình, SALE → Sale cả
# ba team · nghỉ ⇒ rút vai HRM + khoá · làm lại ⇒ mở khoá · tên team theo HRM · màn: xem kế hoạch rồi áp đúng bản đã xem (vân tay,
# chỉ Quản trị MỌI team) · vai HRM không rút tay · mật khẩu ĐẦU · lượt tự động mỗi 24 giờ khi `V3_HRM_TU_DONG=1` (vượt rào ⇒ hoãn).
# Chạy: ops/bin/nghiem-thu/ll15b.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — Postgres hộp cát (migration 029) + máy chủ vai-b + trang chạy thật; HRM giả hình prod.
# Chạy thử kế hoạch trên dữ liệu prod (CHỈ ĐỌC, 02/10) đo tay: tạo 21 · cấp 41 · đổi tên 2 team · 0 rút / khoá — cổng không gọi Google.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
for cap in "test/ll15b-dong-bo.test.mjs:7:tầng A (hộp cát) — luật vào hệ · ranh giới nguon/ma_nv · rào tự động · mật khẩu đầu · lượt tự động" \
           "v3/test/b/ll15b-dong-bo-man.test.mjs:8:màn — kế hoạch · áp đúng vân tay · quản trị mọi team · vai HRM không rút tay · mật khẩu đầu · đầu-cuối đăng nhập"; do
  t=${cap%%:*}; r=${cap#*:}; nho=${r%%:*}; mo=${r#*:}
  out=$(chay "$t"); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$out" | grep -E "^✖ " | sort -u | head -5 | sed 's/^/   ↳ /'
  [ "$f" -eq 0 ] && [ "$p" -ge "$nho" ]; ket "①chạy-thật" $? "$t pass=$p fail=$f (đòi ≥$nho: $mo)"
done
# ② lược đồ: migration 029 có hai chiều + schema.sql khớp (ma_nv · nguon)
[ -f db/migrate/029_dong_bo_hrm.up.sql ] && [ -f db/migrate/029_dong_bo_hrm.down.sql ] \
  && grep -q "ALTER TABLE nguoi_dung ADD COLUMN IF NOT EXISTS ma_nv text;" db/schema.sql \
  && grep -q "ALTER TABLE thanh_vien_team ADD COLUMN IF NOT EXISTS nguon text NOT NULL DEFAULT 'tay';" db/schema.sql
ket "②migration-029" $? "up/down + db/schema.sql"
# ③ ranh giới nằm TRONG câu ghi (kế hoạch sai cũng không vượt được): chỉ rút dòng 'hrm' · chỉ khoá/mở tài khoản gắn mã · mật khẩu chỉ ĐẦU
grep -q "DELETE FROM thanh_vien_team WHERE id = \$1 AND nguon = 'hrm'" src/hrm/dong-bo.js \
  && [ "$(grep -c 'AND ma_nv IS NOT NULL' src/hrm/dong-bo.js)" -eq 2 ] && grep -q 'AND mat_khau_hash IS NULL' src/hrm/dong-bo.js
ket "③ranh-giới-SQL" $? "src/hrm/dong-bo.js"
# ④ vắng biến = đóng: không khoá BigQuery ⇒ không đồng bộ; không `V3_HRM_TU_DONG=1` ⇒ không lượt tự động; biến đã khai
grep -q "if (!docHrm) return undefined;" v3/chay-that.js && grep -q "if (process.env.V3_HRM_TU_DONG !== '1') return db;" v3/chay-that.js \
  && grep -q '`V3_HRM_TU_DONG`' docs/v3/ban-giao/bien-moi-truong-v3.md
ket "④vắng-biến-đóng" $? "v3/chay-that.js + bien-moi-truong-v3.md"
# ⑤ thước liền kề
for t in v3/test/b/ve7d-nguoi-team.test.mjs v3/test/b/vai-b-noi-day.test.mjs v3/test/b/team-cau-hinh.test.mjs v3/test/b/ll7-ba-vai.test.mjs \
         v3/test/b/ve7e-nhat-ky.test.mjs v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs v3/test/b/bien-moi-truong-khai-du.test.mjs \
         v3/test/b/va1-ten-chua-khai.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "⑤thước" $? "$t fail=$ff"
done
_o=$(bash ops/bin/nghiem-thu/ll15a.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "⑥cổng-trước" $_r "ll15a.sh (kèm ve7e · ve7d · ve7c · …)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
