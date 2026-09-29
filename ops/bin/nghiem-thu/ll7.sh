#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL7 — ba vai (Quản trị · Marketer · Sale): hai vai cũ THÔI CẤP, dòng cũ vẫn đọc được.
# Chạy: ops/bin/nghiem-thu/ll7.sh        (rc=0 là đạt)
# Tầm đo: CỬA CẤP vai. Danh sách quyền còn nhắc hai mã cũ (37 tệp) chưa dọn — vô hại khi 0 người mang (prod 29/09),
# dọn ở LL9 (thước) cùng lượt viết lại `phan-quyen-nam-vai`.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/ll7-ba-vai.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 3 ]; ket "①bộ-ca-LL7" $? "pass=$p fail=$f (đòi ≥3)"
for t in v3/test/b/team-cau-hinh.test.mjs v3/test/b/phan-quyen-nam-vai.test.mjs test/frontend-v3-e2e.test.js; do o=$(chay $t); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "②thước" $? "$t fail=$ff"; done
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
