#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL17a — ĐƠN POS TỪ BIGQUERY, MỨC NHẸ (người quyết 02/10 «ok làm mức nhẹ đi»): Số liệu › Tổng quan có khối
# «Đơn POS của team — theo marketer» — số TỔNG HỢP (7 · 30 ngày: đơn · giao thành công · hoàn · huỷ · đang xử lý · tỉ lệ giao · COD
# theo TỪNG tiền tệ), đơn thuộc team HRM của marketer, marketer chỉ thấy dòng mình; KHÔNG chép dữ liệu khách vào v3. Khách BigQuery
# từ chối kết quả nhiều trang (không trả nửa số).
# Chạy: ops/bin/nghiem-thu/ll17a.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — mạng Google giả + máy chủ vai-b + trang thật. Chạy thật trên prod 02/10 (chỉ đọc): 1,4 giây ·
# 4.841 dòng gộp (một trang) · 30 ngày GCC 6.875 · AUUS 631 · EU 4.931 đơn · chờ gán 171 — cổng không gọi Google.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
for cap in "test/ll17a-don-pos.test.mjs:5:tầng A — câu đọc đúng luật đo · gộp theo team HRM · tiền tệ · cửa sổ ngày · đệm · chống cắt trang" \
           "v3/test/b/ll17a-so-lieu-man.test.mjs:4:màn — đúng team · bảng marketer · phạm vi marketer · chưa nối / đọc hỏng"; do
  t=${cap%%:*}; r=${cap#*:}; nho=${r%%:*}; mo=${r#*:}
  out=$(chay "$t"); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$out" | grep -E "^✖ " | sort -u | head -5 | sed 's/^/   ↳ /'
  [ "$f" -eq 0 ] && [ "$p" -ge "$nho" ]; ket "①chạy-thật" $? "$t pass=$p fail=$f (đòi ≥$nho: $mo)"
done
# ② chỉ đọc + không dữ liệu khách: hai câu SELECT không động từ ghi, không chọn cột tên/SĐT/địa chỉ khách
! grep -qiE "\b(INSERT|UPDATE|DELETE|MERGE|CREATE|DROP)\b" src/hrm/don-pos.js && ! grep -qE "customer_name|bill_full_name|bill_phone|shipping_address" src/hrm/don-pos.js
ket "②chỉ-đọc-không-dữ-liệu-khách" $? "src/hrm/don-pos.js"
# ③ vắng biến = đóng; khách BigQuery vẫn MỘT cửa đọc (token + jobs.query) và từ chối nhiều trang
grep -A2 "const docDonPos = await" v3/chay-that.js | grep -q "if (!process.env.V3_BQ_KHOA) return undefined;" \
  && [ "$(grep -c "fetchFn(" src/hrm/bigquery.js)" -eq 2 ] && grep -q "if (j.pageToken) {" src/hrm/bigquery.js
ket "③vắng-biến-đóng-một-cửa" $? "v3/chay-that.js + src/hrm/bigquery.js"
# ④ thước liền kề
for t in v3/test/b/bao-cao.test.mjs v3/test/b/ve6a-tong-quan.test.mjs v3/test/b/vai-b-noi-day.test.mjs v3/test/b/va1-ten-chua-khai.test.mjs \
         test/ll15a-hrm.test.mjs v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs v3/test/b/bien-moi-truong-khai-du.test.mjs \
         v3/test/b/phan-quyen-nam-vai.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "④thước" $? "$t fail=$ff"
done
_o=$(bash ops/bin/nghiem-thu/ll15d.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "⑤cổng-trước" $_r "ll15d.sh (kèm ll15c · ll15b · ll15a · …)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
