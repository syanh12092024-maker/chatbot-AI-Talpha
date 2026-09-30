#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE8a — «Gộp món POS thành sản phẩm» THEO SKU, ngay trong màn Sản phẩm (bản vẽ 2a′ · migration 028):
# SKU = mã sản phẩm POS chung giữa các shop (người quyết 30/09); máy gợi ý nhóm (cùng SKU mọi shop · SKU đã là sản phẩm ⇒
# «nối» · thiếu SKU lùi số đầu tên · không gì thì cùng tên), người xác nhận; gộp = MỘT giao dịch tạo sản phẩm (SKU + marketer)
# + gắn đúng món chọn; lượt kéo danh mục lưu SKU và tự nối món shop mới theo SKU; chỉ quản trị, một dòng nhật ký kể đủ món.
# Chạy: ops/bin/nghiem-thu/ve8a.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — tầng A trên Postgres THẬT (sandbox riêng, tự dọn) + màn CHẠY THẬT (vm + DOM giả).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay test/ve8a-gop-mon.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 6 ]; ket "①SKU+gộp+kéo(Postgres)" $? "pass=$p fail=$f (đòi ≥6: chuẩn SKU · nhóm theo SKU · gắn đúng món chọn · từ chối không để lại gì · kéo danh mục tự nối theo SKU)"
out=$(chay v3/test/b/ve8a-gop.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 7 ]; ket "②chạy-thật-VE8a" $? "pass=$p fail=$f (đòi ≥7: khung gộp · gộp đúng món · nối · marketer chỉ xem · lối vào · vai+nhật ký · đường router)"
for t in v3/test/b/ll13-san-pham.test.mjs test/ll13-san-pham-goc.test.mjs test/ll11-kien-thuc.test.mjs v3/test/b/vai-b-noi-day.test.mjs \
         v3/test/b/phan-quyen-nam-vai.test.mjs v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs \
         v3/test/b/ve2b-page-gop.test.mjs v3/test/b/ve7b-ket-noi.test.mjs \
         test/cr1509-ten-goc.test.js test/keo-danh-muc.test.mjs test/l1-m1-doc-pos.test.js test/san-pham-goc.test.mjs \
         test/ve1-san-pham.test.mjs test/va-r2-tien-tao-don.test.js; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "③thước" $? "$t fail=$ff"
done
_o=$(bash ops/bin/nghiem-thu/ve7b.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "④cổng-trước" $_r "ve7b.sh (kèm ve7a · ve2b · ve6c · ve6b · ve6a · va1)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
