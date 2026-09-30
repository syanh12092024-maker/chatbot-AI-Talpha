#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE1 — màn Sản phẩm dựng lại theo BẢN VẼ (artifact «AI Closer — làm lại từ đầu», bảng 2a).
# Chạy: ops/bin/nghiem-thu/ve1.sh        (rc=0 là đạt)
# ① giá theo thị trường trên Postgres THẬT (gom từ bản sao page · lệch giá nói ra · kẹp team) · ② tầng giao diện: lịch
# sử + trang (hai cột · bốn tầng · bốn tab · đủ bảy việc cũ · chỗ chưa có nguồn nói rõ) · ③ hệ kiểu (không CSS riêng,
# tên màn một nguồn) + trang parse được · ④ cổng khung LL18 (menu, khung).
# Tầm đo: lưới HỒI QUY do chính thợ viết. Bằng chứng giao diện là ảnh chụp đối chiếu bản vẽ (nhật ký phiếu).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }

out=$(chay test/ve1-san-pham.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 5 ]; ket "①giá-theo-thị-trường" $? "pass=$p fail=$f (đòi ≥5, Postgres thật)"
out=$(chay v3/test/b/ll13-san-pham.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 6 ]; ket "②giao-diện-VE1" $? "pass=$p fail=$f (đòi ≥6: U4 trang theo bản vẽ · U6 lịch sử)"
for t in v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs test/ll13-san-pham-goc.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "③thước" $? "$t fail=$ff"
done
_o=$(bash ops/bin/nghiem-thu/ll18.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "④cổng-trước" $_r "ll18.sh"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
