#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU GL3 — hạn chờ cho mọi lượt gọi Pancake + gửi lỗi mạng KHÔNG gửi lại bằng token khác. rc=0 là đạt.
# Thi hành mục ④ của docs/thi-cong/phieu/PHIEU-GL3.md. KHÔNG gọi mạng thật: fetch GIẢ trong mọi ca (host ≠ pages.fm ⇒ ném).
# Tầm đo: lưới HỒI QUY (luật 32) cho `src/pancake.js` trên máy dev; ca đầu-cuối chạy worker thật trên Postgres HỘP CÁT
# `aicloser_v3_test_gl3_p<pid>` (tự dựng/dọn qua db/sandbox.js). Đảo-vá trên BẢN SAO TẠM của cây (src · db · v3/src), mỗi
# đột biến một tiến trình node mới (bẫy 15). Không sửa `.env` — ca đầu-cuối mở van trong phạm vi tiến trình ca. Chỉ `grep -E`.
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$@" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+' | head -1; }
do_ten() { echo "$1" | grep -E "^\s*✖ GL3 [A-Za-z0-9]+ ·" | sed -E 's/^\s*✖ GL3 ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
xanh_ten() { echo "$1" | grep -E "^\s*✔ GL3 [A-Za-z0-9]+ ·" | sed -E 's/^\s*✔ GL3 ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
DB="aicloser_v3_nt_gl3_p$$"   # khai theo khuôn; ca tự dựng hộp cát riêng (db/sandbox.js, hậu tố _p<pid>) — không ghi vào tên này
if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát"; exit 2; }
noi=$(node -e 'const u=new URL(process.env.DATABASE_URL_V3);console.log(`${u.hostname}:${u.port||5432}`)' 2>/dev/null || echo "?")
echo "── môi trường: máy dev · hộp cát Postgres trên $noi · cây $GOC"
CA1=test/gl3-han-cho-pancake.test.mjs
CA2=test/gl3-dau-cuoi-worker.test.mjs
F=src/pancake.js

# ⓪ luật 1 §0a: máy này vẫn CHỈ ĐỌC (ca mở van trong tiến trình ca, không đụng .env)
ro=$(grep -E '^PANCAKE_READONLY=' .env 2>/dev/null | tail -1 | cut -d= -f2)
[ "$ro" = "1" ]; ket "⓪.env-PANCAKE_READONLY=1" $? "đọc được: '${ro:-vắng}'"

# ① bộ ca GL3 — đơn vị (fetch giả, ≥2 token, đồng hồ giả + thật)
o1=$(chay "$CA1"); p=$(so "$o1" pass); f=$(so "$o1" fail); p=${p:-0}; f=${f:-1}
[ "$f" -ne 0 ] && echo "$o1" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
[ "$f" -eq 0 ] && [ "$p" -ge 18 ]; ket "①bộ-ca-đơn-vị" $? "pass=$p fail=$f (đòi fail=0, pass≥18)"
can="M1 M2 M3 M4 R0 R1 R1b R2 R2b R3 R4 R5 R6 R7b R7c R7d R7e R7f"; co=$(xanh_ten "$o1"); thieu=""
for t in $can; do echo " $co " | grep -qF " $t " || thieu="$thieu$t "; done
[ -z "$thieu" ]; ket "①b-đủ-phép-④0–6·7b–7d-+-sau-review-xanh" $? "${thieu:+THIẾU: $thieu}$(echo "$can" | wc -w | tr -d ' ') phép"
echo "$o1" | grep -E "^\s*\[gl3\] (R1|R2|R6|R7c) " | sed 's/^ */   · /'

# ② bộ ca GL3 — đầu-cuối worker thật (④7)
o2=$(chay "$CA2"); p=$(so "$o2" pass); f=$(so "$o2" fail); p=${p:-0}; f=${f:-1}
[ "$f" -ne 0 ] && echo "$o2" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
co=$(xanh_ten "$o2")
thieu=""; for t in E0 E1 E2 E3; do echo " $co " | grep -qF " $t " || thieu="$thieu$t "; done
[ "$f" -eq 0 ] && [ "$p" -ge 4 ] && [ -z "$thieu" ]
ket "②đầu-cuối-worker" $? "pass=$p fail=$f · xanh: $co(đòi E0 E1 E2 E3)${thieu:+ THIẾU: $thieu}"
echo "$o2" | grep -E "^\s*\[gl3\] E[0-3] " | sed 's/^ */   · /'

# ③ đọc mã (phụ — hành vi đã đo ở ①②): mọi fetch của tệp đi qua MỘT cửa có hạn; biến khai cùng commit
n_fetch=$(grep -vE '^\s*//' "$F" | grep -cE '(^|[^.A-Za-z_])fetch\(')
n_goi=$(grep -vE '^\s*//' "$F" | grep -cE 'goiPancake\(')
[ "$n_fetch" -eq 1 ] && [ "$n_goi" -eq 6 ]; ket "③fetch-chỉ-trong-goiPancake" $? "fetch( mã=$n_fetch (đòi 1) · goiPancake( =$n_goi (đòi 6: khai + pkFetchPage + 4 trần)"
n_doc=$(grep -cE '`V3_PANCAKE_HAN_(DOC|GUI)_MS`' docs/v3/ban-giao/bien-moi-truong-v3.md)
[ "$n_doc" -ge 2 ]; ket "③b-biến-khai-ở-bien-moi-truong-v3.md" $? "dòng=$n_doc"

# ④ ĐẢO-VÁ trên bản sao tạm (mỗi đột biến một tiến trình mới)
T=$(mktemp -d "${TMPDIR:-/tmp}/gl3.XXXXXX"); [ "${GIU_TAM:-0}" = 1 ] || trap 'rm -rf "$T"' EXIT
mkdir -p "$T/test" "$T/v3"
cp -R src "$T/src"; cp -R db "$T/db"; cp -R v3/src "$T/v3/src"; cp test/_an-toan.mjs "$CA1" "$CA2" "$T/test/"
cp package.json "$T/"; ln -s "$GOC/node_modules" "$T/node_modules"; [ -f .env ] && cp .env "$T/.env"
# --test-force-exit: đột biến làm lời hứa treo mãi thì ca đỏ do quá thời gian ca, rồi tiến trình PHẢI thoát.
dot() { (cd "$T" && node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "$@" 2>&1); }
dot_bien() { # dot_bien <tên> <chuỗi gốc> <chuỗi đột biến>
  cp "$F" "$T/$F"
  python3 - "$T/$F" "$2" "$3" <<'PY' || { echo "   ↳ $1: không áp được đột biến (chuỗi gốc đổi?)"; return 1; }
import sys; p, a, b = sys.argv[1:4]; s = open(p).read()
assert s.count(a) == 1, f"chuỗi gốc xuất hiện {s.count(a)} lần"
open(p, 'w').write(s.replace(a, b))
PY
}
dao() { # dao <nhãn> <các phép phải ĐỎ> <tệp ca> <mẫu tên> <gốc> <đột biến>
  local nhan="$1" phai="$2" ca="$3" mau="$4"
  if ! dot_bien "$nhan" "$5" "$6"; then ket "$nhan" 1 "đột biến không áp được"; return; fi
  # cờ mẫu tên đứng TRƯỚC tệp ca — đặt sau tệp thì node bỏ qua mẫu, chạy cả tệp
  local o r t thieu=""; o=$(dot --test-name-pattern="$mau" "test/$(basename "$ca")"); r=$(do_ten "$o")
  for t in $phai; do echo " $r " | grep -qF " $t " || thieu="$thieu$t "; done
  [ -z "$thieu" ]; ket "$nhan" $? "đỏ: ${r:-không} (đòi đỏ: $phai)"
}
dao "④1-bỏ-hạn-(huỷ-hẹn-giờ-ngay)-⇒-phép-1/2-đỏ" "R1 R2" "$CA1" "GL3 R(1|2) ·" \
  '}, hanMs);' '}, hanMs); clearTimeout(hen);'
dao "④2-bỏ-signal-⇒-phép-1/2-đỏ-(request-không-huỷ-thật)" "R0 R1 R2" "$CA1" "GL3 R(0|1|2) ·" \
  'fetch(url, { ...init, signal: ac.signal })' 'fetch(url, { ...init })'
dao "④3-trả-continue-cho-POST-⇒-phép-2/3-đỏ-(fetch-2-lần)" "R2 R3" "$CA1" "GL3 R(2|3) ·" \
  'if (!doc) return laBiCongChan(e) ? loi : { ...loi, khongRo: true };' 'if (false) return laBiCongChan(e) ? loi : { ...loi, khongRo: true };'
dao "④3b-như-trên-đầu-cuối-⇒-E1/E2-đỏ" "E1 E2" "$CA2" "GL3 E[12] ·" \
  'if (!doc) return laBiCongChan(e) ? loi : { ...loi, khongRo: true };' 'if (false) return laBiCongChan(e) ? loi : { ...loi, khongRo: true };'
dao "④4-hạn-không-phủ-thân-⇒-7b-đỏ" "R7b" "$CA1" "GL3 R7b ·" \
  'const j = await Promise.race([Promise.resolve(than).then((v) => v, () => THAN_HONG), choHuy]);' \
  'const j = await Promise.resolve(than).then((v) => v, () => THAN_HONG);'
dao "④5-'0'-thành-huỷ-ngay-⇒-(a)-đỏ" "M3" "$CA1" "GL3 M3 ·" \
  'if (n >= 1 && n <= HAN_TRAN_MS) return n;' 'if (n >= 0 && n <= HAN_TRAN_MS) return n;'
dao "④6-GHI-dùng-hạn-ĐỌC-⇒-M2/R2-đỏ" "M2 R2" "$CA1" "GL3 (M2|R2) ·" \
  'const hanMs = doc ? hanDocMs() : hanGuiMs();' 'const hanMs = hanDocMs();'
dao "④7-phaLoi-luôn-sau_gui-⇒-7c-đỏ" "R7c" "$CA1" "GL3 R7c ·" \
  "MA_LOI_KET_NOI.has(m)) ? 'ket_noi' : 'sau_gui')" "MA_LOI_KET_NOI.has(m)) ? 'sau_gui' : 'sau_gui')"
dao "④8-pkAddNote-lỗi-mạng-thành-ok-⇒-7d-đỏ" "R7d" "$CA1" "GL3 R7d ·" \
  'j?.success === false || j?.khongRo || rong' 'j?.success === false || rong'
dao "④8b-pkAddNote-thân-rỗng/hết-token-thành-ok-⇒-7d-đỏ" "R7d" "$CA1" "GL3 R7d ·" \
  'j?.success === false || j?.khongRo || rong' 'j?.success === false || j?.khongRo'
dao "④10-cổng-chặn-bị-gắn-khongRo-⇒-7f-đỏ" "R7f" "$CA1" "GL3 R7f ·" \
  'return laBiCongChan(e) ? loi : { ...loi, khongRo: true };' 'return { ...loi, khongRo: true };'
dao "④10b-như-trên-cổng-THẬT-đầu-cuối-⇒-E3-đỏ" "E3" "$CA2" "GL3 E3 ·" \
  'return laBiCongChan(e) ? loi : { ...loi, khongRo: true };' 'return { ...loi, khongRo: true };'
dao "④11-thân-hỏng-nuốt-thành-{}-⇒-7e-đỏ" "R7e" "$CA1" "GL3 R7e ·" \
  'e.thanHong = true;
      throw e;' 'return {};'
dao "④9-fetch-trần-addPancakeToken-không-hạn-⇒-phép-6-đỏ" "R6" "$CA1" "GL3 R6 ·" \
  'const j = await goiPancake(`${PK_BASE}/pages?access_token=${t}`, undefined, hanDocMs());
    const n =' 'const j = await (await fetch(`${PK_BASE}/pages?access_token=${t}`)).json();
    const n ='
cp "$F" "$T/$F"; o=$(dot "test/$(basename "$CA1")" "test/$(basename "$CA2")"); f=$(so "$o" fail); p=$(so "$o" pass)
[ "${f:-1}" -eq 0 ] && [ "${p:-0}" -ge 22 ]; ket "④0-bản-sao-nguyên-vẹn-xanh" $? "pass=${p:-?} fail=${f:-?} (thước không tự đỏ)"

# ⑤ bộ ca cũ chạm gửi (④9 phiếu)
for c in test/l1-m2-cua.test.js test/va-r1-van-gui.test.js test/l2-m1-nhac-truong.test.js test/phase0-webhook-delivery.test.js; do
  o=$(chay "$c"); f=$(so "$o" fail); p=$(so "$o" pass)
  [ "${f:-1}" -eq 0 ] && [ "${p:-0}" -ge 1 ]; ket "⑤$(basename "$c" .test.js)" $? "pass=${p:-?} fail=${f:-?}"
done
[ "${CHAY_NPM_TEST:-0}" = 1 ] && { o=$(npm test 2>&1); ket "⑥npm-test" $([ "$(so "$o" fail)" = 0 ]; echo $?) "tests=$(so "$o" tests) pass=$(so "$o" pass) fail=$(so "$o" fail)"; } || echo "⏸ ⑥npm-test hoãn (CHAY_NPM_TEST=1; luật 6 — không chạy song song)"
echo "== ĐỎ $do / XANH $xanh"; [ "$do" -eq 0 ]
