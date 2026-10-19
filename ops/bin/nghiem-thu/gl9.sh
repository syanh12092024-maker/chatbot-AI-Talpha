#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU GL9 — pool CSDL không chết vì client rỗi/đang mượn bị giết · MỘT bộ đọc `.env` (util.parseEnv, không fail-OPEN
# van) · lưới jsonb ở sáu cửa ghi còn trần. Thi hành các phép ④ của docs/thi-cong/phieu/PHIEU-GL9.md. rc=0 là đạt.
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT BẢNG ĐẾM. Không dòng nào chỉ nói "chạy xong không lỗi".
#
# Tầm đo: lưới HỒI QUY (luật 32) do chính thợ viết, trên MÁY DEV — không đo prod, không đo `aicloser_v3`. Hộp cát Postgres riêng mỗi
# tệp ca (`db/sandbox.js`, hậu tố `_p<pid>`, tự dựng tự dọn). Ca pool/worker chạy TIẾN TRÌNH CON mới (rc + dòng in); ca env chạy tiến trình
# con env SẠCH trên bản chép cây + `.env` TẠM (không chạm `<repo>/.env`); KHÔNG mạng (POS/cửa gửi tiêm · worker thật chạy với bẫy
# `fetch`/`https`). Đảo-vá trên BẢN SAO TẠM (src · db · v3/src · ba tệp ca), mỗi đột biến một tiến trình node mới (bẫy 15).
# Chỉ `grep -E` (máy dev: `rg` là hàm zsh).
# Cờ: GIU_TAM=1 giữ bản sao · BO_DAO_VA=1 bỏ ⑤ · CHAY_CONG_CU=1 chạy ⑥ (gl8 · gl3c · gp1 — cổng lồng, mặc định HOÃN: án lệ
# N-THUOC-CHAP-CHON, cổng lồng treo khi máy bận) · CHAY_NPM_TEST=1 chạy ⑦ (mặc định HOÃN — `npm test` dài; số trước/sau ở nhật ký).
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "$@" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+' | head -1; }
do_ten() { echo "$1" | grep -E "^\s*✖ GL9 [A-Za-z0-9]+ ·" | sed -E 's/^\s*✖ GL9 ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
xanh_ten() { echo "$1" | grep -E "^\s*✔ GL9 [A-Za-z0-9]+ ·" | sed -E 's/^\s*✔ GL9 ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
BASE=01a4e89
DB="aicloser_v3_nt_gl9_p$$"   # khai theo khuôn; mỗi tệp ca tự dựng hộp cát riêng (aicloser_v3_test_gl9{p,w,j}_p<pid>) — không ghi vào tên này
if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(node -e 'console.log(require("util").parseEnv(require("fs").readFileSync(".env","utf8")).DATABASE_URL_V3||"")')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát"; exit 2; }
noi=$(node -e 'const u=new URL(process.env.DATABASE_URL_V3);console.log(`${u.hostname}:${u.port||5432}`)' 2>/dev/null || echo "?")
echo "── môi trường: máy dev · hộp cát Postgres trên $noi (aicloser_v3_test_gl9*_p<pid>, tự dựng tự dọn) · cây $GOC · $(git rev-parse --short HEAD) · node $(node -v)"
CA_P=test/gl9-pool-song.test.mjs
CA_E=test/gl9-doc-env.test.mjs
CA_J=test/gl9-luoi-jsonb.test.mjs

# ⓪ luật 1 §0a: máy này vẫn CHỈ ĐỌC (đọc bằng util.parseEnv — cùng cách node --env-file)
ro=$(node -e 'try{console.log(require("util").parseEnv(require("fs").readFileSync(".env","utf8")).PANCAKE_READONLY??"vắng")}catch(e){console.log("LỖI "+e.code)}')
[ "$ro" = "1" ]; ket "⓪.env-PANCAKE_READONLY=1" $? "đọc được: '$ro'"

# ①–③ bộ ca — mỗi phép của ④ có ca XANH riêng (bảng đếm thấy/đòi), thước SÀN (fail=0, pass ≥ số tên đòi)
bo_ca() { # bo_ca <nhãn> <các tên phải xanh> <tệp ca…>
  local nhan="$1" can="$2"; shift 2
  local o p f co t thieu=""; o=$(chay "$@"); p=$(so "$o" pass); f=$(so "$o" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
  co=$(xanh_ten "$o"); for t in $can; do echo " $co " | grep -qF " $t " || thieu="$thieu$t "; done
  [ "$f" -eq 0 ] && [ "$p" -ge "$(echo "$can" | wc -w)" ] && [ -z "$thieu" ]
  ket "$nhan" $? "pass=$p fail=$f · xanh: ${co:-không}(đòi: $can)${thieu:+ THIẾU: $thieu}"
  echo "$o" | grep -E "^\s*\[gl9[pwje]\] " | sed 's/^ */   · /' | cut -c1-260
}
bo_ca "①phép-1-pool-sống:-client-rỗi(1a)·đang-mượn(1b)·worker-thật(1c)·cho-qua" "P1a P1b P1c P0" "$CA_P"
bo_ca "②phép-2-một-bộ-đọc-.env:-như---env-file·trùng·export·nháy-hở·vắng·chmod·ưu-tiên·van" "E1 E2 E3 E4 E5 E6 E7 E8" "$CA_E"
bo_ca "③phép-3-sáu-cửa-jsonb:-lan_gui·duyệt-chặn·duyệt-tạo-đơn·loại·đối-chiếu·nhật-ký" "J1 J2 J3 J4 J5 J6" "$CA_J"

# ④ tĩnh (PHỤ — hành vi đã đo ở ①–③; các phép này chỉ canh phạm vi + lời khai của phiếu)
NAO="src/prompts.js src/closer.js src/tools.js src/fast-lane.js src/outbound-guard.js src/context.js src/lead-score.js src/conv-owner.js"
# shellcheck disable=SC2086
git diff --quiet "$BASE" -- $NAO; ket "④a-bộ-não-không-đổi-từ-base-$BASE" $? "$(git diff --stat "$BASE" -- $NAO | tail -1)"
tao=$(grep -rnE "new pg\.Pool|new Pool\(" src db v3/src | grep -vE "^db/sandbox\.js:" | sed 's/:.*//' | sort | uniq -c | tr -s ' ' | tr '\n' ';')
[ "$tao" = " 1 db/ket-noi.js;" ]; ket "④b-mọi-pool-mã-prod-qua-taoPool-(ngoài-db/sandbox.js-chỉ-test)" $? "chỗ tự new Pool: ${tao:-0} (đòi: 1 db/ket-noi.js)"
n_dung=$(grep -cE "taoPool\(" src/queue/chay-worker.js v3/chay-that.js | tr '\n' ' ')
echo "$n_dung" | grep -qE "chay-worker\.js:2 .*chay-that\.js:1"; ket "④c-hai-unit-prod-dùng-taoPool" $? "$n_dung(đòi chay-worker 2 · chay-that 1)"
doc=$(grep -rnE "readFileSync\(.*\.env" src db v3/src | sed 's/:.*//' | sort | uniq -c | tr -s ' ' | tr '\n' ';')
[ "$doc" = " 1 db/ket-noi.js;" ]; ket "④d-đúng-MỘT-chỗ-đọc-tệp-.env-trong-mã-prod" $? "${doc:-0} (đòi: 1 db/ket-noi.js)"
tran=0; for t in src/queue/lan-gui.js src/orders/hang-cho.js src/queue/reconcile.js src/db/nhat-ky.js; do tran=$((tran + $(grep -cF "JSON.stringify(" "$t"))); done
luoi=$(cat src/queue/lan-gui.js src/orders/hang-cho.js src/queue/reconcile.js src/db/nhat-ky.js | grep -cF "jsonLanh(")
[ "$tran" -eq 0 ] && [ "$luoi" -ge 12 ]; ket "④e-sáu-cửa-không-còn-stringify-trần" $? "JSON.stringify( còn=$tran (đòi 0) · jsonLanh( =$luoi (đòi ≥12: lan-gui 1 · hang-cho 8 = 2 của GL8 + 6 · reconcile 1 · nhat-ky 2)"

# ⑤ ĐẢO-VÁ (④4) trên BẢN SAO TẠM — mỗi đột biến một tiến trình node mới. Luật đọc: các ca khai PHẢI nằm trong tập đỏ.
if [ "${BO_DAO_VA:-0}" != 1 ]; then
T=$(mktemp -d "${TMPDIR:-/tmp}/gl9.XXXXXX"); [ "${GIU_TAM:-0}" = 1 ] && echo "GIU_TAM=1 — giữ $T" || trap 'rm -rf "$T"' EXIT
NM=$(node -e 'const p=require("path");console.log(p.resolve(p.dirname(require.resolve("pg/package.json")),".."))')
mkdir -p "$T/test"
chep() { rm -rf "$T/src" "$T/db" "$T/v3"; mkdir -p "$T/v3"; cp -R src "$T/src"; cp -R db "$T/db"; cp -R v3/src "$T/v3/src"; }
chep; cp test/_an-toan.mjs "$CA_P" "$CA_E" "$CA_J" "$T/test/"
cp package.json "$T/"; ln -s "$NM" "$T/node_modules"; [ -f .env ] && ln -s "$GOC/.env" "$T/.env"
dot() { (cd "$T" && node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "$@" 2>&1); }
dot_bien() { # dot_bien <tên đột biến> — mỗi chuỗi gốc phải khớp ĐÚNG MỘT lần
  python3 - "$T" "$1" <<'PY'
import os, sys
T, ten = sys.argv[1], sys.argv[2]
KN, NAP, MT, LG, HC, RC, NK = "db/ket-noi.js", "src/queue/nap.js", "src/pos/moi-truong.js", "src/queue/lan-gui.js", "src/orders/hang-cho.js", "src/queue/reconcile.js", "src/db/nhat-ky.js"
CU = ('for (const dong of raw.split("\\n")) { const m = dong.match(/^\\s*([A-Za-z_0-9]+)\\s*=\\s*(.*)$/); '
      'if (m && m[1] === ten) return m[2].trim().replace(/^["\']|["\']$/g, ""); }')
FS = 'process.getBuiltinModule("node:fs")'
BANG = {
  "bo-nghe-pool":   [(KN, '  pool.on("error", (e) => ghiLoiPg("client rỗi (pool)", e));\n', "")],
  "bo-nghe-client": [(KN, '  pool.on("connect", (c) => c.on("error", (e) => ghiLoiPg("trên client", e)));\n', "")],
  "log-chuoi-noi":  [(KN, 'ghiLoiPg("client rỗi (pool)", e)', 'ghiLoiPg("client rỗi (pool) " + url, e)')],
  "parse-tay":      [(KN, "const bang = util.parseEnv(raw);",
                      'const bang = Object.fromEntries(raw.split("\\n").map((d) => d.match(/^\\s*([A-Za-z_0-9]+)\\s*=\\s*(.*)$/)).filter(Boolean)'
                      '.map((m) => [m[1], m[2].trim().replace(/^["\']|["\']$/g, "")]).reverse());')],
  "nuot-moi-loi":   [(KN, '    if (e?.code === "ENOENT") return undefined;\n    throw e;\n', "    return undefined;\n")],
  "bo-nhay-ho":     [(KN, "if (coDongKhai(raw, ten)) throw", "if (false) throw")],
  "ketnoi-cu":      [(KN, '  return docTepEnv(ten) ?? "";', f'  try {{ const raw = {FS}.readFileSync(path.join(GOC, ".env"), "utf8"); {CU} }} catch {{}}\n  return "";')],
  "nap-cu":         [(NAP, "  return docTepEnv(ten);", f'  try {{ const raw = {FS}.readFileSync(new URL("../../.env", import.meta.url), "utf8"); {CU} }} catch {{}}\n  return undefined;')],
  "moitruong-cu":   [(MT, '  return docTepEnv(ten, goc) ?? "";', f'  try {{ const raw = {FS}.readFileSync({FS.replace("fs", "path")}.join(goc, ".env"), "utf8"); {CU} }} catch {{}}\n  return "";')],
  "lan-gui":        [(LG, "jsonLanh(args[2])", "JSON.stringify(args[2])")],
  "sua-chu-gui":    [(LG, "try { result = await cua[loai](...args); }", "try { args[2] = JSON.parse(jsonLanh(args[2])); result = await cua[loai](...args); }")],
  "hc-869":         [(HC, "jsonLanh({ ...duLieu, market }),", "JSON.stringify({ ...duLieu, market }),")],
  "hc-870":         [(HC, "          jsonLanh(cuaKiem),\n          team,", "          JSON.stringify(cuaKiem),\n          team,")],
  "hc-970":         [(HC, "jsonLanh({ ...duLieu, market, ma_pos: kqPos.maPos }),", "JSON.stringify({ ...duLieu, market, ma_pos: kqPos.maPos }),")],
  "hc-971":         [(HC, "        jsonLanh({\n          ...cuaKiem,", "        JSON.stringify({\n          ...cuaKiem,")],
  "hc-1080":        [(HC, "      jsonLanh({\n        hang_cho_id:", "      JSON.stringify({\n        hang_cho_id:")],
  "hc-1128":        [(HC, "[nguoiDuyetId, jsonLanh(cuaKiem), team, hangChoId]", "[nguoiDuyetId, JSON.stringify(cuaKiem), team, hangChoId]")],
  "reconcile":      [(RC, "jsonLanh(profile)", "JSON.stringify(profile)")],
  "nk-truoc":       [(NK, "truoc != null ? jsonLanh(truoc) : null", "truoc != null ? JSON.stringify(truoc) : null")],
  "nk-sau":         [(NK, "sau != null ? jsonLanh(sau) : null", "sau != null ? JSON.stringify(sau) : null")],
}
for tep, a, b in BANG[ten]:
    p = os.path.join(T, tep); s = open(p).read()
    assert s.count(a) == 1, f"{tep}: chuỗi gốc xuất hiện {s.count(a)} lần: {a[:70]!r}"
    open(p, "w").write(s.replace(a, b))
PY
}
dao() { # dao <nhãn> <các ca phải ĐỎ> <mẫu tên> <tên đột biến> <tệp ca…>
  local nhan="$1" phai="$2" mau="$3" ten="$4"; shift 4
  chep
  if ! dot_bien "$ten"; then ket "$nhan" 1 "đột biến không áp được (chuỗi gốc đổi?)"; return; fi
  local o r t thieu=""; o=$(dot --test-name-pattern="$mau" "$@"); r=$(do_ten "$o")
  for t in $phai; do echo " $r " | grep -qF " $t " || thieu="$thieu$t "; done
  [ -z "$thieu" ]; ket "$nhan" $? "đỏ: ${r:-không} (đòi đỏ: $phai)"
}
P="test/$(basename "$CA_P")"; E="test/$(basename "$CA_E")"; J="test/$(basename "$CA_J")"
# — A: hai người nghe + lời log —
dao "⑤a-bỏ-người-nghe-POOL-⇒-1a·1c-đỏ-(tiến-trình-thoát)" "P1a P1c" "GL9 P1[ac] ·" "bo-nghe-pool" "$P"
dao "⑤b-bỏ-người-nghe-CLIENT-⇒-1b-đỏ-(tiến-trình-thoát)" "P1b" "GL9 P1b ·" "bo-nghe-client" "$P"
dao "⑤c-log-in-chuỗi-nối-⇒-1a-đỏ" "P1a" "GL9 P1a ·" "log-chuoi-noi" "$P"
# — B: trả bộ đọc cũ ở từng tệp · bỏ ENOENT-only · bỏ phát hiện nháy hở · bộ chung tự parse tay —
dao "⑤d-nap.js-trả-bộ-đọc-cũ-⇒-E3·E5·E6-đỏ" "E3 E5 E6" "GL9 E[356] ·" "nap-cu" "$E"
dao "⑤e-ket-noi.js-docEnv-trả-bộ-đọc-cũ-⇒-E5·E6·E7-đỏ" "E5 E6 E7" "GL9 E[567] ·" "ketnoi-cu" "$E"
dao "⑤f-moi-truong.js-trả-bộ-đọc-cũ-⇒-E5·E6·E7-đỏ" "E5 E6 E7" "GL9 E[567] ·" "moitruong-cu" "$E"
dao "⑤g-catch-nuốt-mọi-lỗi-(bỏ-ENOENT-only)-⇒-E5-đỏ" "E5" "GL9 E5 ·" "nuot-moi-loi" "$E"
dao "⑤h-bỏ-phát-hiện-nháy-hở-⇒-E3-đỏ" "E3" "GL9 E3 ·" "bo-nhay-ho" "$E"
dao "⑤i-bộ-chung-parse-tay-thay-util.parseEnv-⇒-E1·E2-đỏ" "E1 E2" "GL9 E[12] ·" "parse-tay" "$E"
# — C: bỏ lưới TỪNG cửa ⇒ ca của cửa đó đỏ · lưới sửa cả chữ gửi khách ⇒ J1 đỏ —
dao "⑤j-lan-gui.js:91-bỏ-lưới-⇒-J1-đỏ" "J1" "GL9 J1 ·" "lan-gui" "$J"
dao "⑤k-lan-gui-lưới-sửa-cả-args-gửi-khách-⇒-J1-đỏ" "J1" "GL9 J1 ·" "sua-chu-gui" "$J"
dao "⑤l-hang-cho:869-bỏ-lưới-⇒-J2-đỏ" "J2" "GL9 J2 ·" "hc-869" "$J"
dao "⑤m-hang-cho:870-bỏ-lưới-⇒-J2-đỏ" "J2" "GL9 J2 ·" "hc-870" "$J"
dao "⑤n-hang-cho:970-bỏ-lưới-⇒-J3-đỏ" "J3" "GL9 J3 ·" "hc-970" "$J"
dao "⑤o-hang-cho:971-bỏ-lưới-⇒-J3-đỏ" "J3" "GL9 J3 ·" "hc-971" "$J"
dao "⑤p-hang-cho:1080-bỏ-lưới-⇒-J3-đỏ" "J3" "GL9 J3 ·" "hc-1080" "$J"
dao "⑤q-hang-cho:1128-bỏ-lưới-⇒-J4-đỏ" "J4" "GL9 J4 ·" "hc-1128" "$J"
dao "⑤r-reconcile.js:31-bỏ-lưới-⇒-J5-đỏ" "J5" "GL9 J5 ·" "reconcile" "$J"
dao "⑤s-nhat-ky.js-truoc-bỏ-lưới-⇒-J6-đỏ" "J6" "GL9 J6 ·" "nk-truoc" "$J"
dao "⑤t-nhat-ky.js-sau-bỏ-lưới-⇒-J3·J4·J6-đỏ" "J3 J4 J6" "GL9 J[346] ·" "nk-sau" "$J"
chep; o=$(dot "$P" "$E" "$J"); f=$(so "$o" fail); p=$(so "$o" pass)
[ "${f:-1}" -eq 0 ] && [ "${p:-0}" -ge 18 ]; ket "⑤0-bản-sao-nguyên-vẹn-xanh-(thước-không-tự-đỏ)" $? "pass=${p:-?} fail=${f:-?}"
else
  echo "⏸ ⑤đảo-vá HOÃN (BO_DAO_VA=1)"
fi

# ⑥ cổng cũ chạm cùng tệp (④5) — chạy RIÊNG từng cổng, chỉ khi CHAY_CONG_CU=1 (cổng lồng treo khi máy bận — án lệ N-THUOC-CHAP-CHON).
if [ "${CHAY_CONG_CU:-}" = 1 ]; then
  for c in gl8 gl3c gp1; do o=$(bash "ops/bin/nghiem-thu/$c.sh" 2>&1); r=$?; ket "⑥$c.sh" $r "rc=$r · $(echo "$o" | grep -E '^== ' | tail -1)"; done
else
  echo "⏸ ⑥cổng-cũ HOÃN (CHAY_CONG_CU=1 để chạy gl8 · gl3c · gp1 — nhật ký GL9 ghi rc chạy riêng)"
fi

# ⑦ npm test — chỉ khi CHAY_NPM_TEST=1. Thước: fail=0 (mốc trước/sau ghi ở nhật ký GL9).
if [ "${CHAY_NPM_TEST:-}" = 1 ]; then
  o=$(npm test -- --test-force-exit 2>&1); nt=$(so "$o" tests); nf=$(so "$o" fail)
  [ "${nf:-1}" -eq 0 ]; ket "⑦npm-test" $? "tests=${nt:-?} fail=${nf:-?}"
else
  echo "⏸ ⑦npm-test HOÃN (CHAY_NPM_TEST=1 để chạy — nhật ký GL9 ghi số trước/sau)"
fi

echo "== ĐỎ $do / XANH $xanh (DB khai: $DB)"
[ "$do" -eq 0 ]
