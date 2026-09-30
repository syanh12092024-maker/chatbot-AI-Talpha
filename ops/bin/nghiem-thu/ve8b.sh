#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE8b — vòng khép kín của người quyết 30/09 NGAY TRONG màn Sản phẩm: giá theo thị trường (bậc giá của
# CHÍNH món POS shop đó — bot báo giá + cửa tiền cùng một nguồn) sửa tại chỗ, lưu CHỈ-GIÁ (lượt kéo POS không đè giá, tên +
# hết hàng vẫn theo POS) · marketer của sản phẩm (đổi thì page đang bán đổi theo) · gắn/gỡ page (ghi đủ sản phẩm · shop ·
# thị trường · marketer) · Vận hành hết tab «Sản phẩm & giá» (một nơi nhập giá).
# Chạy: ops/bin/nghiem-thu/ve8b.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — tầng A trên Postgres THẬT (sandbox riêng, tự dọn) + màn CHẠY THẬT (vm + DOM giả).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay test/ve8b-gia-page.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 7 ]; ket "①giá+page(Postgres)" $? "pass=$p fail=$f (đòi ≥7: bốn cột page + bot thấy đúng món · từ chối · marketer kéo page · chỉ-giá · kéo POS không đè giá · gỡ page)"
out=$(chay v3/test/b/ve8b-man.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 8 ]; ket "②chạy-thật-VE8b" $? "pass=$p fail=$f (đòi ≥8: sửa giá tại chỗ · chưa giá nói thẳng · marketer · gắn/gỡ page · vai chỉ xem · 409 · nhật ký · một nơi nhập giá)"
for t in v3/test/b/ll13-san-pham.test.mjs v3/test/b/ll10-van-hanh.test.mjs v3/test/b/ll18-khung.test.mjs test/frontend-v3-e2e.test.js \
         test/ll13-san-pham-goc.test.mjs test/l1-m1-doc-pos.test.js test/keo-danh-muc.test.mjs test/va-r2-tien-tao-don.test.js \
         test/ve1-san-pham.test.mjs test/san-pham-goc.test.mjs v3/test/b/phan-quyen-nam-vai.test.mjs v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "③thước" $? "$t fail=$ff"
done
_o=$(bash ops/bin/nghiem-thu/ve8a.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "④cổng-trước" $_r "ve8a.sh (kèm ve7b · ve7a · ve2b · ve6c · ve6b · ve6a · va1)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
