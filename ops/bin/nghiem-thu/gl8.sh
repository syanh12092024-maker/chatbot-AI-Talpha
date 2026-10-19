#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU GL8 — cắt chữ không đứt emoji trước khi ghi jsonb (bot trả lời xong thì KHÔNG bị giao sale vì lỗi ghi sổ) +
# chín công cụ ops đọc `.env` y như `node --env-file`. Thi hành 7 phép ④ của docs/thi-cong/phieu/PHIEU-GL8.md. rc=0 là đạt.
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT BẢNG ĐẾM. Không dòng nào chỉ nói "chạy xong không lỗi".
#
# Tầm đo: lưới HỒI QUY (luật 32) do chính thợ viết, trên MÁY DEV — không đo prod, không đo `aicloser_v3`. Hộp cát Postgres riêng
# mỗi tệp ca (`db/sandbox.js`, hậu tố `_p<pid>`, tự dựng tự dọn). KHÔNG mạng: cửa gửi + model TIÊM trong ca worker; công cụ ops chạy
# THẬT với móc `--import` dừng ở bước dựng pool (0 kết nối) + `fetch` ném. Đảo-vá trên BẢN SAO TẠM (src · db · v3/src · v3/testkit ·
# ops/bin · bốn tệp ca), mỗi đột biến một tiến trình node mới (bẫy 15). Chỉ `grep -E` (máy dev: `rg` là hàm zsh).
# Cờ: GIU_TAM=1 giữ bản sao · BO_DAO_VA=1 bỏ ⑥ (đảo-vá) · CHAY_NPM_TEST=1 chạy ⑦ (mặc định HOÃN — `npm test` dài).
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "$@" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+' | head -1; }
do_ten() { echo "$1" | grep -E "^\s*✖ GL8 [A-Za-z0-9]+ ·" | sed -E 's/^\s*✖ GL8 ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
xanh_ten() { echo "$1" | grep -E "^\s*✔ GL8 [A-Za-z0-9]+ ·" | sed -E 's/^\s*✔ GL8 ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
BASE=33c04ac
DB="aicloser_v3_nt_gl8_p$$"   # khai theo khuôn; mỗi tệp ca tự dựng hộp cát riêng (aicloser_v3_test_gl8{w,l}_p<pid>) — không ghi vào tên này
if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/[[:space:]]*#.*$//;s/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát"; exit 2; }
noi=$(node -e 'const u=new URL(process.env.DATABASE_URL_V3);console.log(`${u.hostname}:${u.port||5432}`)' 2>/dev/null || echo "?")
echo "── môi trường: máy dev · hộp cát Postgres trên $noi (aicloser_v3_test_gl8*_p<pid>, tự dựng tự dọn) · cây $GOC · $(git rev-parse --short HEAD) · node $(node -v)"
CA_C=test/gl8-cat-chu.test.mjs
CA_W=test/gl8-luot-emoji.test.mjs
CA_L=test/gl8-luoi-jsonb.test.mjs
CA_E=test/gl8-doc-env.test.mjs

# ⓪ luật 1 §0a: máy này vẫn CHỈ ĐỌC (ca worker tiêm cửa gửi, không đụng .env)
ro=$(grep -E '^PANCAKE_READONLY=' .env 2>/dev/null | tail -1 | cut -d= -f2 | sed 's/[[:space:]]*#.*$//')
[ "$ro" = "1" ]; ket "⓪.env-PANCAKE_READONLY=1" $? "đọc được: '${ro:-vắng}'"

# ①–④ bộ ca — mỗi phép của ④ có ca XANH riêng (bảng đếm thấy/đòi), thước SÀN (fail=0, pass ≥ số tên đòi)
bo_ca() { # bo_ca <nhãn> <các tên phải xanh> <tệp ca…>
  local nhan="$1" can="$2"; shift 2
  local o p f co t thieu=""; o=$(chay "$@"); p=$(so "$o" pass); f=$(so "$o" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
  co=$(xanh_ten "$o"); for t in $can; do echo " $co " | grep -qF " $t " || thieu="$thieu$t "; done
  [ "$f" -eq 0 ] && [ "$p" -ge "$(echo "$can" | wc -w)" ] && [ -z "$thieu" ]
  ket "$nhan" $? "pass=$p fail=$f · xanh: ${co:-không}(đòi: $can)${thieu:+ THIẾU: $thieu}"
  echo "$o" | grep -E "^\s*\[gl8[wl]\] " | sed 's/^ */   · /' | cut -c1-240
}
bo_ca "①phép-1-hàm-cắt-+-lưới-JSON-(thuần)" "C1 C2 C3 J1" "$CA_C"
bo_ca "②phép-2·3-worker-thật:-model-971·từ-khoá-668/647·Fast-Lane-744/717·cửa-ra-906·chốt-đơn-479·hồ-sơ-qua-bộ-não" "W2 W3a W3b W3c W3d W3e W5 W6" "$CA_W"
bo_ca "③phép-4-lưới-ba-cửa-ghi-jsonb-(so_ai·hoi_thoai·hang_cho_tao_don)" "L4a L4b L4c" "$CA_L"
bo_ca "④phép-5-chín-công-cụ-đọc-env-như-node---env-file-+-dòng-«cờ-đã-đọc»" "E1 E2a E2b E2c E2d E2e E2f E2g E2h E2i E3" "$CA_E"

# ⑤ tĩnh (PHỤ — hành vi đã đo ở ①–④; các phép này chỉ canh phạm vi + lời khai)
# ⑤a/⑤c SỬA 19/10 (lệch phiếu GL8 — tổng gật, đi cùng BH9): bản cũ canh HÌNH DẠNG («bộ não không đổi từ 33c04ac» · «catChu( đúng 7»)
# nên đỏ với mọi phiếu sau đổi bộ não có khai (BH9) dù lời hứa GL8 vẫn giữ. Nay đo LỜI HỨA: chữ bộ não cắt (kèm một nửa cặp tự dựng —
# không trông vào cách bộ não cắt) qua HAI cửa ghi jsonb THẬT (`so-ai.js#ghiSoAi` · `kho.js#suaHoiThoai`, pool giả bắt tham số) ra JSON
# lành, giữ đủ phần chữ trước chỗ cắt; `catChu` cắt ở biên emoji ra chuỗi lành là tiền tố; handler-v3 không còn chỗ cắt TRẦN. Bỏ lưới ở một
# cửa (⑥j/⑥k) hay trả `catChu` về slice trần (⑥g) ⇒ phép này đỏ cùng ca W6/C1.
do_hua=$(node --input-type=module -e '
import { absorbToolUses, emptyProfile } from "./src/context.js";
import { ghiSoAi } from "./src/chat/so-ai.js";
import { suaHoiThoai } from "./src/chat/kho.js";
const don = { name: "M".repeat(39) + "😀z", city: "D".repeat(39) + "🇦🇪", variant: "V".repeat(39) + "🎁", phone: "0501234567", address: "Al Barsha villa 9", qty: 1 };
const prof = emptyProfile();
absorbToolUses([{ role: "assistant", content: [{ type: "tool_use", id: "t", name: "create_draft_order", input: {} }] },
  { role: "user", content: [{ type: "tool_result", tool_use_id: "t", content: JSON.stringify({ ok: true, order: don }) }] }], prof);
prof.nuaCapTuDung = "x".repeat(5) + "\ud83d";
const bat = [];
const pool = { query: async (_s, p = []) => { for (const x of p) if (typeof x === "string") bat.push(x); return { rowCount: 1, rows: [{ id: "1" }] }; } };
await ghiSoAi(pool, { teamId: 1, tinId: 1, loai: "order", maModel: "x", duLieu: { ho_so: prof } });
await suaHoiThoai(pool, { teamId: 1, id: 1, giaTri: { ho_so: prof } });
const loNua = /\\ud[89ab][0-9a-f]{2}(?!\\ud[c-f][0-9a-f]{2})|(?<!\\ud[89ab][0-9a-f]{2})\\ud[c-f][0-9a-f]{2}/i;
const json = bat.filter((x) => x.startsWith("{"));
const hong = json.filter((x) => !x.isWellFormed() || loNua.test(x)).length;
const giu = json.filter((x) => x.includes("M".repeat(39)) && x.includes("x".repeat(5))).length;
console.log(`${json.length} ${hong} ${giu}`);
' 2>&1 | tail -1)
set -- $do_hua
[ "${1:-0}" -ge 2 ] && [ "${2:-1}" -eq 0 ] && [ "${3:-0}" -ge 2 ]; ket "⑤a-chữ-bộ-não-cắt-qua-hai-cửa-jsonb-ra-JSON-lành" $? "cửa bắt được=${1:-?} (đòi ≥2) · JSON còn nửa cặp=${2:-?} (đòi 0) · giữ đủ chữ trước chỗ cắt=${3:-?} (đòi ≥2) · ${do_hua}"
git diff --quiet "$BASE" -- src/queue/worker.js; ket "⑤b-worker.js-không-đổi-(luật-«lỗi-sau-gửi-⇒-giao-sale»-ngoài-phạm-vi)" $? "$(git diff --stat "$BASE" -- src/queue/worker.js | tail -1)"
n_slice=$(grep -cE "\.slice\(0, (60|200|600)\)" src/chat/handler-v3.js)
cat_lanh=$(node --input-type=module -e '
import { catChu } from "./src/text.js";
const ca = [["a".repeat(199) + "📦b", 200], ["b".repeat(599) + "🎁c", 600], ["c".repeat(59) + "😀d", 60]];
console.log(ca.filter(([s, n]) => { const r = catChu(s, n); return r.isWellFormed() && s.startsWith(r) && r.length >= n - 1; }).length);
' 2>&1 | tail -1)
[ "$n_slice" -eq 0 ] && [ "$cat_lanh" = "3" ]; ket "⑤c-handler-v3-không-còn-chỗ-cắt-TRẦN-+-catChu-lành-ở-biên-emoji" $? "slice(0,60|200|600) còn=$n_slice (đòi 0) · catChu lành+tiền tố ở 3 biên (200·600·60)=${cat_lanh} (đòi 3)"
n_hc=$(grep -cE 'catChu\(dinh' src/orders/hang-cho.js)
[ "$n_hc" -eq 1 ]; ket "⑤d-hang-cho.js:479-đi-catChu" $? "catChu(dinh… =$n_hc (đòi 1)"
cu=0; for t in gia-lap-mot-minh bao-cao-24h dich-ban-may dien-tap-hoi-thoai do-lop-0-dong dem-token-kimi phat-lai-lich-su nap-khoa-nha gia-lap-dong-thoi-gian; do
  grep -qF '/^[A-Z0-9_]+=/.test(l)' "ops/bin/$t.mjs" && cu=$((cu+1))
done
[ "$cu" -eq 0 ]; ket "⑤e-không-công-cụ-nào-còn-khối-đọc-env-tự-viết" $? "còn=$cu/9"
n_re=$(grep -cF '[\uD800-\uDBFF](?![\uDC00-\uDFFF])' src/text.js)
[ "$n_re" -eq 1 ]; ket "⑤f-text.js-một-regex-xoá-nửa-cặp-cho-đường-bot-(②1)" $? "regex xoá nửa đầu lẻ xuất hiện $n_re lần (đòi 1)"

# ⑥ ĐẢO-VÁ (④6) trên BẢN SAO TẠM — mỗi đột biến một tiến trình node mới. Luật đọc: các ca khai PHẢI nằm trong tập đỏ.
if [ "${BO_DAO_VA:-0}" != 1 ]; then
T=$(mktemp -d "${TMPDIR:-/tmp}/gl8.XXXXXX"); [ "${GIU_TAM:-0}" = 1 ] && echo "GIU_TAM=1 — giữ $T" || trap 'rm -rf "$T"' EXIT
mkdir -p "$T/test" "$T/ops"
chep() { rm -rf "$T/src" "$T/db" "$T/v3" "$T/ops/bin"; mkdir -p "$T/v3"; cp -R src "$T/src"; cp -R db "$T/db"; cp -R v3/src "$T/v3/src"
  cp -R v3/testkit "$T/v3/testkit"; cp -R ops/bin "$T/ops/bin"; }
chep; cp test/_an-toan.mjs "$CA_C" "$CA_W" "$CA_L" "$CA_E" "$T/test/"
cp package.json "$T/"; ln -s "$GOC/node_modules" "$T/node_modules"; [ -f .env ] && ln -s "$GOC/.env" "$T/.env"
dot() { (cd "$T" && node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "$@" 2>&1); }
dot_bien() { # dot_bien <tên đột biến> — bảng đột biến ở dưới; mỗi chuỗi gốc phải khớp ĐÚNG MỘT lần
  python3 - "$T" "$1" <<'PY'
import os, sys
T, ten = sys.argv[1], sys.argv[2]
H, S, K, HC, TX = "src/chat/handler-v3.js", "src/chat/so-ai.js", "src/chat/kho.js", "src/orders/hang-cho.js", "src/text.js"
BO_LUOI_SO = (S, "jsonLanh(duLieu ?? {})", "JSON.stringify(duLieu ?? {})")
BO_LUOI_KHO = (K, "jsonLanh(giaTri[c] ?? null)", "JSON.stringify(giaTri[c] ?? null)")
BO_LUOI_HC = [(HC, "      jsonLanh({\n", "      JSON.stringify({\n"), (HC, "      jsonLanh(cuaKiem),\n", "      JSON.stringify(cuaKiem),\n")]
KEP_MOI = 'const env = parseEnv(fs.readFileSync(process.env.DEVENV, "utf8"));'
KEP_CU = ('const env = Object.fromEntries(fs.readFileSync(process.env.DEVENV, "utf8").split("\\n")\n'
          '  .filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));')
DON_MOI = "const env = parseEnv(fs.readFileSync(process.env.DEVENV, 'utf8'));"
DON_CU = ("const env = Object.fromEntries(fs.readFileSync(process.env.DEVENV, 'utf8').split('\\n')\n"
          "  .filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => {\n"
          "    const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^\"|\"$/g, '')];\n  }));")
BANG = {
  "971": [(H, "text: catChu(guarded, 200),", "text: guarded.slice(0, 200),"), BO_LUOI_SO],
  "bo-luoi": [BO_LUOI_SO, BO_LUOI_KHO, *BO_LUOI_HC],
  "668-744-906": [(H, "duLieu: { text: catChu(cua.text, 200), rule: tk.rule,", "duLieu: { text: cua.text.slice(0, 200), rule: tk.rule,"),
                  (H, "duLieu: { text: catChu(cua.text, 200), ...(cua.daSua", "duLieu: { text: cua.text.slice(0, 200), ...(cua.daSua"),
                  (H, "text_bi_chan: catChu(guarded0, 600)", "text_bi_chan: guarded0.slice(0, 600)"), BO_LUOI_SO],
  "647-717": [(H, "text_bi_chan: catChu(tk.reply, 600)", "text_bi_chan: String(tk.reply).slice(0, 600)"),
              (H, "text_bi_chan: catChu(fl.reply, 600)", "text_bi_chan: String(fl.reply).slice(0, 600)"), BO_LUOI_SO],
  "479": [(HC, 'catChu(dinh.replace(/\\s+/g, " ").trim(), 60)', 'dinh.replace(/\\s+/g, " ").trim().slice(0, 60)'), *BO_LUOI_HC],
  "ham-slice-tran": [(TX, "  return boNuaCapLe(String(str == null ? '' : str).slice(0, max));", "  return String(str == null ? '' : str).slice(0, max);"), BO_LUOI_SO],
  "luoi-sau-stringify": [(TX, "  return JSON.stringify(giaTri, (_k, v) => (typeof v === 'string' ? boNuaCapLe(v) : v));",
                          "  const j = JSON.stringify(giaTri); return j === undefined ? j : boNuaCapLe(j).toWellFormed();")],
  "bo-dong-co": [("ops/bin/gia-lap-mot-minh.mjs", "console.log(`  cờ đã đọc         : ", "void (`  cờ đã đọc         : ")],
  "bo-luoi-so": [BO_LUOI_SO],
  "bo-luoi-kho": [BO_LUOI_KHO],
  "bo-luoi-hc": BO_LUOI_HC,
}
if ten.startswith("env:"):
    tep = f"ops/bin/{ten[4:]}.mjs"
    s = open(os.path.join(T, tep)).read()
    BANG[ten] = [(tep, KEP_MOI, KEP_CU)] if KEP_MOI in s else [(tep, DON_MOI, DON_CU)]
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
# — bốn vế của ④6 —
dao "⑥a-:971-về-slice-+-bỏ-lưới-so_ai-⇒-W2-đỏ" "W2" "GL8 W2 ·" "971" "test/$(basename "$CA_W")"
dao "⑥b-bỏ-lưới-ba-cửa-GIỮ-hàm-cắt-⇒-L4a·L4b·L4c-đỏ" "L4a L4b L4c" "GL8 L4[abc] ·" "bo-luoi" "test/$(basename "$CA_L")"
dao "⑥c-:668/:744-+-:906-về-slice-+-bỏ-lưới-⇒-W3a·W3b·W3c-đỏ" "W3a W3b W3c" "GL8 W3[abc] ·" "668-744-906" "test/$(basename "$CA_W")"
for t in gia-lap-mot-minh bao-cao-24h dich-ban-may dien-tap-hoi-thoai do-lop-0-dong dem-token-kimi phat-lai-lich-su nap-khoa-nha gia-lap-dong-thoi-gian; do
  case $t in gia-lap-mot-minh) e=E2a;; bao-cao-24h) e=E2b;; dich-ban-may) e=E2c;; dien-tap-hoi-thoai) e=E2d;; do-lop-0-dong) e=E2e;;
             dem-token-kimi) e=E2f;; phat-lai-lich-su) e=E2g;; nap-khoa-nha) e=E2h;; gia-lap-dong-thoi-gian) e=E2i;; esac
  dao "⑥d-$t-trả-khối-đọc-env-cũ-⇒-$e-đỏ" "$e" "GL8 $e ·" "env:$t" "test/$(basename "$CA_E")"
done
# — thêm ngoài danh sách ④6: các chỗ cắt còn lại + «đột biến nào KHÔNG đỏ» hay lọt —
dao "⑥e-:647/:717-về-slice-+-bỏ-lưới-⇒-W3d·W3e-đỏ" "W3d W3e" "GL8 W3[de] ·" "647-717" "test/$(basename "$CA_W")"
dao "⑥f-hang-cho.js:479-về-slice-+-bỏ-lưới-hàng-chờ-⇒-W5-(chốt-đơn-mất-dòng)-đỏ" "W5" "GL8 W5 ·" "479" "test/$(basename "$CA_W")"
dao "⑥g-catChu-thành-slice-trần-+-bỏ-lưới-⇒-C1·W2-đỏ" "C1 W2" "GL8 (C1|W2) ·" "ham-slice-tran" "test/$(basename "$CA_C")" "test/$(basename "$CA_W")"
dao "⑥h-lưới-dọn-SAU-stringify-(bẫy-②2)-⇒-J1·L4a·L4b·L4c-đỏ" "J1 L4a L4b L4c" "GL8 (J1|L4[abc]) ·" "luoi-sau-stringify" "test/$(basename "$CA_C")" "test/$(basename "$CA_L")"
dao "⑥i-bỏ-dòng-«cờ-đã-đọc»-⇒-E3-đỏ" "E3" "GL8 E3 ·" "bo-dong-co" "test/$(basename "$CA_E")"
# — sau đối kháng chặng 2 (F1): hồ sơ cắt ở BỘ NÃO (`context.js:232-236`) đi qua worker — MỖI lưới gỡ riêng lẻ phải làm W6 đỏ —
dao "⑥j-chỉ-bỏ-lưới-so_ai-⇒-W6-(so_ai-order-ho_so)-đỏ" "W6" "GL8 W6 ·" "bo-luoi-so" "test/$(basename "$CA_W")"
dao "⑥k-chỉ-bỏ-lưới-kho.js-⇒-W6-(hoi_thoai.ho_so)-đỏ" "W6" "GL8 W6 ·" "bo-luoi-kho" "test/$(basename "$CA_W")"
dao "⑥l-chỉ-bỏ-lưới-hàng-chờ-⇒-W6-(du_lieu_don)-đỏ" "W6" "GL8 W6 ·" "bo-luoi-hc" "test/$(basename "$CA_W")"
chep; o=$(dot "test/$(basename "$CA_C")" "test/$(basename "$CA_W")" "test/$(basename "$CA_L")" "test/$(basename "$CA_E")"); f=$(so "$o" fail); p=$(so "$o" pass)
[ "${f:-1}" -eq 0 ] && [ "${p:-0}" -ge 26 ]; ket "⑥0-bản-sao-nguyên-vẹn-xanh-(thước-không-tự-đỏ)" $? "pass=${p:-?} fail=${f:-?}"
else
  echo "⏸ ⑥đảo-vá HOÃN (BO_DAO_VA=1)"
fi

# ⑦ npm test — chỉ khi CHAY_NPM_TEST=1. Thước: fail=0 (mốc trước/sau ghi ở nhật ký GL8).
if [ "${CHAY_NPM_TEST:-}" = 1 ]; then
  o=$(npm test 2>&1); nt=$(so "$o" tests); nf=$(so "$o" fail)
  [ "${nf:-1}" -eq 0 ]; ket "⑦npm-test" $? "tests=${nt:-?} fail=${nf:-?}"
else
  echo "⏸ ⑦npm-test HOÃN (CHAY_NPM_TEST=1 để chạy — nhật ký GL8 ghi số trước/sau)"
fi

echo "== ĐỎ $do / XANH $xanh (DB khai: $DB)"
[ "$do" -eq 0 ]
