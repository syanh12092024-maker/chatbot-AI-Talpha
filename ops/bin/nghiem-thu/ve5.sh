#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE5 — Hộp thư theo BẢN VẼ 1a: ba tab «Cần bạn · Đơn chờ · Bot đang xử» · thẻ đơn ở cột giữa (biết
# van POS) · nhận/đóng việc ở thanh cuối · cột phải ba khối. Luật cũ giữ: trang chỉ ĐỌC, ghi dồn vào hop-thu-ui.js.
# Chạy: ops/bin/nghiem-thu/ve5.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết. ① hành vi van POS trên Postgres THẬT (sandbox riêng, tự dọn); ② cấu trúc trang.
# Bằng chứng người dùng thấy: ảnh chụp bấm thật với Pancake GIẢ (nhật ký phiếu).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay test/ll2-hop-thu.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 7 ]; ket "①Hộp-thư(Postgres)" $? "pass=$p fail=$f (đòi ≥7, gồm L6: van đóng ⇒ posGhiMo=false · duyệt chặn · 0 POST POS)"
out=$(chay v3/test/b/ve5-hop-thu.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 5 ]; ket "②bộ-ca-VE5" $? "pass=$p fail=$f (đòi ≥5: tab · Cần bạn · thẻ đơn · thanh cuối · cột phải)"
for t in v3/test/b/hop-thu.test.mjs v3/test/b/ban-hoi-thoai-khong-gui.test.mjs v3/test/b/ban-hoi-thoai-ds.test.mjs \
         v3/test/b/ban-hoi-thoai-boi-canh.test.mjs v3/test/b/dispatch-dong-viec.test.mjs v3/test/b/dispatch-router.test.mjs \
         v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "③thước" $? "$t fail=$ff"
done
bash ops/bin/nghiem-thu/ve4.sh >/dev/null 2>&1; ket "④cổng-trước" $? "ve4.sh (kèm ve3 · ve2 · ve1 · ll18)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
