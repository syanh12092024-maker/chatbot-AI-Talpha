#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU TT1b — «RÀNG TỆ CỦA BẬC GIÁ VÀ CỦA ĐƠN VỚI TỆ CỦA THỊ TRƯỜNG SHOP» (đối kháng TT1 F1: POS thu sai ×100 / ×0,01).
# Chạy: ops/bin/nghiem-thu/tt1b.sh   (rc=0 là đạt) · GIU_SANDBOX=1 giữ CSDL hộp cát · GIU_TAM=1 giữ thư mục đảo-vá ·
#       CHAY_NPM_TEST=1 chạy thêm `npm test` (④7 — chỉ khi không lượt đo nào khác đang chạy) · BO_CONG_CU=1 bỏ ⑦ cổng cũ (lượt soi
#       nhanh của thợ — phép ⑦ khi đó tính là TRƯỢT, rc không bao giờ =0 khi bỏ).
# Thi hành ĐÚNG 7 phép của ④ trong docs/thi-cong/phieu/PHIEU-TT1B.md. Mỗi phép in MỘT dòng số đo, so với đáp án lấy từ HỢP ĐỒNG phiếu
# (② 2–3: tệ của bậc / của đơn = tệ thị trường shop; bảng `TIEN_TE_THI_TRUONG` y nguyên TT1; hệ số POS TWD ×1 · EUR/SAR/KWD ×100),
# không lấy từ code bị đo. Tầm đo: lưới HỒI QUY do chính thợ viết — bắt tái phạm đã biết, không phải bằng chứng «kín».
# Postgres HỘP CÁT riêng `aicloser_v3_nt_tt1b_p$$` (gói `pg` + `db/migrate.js`, tự dọn) — KHÔNG đo `aicloser_v3` dev, KHÔNG đo prod,
# POS GIẢ (đếm riêng GET/POST), 0 byte ra mạng. Đảo-vá trên BẢN SAO TẠM (cây làm việc không bao giờ bị sửa); mỗi lượt đo là MỘT tiến
# trình node mới trên CSDL dựng lại từ đầu. Thiếu `DATABASE_URL_V3` thì tự nạp từ `.env` (không in giá trị). Không dùng `rg` — `grep -E`.
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
BASE=b04d0dc
DB="aicloser_v3_nt_tt1b_p$$"
CA=test/tt1b-te-thi-truong.test.mjs
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
chay_ca() { (cd "$1" && node --env-file-if-exists="$GOC/.env" --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "${@:2}" 2>&1); }
# ④5 «một bảng»: tổng số dòng khai `Saudi: "SAR"` dưới src/ của một cây (đúng lệnh phiếu: grep -rcE 'Saudi: "SAR"' src/). Bỏ `*.goc`:
# bản sao đảo-vá giữ bản gốc của tệp đột biến cạnh nó — đếm cả nó là đếm một bảng hai lần.
ban_bang() { grep -rcE --exclude='*.goc' 'Saudi: "SAR"' "$1/src" | awk -F: '{s += $NF} END {print s + 0}'; }

if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát · rc=2"; exit 2; }
# shellcheck source=ops/bin/nghiem-thu/_csdl.sh
. "$GOC/ops/bin/nghiem-thu/_csdl.sh"
csdl_san_sang "$DB" || exit 2
URL_SB="$(_csdl_url "$DB")"

TAM=$(mktemp -d "${TMPDIR:-/tmp}/tt1b-dao-va.XXXXXX")
don() {
  if [ "${GIU_SANDBOX:-0}" = 1 ]; then echo "   (giữ CSDL $DB theo GIU_SANDBOX=1)"; else pg_qt "DROP DATABASE IF EXISTS $DB WITH (FORCE)" >/dev/null 2>&1; fi
  if [ "${GIU_TAM:-0}" = 1 ]; then echo "   (giữ $TAM)"; else rm -rf "$TAM"; fi
}
trap don EXIT INT TERM

echo "CỔNG NGHIỆM THU TT1b · $(date '+%F %T') · cây $GOC @ $(git rev-parse --short HEAD 2>/dev/null || echo '?') · base $BASE"
echo "── môi trường: MÁY DEV · CSDL đo $(_csdl_che "$URL_SB") (hộp cát tự dựng/tự dọn, không phải aicloser_v3 dev, không phải prod) · POS giả"

# ═══ BỘ ĐO NỘI DUNG — một tệp ESM, tham số = gốc cây cần đo (cây làm việc hoặc bản sao đột biến). In dòng `P<n>|<số đo>`. ═══════════
cat > "$TAM/do-tt1b.mjs" <<'JS'
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const R = process.argv[2]; const URL_SB = process.argv[3];
const nap = (p) => import(pathToFileURL(`${R}/${p}`).href);
const express = createRequire(`${R}/package.json`)('express');
const { taoPool } = await nap('db/ket-noi.js');
const { len } = await nap('db/migrate.js');
const { maHoa } = await nap('db/khoa.js');
const { saveProduct } = await nap('src/admin-v3/operations.js');
const { vaoHangCho, duyet } = await nap('src/orders/hang-cho.js');
const { ctxHeThong } = await nap('src/db/index.js');
const posIdx = await nap('src/pos/index.js');
const cbs = await nap('src/products/chuyen-ban-sao.js');
const { dungPhanB } = await nap('v3/src/vai-b.js');
const { taoTruyVanThat } = await nap('v3/src/noi-day/cong-du-lieu-that.js');
const { taoCongDanhTinh } = await nap('v3/src/noi-day/cong-danh-tinh.js');
const { bam } = await nap('v3/src/auth/index.js');
console.error(`   (cây đo: ${R} · cwd ${process.cwd()} · tao-don.js nạp từ ${R}/src/pos/tao-don.js)`);
const KHOA = { V3_KHOA_MA_HOA: process.env.V3_KHOA_MA_HOA };
const MO = { ...KHOA, V3_POS_GHI: '1' };
const pool = taoPool(URL_SB);
const ra = (k, v) => console.log(`${k}|${v}`);
let soDonPos = 9500;
const napGia = () => { const f = async (url, o = {}) => {
    if ((o.method || 'GET') === 'POST') { f.post += 1; f.than.push(JSON.parse(o.body)); return { ok: true, status: 200, text: async () => JSON.stringify({ data: { id: soDonPos++ } }) }; }
    f.get += 1; return { ok: true, status: 200, text: async () => JSON.stringify({ data: [], total_entries: 0, total_pages: 1 }) }; };
  f.post = 0; f.get = 0; f.than = []; return f; };
let server;
try {
  await len(pool, { im: true });
  const q = (s, a = []) => pool.query(s, a);
  const mot = async (s, a = []) => (await q(s, a)).rows[0];
  const T = String((await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id);
  const T2 = String((await mot("INSERT INTO team(slug,ten) VALUES('tt1b-cong-b','B') RETURNING id")).id);
  const u = String((await mot("INSERT INTO nguoi_dung(email,ten) VALUES('qt@tt1b.cong','QT') RETURNING id")).id);
  const bc = { teamId: T, nguoiDungId: u, vai: ['quan-tri'] }; const bc2 = { ...bc, teamId: T2 };
  const SHOP = { Taiwan: '219', Europe: '201', Saudi: '111', Kuwait: '222', Japan: '701' };
  for (const [m, s] of Object.entries(SHOP)) await q('INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma,bat) VALUES($1,$2,$3,$4,$5)', [T, m, s, maHoa('k', KHOA), m !== 'Kuwait']);
  // tên thị trường dính khoảng trắng (đường di trú không gọt) — một luật tra bảng (gọt) cho lưu giá · taoDon · GSP3
  await q("INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma) VALUES($1,'Qatar ','333',$2)", [T, maHoa('k', KHOA)]);
  const ver = async (id) => (await mot('SELECT xmin::text v FROM san_pham WHERE id=$1', [id])).v;
  const demGia = async () => Number((await mot('SELECT count(*) n FROM goi_gia')).n);
  let soMon = 0;
  const mon = async (team, shop, nguon = 'pos') => { soMon += 1; const ma = nguon === 'pos' ? `${shop}:m${soMon}` : `kb:p${soMon}:SP1`;
    return String((await mot('INSERT INTO san_pham(team_id,ma,ten,sku,ton_kho,nguon) VALUES($1,$2,$3,$4,5,$5) RETURNING id', [team, ma, 'Ring', '101', nguon])).id); };
  const luu = (id, offers, chiGia, b = bc) => ver(id).then((v) => saveProduct(pool, b, id, chiGia ? { offers, version: v }
    : { ten: 'Ring', mo_ta: 'x', het_hang: false, offers, version: v }, { chiGia }));
  const gia = async (id) => (await q('SELECT gia::float8 g, tien_te t FROM goi_gia WHERE san_pham_id=$1 ORDER BY so_luong', [id])).rows.map((r) => `${r.g}${r.t}`).join('+');
  // Phân loại MỘT lượt lưu: NHAN · CHAN_RO (400 + câu đúng khuôn) · CHAN_KHAC (bị chặn vì lý do khác — guard khác cắn trước = không tính)
  const loai = async (fn, khuon) => { try { await fn(); return 'NHAN'; } catch (e) { return e.status === 400 && khuon.test(e.message) ? 'CHAN_RO' : `CHAN_KHAC(${e.status}:${String(e.message).slice(0, 30)})`; } };
  const caoTe = (x, m, y) => new RegExp(`^Bậc giá dùng ${x} nhưng shop ${m} bán bằng ${y}`);

  // P1 · ④1 — repro F1 tại cửa lưu: Taiwan «USD» 990 · Europe «TWD» 49 · bậc 2 sai tệ sau bậc 1 đúng ⇒ 400, 0 ghi; đúng tệ ⇒ lưu (cả hai đường)
  for (const [k, chiGia] of [['a', true], ['c', false]]) {
    const tw = await mon(T, SHOP.Taiwan); const eu = await mon(T, SHOP.Europe); const v0 = [await ver(tw), await ver(eu)]; const n0 = await demGia();
    const twUsd = await loai(() => luu(tw, [{ so_luong: 1, price: 990, tien_te: 'USD' }], chiGia), caoTe('USD', 'Taiwan', 'TWD'));
    const euTwd = await loai(() => luu(eu, [{ so_luong: 1, price: 49, tien_te: 'TWD' }], chiGia), caoTe('TWD', 'Europe', 'EUR'));
    const honHop = await loai(() => luu(tw, [{ so_luong: 1, price: 990, tien_te: 'TWD' }, { so_luong: 2, price: 18, tien_te: 'USD' }], chiGia), caoTe('USD', 'Taiwan', 'TWD'));
    const doiPb = [await ver(tw), await ver(eu)].filter((v, i) => v !== v0[i]).length;
    ra(`P1${k}`, `tw_usd=${twUsd} eu_twd=${euTwd} hon_hop=${honHop} ghi_moi=${(await demGia()) - n0} doi_phien_ban=${doiPb}`);
    const kq = [];
    for (const [m, price, te] of [['Europe', 49.99, 'EUR'], ['Taiwan', 990, 'TWD'], ['Saudi', 99, 'SAR']]) {
      const id = await mon(T, SHOP[m]); try { await luu(id, [{ so_luong: 1, price, tien_te: te }], chiGia); kq.push(`${m}=${await gia(id)}`); } catch (e) { kq.push(`${m}=CHAN(${e.status})`); }
    }
    ra(`P1${k === 'a' ? 'b' : 'd'}`, kq.join(' '));
  }

  // P2 · ④2 — taoDon cửa (b), hàng chờ dựng THẲNG (bậc sai tệ chèn thẳng goi_gia, bỏ qua saveProduct), đi qua duyet (cửa ③ đã GET ⇒ đếm POST)
  let soDon = 0;
  const dungDon = async ({ pageShop, monShop, giaNho, te }) => {
    soDon += 1; const pt = `tt1b-cong-${soDon}`;
    const pg = await mot("INSERT INTO page(team_id,page_id,ten,thi_truong,pos_shop_id) VALUES($1,$2,$2,' ',$3) RETURNING id", [T, pt, pageShop]);
    const ma = `${monShop}:9f0c2a11-1d2e-4f30-8a4b-${String(soDon).padStart(12, '0')}`;
    const sp = await mot('INSERT INTO san_pham(team_id,page_id,ma,ten) VALUES($1,$2,$3,$4) RETURNING id', [T, pg.id, ma, 'SP']);
    await q('INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,2,$3,$4)', [T, sp.id, giaNho, te]);
    const psid = `ps-cong-${soDon}`;
    const h = await mot("INSERT INTO hoi_thoai(team_id,page_id,psid,trang_thai,chu_so_huu) VALUES($1,$2,$3,'CLOSING','AI') RETURNING id", [T, pg.id, psid]);
    await q("INSERT INTO tin_cho_xu_ly(team_id,page_id,psid,conv_id,msg_id,noi_dung,trang_thai) VALUES($1,$2,$3,$4,$5,'yes i confirm','xong')", [T, pt, psid, `c-${psid}`, `m-${psid}`]);
    const kq = await vaoHangCho(pool, ctxHeThong(), { hoiThoaiId: h.id, teamId: T, convId: `c-${psid}`, tinId: 8000 + soDon,
      hoSo: { ten: 'Sara', sdt: `+97155${String(2000000 + soDon)}`, dia_chi: 'Jumeirah 3', thanh_pho: 'Dubai', so_luong: 2, tong_tien: giaNho, tien_te: te, san_pham_ma: ma, kho_hang: 'kho-cong' } },
      { env: MO, nap: napGia() });
    return kq.id;
  };
  const nk = async (id, khuon) => Number((await mot("SELECT count(*) n FROM nhat_ky WHERE hanh_dong='pos_tao_don_bi_chan' AND doi_tuong_id=$1 AND ghi_chu LIKE $2", [String(id), khuon])).n);
  const tt = async (id) => (await mot('SELECT trang_thai FROM hang_cho_tao_don WHERE id=$1', [id])).trang_thai;
  const cauRo = (s, a, b, m) => [a, b, m, 'báo marketer sửa bậc'].every((x) => String(s).includes(x)) ? 'RO' : 'THIEU';
  const thuDuyet = async (id) => { const n = napGia(); let loi = null, kq = null;
    try { kq = await duyet(pool, ctxHeThong(), { hangChoId: id, teamId: T }, { env: MO, nap: n }); } catch (e) { loi = e; }
    return { n, loi, kq }; };
  { const id = await dungDon({ pageShop: SHOP.Taiwan, monShop: SHOP.Taiwan, giaNho: 99000, te: 'USD' }); const { n, loi } = await thuDuyet(id);
    ra('P2a', `post=${n.post} loi=${loi?.name || 'KHONG'}:${(loi?.thieu || []).join('+')} nk_b_te=${await nk(id, 'cửa (b) chặn: lech_te_thi_truong%')} nk_a=${await nk(id, 'cửa (a)%')} cau=${cauRo(loi?.message, 'USD', 'TWD', 'Taiwan')} hang_cho=${await tt(id)}`); }
  { const id = await dungDon({ pageShop: SHOP.Japan, monShop: SHOP.Japan, giaNho: 1980, te: 'JPY' }); const { n, loi } = await thuDuyet(id);
    ra('P2b', `post=${n.post} loi=${loi?.name || 'KHONG'}:${(loi?.thieu || []).join('+')} nk_b_te=${await nk(id, 'cửa (b) chặn: lech_te_thi_truong%')} hang_cho=${await tt(id)}`); }
  { const id = await dungDon({ pageShop: SHOP.Taiwan, monShop: SHOP.Taiwan, giaNho: 990, te: 'TWD' }); const { n, loi, kq } = await thuDuyet(id);
    ra('P2c', `post=${n.post} shipping_fee=${n.than[0]?.shipping_fee ?? '-'} tao=${kq?.tao ?? `LOI:${loi?.name}`} nk_chan=${await nk(id, '%')}`); }
  // tên thị trường dính khoảng trắng («Qatar ») — taoDon tra bảng sau khi gọt ⇒ đơn QAR đi
  { const id = await dungDon({ pageShop: '333', monShop: '333', giaNho: 15900, te: 'QAR' }); const { n, loi, kq } = await thuDuyet(id);
    ra('P2f', `post=${n.post} shipping_fee=${n.than[0]?.shipping_fee ?? '-'} tao=${kq?.tao ?? `LOI:${loi?.name}`}`); }
  // ④2b vị trí — món nhầm shop (Europe 201 trên page Taiwan) + tệ lệch ⇒ shop_lech, không phải lệch tệ
  { const id = await dungDon({ pageShop: SHOP.Taiwan, monShop: SHOP.Europe, giaNho: 99000, te: 'USD' }); const { n, loi } = await thuDuyet(id);
    ra('P2d', `post=${n.post} thieu=${(loi?.thieu || []).join('+') || 'KHONG'}`); }
  // ④2c đường sale thật — POST /api/hop-thu/don/:id/duyet
  { const id = await dungDon({ pageShop: SHOP.Taiwan, monShop: SHOP.Taiwan, giaNho: 99000, te: 'USD' });
    const mk = 'Tt1b-cong-password-123';
    const nd = await mot('INSERT INTO nguoi_dung(email,ten,mat_khau_hash) VALUES($1,$1,$2) RETURNING id', ['sale@tt1b.cong', await bam(mk)]);
    await q("INSERT INTO thanh_vien_team(team_id,nguoi_dung_id,vai_id) SELECT $1,$2,id FROM vai WHERE ma='sale'", [T, nd.id]);
    const env = { V3_POS_GHI: '1', V3_KHOA_MA_HOA: KHOA.V3_KHOA_MA_HOA }; const n = napGia();
    const app = express();
    dungPhanB(app, { express, vanHanh: { pool, env, orderDeps: { env, nap: n }, daySanPhamLenBot: async () => {} },
      taoTruyVan: (b) => taoTruyVanThat(pool, b), taoTruyVanHeThong: () => taoCongDanhTinh(pool) });
    server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
    const goc = `http://127.0.0.1:${server.address().port}`;
    const dn = await fetch(goc + '/api/dang-nhap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'sale@tt1b.cong', matKhau: mk }) });
    const ck = (dn.headers.get('set-cookie') || '').split(';')[0];
    const goi = async (d, than) => { const r = await fetch(goc + d, { method: than === undefined ? 'GET' : 'POST',
      headers: { Cookie: ck, 'Content-Type': 'application/json', 'X-V3-Action': '1' }, body: than === undefined ? undefined : JSON.stringify(than) });
      return { status: r.status, ...(await r.json().catch(() => ({}))) }; };
    const d = await goi(`/api/hop-thu/don/${id}`); const r = await goi(`/api/hop-thu/don/${id}/duyet`, { version: d.item?.version });
    ra('P2e', `dang_nhap=${dn.status} status=${r.status} cau=${cauRo(r.thongDiep, 'USD', 'TWD', 'Taiwan')} post=${n.post} hang_cho=${await tt(id)}`); }

  // P3 · ④3 — món kb (bản sao theo page) với bậc tệ bất kỳ có trong HE_SO_TE ⇒ lưu như cũ (cả hai đường)
  { const a = await mon(T, null, 'kb'); const b = await mon(T, null, 'kb'); const kq = [];
    try { await luu(a, [{ so_luong: 1, price: 990, tien_te: 'USD' }], true); kq.push(`chiGia=${await gia(a)}`); } catch (e) { kq.push(`chiGia=CHAN(${e.status})`); }
    try { await luu(b, [{ so_luong: 1, price: 49, tien_te: 'TWD' }], false); kq.push(`day_du=${await gia(b)}`); } catch (e) { kq.push(`day_du=CHAN(${e.status})`); }
    ra('P3', kq.join(' ')); }

  // P4 · ④4 — thiếu kết nối · hai team chung shop · kết nối tắt · thị trường ngoài bảng (fail-closed, 0 ghi khi chặn)
  { const n0 = await demGia();
    const thieu = await loai(async () => luu(await mon(T, '777'), [{ so_luong: 1, price: 99, tien_te: 'SAR' }], true), /shop 777 chưa có kết nối POS trong team/);
    const b = await loai(async () => luu(await mon(T2, SHOP.Saudi), [{ so_luong: 1, price: 99, tien_te: 'SAR' }], true, bc2), /shop 111 chưa có kết nối POS trong team/);
    const japan = await loai(async () => luu(await mon(T, SHOP.Japan), [{ so_luong: 1, price: 1980, tien_te: 'JPY' }], true), /thị trường "Japan" chưa có trong bảng tiền tệ/);
    const ghiChan = (await demGia()) - n0;
    const a = await loai(async () => luu(await mon(T, SHOP.Saudi), [{ so_luong: 1, price: 99, tien_te: 'SAR' }], true), /./);
    const tat = await loai(async () => luu(await mon(T, SHOP.Kuwait), [{ so_luong: 1, price: 10.9, tien_te: 'KWD' }], true), /./);
    const trim = await loai(async () => luu(await mon(T, '333'), [{ so_luong: 1, price: 159, tien_te: 'QAR' }], true), /./);
    // xoá HẾT bậc (offers rỗng) của món shop mất kết nối ⇒ cho qua (không bậc thì không có gì lệch tệ — /code-review TT1b #3, tổng duyệt)
    const xm = await mon(T, '778'); await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,1,99000,'USD')", [T, xm]);
    const xoa = await loai(async () => luu(xm, [], true), /./);
    ra('P4', `khong_ket_noi=${thieu} hai_team=B:${b},A:${a} tat=${tat} japan=${japan} ghi_khi_chan=${ghiChan} trim=${trim} xoa_het=${xoa}(${(await gia(xm)) || 'rong'})`); }

  // P5 · ④5 — một bảng: import cũ từ chuyen-ban-sao vẫn chạy và là CÙNG đối tượng với bản của src/pos/index.js (bash nối số dòng khai)
  ra('P5', `cung_doi_tuong=${cbs.TIEN_TE_THI_TRUONG && cbs.TIEN_TE_THI_TRUONG === posIdx.TIEN_TE_THI_TRUONG ? 1 : 0} so_khoa=${Object.keys(cbs.TIEN_TE_THI_TRUONG || {}).length}`);
} finally { if (server) await new Promise((r) => server.close(r)); await pool.end(); }
JS

dung_db() { pg_qt "DROP DATABASE IF EXISTS $DB WITH (FORCE)" >/dev/null 2>&1; pg_qt "CREATE DATABASE $DB" >/dev/null 2>&1; }
# do_cay <gốc cây> → in các dòng P<n>|… (stdout; P5 nối thêm số dòng khai bảng của CHÍNH cây đó), lỗi node ⇒ «LOI-NODE»
do_cay() {
  dung_db || { echo "LOI-NODE"; return; }
  local ra
  ra=$( (cd "$1" && V3_KHOA_MA_HOA="${V3_KHOA_MA_HOA:-$(printf 'e%.0s' $(seq 64))}" V3_KHOA_VE="${V3_KHOA_VE:-tt1b-cong-signing-key-tt1b-cong-signing-key-x}" \
        node --import "$1/test/_an-toan.mjs" "$TAM/do-tt1b.mjs" "$1" "$URL_SB" 2>"$TAM/do-err.txt") | grep -E '^P[0-9a-z]+\|')
  [ -n "$ra" ] || { echo "LOI-NODE"; return; }
  echo "$ra" | sed -E "s/^(P5\|.*)$/\1 ban_bang=$(ban_bang "$1")/"
}
lay() { echo "$1" | grep -E "^$2\|" | head -1 | cut -d'|' -f2-; }

# ═══ ①–⑤ PHÉP NỘI DUNG trên cây làm việc ════════════════════════════════════════════════════════════════════════════════════════
DO=$(do_cay "$GOC"); grep -F '(cây đo' "$TAM/do-err.txt" >&2; [ "$DO" = LOI-NODE ] && tail -15 "$TAM/do-err.txt" | sed 's/^/   ↳ /'
# Đáp án — từ HỢP ĐỒNG phiếu (② 2–3 · ④) + hệ số POS (TWD ×1 · EUR/SAR/KWD ×100), không từ code bị đo.
P1A_CHO='tw_usd=CHAN_RO eu_twd=CHAN_RO hon_hop=CHAN_RO ghi_moi=0 doi_phien_ban=0'
P1B_CHO='Europe=4999EUR Taiwan=990TWD Saudi=9900SAR'
P1C_CHO="$P1A_CHO"
P1D_CHO="$P1B_CHO"
P2A_CHO='post=0 loi=LoiThieuThamChieuSanPham:lech_te_thi_truong nk_b_te=1 nk_a=0 cau=RO hang_cho=cho_duyet'
P2B_CHO='post=0 loi=LoiThieuThamChieuSanPham:lech_te_thi_truong nk_b_te=1 hang_cho=cho_duyet'
P2C_CHO='post=1 shipping_fee=990 tao=true nk_chan=0'
P2D_CHO='post=0 thieu=shop_lech'
P2F_CHO='post=1 shipping_fee=15900 tao=true'
P2E_CHO='dang_nhap=200 status=400 cau=RO post=0 hang_cho=cho_duyet'
P3_CHO='chiGia=99000USD day_du=49TWD'
P4_CHO='khong_ket_noi=CHAN_RO hai_team=B:CHAN_RO,A:NHAN tat=NHAN japan=CHAN_RO ghi_khi_chan=0 trim=NHAN xoa_het=NHAN(rong)'
P5_CHO='cung_doi_tuong=1 so_khoa=12 ban_bang=1'
DS_P='P1a P1b P1c P1d P2a P2b P2c P2d P2e P2f P3 P4 P5'
cho_cua() { local v; v="$(echo "$1" | tr '[:lower:]' '[:upper:]')_CHO"; echo "${!v}"; }

muc "① ④1 · lưu giá món POS (repro F1): Taiwan «USD» 990 · Europe «TWD» 49 · bậc 2 sai tệ ⇒ 400 rõ, 0 ghi; đúng tệ ⇒ lưu — cả hai đường"
bang "P1a chỉ-giá · chặn sai tệ" "$(lay "$DO" P1a)" "$P1A_CHO"
bang "P1b chỉ-giá · đúng tệ lưu thành" "$(lay "$DO" P1b)" "$P1B_CHO"
bang "P1c đầy đủ · chặn sai tệ" "$(lay "$DO" P1c)" "$P1C_CHO"
bang "P1d đầy đủ · đúng tệ lưu thành" "$(lay "$DO" P1d)" "$P1D_CHO"
muc "② ④2 · taoDon cửa (b) qua duyet: lệch tệ / thị trường ngoài bảng ⇒ 0 POST + nhật ký cửa «b»; đúng tệ ⇒ 1 POST; 2b vị trí; 2c HTTP sale"
bang "P2a Taiwan đơn USD" "$(lay "$DO" P2a)" "$P2A_CHO"
bang "P2b Japan (ngoài bảng) đơn JPY" "$(lay "$DO" P2b)" "$P2B_CHO"
bang "P2c Taiwan đơn TWD (cùng env) — CHO-QUA" "$(lay "$DO" P2c)" "$P2C_CHO"
bang "P2d món nhầm shop + tệ lệch ⇒ shop_lech" "$(lay "$DO" P2d)" "$P2D_CHO"
bang "P2e POST /api/hop-thu/don/:id/duyet" "$(lay "$DO" P2e)" "$P2E_CHO"
bang "P2f thị trường «Qatar » (gọt) đơn QAR — CHO-QUA" "$(lay "$DO" P2f)" "$P2F_CHO"
muc "③ ④3 · món kb với tệ bất kỳ trong HE_SO_TE ⇒ lưu như cũ"
bang "P3 món kb" "$(lay "$DO" P3)" "$P3_CHO"
muc "④ ④4 · thiếu kết nối · hai team chung shop · kết nối tắt · thị trường ngoài bảng · tên dính khoảng trắng · xoá hết bậc"
bang "P4 tra kết nối theo (team, shop), không lọc bat" "$(lay "$DO" P4)" "$P4_CHO"
muc "⑤ ④5 · một bảng (cùng đối tượng · 12 khoá · grep -rcE 'Saudi: \"SAR\"' src/ = 1) + bộ ca TT1 (T0b) xanh"
bang "P5 một bảng" "$(lay "$DO" P5)" "$P5_CHO"
o=$(chay_ca "$GOC" test/tt1-tien-te-ngoai-gcc.test.mjs); p=$(dem "$o" pass); f=$(dem "$o" fail); p=${p:-0}; f=${f:-1}
t0b=$(echo "$o" | grep -cE "^\s*✔ T0b ")
[ "$f" -eq 0 ] && [ "$p" -ge 11 ] && [ "$t0b" -eq 1 ] && dat "bộ ca TT1 pass=$p fail=0 (sàn ≥11) · T0b xanh" || truot "bộ ca TT1 pass=$p fail=$f · T0b xanh=$t0b"

# ═══ ⑥ ĐẢO-VÁ trên BẢN SAO TẠM — mỗi đột biến: bộ đo nội dung phải lệch ĐÚNG phép (phép khác giữ nguyên), và bộ ca TT1b phải có ca đỏ ═══
muc "⑥ đảo-vá (bản sao tạm; cây làm việc không bao giờ bị sửa)"
cp -R src v3 test db package.json "$TAM/"; ln -s "$GOC/node_modules" "$TAM/node_modules"
DS_TEP_DOT='src/pos/tao-don.js src/admin-v3/operations.js src/products/chuyen-ban-sao.js'
bam_cay() { (for f in $DS_TEP_DOT; do cat "$GOC/$f"; done) | shasum | cut -d' ' -f1; }
BAM_TRUOC=$(bam_cay)
for f in $DS_TEP_DOT; do cp "$TAM/$f" "$TAM/$f.goc"; done
# tên | tệp | phép PHẢI lệch (cách nhau bằng ,) · phép còn lại phải GIỮ (lệch theo ⇒ đột biến làm hỏng bộ đo chứ không đo đúng hành vi ⇒ KHÔNG
# tính là bắt được). Bốn đột biến đầu là ④6 của phiếu; năm cái sau canh từng vế hợp đồng ② (bat · cặp team × shop · mọi bậc · vị trí · một bảng);
# hai cái cuối canh hai sửa sau /code-review (một luật tra bảng có gọt · offers rỗng cho xoá hết bậc).
DS_DOT_BIEN='
bo_chan_luu|src/admin-v3/operations.js|P1a,P1c,P4
bo_chan_tao_don|src/pos/tao-don.js|P2a,P2b,P2e
cho_qua_ngoai_bang|src/pos/tao-don.js|P2b
chan_ca_kb|src/admin-v3/operations.js|P3
loc_bat|src/admin-v3/operations.js|P4
shop_tron|src/admin-v3/operations.js|P4
chi_bac_dau|src/admin-v3/operations.js|P1a,P1c
dat_truoc_shop_lech|src/pos/tao-don.js|P2d
chep_bang_thu_hai|src/products/chuyen-ban-sao.js|P5
bo_trim|src/pos/tao-don.js|P2f,P4
xoa_het_bi_chan|src/admin-v3/operations.js|P4
'
while IFS='|' read -r ten tep lech; do
  [ -z "$ten" ] && continue
  cp "$TAM/$tep.goc" "$TAM/$tep"
  if ! python3 - "$TAM/$tep" "$ten" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1]); s = p.read_text(encoding='utf-8'); ten = sys.argv[2]
if ten == 'dat_truoc_shop_lech':
    # dời NGUYÊN khối kiểm tệ lên TRƯỚC layKetNoi + kiểm shop_lech (đúng chỗ bản vá thử của review đặt)
    a = s.index('  // ── CỬA (b) · TT1b'); b = s.index('\n  const payload = dungPayload(', a)
    khoi = s[a:b]; s2 = s[:a] + s[b:]
    neo = '  const ketNoi = await layKetNoi(pool, ctx, market, { teamId, env });\n'
    assert s2.count(neo) == 1, ten
    p.write_text(s2.replace(neo, khoi + '\n' + neo), encoding='utf-8'); sys.exit(0)
cap = {
  'bo_chan_luu': [('    if (p.nguon === "pos") await kiemTeThiTruong(c, bc.teamId, p, input.offers);\n', '')],
  'chan_ca_kb': [('if (p.nguon === "pos") await kiemTeThiTruong(', 'if (true) await kiemTeThiTruong(')],
  'loc_bat': [('"SELECT market FROM ket_noi_pos WHERE team_id = $1 AND shop_id = $2"', '"SELECT market FROM ket_noi_pos WHERE team_id = $1 AND shop_id = $2 AND bat"')],
  # tra theo shop_id TRƠN + LIMIT 1 (bỏ vế team) — kiểu tra review (a) N2 cảnh báo
  'shop_tron': [('"SELECT market FROM ket_noi_pos WHERE team_id = $1 AND shop_id = $2"', '"SELECT market FROM ket_noi_pos WHERE $1::bigint > 0 AND shop_id = $2 ORDER BY id LIMIT 1"')],
  'chi_bac_dau': [('const sai = offers.find((g) => g.tien_te !== te);', 'const sai = offers.slice(0, 1).find((g) => g.tien_te !== te);')],
  'bo_chan_tao_don': [('  if (teDon !== teThiTruong) {', '  if (false) {')],
  'cho_qua_ngoai_bang': [('  if (teDon !== teThiTruong) {', '  if (teThiTruong && teDon !== teThiTruong) {')],
  'bo_trim': [('  const m = String(market ?? "").trim();\n', '  const m = String(market ?? "");\n')],
  'xoa_het_bi_chan': [('  if (!offers.length) return;\n', '')],
  # bản chép THỨ HAI của bảng (cùng nội dung) ở chuyen-ban-sao — vẫn chạy được, nhưng hai bảng = một bản vá chỉ tới một bên
  'chep_bang_thu_hai': [('import { HE_SO_TE, TIEN_TE_THI_TRUONG } from "../pos/tao-don.js";', 'import { HE_SO_TE } from "../pos/tao-don.js";'),
                        ('export { TIEN_TE_THI_TRUONG };', 'export const TIEN_TE_THI_TRUONG = Object.freeze({\n  Saudi: "SAR", UAE: "AED", Kuwait: "KWD", Qatar: "QAR", Oman: "OMR", Bahrain: "BHD",\n  Europe: "EUR", Romania: "RON", Slovakia: "EUR", USA: "USD", Australia: "AUD", Taiwan: "TWD",\n});')],
}[ten]
for old, new in cap:
    assert s.count(old) == 1, (ten, old[:60])
    s = s.replace(old, new)
p.write_text(s, encoding='utf-8')
PY
  then truot "đảo-vá $ten: không áp được đột biến (khuôn không còn khớp — sửa thước)"; continue; fi
  DB_DOT=$(do_cay "$TAM")
  lech_thay=""; giu_hong=""
  for P in $DS_P; do
    cho="$(cho_cua "$P")"; that="$(lay "$DB_DOT" "$P")"
    if echo ",$lech," | grep -qF ",$P,"; then [ "$that" != "$cho" ] && lech_thay="$lech_thay $P"
    else [ "$that" = "$cho" ] || giu_hong="$giu_hong $P"; fi
  done
  so_doi=$(echo "$lech" | tr ',' '\n' | grep -c .); so_thay=$(echo "$lech_thay" | wc -w | tr -d ' ')
  oc=$(chay_ca "$TAM" "$CA"); fc=$(dem "$oc" fail); fc=${fc:-0}
  cp "$TAM/$tep.goc" "$TAM/$tep"
  so "đột biến $ten" "phép lệch:${lech_thay:- (không)} / đòi $lech · phép khác lệch theo:${giu_hong:- 0} · bộ ca fail=$fc"
  [ "$so_thay" -eq "$so_doi" ] && [ -z "$giu_hong" ] && [ "$fc" -ge 1 ] && dat "đảo-vá $ten ⇒ $lech đỏ + bộ ca đỏ ($fc)" \
    || truot "đảo-vá $ten: đột biến SỐNG hoặc làm hỏng bộ đo (lệch=$so_thay/$so_doi · lệch theo:${giu_hong:- 0} · bộ ca fail=$fc)"
done <<< "$DS_DOT_BIEN"
# lượt khôi phục: bản sao về bản gốc phải xanh lại (thước không tự đỏ)
DB_LAI=$(do_cay "$TAM"); hong=0
for P in $DS_P; do [ "$(lay "$DB_LAI" "$P")" = "$(cho_cua "$P")" ] || hong=$((hong+1)); done
bang "khôi phục bản sao ⇒ số phép lệch" "$hong" "0"
[ "$BAM_TRUOC" = "$(bam_cay)" ] && dat "cây làm việc không dính đột biến (băm 3 tệp đột biến trước = sau)" || truot "cây làm việc BỊ ĐỔI trong lượt đảo-vá"

# ═══ ⑦ BỘ CA + CỔNG CŨ (rc TÁCH DÒNG) ════════════════════════════════════════════════════════════════════════════════════════════
muc "⑦ bộ ca TT1b + lưới hồi quy gần (sáu tệp ca ③ — assert không đổi) + cổng cũ"
o=$(chay_ca "$GOC" "$CA"); p=$(dem "$o" pass); f=$(dem "$o" fail); p=${p:-0}; f=${f:-1}
[ "$f" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -6 | sed 's/^/   ↳ /'
[ "$f" -eq 0 ] && [ "$p" -ge 22 ] && dat "bộ ca TT1b pass=$p fail=0 (sàn ≥22)" || truot "bộ ca TT1b pass=$p fail=$f"
for t in test/he-so-te-doi-chieu-don-that.test.js test/gsp3-doi-soat.test.mjs test/l3-m4-duyet.test.js test/va-r2-tien-tao-don.test.js \
         test/ll2-hop-thu.test.mjs test/frontend-v3-e2e.test.js test/mn3-ban-chep-bot.test.mjs test/mn4-anh-router.test.mjs; do
  o=$(chay_ca "$GOC" "$t"); p=$(dem "$o" pass); f=$(dem "$o" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -4 | sed 's/^/   ↳ /'
  [ "$f" -eq 0 ] && [ "$p" -ge 1 ] && dat "lưới gần $t pass=$p fail=0" || truot "lưới gần $t pass=$p fail=$f"
done
if [ "${BO_CONG_CU:-0}" = 1 ]; then
  truot "cổng cũ: BỎ theo BO_CONG_CU=1 — lượt soi nhanh, KHÔNG phải nghiệm thu (rc≠0 cố ý)"
else
  # Cổng cũ ĐỎ ⇒ ĐỐI CHỨNG cùng thước: chạy CHÍNH cổng đó trên worktree tạm ở $BASE, so DANH SÁCH dòng đỏ (chuẩn hoá id/pid).
  # Giống hệt ⇒ đỏ SẴN có trước phiếu (nợ cũ), 0 dòng đỏ mới ⇒ đạt; khác một dòng ⇒ đỏ.
  SHIM="$TAM/shim"; mkdir -p "$SHIM"; printf '#!/bin/sh\nexec grep -E "$@"\n' > "$SHIM/rg"; chmod +x "$SHIM/rg"
  PATH_CON="$PATH"; command -v rg >/dev/null 2>&1 || PATH_CON="$SHIM:$PATH"
  chuan_do() { grep -E "✘|🔴" | sed -E 's/[0-9]{4,}//g; s/p[0-9]+//g' | sort; }
  TRAN_CON="${TRAN_CON:-2700}"
  giet_cay() { local c; for c in $(pgrep -P "$1" 2>/dev/null); do giet_cay "$c"; done; kill -KILL "$1" 2>/dev/null; }
  chay_con() {   # chay_con <tệp cổng> — in log cổng con; rc=124 khi quá TRAN_CON giây (giết CẢ cây con, kể cả nhóm tiến trình khác)
    local tep=$1 out; out=$(mktemp)
    set -m; PATH="$PATH_CON" bash "$tep" > "$out" 2>&1 & local pid=$!; set +m
    local t=0
    while kill -0 "$pid" 2>/dev/null; do
      sleep 5; t=$((t+5))
      if [ "$t" -ge "$TRAN_CON" ]; then giet_cay "$pid"; kill -KILL -- "-$pid" 2>/dev/null; wait "$pid" 2>/dev/null; cat "$out"; rm -f "$out"; return 124; fi
    done
    wait "$pid"; local rc=$?; cat "$out"; rm -f "$out"; return "$rc"
  }
  WT_BASE=""
  don_wt() { [ -n "$WT_BASE" ] && git worktree remove --force "$WT_BASE" >/dev/null 2>&1; git worktree prune >/dev/null 2>&1; true; }
  trap 'don_wt; don' EXIT INT TERM
  for g in tt1 gsp3 l3-m4 va-r2 ll2; do
    _o=$(chay_con "ops/bin/nghiem-thu/$g.sh"); _r=$?
    if [ "$_r" -eq 0 ]; then dat "cổng cũ $g rc=0"; continue; fi
    if [ "$_r" -eq 124 ]; then
      echo "$_o" | grep -E "✘|🔴" | tail -3 | sed 's/^/   ↳ /'
      truot "cổng cũ $g TREO quá ${TRAN_CON}s — giết cả cây; chạy riêng cổng đó để phân biệt chập chờn"; continue
    fi
    _moi=$(echo "$_o" | chuan_do)
    if [ -z "$_moi" ]; then echo "$_o" | tail -3 | sed 's/^/   ↳ /'; truot "cổng cũ $g rc=$_r mà không in dòng đỏ nào — cổng con chết giữa chừng"; continue; fi
    if [ -z "$WT_BASE" ]; then
      WT_BASE="$TAM/wt-base"
      git worktree add -q --detach "$WT_BASE" "$BASE" >/dev/null 2>&1 && ln -s "$GOC/node_modules" "$WT_BASE/node_modules" \
        && { [ ! -f "$GOC/.env" ] || ln -s "$GOC/.env" "$WT_BASE/.env"; }
    fi
    _cu=$( (cd "$WT_BASE" 2>/dev/null && chay_con "ops/bin/nghiem-thu/$g.sh") | chuan_do)
    _them=$(comm -13 <(echo "$_cu") <(echo "$_moi") | grep -c .)
    if [ -n "$_cu" ] && [ "$_them" -eq 0 ]; then
      dat "cổng cũ $g rc=$_r — ĐỎ SẴN ở $BASE: $(echo "$_moi" | grep -c .) dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ cũ, không do TT1b)"
    else
      comm -13 <(echo "$_cu") <(echo "$_moi") | head -5 | sed 's/^/   ↳ MỚI: /'
      truot "cổng cũ $g rc=$_r · $_them dòng đỏ MỚI so với $BASE"
    fi
  done
fi
# npm test (④7 «không thêm ca đỏ») — chỉ khi CHAY_NPM_TEST=1. Mốc base 6e9f373 (= b04d0dc về mã, đo 07/10 trên bản sao git archive):
# 2563 ca · 2541 pass · 0 fail · 22 skip.
if [ "${CHAY_NPM_TEST:-}" = 1 ]; then
  o=$(npm test 2>&1); nt=$(dem "$o" tests); nf=$(dem "$o" fail)
  [ "${nf:-1}" -eq 0 ] && dat "npm test tests=${nt:-?} fail=0" || truot "npm test tests=${nt:-?} fail=${nf:-?}"
else
  echo "   npm test: HOÃN (đặt CHAY_NPM_TEST=1 khi không lượt đo nào khác đang chạy) — không tính vào PHÉP/LỖI"
fi

echo; echo "PHÉP=$PHEP LỖI=$LOI · môi trường: máy dev, hộp cát $DB"
exit $((LOI > 0))
