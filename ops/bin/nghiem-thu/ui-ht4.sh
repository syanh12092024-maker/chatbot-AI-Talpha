#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU UI-HT4 — sửa thước theo §10 mới (CR-28-09): bàn hội thoại CHỈ ĐỌC.
# Chạy: ops/bin/nghiem-thu/ui-ht4.sh        (rc=0 là đạt)
# ① thước «không soạn · không gửi» phủ cả module · ② HK10 đo màn bàn · ③ sale vào thẳng bàn
# · ④ bộ ca điều phối vẫn xanh · ⑤ hợp đồng trỏ CR · ⑥ ba cổng trước của sóng vẫn xanh.
# Tầm đo: lưới HỒI QUY do chính thợ viết — bắt tái phạm đã biết. Bằng chứng thật là bậc phơi.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2

do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }

out=$(chay v3/test/b/ban-hoi-thoai-khong-gui.test.mjs)
p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 6 ]; ket "①không-soạn-không-gửi" $? "pass=$p fail=$f (đòi ≥6: import · cửa tiêm · chỉ GET · trang · khối đóng việc · Pancake GET)"

out=$(chay v3/test/b/he-kieu.test.mjs)
f=$(so "$out" fail); f=${f:-1}
h=$(echo "$out" | grep -c "^✔ HK10")
[ "$f" -eq 0 ] && [ "$h" -eq 1 ]; ket "②HK10-đo-màn-bàn" $? "he-kieu fail=$f · HK10 xanh=$h (đòi 0 · 1)"

out=$(chay v3/test/b/vai-b-noi-day.test.mjs)
f=$(so "$out" fail); f=${f:-1}
n=$(grep -c "diTiep, '/ban-hoi-thoai'" v3/test/b/vai-b-noi-day.test.mjs)
[ "$f" -eq 0 ] && [ "$n" -eq 1 ]; ket "③sale-vào-thẳng-bàn" $? "vai-b-noi-day fail=$f · ca đích đăng nhập=$n (đòi 0 · 1)"

for tt in v3/test/b/dispatch-router.test.mjs v3/test/b/dispatch-chi-tiet.test.mjs v3/test/b/dispatch-dong-viec.test.mjs \
          v3/test/b/dispatch-kho-viec.test.mjs v3/test/b/dieu-huong.test.mjs v3/test/b/phan-quyen-nam-vai.test.mjs; do
  o=$(chay "$tt"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "④thước-điều-phối" $? "$tt fail=$ff"
done

# ⑤ hợp đồng: spec có §7 hiện hành; tài liệu còn chép luật cũ đều trỏ CR
s=$(grep -c "^## 7 · BÀN HỘI THOẠI" v3/docs/spec/L4-M1-bang-dieu-phoi.md)
[ "$s" -eq 1 ]; ket "⑤spec-L4-M1-§7" $? "mục hợp đồng hiện hành: $s (đòi 1)"
for d in docs/v3/06-PROMPT-GIAO-VIEC.md docs/v3/SO-TAY-VAI-B.md docs/v3/03-MAN-HINH.md docs/v3/01-QUYET-DINH.md; do
  c=$(grep -c "CR-28-09" "$d"); [ "$c" -ge 1 ]; ket "⑤trỏ-CR" $? "$d: $c (đòi ≥1)"
done

# ⑥ ba cổng trước của sóng — thước UI-HT1 từng đỏ OAN mà không ai chạy lại (bắt ở UI-HT3)
for g in ui-ht1 ui-ht2 ui-ht3; do
  bash "ops/bin/nghiem-thu/$g.sh" >/dev/null 2>&1; ket "⑥cổng-trước" $? "$g.sh"
done

echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
