#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL17b — SỐ LIỆU ĐỌC ĐƠN TỪ BIGQUERY (người quyết 02/10 «làm nốt màn số lượng»): Tổng quan (ô «Đơn theo luồng —
# không gộp», luồng trang bán hàng, bước «Bấm BUY NOW», bảng Theo page «Chốt · Hoàn») và tab Khách («Hai luồng», «Bấm BUY NOW») đọc
# đơn POS của team từ BigQuery — luồng suy ĐÚNG luật `suyNguon` của bộ nạp đơn; chưa nối ⇒ số chụp; số chụp cũ hơn khoảng đo ⇒
# «chưa biết», KHÔNG «0 · 0» (prod 02/10 in 0 · 0 vì `don_hang` chỉ có tới 28/08).
# Chạy: ops/bin/nghiem-thu/ll17b.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — BigQuery giả + máy chủ vai-b + trang thật + Postgres hộp cát. Đo thật 02/10 (máy dev, khoá
# levelup, chỉ đếm): 30 ngày 12.699 đơn cả công ty, 7.927 mang `page_id` · 203 page, 167 khớp pages.json · 60 ngày messenger 14.094 ·
# trang bán hàng 9.777 · không suy được 1 — cổng không gọi Google.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
for cap in "test/ll17b-luong-page.test.mjs:4:tầng A — luồng đúng luật suyNguon · chỉ đơn của team · theo page chỉ page của team" \
           "test/ll17b-anh-chup-cu.test.mjs:3:Postgres — dòng mới nhất CỦA TEAM cũ hơn khoảng ⇒ «chưa biết», không 0" \
           "v3/test/b/ll17b-so-lieu-man.test.mjs:5:màn — ô luồng · trang bán hàng · BUY NOW · Chốt/Hoàn theo page · tab Khách · đường lùi"; do
  t=${cap%%:*}; r=${cap#*:}; nho=${r%%:*}; mo=${r#*:}
  out=$(chay "$t"); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$out" | grep -E "^✖ " | sort -u | head -5 | sed 's/^/   ↳ /'
  [ "$f" -eq 0 ] && [ "$p" -ge "$nho" ]; ket "①chạy-thật" $? "$t pass=$p fail=$f (đòi ≥$nho: $mo)"
done
# ② mã hội thoại (chứa PSID khách) chỉ dùng TRONG BigQuery để suy luồng — không câu nào trả nó ra
[ "$(grep -c "JSON_VALUE(payload_json" src/hrm/don-pos.js)" -eq 2 ] && ! grep -qE "AS (conversation_id|psid|payload)" src/hrm/don-pos.js
ket "②không-kéo-mã-hội-thoại" $? "src/hrm/don-pos.js"
# ③ thước liền kề
for t in v3/test/b/nguon-khach.test.mjs v3/test/b/gd1-mot-nguon.test.mjs test/l0-m2-so-lieu.test.js v3/test/b/ll5-so-lieu.test.mjs \
         v3/test/b/so-lieu-khai-khoang.test.mjs; do
  [ -f "$t" ] || { ket "③thước" 1 "$t KHÔNG CÓ"; continue; }
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "③thước" $? "$t fail=$ff"
done
_o=$(bash ops/bin/nghiem-thu/ll17a.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "④cổng-trước" $_r "ll17a.sh (kèm ll15d · ll15c · ll15b · ll15a · …)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
