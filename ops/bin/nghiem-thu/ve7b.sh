#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE7b — «Cài đặt › Kết nối» theo BẢN VẼ 4: năm phần đúng thứ tự (Pancake · POS · WhatsApp · HRM · Kéo dữ
# liệu) · POS kèm tiền tệ + số món SUY TỪ danh mục đã kéo · chỗ chưa có nguồn nói thẳng («Không quyền» chưa đo · WhatsApp chưa nối ·
# HRM chưa nối vào máy chủ, không số đo tay) · «Kéo dữ liệu» gom bốn việc một chỗ, «Quét Pancake» đi đúng cửa của «Tất cả page».
# Chạy: ops/bin/nghiem-thu/ve7b.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — hàm đếm trên cổng CSDL giả + CHẠY THẬT script màn (vm + DOM giả) gọi máy chủ thật.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/ve7b-ket-noi.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 8 ]; ket "①chạy-thật-VE7b" $? "pass=$p fail=$f (đòi ≥8: món+tiền tệ theo shop · không đo ≠ 0 · năm phần · chưa nguồn nói thẳng · WhatsApp theo van thật · bốn việc một chỗ)"
# ② lời HRM không được mang số đo tay (118 hồ sơ / 98,6% đo bằng tay 29/09 — máy chủ chưa đọc được BigQuery)
! grep -nE '\b118\b|98,6' v3/src/ui/ket-noi/trang/ket-noi.html >/dev/null; ket "②không-số-đo-tay" $? "ket-noi.html"
# ③ thước liền kề — kèm bộ ca cửa WhatsApp (L1-M3): phiếu thêm export `cuaGuiWaDangMo` vào `src/channels/whatsapp/index.js`
for t in v3/test/b/ve2b-page-gop.test.mjs v3/test/b/vai-b-noi-day.test.mjs v3/test/b/ll6-cai-dat.test.mjs \
         v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs test/l1-m3-cua.test.js; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "③thước" $? "$t fail=$ff"
done
bash ops/bin/nghiem-thu/ve7a.sh >/dev/null 2>&1; ket "④cổng-trước" $? "ve7a.sh (kèm ve2b · ve6c · ve6b · ve6a · va1)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
