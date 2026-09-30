#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL13 — Sản phẩm là lõi: sản phẩm → thị trường (shop POS) → món → page; thêm/gỡ thị trường.
# Chạy: ops/bin/nghiem-thu/ll13.sh        (rc=0 là đạt)
# ① Postgres thật (P1–P7) · ② tầng giao diện (vai · nhật ký · router · trang · UI.button) · ③ bộ ca cũ sản phẩm gốc
# · ④ nhật ký hợp lệ · ⑤ cổng LL6 (kèm các cổng trước).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay test/ll13-san-pham-goc.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 8 ]; ket "①Postgres-thật" $? "pass=$p fail=$f (đòi ≥8: hai thị trường · page hai đường · một món một sản phẩm · từ chối · chưa gán · gỡ · kẹp team)"
out=$(chay v3/test/b/ll13-san-pham.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 5 ]; ket "②tầng-giao-diện" $? "pass=$p fail=$f (đòi ≥5)"
for t in test/san-pham-goc.test.mjs v3/test/b/audit-ghi.test.mjs v3/test/b/vai-b-noi-day.test.mjs v3/test/b/he-kieu.test.mjs; do o=$(chay $t); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "③④thước" $? "$t fail=$ff"; done
_o=$(bash ops/bin/nghiem-thu/ll6.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "⑤cổng-trước" $_r "ll6.sh (kèm ll5 · ll3 · ll2 · ll1 · UI-HT)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
