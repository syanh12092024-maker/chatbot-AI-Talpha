#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE7d — «Cài đặt › Người và team» theo BẢN VẼ 4: ba nút đầu trang (HRM tắt + nói vì sao) · ba thẻ vai
# («mở được» đo bằng `menuCua` — hàm dựng thanh điều hướng) · phụ trách theo sự thật (marketer «Chưa có nguồn», §9 chưa làm,
# page có tên marketer là SỐ ĐO) · Marketer trên POS ↔ hồ sơ HRM «Chưa nối vào máy chủ» (không số đo tay) · bỏ hàng chỉ số +
# tab POS · câu «bot chạy bằng bộ mặc định» rời cảnh báo team và bước Model của «Bắt đầu».
# Chạy: ops/bin/nghiem-thu/ve7d.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — máy chủ thật (vai-b) trên cổng CSDL giả + CHẠY THẬT script màn (vm + DOM giả).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/ve7d-nguoi-team.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -ne 0 ] && echo "$out" | grep -E "^✖ " | sort -u | head -5 | sed 's/^/   ↳ /'
[ "$f" -eq 0 ] && [ "$p" -ge 8 ]; ket "①chạy-thật-VE7d" $? "pass=$p fail=$f (đòi ≥8: bố cục · mở được = menuCua · phụ trách thật · HRM chưa nối · chuyển page · chỉ xem · tạo người · hết «bộ mặc định»)"
# ② màn không mang số đo tay của bản vẽ (HRM chưa nối — 118 hồ sơ / 98,6% / 17/19 là số đo TAY 29/09)
! grep -nE '\b118\b|98,6|17/19|5\.933|6\.019' v3/src/ui/team/trang/cau-hinh-team.html >/dev/null; ket "②không-số-đo-tay" $? "cau-hinh-team.html"
# ③ thước liền kề — kể cả ca chạy thật script màn cũ (VA1: tạo người + chuyển page) và màn «Bắt đầu» (đổi câu bước Model)
for t in v3/test/b/va1-ten-chua-khai.test.mjs v3/test/b/team-cau-hinh.test.mjs v3/test/b/team-tao-nguoi-dung.test.mjs \
         v3/test/b/cai-dat-team.test.mjs v3/test/b/ve7a-cai-dat.test.mjs v3/test/b/vai-b-noi-day.test.mjs v3/test/b/ll1-nam-dich.test.mjs \
         v3/test/b/ll18-khung.test.mjs v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs v3/test/b/page-bot.test.mjs \
         v3/test/b/bot-bat-that.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "③thước" $? "$t fail=$ff"
done
_o=$(bash ops/bin/nghiem-thu/ve7c.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "④cổng-trước" $_r "ve7c.sh (kèm ve7b · ve7a · ve2b · ve6c · ve6b · ve6a · va1)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
