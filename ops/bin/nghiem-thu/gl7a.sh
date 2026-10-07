#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU GL7a — thi hành đúng 7 phép của ④ trong docs/thi-cong/phieu/PHIEU-GL7A.md
# Phép ⑤ của `_chan1.sh` theo luật file phẳng sau CR-02-10: chỉ tệp bộ não phải khai; dòng «Đụng bộ não: không.» không tính.
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT TRẠNG THÁI đọc từ dòng ⑤ thật. Không dòng nào chỉ nói "chạy xong không lỗi".
#
# CÁCH ĐO: ④1–5 mỗi cảnh một repo git TẠM trong thư mục tạm (base → phiếu + sửa tệp → commit) rồi chạy `_chan1.sh` với
# cwd = repo tạm — script tự `cd $(git rev-parse --show-toplevel)` nên KHÔNG đọc/ghi repo thật. ④6 đảo-vá trên BẢN SAO
# tạm của `_chan1.sh` (bản base `aef9fb6` + 4 đột biến), đo cả cảnh của cổng lẫn bộ ca `test/gl7a-*.test.mjs`.
# ④7 chạy `_chan1.sh gl3b` trên LỊCH SỬ THẬT của repo, đóng băng ở mốc `aef9fb6` (base phiếu GL7a — lúc GL3b đỏ ⑤ cho
# `src/pancake.js`): bản clone `--shared --no-checkout` chỉ đọc kho đối tượng, chỉ lấy 3 tệp điều hành ra cây tạm ⇒
# ⑦ của _chan1 thấy «gl3b.sh KHÔNG TỒN TẠI» ngay (không chạy lại gl3b.sh ~2′, không chạm Postgres).
# Vì sao không chạy trên HEAD: diff `08ff546..HEAD` trôi theo mọi commit sau GL3b — một phiếu sau khai não hợp lệ sẽ làm
# phiếu GL3B («không.») đỏ ⑤ ĐÚNG luật, và cổng này đỏ theo lịch chứ không theo mã (viet-thuoc luật 4).
#
# Dùng: bash ops/bin/nghiem-thu/gl7a.sh            · GIU_SANDBOX=1 giữ thư mục tạm để soi tay
#       GL7A_CHAN1=<đường tuyệt đối> đo một bản _chan1 khác (đảo-vá tay) thay cho tệp của cây.
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2

CHAN1="${GL7A_CHAN1:-$GOC/ops/bin/nghiem-thu/_chan1.sh}"
MOC=aef9fb6                                   # base phiếu GL7a — bản _chan1 CŨ + trạng thái GL3b đỏ ⑤
SAN_CA=18                                     # thước SÀN bộ ca (9 ca × 2 locale lúc viết) — thêm ca không đỏ cổng
TAM=$(mktemp -d "${TMPDIR:-/tmp}/gl7a-nt-XXXXXX")
if [ "${GIU_SANDBOX:-}" = "1" ]; then echo "GIU_SANDBOX=1 — giữ $TAM"; else trap 'rm -rf "$TAM"' EXIT; fi

export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null
export GIT_AUTHOR_NAME=gl7a GIT_AUTHOR_EMAIL=gl7a@nt.invalid GIT_COMMITTER_NAME=gl7a GIT_COMMITTER_EMAIL=gl7a@nt.invalid

LOI=0; PHEP=0
muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-62s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP+1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP+1)); LOI=$((LOI+1)); printf '   ✘ %s\n' "$1"; }
bang() {                       # bang <tên> <thật> <chờ>
  so "$1" "$2"
  case "$2" in *HONG-THUOC*) truot "$1: câu đo HỎNG — không đọc là đạt"; return;; esac
  [ "$2" = "$3" ] && dat "$1 = $3" || truot "$1: thật=$2 · chờ=$3"
}
san() {                        # san <tên> <thật> <sàn>  — thật ≥ sàn
  so "$1" "$2"
  case "$2" in ''|*[!0-9]*) truot "$1: câu đo HỎNG (không ra số)"; return;; esac
  [ "$2" -ge "$3" ] && dat "$1 ≥ $3" || truot "$1: thật=$2 · sàn=$3"
}

g() { git -c commit.gpgsign=false -c core.hooksPath=/dev/null "$@"; }

# dung_repo <thư-mục> <dòng-khai | -> <tệp sửa…>   ('-' = phiếu KHÔNG có dòng khai)
dung_repo() {
  local d="$1" khai="$2"; shift 2
  mkdir -p "$d" || return 1
  g -C "$d" init -q || return 1
  local f
  for f in src/prompts.js src/closer.js src/tools.js src/fast-lane.js src/outbound-guard.js src/context.js src/lead-score.js \
           src/pancake.js src/kb.js src/queue/viec.js v3/src/b.js; do
    mkdir -p "$d/$(dirname "$f")"; printf '// %s — base\n' "$f" > "$d/$f"
  done
  mkdir -p "$d/docs/thi-cong/phieu"
  printf '# sổ tạm\n\n## §10\n- CA\n' > "$d/docs/thi-cong/SO-DIEU-HANH-THI-CONG.md"
  g -C "$d" add -A && g -C "$d" commit -q -m base || return 1
  local base; base=$(g -C "$d" rev-parse --short=12 HEAD)
  {
    printf '# PHIẾU CA — cảnh tạm của cổng GL7a\n\n**Base:** `%s` · **Làn:** 🟩\n' "$base"
    [ "$khai" != "-" ] && printf '%s\n' "$khai"
    printf '\n## ③ File được đụng\n\n```\n'; printf '%s\n' "$@"; printf '```\n\n## ④ Nghiệm thu\n'
  } > "$d/docs/thi-cong/phieu/PHIEU-CA.md"
  for f in "$@"; do printf '// sửa sau base\n' >> "$d/$f"; done
  g -C "$d" add -A && g -C "$d" commit -q -m 'phiếu + sửa' || return 1
}
# doc5 <bản _chan1> <thư-mục repo> <mã> [locale] — in dòng ⑤ (hoặc HONG-THUOC nếu không có dòng ⑤)
doc5() {
  local dong
  dong=$(cd "$2" && LC_ALL="${4:-${LC_ALL:-}}" bash "$1" "$3" 2>&1 | grep -E '^(✅|🔴) ⑤' | head -1)
  [ -n "$dong" ] && printf '%s\n' "$dong" || printf 'HONG-THUOC (không có dòng ⑤)\n'
}
tt() { printf '%s' "${1%% *}"; }                                  # trạng thái = ký hiệu đầu dòng
dem() { printf '%s' "$1" | grep -oF "$2" | wc -l | tr -d ' '; }   # số lần tên tệp xuất hiện trong dòng ⑤

muc "cây đo (viet-thuoc luật 7)"
so "gốc repo" "$GOC"
so "_chan1 được đo" "$CHAN1"
so "HEAD cây" "$(git -C "$GOC" rev-parse --short HEAD)"
so "CSDL" "không dùng (cổng chỉ đo git + bash)"
so "thư mục tạm" "$TAM"

# ── dựng năm cảnh ④1–5 (dùng chung cho bản thật và bản đột biến)
dung_repo "$TAM/r1" '**Đụng bộ não:** không.' src/pancake.js                       || { echo "dựng r1 hỏng"; exit 2; }
dung_repo "$TAM/r2" '**Đụng bộ não:** không.' src/prompts.js                       || { echo "dựng r2 hỏng"; exit 2; }
dung_repo "$TAM/r3" '**Đụng bộ não:** CÓ — src/prompts.js — đổi câu chào cho ngắn.' src/prompts.js || { echo "dựng r3 hỏng"; exit 2; }
dung_repo "$TAM/r4" '-' src/prompts.js                                              || { echo "dựng r4 hỏng"; exit 2; }
dung_repo "$TAM/r5" '-' src/queue/viec.js v3/src/b.js                               || { echo "dựng r5 hỏng"; exit 2; }

muc "④1 chạm src/pancake.js · phiếu khai «không.» ⇒ ⑤ XANH"
d=$(doc5 "$CHAN1" "$TAM/r1" ca); so "dòng ⑤" "$d"
bang "④1 trạng thái ⑤" "$(tt "$d")" "✅"

muc "④2 chạm src/prompts.js · phiếu khai «không.» ⇒ ⑤ ĐỎ nêu tên tệp (hai locale)"
for loc in C en_US.UTF-8; do
  d=$(doc5 "$CHAN1" "$TAM/r2" ca "$loc"); so "dòng ⑤ [$loc]" "$d"
  bang "④2 [$loc] trạng thái ⑤" "$(tt "$d")" "🔴"
  bang "④2 [$loc] số lần nêu src/prompts.js" "$(dem "$d" src/prompts.js)" "1"
done

muc "④3 chạm src/prompts.js · phiếu khai «CÓ — src/prompts.js …» ⇒ ⑤ XANH"
d=$(doc5 "$CHAN1" "$TAM/r3" ca); so "dòng ⑤" "$d"
bang "④3 trạng thái ⑤" "$(tt "$d")" "✅"

muc "④4 chạm src/prompts.js · phiếu KHÔNG có dòng khai ⇒ ⑤ ĐỎ nêu tên tệp"
d=$(doc5 "$CHAN1" "$TAM/r4" ca); so "dòng ⑤" "$d"
bang "④4 trạng thái ⑤" "$(tt "$d")" "🔴"
bang "④4 số lần nêu src/prompts.js" "$(dem "$d" src/prompts.js)" "1"

muc "④5 chỉ chạm src/queue/*.js + v3/… ⇒ ⑤ XANH"
d=$(doc5 "$CHAN1" "$TAM/r5" ca); so "dòng ⑤" "$d"
bang "④5 trạng thái ⑤" "$(tt "$d")" "✅"

muc "④6 đảo-vá trên bản sao tạm của _chan1 (mỗi lượt bộ ca = một tiến trình node mới)"
chay_ca() {   # chay_ca <bản _chan1> — in "pass fail" của bộ ca test/gl7a-*.test.mjs
  local log="$TAM/ca-$(basename "$1").log"
  GL7A_CHAN1="$1" node --import ./test/_an-toan.mjs --test test/gl7a-*.test.mjs > "$log" 2>&1
  printf '%s %s' "$(grep -E '^ℹ pass ' "$log" | awk '{print $3}')" "$(grep -E '^ℹ fail ' "$log" | awk '{print $3}')"
}
read -r p f <<< "$(chay_ca "$CHAN1")"
san "④6·0 bộ ca trên bản của cây: pass" "${p:-HONG}" "$SAN_CA"
bang "④6·0 bộ ca trên bản của cây: fail" "${f:-HONG-THUOC}" "0"

git -C "$GOC" show "$MOC:ops/bin/nghiem-thu/_chan1.sh" > "$TAM/m1-ban-cu.sh" 2>/dev/null
MUT_KHONG='khai_nao=$(grep -c '"'"'^\*\*Đụng bộ não:\*\*'"'"' "$phieu")'
MUT="$MUT_KHONG" awk '/^khai_nao=/{print ENVIRON["MUT"]; next} {print}' "$CHAN1" > "$TAM/m2-khong-la-khai.sh"
MUT='khai_nao=0'  awk '/^khai_nao=/{print ENVIRON["MUT"]; next} {print}' "$CHAN1" > "$TAM/m3-khai-hang-0.sh"
sed 's/"\$khai_nao" -ge 1/"$khai_nao" -lt 1/' "$CHAN1" > "$TAM/m4-dao-dau.sh"
sed 's/ --no-renames//' "$CHAN1" > "$TAM/m5-bo-no-renames.sh"
for m in m1-ban-cu m2-khong-la-khai m3-khai-hang-0 m4-dao-dau m5-bo-no-renames; do
  if [ ! -s "$TAM/$m.sh" ] || cmp -s "$TAM/$m.sh" "$CHAN1"; then
    so "$m" "HONG-THUOC (đột biến không áp được — bản sao trống hoặc trùng bản thật)"; truot "④6 $m: đột biến không áp được"; continue
  fi
  read -r p f <<< "$(chay_ca "$TAM/$m.sh")"
  san "④6 $m: bộ ca fail (phải ≥1 = ĐỎ)" "${f:-HONG}" 1
done
d=$(doc5 "$TAM/m1-ban-cu.sh" "$TAM/r1" ca); so "m1 bản cũ · cảnh ④1 · dòng ⑤" "$d"
bang "④6 m1 bản cũ ⇒ phép ④1 ĐỎ" "$(tt "$d")" "🔴"
d=$(doc5 "$TAM/m2-khong-la-khai.sh" "$TAM/r2" ca); so "m2 «không» là khai · cảnh ④2 · dòng ⑤" "$d"
bang "④6 m2 «không» tính là khai ⇒ phép ④2 lật XANH (= ĐỎ phép)" "$(tt "$d")" "✅"

muc "④7 _chan1.sh gl3b trên lịch sử thật, mốc $MOC (clone --shared chỉ đọc) ⇒ ⑤ XANH; bản cũ ⇒ ⑤ ĐỎ src/pancake.js"
C7="$TAM/goc-$MOC"
if g clone -q --shared --no-checkout "$GOC" "$C7" 2>/dev/null \
   && g -C "$C7" reset -q --soft "$MOC" \
   && g -C "$C7" checkout -q "$MOC" -- docs/thi-cong/phieu/PHIEU-GL3B.md docs/thi-cong/nhat-ky/phieu-gl3b.md docs/thi-cong/SO-DIEU-HANH-THI-CONG.md; then
  so "HEAD clone" "$(g -C "$C7" rev-parse --short HEAD)"
  d=$(doc5 "$CHAN1" "$C7" gl3b); so "bản của cây · dòng ⑤" "$d"
  bang "④7 _chan1 gl3b @ $MOC — bản của cây: trạng thái ⑤" "$(tt "$d")" "✅"
  bang "④7 bản của cây: số lần nêu src/pancake.js" "$(dem "$d" src/pancake.js)" "0"
  d=$(doc5 "$TAM/m1-ban-cu.sh" "$C7" gl3b); so "bản cũ $MOC · dòng ⑤" "$d"
  bang "④7 _chan1 gl3b @ $MOC — bản cũ: trạng thái ⑤ (trước sửa)" "$(tt "$d")" "🔴"
  bang "④7 bản cũ: số lần nêu src/pancake.js" "$(dem "$d" src/pancake.js)" "1"
else
  so "clone mốc $MOC" "HONG-THUOC"; truot "④7 không dựng được bản clone mốc $MOC"
fi

printf '\nPHÉP=%s LỖI=%s\n' "$PHEP" "$LOI"
[ "$LOI" -eq 0 ] && echo "== ĐẠT (GL7a, máy dev, repo tạm + clone chỉ-đọc)" || echo "== ĐỎ (GL7a, máy dev)"
exit $((LOI>0))
