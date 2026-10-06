#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU GL2 — trần số page bật bot TOÀN HỆ (`V3_TRAN_PAGE_BAT`): vắng = 0 · vượt ⇒ worker DỪNG hẳn + đèn đỏ ·
# cổng `setPage` đếm toàn hệ dưới khoá tư vấn. rc=0 là đạt. Thi hành mục ④ của docs/thi-cong/phieu/PHIEU-GL2.md.
# Tầm đo: lưới HỒI QUY (luật 32) do chính thợ viết, trên MÁY DEV; hộp cát Postgres riêng mỗi tệp ca (`db/sandbox.js`, hậu tố
# `_p<pid>`, tự dựng tự dọn) — không đo prod, không đo `aicloser_v3`. Không gọi mạng (fetch là bẫy ném trong ca). Env đặt trong
# tiến trình ca, KHÔNG sửa `.env`. Đảo-vá trên BẢN SAO TẠM (src · db · v3/src · deploy · ca), mỗi đột biến một tiến trình node
# mới (bẫy 15). Chỉ `grep -E` (máy dev: `rg` là hàm zsh). Cờ: GIU_TAM=1 giữ bản sao · CHAY_NPM_TEST=1 chạy ⑦ (mặc định HOÃN, luật 6).
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "$@" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+' | head -1; }
do_ten() { echo "$1" | grep -E "^\s*✖ GL2 [A-Za-z0-9]+ ·" | sed -E 's/^\s*✖ GL2 ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
xanh_ten() { echo "$1" | grep -E "^\s*✔ GL2 [A-Za-z0-9]+ ·" | sed -E 's/^\s*✔ GL2 ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
DB="aicloser_v3_nt_gl2_p$$"   # khai theo phiếu; mỗi tệp ca tự dựng hộp cát riêng (db/sandbox.js, hậu tố _p<pid>) — không ghi vào tên này
if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát"; exit 2; }
noi=$(node -e 'const u=new URL(process.env.DATABASE_URL_V3);console.log(`${u.hostname}:${u.port||5432}`)' 2>/dev/null || echo "?")
echo "── môi trường: máy dev · hộp cát Postgres trên $noi (aicloser_v3_test_gl2*_p<pid>, tự dựng tự dọn) · cây $GOC · $(git rev-parse --short HEAD)"
CA_T=test/gl2-tran-page-bat.test.mjs
CA_D=test/gl2-deploy.test.mjs
CA_S=v3/test/b/gl2-den-suc-khoe.test.mjs

# ⓪ luật 1 §0a: máy này vẫn CHỈ ĐỌC
ro=$(grep -E '^PANCAKE_READONLY=' .env 2>/dev/null | tail -1 | cut -d= -f2)
[ "$ro" = "1" ]; ket "⓪.env-PANCAKE_READONLY=1" $? "đọc được: '${ro:-vắng}'"

# ①②③ ba bộ ca — mỗi phép của ④ có ca XANH riêng (bảng đếm thấy/đòi), thước SÀN (fail=0, pass ≥ số tên đòi)
bo_ca() { # bo_ca <nhãn> <tệp ca> <các tên phải xanh>
  local o p f co t thieu=""; o=$(chay "$2"); p=$(so "$o" pass); f=$(so "$o" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
  co=$(xanh_ten "$o"); for t in $3; do echo " $co " | grep -qF " $t " || thieu="$thieu$t "; done
  [ "$f" -eq 0 ] && [ "$p" -ge "$(echo "$3" | wc -w)" ] && [ -z "$thieu" ]
  ket "$1" $? "pass=$p fail=$f · xanh: ${co:-không}(đòi: $3)${thieu:+ THIẾU: $thieu}"
  echo "$o" | grep -E "^\s*\[gl2\] " | sed 's/^ */   · /'
}
bo_ca "①phép-1·2·3·4·4b-trần·setPage·song-song·worker" "$CA_T" "T1 B2a B2b B2c B2d B2e B2f B2g B2h S3a S3b W4a W4b W4c W4d W4e"
bo_ca "②phép-6-preflight-+-setup.sh-pilot" "$CA_D" "P6a P6b P6c"
bo_ca "③phép-5-đèn-Sức-khoẻ-+-cửa-công-tắc-+-màn-Page" "$CA_S" "D5a D5b D5c D5d D5e C5e M4f"

# ④ tĩnh — bẫy mb.sh:65 (đếm grep phải đúng 1) · biến khai cùng commit · đọc biến ở MỘT chỗ (hàm thuần)
n65=$(grep -c 'WHERE bot_ai_bat = true' src/queue/page-routing.js)
[ "$n65" -eq 1 ]; ket "④a-mb.sh:65-vẫn-đếm-đúng-1" $? "grep -c 'WHERE bot_ai_bat = true' page-routing.js = $n65 (đòi 1)"
nk=$(grep -cE '^\| `V3_TRAN_PAGE_BAT`' docs/v3/ban-giao/bien-moi-truong-v3.md)
[ "$nk" -eq 1 ]; ket "④b-biến-khai-ở-bien-moi-truong-v3.md" $? "dòng bảng = $nk (đòi 1)"
nd=$(grep -rnE "env(\?\.)?(\.V3_TRAN_PAGE_BAT|\[['\"]V3_TRAN_PAGE_BAT)" src v3/src deploy 2>/dev/null | grep -vE '^[^:]+:[0-9]+:\s*(//|\*|#)' | grep -c .)
nb=$(grep -cE "^export const BIEN_TRAN_PAGE_BAT = 'V3_TRAN_PAGE_BAT';" src/queue/page-routing.js)
[ "$nd" -eq 0 ] && [ "$nb" -eq 1 ]; ket "④c-đọc-biến-một-chỗ-(tranPageBat)" $? "đọc thẳng env ngoài hàm = $nd (đòi 0) · hằng tên biến = $nb (đòi 1)"

# ⑤ ĐẢO-VÁ (④7) trên BẢN SAO TẠM — mỗi đột biến một tiến trình node mới. Luật đọc: các ca khai PHẢI nằm trong tập đỏ.
T=$(mktemp -d "${TMPDIR:-/tmp}/gl2.XXXXXX"); [ "${GIU_TAM:-0}" = 1 ] || trap 'rm -rf "$T"' EXIT
mkdir -p "$T/test" "$T/v3/test/b"
chep() { rm -rf "$T/src" "$T/db" "$T/v3/src" "$T/deploy"; cp -R src "$T/src"; cp -R db "$T/db"; cp -R v3/src "$T/v3/src"; cp -R deploy "$T/deploy"; }
chep; cp test/_an-toan.mjs "$CA_T" "$CA_D" "$T/test/"; cp "$CA_S" "$T/v3/test/b/"
cp package.json "$T/"; ln -s "$GOC/node_modules" "$T/node_modules"; [ -f .env ] && ln -s "$GOC/.env" "$T/.env"
dot() { (cd "$T" && node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "$@" 2>&1); }
dot_bien() { # dot_bien <tệp> <gốc1> <đột-biến1> [<gốc2> <đột-biến2> …] — mỗi chuỗi gốc phải khớp ĐÚNG MỘT lần
  local tep=$1; shift
  python3 - "$T/$tep" "$@" <<'PY2'
import sys
p = sys.argv[1]; cap = sys.argv[2:]; s = open(p).read()
for a, b in zip(cap[0::2], cap[1::2]):
    assert s.count(a) == 1, f"chuỗi gốc xuất hiện {s.count(a)} lần: {a[:70]!r}"
    s = s.replace(a, b)
open(p, 'w').write(s)
PY2
}
dao() { # dao <nhãn> <các ca phải ĐỎ> <các tệp ca (cách bằng dấu cách)> <tệp đột biến> <gốc> <đột biến> [<gốc> <đột biến> …]
  local nhan="$1" phai="$2" cas="$3" tep="$4"; shift 4
  chep
  if ! dot_bien "$tep" "$@"; then ket "$nhan" 1 "đột biến không áp được (chuỗi gốc đổi?)"; return; fi
  local o r t thieu="" ds=""; for t in $cas; do ds="$ds $t"; done
  o=$(dot $ds); r=$(do_ten "$o")
  for t in $phai; do echo " $r " | grep -qF " $t " || thieu="$thieu$t "; done
  [ -z "$thieu" ]; ket "$nhan" $? "đỏ: ${r:-không} (đòi đỏ: $phai)"
}
PR=src/queue/page-routing.js; OP=src/admin-v3/operations.js; SK=v3/src/ui/suc-khoe/kho-suc-khoe.js
dao "⑤a-setPage-đếm-KẸP-TEAM-⇒-phép-2-(B-team-khác)-đỏ" "B2b C5e" "test/gl2-tran-page-bat.test.mjs v3/test/b/gl2-den-suc-khoe.test.mjs" "$OP" \
  '  const dangBat = await dsPageBotTraLoi(c);' \
  "  const dangBat = (await c.query(\"SELECT page_id FROM page WHERE bot_ai_bat AND page_id <> '' AND team_id=\$1\", [p.team_id])).rows.map((x) => String(x.page_id));"
dao "⑤b-bỏ-khoá-tư-vấn-⇒-phép-3-đỏ" "S3b" "test/gl2-tran-page-bat.test.mjs" "$OP" \
  '  await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [KHOA_TRAN_PAGE_BAT]);' ''
dao "⑤c-REPEATABLE-READ-(G3)-⇒-phép-3-đỏ" "S3b" "test/gl2-tran-page-bat.test.mjs" "$OP" \
  '    await c.query("BEGIN");' '    await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ");'
dao "⑤d-worker-bỏ-chặn-⇒-phép-4-đỏ" "W4a W4b" "test/gl2-tran-page-bat.test.mjs" "$PR" \
  $'  }\n  return [];\n}' $'  }\n  return t.pages;\n}'
dao "⑤e-worker-trả-null-(=-MỌI-page)-⇒-phép-4-đỏ" "W4a W4b" "test/gl2-tran-page-bat.test.mjs" "$PR" \
  $'  }\n  return [];\n}' $'  }\n  return null;\n}'
dao "⑤f-vắng-=-1-⇒-phép-1/2-đỏ" "T1 B2e" "test/gl2-tran-page-bat.test.mjs" "$PR" \
  '  return SO_NGUYEN.test(tho) ? Number(tho) : 0;' '  return SO_NGUYEN.test(tho) ? Number(tho) : 1;'
dao "⑤g-trần-hằng-số-(câu-đo-trả-hằng)-⇒-phép-1/2-đỏ" "T1 B2f" "test/gl2-tran-page-bat.test.mjs" "$PR" \
  '  return SO_NGUYEN.test(tho) ? Number(tho) : 0;' '  return 1;'
dao "⑤h-đảo-dấu-(>-thành->=)-⇒-cho-qua-đỏ" "B2a W4c D5c" "test/gl2-tran-page-bat.test.mjs v3/test/b/gl2-den-suc-khoe.test.mjs" "$PR" \
  'export const vuotTran = (soBat, tran) => soBat > tran;' 'export const vuotTran = (soBat, tran) => soBat >= tran;'
dao "⑤i-chặn-đặt-vào-dsPageBotTraLoi-(C1)-⇒-màn-mất-page-đỏ" "W4a M4f" "test/gl2-tran-page-bat.test.mjs v3/test/b/gl2-den-suc-khoe.test.mjs" "$PR" \
  $'  return r.rows.map((x) => String(x.page_id)).filter(Boolean);\n}' \
  $'  const ds = r.rows.map((x) => String(x.page_id)).filter(Boolean);\n  return ds.length > tranPageBat(process.env) ? [] : ds;\n}'
dao "⑤j-bỏ-nhịp-cảnh-báo-(log-mọi-lượt)-⇒-phép-4b-đỏ" "W4d W4e" "test/gl2-tran-page-bat.test.mjs" "$PR" \
  '  if (_canhBao.luc == null || bayGio - _canhBao.luc >= KHOANG_CANH_BAO_TRAN_MS) {' '  if (true) {'
dao "⑤k-lý-do-cũ-«chưa-page-nào-bật»-khi-vượt-⇒-phép-4-đỏ" "W4b" "test/gl2-tran-page-bat.test.mjs" src/queue/chay-worker.js \
  '    if (tt?.vuot) ket.nap.lyDo = lyDoVuotTran(tt.soBat);' '    if (false) ket.nap.lyDo = lyDoVuotTran(tt.soBat);'
dao "⑤l-trần-chặn-cả-chiều-TẮT-⇒-phép-2-đỏ" "B2c" "test/gl2-tran-page-bat.test.mjs" "$OP" \
  $'      await kiemTranPageBat(c, p, env);\n    }' $'    }\n    await kiemTranPageBat(c, p, env);'
dao "⑤m-trần-kiểm-TRƯỚC-pageStatus-(N2)-⇒-thứ-tự-đỏ" "B2g" "test/gl2-tran-page-bat.test.mjs" "$OP" \
  $'      await kiemTranPageBat(c, p, env);\n    }' $'    }' \
  $'    if (input.enabled === true) {\n      const status' $'    if (input.enabled === true) {\n      await kiemTranPageBat(c, p, env);\n      const status'
dao "⑤n-tính-cả-chính-page-đã-bật-⇒-biên-đỏ" "B2f" "test/gl2-tran-page-bat.test.mjs" "$OP" \
  '.filter((pid) => pid !== String(p.page_id))' ''
dao "⑤o-đèn-đếm-KẸP-TEAM-(C2)-⇒-phép-5-đỏ" "D5a" "v3/test/b/gl2-den-suc-khoe.test.mjs" "$SK" \
  '  const soBat = Math.max(toanHe ?? 0, cuaTeam);' '  const soBat = cuaTeam;'
dao "⑤p-đèn-vượt-mà-không-đỏ-⇒-phép-5-đỏ" "D5a" "v3/test/b/gl2-den-suc-khoe.test.mjs" "$SK" \
  "      ma: 'bot_bat', ten: 'Page đang bật bot', muc: MUC.DO," "      ma: 'bot_bat', ten: 'Page đang bật bot', muc: MUC.XANH,"
dao "⑤q-bỏ-vế-vượt-trần-của-đèn-Máy-chạy-bot-⇒-phép-5-đỏ" "D5b" "v3/test/b/gl2-den-suc-khoe.test.mjs" "$SK" \
  $'  if (tran?.vuot) {\n    return den({\n      ma: \'may_chay_bot\',' $'  if (false) {\n    return den({\n      ma: \'may_chay_bot\','
dao "⑤r-preflight-bỏ-chặn---ready-⇒-phép-6-đỏ" "P6a" "test/gl2-deploy.test.mjs" deploy/preflight.mjs \
  '    if (kiemTran && vuotTran(db.pagesBotBat, tranPageBat(process.env))) {' '    if (false) {'
dao "⑤s-setup.sh-pilot-bỏ-đòi-trần-⇒-phép-6-đỏ" "P6b" "test/gl2-deploy.test.mjs" deploy/setup.sh \
  '    if(tranPageBat(process.env)!==1) {' '    if(false) {'
# sau /code-review (bẫy 26: bản vá cũng là code mới — mỗi chỗ vừa vá một đột biến)
dao "⑤t-đèn-đếm-cả-dòng-bảng-sẵn-sàng-cũ-⇒-trong-trần-đỏ-oan" "D5c" "v3/test/b/gl2-den-suc-khoe.test.mjs" "$SK" \
  '      toanHe = (kq?.pages || []).filter((p) => p?.aiEnabled === true).length;' '      toanHe = (kq?.pages || []).length;'
dao "⑤u-setup.sh-bỏ---tran-ở-bước-đọc-thuần-⇒-dừng-dịch-vụ-rồi-mới-chặn" "P6c" "test/gl2-deploy.test.mjs" deploy/setup.sh \
  '"$NODE_BIN" --env-file=.env deploy/preflight.mjs --tran' '"$NODE_BIN" --env-file=.env deploy/preflight.mjs'
dao "⑤v-đèn-đếm-cả-page-không-id-Facebook-⇒-D5e-đỏ" "D5e" "v3/test/b/gl2-den-suc-khoe.test.mjs" "$SK" \
  "  const cuaTeam = botBat.filter((p) => String(p.page_id ?? '') !== '').length;" '  const cuaTeam = botBat.length;'
dao "⑤w-409-nói-số-thiếu-chính-page-⇒-B2h-đỏ" "B2h" "test/gl2-tran-page-bat.test.mjs" "$OP" \
  'cauSoTran(dangBat.length, env)' 'cauSoTran(khac, env)'
dao "⑤x-preflight-bỏ-qua---tran-⇒-P6a-đỏ" "P6a" "test/gl2-deploy.test.mjs" deploy/preflight.mjs \
  '    const kiemTran = process.argv.includes("--ready") || process.argv.includes("--tran");' '    const kiemTran = process.argv.includes("--ready");'
chep; o=$(dot test/gl2-tran-page-bat.test.mjs test/gl2-deploy.test.mjs v3/test/b/gl2-den-suc-khoe.test.mjs); f=$(so "$o" fail); p=$(so "$o" pass)
[ "${f:-1}" -eq 0 ] && [ "${p:-0}" -ge 26 ]; ket "⑤0-bản-sao-nguyên-vẹn-xanh-(thước-không-tự-đỏ)" $? "pass=${p:-?} fail=${f:-?}"

# ⑥ cổng cũ XANH, rc tách dòng (④8): mb.sh · ll3.sh · gl1.sh
for g in mb ll3 gl1; do
  o=$(bash "ops/bin/nghiem-thu/$g.sh" 2>&1); r=$?
  [ "$r" -ne 0 ] && echo "$o" | grep -E "^(🔴|   ✘)" | head -6 | sed 's/^/   ↳ /'
  ket "⑥$g.sh" "$r" "rc=$r · $(echo "$o" | grep -E '^(== ĐỎ|═══ [0-9]+/[0-9]+)' | tail -1)"
done

# ⑦ npm test (hoãn mặc định — luật 6: không chạy chồng lượt đo khác)
if [ "${CHAY_NPM_TEST:-0}" = 1 ]; then
  o=$(npm test 2>&1); f=$(so "$o" fail); p=$(so "$o" pass)
  [ "${f:-1}" -eq 0 ]; ket "⑦npm-test" $? "pass=${p:-?} fail=${f:-?}"
else echo "⏸ ⑦npm-test hoãn (CHAY_NPM_TEST=1)"; fi
echo "== ĐỎ $do / XANH $xanh"; [ "$do" -eq 0 ]
