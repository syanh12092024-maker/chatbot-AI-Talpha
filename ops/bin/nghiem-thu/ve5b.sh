#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE5b — «Hộp thư › Tìm khách» theo BẢN VẼ 1b (`/ho-so-khach`, đường giữ nguyên): trang mở cho sale
# (§10 bổ sung), cửa đọc cũ giữ vai cũ, trang hỏi vai trước (`/api/ho-so-khach/cua`), việc cũ của «Khách hàng» còn nguyên.
# Chạy: ops/bin/nghiem-thu/ve5b.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết. B1 đo QUYỀN qua app thật (CSDL giả); còn lại đo cấu trúc trang. Bằng chứng người
# dùng thấy: ảnh bấm thật ba vai (nhật ký phiếu).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/ve5b-tim-khach.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 5 ]; ket "①bộ-ca-VE5b" $? "pass=$p fail=$f (đòi ≥5: quyền · tra · hồ sơ · việc cũ · lối vào)"
for t in v3/test/b/dieu-huong.test.mjs v3/test/b/phan-quyen-nam-vai.test.mjs v3/test/b/ho-so-khach.test.mjs \
         v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "②thước" $? "$t fail=$ff"
done
_o=$(bash ops/bin/nghiem-thu/ve5.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "③cổng-trước" $_r "ve5.sh (kèm ve4 · ve3 · ve2 · ve1 · ll18)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
