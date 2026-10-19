#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU GL10 — bot v3 tự bảo ai_sale (pancake-tool) nhường page bằng khoá `_v3` trong `page_gan_them.json` · chỉ trả lời
# tin khách đến SAU mốc bật. Thi hành 13 phép ④ của docs/thi-cong/phieu/PHIEU-GL10.md. rc=0 là đạt.
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT BẢNG ĐẾM. Không dòng nào chỉ nói "chạy xong không lỗi".
#
# Tầm đo: lưới HỒI QUY (luật 32) do chính thợ viết, trên MÁY DEV — không đo prod, không đo `aicloser_v3`. Hộp cát Postgres riêng mỗi
# tệp ca (`db/sandbox.js`, hậu tố `_p<pid>`, tự dựng tự dọn). ⛔ `page_gan_them.json` + log ai_sale là tệp TẠM (mkdtemp) — cổng KHÔNG
# đọc/ghi `/opt/pancake-tool` hay `/var/log`. Ngữ nghĩa ai_sale đo bằng BẢN CHÉP NGUYÊN VĂN ba hàm `ai_sale.py` (đọc chỉ-đọc 19/10) chạy
# `python3 -I` — mã ai_sale đổi gần như hằng ngày: bước mở van ② 5 phải đối chiếu lại thân ba hàm trên prod trước lần gạt đầu.
# Đảo-vá trên BẢN SAO TẠM (src · db · v3/src · v3/testkit · tệp ca), mỗi đột biến một tiến trình node mới (bẫy 15). Chỉ `grep -E`.
# Cờ: GIU_TAM=1 giữ bản sao · BO_DAO_VA=1 bỏ ⑫ · BO_CONG_CU=1 bỏ ⑬ cổng cũ · CHAY_NPM_TEST=1 chạy npm test ở ⑬.
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "$@" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+' | head -1; }
do_ten() { echo "$1" | grep -E "^\s*✖ GL10 [A-Za-z0-9]+ ·" | sed -E 's/^\s*✖ GL10 ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
xanh_ten() { echo "$1" | grep -E "^\s*✔ GL10 [A-Za-z0-9]+ ·" | sed -E 's/^\s*✔ GL10 ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
BASE=a6f670d
DB="aicloser_v3_nt_gl10_p$$"   # khai theo khuôn; mỗi tệp ca tự dựng hộp cát riêng (aicloser_v3_test_gl10{c,w,m,k}_p<pid>)
if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/[[:space:]]*#.*$//;s/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát"; exit 2; }
command -v python3 >/dev/null || { echo "🔴 thiếu python3 — bản chép ai_sale không chạy được"; exit 2; }
noi=$(node -e 'const u=new URL(process.env.DATABASE_URL_V3);console.log(`${u.hostname}:${u.port||5432}`)' 2>/dev/null || echo "?")
echo "── môi trường: máy dev · hộp cát Postgres trên $noi (aicloser_v3_test_gl10*_p<pid>, tự dựng tự dọn) · cây $GOC · $(git rev-parse --short HEAD) · node $(node -v) · TZ máy=${TZ:-(chưa đặt)}"
CA_T=test/gl10-tep-ai-sale.test.mjs
CA_C=test/gl10-cong-bat-tat.test.mjs
CA_W=test/gl10-worker-nhuong.test.mjs
CA_M=test/gl10-moc-bat.test.mjs
CA_K=test/gl10-chua-035.test.mjs

# ⓪ luật 1 §0a: máy này vẫn CHỈ ĐỌC (ca tự mở van trong tiến trình, không đụng .env)
ro=$(grep -E '^PANCAKE_READONLY=' .env 2>/dev/null | tail -1 | cut -d= -f2 | sed 's/[[:space:]]*#.*$//')
[ "$ro" = "1" ]; ket "⓪.env-PANCAKE_READONLY=1" $? "đọc được: '${ro:-vắng}'"

# ①–⑪ bộ ca — mỗi phép của ④ có ca XANH riêng (bảng đếm thấy/đòi), thước SÀN (fail=0, pass ≥ số tên đòi)
bo_ca() { # bo_ca <nhãn> <các tên phải xanh> <tệp ca…>
  local nhan="$1" can="$2"; shift 2
  local o p f co t thieu=""; o=$(chay "$@"); p=$(so "$o" pass); f=$(so "$o" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
  co=$(xanh_ten "$o"); for t in $can; do echo " $co " | grep -qF " $t " || thieu="$thieu$t "; done
  [ "$f" -eq 0 ] && [ "$p" -ge "$(echo "$can" | wc -w)" ] && [ -z "$thieu" ]
  ket "$nhan" $? "pass=$p fail=$f · xanh: ${co:-không}(đòi: $can)${thieu:+ THIẾU: $thieu}"
  echo "$o" | grep -E "^\s*\[gl10[tcwmk]\] " | sed 's/^ */   · /' | cut -c1-200
}
bo_ca "①②③(mô-đun)-đọc·gắn-tay·ghi-giữ-khoá-lạ+bản-chép-ai_sale·nguyên-tử·quyền·số-lớn·ghi-chen·tệp-vắng·giờ-Pancake" "D1 D2 G1 G1b G2a G2b G2c G2d G2e M1" "$CA_T"
bo_ca "①③④⑥⑦⑨(HTTP-thật)-bật/tắt-qua-cửa-công-tắc·409-tệp-hỏng/vắng/biến-vắng/gắn-tay·màn-aiSale·tắt(+chết-giữa·bật-chen)·tin-cũ·bù·bật-lại-giữ-nguyên" "C1 C3a C3b C3c C6a C6b C6c C6d C6e C6f C7 C9 C10" "$CA_C"
bo_ca "④⑧⑩(worker-thật)-chờ-không-nạp/xử·4-vòng-song-song·2-vòng-nạp·mất-khoá/hỏng/gắn-tay(+mốc-đặt-lại)·log-ai_sale(+ranh-giới·khối-BỎ-QUA·đổi-tên)" "W4a W4b W4c W8 W8b W10a W10b W10c W10d W10e W10f W10g W10h" "$CA_W"
for tz in Europe/Berlin UTC; do
  o=$(TZ=$tz PGTZ=$tz chay "$CA_M"); p=$(so "$o" pass); f=$(so "$o" fail); co=$(xanh_ten "$o")
  [ "${f:-1}" -eq 0 ] && echo " $co " | grep -qF " B5 " && echo " $co " | grep -qF " B5b "
  ket "⑤mốc-bật-dưới-TZ=$tz-(A·B·C·D·giờ-rác·cụm-trước-mốc·NULL=cũ)" $? "pass=${p:-?} fail=${f:-?} · xanh: ${co:-không}"
  echo "$o" | grep -E "^\s*\[gl10m\] " | sed 's/^ */   · /' | cut -c1-160
done
bo_ca "⑪CSDL-chưa-áp-035-(bật-409·worker-không-sập-cảnh-báo-1-lần·tắt-chạy)" "K11" "$CA_K"

# tĩnh (PHỤ — hành vi đã đo ở trên; các phép này canh phạm vi + lời khai)
NAO="src/prompts.js src/closer.js src/tools.js src/fast-lane.js src/outbound-guard.js src/context.js src/lead-score.js src/conv-owner.js src/chat/handler-v3.js"
# shellcheck disable=SC2086
git diff --quiet "$BASE" -- $NAO; ket "Ta-bộ-não-+-handler-v3.js-không-đổi-từ-base-$BASE-(BH9-song-song)" $? "$(git diff --stat "$BASE" -- $NAO | tail -1)"
n_rt=$(grep -c 'WHERE bot_ai_bat = true' src/queue/page-routing.js)
git diff --quiet "$BASE" -- src/queue/page-routing.js && [ "$n_rt" -eq 1 ]; ket "Tb-page-routing.js-không-đổi-(neo-mb.sh:65)" $? "WHERE bot_ai_bat = true =$n_rt (đòi 1)"
khoi() { sed -n '/^export function docEnvTuyetDoi/,/^}/p'; }
[ "$(git show "$BASE:src/queue/nap.js" | khoi)" = "$(khoi < src/queue/nap.js)" ]; ket "Tc-nap.js#docEnvTuyetDoi-không-đổi-(GL9-sửa-vùng-này)" $?
node -e 'import("./db/migrate.js").then(({sinhSchema})=>{process.exit(require("fs").readFileSync("db/schema.sql","utf8")===sinhSchema()?0:1)})'
ket "Td-schema.sql-sinh-từ-migrate/-(có-035)" $? "$(grep -c '035_page_ai_sale_nhuong' db/schema.sql) lần nhắc 035"
grep -qF 'ÁP TRÊN VPS TRƯỚC KHI CHẠY MÃ GL10' db/migrate/035_page_ai_sale_nhuong.up.sql; ket "Te-035-khai-thứ-tự-«áp-VPS-trước-mã»" $?
n_bien=$(grep -rlE "BIEN_TEP_GAN\]|\.V3_AI_SALE_TEP_GAN" src v3/src --include='*.js' | tr '\n' ' ')
n_nhap=$(grep -rlE "ai-sale-nhuong\.js\"" src v3/src --include='*.js' | sort | tr '\n' ' ')
n_goi=$(for f in $n_nhap; do grep -lE "(ghiKhoa|xoaKhoa)\(" "$f"; done | tr '\n' ' ')
[ "$n_bien" = "src/queue/ai-sale-nhuong.js " ] && [ "$n_goi" = "src/admin-v3/operations.js " ] \
  && [ "$n_nhap" = "src/admin-v3/operations.js src/queue/chay-worker.js src/queue/nap.js " ]
ket "Tf-chỗ-DUY-NHẤT-đọc-biến/ghi-tệp-ai_sale-là-ai-sale-nhuong.js-(cổng-bật/tắt-gọi-qua-nó)" $? "đọc biến tệp: ${n_bien:-không} · nạp mô-đun: ${n_nhap:-không} · gọi ghi/xoá khoá: ${n_goi:-không}"
n_bien=$(grep -cE '^\| `V3_AI_SALE_(TEP_GAN|LOG)`' docs/v3/ban-giao/bien-moi-truong-v3.md)
[ "$n_bien" -eq 2 ]; ket "Tg-bảng-biến-khai-V3_AI_SALE_TEP_GAN-+-V3_AI_SALE_LOG" $? "dòng=$n_bien (đòi 2)"
n_cho=$(grep -cE '^export const CHO_AI_SALE_MS = 900_000;' src/queue/ai-sale-nhuong.js); n_env=$(grep -c 'CHO_AI_SALE' src/queue/ai-sale-nhuong.js | tr -d ' ')
[ "$n_cho" -eq 1 ] && ! grep -qE 'env[^\n]*CHO_AI_SALE|CHO_AI_SALE[^\n]*env' src/queue/ai-sale-nhuong.js; ket "Th-chờ-15′-là-HẰNG-(không-biến-môi-trường)" $? "CHO_AI_SALE_MS = 900_000 ×$n_cho · nhắc $n_env lần"

# ⑫ ĐẢO-VÁ trên BẢN SAO TẠM — mỗi đột biến một tiến trình node mới. Luật đọc: các ca khai PHẢI nằm trong tập đỏ.
T=$(mktemp -d "${TMPDIR:-/tmp}/gl10.XXXXXX"); [ "${GIU_TAM:-0}" = 1 ] && echo "GIU_TAM=1 — giữ $T" || trap 'rm -rf "$T"' EXIT
if [ "${BO_DAO_VA:-0}" != 1 ]; then
mkdir -p "$T/cay/test"
chep() { rm -rf "$T/cay/src" "$T/cay/db" "$T/cay/v3"; mkdir -p "$T/cay/v3"; cp -R src "$T/cay/src"; cp -R db "$T/cay/db"; cp -R v3/src "$T/cay/v3/src"; cp -R v3/testkit "$T/cay/v3/testkit"; }
chep; cp test/_an-toan.mjs "$CA_T" "$CA_C" "$CA_W" "$CA_M" "$CA_K" "$T/cay/test/"
cp package.json "$T/cay/"; ln -s "$(node -p 'require.resolve("pg/package.json").replace(/\/pg\/package\.json$/, "")')" "$T/cay/node_modules"; [ -f .env ] && ln -s "$GOC/.env" "$T/cay/.env"
dot() { (cd "$T/cay" && node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "$@" 2>&1); }
dot_bien() { # dot_bien <tên đột biến> — mỗi chuỗi gốc phải khớp ĐÚNG MỘT lần
  python3 - "$T/cay" "$1" <<'PY'
import os, sys
T, ten = sys.argv[1], sys.argv[2]
A, O, W, N = "src/queue/ai-sale-nhuong.js", "src/admin-v3/operations.js", "src/queue/chay-worker.js", "src/queue/nap.js"
DONG = '      const dong = await dongTinCho(c, bc.teamId, p.page_id, bat ? "bo_qua:truoc_moc_bat" : "bo_qua:tat_bot");'
BANG = {
  "ghi-thang": [(A, '      fd = fsx.openSync(tam, "wx", 0o600);', '      fd = fsx.openSync(tep, "w");')],
  "bo-chmod": [(A, "      fsx.fchmodSync(fd, Number(st0.mode & 0o7777n));\n      fsx.fchownSync(fd, Number(st0.uid), Number(st0.gid));\n", "")],
  "bo-so-lon": [(A, "    if (r.soLon) throw new LoiTepAiSale(", "    if (false) throw new LoiTepAiSale(")],
  "hong-la-rong": [(A, "    return { ok: false, loi: `tệp ${tep} không phải JSON hợp lệ (${String(e?.message || e).slice(0, 120)})` };", "    d = {};")],
  "bo-gan-tay": [(O, "    if (ganTay.length) {", "    if (false) {")],
  "bien-vang-mo": [(O, '  if (!tep) blockers.push("Chưa nối ai_sale (V3_AI_SALE_TEP_GAN vắng) — bật lúc này có thể hai bot cùng trả lời");', "  void 0;")],
  "bo-loc-sansang": [(W, "  const choPhep = nhuong ? nhuong.sanSang : choPhepTran;", "  const choPhep = choPhepTran;")],
  "bo-loc-moc": [(N, "    if (mocBat != null && !(thoiDiemPancake(moc) > mocBat)) {", "    if (false) {")],
  "date-parse-thang": [(A, '  const t = Date.parse(`${m[1]}T${m[2]}${m[3] ? m[3].toUpperCase() : "Z"}`);', "  const t = Date.parse(s);")],
  "bo-dong-tin-tat": [(O, DONG, '      const dong = bat ? await dongTinCho(c, bc.teamId, p.page_id, "bo_qua:truoc_moc_bat") : 0;')],
  "tat-xoa-khoa-truoc": [(O, "    if (tat) st.truocTat = {", "    if (tat) xoaKhoa(tepGan(env), p.page_id);\n    if (tat) st.truocTat = {")],
  "bo-dong-tin-bat": [(O, DONG, '      const dong = tat ? await dongTinCho(c, bc.teamId, p.page_id, "bo_qua:tat_bot") : 0;')],
  "bo-kiem-khoa": [(A, "    const coKhoa = tepOk && coKhoaV3(kqTep.d, pid);", "    const coKhoa = tepOk;")],
  "vong-xu-khong-kiem-tep": [(A, '    const di = tepOk && coKhoa && !ganTay.length && tt === "da_nhuong" && hetCho;',
                              '    const di = (chuyen ? tepOk && coKhoa && !ganTay.length : true) && tt === "da_nhuong" && hetCho;')],
  "bo-bu": [(O, "    if (st.khoaDaGhi && !st.khoaDaGhi.coTruoc) await buKhoa(pool, st.khoaDaGhi.tep, st.khoaDaGhi.pid);", "    void st;")],
  "bo-gia-han-log": [(A, "    return { giaHan: true, lyDo: `ai_sale còn chạm page lúc ${gio} (giờ VN)` };", "    return null;")],
  "bo-bat-42703": [(A, '    if (e?.code !== "42703") throw e;', "    throw e;")],
  "bo-kiem-truoc-rename": [(A, "      if (!cungBan(statTep(fsx, tep), st0)) {", "      if (false) {")],
  "chuyen-khong-dieu-kien": [(A, "     WHERE id = $1 AND ai_sale_trang_thai = $2 AND bot_ai_bat = true AND ($7::boolean = false OR ai_sale_cho_den <= now())",
                              "     WHERE id = $1 AND $2::text IS NOT NULL AND bot_ai_bat = true AND ($7::boolean = false OR ai_sale_cho_den <= now())")],
  "vong-xu-cung-chuyen": [(W, "{ chuyen: !deps.boQuaNap, ", "{ chuyen: true, ")],
  "bo-vi": [(A, "    const ganTay = tepOk ? khoaGanTay(kqTep.d, pid) : [];", "    const ganTay = [];")],
  "xoa-hong-khong-xet": [(O, '  const coBangChung = (t.co035 && t.trangThai !== "") || thayKhoa;', "  const coBangChung = true;")],
  "cua-so-dong-30": [(A, "Number(r.tuoi_bat_ms) >= MO_CUA_SO_LOG_MS).map(", "Number(r.tuoi_bat_ms) >= MO_CUA_SO_LOG_MS && Number(r.tuoi_bat_ms) <= TRAN_CHUA_NHUONG_MS).map(")],
  "offset-0-restart": [(A, '    if (!muc) { muc = { off: daDatLai ? size : 0, duoi: "", sauBoQua: false }; _log.tep.set(khoa, muc); }',
                         '    if (!muc) { muc = { off: 0, duoi: "", sauBoQua: false }; _log.tep.set(khoa, muc); }')],
  # — sau /code-review (10 điểm) —
  "khong-dat-lai-moc": [(A, "       bot_bat_luc = CASE WHEN $5::boolean THEN now() ELSE bot_bat_luc END,\n", "")],
  "bat-lai-day-du": [(O, '  st.dangPhucVu = p.bot_ai_bat === true && ["cho", "da_nhuong"].includes(p.ai_sale_trang_thai)',
                      '  st.dangPhucVu = false && p.bot_ai_bat === true && ["cho", "da_nhuong"].includes(p.ai_sale_trang_thai)')],
  "log-khop-tho": [(A, "      if (boQua) continue;\n      for (const pid of pids) if (!thay.has(pid) && coPid(dong, pid)) thay.add(pid);",
                    "      void boQua;\n      for (const pid of pids) if (dong.includes(pid)) thay.add(pid);")],
  "log-theo-ten": [(A, "    const khoa = `${st.dev}:${st.ino}`;", "    const khoa = tep;")],
  "tat-khong-danh-dau": [(O, "ai_sale_trang_thai=CASE WHEN ai_sale_trang_thai <> '' THEN 'xoa_hong' ELSE '' END,", "ai_sale_trang_thai='',")],
  "tat-go-khoa-khi-bat-lai": [(O, '      if (dong?.bot_ai_bat === true) { batLai = dong.ai_sale_trang_thai ?? ""; return; }', "      void dong;")],
  "ghi-khong-kiem-gan-tay": [(A, "    if (ganTay.length) throw new LoiTepAiSale(`page đang được gắn tay", "    if (false) throw new LoiTepAiSale(`page đang được gắn tay")],
  "bo-chan-tep-hong": [(O, "    if (!t.ok) {\n      aiSaleChiTiet.loiTep = t.loi;", "    if (false) {\n      aiSaleChiTiet.loiTep = t.loi;")],
  "so-thuc-cho-qua": [(A, "      if (j < s.length && /[.eE]/.test(s[j])) return true;   // số thực (phần lẻ / số mũ)\n", "")],
  "cho-720": [(A, "export const CHO_AI_SALE_MS = 900_000;", "export const CHO_AI_SALE_MS = 720_000;")],
  "giu-v3-rong": [(A, "    if (!Object.keys(d[KHOA_V3]).length) delete d[KHOA_V3];\n", "")],
}
for tep, a, b in BANG[ten]:
    p = os.path.join(T, tep); s = open(p).read()
    assert s.count(a) == 1, f"{tep}: chuỗi gốc xuất hiện {s.count(a)} lần: {a[:70]!r}"
    open(p, "w").write(s.replace(a, b))
PY
}
dao() { # dao <nhãn> <các ca phải ĐỎ> <mẫu tên> <tên đột biến> <tệp ca…>  (TZ của lượt: biến DAO_TZ)
  local nhan="$1" phai="$2" mau="$3" ten="$4"; shift 4
  chep
  if ! dot_bien "$ten"; then ket "$nhan" 1 "đột biến không áp được (chuỗi gốc đổi?)"; return; fi
  local o r t thieu=""; o=$(TZ=${DAO_TZ:-Europe/Berlin} dot --test-name-pattern="$mau" "$@"); r=$(do_ten "$o")
  for t in $phai; do echo " $r " | grep -qF " $t " || thieu="$thieu$t "; done
  [ -z "$thieu" ]; ket "$nhan" $? "đỏ: ${r:-không} (đòi đỏ: $phai)"
}
t_() { echo "test/$(basename "$1")"; }
# — các vế của ④12 —
dao "⑫a-ghi-thẳng-tệp-đích-⇒-G2a" "G2a" "GL10 G2a ·" "ghi-thang" "$(t_ "$CA_T")"
dao "⑫b-bỏ-chmod/chown-⇒-G2b" "G2b" "GL10 G2b ·" "bo-chmod" "$(t_ "$CA_T")"
dao "⑫c-bỏ-kiểm-số-lớn-⇒-G2c" "G2c" "GL10 G2c ·" "bo-so-lon" "$(t_ "$CA_T")"
dao "⑫d-tệp-hỏng-coi-là-{}-⇒-C3a·D1" "C3a D1" "GL10 (C3a|D1) ·" "hong-la-rong" "$(t_ "$CA_C")" "$(t_ "$CA_T")"
dao "⑫e-bỏ-từ-chối-gắn-tay-⇒-C3c" "C3c" "GL10 C3c ·" "bo-gan-tay" "$(t_ "$CA_C")"
dao "⑫f-bỏ-lọc-sanSang-ở-chay-worker-⇒-W4a" "W4a" "GL10 W4a ·" "bo-loc-sansang" "$(t_ "$CA_W")"
dao "⑫g-bỏ-lọc-mốc-ở-bộ-nạp-⇒-B5" "B5" "GL10 B5 ·" "bo-loc-moc" "$(t_ "$CA_M")"
dao "⑫h-thoiDiemPancake-về-Date.parse-thẳng-⇒-B5(D)·M1-dưới-Berlin" "B5 M1" "GL10 (B5|M1) ·" "date-parse-thang" "$(t_ "$CA_M")" "$(t_ "$CA_T")"
dao "⑫i-bỏ-đóng-tin-khi-tắt-⇒-C6a" "C6a" "GL10 C6a ·" "bo-dong-tin-tat" "$(t_ "$CA_C")"
dao "⑫j-đảo-thứ-tự-tắt-(xoá-khoá-trước)-⇒-C6c" "C6c" "GL10 C6c ·" "tat-xoa-khoa-truoc" "$(t_ "$CA_C")"
dao "⑫k-bỏ-đóng-tin-khi-bật-⇒-C7" "C7" "GL10 C7 ·" "bo-dong-tin-bat" "$(t_ "$CA_C")"
dao "⑫l-bỏ-kiểm-khoá-mỗi-vòng-⇒-W8" "W8" "GL10 W8 ·" "bo-kiem-khoa" "$(t_ "$CA_W")"
dao "⑫l2-vòng-xử-không-kiểm-tệp-(chỉ-vòng-nạp)-⇒-W8" "W8" "GL10 W8 ·" "vong-xu-khong-kiem-tep" "$(t_ "$CA_W")"
dao "⑫m-bỏ-bù-⇒-C9" "C9" "GL10 C9 ·" "bo-bu" "$(t_ "$CA_C")"
dao "⑫n-bỏ-gia-hạn-theo-log-⇒-W10a" "W10a" "GL10 W10a ·" "bo-gia-han-log" "$(t_ "$CA_W")"
dao "⑫o-bỏ-bắt-42703-⇒-K11" "K11" "GL10 K11 ·" "bo-bat-42703" "$(t_ "$CA_K")"
# — soát (a) —
dao "⑫p-bỏ-kiểm-(ino,mtime,size)-trước-rename-⇒-G2d" "G2d" "GL10 G2d ·" "bo-kiem-truoc-rename" "$(t_ "$CA_T")"
dao "⑫q-chuyển-trạng-thái-KHÔNG-điều-kiện-⇒-W4c-(2-vòng-nạp)" "W4c" "GL10 W4c ·" "chuyen-khong-dieu-kien" "$(t_ "$CA_W")"
dao "⑫q2-vòng-xử-cũng-chuyển/đọc-log-⇒-W4b" "W4b" "GL10 W4b ·" "vong-xu-cung-chuyen" "$(t_ "$CA_W")"
dao "⑫r-bỏ-(vi)-gắn-tay-ở-worker-⇒-W8" "W8" "GL10 W8 ·" "bo-vi" "$(t_ "$CA_W")"
dao "⑫s-xoa_hong-không-xét-«đã-từng-ghi-khoá»-⇒-C6d" "C6d" "GL10 C6d ·" "xoa-hong-khong-xet" "$(t_ "$CA_C")"
dao "⑫t-cửa-sổ-log-đóng-sau-30′-⇒-W10d" "W10d" "GL10 W10d ·" "cua-so-dong-30" "$(t_ "$CA_W")"
dao "⑫u-offset-0-sau-restart-⇒-W10e" "W10e" "GL10 W10e ·" "offset-0-restart" "$(t_ "$CA_W")"
dao "⑫v-CHO_AI_SALE_MS-về-720-000-⇒-W4a·C1" "W4a C1" "GL10 (W4a|C1) ·" "cho-720" "$(t_ "$CA_W")" "$(t_ "$CA_C")"
# — thêm ngoài danh sách ④12 —
dao "⑫w-bỏ-câu-chặn-«biến-vắng»-ở-pageStatus-⇒-C3b" "C3b" "GL10 C3b ·" "bien-vang-mo" "$(t_ "$CA_C")"
dao "⑫x-xoá-mục-cuối-mà-giữ-_v3-rỗng-⇒-G1·C1" "G1 C1" "GL10 (G1|C1) ·" "giu-v3-rong" "$(t_ "$CA_T")" "$(t_ "$CA_C")"
# — sau /code-review (mỗi điểm đã vá có một đột biến đo bản SAU vá — bẫy 26) —
dao "⑫y1-khoá-có-lại-mà-KHÔNG-đặt-lại-mốc-bật-⇒-W8b" "W8b" "GL10 W8b ·" "khong-dat-lai-moc" "$(t_ "$CA_W")"
dao "⑫y2-gạt-BẬT-lại-page-đang-phục-vụ-chạy-lượt-đầy-đủ-⇒-C10" "C10" "GL10 C10 ·" "bat-lai-day-du" "$(t_ "$CA_C")"
dao "⑫y3-log-khớp-chuỗi-con-thô-(không-ranh-giới,-không-bỏ-khối-BỎ-QUA)-⇒-W10g" "W10g" "GL10 W10g ·" "log-khop-tho" "$(t_ "$CA_W")"
dao "⑫y4-offset-log-theo-TÊN-(không-theo-inode)-⇒-W10h" "W10h" "GL10 W10h ·" "log-theo-ten" "$(t_ "$CA_W")"
dao "⑫y5-TẮT-giao-dịch-1-không-đánh-dấu-xoa_hong-⇒-C6e" "C6e" "GL10 C6e ·" "tat-khong-danh-dau" "$(t_ "$CA_C")"
dao "⑫y6-TẮT-giao-dịch-2-gỡ-khoá-dù-page-vừa-được-bật-lại-⇒-C6f" "C6f" "GL10 C6f ·" "tat-go-khoa-khi-bat-lai" "$(t_ "$CA_C")"
dao "⑫y7-ghiKhoa-không-kiểm-lại-gắn-tay-⇒-G1b" "G1b" "GL10 G1b ·" "ghi-khong-kiem-gan-tay" "$(t_ "$CA_T")"
dao "⑫y8-pageStatus-im-khi-tệp-hỏng/vắng-⇒-C3a" "C3a" "GL10 C3a ·" "bo-chan-tep-hong" "$(t_ "$CA_C")"
dao "⑫y9-số-thực-cho-ghi-⇒-G2c" "G2c" "GL10 G2c ·" "so-thuc-cho-qua" "$(t_ "$CA_T")"
chep; o=$(TZ=Europe/Berlin dot "$(t_ "$CA_T")" "$(t_ "$CA_C")" "$(t_ "$CA_W")" "$(t_ "$CA_M")" "$(t_ "$CA_K")"); f=$(so "$o" fail); p=$(so "$o" pass)
[ "${f:-1}" -eq 0 ] && [ "${p:-0}" -ge 39 ]; ket "⑫0-bản-sao-nguyên-vẹn-xanh-(thước-không-tự-đỏ)" $? "pass=${p:-?} fail=${f:-?}"
else
  echo "⏸ ⑫đảo-vá HOÃN (BO_DAO_VA=1)"
fi

# ⑬ cổng cũ — gl2.sh rc=0 (đòi buộc); các cổng khác KHÔNG thêm dòng đỏ so với chính chúng trên base (đo 19/10 trong bản sao base,
#    nhật ký GL10). Cổng lồng treo ⇒ chạy riêng (N-THUOC-CHAP-CHON). `rg` máy dev là hàm zsh ⇒ tự dựng shim grep -E khi thiếu.
if [ "${BO_CONG_CU:-0}" != 1 ]; then
  if ! type -P rg >/dev/null; then
    mkdir -p "$T/shim"; printf '%s\n' '#!/bin/bash' 'q=; args=(); for a in "$@"; do case $a in -q) q=1;; *) args+=("$a");; esac; done' \
      'if [ -n "$q" ]; then exec grep -Eq "${args[@]}"; else exec grep -E "${args[@]}"; fi' > "$T/shim/rg"; chmod +x "$T/shim/rg"; export PATH="$T/shim:$PATH"
  fi
  # số dòng đỏ trên base (bản sao 1b16a79 = mã a6f670d) — đo 19/10; xem nhật ký GL10 mục «cổng cũ»
  nen() { case "$1" in l2-m1) echo 3;; va-r1) echo 2;; *) echo 0;; esac; }   # bash 3.2 của macOS: không mảng kết hợp
  # ĐỎ ĐÃ BIẾT do chính GL10 làm thước cũ già (KHÔNG phải mã sai — nhật ký GL10, nợ đề nghị N-GL10-GL3B-5C): đột biến `gl3b.sh ⑤c` gỡ tệp
  # 033 để CHECK `nap_bo_qua` mất mã `doc_tin_loi` — 035 dựng lại CHECK đủ 8 mã nên N1 hết đỏ (chỉ N5 đỏ). Đếm RIÊNG, in ra, không nuốt:
  # đúng dòng đó + dòng lồng «gl3b.sh rc=1 · == ĐỎ 1 /» (gl4 ⑥ · gl3c ④). gl3b có thêm dòng đỏ nào khác ⇒ dòng lồng thành «ĐỎ 2» ⇒ vẫn đếm.
  BIET='⑤c-bỏ-migration-033-⇒-4b-đỏ-\(dòng-doc_tin_loi-\+-the_chan\) đỏ: N5  \(đòi đỏ: N1 N5\)|gl3b\.sh rc=1 · == ĐỎ 1 / '
  for g in gl2 mb gl4 gl3c gl3b l2-m1 va-r1 gl1 gd1; do
    o=$(bash "ops/bin/nghiem-thu/$g.sh" 2>&1); rc=$?; n=$(nen "$g")
    d=$(echo "$o" | grep -E "^(🔴|   ✘)" | grep -cvE "$BIET"); b=$(echo "$o" | grep -E "^(🔴|   ✘)" | grep -cE "$BIET")
    if [ "$g" = gl2 ]; then [ "$rc" -eq 0 ]; else [ "$d" -le "$n" ]; fi
    ket "⑬cổng-cũ-$g.sh" $? "rc=$rc · dòng đỏ=$d (nền base=$n)$([ "$b" -gt 0 ] && echo " · đỏ đã biết (gl3b ⑤c ↔ 035)=$b") · $(echo "$o" | grep -E "ĐỎ [0-9]+|PHÉP=" | tail -1 | cut -c1-80)"
    [ "$d" -gt "$n" ] && echo "$o" | grep -E "^(🔴|   ✘)" | grep -vE "$BIET" | head -5 | sed 's/^/   ↳ /'
  done
else
  echo "⏸ ⑬cổng-cũ HOÃN (BO_CONG_CU=1)"
fi
if [ "${CHAY_NPM_TEST:-}" = 1 ]; then
  o=$(npm test -- --test-force-exit 2>&1); nt=$(so "$o" tests); nf=$(so "$o" fail)
  [ "${nf:-1}" -eq 0 ] && [ "${nt:-0}" -ge 2827 ]; ket "⑬npm-test-không-tụt" $? "tests=${nt:-?} fail=${nf:-?} (mốc 2827; đỏ chập chờn đã biết l0-m2-gop-cua-hep G6 — chạy riêng)"
else
  echo "⏸ ⑬npm-test HOÃN (CHAY_NPM_TEST=1 để chạy — nhật ký GL10 ghi số trước/sau)"
fi

echo "== ĐỎ $do / XANH $xanh (DB khai: $DB)"
[ "$do" -eq 0 ]
