#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL10 — «Hội thoại và đơn» thành Cài đặt › Vận hành (nhà của 5 việc vận hành), nhận ?tab=,
# ba nhà mới (Hệ còn sống · Chi phí AI · trang một page) trỏ THẲNG vào đúng tab.
# Chạy: ops/bin/nghiem-thu/ll10.sh        (rc=0 là đạt)
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/ll10-van-hanh.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 3 ]; ket "①bộ-ca-LL10" $? "pass=$p fail=$f (đòi ≥3: chỗ ngồi · ?tab= kiểm vai · liên kết trỏ tab có thật)"
out=$(chay test/frontend-v3-e2e.test.js); f=$(so "$out" fail); f=${f:-1}; [ "$f" -eq 0 ]; ket "②e2e-van-hanh" $? "frontend-v3-e2e fail=$f"
for t in dieu-huong ll1-nam-dich ll6-cai-dat he-kieu; do o=$(chay v3/test/b/$t.test.mjs); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "③thước" $? "$t fail=$ff"; done
bash ops/bin/nghiem-thu/ll13.sh >/dev/null 2>&1; ket "④cổng-trước" $? "ll13.sh (kèm ll6 → các cổng trước)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
