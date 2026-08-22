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

# ⑤ không đụng vùng cấm: file phẳng ngay dưới src/ (bản đang chạy) + 5 file não
cam=$(echo "$danh_sach" | grep -E '^src/[^/]+\.js$')
[ -z "$cam" ]; ket "⑤vùng-cấm-src-phẳng" $? "${cam:+ĐỤNG: }$(echo "$cam" | tr '\n' ' ')"

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
