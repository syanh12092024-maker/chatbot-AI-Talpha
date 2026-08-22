#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU L1-M1 — CỬA POS: đọc đơn / danh mục + tồn kho /
# GHI NGƯỢC trạng thái đơn với BỐN CỬA AN TOÀN.
# Thi hành đúng các phép của ④ trong docs/thi-cong/phieu/PHIEU-L1-M1.md.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT DANH SÁCH. Không dòng nào chỉ nói "chạy xong".
#
# BA TRẠNG THÁI, không phải hai — ✔ ĐẠT · ✘ TRƯỢT · ⏸ HOÃN. «Hoãn» là phép CỐ Ý chưa
# chạy ở đây (ghi ngược THẬT phải diễn tập trên VPS). Gộp hoãn vào đạt là nói dối; gộp
# vào trượt là làm cổng kêu mỗi lượt tới mức không ai đọc nữa.
#
# Cổng TỰ DỰNG CSDL sandbox rồi TỰ DỌN (luật 11 sổ điều hành). Nó CÓ CHẠM MẠNG POS
# THẬT ở phép ③/③b/④ — chỉ ĐỌC, không lượt ghi nào. Mạng hỏng ⇒ phép chuyển ⏸ HOÃN
# (NHÁNH-VPS) chứ không đọc thành TRƯỢT.
#
#   bash ops/bin/nghiem-thu/l1-m1.sh
#   GIU_SANDBOX=1 bash ops/bin/nghiem-thu/l1-m1.sh   # giữ CSDL lại để soi tay
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

CONTAINER="talpha-pg"
DB="aicloser_v3_nt_l1m1"
CHO="Taiwan"     # shop THẬT nhỏ nhất (344 đơn · 28 biến thể) — đo nhanh, chạm ít
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

# node -e in đúng NỘI DUNG stdout, hoặc chuỗi cố định "LOI-NODE" khi rc≠0 — KHÔNG in
# nguyên văn lỗi (hai lượt cùng hỏng ra hai chuỗi BẰNG NHAU thì phép so đọc nhầm là ĐẠT).
# Tham số THỨ HAI trở đi được CHUYỂN TIẾP sang node (đọc bằng process.argv[1]...).
# Bản đầu quên vế này: `shop` vào tới hàm là `undefined`, ba phép chạm POS đọc thành
# «mạng hỏng» và tụt xuống HOÃN — cổng nói sai bệnh, đúng án lệ «thước hỏng giống code hỏng».
nodex() {
  local out
  if out="$(node -e "$1" "${@:2}" 2>/tmp/l1m1-node-err.txt)"; then printf '%s' "${out}"
  else printf 'LOI-NODE'; fi
}

# ── dựng sandbox ─────────────────────────────────────────────────────────────
if ! docker ps --format '{{.Names}}' | grep -qx "${CONTAINER}"; then
  echo "✘ container ${CONTAINER} không chạy — cổng không đo được"; exit 2
fi
docker exec "${CONTAINER}" psql -U aicloser -d postgres -tAc \
  "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1
if ! docker exec "${CONTAINER}" psql -U aicloser -d postgres -v ON_ERROR_STOP=1 -tAc \
  "CREATE DATABASE ${DB}" >/dev/null 2>&1; then
  echo "✘ không tạo được CSDL sandbox ${DB} — cổng dừng"; exit 2
fi

DATABASE_URL_V3="$(node -e '
const u = new URL(process.argv[1]); u.pathname = "/" + process.argv[2]; console.log(u.toString());
' "$(node -e '
const { chuoiNoi } = await import("./db/ket-noi.js"); console.log(chuoiNoi());
')" "${DB}")"
export DATABASE_URL_V3
V3_KHOA_MA_HOA="$(node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))')"
export V3_KHOA_MA_HOA
# ⛔ CỐ Ý KHÔNG export V3_POS_GHI — cổng phải đo được cửa (a) ở trạng thái ĐÓNG.
unset V3_POS_GHI 2>/dev/null || true

don_dep() {
  if [ "${GIU_SANDBOX:-0}" = "1" ]; then
    printf '\n(giữ lại CSDL %s theo GIU_SANDBOX=1)\n' "${DB}"
  else
    docker exec "${CONTAINER}" psql -U aicloser -d postgres -tAc \
      "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1
  fi
}
trap don_dep EXIT

psqlx() {
  local out
  if out="$(docker exec "${CONTAINER}" psql -U aicloser -d "${DB}" -v ON_ERROR_STOP=1 -tAc "$1" 2>/dev/null)"; then
    printf '%s' "$(printf '%s' "${out}" | tr -d '\r')"
  else printf 'LOI-SQL'; fi
}

echo "CỔNG NGHIỆM THU L1-M1 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo: ${DB} (sandbox, KHÔNG phải aicloser_v3 dev) · shop thật đo: ${CHO}"

# ═══ ① MIGRATE 002 IDEMPOTENT + DOWN→UP TRÊN CSDL ĐÃ SEED ════════════════════
muc "① migration 002 — chạy 2 lượt (_migrations +1 rồi ĐỨNG) + down→up trên CSDL đã seed"
node db/migrate.js >/dev/null 2>&1
M1="$(psqlx "SELECT count(*) FROM _migrations")"
node db/migrate.js >/dev/null 2>&1
M2="$(psqlx "SELECT count(*) FROM _migrations")"
so "_migrations sau lượt 1 / lượt 2" "${M1} / ${M2}"
bang "lượt 2 KHÔNG áp thêm bản nào" "${M2}" "${M1}"
bang "có bản 002 trong sổ" "$(psqlx "SELECT count(*) FROM _migrations WHERE ma='002_ket_noi_pos'")" "1"

# seed: dữ liệu của 001 (đơn) + dữ liệu của 002 (kết nối) — down phải chỉ ăn phần 002
npm run --silent di-tru >/dev/null 2>&1
psqlx "INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos)
       SELECT id,'seed:1','messenger','moi_tu_pos','0' FROM team WHERE slug='chua-phan'" >/dev/null
DON_TRUOC="$(psqlx "SELECT count(*) FROM don_hang")"
# 23/08 TỔNG vá (nợ VA-P1): chuỗi migration nay dài hơn 002 — `down` một phát gỡ bản MỚI
# NHẤT (004/005…), không phải 002. Lùi từng bản tới khi 002 là bản chót rồi gỡ đúng nó.
for _ in 1 2 3 4 5 6 7 8 9 10; do
  CHOT="$(psqlx "SELECT ma FROM _migrations ORDER BY ma DESC LIMIT 1")"
  [ "${CHOT}" = "002_ket_noi_pos" ] && break
  node db/migrate.js down >/dev/null 2>&1
done
node db/migrate.js down >/dev/null 2>&1
CO_BANG_SAU_DOWN="$(psqlx "SELECT count(*) FROM information_schema.tables
  WHERE table_schema='public' AND table_name='ket_noi_pos'")"
DON_SAU_DOWN="$(psqlx "SELECT count(*) FROM don_hang")"
node db/migrate.js >/dev/null 2>&1
CO_BANG_SAU_UP="$(psqlx "SELECT count(*) FROM information_schema.tables
  WHERE table_schema='public' AND table_name='ket_noi_pos'")"
so "don_hang trước down / sau down" "${DON_TRUOC} / ${DON_SAU_DOWN}"
bang "down 002 KHÔNG đụng dữ liệu của 001" "${DON_SAU_DOWN}" "${DON_TRUOC}"
bang "bảng ket_noi_pos sau down / sau up" "${CO_BANG_SAU_DOWN}/${CO_BANG_SAU_UP}" "0/1"

# ═══ ② KẾT NỐI POS — hai vế + khoá phải MÃ HOÁ ═══════════════════════════════
muc "② ket_noi_pos: số dòng = số thị trường trong pancake-shops.json · khoá ĐÃ MÃ HOÁ"
npm run --silent di-tru >/dev/null 2>&1
NGUON_TT="$(nodex 'const fs=await import("node:fs");
console.log(JSON.parse(fs.readFileSync("pancake-shops.json","utf8")).length)')"
DICH_TT="$(psqlx "SELECT count(*) FROM ket_noi_pos")"
so "vế NGUỒN pancake-shops.json (thị trường)" "${NGUON_TT}"
so "vế ĐÍCH bảng ket_noi_pos (dòng)" "${DICH_TT}"
bang "hai vế khớp" "${DICH_TT}" "${NGUON_TT}"
so "danh sách thị trường trong CSDL" "$(psqlx "SELECT string_agg(market,',' ORDER BY market) FROM ket_noi_pos")"
so "10 ký tự đầu của mọi khoá trong CSDL" "$(psqlx "SELECT string_agg(DISTINCT left(api_key_ma,10),' ') FROM ket_noi_pos")"
KHOA_TRAN="$(nodex 'const fs=await import("node:fs");
const s=JSON.parse(fs.readFileSync("pancake-shops.json","utf8"));
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const r = await pool.query("SELECT api_key_ma FROM ket_noi_pos");
  const tho = r.rows.filter(x => s.some(y => x.api_key_ma.includes(y.api_key)));
  console.log(tho.length);
});')"
bang "số khoá nằm NGUYÊN VĂN trong cột (phải 0)" "${KHOA_TRAN}" "0"

# ═══ ③ ĐỌC DANH MỤC + TỒN KHO THẬT ═══════════════════════════════════════════
muc "③ docDanhMuc trên shop THẬT ${CHO} — hết cảnh suy sản phẩm từ 25 đơn (01 §12)"
KQ3="$(nodex '
const { voiPool } = await import("./db/ket-noi.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { docDanhMuc } = await import("./src/pos/index.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["chua-phan"])).rows[0].id;
  const k = await docDanhMuc(pool, ctxHeThong(), { shop: process.argv[1], teamId: t });
  const r = await pool.query("SELECT ten, ton_kho FROM san_pham ORDER BY id LIMIT 3");
  console.log(`${k.them}|${k.tongPos}|` + r.rows.map(x=>`${x.ten}(tồn ${x.ton_kho})`).join(" · "));
});' "${CHO}")"
if [ "${KQ3}" = "LOI-NODE" ]; then
  hoan "③ docDanhMuc KHÔNG chạy được ở đây (mạng/POS) — NHÁNH-VPS, xem /tmp/l1m1-node-err.txt"
else
  SP_THEM="${KQ3%%|*}"; R3="${KQ3#*|}"; SP_TONG="${R3%%|*}"; SP_TEN="${R3#*|}"
  so "san_pham nạp được / POS khai có" "${SP_THEM} / ${SP_TONG}"
  so "3 tên SP + tồn kho đầu danh sách" "${SP_TEN}"
  if [ "${SP_THEM}" -gt 0 ] 2>/dev/null; then dat "san_pham nạp được > 0 (= ${SP_THEM})"
  else truot "san_pham nạp được = ${SP_THEM}"; fi
  bang "nạp đủ số POS khai" "${SP_THEM}" "${SP_TONG}"
  so "goi_gia ghi được (POS khai giá 0 ⇒ chờ 0, xem doc-danh-muc.js)" "$(psqlx "SELECT count(*) FROM goi_gia")"
fi

# ═══ ③b BẢNG MÃ XÁC MINH — điều kiện MỞ cửa (b) ══════════════════════════════
muc "③b bảng mã trạng thái: bảng trong CODE ↔ bảng ĐO LẠI từ API thật (diff phải RỖNG)"
KQ3B="$(nodex '
const fs = await import("node:fs");
const { BANG_MA, NHOM_HUY_HOAN } = await import("./src/pos/ma-trang-thai.js");
const shops = JSON.parse(fs.readFileSync("pancake-shops.json","utf8"));
const POS = "https://pos.pages.fm/api/v1";
const doDuoc = new Map();
for (const s of shops) {
  for (const st of Object.keys(BANG_MA)) {
    const r = await fetch(`${POS}/shops/${s.shop_id}/orders?api_key=${s.api_key}&page_number=1&page_size=5&status=${st}`);
    const j = await r.json();
    for (const o of (j.data||[])) if (o.status_name != null) doDuoc.set(String(o.status), o.status_name);
  }
}
const lech = [];
for (const [ma, nhan] of Object.entries(BANG_MA)) {
  const that = doDuoc.get(String(ma));
  if (that !== undefined && that !== nhan) lech.push(`${ma}:code=${nhan}/đo=${that}`);
}
const thieu = Object.keys(BANG_MA).filter(m => !doDuoc.has(String(m)));
console.log(`${lech.join(",")||"(rỗng)"}|${thieu.join(",")||"(không)"}|${doDuoc.size}|${NHOM_HUY_HOAN.join(",")}|${BANG_MA[8]}`);
')"
if [ "${KQ3B}" = "LOI-NODE" ]; then
  hoan "③b không quét lại được API — bảng mã giữ nguyên lời khai của lượt đo 22/08"
else
  IFS='|' read -r LECH THIEU DEM HH MA8 <<< "${KQ3B}"
  so "mã ĐO LẠI được từ API thật" "${DEM}"
  so "diff nhãn code ↔ nhãn đo" "${LECH}"
  bang "diff RỖNG (bảng mã trong code = bảng đã xác minh)" "${LECH}" "(rỗng)"
  so "mã trong code mà lượt này không còn đơn để đối chiếu" "${THIEU}"
  so "nhóm hủy/hoàn trong code" "${HH}"
  bang "nhóm hủy/hoàn = {4,5,6,7} (ĐO, không phải {4,5,6,7,8} của §7.5)" "${HH}" "4,5,6,7"
  so "mã 8 thật ra là" "${MA8}"
  bang "mã 8 = packing (đơn ĐANG ĐÓNG GÓI, không phải hủy/hoàn)" "${MA8}" "packing"
  printf '   ⚠️ LỆCH TÀI LIỆU: TONG-QUAN §7.5 + src/pancake-orders.js:13 khai {4,5,6,7,8} —\n'
  printf '      đơn đang đóng gói bị đếm thành đã hủy. Đã ghi §9 sổ (không sửa bản đang chạy).\n'
fi
# cửa (b) phải ĐÓNG với mã chưa xác minh — deny-by-default, không "tạm cho qua"
CUA_B="$(nodex '
const { kiemChuyen } = await import("./src/pos/ma-trang-thai.js");
const ten = (tu,sang) => { try { kiemChuyen(tu,sang); return "CHO-QUA"; } catch(e){ return e.name; } };
console.log(`${ten(0,13)}|${ten(0,3)}|${ten(0,7)}|${ten(0,12)}|${ten(12,0)}`);')"
IFS='|' read -r B13 B3 B7 B012 B120 <<< "${CUA_B}"
so "kiemChuyen(0→13 mã chưa xác minh) / (0→3) / (0→7 xoá đơn)" "${B13} / ${B3} / ${B7}"
bang "mã chưa xác minh ⇒ cửa (b) ĐÓNG" "${B13}" "LoiMaChuaXacMinh"
bang "cặp ngoài bảng ⇒ từ chối" "${B3}" "LoiChuyenNgoaiBang"
bang "KHÔNG có đường tới 7 (removed = xoá đơn)" "${B7}" "LoiChuyenNgoaiBang"
bang "hai cặp nghiệp vụ CHO QUA thật (0→12 · 12→0)" "${B012}/${B120}" "CHO-QUA/CHO-QUA"

# ═══ ④ ĐỌC ĐƠN THẬT — nguồn + HAI cột trạng thái tách nhau ═══════════════════
muc "④ docDon trên shop THẬT ${CHO}, một trạng thái (12 = wait_print / Chờ in)"
KQ4="$(nodex '
const { voiPool } = await import("./db/ket-noi.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { docDon } = await import("./src/pos/index.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["chua-phan"])).rows[0].id;
  const k = await docDon(pool, ctxHeThong(), { shop: process.argv[1], trangThai: 12, teamId: t, soTrangToiDa: 1 });
  const r = await pool.query("SELECT ma_pos FROM don_hang WHERE ma_pos <> $1 ORDER BY id LIMIT 2", ["seed:1"]);
  console.log(`${k.docDuoc}|${k.them}|${r.rows.map(x=>x.ma_pos).join(" ")}|${k.theoNguon.messenger}/${k.theoNguon.trang_ban_hang}|${k.khongSuyDuocNguon.length}`);
});' "${CHO}")"
if [ "${KQ4}" = "LOI-NODE" ]; then
  hoan "④ docDon KHÔNG chạy được ở đây (mạng/POS) — NHÁNH-VPS"
else
  IFS='|' read -r D_DOC D_THEM D_MA D_NGUON D_KHONG <<< "${KQ4}"
  so "đơn đọc được từ POS / ghi vào don_hang" "${D_DOC} / ${D_THEM}"
  so "2 mã đơn đầu (ma_pos = <shop>:<id đơn>)" "${D_MA}"
  so "phân bố nguồn messenger/trang_ban_hang" "${D_NGUON}"
  so "đơn KHÔNG suy được nguồn (liệt kê, cấm đoán)" "${D_KHONG}"
  if [ "${D_DOC}" -gt 0 ] 2>/dev/null; then dat "đọc được đơn thật (= ${D_DOC})"
  else truot "đọc được 0 đơn"; fi
  KHAC="$(psqlx "SELECT count(*) FROM don_hang WHERE trang_thai_he <> trang_thai_pos")"
  TONG_DON="$(psqlx "SELECT count(*) FROM don_hang")"
  so "don_hang có trang_thai_he KHÁC trang_thai_pos / tổng" "${KHAC} / ${TONG_DON}"
  bang "HAI cột trạng thái tách hẳn nhau trên mọi dòng" "${KHAC}" "${TONG_DON}"
  # ma_pos PHẢI mang shop: id đơn POS là dãy riêng từng shop, trần trụi thì hai shop
  # tranh nhau một dòng (UNIQUE team_id, ma_pos) và bên thua biến mất không tiếng động.
  bang "dòng don_hang có ma_pos KHÔNG mang shop (phải 0)" \
    "$(psqlx "SELECT count(*) FROM don_hang WHERE ma_pos NOT LIKE '%:%'")" "0"
fi

# ═══ ⑤ GHI NGƯỢC — BỐN CỬA, ĐO RIÊNG TỪNG CỬA ════════════════════════════════
muc "⑤ ghi ngược trạng thái — bốn cửa an toàn, mỗi cửa một phép (KHÔNG gộp)"
KQ5="$(nodex '
const { voiPool } = await import("./db/ket-noi.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { ghiNguocTrangThai } = await import("./src/pos/index.js");
const KHOA = { V3_KHOA_MA_HOA: process.env.V3_KHOA_MA_HOA };
const MO = { ...KHOA, V3_POS_GHI: "1" };
function napDem(kich) {
  const d = { GET: 0, PUT: 0 };
  return { d, nap: async (url, o = {}) => {
    const pt = (o.method || "GET").toUpperCase(); d[pt]++;
    const r = kich(pt); if (r instanceof Error) throw r;
    return { ok: true, status: 200, text: async () => JSON.stringify(r) };
  } };
}
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["chua-phan"])).rows[0].id;
  const dem = async (h) => (await pool.query("SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong=$1",[h])).rows[0].c;
  const goi = async (env, arg, kich) => {
    const { d, nap } = napDem(kich);
    let ten = "CHO-QUA";
    try { await ghiNguocTrangThai(pool, ctxHeThong(), { teamId: t, market: process.argv[1], ...arg }, { nap, env }); }
    catch (e) { ten = e.name; }
    return { ten, d };
  };
  const live0 = () => ({ data: { id: 1, status: 0, status_name: "new" } });
  // (a) van ĐÓNG
  const c0 = await dem("pos_ghi_bi_chan");
  const a = await goi(KHOA, { donId: 1, tu: 0, sang: 12 }, live0);
  const c1 = await dem("pos_ghi_bi_chan");
  // (b) cặp ngoài bảng, van MỞ
  const b = await goi(MO, { donId: 1, tu: 0, sang: 6 }, live0);
  const c2 = await dem("pos_ghi_bi_chan");
  // (b2) compare-and-set: live = 1 khác tu = 0
  const b2 = await goi(MO, { donId: 1, tu: 0, sang: 12 },
    (pt) => pt === "GET" ? { data: { id: 1, status: 1, status_name: "submitted" } } : { success: true });
  const c3 = await dem("pos_ghi_bi_chan");
  // (b3) nhật ký hai pha: PUT mất phản hồi SAU khi gửi
  const bd0 = await dem("pos_ghi_bat_dau"), kq0 = await dem("pos_ghi_ket_qua");
  const b3 = await goi(MO, { donId: 2, tu: 0, sang: 12 },
    (pt) => pt === "GET" ? live0() : new Error("socket hang up"));
  const bd1 = await dem("pos_ghi_bat_dau"), kq1 = await dem("pos_ghi_ket_qua");
  console.log([
    `${a.ten};${a.d.GET + a.d.PUT};${c1 - c0}`,
    `${b.ten};${b.d.GET + b.d.PUT};${c2 - c1}`,
    `${b2.ten};${b2.d.PUT};${c3 - c2}`,
    `${b3.ten};${bd1 - bd0};${kq1 - kq0}`,
  ].join("|"));
});' "${CHO}")"
if [ "${KQ5}" = "LOI-NODE" ]; then
  truot "⑤ khối đo bốn cửa HỎNG — xem /tmp/l1m1-node-err.txt"
else
  IFS='|' read -r P5A P5B P5B2 P5B3 <<< "${KQ5}"
  so "⑤a van V3_POS_GHI vắng → lỗi;lượt gọi API;nhat_ky bị chặn" "${P5A}"
  bang "⑤a fail-CLOSED, KHÔNG chạm API, có ghi sổ" "${P5A}" "LoiVanGhiDong;0;1"
  so "⑤b chuyển ngoài bảng (van MỞ) → lỗi;lượt gọi API;nhat_ky" "${P5B}"
  bang "⑤b chặn trước khi chạm API" "${P5B}" "LoiChuyenNgoaiBang;0;1"
  so "⑤b2 compare-and-set live≠tu → lỗi;lượt PUT;nhat_ky" "${P5B2}"
  bang "⑤b2 từ chối ghi đè, PUT 0 lượt" "${P5B2}" "LoiTrangThaiDaDoi;0;1"
  so "⑤b3 PUT mất phản hồi → lỗi;dòng bắt-đầu;dòng kết-quả" "${P5B3}"
  bang "⑤b3 dòng bắt-đầu MỒ CÔI (1 bắt đầu, 0 kết quả)" "${P5B3}" "LoiPosKhongTraLoi;1;0"
fi
hoan "⑤c GHI NGƯỢC THẬT trên đơn nháp (0→12 rồi 12→0): CHƯA CHẠY — chờ diễn tập VPS.
        Máy dev KHÔNG có V3_POS_GHI và cổng này cố ý không đặt nó. Câu diễn tập phải
        trả lời: POS có nhận chiều VỀ 12→0 không (đo 22/08 trên 1.400 đơn: 0→12 có 3
        lượt thật, 12→0 KHÔNG lượt nào — chiều lùi POS đang dùng là 12→1, 47 lượt)."

# ═══ ⑥ THIẾU ctx → NÉM LỖI (thừa kế L0-M2) ═══════════════════════════════════
muc "⑥ mọi hàm cửa POS gọi KHÔNG ctx → ném lỗi tầng truy vấn (1 phép đại diện)"
TEN6="$(nodex '
const { voiPool } = await import("./db/ket-noi.js");
const { docDon } = await import("./src/pos/index.js");
await voiPool(async (pool) => {
  try { await docDon(pool, null, { shop: "Taiwan" }); console.log("KHONG-NEM-LOI"); }
  catch (e) { console.log(e.name); }
});')"
bang "docDon(ctx=null) ném đúng lỗi có tên" "${TEN6}" "LoiThieuBoiCanhTeam"
printf '   ⓘ N7 — phép ③ và ④ ở trên chạy dưới ctxHeThong() (JOB NỀN, mọi lượt có audit),\n'
printf '     KHÔNG phải ctx người thật. Dữ liệu POS đậu ở team KỸ THUẬT chua-phan (chờ H7),\n'
printf '     mà ctx người thật BỊ TỪ CHỐI trên team kỹ thuật. Đường người thật đo ở L4.\n'

# ═══ ⑦ BỘ CA CỦA PHIẾU ═══════════════════════════════════════════════════════
muc "⑦ npm test bộ l1-m1 (KHÔNG chạy bộ ca cũ — nợ §9: bộ cũ ghi vào conv-state.json thật)"
T_OUT="$(node --test test/l1-m1-ghi-nguoc.test.js test/l1-m1-doc-pos.test.js 2>&1)"
# `node --test` in "ℹ pass 22" — ký tự đầu dòng là ĐA BYTE, `^.` của grep không khớp
# ở locale C. Bắt theo TỪ KHOÁ, không theo vị trí.
T_PASS="$(printf '%s' "${T_OUT}" | grep -oE 'pass [0-9]+' | head -1 | grep -oE '[0-9]+')"
T_FAIL="$(printf '%s' "${T_OUT}" | grep -oE 'fail [0-9]+' | head -1 | grep -oE '[0-9]+')"
so "ca xanh / ca đỏ" "${T_PASS:-?} / ${T_FAIL:-?}"
bang "0 ca đỏ" "${T_FAIL:-?}" "0"

# ── tổng ─────────────────────────────────────────────────────────────────────
printf '\n═══════════════════════════════════════════════════════════════\n'
printf 'TỔNG: %d phép · ĐẠT %d · TRƯỢT %d · HOÃN %d (⏸ = cố ý chưa chạy, không phải đạt)\n' \
  "${PHEP}" "$((PHEP - LOI))" "${LOI}" "${HOAN}"
[ "${LOI}" -eq 0 ] && exit 0 || exit 1
