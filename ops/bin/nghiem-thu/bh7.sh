#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU BH7 — Kimi đọc được tin Botcake khách đã nhận · tin ngắn 2–3 dòng.
# Chạy: ops/bin/nghiem-thu/bh7.sh        (rc=0 là đạt)
#
# Cổng này chỉ đo MÁY (0 token). Phép đo bằng model thật nằm ở phiếu mục ④ — chạy tay vì
# tốn tiền. ③④⑤ là NEO: đỏ ngay khi ai đó trả `cleanHistory` về lối vứt template, xoá luật
# độ dài khỏi CORE, hoặc hạ `max_tokens` khi closer còn gửi nguyên tin cụt.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2

do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }

# ① bộ ca của phiếu
out=$(chay test/bh7-ngu-canh-botcake.test.mjs)
pass=$(so "$out" pass); pass=${pass:-0}; fail=$(so "$out" fail); fail=${fail:-1}
[ "$fail" -eq 0 ] && [ "$pass" -ge 10 ]
ket "①bộ-ca-bh7" $? "pass=$pass fail=$fail (đòi ≥10 pass, 0 fail)"

# ② hợp đồng cũ — chạy TỪNG FILE một: hai file cùng dựng CSDL sandbox mà chạy chung một
#    lượt `node --test` thì tranh nhau kết nối (đo 28/09: 6 ca đỏ giả «Connection terminated»).
for t in test/context.test.mjs test/l4-prompt.test.mjs test/mach-tu-van.test.js test/phase1-chat-flow.test.js test/l2-m3-rap-prompt.test.js; do
  o=$(chay "$t"); f=$(so "$o" fail); f=${f:-1}
  [ "$f" -eq 0 ]; ket "②hợp-đồng-cũ" $? "$t fail=$f"
done

# ③ template KHÔNG còn bị vứt thẳng: nhánh isAutomationTemplate phải đẩy ghi chú kenhKhac
n=$(awk '/^export function cleanHistory/,/^}/' src/context.js | grep -cE "kenhKhac: true")
[ "$n" -ge 1 ]; ket "③template-thành-ghi-chú" $? "cleanHistory đẩy kenhKhac $n chỗ (đòi ≥1)"

# ④ luật văn phong còn trong CORE
node --input-type=module -e '
import { CORE } from "./src/prompts.js";
const can = ["2–3 dòng", "CHỈ chào ở tin ĐẦU", "KHÔNG markdown", "KHÁCH ĐÃ NHẬN"];
const thieu = can.filter((c) => !CORE.includes(c));
if (thieu.length) { console.log("thiếu: " + thieu.join(" · ")); process.exit(1); }'
ket "④luật-tin-ngắn-trong-CORE" $? ""

# ⑤ max_tokens không bị hạ khi closer còn trả nguyên tin cụt (stop_reason=max_tokens)
m=$(grep -oE "max_tokens: [0-9]+" src/closer.js | grep -oE '[0-9]+' | head -1)
[ "${m:-0}" -ge 400 ]; ket "⑤không-hạ-max_tokens" $? "closer.js max_tokens=${m:-?} (đòi ≥400 tới khi có cắt-ở-câu — BH3)"

echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
