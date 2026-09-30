#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU VE2b — «Page» gộp nốt: màn Kịch bản vào trang một page (tab Lời bot: nhập file Pancake · tab Lịch
# sử: xem / chép / chạy lại từng bản; `/kich-ban` chuyển theo vai) · cột trái trang một page lọc bằng ĐÚNG bộ lọc «Tất cả
# page» (cùng hàm, cùng số; + mã «Chưa có lời bot riêng») · «Tất cả page» vào thẳng danh sách (đầu trang ẩn, không thanh tab,
# cửa ghi đóng thành một dòng) · bấm tên page mang lọc sang, «← Tất cả page» trả về đúng chỗ · marketer vào mục Page bằng «Các page».
# Chạy: ops/bin/nghiem-thu/ve2b.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết. ① máy chủ thật (vai-b + CSDL giả) qua HTTP · ② script THẬT hai màn chạy trong vm, gọi
# sang máy chủ thật, bấm đúng nút người dùng bấm.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/ve2b-page-gop.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 17 ]; ket "①②VE2b" $? "pass=$p fail=$f (đòi ≥17: một bộ lọc hai màn · chuyển hướng theo vai · điều hướng · lọc/trở lại · lịch sử · nhập file · danh sách vào thẳng)"
for t in v3/test/b/ve2-mot-page.test.mjs v3/test/b/mot-page.test.mjs v3/test/b/ve3-page-ds.test.mjs v3/test/b/kich-ban.test.mjs \
         v3/test/b/ll3-cum.test.mjs v3/test/b/ll1-nam-dich.test.mjs v3/test/b/ll18-khung.test.mjs v3/test/b/dieu-huong.test.mjs \
         v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs v3/test/b/phan-quyen-nam-vai.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -eq 0 ]; ket "③thước" $? "$t fail=$ff"
done
# Không còn trang nào trỏ thẳng sang màn Kịch bản đã gộp — trừ đường chuyển hướng khai ở bảng (liên kết cũ vẫn chạy).
n=$(grep -rnE "href=[\"']/kich-ban[\"'?]|href: ?[\"'\`]/kich-ban" v3/src/ui --include=*.html | grep -v "hieu-qua/trang/hieu-qua.html" | wc -l | tr -d ' ')
[ "$n" -eq 0 ]; ket "④lối-cũ" $? "trang trỏ /kich-ban ngoài màn thử nghiệm So hai bản = $n (đòi 0)"
_o=$(bash ops/bin/nghiem-thu/ve6c.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "⑤cổng-trước" $_r "ve6c.sh (kèm ve6b · ve6a · va1)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
