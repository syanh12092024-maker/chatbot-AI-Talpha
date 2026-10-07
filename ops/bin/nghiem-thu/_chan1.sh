#!/usr/bin/env bash
# Chặng 1 nghiệm thu phiếu — 8 phép MÁY, không tốn lượt model.
# Dùng: ops/bin/nghiem-thu/_chan1.sh <mã-phiếu-thường: l0-m1>
# Đọc phiếu docs/thi-cong/phieu/PHIEU-<MÃ-HOA>.md, đo diff base..HEAD.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 2

ma="${1:?thiếu mã phiếu, vd: l0-m1}"
MA=$(echo "$ma" | tr '[:lower:]' '[:upper:]')
phieu="docs/thi-cong/phieu/PHIEU-${MA}.md"
do=0; xanh=0

ket() { # ket <tên phép> <rc> <chi tiết>
  if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 $3"
  else do=$((do+1)); echo "🔴 $1 $3"; fi
}

# ① phiếu tồn tại + có dòng Base
[ -f "$phieu" ]; ket "①phiếu-tồn-tại" $? "$phieu"
base=$(grep -oE '\*\*Base:\*\* `[0-9a-f]+`' "$phieu" | grep -oE '[0-9a-f]{7,40}' | head -1)
[ -n "${base:-}" ]; ket "②có-Base" $? "base=${base:-THIẾU}"
[ -z "${base:-}" ] && { echo "== ĐỎ $do / XANH $xanh — thiếu Base, dừng"; exit 1; }

# ③ diff thật base..HEAD
danh_sach=$(git diff --name-only "$base"..HEAD)
echo "— file đổi ($(echo "$danh_sach" | grep -c .)):"; echo "$danh_sach" | sed 's/^/    /'

# ④ pathspec ⊆ mục ③ của phiếu (đọc khối ``` sau tiêu đề ③, so prefix; §10 sổ luôn được phép)
hop_le=$(awk '/^## ③/,/^## ④/' "$phieu" | sed -n '/^```$/,/^```$/p' | grep -v '^```' | grep -v '^[[:space:]]*$' | sed 's/[[:space:]]*←.*//;s/[[:space:]]*$//')
ngoai=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  ok=0
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    case "$f" in
      $p|${p%/}/*) ok=1; break;;
    esac
    # pathspec dạng glob (test/l0-m1-*.test.js)
    case "$f" in $p) ok=1; break;; esac
  done <<< "$hop_le"
  [ "$f" = "docs/thi-cong/SO-DIEU-HANH-THI-CONG.md" ] && ok=1
  # đất điều hành: phiếu (tổng soạn) + nhật ký (thợ append) — không tính vào pathspec code
  case "$f" in docs/thi-cong/phieu/*|docs/thi-cong/nhat-ky/*) ok=1;; esac
  [ $ok -eq 0 ] && ngoai="$ngoai$f"$'\n'
done <<< "$danh_sach"
[ -z "$ngoai" ]; ket "④pathspec-⊆-③" $? "${ngoai:+NGOÀI PHẠM VI: }$(echo "$ngoai" | tr '\n' ' ')"

# ⑤ bộ não phải khai — LUẬT sổ §0a luật 4, bản «SỬA 02/10 — CR-02-10» (GL7a 07/10):
#    · file phẳng `src/*.js` DÙNG CHUNG với v3 (`pancake` `kb` `config` `ai-log`…) sửa được như
#      code v3 thường ⇒ phép này KHÔNG canh chúng nữa (trước GL7a: mọi file phẳng đều đỏ — đỏ giả
#      cho `src/pancake.js` ở GL3 · GL3b — nhật ký GL3 dòng 172 · `_chan1 gl3b` đo 07/10 — người quen bỏ qua dòng đỏ);
#    · chỉ tệp BỘ NÃO (NAO dưới — danh sách giữ nguyên từ BH1 16/09) phải nằm trên mặt phiếu bằng dòng
#      cột 0 `**Đụng bộ não:** <danh sách tệp> — <lý do một câu>` (ba rào 16/09 giữ nguyên).
#    · dòng khai mở đầu bằng «không» (vd `**Đụng bộ não:** không.`) hoặc để trống = CHƯA khai.
#      Trước GL7a, `grep -c` đếm cả dòng «không» là đã khai — lỗ: phiếu nói «không» vẫn sửa được não.
#    · dời/xoá tệp não cũng là đụng: danh sách lấy `--no-renames` để thấy cả đường CŨ của tệp bị dời.
#    Mục đích của rào không phải chặn việc sửa, mà là chặn việc sửa LẶNG LẼ: phiếu là thứ người
#    quyết đọc, nên cái gì chạm cách bot nói phải nằm trên mặt phiếu.
#    Biên đã biết: phép KHÔNG đối chiếu tên tệp trong dòng khai với tệp bị chạm (khai `tools.js`
#    mà sửa `prompts.js` vẫn qua) — phiếu GL7a ②1 chỉ đòi «có khai»; xem nhật ký GL7a.
NAO='src/prompts.js src/closer.js src/tools.js src/fast-lane.js src/outbound-guard.js src/context.js src/lead-score.js'
dong_khai=$(grep '^\*\*Đụng bộ não:\*\*' "$phieu" | sed 's/^\*\*Đụng bộ não:\*\*//; s/^[[:space:]*_]*//')
khai_nao=$(printf '%s\n' "$dong_khai" | grep -cvE '^$|^([Kk]hông|KHÔNG|[Kk]hong|KHONG)')
cam=""; qua=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  la_nao=0
  for n in $NAO; do [ "$f" = "$n" ] && la_nao=1 && break; done
  [ $la_nao -eq 1 ] || continue               # tệp phẳng dùng chung · thư mục con · ngoài src/ = qua
  if [ "$khai_nao" -ge 1 ]; then qua="$qua$f "; else cam="$cam$f "; fi
done <<< "$(git diff --name-only --no-renames "$base"..HEAD)"
[ -z "$cam" ]; ket "⑤bộ-não-phải-khai" $? "${cam:+ĐỤNG BỘ NÃO mà phiếu chưa khai (cần dòng \`**Đụng bộ não:** <tệp> — <lý do>\`; dòng «không» hoặc trống không tính): }$cam${qua:+(chạm bộ não ĐÃ khai: $qua)}"

# ⑥ hết marker NEEDS CLARIFICATION trong diff (loại chính file phiếu — khuôn phiếu có chữ đó)
# grep -c trả rc=1 khi đếm ra 0 — KHÔNG nối `|| echo 0` (ra hai dòng "0\n0", vỡ phép cộng)
m1=$(git diff "$base"..HEAD -- . ":(exclude)docs/thi-cong/phieu" | grep -c '\[NEEDS CLARIFICATION'); m1=${m1:-0}
m2=$(grep -c '\[NEEDS CLARIFICATION' "docs/thi-cong/nhat-ky/phieu-${ma}.md" 2>/dev/null); m2=${m2:-0}
tong_marker=$((m1 + m2))
[ "$tong_marker" -eq 0 ]; ket "⑥hết-marker" $? "đếm=$tong_marker"

# ⑦ script nghiệm thu phiếu tồn tại + chạy rc=0
ns="ops/bin/nghiem-thu/${ma}.sh"
if [ -f "$ns" ]; then
  bash "$ns" > /tmp/chan1-ns-$$.log 2>&1
  rc=$?
  ket "⑦script-nghiệm-thu" $rc "$ns rc=$rc (log /tmp/chan1-ns-$$.log, đuôi:)"
  tail -5 /tmp/chan1-ns-$$.log | sed 's/^/    /'
else
  ket "⑦script-nghiệm-thu" 1 "$ns KHÔNG TỒN TẠI"
fi

# ⑧ nhật ký phiếu tồn tại + §10 sổ có dòng của phiếu
[ -f "docs/thi-cong/nhat-ky/phieu-${ma}.md" ]; ket "⑧a-nhật-ký" $? "docs/thi-cong/nhat-ky/phieu-${ma}.md"
grep -q "$MA" <(awk '/^## §10/,0' docs/thi-cong/SO-DIEU-HANH-THI-CONG.md); ket "⑧b-§10-sổ" $? ""

echo "== ĐỎ $do / XANH $xanh"
[ $do -eq 0 ]
