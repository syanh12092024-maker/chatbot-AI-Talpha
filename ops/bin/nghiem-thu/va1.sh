#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE-VA1 — «tên chưa khai»: ba lỗi chỉ nổ ở nhánh thao tác thật (Số liệu › Tổng quan không bao giờ hiện
# số · tạo người dùng xong báo lỗi · chuyển page giữa team không gửi được). Ca CHẠY THẬT script trang (vm + DOM giả).
# Chạy: ops/bin/nghiem-thu/va1.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — chạm đúng ba nhánh từng nổ. Quét tĩnh cả lớp lỗi: `ops/bin/quet-ten-chua-khai.mjs`
# (cần ESLint do người chạy chỉ ra — không có thì cổng này KHÔNG giả là đã quét).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/va1-ten-chua-khai.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 4 ]; ket "①chạy-thật" $? "pass=$p fail=$f (đòi ≥4: Tổng quan hiện số · đối chứng lỗi · tạo người xong nạp lại · chuyển page gửi được)"
for t in v3/test/b/bao-cao.test.mjs v3/test/b/team-cau-hinh.test.mjs v3/test/b/team-tao-nguoi-dung.test.mjs \
         v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "②thước" $? "$t fail=$ff"
done
if [ -n "${ESLINT_BIN:-}" ]; then node ops/bin/quet-ten-chua-khai.mjs >/dev/null 2>&1; ket "③quét-no-undef" $? "35 script trang"
else echo "⏸ ③quét-no-undef HOÃN — chưa đặt ESLINT_BIN (xem ops/bin/quet-ten-chua-khai.mjs); KHÔNG tính là đạt"; fi
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
