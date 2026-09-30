#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL6 — Cài đặt MỘT dòng, sáu tab; màn Model nói điều máy làm (chính dùng · dự phòng chưa nối · nền chưa ai đọc).
# Chạy: ops/bin/nghiem-thu/ll6.sh        (rc=0 là đạt)
# ① bộ ca LL6 (kể cả K2 đo bảng «đường dùng» trên MÃ đường chat) · ② thước menu + cụm · ③ cổng LL5 (kèm LL3 · LL2 · LL1 · UI-HT).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/ll6-cai-dat.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 3 ]; ket "①bộ-ca-LL6" $? "pass=$p fail=$f (đòi ≥3: sáu tab · bảng đường dùng khớp mã · trang vẽ trạng thái)"
for t in dieu-huong ll1-nam-dich ll3-cum ll5-so-lieu he-kieu; do o=$(chay v3/test/b/$t.test.mjs); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "②thước" $? "$t fail=$ff"; done
_o=$(bash ops/bin/nghiem-thu/ll5.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "③cổng-trước" $_r "ll5.sh (kèm ll3 · ll2 · ll1 · UI-HT)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
