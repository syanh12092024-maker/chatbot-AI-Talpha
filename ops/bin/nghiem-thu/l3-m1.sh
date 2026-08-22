#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU L3-M1 — Máy trạng thái đơn PHÂN NHÁNH THEO NGUỒN.
# Thi hành đúng bảy phép của ④ trong docs/thi-cong/phieu/PHIEU-L3-M1.md.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT DANH SÁCH. Không dòng nào chỉ nói "chạy xong".
#
# BA TRẠNG THÁI, không phải hai — ✔ ĐẠT · ✘ TRƯỢT · ⏸ HOÃN (khuôn l1-m1/l1-m3.sh).
# «Hoãn» là phép CỐ Ý chưa chạy ở đây: gửi WhatsApp THẬT (§7b T1, endpoint chưa chốt) và
# ghi ngược POS THẬT (§7b T2, cần V3_POS_GHI=1 + đơn nháp). Gộp hoãn vào đạt là nói dối.
#
# Cổng TỰ DỰNG CSDL sandbox `aicloser_v3_nt_l3m1` từ khuôn trần rồi TỰ DỌN (luật 11 sổ
# điều hành) — KHÔNG chạm `aicloser_v3` dev (đơn thật + dữ liệu thợ song song — số dòng
# KHÔNG cố định, ⑦b tự đo bất biến TRƯỚC≡SAU thay vì neo hằng số), KHÔNG chạm mạng nào
# (hai cửa ngoài đều là spy tiêm qua deps).
#
#   bash ops/bin/nghiem-thu/l3-m1.sh
#   GIU_SANDBOX=1 bash ops/bin/nghiem-thu/l3-m1.sh   # giữ CSDL lại để soi tay
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

CONTAINER="talpha-pg"
DB="aicloser_v3_nt_l3m1"
LOI=0
PHEP=0
HOAN=0

muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-58s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP + 1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP + 1)); LOI=$((LOI + 1)); printf '   ✘ %s\n' "$1"; }
hoan()  { HOAN=$((HOAN + 1)); printf '   ⏸ HOÃN — %s\n' "$1"; }
bang() {
  so "$1" "$2"
  case "$2" in
    *LOI-NODE*) truot "$1: câu đo HỎNG (LOI-NODE) — không đọc là đạt"; return ;;
  esac
  if [ "$2" = "$3" ]; then dat "$1 = $3"; else truot "$1: thật=$2 · chờ=$3"; fi
}

# Chạy một khối node -e; in đúng NỘI DUNG stdout, hoặc "LOI-NODE" khi rc≠0 — KHÔNG in
# nguyên văn lỗi (hai lượt cùng hỏng ra hai chuỗi BẰNG NHAU thì phép so đọc nhầm ĐẠT).
nodex() {
  local out
  if out="$(node -e "$1" 2>/tmp/l3m1-node-err.txt)"; then
    printf '%s' "${out}"
  else
    printf 'LOI-NODE'
  fi
}

if ! docker ps --format '{{.Names}}' | grep -qx "${CONTAINER}"; then
  echo "✘ container ${CONTAINER} không chạy — cổng không đo được"; exit 2
fi
docker exec "${CONTAINER}" psql -U aicloser -d postgres -tAc \
  "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1
if ! docker exec "${CONTAINER}" psql -U aicloser -d postgres -v ON_ERROR_STOP=1 -tAc \
  "CREATE DATABASE ${DB}" >/dev/null 2>&1; then
  echo "✘ không tạo được CSDL sandbox ${DB} — cổng dừng"; exit 2
fi

# CHỤP chuỗi nối CSDL DEV *TRƯỚC* khi ghi đè — phép ⑦b đo trên dev, và một phép «đo dev»
# chạy dưới biến đã trỏ sandbox là phép đo sai môi trường (án lệ: ghi TÊN MÔI TRƯỜNG vào
# chính câu kết luận). Vòng 1 của cổng này dính đúng lỗi đó: in «26 đơn thật» ra 18|1.
URL_DEV="$(node -e '
const { chuoiNoi } = await import("./db/ket-noi.js"); console.log(chuoiNoi());
')"
DATABASE_URL_V3="$(node -e '
const u = new URL(process.argv[1]); u.pathname = "/" + process.argv[2]; console.log(u.toString());
' "${URL_DEV}" "${DB}")"
export DATABASE_URL_V3
V3_KHOA_MA_HOA="$(node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))')"
export V3_KHOA_MA_HOA

don_dep() {
  if [ "${GIU_SANDBOX:-0}" = "1" ]; then
    printf '\n(giữ lại CSDL %s theo GIU_SANDBOX=1)\n' "${DB}"
  else
    docker exec "${CONTAINER}" psql -U aicloser -d postgres -tAc \
      "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1
  fi
}
trap don_dep EXIT

echo "CỔNG NGHIỆM THU L3-M1 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo: ${DB} (sandbox, KHÔNG phải aicloser_v3 dev) · container ${CONTAINER}"

# Đếm đơn thật trên DEV — gọi LẶP LẠI ở đầu và ở ⑦b để so DELTA. 23/08 VA-T1 vá
# (chẩn đoán #2): hằng số chụp-thời-điểm «26|26» hết hạn ngay khi VA-Q12 backfill
# (26 → 3.784) — bất biến đúng là TRƯỚC lượt chạy ≡ SAU lượt chạy, không phải một số.
dem_dev_don() {
  DATABASE_URL_V3="${URL_DEV}" node -e '
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const r = await pool.query(
    "SELECT count(*)::int tong, count(*) FILTER (WHERE trang_thai_he=$1)::int gieo FROM don_hang", ["moi_tu_pos"]);
  console.log(`${r.rows[0].tong}|${r.rows[0].gieo}`);
});' 2>/dev/null || printf 'LOI-NODE'
}
DEV_TRUOC="$(dem_dev_don)"
so "đơn thật trên DEV TRƯỚC lượt (tổng|còn ở moi_tu_pos)" "${DEV_TRUOC}"

node db/migrate.js >/dev/null 2>&1
CO_COT="$(docker exec "${CONTAINER}" psql -U aicloser -d "${DB}" -tAc \
  "SELECT count(*) FROM information_schema.columns WHERE table_name='don_hang' AND column_name IN ('ly_do_khong_gui','so_lan_thu_wa')" 2>/dev/null | tr -d ' ')"
so "migration 004 — hai cột mới trên don_hang" "${CO_COT}"
[ "${CO_COT}" = "2" ] || { echo "✘ migration 004 chưa áp được — cổng dừng"; exit 2; }

# ═══ ① NHÁNH MESSENGER SẠCH WA — phép ĐẮT NHẤT (02 §L3 gạch 2) ════════════════
# Cùng một CSDL, cùng một spy cửa WA: đơn messenger đi trọn đường của nó, và spy phải
# đứng ở 0 TUYỆT ĐỐI. Ba vế trong MỘT lượt đo: đích tới · tên lỗi khi ép sai nhánh ·
# số dòng pre-duyệt trong don_hang.
muc "① NHÁNH MESSENGER SẠCH WHATSAPP (đích · tên lỗi · pre-duyệt)"
KQ1="$(nodex '
const { donMessengerDaTao, apDung } = await import("./src/orders/index.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const goi = [];
  // spy đặt Ở CHỖ CỬA WA THẬT SẼ ĐƯỢC GỌI: job quét + mọi hook nhận deps.guiTinMau.
  const spy = async (...a) => { goi.push(a); return { ok: true }; };
  const d = (await pool.query(
    "INSERT INTO don_hang (team_id,ma_pos,nguon,trang_thai_he,trang_thai_pos) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [t,"9999:100001","messenger","moi_tu_pos","12"])).rows[0];
  const kq = await donMessengerDaTao(pool, ctxHeThong(), { donId: d.id });
  let ten = "KHONG-NEM-LOI";
  try { await apDung(pool, ctxHeThong(), { donId: d.id, sukien: "xac_nhan" }); }
  catch (e) { ten = e.name; }
  // job quét chạy trên CẢ CSDL: đơn messenger phải KHÔNG được nhặt lượt nào
  const { quetDonMoi } = await import("./src/orders/index.js");
  const q = await quetDonMoi(pool, {}, { guiTinMau: spy });
  const pre = (await pool.query(
    "SELECT count(*)::int c FROM don_hang WHERE nguon=$1 AND trang_thai_he = ANY($2)",
    ["messenger",["moi","cho_gui_wa","da_gui_wa","gui_wa_loi"]])).rows[0].c;
  console.log(`${kq.sang}|${ten}|${goi.length}|${q.quet}|${pre}`);
});')"
so "kết quả ①" "${KQ1}"
bang "①a messenger → đích" "$(echo "${KQ1}" | cut -d'|' -f1)" "day_cho_in"
bang "①b ép sang trạng thái WA → tên lỗi" "$(echo "${KQ1}" | cut -d'|' -f2)" "LoiSaiNhanhNguon"
bang "①c spy cửa WA (TUYỆT ĐỐI 0)" "$(echo "${KQ1}" | cut -d'|' -f3)" "0"
bang "①d đơn messenger bị job quét nhặt" "$(echo "${KQ1}" | cut -d'|' -f4)" "0"
bang "①e dòng don_hang messenger ở trạng thái pre-duyệt" "$(echo "${KQ1}" | cut -d'|' -f5)" "0"

# ═══ ② NHÁNH TRANG BÁN HÀNG — gửi ĐÚNG 1 lượt, quét lần 2 không gửi lại ═══════
muc "② NHÁNH TRANG BÁN HÀNG — quét ≤5′, gửi 1 lượt, idempotent"
KQ2="$(nodex '
const { quetDonMoi, NHIP_QUET_MS, TRAN_QUET_MS } = await import("./src/orders/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const kh = (await pool.query("INSERT INTO khach (team_id,so_dien_thoai) VALUES ($1,$2) RETURNING id",[t,"+971500000101"])).rows[0];
  const d = (await pool.query(
    "INSERT INTO don_hang (team_id,ma_pos,nguon,trang_thai_he,trang_thai_pos,khach_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    [t,"9999:200001","trang_ban_hang","moi_tu_pos","0",kh.id])).rows[0];
  const goi = [];
  const spy = async (...a) => { goi.push(a); return { ok: true }; };
  const l1 = await quetDonMoi(pool, {}, { guiTinMau: spy });
  const s1 = (await pool.query("SELECT trang_thai_he FROM don_hang WHERE id=$1",[d.id])).rows[0].trang_thai_he;
  const l2 = await quetDonMoi(pool, {}, { guiTinMau: spy });
  const g = goi[0] ? goi[0][2] : {};
  console.log(`${l1.daGui}|${s1}|${goi.length}|${l2.quet}|${g.tenMau}|${g.soNhan}|${g.thamSo && g.thamSo.ma_don}|${NHIP_QUET_MS<=TRAN_QUET_MS}`);
});')"
so "kết quả ② (daGui|trạng thái|spy|quét-2|mẫu|số|mã đơn|nhịp≤5′)" "${KQ2}"
bang "②a gửi lượt đầu" "$(echo "${KQ2}" | cut -d'|' -f1)" "1"
bang "②b trạng thái sau gửi" "$(echo "${KQ2}" | cut -d'|' -f2)" "da_gui_wa"
bang "②c spy sau HAI lượt quét (idempotent)" "$(echo "${KQ2}" | cut -d'|' -f3)" "1"
bang "②d lượt quét 2 nhặt được" "$(echo "${KQ2}" | cut -d'|' -f4)" "0"
so   "②e tham số mẫu tin đã gửi" "mẫu=$(echo "${KQ2}" | cut -d'|' -f5) · số=$(echo "${KQ2}" | cut -d'|' -f6) · ma_don=$(echo "${KQ2}" | cut -d'|' -f7)"
bang "②f nhịp quét ≤ trần 5 phút" "$(echo "${KQ2}" | cut -d'|' -f8)" "true"

# ═══ ②b BA LÝ DO KHÔNG GỬI — phép ĐẮT NHẤT thứ hai (N2) ═══════════════════════
# Ba ca ép trong MỘT lượt quét, cộng một đơn messenger nằm cùng CSDL để chứng minh phép
# đếm «trên riêng đơn trang bán hàng» không dính nó.
muc "②b BA LÝ DO KHÔNG GỬI — SELECT đếm THEO LÝ DO, đơn messenger phải = 0"
KQ2B="$(nodex '
const { quetDonMoi } = await import("./src/orders/index.js");
const { LoiMauChuaDuyet, LoiCuaGuiDong } = await import("./src/channels/whatsapp/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["auus"])).rows[0].id;
  const kh = async (s) => (await pool.query("INSERT INTO khach (team_id,so_dien_thoai) VALUES ($1,$2) RETURNING id",[t,s])).rows[0].id;
  const don = async (ma,nguon,k) => (await pool.query(
    "INSERT INTO don_hang (team_id,ma_pos,nguon,trang_thai_he,trang_thai_pos,khach_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    [t,ma,nguon,"moi_tu_pos","0",k])).rows[0].id;
  const d1 = await don("9999:300001","trang_ban_hang",null);            // thiếu số WA
  const d2 = await don("9999:300002","trang_ban_hang", await kh("+971500000102"));
  const d3 = await don("9999:300003","trang_ban_hang", await kh("+971500000103"));
  await don("9999:300004","messenger", await kh("+971500000104"));
  const goi = [];
  const spy = async (pool_, ctx, g) => {
    goi.push(g);
    if (String(g.donHangId) === String(d2)) throw new LoiMauChuaDuyet("mẫu chưa duyệt");
    if (String(g.donHangId) === String(d3)) throw new LoiCuaGuiDong("cửa đóng");
    return { ok: true };
  };
  const kq = await quetDonMoi(pool, {}, { guiTinMau: spy, tranThuLai: 9 });
  const dem = (await pool.query(
    `SELECT ly_do_khong_gui, count(*)::int c FROM don_hang
      WHERE team_id=$1 AND nguon='"'"'trang_ban_hang'"'"' AND trang_thai_he='"'"'gui_wa_loi'"'"'
      GROUP BY 1 ORDER BY 1`, [t])).rows.map(r => `${r.ly_do_khong_gui}=${r.c}`).join(",");
  const msg = (await pool.query(
    "SELECT count(*)::int c FROM don_hang WHERE nguon=$1 AND ly_do_khong_gui IS NOT NULL",["messenger"])).rows[0].c;
  console.log(`${kq.quet}|${dem}|${msg}|${goi.length}|${d1?1:1}`);
});')"
so "kết quả ②b (quét|đếm theo lý do|messenger|spy)" "${KQ2B}"
bang "②b1 đơn trang bán hàng được quét" "$(echo "${KQ2B}" | cut -d'|' -f1)" "3"
bang "②b2 đếm THEO LÝ DO (1/1/1)" "$(echo "${KQ2B}" | cut -d'|' -f2)" "loi_kenh=1,mau_chua_duyet=1,thieu_so_wa=1"
bang "②b3 đơn messenger mang lý do" "$(echo "${KQ2B}" | cut -d'|' -f3)" "0"
bang "②b4 spy cửa WA (ca thiếu số KHÔNG gọi)" "$(echo "${KQ2B}" | cut -d'|' -f4)" "2"

# quá trần thử lại ⇒ cho_sale + viec_can_xu_ly
KQ2C="$(nodex '
const { quetDonMoi } = await import("./src/orders/index.js");
const { LoiCuaGuiDong } = await import("./src/channels/whatsapp/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["pialpha-eu"])).rows[0].id;
  const k = (await pool.query("INSERT INTO khach (team_id,so_dien_thoai) VALUES ($1,$2) RETURNING id",[t,"+971500000105"])).rows[0].id;
  const d = (await pool.query(
    "INSERT INTO don_hang (team_id,ma_pos,nguon,trang_thai_he,trang_thai_pos,khach_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    [t,"9999:400001","trang_ban_hang","moi_tu_pos","0",k])).rows[0].id;
  const spy = async () => { throw new LoiCuaGuiDong("cửa đóng"); };
  await quetDonMoi(pool, {}, { guiTinMau: spy, tranThuLai: 2 });
  await quetDonMoi(pool, {}, { guiTinMau: spy, tranThuLai: 2 });
  const l3 = await quetDonMoi(pool, {}, { guiTinMau: spy, tranThuLai: 2 });
  const r = (await pool.query("SELECT trang_thai_he, so_lan_thu_wa, ly_do_khong_gui FROM don_hang WHERE id=$1",[d])).rows[0];
  const v = (await pool.query("SELECT ly_do_day FROM viec_can_xu_ly WHERE don_hang_id=$1",[d])).rows;
  console.log(`${r.trang_thai_he}|${r.so_lan_thu_wa}|${r.ly_do_khong_gui}|${v.length}|${l3.quet}|${v[0] ? v[0].ly_do_day : ""}`);
});')"
so "kết quả ②b quá trần" "${KQ2C}"
bang "②b5 quá trần → trạng thái" "$(echo "${KQ2C}" | cut -d'|' -f1)" "cho_sale"
bang "②b6 số lần thử" "$(echo "${KQ2C}" | cut -d'|' -f2)" "2"
bang "②b7 lý do đã dọn khi rời gui_wa_loi (bất biến 004)" "$(echo "${KQ2C}" | cut -d'|' -f3)" "null"
bang "②b8 dòng viec_can_xu_ly" "$(echo "${KQ2C}" | cut -d'|' -f4)" "1"
bang "②b9 lượt quét sau đó nhặt được" "$(echo "${KQ2C}" | cut -d'|' -f5)" "0"
so   "②b10 lý do đẩy (nguyên văn)" "$(echo "${KQ2C}" | cut -d'|' -f6)"

# ═══ ③ xac_nhan — CAS THEO LIVE, ba ca đối chứng ══════════════════════════════
muc "③ xac_nhan CAS THEO LIVE — live=0 · live=1 · live=8 (in cả ba ca)"
KQ3="$(nodex '
const { nhanPhanHoi, apDung, MA_POS_CHO_IN } = await import("./src/orders/index.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const toiDaGuiWa = async (ma) => {
    const d = (await pool.query(
      "INSERT INTO don_hang (team_id,ma_pos,nguon,trang_thai_he,trang_thai_pos) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [t,ma,"trang_ban_hang","moi_tu_pos","0"])).rows[0].id;
    for (const s of ["vao_may","bat_dau_gui","gui_xong"]) await apDung(pool, ctxHeThong(), { donId: d, sukien: s });
    return d;
  };
  const ra = [];
  for (const live of [0, 1, 8]) {
    const d = await toiDaGuiWa(`9999:50${live}001`);
    const goi = [];
    const ghiNguocPos = async (p, c, a) => { goi.push(a); return { ok: true }; };
    const kq = await nhanPhanHoi(pool, ctxHeThong(), { donId: d, ket_qua: "xac_nhan" },
      { ghiNguocPos, docLivePos: async () => live });
    const cas = goi[0] ? `{tu:${goi[0].tu},sang:${goi[0].sang}}` : "KHONG-GOI";
    const pos = (await pool.query("SELECT trang_thai_pos FROM don_hang WHERE id=$1",[d])).rows[0].trang_thai_pos;
    ra.push(`live=${live}:${kq.sang}:${cas}:posGhi=${kq.posGhi}:dbPos=${pos}`);
  }
  console.log(ra.join(" · ") + "|" + MA_POS_CHO_IN);
});')"
so "kết quả ③ (ba ca)" "${KQ3}"
bang "③a ba ca CAS theo live" "$(echo "${KQ3}" | cut -d'|' -f1)" \
  "live=0:day_cho_in:{tu:0,sang:12}:posGhi=1:dbPos=0 · live=1:day_cho_in:{tu:1,sang:12}:posGhi=1:dbPos=0 · live=8:cho_sale:KHONG-GOI:posGhi=0:dbPos=0"
KQ3B="$(nodex '
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const r = await pool.query("SELECT ly_do_day FROM viec_can_xu_ly WHERE ly_do_day LIKE $1", ["pos_trang_thai_la=8%"]);
  console.log(String(r.rowCount));
});')"
bang "③b đơn live=8 có dòng viec_can_xu_ly pos_trang_thai_la" "${KQ3B}" "1"

# ③c ĐO CỬA POS THẬT (không mock) — tập tiền-in của L3-M1 vs bảng cho phép của L1-M1.
# Đây là chỗ DUY NHẤT trong cổng này nói ra rằng ca live=1 ngoài đời KHÔNG tới day_cho_in.
muc "③c ĐO CỬA POS THẬT — TAP_TIEN_IN của L3 phủ được bảng CHUYEN_CHO_PHEP của L1 tới đâu"
KQ3C="$(nodex '
const { TAP_TIEN_IN, MA_POS_CHO_IN } = await import("./src/orders/index.js");
const { CHUYEN_CHO_PHEP, kiemChuyen, BANG_MA } = await import("./src/pos/index.js");
const ra = TAP_TIEN_IN.map((tu) => {
  let v = "CHO-QUA";
  try { kiemChuyen(tu, MA_POS_CHO_IN); } catch (e) { v = e.name; }
  return `${tu}(${BANG_MA[tu]})->12:${v}`;
});
console.log(ra.join(" · ") + "|" + CHUYEN_CHO_PHEP.map(c=>`${c.tu}->${c.sang}`).join(","));')"
so "③c kết quả" "${KQ3C}"
so "③c bảng CHUYEN_CHO_PHEP thật (L1-M1)" "$(echo "${KQ3C}" | cut -d'|' -f2)"
if [ "$(echo "${KQ3C}" | cut -d'|' -f1)" = "0(new)->12:CHO-QUA · 1(submitted)->12:CHO-QUA" ]; then
  dat "③c cửa POS thật phủ TRỌN TAP_TIEN_IN — nợ 1→12 đã được vá ở L1-M1, sửa lại mục §3 ban-giao"
else
  bang "③c cửa POS thật phủ TAP_TIEN_IN" "$(echo "${KQ3C}" | cut -d'|' -f1)" \
    "0(new)->12:CHO-QUA · 1(submitted)->12:LoiChuyenNgoaiBang"
  hoan "ca live=1 NGOÀI ĐỜI đi vào cho_sale (không phải day_cho_in): CHUYEN_CHO_PHEP của L1-M1 thiếu cặp 1→12 — nợ §9, đất phiếu L1-M1"
fi

# ═══ ④ tu_choi / doi_sua / khong_ro / bao_het_luot + huyLichNhac ══════════════
muc "④ tu_choi · doi_sua · khong_ro · bao_het_luot — POS 0 lượt, huyLichNhac, viec_can_xu_ly"
KQ4="$(nodex '
const { nhanPhanHoi, baoHetLuot, apDung } = await import("./src/orders/index.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["auus"])).rows[0].id;
  const toi = async (ma) => {
    const d = (await pool.query(
      "INSERT INTO don_hang (team_id,ma_pos,nguon,trang_thai_he,trang_thai_pos) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [t,ma,"trang_ban_hang","moi_tu_pos","0"])).rows[0].id;
    for (const s of ["vao_may","bat_dau_gui","gui_xong"]) await apDung(pool, ctxHeThong(), { donId: d, sukien: s });
    return d;
  };
  const pos = []; const huy = [];
  const deps = () => ({
    ghiNguocPos: async (...a) => { pos.push(a); return { ok: true }; },
    docLivePos: async () => 0,
    huyLichNhac: async (id) => { huy.push(id); return { camChua: false }; },
  });
  const ra = [];
  const dTuChoi = await toi("9999:600001");
  const k1 = await nhanPhanHoi(pool, ctxHeThong(), { donId: dTuChoi, ket_qua: "tu_choi" }, deps());
  ra.push(`tu_choi:${k1.sang}`);
  const dXn = await toi("9999:600002");
  await nhanPhanHoi(pool, ctxHeThong(), { donId: dXn, ket_qua: "xac_nhan" }, deps());
  for (const kq of ["doi_sua","khong_ro"]) {
    const d = await toi(`9999:6000${kq.length}${kq[0]}`.slice(0,14));
    const k = await nhanPhanHoi(pool, ctxHeThong(), { donId: d, ket_qua: kq }, deps());
    const v = (await pool.query("SELECT ly_do_day FROM viec_can_xu_ly WHERE don_hang_id=$1",[d])).rows;
    ra.push(`${kq}:${k.sang}:viec=${v.length}:${v[0].ly_do_day.split(":")[0]}`);
  }
  const dHet = await toi("9999:600005");
  const kh = await baoHetLuot(pool, ctxHeThong(), { donId: dHet });
  const vh = (await pool.query("SELECT ly_do_day FROM viec_can_xu_ly WHERE don_hang_id=$1",[dHet])).rows;
  ra.push(`bao_het_luot:${kh.tu}->${kh.sukien}->${kh.sang}:viec=${vh.length}`);
  // POS chỉ được gọi ở ca xac_nhan; huyLichNhac gọi ở CẢ tu_choi lẫn xac_nhan
  console.log(ra.join(" · ") + `|posGoi=${pos.length}|huyGoi=${huy.length}`);
});')"
so "kết quả ④" "${KQ4}"
bang "④a bốn nhánh phản hồi" "$(echo "${KQ4}" | cut -d'|' -f1)" \
  "tu_choi:dong · doi_sua:cho_sale:viec=1:doi_sua · khong_ro:cho_sale:viec=1:khong_ro · bao_het_luot:da_gui_wa->het_luot->cho_sale:viec=1"
bang "④b lượt gọi cửa POS (chỉ ca xac_nhan)" "$(echo "${KQ4}" | cut -d'|' -f2)" "posGoi=1"
bang "④c lượt gọi huyLichNhac (xac_nhan + tu_choi)" "$(echo "${KQ4}" | cut -d'|' -f3)" "huyGoi=2"

# ═══ ⑤ BẢNG CHUYỂN PER-NGUỒN — nhảy cóc bị chặn + diff bảng code vs bàn giao ══
muc "⑤ BẢNG CHUYỂN PER-NGUỒN — cặp ngoài bảng ném + ghi nhat_ky; bảng code = bảng khai"
KQ5="$(nodex '
const { apDung } = await import("./src/orders/index.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const d = (await pool.query(
    "INSERT INTO don_hang (team_id,ma_pos,nguon,trang_thai_he,trang_thai_pos) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [t,"9999:700001","trang_ban_hang","moi_tu_pos","0"])).rows[0].id;
  await apDung(pool, ctxHeThong(), { donId: d, sukien: "vao_may" });
  const truoc = (await pool.query("SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong=$1 AND doi_tuong_id=$2",["don_chuyen_bi_chan",String(d)])).rows[0].c;
  let ten = "KHONG-NEM-LOI";
  try { await apDung(pool, ctxHeThong(), { donId: d, sukien: "xac_nhan" }); } catch (e) { ten = e.name; }
  const sau = (await pool.query("SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong=$1 AND doi_tuong_id=$2",["don_chuyen_bi_chan",String(d)])).rows[0].c;
  const con = (await pool.query("SELECT trang_thai_he FROM don_hang WHERE id=$1",[d])).rows[0].trang_thai_he;
  console.log(`${ten}|${sau - truoc}|${con}`);
});')"
so "kết quả ⑤ (tên lỗi|nhat_ky +|đơn đứng ở)" "${KQ5}"
bang "⑤a nhảy cóc moi→day_cho_in" "$(echo "${KQ5}" | cut -d'|' -f1)" "LoiChuyenNgoaiBangDon"
bang "⑤b lượt BỊ CHẶN vẫn ghi nhat_ky" "$(echo "${KQ5}" | cut -d'|' -f2)" "1"
bang "⑤c đơn đứng nguyên chỗ cũ" "$(echo "${KQ5}" | cut -d'|' -f3)" "moi"

BG="docs/v3/ban-giao/may-trang-thai-don-v1.md"
node -e '
const m = await import("./src/orders/index.js");
const d = [];
for (const [n, b] of Object.entries(m.BANG_CHUYEN)) for (const c of b) d.push(`${n} | ${c.tu} --${c.sukien}--> ${c.sang}`);
console.log(d.join("\n"));' > /tmp/l3m1-bang-code.txt 2>/dev/null
awk '/BANG-CHUYEN-MAY/{f=1;next} f&&/^```$/{if(++n==2)exit;next} f&&n==1{print}' "${BG}" \
  | sed 's/[[:space:]]*$//' > /tmp/l3m1-bang-doc.txt
DIFF="$(diff /tmp/l3m1-bang-code.txt /tmp/l3m1-bang-doc.txt | head -20)"
so "⑤d số dòng bảng chuyển đọc từ CODE" "$(grep -c . /tmp/l3m1-bang-code.txt)"
so "⑤d số dòng bảng chuyển khai trong BÀN GIAO" "$(grep -c . /tmp/l3m1-bang-doc.txt)"
if [ -z "${DIFF}" ]; then dat "⑤d diff bảng code ↔ bàn giao RỖNG"
else truot "⑤d bảng code lệch bàn giao: ${DIFF}"; fi

# ═══ ⑥ REBIND ctx PER-ĐƠN — 2 đơn 2 team trong MỘT lượt quét ═════════════════
muc "⑥ REBIND ctx PER-ĐƠN — một lượt quét, hai team, in CẶP (đơn → team_id nhật ký)"
KQ6="$(nodex '
const { quetDonMoi } = await import("./src/orders/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const tA = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const tB = (await pool.query("SELECT id FROM team WHERE slug=$1",["auus"])).rows[0].id;
  const mk = async (t, ma, so) => {
    const k = (await pool.query("INSERT INTO khach (team_id,so_dien_thoai) VALUES ($1,$2) RETURNING id",[t,so])).rows[0].id;
    return (await pool.query(
      "INSERT INTO don_hang (team_id,ma_pos,nguon,trang_thai_he,trang_thai_pos,khach_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
      [t,ma,"trang_ban_hang","moi_tu_pos","0",k])).rows[0].id;
  };
  const dA = await mk(tA, "9999:800001", "+971500000201");
  const dB = await mk(tB, "9999:800002", "+971500000202");
  const kq = await quetDonMoi(pool, {}, { guiTinMau: async () => ({ ok: true }) });
  const r = await pool.query(
    `SELECT doi_tuong_id, team_id FROM nhat_ky WHERE hanh_dong='"'"'don_doi_trang_thai'"'"' AND doi_tuong_id = ANY($1)
      GROUP BY 1,2 ORDER BY 1`, [[String(dA), String(dB)]]);
  const cap = r.rows.map(x => `${x.doi_tuong_id}->team${x.team_id}`).join(",");
  const dung = r.rows.length === 2
    && r.rows.some(x => String(x.doi_tuong_id)===String(dA) && String(x.team_id)===String(tA))
    && r.rows.some(x => String(x.doi_tuong_id)===String(dB) && String(x.team_id)===String(tB));
  console.log(`${kq.quet}|${r.rows.length}|${dung}|${cap}`);
});')"
so "kết quả ⑥ (quét|dòng cặp|đúng|cặp)" "${KQ6}"
bang "⑥a đơn quét trong MỘT lượt" "$(echo "${KQ6}" | cut -d'|' -f1)" "2"
bang "⑥b mỗi đơn ĐÚNG MỘT team trong nhat_ky" "$(echo "${KQ6}" | cut -d'|' -f2)" "2"
bang "⑥c cặp đơn→team khớp team CỦA ĐƠN" "$(echo "${KQ6}" | cut -d'|' -f3)" "true"
so   "⑥d cặp đo được" "$(echo "${KQ6}" | cut -d'|' -f4)"

# ═══ ⑦ BỘ CA + ĐƠN THẬT KHÔNG BỊ ĐỤNG ════════════════════════════════════════
muc "⑦ node --test bộ l3-m1 · và đơn thật trên aicloser_v3 KHÔNG bị đụng (bất biến)"
TEST_OUT="$(DATABASE_URL_V3="${URL_DEV}" node --test test/l3-m1-may-trang-thai.test.js test/l3-m1-quet-don.test.js 2>&1)"
TPASS="$(echo "${TEST_OUT}" | grep -E '^# pass |^ℹ pass ' | grep -oE '[0-9]+' | head -1)"
TFAIL="$(echo "${TEST_OUT}" | grep -E '^# fail |^ℹ fail ' | grep -oE '[0-9]+' | head -1)"
so "⑦a ca xanh / đỏ" "${TPASS:-?} / ${TFAIL:-?}"
bang "⑦a bộ ca l3-m1 đỏ" "${TFAIL:-LOI-NODE}" "0"

DEV_SAU="$(dem_dev_don)"
so "⑦b CSDL DEV ${URL_DEV##*/} — tổng đơn | còn ở moi_tu_pos — TRƯỚC lượt" "${DEV_TRUOC}"
so "⑦b CSDL DEV ${URL_DEV##*/} — tổng đơn | còn ở moi_tu_pos — SAU lượt" "${DEV_SAU}"
bang "⑦b bất biến: đơn thật KHÔNG bị máy đụng (SAU ≡ TRƯỚC, không neo hằng số)" "${DEV_SAU}" "${DEV_TRUOC}"

# ═══ HOÃN MINH BẠCH ══════════════════════════════════════════════════════════
muc "HOÃN MINH BẠCH — hai phép cần thế-giới-thật (sổ điều hành §7b)"
hoan "T1 · gửi WhatsApp THẬT qua Pancake — endpoint CHƯA CHỐT (adapter ném LoiChuaCoEndpoint), chờ H1"
hoan "T2 · ghi ngược trạng thái POS THẬT trên đơn nháp — cần V3_POS_GHI=1 + đơn nháp trên VPS"

printf '\n═══ TỔNG: %d phép · %d ĐỎ · %d HOÃN ═══\n' "${PHEP}" "${LOI}" "${HOAN}"
[ "${LOI}" -eq 0 ] || exit 1
exit 0
