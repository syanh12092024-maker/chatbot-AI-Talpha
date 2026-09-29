#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE2 — màn «một page» dựng lại theo BẢN VẼ 2c (ba cột: page của team · một page với «Bật được
# chưa» + bảy tab · thử hỏi bot).
# Chạy: ops/bin/nghiem-thu/ve2.sh        (rc=0 là đạt)
# ① cửa danh sách page (nguồn bot THẬT, khai khi đứng ở bản sao · kẹp team · quyền như trang một page) + trang giữ đủ cửa
# ghi của màn cũ · ② khung: đứng ở một page thì «Trong mục Page» sáng «Tất cả page» · ③ thước menu/cụm/hệ kiểu · ④ ve1.
# Tầm đo: lưới HỒI QUY do chính thợ viết. Bằng chứng giao diện là ảnh chụp đối chiếu bản vẽ (nhật ký phiếu).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/ve2-mot-page.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 4 ]; ket "①bộ-ca-VE2" $? "pass=$p fail=$f (đòi ≥4)"
for t in v3/test/b/ll18-khung.test.mjs v3/test/b/ll3-cum.test.mjs v3/test/b/dieu-huong.test.mjs v3/test/b/he-kieu.test.mjs v3/test/b/ll10-van-hanh.test.mjs v3/test/b/trang-parse-duoc.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "②③thước" $? "$t fail=$ff"
done
bash ops/bin/nghiem-thu/ve1.sh >/dev/null 2>&1; ket "④cổng-trước" $? "ve1.sh"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
