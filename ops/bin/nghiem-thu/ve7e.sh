#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE7e — «Cài đặt › Nhật ký» theo BẢN VẼ 4: «Nhật ký · Ghi cả việc người làm lẫn việc máy làm. Không ai
# sửa hay xoá được.» · mỗi dòng một CÂU: lúc · ai · việc · đối tượng bằng TÊN (bảng sống → ảnh chụp trong dòng → «Loại #id»,
# không đoán, không mượn tên team khác) · dòng máy nói việc gì (việc lạ hiện nguyên mã) · tên màn trong sổ = đầu trang (HK10).
# Chạy: ops/bin/nghiem-thu/ve7e.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — máy chủ thật (vai-b) + bộ đọc nhật ký THẬT trên cổng CSDL giả + CHẠY THẬT script màn.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/ve7e-nhat-ky.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -ne 0 ] && echo "$out" | grep -E "^✖ " | sort -u | head -5 | sed 's/^/   ↳ /'
[ "$f" -eq 0 ] && [ "$p" -ge 6 ]; ket "①chạy-thật-VE7e" $? "pass=$p fail=$f (đòi ≥6: đầu trang · tên đối tượng ba bậc · dòng máy · tra tên hỏng vẫn hiện · ngăn Xem · mã tầng A ra chữ mà không thành mã v3)"
# ② thước liền kề — HK10 (đầu trang = tên trong sổ màn) nằm trong he-kieu
for t in v3/test/b/nhat-ky-man.test.mjs v3/test/b/nhat-ky-cot-that.test.mjs v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs \
         v3/test/b/ll1-nam-dich.test.mjs v3/test/b/ll18-khung.test.mjs v3/test/b/vai-b-noi-day.test.mjs v3/test/b/audit-ghi.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "②thước" $? "$t fail=$ff"
done
_o=$(bash ops/bin/nghiem-thu/ve7d.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "③cổng-trước" $_r "ve7d.sh (kèm ve7c · ve7b · ve7a · ve2b · ve6c · ve6b · ve6a · va1)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
