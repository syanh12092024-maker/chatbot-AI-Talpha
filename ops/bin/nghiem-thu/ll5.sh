#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL5 — Số liệu MỘT dòng, bốn tab; Nguồn khách · Rủi ro hoàn thôi ẩn VÀ nói số tính tới ngày nào.
# Chạy: ops/bin/nghiem-thu/ll5.sh        (rc=0 là đạt)
# ① bộ ca LL5 · ② tuổi con số trên Postgres thật (R5) · ③ thước menu + cụm · ④ cổng LL3 (kèm LL1 · LL2 · UI-HT).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/ll5-so-lieu.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 5 ]; ket "①bộ-ca-LL5" $? "pass=$p fail=$f (đòi ≥5: một dòng · tab theo vai · tuổi hai tầng đọc · trang in tuổi)"
out=$(chay test/l0-m2-so-lieu.test.js); f=$(so "$out" fail); f=${f:-1}; r=$(echo "$out" | grep -c "^✔ R5 · LL5")
[ "$f" -eq 0 ] && [ "$r" -eq 1 ]; ket "②tuổi-Postgres-thật" $? "l0-m2-so-lieu fail=$f · R5 xanh=$r (đòi 0 · 1)"
for t in dieu-huong ll1-nam-dich ll3-cum; do o=$(chay v3/test/b/$t.test.mjs); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "③thước-menu" $? "$t fail=$ff"; done
bash ops/bin/nghiem-thu/ll3.sh >/dev/null 2>&1; ket "④cổng-trước" $? "ll3.sh (kèm ll1 · ll2 · UI-HT)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
