#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG PHÁT HÀNH — chạy TRƯỚC mỗi lần mở van (skill `mo-van`, mục 1 «cửa vào»).
#
# LUẬT: mỗi phép in MỘT CON SỐ. Không dòng nào chỉ nói "chạy xong không lỗi".
#       Phép không đo được thì in HOÃN, KHÔNG đọc thành đạt (án lệ l2-m3 ②).
#
# ⛔ Script này KHÔNG push, KHÔNG tag, KHÔNG đụng VPS. Nó chỉ ĐO rồi in ra lệnh
#    đề nghị để NGƯỜI gõ — ba điểm dừng chờ người (§0b sổ điều hành).
#
#   bash ops/bin/phat-hanh.sh                 # chỉ đo
#   bash ops/bin/phat-hanh.sh 0.3.0           # đo, xanh thì sinh hồ sơ phát hành
#   BO_QUA_TEST=1 BO_QUA_CONG=1 bash ops/bin/phat-hanh.sh   # đo nhanh phần git/doc
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$GOC" || exit 2

VER="${1:-}"
LOI=0; PHEP=0; HOAN=0

muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-52s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP+1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP+1)); LOI=$((LOI+1)); printf '   ✘ %s\n' "$1"; }
hoan()  { PHEP=$((PHEP+1)); HOAN=$((HOAN+1)); printf '   ⏸ %s — KHÔNG ĐO ĐƯỢC, không đọc là đạt\n' "$1"; }

printf '═══ CỔNG PHÁT HÀNH · %s · %s\n' "$(date '+%d/%m/%Y %H:%M')" "$(git rev-parse --short HEAD)"

# ① cây sạch ───────────────────────────────────────────────────────────────────
muc "① cây làm việc"
BAN=$(git status --porcelain | wc -l | tr -d ' ')
so "tệp chưa commit" "$BAN"
[ "$BAN" -eq 0 ] && dat "cây sạch" || truot "cây bẩn: $BAN tệp — commit hoặc dọn trước khi phát hành"

# ② so với remote ──────────────────────────────────────────────────────────────
muc "② so với origin/main"
if git rev-parse --verify -q origin/main >/dev/null; then
  TRUOC=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "?")
  SAU=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "?")
  so "commit local chưa push" "$TRUOC"
  so "commit trên remote chưa lấy về" "$SAU"
  [ "$SAU" = "0" ] && dat "không bị bỏ lại phía sau" || truot "remote đi trước $SAU commit — pull rồi đo lại"
else
  hoan "không thấy origin/main"
fi

# ③ bộ ca ─────────────────────────────────────────────────────────────────────
muc "③ bộ ca (npm test)"
if [ "${BO_QUA_TEST:-0}" = "1" ]; then
  hoan "bỏ qua theo BO_QUA_TEST=1"
else
  OUT=$(npm test 2>&1 || true)
  PASS=$(printf '%s' "$OUT" | grep -oE '^# pass [0-9]+' | tail -1 | grep -oE '[0-9]+' || echo "")
  FAIL=$(printf '%s' "$OUT" | grep -oE '^# fail [0-9]+' | tail -1 | grep -oE '[0-9]+' || echo "")
  if [ -z "$PASS" ] || [ -z "$FAIL" ]; then
    so "không đọc được bảng đếm của node --test" "LOI-NODE"
    hoan "bộ ca: câu đo HỎNG"
  else
    so "ca xanh" "$PASS"; so "ca đỏ" "$FAIL"
    [ "$FAIL" -eq 0 ] && dat "bộ ca 0 đỏ ($PASS ca)" || truot "bộ ca còn $FAIL ca đỏ"
  fi
fi

# ④ cổng nghiệm thu ───────────────────────────────────────────────────────────
muc "④ cổng nghiệm thu (rc TÁCH DÒNG từng cổng)"
if [ "${BO_QUA_CONG:-0}" = "1" ]; then
  hoan "bỏ qua theo BO_QUA_CONG=1"
elif ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^talpha-pg$'; then
  hoan "container talpha-pg không chạy — cổng cần CSDL, chưa đo được"
else
  CONG_DO=0; CONG_XANH=0
  for f in ops/bin/nghiem-thu/*.sh; do
    case "$f" in */_chan1.sh) continue;; esac
    bash "$f" >/dev/null 2>&1
    rc=$?                                   # rc đo TÁCH DÒNG — luật của gate
    if [ $rc -eq 0 ]; then CONG_XANH=$((CONG_XANH+1))
    else CONG_DO=$((CONG_DO+1)); printf '   🔴 %-42s rc=%s\n' "$(basename "$f")" "$rc"; fi
  done
  so "cổng xanh" "$CONG_XANH"; so "cổng đỏ" "$CONG_DO"
  [ "$CONG_DO" -eq 0 ] && dat "toàn bộ cổng rc=0" || truot "$CONG_DO cổng đỏ — hỏi «đỏ vì mã hay vì THƯỚC»"
fi

# ⑤ máy này không bắn ra khách ────────────────────────────────────────────────
muc "⑤ luật 1 §0a — máy dev không gửi tin cho khách"
if [ -f .env ]; then
  grep -qE '^PANCAKE_READONLY=1' .env && dat "PANCAKE_READONLY=1" || truot "THIẾU PANCAKE_READONLY=1 trong .env"
else
  hoan ".env không có ở máy này"
fi

# ⑥ biến V3_* trong code đã khai trong bảng chưa ──────────────────────────────
muc "⑥ docs:verify — biến V3_* phải có dòng trong bảng khai"
BANG=docs/v3/ban-giao/bien-moi-truong-v3.md
if [ -f "$BANG" ]; then
  THIEU=""
  for v in $(grep -rhoE 'V3_[A-Z][A-Z0-9_]{2,}' src v3 db ops 2>/dev/null | grep -v '_$' | sort -u); do
    grep -q "$v" "$BANG" || THIEU="$THIEU $v"
  done
  N=$(printf '%s' "$THIEU" | wc -w | tr -d ' ')
  so "biến chưa khai trong bảng" "$N"
  if [ "$N" -eq 0 ]; then dat "mọi biến V3_* đều có dòng khai"
  else printf '   ⚠️ %s\n' "$THIEU"
       printf '   ⚠️ CẢNH BÁO, KHÔNG CHẶN — grep có thể bắt cả tên ghép động; soi tay rồi bổ sung bảng\n'; fi
else
  hoan "không thấy $BANG"
fi

# ⑦ marker còn sót ────────────────────────────────────────────────────────────
muc "⑦ marker [NEEDS CLARIFICATION] chưa trả lời"
# đếm marker THẬT: bỏ khuôn mẫu ("câu hỏi]" / "…]") và bỏ chính các tệp nói VỀ luật marker
locmau() { grep -v 'CLARIFICATION: câu hỏi\]' | grep -v 'CLARIFICATION: …\]' \
         | grep -v '^docs/thi-cong/PHIEU-MAU.md:' | grep -v '^ops/bin/'; }
MK_CODE=$(grep -rn "\[NEEDS CLARIFICATION:" src v3 db test 2>/dev/null | locmau | wc -l | tr -d ' ')
MK_GIAY=$(grep -rn "\[NEEDS CLARIFICATION:" docs 2>/dev/null | locmau | wc -l | tr -d ' ')
so "marker trong CODE (src·v3·db·test)" "$MK_CODE"
so "marker trên GIẤY (phiếu·nhật ký·sổ)" "$MK_GIAY"
if [ "$MK_CODE" -eq 0 ]; then dat "code không còn marker"
else grep -rn "\[NEEDS CLARIFICATION:" src v3 db test 2>/dev/null | locmau | sed 's/^/   🔴 /' | cut -c1-140
     truot "$MK_CODE marker trong code — phiếu chưa xong, cấm phát hành"; fi
if [ "$MK_GIAY" -gt 0 ]; then
  grep -rn "\[NEEDS CLARIFICATION:" docs 2>/dev/null | locmau | sed 's/^/   ⚠️  /' | cut -c1-140
  printf '   ⚠️ CẢNH BÁO, KHÔNG CHẶN — câu hỏi tổng còn nợ; trả lời hoặc chuyển §9 SỔ NỢ\n'
fi

# ── kết ───────────────────────────────────────────────────────────────────────
printf '\n═══ PHÉP=%s · ĐỎ=%s · HOÃN=%s\n' "$PHEP" "$LOI" "$HOAN"

if [ "$LOI" -gt 0 ] || [ "$HOAN" -gt 0 ]; then
  printf '⛔ CHƯA ĐỦ ĐIỀU KIỆN PHÁT HÀNH — đóng hết ĐỎ và đo nốt phần HOÃN.\n'
  exit 1
fi

printf '✅ Cửa vào XANH.\n'
[ -z "$VER" ] && { printf 'Chạy lại kèm phiên bản để sinh hồ sơ: bash ops/bin/phat-hanh.sh <phiên-bản>\n'; exit 0; }

# hồ sơ phát hành ─────────────────────────────────────────────────────────────
mkdir -p docs/thi-cong/phat-hanh
HS="docs/thi-cong/phat-hanh/$VER.md"
TRUOC_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
KHOANG=${TRUOC_TAG:+$TRUOC_TAG..HEAD}
{
  printf '# PHÁT HÀNH %s\n\n' "$VER"
  printf -- '- Ngày đo: %s\n' "$(date '+%d/%m/%Y %H:%M')"
  printf -- '- Commit: `%s`\n' "$(git rev-parse HEAD)"
  printf -- '- Bản trước: %s\n' "${TRUOC_TAG:-«chưa có tag nào»}"
  printf -- '- Cửa vào: %s phép, 0 đỏ, 0 hoãn\n\n' "$PHEP"
  printf '## Commit trong bản này (%s)\n\n```\n' "$(git rev-list --count ${KHOANG:-HEAD})"
  git log --format='%h %ad %s' --date=short ${KHOANG:-HEAD} | head -80
  printf '```\n\n## Trước khi mở van\n\n'
  printf -- '- [ ] Mục tương ứng trong `CHANGELOG.md` đã viết bằng thứ người dùng thấy\n'
  printf -- '- [ ] Bậc phơi đã chọn + ngưỡng lùi đã ghi (skill `mo-van` mục 2 và 4)\n'
  printf -- '- [ ] Đường lùi đã viết sẵn và thử được (mục 5) — nhớ: `migrate down` KHÔNG phải đường lùi\n'
  printf -- '- [ ] Người quyết đã gật\n\n'
  printf '## Lệnh đề nghị — NGƯỜI gõ, script không tự làm\n\n```bash\n'
  printf 'git tag -a v%s -m "phát hành %s"\n' "$VER" "$VER"
  printf 'git push origin v%s        # chỉ khi người quyết gật\n```\n' "$VER"
} > "$HS"
printf '📄 Hồ sơ: %s\n' "$HS"
printf '⛔ Script DỪNG ở đây. Tag và push do người gõ.\n'
