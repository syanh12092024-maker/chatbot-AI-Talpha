#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE6c — Số liệu › Khách theo BẢN VẼ 3c: phân bố hội thoại CỦA TEAM (giai đoạn × người giữ, CSDL v3) · rủi ro
# hoàn theo vai + «Tra một khách» · hai khối «rơi ở đâu» (không tỉ lệ rơi). Cụm Số liệu còn BA tab; Rủi ro hoàn mở bằng «Xem đủ →».
# Chạy: ops/bin/nghiem-thu/ve6c.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết. ① hàm gom trên Postgres THẬT (sandbox riêng, tự dọn) · ② CHẠY THẬT script trang (vm).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay test/ve6c-phan-bo-hoi-thoai.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 4 ]; ket "①gom-theo-team(Postgres)" $? "pass=$p fail=$f (đòi ≥4: đúng team · đúng cặp · tuổi · vai · cửa HTTP)"
out=$(chay v3/test/b/ve6c-khach.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 5 ]; ket "②chạy-thật-VE6c" $? "pass=$p fail=$f (đòi ≥5: phân bố · lùi toàn hệ · rủi ro theo vai · rơi ở đâu · lối theo menu)"
for t in v3/test/b/nguon-khach.test.mjs v3/test/b/rui-ro-hoan.test.mjs v3/test/b/ll5-so-lieu.test.mjs v3/test/b/ll18-khung.test.mjs \
         v3/test/b/ll1-nam-dich.test.mjs v3/test/b/dieu-huong.test.mjs v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "③thước" $? "$t fail=$ff"
done
_o=$(bash ops/bin/nghiem-thu/ve6b.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "④cổng-trước" $_r "ve6b.sh (kèm ve6a · va1)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
