#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE7a — Cài đặt theo BẢN VẼ 4: thứ tự cụm (Bắt đầu · Hệ còn sống · Kết nối · Model · Người và team · Nhật
# ký) · «Hệ còn sống không» nhận khối «Việc vận hành» (tin cần đối chiếu · tin bị lọc 24 giờ · diễn tập — số thật từ MỘT cửa đọc,
# theo vai) · «Vận hành» rời thanh tab, mở từ nút của từng việc.
# Chạy: ops/bin/nghiem-thu/ve7a.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết. ① hàm đếm + cửa HTTP trên Postgres THẬT (sandbox riêng, tự dọn) · ② CHẠY THẬT script màn.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay test/ve7a-viec-van-hanh.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 3 ]; ket "①đếm-việc-vận-hành(Postgres)" $? "pass=$p fail=$f (đòi ≥3: đúng tập đối chiếu · 24 giờ · team · cờ diễn tập · vai)"
out=$(chay v3/test/b/ve7a-cai-dat.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 4 ]; ket "②chạy-thật-VE7a" $? "pass=$p fail=$f (đòi ≥4: thứ tự cụm · ba việc có số + lối · theo vai · hỏng ≠ 0)"
for t in v3/test/b/ll6-cai-dat.test.mjs v3/test/b/ll10-van-hanh.test.mjs v3/test/b/ll18-khung.test.mjs v3/test/b/ll1-nam-dich.test.mjs \
         v3/test/b/dieu-huong.test.mjs v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "③thước" $? "$t fail=$ff"
done
bash ops/bin/nghiem-thu/ve2b.sh >/dev/null 2>&1; ket "④cổng-trước" $? "ve2b.sh (kèm ve6c · ve6b · ve6a · va1)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
