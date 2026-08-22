#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU L3-M3 — Hàng đợi nhắc (2h×5, huỷ khi khách trả lời) +
# bộ đọc ý 4 nhánh. Thi hành đúng sáu phép của ④ trong docs/thi-cong/phieu/PHIEU-L3-M3.md.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT DANH SÁCH. Không dòng nào chỉ nói "chạy xong".
# BA TRẠNG THÁI — ✔ ĐẠT · ✘ TRƯỢT · ⏸ HOÃN (khuôn l1-m1/l1-m3/l3-m1.sh).
#
# Cổng TỰ DỰNG CSDL sandbox `aicloser_v3_nt_l3m3` từ khuôn trần rồi TỰ DỌN (luật 11 sổ
# điều hành) — KHÔNG chạm `aicloser_v3` dev, KHÔNG chạm mạng nào (WA/POS đều spy tiêm
# qua deps). Đồng hồ mọi phép ①②④⑤ đều TIÊM qua deps.now — cấm neo đồng hồ tường
# (skill tho-thi-cong án lệ #1).
#
#   bash ops/bin/nghiem-thu/l3-m3.sh
#   GIU_SANDBOX=1 bash ops/bin/nghiem-thu/l3-m3.sh   # giữ CSDL lại để soi tay
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

CONTAINER="talpha-pg"
DB="aicloser_v3_nt_l3m3"
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

nodex() {
  local out
  if out="$(node -e "$1" 2>/tmp/l3m3-node-err.txt)"; then
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

echo "CỔNG NGHIỆM THU L3-M3 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo: ${DB} (sandbox, KHÔNG phải aicloser_v3 dev) · container ${CONTAINER}"

node db/migrate.js >/dev/null 2>&1
CO_BANG="$(docker exec "${CONTAINER}" psql -U aicloser -d "${DB}" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_name='lich_nhac'" 2>/dev/null | tr -d ' ')"
so "bảng lich_nhac có mặt sau migrate" "${CO_BANG}"
[ "${CO_BANG}" = "1" ] || { echo "✘ bảng lich_nhac chưa có — cổng dừng"; exit 2; }

# Hàm dùng chung cho mọi khối node -e bên dưới — đưa một đơn tới da_gui_wa BẰNG CHÍNH
# máy trạng thái (không UPDATE tay), cùng khuôn toiDaGuiWa() của test/l3-m1-*.test.js.
HELPER='
async function toiDaGuiWa(pool, ctxHeThong, apDung, team, so) {
  const kh = (await pool.query("INSERT INTO khach (team_id,so_dien_thoai) VALUES ($1,$2) RETURNING id",[team,so])).rows[0].id;
  const d = (await pool.query(
    "INSERT INTO don_hang (team_id,ma_pos,nguon,trang_thai_he,trang_thai_pos,khach_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    [team,`9999:${Math.floor(Math.random()*1e9)}`,"trang_ban_hang","moi_tu_pos","0",kh])).rows[0].id;
  for (const s of ["vao_may","bat_dau_gui","gui_xong"]) await apDung(pool, ctxHeThong(), { donId: d, sukien: s });
  return d;
}
async function donSachHangDoiCho(pool) {
  // Tham số hoá — CẤM viết chuỗi SQL nháy đơn trần ở đây: khối này nằm trong một bash
  // single-quote (nodex('...')), và nháy đơn trần (kể cả \-escape, bash single-quote
  // KHÔNG hỗ trợ escape) sẽ cắt đứt chuỗi bash giữa chừng — án lệ đã dính đúng dòng này.
  await pool.query("UPDATE lich_nhac SET trang_thai=$1, huy_ly_do=$2 WHERE trang_thai=$3", ["da_huy", "don_sach_gate", "cho"]);
}
'

# ═══ ①#1 — LỊCH: đặt +2h · chu kỳ 2h×5 · hết trần → bao_het_luot, KHÔNG lịch thứ 6 ═══
muc "① LỊCH — đặt +2h (đồng hồ TIÊM) · 5 vòng mẫu NHẮC riêng · hết trần → bao_het_luot"
KQ1="$(nodex "${HELPER}"'
const { quetLichNhac, CACH_NHAC_MS, TRAN_NHAC, MAU_NHAC } = await import("./src/orders/index.js");
const { MAU_XAC_NHAN } = await import("./src/orders/quet-don-moi.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { apDung } = await import("./src/orders/may-trang-thai.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  await donSachHangDoiCho(pool);
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const d = await toiDaGuiWa(pool, ctxHeThong, apDung, t, "+971500001001");
  let luc = new Date("2027-01-01T00:00:00Z");
  const goi = []; const spy = async (p,c,a) => { goi.push(a); return { ok: true }; };
  let kq = await quetLichNhac(pool, { now: () => luc }, { guiTinMau: spy });
  const moi1 = kq.moi;
  const henDau = (await pool.query("SELECT hen_luc FROM lich_nhac WHERE don_hang_id=$1",[d])).rows[0].hen_luc;
  const henDung = new Date(henDau).getTime() === luc.getTime() + CACH_NHAC_MS;
  let hetLuot = 0, tongGui = 0;
  for (let lan = 1; lan <= TRAN_NHAC; lan++) {
    luc = new Date(luc.getTime() + CACH_NHAC_MS);
    kq = await quetLichNhac(pool, { now: () => luc }, { guiTinMau: spy });
    tongGui += kq.daGui; hetLuot += kq.hetLuot;
  }
  const mauDung = goi.length > 0 && goi[0].tenMau === MAU_NHAC && MAU_NHAC !== MAU_XAC_NHAN;
  const dem6 = (await pool.query("SELECT count(*)::int c FROM lich_nhac WHERE don_hang_id=$1",[d])).rows[0].c;
  const trangThai = (await pool.query("SELECT trang_thai_he FROM don_hang WHERE id=$1",[d])).rows[0].trang_thai_he;
  console.log(`${moi1}|${henDung}|${goi.length}|${mauDung}|${tongGui}|${hetLuot}|${trangThai}|${dem6}`);
});')"
so "kết quả ① (đặt-lịch-1|hạn-đúng|spy|mẫu-đúng|tổng-gửi|hết-lượt|trạng-thái|đếm-dòng)" "${KQ1}"
bang "①a đặt lịch lần 1 tự động (bước ①)" "$(echo "${KQ1}" | cut -d'|' -f1)" "1"
bang "①b hạn = now(TIÊM) + 2 giờ" "$(echo "${KQ1}" | cut -d'|' -f2)" "true"
bang "①c tổng lượt gửi qua 5 vòng" "$(echo "${KQ1}" | cut -d'|' -f5)" "5"
bang "①d mẫu NHẮC riêng, khác mẫu xác nhận" "$(echo "${KQ1}" | cut -d'|' -f4)" "true"
bang "①e bao_het_luot gọi ĐÚNG 1 lần" "$(echo "${KQ1}" | cut -d'|' -f6)" "1"
bang "①f đơn sang cho_sale" "$(echo "${KQ1}" | cut -d'|' -f7)" "cho_sale"
bang "①g đếm dòng lich_nhac = 5, KHÔNG có lịch thứ 6" "$(echo "${KQ1}" | cut -d'|' -f8)" "5"

# ═══ ②#2 — HUỶ NGAY: khách trả lời giữa lần 2/3 → lịch active=0 NGAY, quét sau=0 ═══
muc "② HUỶ NGAY — khách trả lời giữa lần 2/3 → lịch active=0 TRONG CÙNG LƯỢT, quét sau đó=0"
KQ2="$(nodex "${HELPER}"'
const { quetLichNhac, CACH_NHAC_MS, nhanPhanHoiWa } = await import("./src/orders/index.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { apDung } = await import("./src/orders/may-trang-thai.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  await donSachHangDoiCho(pool);
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["auus"])).rows[0].id;
  const d = await toiDaGuiWa(pool, ctxHeThong, apDung, t, "+971500001002");
  let luc = new Date("2027-01-02T00:00:00Z");
  const goi = []; const spy = async (p,c,a) => { goi.push(a); return { ok: true }; };
  await quetLichNhac(pool, { now: () => luc }, { guiTinMau: spy });
  for (let i = 0; i < 2; i++) { luc = new Date(luc.getTime() + CACH_NHAC_MS); await quetLichNhac(pool, { now: () => luc }, { guiTinMau: spy }); }
  const truocGui = goi.length;
  const choTruoc = (await pool.query("SELECT count(*)::int c FROM lich_nhac WHERE don_hang_id=$1 AND trang_thai=$2",[d,"cho"])).rows[0].c;
  await nhanPhanHoiWa(pool, ctxHeThong(), { donId: d, text: "Please change my address" }, {});
  const choSauNgay = (await pool.query("SELECT count(*)::int c FROM lich_nhac WHERE don_hang_id=$1 AND trang_thai=$2",[d,"cho"])).rows[0].c;
  luc = new Date(luc.getTime() + CACH_NHAC_MS);
  await quetLichNhac(pool, { now: () => luc }, { guiTinMau: spy });
  console.log(`${truocGui}|${choTruoc}|${choSauNgay}|${goi.length}`);
});')"
so "kết quả ② (gửi-trước|treo-trước|treo-NGAY-SAU|gửi-sau-đó)" "${KQ2}"
bang "②a đã gửi đúng 2 lần trước khi khách trả lời" "$(echo "${KQ2}" | cut -d'|' -f1)" "2"
bang "②b lịch lần 3 đang treo trước khi trả lời" "$(echo "${KQ2}" | cut -d'|' -f2)" "1"
bang "②c lịch active = 0 NGAY sau nhanPhanHoiWa (không chờ job)" "$(echo "${KQ2}" | cut -d'|' -f3)" "0"
bang "②d guiTinMau SAU ĐÓ vẫn = 2 (không gửi thêm)" "$(echo "${KQ2}" | cut -d'|' -f4)" "2"

# ═══ ③ — docY BỐN NHÁNH: ≥16 câu ≥4/nhánh AR/EN, mơ hồ→khong_ro, xac_nhan→CAS POS ═══
muc "③ docY BỐN NHÁNH — bộ ca ≥16 câu (in từng câu→nhánh) + xac_nhan đi trọn CAS POS mock"
node -e '
const { docY } = await import("./src/orders/doc-y.js");
const ca = [
  ["Yes, please confirm my order","xac_nhan"],["ok sure, go ahead","xac_nhan"],
  ["نعم أؤكد الطلب","xac_nhan"],["تمام موافق","xac_nhan"],
  ["No, cancel my order please","tu_choi"],["I don'"'"'t want it anymore","tu_choi"],
  ["لا الغاء الطلب","tu_choi"],["ما ابي الطلب خلاص","tu_choi"],
  ["Please change my delivery address","doi_sua"],["Can you edit the size to large","doi_sua"],
  ["أريد تغيير العنوان","doi_sua"],["تعديل المقاس لو سمحت","doi_sua"],
  ["What do you mean?","khong_ro"],["I'"'"'m still thinking about it","khong_ro"],
  ["مش فاهم","khong_ro"],["","khong_ro"],["yes but actually no","khong_ro"],
];
let bad = 0;
for (const [text, cho] of ca) {
  const { ket_qua } = docY(text);
  const ok = ket_qua === cho;
  if (!ok) bad++;
  console.log(`   ${ok ? "✔" : "✘"} "${text}" -> ${ket_qua} [chờ ${cho}]`);
}
console.log(`SO=${ca.length}|BAD=${bad}`);
' > /tmp/l3m3-docy.txt 2>/tmp/l3m3-docy-err.txt
grep -E '^   [✔✘]' /tmp/l3m3-docy.txt || true
DOCY_SO="$(grep -oE 'SO=[0-9]+' /tmp/l3m3-docy.txt | cut -d= -f2)"
DOCY_BAD="$(grep -oE 'BAD=[0-9]+' /tmp/l3m3-docy.txt | cut -d= -f2)"
bang "③a bộ ca ≥16 câu (đang có)" "$([ "${DOCY_SO:-0}" -ge 16 ] && echo true || echo false)" "true"
bang "③b tất cả câu đọc ĐÚNG nhánh chờ (0 sai)" "${DOCY_BAD:-LOI-NODE}" "0"

KQ3C="$(nodex "${HELPER}"'
const { nhanPhanHoiWa, MA_POS_CHO_IN } = await import("./src/orders/index.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { apDung } = await import("./src/orders/may-trang-thai.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["pialpha-eu"])).rows[0].id;
  const d = await toiDaGuiWa(pool, ctxHeThong, apDung, t, "+971500001003");
  const pos = []; const ghiNguocPos = async (p,c,a) => { pos.push(a); return { ok: true }; };
  const kq = await nhanPhanHoiWa(pool, ctxHeThong(), { donId: d, text: "Yes, confirm the order" }, { ghiNguocPos, docLivePos: async () => 0 });
  console.log(`${kq.ket_qua}|${kq.sang}|${kq.posGhi}|${pos.length}|${pos[0] ? pos[0].sang : "?"}`);
});')"
so "③c xac_nhan → CAS POS mock" "${KQ3C}"
bang "③c kết quả" "${KQ3C}" "xac_nhan|day_cho_in|1|1|${KQ3C##*|}"

# ═══ ④ — IDEMPOTENT: huyLichNhac 2 lần · đặt lịch cho đơn đã có lịch không nhân đôi ═══
muc "④ IDEMPOTENT — huyLichNhac 2 lần không lỗi · datLichNhac không nhân đôi"
KQ4="$(nodex "${HELPER}"'
const { datLichNhac, taoHuyLichNhac } = await import("./src/orders/index.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { apDung } = await import("./src/orders/may-trang-thai.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const d = await toiDaGuiWa(pool, ctxHeThong, apDung, t, "+971500001004");
  const luc = new Date("2027-01-04T00:00:00Z");
  const k1 = await datLichNhac(pool, ctxHeThong(), { donId: d }, { now: () => luc });
  const k2 = await datLichNhac(pool, ctxHeThong(), { donId: d }, { now: () => luc });
  const demSauDat = (await pool.query("SELECT count(*)::int c FROM lich_nhac WHERE don_hang_id=$1",[d])).rows[0].c;
  const huy = taoHuyLichNhac(pool, { job: "gate-l3m3" });
  const h1 = await huy(d);
  let loi1 = "KHONG";
  try { await huy(d); } catch (e) { loi1 = e.name; }
  console.log(`${k1.tao}|${k2.tao}|${demSauDat}|${h1.huy}|${loi1}`);
});')"
so "kết quả ④ (tạo1|tạo2|đếm|huy1|lỗi-lần-2)" "${KQ4}"
bang "④a datLichNhac lần 1 tạo mới" "$(echo "${KQ4}" | cut -d'|' -f1)" "true"
bang "④b datLichNhac lần 2 (đã có 'cho') KHÔNG tạo thêm" "$(echo "${KQ4}" | cut -d'|' -f2)" "false"
bang "④c đếm dòng lich_nhac sau hai lượt đặt = 1 (không nhân đôi)" "$(echo "${KQ4}" | cut -d'|' -f3)" "1"
bang "④d huyLichNhac lần 2 KHÔNG ném lỗi" "$(echo "${KQ4}" | cut -d'|' -f5)" "KHONG"

# ═══ ⑤ — REBIND ctx PER-ĐƠN: 2 đơn 2 team trong MỘT lượt quét lịch ══════════════
muc "⑤ REBIND ctx PER-ĐƠN — một lượt quét lịch, hai team, 2 dòng nhat_ky ĐÚNG team"
KQ5="$(nodex "${HELPER}"'
const { datLichNhac, quetLichNhac, CACH_NHAC_MS } = await import("./src/orders/index.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { apDung } = await import("./src/orders/may-trang-thai.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  await donSachHangDoiCho(pool);
  const tA = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const tB = (await pool.query("SELECT id FROM team WHERE slug=$1",["auus"])).rows[0].id;
  const dA = await toiDaGuiWa(pool, ctxHeThong, apDung, tA, "+971500001005");
  const dB = await toiDaGuiWa(pool, ctxHeThong, apDung, tB, "+971500001006");
  const luc0 = new Date("2027-01-05T00:00:00Z");
  await datLichNhac(pool, ctxHeThong(), { donId: dA }, { now: () => luc0 });
  await datLichNhac(pool, ctxHeThong(), { donId: dB }, { now: () => luc0 });
  const luc1 = new Date(luc0.getTime() + CACH_NHAC_MS);
  const kq = await quetLichNhac(pool, { now: () => luc1 }, { guiTinMau: async () => ({ ok: true }) });
  const r = await pool.query(
    `SELECT ln.don_hang_id, nk.team_id FROM nhat_ky nk
       JOIN lich_nhac ln ON ln.id::text = nk.doi_tuong_id
      WHERE nk.hanh_dong=$1 AND ln.don_hang_id = ANY($2) AND ln.lan_thu = 1`,
    ["lich_nhac_da_gui", [dA, dB]]);
  const cap = r.rows.map(x => `${x.don_hang_id}->team${x.team_id}`).join(",");
  const dung = r.rows.length === 2
    && r.rows.some(x => String(x.don_hang_id)===String(dA) && String(x.team_id)===String(tA))
    && r.rows.some(x => String(x.don_hang_id)===String(dB) && String(x.team_id)===String(tB));
  console.log(`${kq.quet}|${r.rows.length}|${dung}|${cap}`);
});')"
so "kết quả ⑤ (quét|dòng nhat_ky|đúng|cặp)" "${KQ5}"
bang "⑤a hai đơn cùng tới hạn trong MỘT lượt quét" "$(echo "${KQ5}" | cut -d'|' -f1)" "2"
bang "⑤b mỗi đơn ĐÚNG MỘT dòng nhat_ky (2 team)" "$(echo "${KQ5}" | cut -d'|' -f2)" "2"
bang "⑤c cặp đơn→team khớp team CỦA ĐƠN" "$(echo "${KQ5}" | cut -d'|' -f3)" "true"
so   "⑤d cặp đo được" "$(echo "${KQ5}" | cut -d'|' -f4)"

# ═══ ⑥ — BỘ CA + HỒI QUY l3-m1/l3-m2 ═══════════════════════════════════════════
muc "⑥ node --test bộ l3-m3 + hồi quy l3-m1/l3-m2 KHÔNG gãy"
TEST_OUT="$(DATABASE_URL_V3="${URL_DEV}" node --test \
  test/l3-m3-doc-y.test.js test/l3-m3-lich-nhac.test.js test/l3-m3-nhan-phan-hoi-wa.test.js \
  test/l3-m1-may-trang-thai.test.js test/l3-m1-quet-don.test.js \
  test/l3-m2-loc-trung.test.js test/l3-m2-ti-le-hoan.test.js 2>&1)"
TPASS="$(echo "${TEST_OUT}" | grep -E '^# pass |^ℹ pass ' | grep -oE '[0-9]+' | head -1)"
TFAIL="$(echo "${TEST_OUT}" | grep -E '^# fail |^ℹ fail ' | grep -oE '[0-9]+' | head -1)"
so "⑥a ca xanh / đỏ (l3-m3 + hồi quy l3-m1/l3-m2 gộp)" "${TPASS:-?} / ${TFAIL:-?}"
bang "⑥a bộ ca gộp đỏ" "${TFAIL:-LOI-NODE}" "0"

DEV="$(DATABASE_URL_V3="${URL_DEV}" node -e '
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const r = await pool.query("SELECT count(*)::int c FROM lich_nhac");
  console.log(String(r.rows[0].c));
});' 2>/dev/null || printf 'LOI-NODE')"
so "⑥b CSDL DEV ${URL_DEV##*/} — dòng lich_nhac (phải =0, phiếu này KHÔNG động dev)" "${DEV}"
bang "⑥b dev lich_nhac còn nguyên (0 dòng, chưa ai ghi)" "${DEV}" "0"

printf '\n═══ TỔNG: %d phép · %d ĐỎ · %d HOÃN ═══\n' "${PHEP}" "${LOI}" "${HOAN}"
[ "${LOI}" -eq 0 ] || exit 1
exit 0
