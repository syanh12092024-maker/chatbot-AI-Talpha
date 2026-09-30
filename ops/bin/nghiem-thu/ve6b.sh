#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE6b — Số liệu › Chi phí AI theo BẢN VẼ 3b: bốn ô (mỗi đơn · mỗi tin · token mỗi lượt TOÀN HỆ · trúng cache
# TOÀN HỆ) · ba tab Từng tin (theo vai) · Theo page (+ tổng của team) · Theo model (nói đúng cái đang có). Máy chủ trả thêm token toàn hệ.
# Chạy: ops/bin/nghiem-thu/ve6b.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — CHẠY THẬT script trang (vm + DOM giả) với payload `manChiPhi` thật.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/ve6b-chi-phi.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 6 ]; ket "①chạy-thật-VE6b" $? "pass=$p fail=$f (đòi ≥6: bốn ô · token vắng · theo page · từng tin theo vai · theo model · sổ rỗng)"
for t in v3/test/b/chi-phi.test.mjs v3/test/b/ll10-van-hanh.test.mjs v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "②thước" $? "$t fail=$ff"
done
bash ops/bin/nghiem-thu/ve6a.sh >/dev/null 2>&1; ket "③cổng-trước" $? "ve6a.sh (kèm va1)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
