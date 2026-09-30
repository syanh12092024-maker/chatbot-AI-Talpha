#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE6a — Số liệu › Tổng quan theo BẢN VẼ 3a: bốn ô số · hai phễu (chặng không nguồn nói «chưa có nguồn»,
# không tỉ lệ rơi) · bảng theo page ghép AI/đơn · rủi ro hoàn theo vai. Luật cũ giữ: ba thước Messenger đứng DỌC, không cộng.
# Chạy: ops/bin/nghiem-thu/ve6a.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — CHẠY THẬT script trang (vm + DOM giả) với payload `manBaoCao` thật + dạng cửa phụ đã đọc.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/ve6a-tong-quan.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 6 ]; ket "①chạy-thật-VE6a" $? "pass=$p fail=$f (đòi ≥6: ô số · phễu · bảng · rủi ro theo vai · sổ hỏng · khoảng mở)"
for t in v3/test/b/bao-cao.test.mjs v3/test/b/va1-ten-chua-khai.test.mjs v3/test/b/nguon-khach.test.mjs v3/test/b/ll5-so-lieu.test.mjs \
         v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "②thước" $? "$t fail=$ff"
done
bash ops/bin/nghiem-thu/va1.sh >/dev/null 2>&1; ket "③cổng-trước" $? "va1.sh"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
