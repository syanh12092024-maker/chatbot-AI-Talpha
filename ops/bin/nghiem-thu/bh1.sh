#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU BH1 — giá do SERVER tính · hội thoại đã CHỐT bị khoá · van READONLY.
# Chạy: ops/bin/nghiem-thu/bh1.sh        (rc=0 là đạt)
#
# Cổng này sẽ còn chạy lại mãi về sau ở mọi GATE, nên mỗi phép phải nói được MỘT câu rõ
# ràng và tự đỏ khi ai đó nới bản vá ra. Ba phép cuối (⑤⑥⑦) là NEO SỐ: chúng đỏ ngay khi
# có người bỏ cửa đi, kể cả khi bộ ca vẫn xanh.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2

do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }

# ① bộ ca của phiếu
out=$(node --env-file-if-exists=.env --import ./test/_an-toan.mjs --test test/bh1-gia-va-cua-chot.test.js 2>&1)
pass=$(echo "$out" | grep -oE '^ℹ pass [0-9]+' | grep -oE '[0-9]+'); pass=${pass:-0}
fail=$(echo "$out" | grep -oE '^ℹ fail [0-9]+' | grep -oE '[0-9]+'); fail=${fail:-1}
[ "$fail" -eq 0 ] && [ "$pass" -ge 20 ]
ket "①bộ-ca-bh1" $? "pass=$pass fail=$fail (đòi ≥20 pass, 0 fail)"

# ② hợp đồng CŨ không vỡ — ba bộ ca đụng đúng vùng BH1 sửa
for t in test/anh-cho-gui.test.mjs test/conv-owner.test.mjs test/l8-botcake-rules.test.mjs; do
  o=$(node --env-file-if-exists=.env --import ./test/_an-toan.mjs --test "$t" 2>&1)
  f=$(echo "$o" | grep -oE '^ℹ fail [0-9]+' | grep -oE '[0-9]+'); f=${f:-1}
  [ "$f" -eq 0 ]; ket "②hợp-đồng-cũ" $? "$t fail=$f"
done

# ③ MỘT SỰ THẬT: outbound-guard không còn TỰ ĐỌC bảng giá.
#    ⚠️ Neo theo dòng IMPORT, không đếm chuỗi thô: bản đầu của cổng này đếm mọi lần xuất
#    hiện chữ "productTiers" và ĐỎ vì một dòng CHÚ THÍCH nhắc tới tên hàm. Thước bắt nhầm
#    chú thích là thước dạy người ta xoá chú thích (án lệ #29: thước rỗng còn tệ hơn đỏ).
n=$(grep -cE "^import .*productTiers" src/outbound-guard.js)
[ "$n" -eq 0 ]; ket "③một-bảng-giá" $? "outbound-guard import productTiers $n lần (đòi 0 — phải qua core/gia.js)"

# ④ lõi chung tồn tại và được CẢ HAI đường dùng
[ -f src/core/gia.js ] && [ -f src/core/van-gui.js ]; ket "④lõi-chung-tồn-tại" $? ""
a=$(grep -cE "^import .*core/gia\.js" src/tools.js)
b=$(grep -cE "^import .*core/gia\.js" src/outbound-guard.js)
[ "$a" -ge 1 ] && [ "$b" -ge 1 ]
ket "④b-hai-đường-dùng-chung" $? "tools.js=$a · outbound-guard.js=$b (mỗi bên phải import ≥1)"

# ⑤ NEO: cửa tiền đứng TRƯỚC cửa mạng (POS). Đảo lại là mỗi lượt chốt đơn tốn một vòng
#    mạng vô ích — đo được: bản cũ chạy ca G1-tool mất 34,8 GIÂY, bản mới 0,58ms.
l_tien=$(grep -n "const tien = tinhTong" src/tools.js | cut -d: -f1)
l_pos=$(grep -n "await conversationHasOrder" src/tools.js | cut -d: -f1)
[ -n "$l_tien" ] && [ -n "$l_pos" ] && [ "$l_tien" -lt "$l_pos" ]
ket "⑤cửa-tiền-trước-cửa-mạng" $? "tinhTong dòng ${l_tien:-?} < conversationHasOrder dòng ${l_pos:-?}"

# ⑥ NEO: cửa CLOSING có thật trong decideConv
grep -q "c.state === S.CLOSING" src/conv-owner.js
ket "⑥cửa-CLOSING" $? "decideConv phải từ chối khi hội thoại đã chốt (§6.3 bảng quyền nói)"

# ⑦ NEO: ba lượt GHI ra Pancake trong tools.js đều có van. Con số này là HỢP ĐỒNG —
#    thêm một lượt ghi mới mà quên van thì phép này đỏ.
v=$(grep -c "vanGuiDangMo()" src/tools.js)
[ "$v" -ge 4 ]; ket "⑦van-ở-mọi-lượt-ghi" $? "tools.js gọi vanGuiDangMo $v lần (đòi ≥4: ảnh · thẻ đơn · ghi chú đơn · handoff)"

# ⑧ (BỎ) kiểm pathspec — `_chan1.sh` phép ④ đã làm đúng việc đó và làm ĐÚNG HƠN: nó so
#    `base..HEAD` của phiếu, còn ở đây chỉ so được với HEAD nên bắt nhầm mọi thay đổi
#    chưa commit của phiên khác (đo thật: bản đầu đỏ vì `src/pos/tao-don.js` của lượt
#    trước còn nằm trong cây). Một việc một chỗ; cổng phiếu lo NỘI DUNG, chặng 1 lo PHẠM VI.

echo "== ĐỎ $do / XANH $xanh"
[ $do -eq 0 ]
