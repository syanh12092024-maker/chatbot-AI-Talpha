#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU BH8 — hai bản: người đọc tiếng Việt, model đọc tiếng Anh gọn.
# Chạy: ops/bin/nghiem-thu/bh8.sh        (rc=0 là đạt)
#
# Chỉ phép MÁY (0 token). Đo token thật + đo model nằm ở phiếu mục ④ — chạy tay, có ngân
# sách, vì tài khoản Kimi có trần 1,5 triệu token/NGÀY cho cả tổ chức.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2

do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }

# ① bộ ca của phiếu
out=$(chay test/bh8-hai-ban.test.mjs)
pass=$(so "$out" pass); pass=${pass:-0}; fail=$(so "$out" fail); fail=${fail:-1}
[ "$fail" -eq 0 ] && [ "$pass" -ge 11 ]
ket "①bộ-ca-bh8" $? "pass=$pass fail=$fail (đòi ≥11 pass, 0 fail)"

# ② hợp đồng cũ — từng file một (hai file dựng CSDL sandbox chạy chung thì tranh kết nối)
for t in test/l4-prompt.test.mjs test/l2-m3-rap-prompt.test.js test/bh7-ngu-canh-botcake.test.mjs \
         test/context.test.mjs test/phase1-chat-flow.test.js v3/test/b/kich-ban.test.mjs v3/test/b/vai-b-noi-day.test.mjs; do
  o=$(chay "$t"); f=$(so "$o" fail); f=${f:-1}
  [ "$f" -eq 0 ]; ket "②hợp-đồng-cũ" $? "$t fail=$f"
done

# ③ không còn câu song sinh «khách mới nhắn» ở code chạy (chú thích kể lịch sử thì được)
n=$(grep -rn "khách mới nhắn" src db v3/src --include='*.js' | grep -vE "^\S+:[0-9]+:\s*//" | grep -c .)
[ "$n" -eq 0 ]; ket "③hết-song-sinh-câu-chào" $? "dòng code còn «khách mới nhắn»: $n"

# ④ CORE model đọc là tiếng Anh; bản người đọc vẫn đủ và được seed cho màn Bộ luật
node --input-type=module -e '
import { CORE, CORE_VI } from "./src/prompts.js";
if (!/^# ROLE/.test(CORE)) { console.log("CORE không mở bằng # ROLE"); process.exit(1); }
if (!/^# VAI TRÒ/.test(CORE_VI)) { console.log("CORE_VI không mở bằng # VAI TRÒ"); process.exit(1); }'
ket "④hai-bản-CORE" $? ""
g=$(grep -c 'CORE_VI as CORE' db/di-tru/bo-luat-va-ky-nang.js)
[ "$g" -ge 1 ]; ket "④b-seed-bộ-luật-là-bản-Việt" $? "bo-luat-va-ky-nang.js import CORE_VI: $g"

# ⑤ đường ráp prompt ĐỌC bản máy có dấu; bộ đo dừng ở hạn mức ngày
a=$(grep -c "laBanMayEn(kichBan?.noi_dung_may)" src/chat/rap-prompt.js)
b=$(grep -c "TPD" ops/bin/gia-lap-mot-minh.mjs)
[ "$a" -ge 1 ] && [ "$b" -ge 1 ]
ket "⑤nối-đường-thật" $? "rap-prompt đọc bản máy=$a · gia-lap dừng TPD=$b"

echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
