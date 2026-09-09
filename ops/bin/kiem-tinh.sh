#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG TĨNH — những phép đo KHÔNG cần CSDL, KHÔNG cần .env, KHÔNG cần secret.
# Vì thế nó chạy được ở CI, ở máy mới, và ở máy chưa có gói bàn giao.
#
# LUẬT: mỗi phép in MỘT CON SỐ. Phép không đo được in HOÃN, không đọc thành đạt.
# Nó KHÔNG thay `npm test` và 25 cổng nghiệm thu — hai thứ đó cần Postgres thật.
#
#   bash ops/bin/kiem-tinh.sh
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; cd "$GOC" || exit 2

LOI=0; PHEP=0; HOAN=0
muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-52s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP+1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP+1)); LOI=$((LOI+1)); printf '   ✘ %s\n' "$1"; }
hoan()  { PHEP=$((PHEP+1)); HOAN=$((HOAN+1)); printf '   ⏸ %s — KHÔNG ĐO ĐƯỢC\n' "$1"; }

printf '═══ CỔNG TĨNH · %s · %s\n' "$(date '+%d/%m/%Y %H:%M')" "$(git rev-parse --short HEAD 2>/dev/null || echo '?')"

muc "① cú pháp script shell"
N=0; XAU=0
for f in $(find ops -name '*.sh' 2>/dev/null); do
  N=$((N+1)); bash -n "$f" 2>/dev/null || { XAU=$((XAU+1)); printf '   🔴 %s\n' "$f"; }
done
so "script đã soi" "$N"; so "script sai cú pháp" "$XAU"
[ "$XAU" -eq 0 ] && dat "mọi script parse được" || truot "$XAU script sai cú pháp"

muc "② cú pháp JavaScript (src · v3 · db · test)"
N=0; XAU=0
for f in $(find src v3 db test -name '*.js' -o -name '*.mjs' 2>/dev/null | grep -v node_modules); do
  N=$((N+1)); node --check "$f" 2>/dev/null || { XAU=$((XAU+1)); printf '   🔴 %s\n' "$f"; }
done
so "tệp đã soi" "$N"; so "tệp sai cú pháp" "$XAU"
[ "$XAU" -eq 0 ] && dat "mọi tệp parse được" || truot "$XAU tệp sai cú pháp"

muc "③ cổng nghiệm thu còn nguyên vẹn"
NC=$(find ops/bin/nghiem-thu -name '*.sh' 2>/dev/null | wc -l | tr -d ' ')
THIEU=0
for f in ops/bin/nghiem-thu/*.sh; do head -1 "$f" | grep -q '^#!' || { THIEU=$((THIEU+1)); printf '   🔴 thiếu shebang: %s\n' "$f"; }; done
so "số cổng" "$NC"; so "cổng thiếu shebang" "$THIEU"
[ "$THIEU" -eq 0 ] && dat "mọi cổng có shebang" || truot "$THIEU cổng hỏng"

muc "④ docs:verify — biến V3_* phải có dòng trong bảng khai"
BANG=docs/v3/ban-giao/bien-moi-truong-v3.md
if [ -f "$BANG" ]; then
  THIEU=""
  for v in $(grep -rhoE 'V3_[A-Z][A-Z0-9_]{2,}' src v3 db ops 2>/dev/null | grep -v '_$' | sort -u); do
    grep -q "$v" "$BANG" || THIEU="$THIEU $v"
  done
  N=$(printf '%s' "$THIEU" | wc -w | tr -d ' ')
  so "biến chưa khai" "$N"
  [ "$N" -eq 0 ] && dat "mọi biến V3_* có dòng khai" || {
    printf '   ⚠️%s\n' "$THIEU"
    printf '   ⚠️ CẢNH BÁO, KHÔNG CHẶN — grep bắt cả tên ghép động; soi tay rồi bổ sung bảng\n'; }
else hoan "không thấy $BANG"; fi

muc "⑤ marker [NEEDS CLARIFICATION] trong CODE"
MK=$(grep -rn "\[NEEDS CLARIFICATION:" src v3 db test 2>/dev/null \
     | grep -v 'CLARIFICATION: câu hỏi\]' | grep -v 'CLARIFICATION: …\]' | wc -l | tr -d ' ')
so "marker trong code" "$MK"
[ "$MK" -eq 0 ] && dat "code không còn marker" || truot "$MK marker — phiếu chưa xong"

muc "⑥ giấy tờ điều hành"
NP=$(ls docs/thi-cong/phieu/*.md 2>/dev/null | wc -l | tr -d ' ')
NC2=$(ls docs/thi-cong/nhat-ky/* 2>/dev/null | wc -l | tr -d ' ')
so "phiếu" "$NP"; so "tệp nhật ký" "$NC2"
[ -f docs/thi-cong/SO-DIEU-HANH-THI-CONG.md ] && dat "sổ điều hành có mặt" || truot "MẤT sổ điều hành"
# Cấu hình Claude Code (.claude/settings.json + hooks) là đồ RIÊNG TỪNG MÁY, cố ý
# không nằm trong repo — có thì kiểm, không có thì thôi, không phải lỗi.
if [ -f .claude/settings.json ] && command -v jq >/dev/null 2>&1; then
  jq -e . .claude/settings.json >/dev/null 2>&1 \
    && printf '   ℹ️ settings.json của máy này hợp lệ\n' \
    || truot "settings.json HỎNG — JSON sai thì MỌI hook im lặng tắt"
fi

printf '\n═══ PHÉP=%s · ĐỎ=%s · HOÃN=%s\n' "$PHEP" "$LOI" "$HOAN"
[ "$LOI" -gt 0 ] && { printf '⛔ CỔNG TĨNH ĐỎ.\n'; exit 1; }
printf '✅ Cổng tĩnh xanh. (KHÔNG thay npm test + 25 cổng — hai thứ đó cần Postgres.)\n'
exit 0
