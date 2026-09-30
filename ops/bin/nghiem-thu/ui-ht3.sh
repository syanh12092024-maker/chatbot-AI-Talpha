#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU UI-HT3 — cột bối cảnh + nhãn nguồn tin + tên Messenger (CR-28-09).
# Chạy: ops/bin/nghiem-thu/ui-ht3.sh        (rc=0 là đạt)
# ① bộ ca cổng + HTTP · ② Postgres SANDBOX qua CỔNG THẬT (tự dựng, tự dọn) · ③ nối dây máy chủ
# · ④ nhãn khớp nguồn sự thật · ⑤ §10 vẫn giữ · ⑥ thước cũ vẫn xanh.
# Tầm đo: lưới HỒI QUY do chính thợ viết — bắt tái phạm đã biết, KHÔNG thay bậc phơi trên máy chủ.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2

do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }

out=$(chay v3/test/b/ban-hoi-thoai-boi-canh.test.mjs)
p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 13 ]; ket "①bối-cảnh+nguồn-tin+HTTP" $? "pass=$p fail=$f (đòi ≥13, 0 đỏ)"

# ② Lỗi UI-HT1 bắt 28/09: `tin_cho_xu_ly`/`lan_gui` ngoài BANG_NGHIEP_VU_CHUAN ⇒ cổng THẬT ném.
#    Chỉ Postgres + cổng thật bắt được — cổng giả không có danh sách bảng.
out=$(chay test/ui-ht3-sql.test.js)
p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 3 ]; ket "②sandbox-cổng-thật" $? "pass=$p fail=$f (đòi ≥3: dấu vết SQL không lọt team · docHoiThoai trọn đường · bối cảnh đúng cột/kiểu)"

# ③ Máy chủ nối ĐỦ ba phụ thuộc mới — thiếu `docDauVetV3` là mở hội thoại nào cũng 500.
n=$(grep -cE "^  (docDauVetV3|giaiKichBanPage|laTinTuDong):" v3/chay-that.js)
[ "$n" -eq 3 ]; ket "③nối-dây-chay-that" $? "docDauVetV3 · giaiKichBanPage · laTinTuDong trong chay-that.js: $n (đòi 3)"
g=$(grep -cE "^  (docDauVetV3|giaiKichBanPage|laTinTuDong):" v3/xem-thu.js)
[ "$g" -eq 3 ]; ket "③bản-xem-thử-dùng-GIẢ" $? "ba bản giả trong xem-thu.js: $g (đòi 3 — bỏ trống là nối vào đồ thật)"

# ④ Bộ đọc SQL dấu vết kẹp team bằng bối cảnh (hai câu, cả hai `$1` = bc.teamId)
t=$(grep -cE "WHERE (l\.)?team_id = \\\$1" v3/src/ui/ban-hoi-thoai/doc-hoi-thoai.js)
b=$(grep -c "\[bc.teamId, pageFb, psid" v3/src/ui/ban-hoi-thoai/doc-hoi-thoai.js)
[ "$t" -eq 2 ] && [ "$b" -eq 2 ]; ket "④kẹp-team-từ-bối-cảnh" $? "WHERE team=\$1: $t · tham số đầu bc.teamId: $b (đòi 2 · 2)"

# ⑤ §10 — trang vẫn không có ô soạn tin, không đường gửi
n=$(sed 's/<!--.*-->//' v3/src/ui/ban-hoi-thoai/trang/ban-hoi-thoai.html | grep -cE "<textarea|pkSend|/api/.*gui")
[ "$n" -eq 0 ]; ket "⑤không-soạn-không-gửi" $? "chỗ soạn/gửi trong trang: $n (đòi 0)"

# ⑥ thước cũ của bàn hội thoại + nối dây + hệ kiểu vẫn xanh
for tt in v3/test/b/ban-hoi-thoai-doc.test.mjs v3/test/b/ban-hoi-thoai-ds.test.mjs v3/test/b/vai-b-noi-day.test.mjs \
          v3/test/b/he-kieu.test.mjs v3/test/b/nhan-tang-hoan.test.mjs test/ui-ht2-sql.test.js; do
  o=$(chay "$tt"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "⑥thước" $? "$tt fail=$ff"
done

echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
