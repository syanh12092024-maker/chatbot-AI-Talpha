#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU GSP1 — «SẢN PHẨM GỐC CHỈ SINH TỪ GỘP MÓN POS THEO SKU» (CR-02-10b mục 1).
# Chạy: ops/bin/nghiem-thu/gsp1.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — Postgres hộp cát (db/sandbox.js) + máy chủ vai-b + kho gốc THẬT + trang Sản phẩm thật (vm).
# Không đo prod. Đảo-vá: mỗi lượt là MỘT TIẾN TRÌNH node mới; tệp bị đột biến luôn được khôi phục (trap).
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$@" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
HTML=v3/src/ui/san-pham/trang/san-pham.html
ROUTER=v3/src/ui/san-pham/router.js
TEST=v3/test/b/gsp1-san-pham-goc-chi-tu-gop.test.mjs

# ① phép 1 — trang KHÔNG còn dấu của lối tạo theo số hiệu (đọc tệp trang)
sai=""
for mau in 'id="khungTaoGoc"' 'id="nutTaoGoc"' 'số hiệu chưa có' 'function veThem' "goiGhi('/api/san-pham/goc', { method: 'POST'"; do
  grep -qF -- "$mau" "$HTML" && sai="$sai [$mau]"
done
[ -z "$sai" ]; ket "①trang-hết-lối-số-hiệu" $? "${sai:-0/5 dấu còn lại}"

# ② phép 2 — `#nutThem` gắn `veGop` (tĩnh) + ca bấm thật nằm trong bộ ca ③
grep -qF "\$('#nutThem').onclick = () => veGop()" "$HTML"; ket "②nutThem→veGop(tĩnh)" $? "$HTML"

# ③ phép 2–4 bằng ca chạy thật (404 + đếm trước=sau · sửa SKU 200 · GET/POST gộp · bấm «+ Thêm»)
out=$(chay "$TEST"); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -ne 0 ] && echo "$out" | grep -E "^✖ " | sort -u | head -5 | sed 's/^/   ↳ /'
[ "$f" -eq 0 ] && [ "$p" -ge 5 ]; ket "③ca-chạy-thật" $? "$TEST pass=$p fail=$f (đòi ≥5)"

# ④ đảo-vá (phép 5): mỗi đột biến PHẢI làm đúng ca tương ứng đỏ; khôi phục xong phải xanh lại
cp "$ROUTER" "$ROUTER.gsp1bak"; cp "$HTML" "$HTML.gsp1bak"
khoiphuc() { mv -f "$ROUTER.gsp1bak" "$ROUTER" 2>/dev/null; mv -f "$HTML.gsp1bak" "$HTML" 2>/dev/null; }
trap khoiphuc EXIT INT TERM
python3 - "$ROUTER" <<'PY'
import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
m="  r.post('/api/san-pham/goc/:id', canDangNhap"
assert s.count(m)==1
s=s.replace(m,"  r.post('/api/san-pham/goc', canDangNhap, canVai, boc(async (req, res) => {\n    res.json({ ok: true, goc: await spGocTao(req) });\n  }));\n"+m)
open(p,'w',encoding='utf-8').write(s)
PY
# lối cũ khôi phục: một route trả 200 (không cần thân thật — ca đo mã 404 và số dòng)
sed -i.tmp "s/await spGocTao(req)/{}/" "$ROUTER"; rm -f "$ROUTER.tmp"
o1=$(chay "$TEST"); f1=$(so "$o1" fail); f1=${f1:-0}
echo "$o1" | grep -q "^✖ G1" ; r1=$?
[ "$r1" -eq 0 ] && [ "$f1" -ge 1 ]; ket "④a-đảo-vá-khôi-phục-route-POST ⇒ G1 đỏ" $? "fail=$f1"
mv -f "$ROUTER.gsp1bak" "$ROUTER"; cp "$ROUTER" "$ROUTER.gsp1bak"
printf '\nfunction veThem() { return 1; }\n' >> "$HTML"
python3 - "$HTML" <<'PY'
import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
i=s.rindex('function veThem() { return 1; }'); s=s[:i]+s[i:]
open(p,'w',encoding='utf-8').write(s)
PY
o2=$(chay "$TEST"); f2=$(so "$o2" fail); f2=${f2:-0}
echo "$o2" | grep -q "^✖ G4"; r2=$?
[ "$r2" -eq 0 ] && [ "$f2" -ge 1 ]; ket "④b-đảo-vá-khôi-phục-veThem ⇒ G4 đỏ" $? "fail=$f2"
khoiphuc; trap - EXIT INT TERM
git diff --quiet -- "$ROUTER" "$HTML" 2>/dev/null; true
o3=$(chay "$TEST"); f3=$(so "$o3" fail); f3=${f3:-1}
[ "$f3" -eq 0 ]; ket "④c-sau-khôi-phục-xanh-lại" $? "fail=$f3"

# ⑤ không còn tệp .gsp1bak lạc
[ -z "$(ls v3/src/ui/san-pham/*.gsp1bak v3/src/ui/san-pham/trang/*.gsp1bak 2>/dev/null)" ]; ket "⑤không-để-lại-bản-sao" $? ""

# ⑥ cổng cũ cùng màn (rc đo TÁCH DÒNG — không gộp vào một biểu thức)
for g in ll13 ve1 ve8a ve8b ll15d; do
  _o=$(bash "ops/bin/nghiem-thu/$g.sh" 2>&1)
  _r=$?
  [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | head -5 | sed 's/^/   ↳ /'
  ket "⑥cổng-cũ-$g" $_r "rc=$_r"
done

# ⑧ bộ ca canh phạm vi LL15d (chạy RIÊNG)
for t in test/ll15d-marketer-san-pham.test.mjs v3/test/b/ll15d-marketer-man.test.mjs; do
  o=$(chay "$t"); pp=$(so "$o" pass); ff=$(so "$o" fail); pp=${pp:-0}; ff=${ff:-1}
  [ "$ff" -eq 0 ] && [ "$pp" -ge 4 ]; ket "⑧LL15d-phạm-vi" $? "$t pass=$pp fail=$ff"
done
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
