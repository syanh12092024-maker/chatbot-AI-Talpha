#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU GL1 — preflight thôi luôn thoát lỗi (trả nợ N-PREFLIGHT-MISSINGPAGES). rc=0 là đạt.
# Tầm đo: lưới HỒI QUY (luật 32) — CLI thật `node deploy/preflight.mjs` trên Postgres HỘP CÁT `aicloser_v3_test_gl1_*_p<pid>`
# (tự dựng/dọn qua db/sandbox.js); đảo-vá trên BẢN SAO TẠM, mỗi đột biến là một tiến trình node mới. Không đo prod. Chỉ `grep -E`.
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$@" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
DB="aicloser_v3_nt_gl1_p$$"   # khai theo phiếu; ca tự dựng hộp cát riêng (db/sandbox.js, hậu tố _p<pid>) nên không dùng tên này để ghi
if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát"; exit 2; }
noi=$(node -e 'const u=new URL(process.env.DATABASE_URL_V3);console.log(`${u.hostname}:${u.port||5432}`)' 2>/dev/null || echo "?")
echo "── môi trường: máy dev · hộp cát Postgres trên $noi · cây $GOC"
CA=test/gl1-preflight-cli-that.test.mjs

# ①④1 bốn ca CLI thật
out=$(chay "$CA"); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -ne 0 ] && echo "$out" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
[ "$f" -eq 0 ] && [ "$p" -eq 4 ]; ket "①bốn-ca-CLI-thật" $? "pass=$p fail=$f (đòi 4/0)"
th=0; for t in '(a)' '(b)' '(c)' '(d)'; do echo "$out" | grep -qF -- "✔ GL1 $t" && th=$((th+1)); done
[ "$th" -eq 4 ]; ket "①b-đủ-(a)-(d)-xanh" $? "$th/4"

# ② đảo-vá trên bản sao tạm
T=$(mktemp -d "${TMPDIR:-/tmp}/gl1.XXXXXX"); [ "${GIU_TAM:-0}" = 1 ] || trap 'rm -rf "$T"' EXIT
mkdir -p "$T/deploy" "$T/test" "$T/db"
cp -R db/. "$T/db/"; cp deploy/preflight.mjs "$T/deploy/"; cp "$CA" "$T/test/"; cp package.json "$T/"
ln -s "$GOC/node_modules" "$T/node_modules"; [ -f .env ] && cp .env "$T/.env"
dot() { (cd "$T" && node --env-file-if-exists=.env --test "test/gl1-preflight-cli-that.test.mjs" 2>&1); }
nho() { echo "$1" | grep -E "^\s*✖ GL1 \(" | sed -E 's/^\s*✖ GL1 (\([a-d]\)).*/\1/' | sort -u | tr '\n' ' '; }
cp deploy/preflight.mjs "$T/deploy/preflight.mjs"
python3 - "$T/deploy/preflight.mjs" <<'PY'
import sys; p=sys.argv[1]; s=open(p).read()
a='if (process.argv.includes("--ready") && db.pending.length)'
assert a in s
open(p,'w').write(s.replace(a,'if (db.missingPages.length || (process.argv.includes("--ready") && db.pending.length))'))
PY
o1=$(dot); r1=$(nho "$o1")
# (b) đỏ theo vì vế phụ «không --ready thì exit 0» cũng chết khi preflight nổ TypeError — đòi (a) đỏ, (c)(d) vẫn xanh
echo "$r1" | grep -qF '(a)' && ! echo "$r1" | grep -qE '\((c|d)\)'; ket "②a-đảo-khôi-phục-missingPages-⇒-(a)-đỏ" $? "đỏ: ${r1:-không}"
cp deploy/preflight.mjs "$T/deploy/preflight.mjs"
python3 - "$T/deploy/preflight.mjs" <<'PY'
import sys; p=sys.argv[1]; s=open(p).read()
a='process.argv.includes("--ready") && db.pending.length'
assert a in s
open(p,'w').write(s.replace(a,'false'))
PY
o2=$(dot); r2=$(nho "$o2")
[ "$r2" = "(b) " ]; ket "②b-đảo-bỏ-vế---ready-⇒-chỉ-(b)-đỏ" $? "đỏ: ${r2:-không}"
cp deploy/preflight.mjs "$T/deploy/preflight.mjs"; o3=$(dot); f3=$(so "$o3" fail)
[ "${f3:-1}" -eq 0 ]; ket "②c-bản-sao-nguyên-vẹn-xanh" $? "fail=${f3:-?}"

# ③ bộ ca cũ + không còn missingPages
out=$(chay test/deploy-v3.test.mjs); f=$(so "$out" fail); p=$(so "$out" pass)
[ "${f:-1}" -eq 0 ] && [ "${p:-0}" -ge 1 ]; ket "③deploy-v3-cũ-xanh" $? "pass=${p:-?} fail=${f:-?}"
n=$(grep -cE 'missingPages' deploy/preflight.mjs | head -1); n2=$(grep -E 'missingPages' deploy/preflight.mjs | grep -vcE '^\s*//')
[ "$n2" -eq 0 ]; ket "③b-không-còn-đọc-missingPages-ở-mã" $? "dòng mã=$n2 (chú thích=$((n-n2)))"
[ "${CHAY_NPM_TEST:-0}" = 1 ] && { o=$(npm test 2>&1); ket "④npm-test" $([ "$(so "$o" fail)" = 0 ]; echo $?) "pass=$(so "$o" pass) fail=$(so "$o" fail)"; } || echo "⏸ ④npm-test hoãn (CHAY_NPM_TEST=1; luật 6)"
echo "== ĐỎ $do / XANH $xanh"; [ "$do" -eq 0 ]
