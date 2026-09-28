#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU UI-HT1 — cửa đọc hội thoại cho bàn hội thoại (CR-28-09).
# Chạy: ops/bin/nghiem-thu/ui-ht1.sh        (rc=0 là đạt)
#
# Cổng chỉ đo MÁY, không gọi Pancake. Phép đo trên Pancake thật (chỉ đọc) nằm ở nhật ký phiếu:
# 28/09 · 2/3 page đọc được với mã `<page>_<psid>`, Pancake bắt buộc customer_id, một page
# báo «không tìm thấy gói cước». ③④⑤ là NEO: đỏ ngay khi ai đó cho bàn hội thoại GHI hay GỬI.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2

do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }

# ① bộ ca của phiếu (thứ tự nguồn mã khách · lỗi Pancake nói ra · nhớ 60s · chặn team)
out=$(chay v3/test/b/ban-hoi-thoai-doc.test.mjs)
pass=$(so "$out" pass); pass=${pass:-0}; fail=$(so "$out" fail); fail=${fail:-1}
[ "$fail" -eq 0 ] && [ "$pass" -ge 10 ]
ket "①bộ-ca-ui-ht1" $? "pass=$pass fail=$fail (đòi ≥10 pass, 0 fail)"

# ② đường HTTP + hợp đồng cũ của điều phối và nối dây
for t in v3/test/b/dispatch-router.test.mjs v3/test/b/dispatch-kho-viec.test.mjs v3/test/b/vai-b-noi-day.test.mjs; do
  o=$(chay "$t"); f=$(so "$o" fail); f=${f:-1}
  [ "$f" -eq 0 ]; ket "②hợp-đồng" $? "$t fail=$f"
done

# ③ bàn hội thoại CHỈ ĐỌC: module không gọi hàm ghi nào của cổng dữ liệu
n=$(grep -cE "\.(them|sua|xoa|capNhat)\(" v3/src/ui/ban-hoi-thoai/*.js)
[ "$n" -eq 0 ]; ket "③không-ghi-CSDL" $? "lời gọi ghi trong ban-hoi-thoai/: $n (đòi 0)"

# ④ pkDocTin chỉ GET: khối hàm không có `method:`
m=$(awk '/^export async function pkDocTin/,/^}/' src/pancake.js | grep -c "method")
k=$(grep -c "^export async function pkDocTin" src/pancake.js)
[ "$k" -eq 1 ] && [ "$m" -eq 0 ]; ket "④pkDocTin-chỉ-GET" $? "có hàm=$k · method trong hàm=$m (đòi 1 · 0)"

# ⑤ §10: không ô soạn tin, không đường gửi trong module
s=$(grep -lE "<textarea|pkSendReply|pkSendImage" v3/src/ui/ban-hoi-thoai/* 2>/dev/null | wc -l | tr -d ' ')
[ "$s" -eq 0 ]; ket "⑤không-soạn-không-gửi" $? "tệp có ô soạn/đường gửi: $s (đòi 0)"

echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
