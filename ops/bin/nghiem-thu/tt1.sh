#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU TT1 — «ĐƠN VỊ TIỀN TỆ NGOÀI GCC (EUR · RON · AUD · TWD · JPY) + BẢNG THỊ TRƯỜNG → TIỀN TỆ».
# Chạy: ops/bin/nghiem-thu/tt1.sh   (rc=0 là đạt) · GIU_SANDBOX=1 giữ CSDL hộp cát · GIU_TAM=1 giữ thư mục đảo-vá.
# Thi hành ĐÚNG 8 phép của ④ trong docs/thi-cong/phieu/PHIEU-TT1.md. Mỗi phép in MỘT dòng số đo, so với đáp án lấy từ NGUỒN đo
# (BigQuery `dim_shop_project.currency_divisor` 05/10 — EUR/RON/AUD ×100 · TWD/JPY ×1), không lấy từ code bị đo.
# Tầm đo: lưới HỒI QUY do chính thợ viết. Postgres HỘP CÁT riêng `aicloser_v3_nt_tt1_p$$` (dựng bằng gói `pg` + `db/migrate.js`,
# tự dọn) — KHÔNG đo `aicloser_v3` dev, KHÔNG đo prod, không gửi tin, không gọi POS. Đảo-vá trên BẢN SAO TẠM của cây (không bao giờ
# sửa cây làm việc chung); mỗi lượt là MỘT tiến trình node mới trên CSDL dựng lại từ đầu.
# Môi trường: thiếu `DATABASE_URL_V3` thì tự nạp từ `.env` (không in giá trị). Không dùng `rg` — chỉ `grep -E`.
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
BASE=da50df6
DB="aicloser_v3_nt_tt1_p$$"
CA=test/tt1-tien-te-ngoai-gcc.test.mjs
LOI=0; PHEP=0
muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-60s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP+1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP+1)); LOI=$((LOI+1)); printf '   ✘ %s\n' "$1"; }
bang() {                       # bang <tên> <thật> <chờ>
  so "$1" "$2"
  case "$2" in *LOI-NODE*|"") truot "$1: câu đo HỎNG (không ra số) — không đọc là đạt"; return;; esac
  [ "$2" = "$3" ] && dat "$1 = $3" || truot "$1: thật=$2 · chờ=$3"
}
dem() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+' | tail -1; }
chay_ca() { (cd "$1" && node --env-file-if-exists="$GOC/.env" --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "${@:2}" 2>&1); }

if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát · rc=2"; exit 2; }
# shellcheck source=ops/bin/nghiem-thu/_csdl.sh
. "$GOC/ops/bin/nghiem-thu/_csdl.sh"
csdl_san_sang "$DB" || exit 2
URL_SB="$(_csdl_url "$DB")"

TAM=$(mktemp -d "${TMPDIR:-/tmp}/tt1-dao-va.XXXXXX")
don() {
  if [ "${GIU_SANDBOX:-0}" = 1 ]; then echo "   (giữ CSDL $DB theo GIU_SANDBOX=1)"; else pg_qt "DROP DATABASE IF EXISTS $DB WITH (FORCE)" >/dev/null 2>&1; fi
  if [ "${GIU_TAM:-0}" = 1 ]; then echo "   (giữ $TAM)"; else rm -rf "$TAM"; fi
}
trap don EXIT INT TERM

echo "CỔNG NGHIỆM THU TT1 · $(date '+%F %T') · cây $GOC @ $(git rev-parse --short HEAD) · base $BASE"
echo "── môi trường: MÁY DEV · CSDL đo $(_csdl_che "$URL_SB") (hộp cát tự dựng/tự dọn, không phải aicloser_v3 dev, không phải prod)"

# ═══ BỘ ĐO NỘI DUNG — một tệp ESM, tham số = gốc cây cần đo (cây chung hoặc bản sao đột biến). In dòng `P<n>|<số đo>`. ═══════
cat > "$TAM/do-tt1.mjs" <<'JS'
import { pathToFileURL } from 'node:url';
const R = process.argv[2]; const URL_SB = process.argv[3];
const nap = (p) => import(pathToFileURL(`${R}/${p}`).href);
const { taoPool } = await nap('db/ket-noi.js');
const { len } = await nap('db/migrate.js');
const { maHoa } = await nap('db/khoa.js');
const { saveProduct } = await nap('src/admin-v3/operations.js');
const { gopMonThanhGoc, ganPageVaoGoc, monCuaGoc, chiTietSanPhamGoc } = await nap('src/products/san-pham-goc.js');
const { docSanPhamGoiGia } = await nap('src/products/catalog.js');
const { goiGiaChoChat } = await nap('src/chat/rap-prompt.js');
const { cua2Tien, chuanHoaHoSo } = await nap('src/orders/hang-cho.js');
const { donViDoiSoat, doiSoatDonVi } = await nap('src/products/chuyen-ban-sao.js');
const teDo = (await nap('src/pos/tao-don.js'));
console.error(`   (cây đo: ${R} · cwd ${process.cwd()} · tao-don.js nạp từ ${R}/src/pos/tao-don.js · HE_SO_TE=${JSON.stringify(teDo.HE_SO_TE)})`);
const pool = taoPool(URL_SB);
const ra = (k, v) => console.log(`${k}|${v}`);
const loi = (e) => `LOI(${e?.ma || e?.status || ''}:${String(e?.message || e).slice(0, 40)})`;
try {
  await len(pool, { im: true });
  const q = (s, a = []) => pool.query(s, a);
  const mot = async (s, a = []) => (await q(s, a)).rows[0];
  const T = String((await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id);
  const u = String((await mot("INSERT INTO nguoi_dung(email,ten) VALUES('qt@tt1.cong','QT') RETURNING id")).id);
  const bc = { teamId: T, nguoiDungId: u, vai: ['quan-tri'] };
  const SHOP = { Europe: '201', Romania: '202', Taiwan: '219', Saudi: '111', Kuwait: '222', Australia: '204' };
  for (const [m, s] of Object.entries(SHOP)) await q('INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma,bat) VALUES($1,$2,$3,$4,true)', [T, m, s, maHoa('k')]);
  for (const s of Object.values(SHOP)) await q("INSERT INTO san_pham(team_id,ma,ten,sku,ton_kho,nguon) VALUES($1,$2,'101 - Ring','101',5,'pos')", [T, `${s}:r`]);
  const G = await gopMonThanhGoc(pool, T, { maGoc: 'ring', ten: 'Ring', sku: '101', posMa: Object.values(SHOP).map((s) => `${s}:r`) });
  const PG = {};
  for (const [m, s] of Object.entries(SHOP)) {
    PG[m] = String((await mot('INSERT INTO page(team_id,page_id,ten) VALUES($1,$2,$2) RETURNING id', [T, `fb-${m}`])).id);
    await ganPageVaoGoc(pool, T, G.id, { pageId: PG[m], shopId: s });
  }
  const monId = async (m) => (await monCuaGoc(pool, T, G.id, `${SHOP[m]}:r`)).id;
  const ver = async (id) => (await mot('SELECT xmin::text AS v FROM san_pham WHERE id=$1', [id])).v;
  const luu = async (m, offers) => { const id = await monId(m); return saveProduct(pool, bc, id, { offers, version: await ver(id) }, { chiGia: true }); };
  const gia = async (m) => (await q('SELECT gia::float8 AS g, tien_te AS t FROM goi_gia WHERE san_pham_id=$1 ORDER BY so_luong', [await monId(m)])).rows;
  const chat = async (m) => { const p = await mot('SELECT * FROM page WHERE id=$1', [PG[m]]); const sp = await docSanPhamGoiGia(pool, T, PG[m], p);
    return sp[0]?.goiGia.map(goiGiaChoChat).map((x) => `${x.price} ${x.currency}`).join(',') || 'rong'; };
  const cua = async (m, tp, te) => { const k = await cua2Tien(pool, { teamId: T, pageId: PG[m], duLieu: chuanHoaHoSo({ total_price: tp, qty: 1, currency: te }) });
    return k.qua ? 'MO' : `DONG:${k.ly_do}`; };
  const demGia = async () => Number((await mot('SELECT count(*) n FROM goi_gia')).n);

  // P1 · ④1 — Europe 1 × 49,99 EUR
  try { await luu('Europe', [{ so_luong: 1, price: 49.99, tien_te: 'EUR' }]); const g = (await gia('Europe'))[0];
    ra('P1', `gia=${g.g} te=${g.t} bot=${await chat('Europe')}`); } catch (e) { ra('P1', loi(e)); }
  // P2 · ④2 — Taiwan 1 × 990 TWD; màn đọc lại; 990,5 (giá và giá gốc) ⇒ từ chối, 0 ghi
  try { await luu('Taiwan', [{ so_luong: 1, price: 990, tien_te: 'TWD' }]); const g = (await gia('Taiwan'))[0];
    const ct = await chiTietSanPhamGoc(pool, T, G.id); const man = ct.thiTruong.find((x) => x.shopId === SHOP.Taiwan).mon[0].goiGia[0].gia;
    ra('P2a', `gia=${g.g} te=${g.t} bot=${await chat('Taiwan')} man=${man}`); } catch (e) { ra('P2a', loi(e)); }
  { const id = await monId('Taiwan'); const n0 = await demGia(); const v0 = await ver(id); const kq = [];
    for (const [k, o] of [['gia', { price: 990.5 }], ['giaGoc', { price: 990, gia_goc: 1980.5 }]]) {
      try { await saveProduct(pool, bc, id, { offers: [{ so_luong: 1, tien_te: 'TWD', ...o }], version: v0 }, { chiGia: true }); kq.push(`${k}=NHAN`); }
      catch (e) { kq.push(`${k}=${/không có xu/.test(e.message) ? 'TU_CHOI_RO' : 'TU_CHOI_KHAC'}`); }
    }
    ra('P2b', `${kq.join(' ')} ghi_moi=${(await demGia()) - n0} doi_phien_ban=${(await ver(id)) !== v0 ? 1 : 0}`); }
  // P3 · ④3 — cua2Tien (tổng qua chuanHoaHoSo như hồ sơ bot chốt)
  ra('P3', `tw990=${await cua('Taiwan', 990, 'TWD')} tw991=${await cua('Taiwan', 991, 'TWD')} tw990.5=${await cua('Taiwan', 990.5, 'TWD')} eu49.99=${await cua('Europe', 49.99, 'EUR')}`);
  // P4 · ④4 — đối soát GSP3 trên shop Romania
  { const banSao = async (pageId, ma, te, g) => { const id = String((await mot("INSERT INTO san_pham(team_id,page_id,ma,nguon) VALUES($1,$2,$3,'kb') RETURNING id", [T, pageId, ma])).id);
      await q('INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,1,$3,$4)', [T, id, g, te]); return id; };
    const deps = { luuGia: async (posMa, x) => { const m = await monCuaGoc(pool, T, G.id, posMa); return saveProduct(pool, bc, m.id, { offers: x.offers, version: x.version }, { chiGia: true }); }, dayMon: async () => {} };
    let ron; try { await banSao(PG.Romania, 'kb:ro:1', 'RON', 14900); const dv = await donViDoiSoat(pool, T, G.id, SHOP.Romania);
      await doiSoatDonVi(pool, T, { gocId: G.id, shopId: SHOP.Romania, dauDonVi: dv.dauDonVi }, deps); ron = `chep(gia=${(await gia('Romania'))[0]?.g})`; } catch (e) { ron = e.ma || loi(e); }
    let aed; try { await q("INSERT INTO san_pham(team_id,ma,ten,sku,ton_kho,nguon) VALUES($1,$2,'202 - Lamp','202',5,'pos')", [T, `${SHOP.Romania}:l`]);
      const L = await gopMonThanhGoc(pool, T, { maGoc: 'lamp', ten: 'Lamp', sku: '202', posMa: [`${SHOP.Romania}:l`] });
      const PL = String((await mot("INSERT INTO page(team_id,page_id,ten) VALUES($1,'fb-lamp','lamp') RETURNING id", [T])).id);
      await ganPageVaoGoc(pool, T, L.id, { pageId: PL, shopId: SHOP.Romania }); await banSao(PL, 'kb:lamp:1', 'AED', 9900);
      const dv = await donViDoiSoat(pool, T, L.id, SHOP.Romania); await doiSoatDonVi(pool, T, { gocId: L.id, shopId: SHOP.Romania, dauDonVi: dv.dauDonVi }, deps); aed = 'GHI';
    } catch (e) { aed = e.ma || loi(e); }
    ra('P4', `ron=${ron} aed=${aed}`); }
  // P5 · ④5 — bảy tệ cũ không đổi một con số (SAR · KWD)
  try { await luu('Saudi', [{ so_luong: 1, price: 99, tien_te: 'SAR' }]); await luu('Kuwait', [{ so_luong: 1, price: 10.9, tien_te: 'KWD' }]);
    ra('P5', `sar=${(await gia('Saudi'))[0].g} kwd=${(await gia('Kuwait'))[0].g} bot=${await chat('Saudi')},${await chat('Kuwait')} cuaSar=${await cua('Saudi', 99, 'SAR')} cuaKwd=${await cua('Kuwait', 10.9, 'KWD')}`);
  } catch (e) { ra('P5', loi(e)); }
  // P6 · ④6 — tệ lạ GBP vẫn từ chối như cũ
  { const id = await monId('Australia'); const n0 = await demGia(); let kq;
    try { await saveProduct(pool, bc, id, { offers: [{ so_luong: 1, price: 49, tien_te: 'GBP' }], version: await ver(id) }, { chiGia: true }); kq = 'NHAN'; }
    catch (e) { kq = e.message === 'Gói giá phải có số lượng duy nhất, giá dương và tiền tệ được hỗ trợ' ? 'TU_CHOI_NHU_CU' : 'TU_CHOI_KHAC'; }
    ra('P6', `gbp=${kq} ghi_moi=${(await demGia()) - n0} tongGbp=${chuanHoaHoSo({ total_price: 49, currency: 'GBP' }).tong_tien}`); }
} finally { await pool.end(); }
JS

# dung_db: CSDL hộp cát dựng LẠI từ đầu (khuôn trần + migrate trong bộ đo) — mỗi lượt đo/đột biến trên dữ liệu sạch.
dung_db() { pg_qt "DROP DATABASE IF EXISTS $DB WITH (FORCE)" >/dev/null 2>&1; pg_qt "CREATE DATABASE $DB" >/dev/null 2>&1; }
# do_cay <gốc cây> → in các dòng P<n>|… (stdout), lỗi node ⇒ «LOI-NODE»
do_cay() {
  dung_db || { echo "LOI-NODE"; return; }
  (cd "$1" && V3_KHOA_MA_HOA="${V3_KHOA_MA_HOA:-$(printf 'f%.0s' $(seq 64))}" node --import "$1/test/_an-toan.mjs" "$TAM/do-tt1.mjs" "$1" "$URL_SB" 2>"$TAM/do-err.txt") \
    | grep -E '^P[0-9a-z]+\|' || echo "LOI-NODE"
}
lay() { echo "$1" | grep -E "^$2\|" | head -1 | cut -d'|' -f2-; }

# ═══ ①–⑥ PHÉP NỘI DUNG trên cây chung ══════════════════════════════════════════════════════════════════════════════════════════
DO=$(do_cay "$GOC"); sed -n '1,3p' "$TAM/do-err.txt" | grep -F '(cây đo' >&2
# Đáp án — từ NGUỒN đo (hệ số POS · phiếu ④), không từ code bị đo.
P1_CHO='gia=4999 te=EUR bot=49.99 EUR'
P2A_CHO='gia=990 te=TWD bot=990 TWD man=990'
P2B_CHO='gia=TU_CHOI_RO giaGoc=TU_CHOI_RO ghi_moi=0 doi_phien_ban=0'
P3_CHO='tw990=MO tw991=DONG:lech_bang_gia tw990.5=DONG:khong_co_tong eu49.99=MO'
P4_CHO='ron=chep(gia=14900) aed=lech_tien_te'
P5_CHO='sar=9900 kwd=1090 bot=99 SAR,10.9 KWD cuaSar=MO cuaKwd=MO'
P6_CHO='gbp=TU_CHOI_NHU_CU ghi_moi=0 tongGbp=null'
muc "① ④1 · Europe 1 × 49,99 EUR ⇒ goi_gia 4999 · EUR; bot đọc lại 49,99"
bang "P1 Europe EUR" "$(lay "$DO" P1)" "$P1_CHO"
muc "② ④2 · Taiwan 990 TWD ⇒ 990 (không 99000), màn hiện 990; 990,5 ⇒ từ chối rõ, 0 ghi"
bang "P2a Taiwan TWD" "$(lay "$DO" P2a)" "$P2A_CHO"
bang "P2b 990,5 TWD (giá · giá gốc)" "$(lay "$DO" P2b)" "$P2B_CHO"
muc "③ ④3 · cua2Tien Taiwan 990 MỞ · 991 ĐÓNG · 990,5 không làm tròn; Europe 49,99 MỞ"
bang "P3 cửa tiền" "$(lay "$DO" P3)" "$P3_CHO"
muc "④ ④4 · đối soát GSP3 shop Romania: RON ⇒ chép (không thi_truong_la); AED ⇒ lech_tien_te"
bang "P4 đối soát Romania" "$(lay "$DO" P4)" "$P4_CHO"
muc "⑤ ④5 · bảy tệ cũ không đổi một con số (SAR · KWD: lưu · đọc · cửa tiền)"
bang "P5 SAR · KWD" "$(lay "$DO" P5)" "$P5_CHO"
muc "⑥ ④6 · tệ lạ GBP vẫn từ chối như cũ"
bang "P6 GBP" "$(lay "$DO" P6)" "$P6_CHO"

# ═══ ⑦ ĐẢO-VÁ trên BẢN SAO TẠM — mỗi đột biến: bộ đo nội dung phải lệch ĐÚNG phép, và bộ ca phải có ca đỏ ═══════════════════════
muc "⑦ đảo-vá (bản sao tạm; cây chung không bao giờ bị sửa)"
cp -R src v3 test db package.json "$TAM/"; ln -s "$GOC/node_modules" "$TAM/node_modules"
BAM_TRUOC=$(cat src/pos/tao-don.js src/products/chuyen-ban-sao.js src/admin-v3/operations.js src/orders/hang-cho.js | shasum | cut -d' ' -f1)
# tên | tệp | phép PHẢI lệch (cách nhau bằng ,) · phép còn lại phải GIỮ (lệch theo ⇒ đột biến làm hỏng bộ đo chứ không đo đúng
# hành vi ⇒ KHÔNG tính là bắt được — /code-review TT1 #3). Cột phép trống = chỉ bộ ca bắt (số lớn có xu — phép P không có).
DS_DOT_BIEN='
twd_ve_100|src/pos/tao-don.js|P2a,P2b,P3
bo_romania|src/pos/tao-don.js|P4
bo_eur|src/pos/tao-don.js|P1,P3
lam_tron_ngam|src/pos/tao-don.js|P2b,P3
gia_goc_round|src/admin-v3/operations.js|P2b
quy_tong_round|src/orders/hang-cho.js|P3
dung_sai_co_dinh|src/pos/tao-don.js|
'
for f in src/pos/tao-don.js src/products/chuyen-ban-sao.js src/admin-v3/operations.js src/orders/hang-cho.js; do cp "$TAM/$f" "$TAM/$f.goc"; done
while IFS='|' read -r ten tep lech; do
  [ -z "$ten" ] && continue
  cp "$TAM/$tep.goc" "$TAM/$tep"
  if ! python3 - "$TAM/$tep" "$ten" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1]); s = p.read_text(encoding='utf-8'); ten = sys.argv[2]
old, new = {
  'twd_ve_100': ('  TWD: 1,\n', '  TWD: 100,\n'),
  'bo_romania': ('Romania: "RON", ', ''),
  'bo_eur': ('  EUR: 100,\n', ''),
  'lam_tron_ngam': ('return Math.abs(nho - tron) > Math.max(1e-6, Math.abs(nho) * 8 * Number.EPSILON) ? null : tron;', 'return tron;'),
  # bản trước TT1 của giá gốc: không kiểm, quy bằng `Math.round` ngầm
  'gia_goc_round': ('      nho[k] = quyDonViNho(g[k], g.tien_te);\n      if (nho[k] == null) throw loiLe(g[k], g.tien_te, o);', '      nho[k] = k === "gia_goc" ? Math.round(Number(g[k]) * HE_SO_TE[g.tien_te]) : quyDonViNho(g[k], g.tien_te);\n      if (nho[k] == null) throw loiLe(g[k], g.tien_te, o);'),
  'dung_sai_co_dinh': ('> Math.max(1e-6, Math.abs(nho) * 8 * Number.EPSILON) ? null : tron;', '> 1e-6 ? null : tron;'),
  # bản trước TT1 (Math.round ngầm) với ĐỦ bảng hệ số mới — chỉ khác đúng chỗ làm tròn
  'quy_tong_round': ('  const nho = quyDonViNho(lon, chu(d.tien_te));\n  if (nho != null) d.tong_tien = nho;', '  const he = { AED: 100, SAR: 100, QAR: 100, USD: 100, KWD: 100, OMR: 100, BHD: 100, EUR: 100, RON: 100, AUD: 100, TWD: 1, JPY: 1 }[chu(d.tien_te).toUpperCase()];\n  if (he) d.tong_tien = Math.round(lon * he);'),
}[ten]
assert s.count(old) == 1, (ten, old[:50])
p.write_text(s.replace(old, new), encoding='utf-8')
PY
  then truot "đảo-vá $ten: không áp được đột biến (khuôn không còn khớp — sửa thước)"; continue; fi
  DB_DOT=$(do_cay "$TAM")
  lech_thay=""; giu_hong=""
  for P in P1 P2a P2b P3 P4 P5 P6; do
    cho_var="$(echo "$P" | tr '[:lower:]' '[:upper:]')_CHO"; cho="${!cho_var}"
    that="$(lay "$DB_DOT" "$P")"
    if echo ",$lech," | grep -qF ",$P,"; then [ "$that" != "$cho" ] && lech_thay="$lech_thay $P"
    else [ "$that" = "$cho" ] || giu_hong="$giu_hong $P"; fi
  done
  so_doi=$(echo "$lech" | tr ',' '\n' | grep -c .); so_thay=$(echo "$lech_thay" | wc -w | tr -d ' ')
  oc=$(chay_ca "$TAM" "$CA"); fc=$(dem "$oc" fail); fc=${fc:-0}
  cp "$TAM/$tep.goc" "$TAM/$tep"
  so "đột biến $ten" "phép lệch: ${lech_thay:- (không)} / đòi $lech · phép khác lệch theo:${giu_hong:- 0} · bộ ca fail=$fc"
  [ "$so_thay" -eq "$so_doi" ] && [ -z "$giu_hong" ] && [ "$fc" -ge 1 ] && dat "đảo-vá $ten ⇒ ${lech:-(chỉ bộ ca)} đỏ + bộ ca đỏ ($fc)" \
    || truot "đảo-vá $ten: đột biến SỐNG hoặc làm hỏng bộ đo (lệch=$so_thay/$so_doi · lệch theo:${giu_hong:- 0} · bộ ca fail=$fc)"
done <<< "$DS_DOT_BIEN"
# lượt khôi phục: bản sao về bản gốc phải xanh lại (thước không tự đỏ)
DB_LAI=$(do_cay "$TAM"); hong=0
for P in P1 P2a P2b P3 P4 P5 P6; do cho_var="$(echo "$P" | tr '[:lower:]' '[:upper:]')_CHO"; [ "$(lay "$DB_LAI" "$P")" = "${!cho_var}" ] || hong=$((hong+1)); done
bang "khôi phục bản sao ⇒ số phép lệch" "$hong" "0"
BAM_SAU=$(cat src/pos/tao-don.js src/products/chuyen-ban-sao.js src/admin-v3/operations.js src/orders/hang-cho.js | shasum | cut -d' ' -f1)
# Đột biến chỉ nhắm 4 tệp này và chỉ trong $TAM ⇒ phép đo đúng là băm CHÍNH 4 tệp ở cây chung (bản cũ kèm `git status -- '*.goc'`
# — luôn rỗng vì .goc chỉ sinh trong $TAM, kiểm câm — đã bỏ, /code-review TT1 #10).
[ "$BAM_TRUOC" = "$BAM_SAU" ] && dat "cây chung không dính đột biến (băm 4 tệp đột biến trước = sau)" || truot "cây chung BỊ ĐỔI trong lượt đảo-vá"

# ═══ ⑧ BỘ CA + CỔNG CŨ (rc TÁCH DÒNG) ═════════════════════════════════════════════════════════════════════════════════════════
muc "⑧ bộ ca TT1 + lưới hồi quy gần + cổng cũ"
o=$(chay_ca "$GOC" "$CA"); p=$(dem "$o" pass); f=$(dem "$o" fail); p=${p:-0}; f=${f:-1}
[ "$f" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -6 | sed 's/^/   ↳ /'
[ "$f" -eq 0 ] && [ "$p" -ge 11 ] && dat "bộ ca TT1 pass=$p fail=0 (sàn ≥11)" || truot "bộ ca TT1 pass=$p fail=$f"
for t in test/he-so-te-doi-chieu-don-that.test.js test/gsp3-doi-soat.test.mjs test/va-r2-tien-tao-don.test.js test/l3-m4-hang-cho.test.js test/ve8b-gia-page.test.mjs; do
  o=$(chay_ca "$GOC" "$t"); p=$(dem "$o" pass); f=$(dem "$o" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -eq 0 ] && [ "$p" -ge 1 ] && dat "lưới gần $t pass=$p fail=0" || truot "lưới gần $t pass=$p fail=$f"
done
# Cổng cũ ĐỎ ⇒ ĐỐI CHỨNG cùng thước: chạy CHÍNH cổng đó trên worktree tạm ở $BASE, so DANH SÁCH dòng đỏ (chuẩn hoá id/pid).
# Giống hệt ⇒ đỏ SẴN có trước phiếu (nợ cũ, vd va-r2), 0 dòng đỏ mới ⇒ đạt; khác một dòng ⇒ đỏ.
SHIM="$TAM/shim"; mkdir -p "$SHIM"; printf '#!/bin/sh\nexec grep -E "$@"\n' > "$SHIM/rg"; chmod +x "$SHIM/rg"
PATH_CON="$PATH"; command -v rg >/dev/null 2>&1 || PATH_CON="$SHIM:$PATH"
chuan_do() { grep -E "✘|🔴" | sed -E 's/[0-9]{4,}//g; s/p[0-9]+//g' | sort; }
# TRẦN THỜI GIAN mỗi cổng con (máy dev không có `timeout`) — cùng khuôn gsp3b.sh ⑥: quá trần ⇒ giết CẢ nhóm tiến trình ⇒ ĐỎ «TREO».
TRAN_CON="${TRAN_CON:-2700}"
chay_con() {   # chay_con <tệp cổng> — in log cổng con; rc=124 khi quá TRAN_CON giây
  local tep=$1 out; out=$(mktemp)
  set -m; PATH="$PATH_CON" bash "$tep" > "$out" 2>&1 & local pid=$!; set +m
  local t=0
  while kill -0 "$pid" 2>/dev/null; do
    sleep 5; t=$((t+5))
    if [ "$t" -ge "$TRAN_CON" ]; then kill -KILL -- "-$pid" 2>/dev/null; wait "$pid" 2>/dev/null; cat "$out"; rm -f "$out"; return 124; fi
  done
  wait "$pid"; local rc=$?; cat "$out"; rm -f "$out"; return "$rc"
}
WT_BASE=""
don_wt() { [ -n "$WT_BASE" ] && git worktree remove --force "$WT_BASE" >/dev/null 2>&1; git worktree prune >/dev/null 2>&1; true; }
trap 'don_wt; don' EXIT INT TERM
for g in gsp2 gsp3 gsp3b ve8b va-r2; do
  _o=$(chay_con "ops/bin/nghiem-thu/$g.sh"); _r=$?
  if [ "$_r" -eq 0 ]; then dat "cổng cũ $g rc=0"; continue; fi
  if [ "$_r" -eq 124 ]; then
    echo "$_o" | grep -E "✘|🔴" | tail -3 | sed 's/^/   ↳ /'
    truot "cổng cũ $g TREO quá ${TRAN_CON}s — giết cả nhóm; chạy riêng cổng đó để phân biệt chập chờn"; continue
  fi
  if [ -z "$WT_BASE" ]; then
    WT_BASE="$TAM/wt-base"
    git worktree add -q --detach "$WT_BASE" "$BASE" >/dev/null 2>&1 && ln -s "$GOC/node_modules" "$WT_BASE/node_modules" \
      && { [ ! -f "$GOC/.env" ] || ln -s "$GOC/.env" "$WT_BASE/.env"; }
  fi
  _moi=$(echo "$_o" | chuan_do)
  # rc≠0 mà KHÔNG in dòng đỏ nào (chết giữa chừng · lỗi nạp · exit 2) ⇒ ĐỎ: so danh sách rỗng với nợ cũ là xanh giả
  if [ -z "$_moi" ]; then echo "$_o" | tail -3 | sed 's/^/   ↳ /'; truot "cổng cũ $g rc=$_r mà không in dòng đỏ nào — cổng con chết giữa chừng"; continue; fi
  _cu=$( (cd "$WT_BASE" 2>/dev/null && chay_con "ops/bin/nghiem-thu/$g.sh") | chuan_do)
  _them=$(comm -13 <(echo "$_cu") <(echo "$_moi") | grep -c .)
  if [ -n "$_cu" ] && [ "$_them" -eq 0 ]; then
    dat "cổng cũ $g rc=$_r — ĐỎ SẴN ở $BASE: $(echo "$_moi" | grep -c .) dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ cũ, không do TT1)"
  else
    comm -13 <(echo "$_cu") <(echo "$_moi") | head -5 | sed 's/^/   ↳ MỚI: /'
    truot "cổng cũ $g rc=$_r · $_them dòng đỏ MỚI so với $BASE"
  fi
done
# npm test (④8 «không thêm ca đỏ») — chỉ khi CHAY_NPM_TEST=1 (luật 6: không chạy song song lượt khác). Mốc base 354e8a6 (= da50df6 về mã):
# 2452 ca · 2430 pass · 0 fail · 22 skip.
if [ "${CHAY_NPM_TEST:-}" = 1 ]; then
  o=$(npm test 2>&1); nt=$(dem "$o" tests); nf=$(dem "$o" fail)
  [ "${nf:-1}" -eq 0 ] && dat "npm test tests=${nt:-?} fail=0" || truot "npm test tests=${nt:-?} fail=${nf:-?}"
else
  echo "   npm test: HOÃN (đặt CHAY_NPM_TEST=1 khi không lượt đo nào khác đang chạy — luật 6) — không tính vào PHÉP/LỖI"
fi

echo; echo "PHÉP=$PHEP LỖI=$LOI · môi trường: máy dev, hộp cát $DB"
exit $((LOI > 0))
