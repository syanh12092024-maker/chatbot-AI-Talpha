#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL17d — TEAM CỦA ĐƠN THEO NGÀY ĐƠN (nợ N-DON-TEAM-THEO-NGAY; luật ký CR-28-09c «đơn thuộc team của marketer
# VÀO NGÀY ĐƠN»). Câu đọc đơn POS suy team TRONG BigQuery từ `HRM_Core.fact_employee_team_history` (dòng phủ ngày đơn, nhiều dòng ⇒
# bắt đầu muộn nhất); thiếu lịch sử ⇒ team hiện tại + màn nói ra số đơn đó.
# Chạy: ops/bin/nghiem-thu/ll17d.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — BigQuery giả; câu SQL chỉ soi được HÌNH DẠNG ở đây. Đo thật 05/10 (máy dev, khoá levelup,
# chỉ đếm): 2,2 giây · 5.308 dòng (một trang) · 23.191/23.194 đơn có team theo ngày · 3 theo team hiện tại · 628 đơn đổi chỗ GCC ← EU
# (07/08–31/08); khoá của prod đọc được bảng lịch sử (109 dòng). Cổng không gọi Google.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
for cap in "test/ll17d-team-theo-ngay.test.mjs:3:câu đọc lịch sử team · đơn đi theo team vào ngày đơn · bảo toàn" \
           "v3/test/b/ll17a-so-lieu-man.test.mjs:5:màn — kể cả câu «tính theo team hiện tại» (L5)"; do
  t=${cap%%:*}; r=${cap#*:}; nho=${r%%:*}; mo=${r#*:}
  out=$(chay "$t"); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$out" | grep -E "^✖ " | sort -u | head -5 | sed 's/^/   ↳ /'
  [ "$f" -eq 0 ] && [ "$p" -ge "$nho" ]; ket "①chạy-thật" $? "$t pass=$p fail=$f (đòi ≥$nho: $mo)"
done
# ② luật cũ không quay lại: team lấy `teamNgay` TRƯỚC, team hiện tại chỉ là đường lùi
grep -q "const t = TEAM_HRM\[r.teamNgay || (n ? n.team_code : '')\] || null;" src/hrm/don-pos.js
ket "②team-theo-ngày-trước" $? "src/hrm/don-pos.js"
_o=$(bash ops/bin/nghiem-thu/ll17b.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "③cổng-trước" $_r "ll17b.sh (kèm ll17a · ll15d · …)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
