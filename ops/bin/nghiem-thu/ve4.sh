#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE4 — Luật chung theo BẢN VẼ 2d: bốn tab (Luật · Chính sách/FAQ/Phản đối · Trả lời sẵn · Đề xuất
# chờ duyệt). Ba khối dùng chung có MỘT chỗ sửa (màn /khoi-chung), đọc/ghi qua ĐÚNG cửa `/api/anh-san-pham/khoi-chung`.
# Chạy: ops/bin/nghiem-thu/ve4.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết. ① đo HÀNH VI cửa đọc trên Postgres THẬT (sandbox riêng, tự dọn); ② đo cấu trúc
# sổ màn + trang. Bằng chứng người dùng thấy: ảnh chụp bấm thật (nhật ký phiếu).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay test/ve4-khoi-chung.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 5 ]; ket "①cửa-đọc(Postgres)" $? "pass=$p fail=$f (đòi ≥5: đúng team · cùng rào · team không giữ ⇒ khoá · không đọc chéo · khứ hồi)"
out=$(chay v3/test/b/ve4-luat-chung.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 4 ]; ket "②bộ-ca-VE4" $? "pass=$p fail=$f (đòi ≥4: bốn tab · cùng vai · lưu chờ xác nhận + phiên bản · một chỗ sửa)"
for t in v3/test/b/dieu-huong.test.mjs v3/test/b/ll3-cum.test.mjs v3/test/b/ll1-nam-dich.test.mjs v3/test/b/phan-quyen-nam-vai.test.mjs \
         v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs v3/test/b/ve2-mot-page.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "③thước" $? "$t fail=$ff"
done
_o=$(bash ops/bin/nghiem-thu/ve3.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "④cổng-trước" $_r "ve3.sh (kèm ve2 · ve1 · ll18)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
