#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL11 — kỹ năng BỎ, «hỏi size» thành ô kiến thức sản phẩm (đường ghi đầu tiên của san_pham_goc.kien_thuc).
# Chạy: ops/bin/nghiem-thu/ll11.sh        (rc=0 là đạt)
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay test/ll11-kien-thuc.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 3 ]; ket "①bộ-ca-LL11" $? "pass=$p fail=$f (đòi ≥3: ghi Postgres thật · bộ ráp prompt đọc mọi khoá · vai + nhật ký bắt buộc)"
for t in v3/test/b/ll13-san-pham.test.mjs v3/test/b/dieu-huong.test.mjs v3/test/b/ll1-nam-dich.test.mjs v3/test/b/audit-ghi.test.mjs v3/test/b/vai-b-noi-day.test.mjs test/l0-m2-noi-dung.test.js; do o=$(chay $t); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "②thước" $? "$t fail=$ff"; done
_o=$(bash ops/bin/nghiem-thu/ll10.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "③cổng-trước" $_r "ll10.sh (kèm ll13 → các cổng trước)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
