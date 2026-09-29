#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE3 — danh sách page theo BẢN VẼ 2b: viên «Lọc nhanh» có số đếm · nút Quét ở đầu trang · chọn
# nhiều + thao tác hàng loạt (gắn sản phẩm · bật bot tối đa 10 có xác nhận) đi qua ĐÚNG cửa ghi từng page.
# Chạy: ops/bin/nghiem-thu/ve3.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết (đo CẤU TRÚC mã trang). Bằng chứng hành vi: ảnh chụp bấm thật (nhật ký phiếu).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/ve3-page-ds.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 4 ]; ket "①bộ-ca-VE3" $? "pass=$p fail=$f (đòi ≥4: lọc nhanh · trần 10 + xác nhận · tuần tự dừng ở lỗi · đúng cửa từng page)"
for t in v3/test/b/giao-dien-kho-hep.test.mjs v3/test/b/page-bot-thuoc-tinh.test.mjs v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs v3/test/b/ll18-khung.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "②thước" $? "$t fail=$ff"
done
bash ops/bin/nghiem-thu/ve2.sh >/dev/null 2>&1; ket "③cổng-trước" $? "ve2.sh (kèm ve1 · ll18)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
