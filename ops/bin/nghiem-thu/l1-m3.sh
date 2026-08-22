#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU L1-M3 — Cửa Pancake WhatsApp: KHUNG + mock (guard fail-closed,
# định tuyến team qua don_hang, rào nguồn đơn, luật mẫu tin, nhật ký hai pha).
# Thi hành đúng các phép của ④ trong docs/thi-cong/phieu/PHIEU-L1-M3.md.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT DANH SÁCH. Không dòng nào chỉ nói "chạy xong".
#
# BA TRẠNG THÁI, không phải hai — ✔ ĐẠT · ✘ TRƯỢT · ⏸ HOÃN (khuôn l1-m1.sh). «Hoãn» là
# phép CỐ Ý chưa chạy ở đây: gửi WhatsApp THẬT qua Pancake dồn về §7b T1, chờ điểm kiểm
# H1 (endpoint CHƯA CHỐT — xem src/channels/whatsapp/adapter.js). Gộp hoãn vào đạt là
# nói dối; gộp vào trượt là làm cổng kêu mỗi lượt tới mức không ai đọc nữa.
#
# Cổng TỰ DỰNG CSDL sandbox `aicloser_v3_nt_l1m3` từ khuôn trần rồi TỰ DỌN (luật 11 sổ
# điều hành) — KHÔNG chạm mạng nào (mọi ca dùng deps.guiMau spy, trừ phép ⑤ gọi thẳng
# adapter thật để xác nhận nó ném LoiChuaCoEndpoint, cũng không chạm mạng).
#
#   bash ops/bin/nghiem-thu/l1-m3.sh
#   GIU_SANDBOX=1 bash ops/bin/nghiem-thu/l1-m3.sh   # giữ CSDL lại để soi tay
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

CONTAINER="talpha-pg"
DB="aicloser_v3_nt_l1m3"
LOI=0
PHEP=0
HOAN=0

# ── khung in (giống hệt l1-m1.sh / l1-m2.sh) ────────────────────────────────────
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
  if out="$(node -e "$1" 2>/tmp/l1m3-node-err.txt)"; then
    printf '%s' "${out}"
  else
    printf 'LOI-NODE'
  fi
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

don_dep() {
  if [ "${GIU_SANDBOX:-0}" = "1" ]; then
    printf '\n(giữ lại CSDL %s theo GIU_SANDBOX=1)\n' "${DB}"
  else
    docker exec "${CONTAINER}" psql -U aicloser -d postgres -tAc \
      "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1
  fi
}
trap don_dep EXIT

echo "CỔNG NGHIỆM THU L1-M3 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo: ${DB} (sandbox, không phải aicloser_v3 dev) · container ${CONTAINER}"

node db/migrate.js >/dev/null 2>&1

# ═══ ① GUARD FAIL-CLOSED — 3 ca đối chứng a/b/c (khuôn N1 của L1-M2) ═══════════
# CÙNG một spy-factory, CÙNG hàm guiTinMau, CÙNG đơn hợp lệ (trang_ban_hang, team đúng
# ctx) + mẫu ĐÃ DUYỆT (tiêm qua deps) — chỉ guard biến thiên. env đặt TRONG harness.
muc "① GUARD FAIL-CLOSED, đo cặp đối chứng (N1) — CÙNG spy, CÙNG hàm guiTinMau"
KQ1="$(nodex '
const { guiTinMau } = await import("./src/channels/whatsapp/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const tA = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const ctxA = { teamId: tA, nguoiDungId: null };
  const don = (await pool.query("INSERT INTO don_hang (team_id,nguon,trang_thai_he) VALUES ($1,$2,$3) RETURNING id",[tA,"trang_ban_hang","cho_xac_nhan"])).rows[0];
  const bangMauTin = { mau_g1: { da_duyet: true } };
  const goi = { soNhan: "+84900000010", tenMau: "mau_g1", thamSo: {}, donHangId: don.id };
  const spyMoi = () => { const a = []; const f = (...x) => { a.push(x); return Promise.resolve({ok:true}); }; f.dem = () => a.length; return f; };

  delete process.env.V3_WA_GUI; delete process.env.PANCAKE_READONLY;
  const sA = spyMoi(); let tenA = "KHONG-NEM-LOI";
  try { await guiTinMau(pool, ctxA, goi, { guiMau: sA, bangMauTin }); } catch (e) { tenA = e.name; }

  process.env.V3_WA_GUI = "1"; process.env.PANCAKE_READONLY = "1";
  const sB = spyMoi(); let tenB = "KHONG-NEM-LOI";
  try { await guiTinMau(pool, ctxA, goi, { guiMau: sB, bangMauTin }); } catch (e) { tenB = e.name; }

  process.env.V3_WA_GUI = "1"; delete process.env.PANCAKE_READONLY;
  const sC = spyMoi(); let tenC = "KHONG-NEM-LOI";
  try { await guiTinMau(pool, ctxA, goi, { guiMau: sC, bangMauTin }); } catch (e) { tenC = e.name; }

  console.log(`${tenA}|${sA.dem()}|${tenB}|${sB.dem()}|${tenC}|${sC.dem()}`);
});')"
IFS='|' read -r TEN_A SPY_A TEN_B SPY_B TEN_C SPY_C <<< "${KQ1}"
bang "ca a (vắng V3_WA_GUI) — lỗi có tên" "${TEN_A}" "LoiCuaGuiDong"
bang "ca a — spy" "${SPY_A}" "0"
bang "ca b (GUI=1 + READONLY=1) — lỗi có tên" "${TEN_B}" "LoiCuaGuiDong"
bang "ca b — spy" "${SPY_B}" "0"
bang "ca c (GUI=1, không READONLY) — KHÔNG ném lỗi (đối chứng dương)" "${TEN_C}" "KHONG-NEM-LOI"
bang "ca c — spy" "${SPY_C}" "1"
printf '   TÓM TẮT ①: a=%s · b=%s · c=%s\n' "${SPY_A}" "${SPY_B}" "${SPY_C}"

# ═══ ② LUẬT MẪU TIN — chỉ mẫu đã duyệt (guard MỞ để cô lập) ═══════════════════
muc "② mẫu tin: tên mẫu chưa duyệt/không có → LoiMauChuaDuyet · mẫu da_duyet → qua"
KQ2="$(nodex '
const { guiTinMau } = await import("./src/channels/whatsapp/index.js");
const { voiPool } = await import("./db/ket-noi.js");
process.env.V3_WA_GUI = "1"; delete process.env.PANCAKE_READONLY;
await voiPool(async (pool) => {
  const tA = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const ctxA = { teamId: tA, nguoiDungId: null };
  const don = (await pool.query("INSERT INTO don_hang (team_id,nguon,trang_thai_he) VALUES ($1,$2,$3) RETURNING id",[tA,"trang_ban_hang","cho_xac_nhan"])).rows[0];
  const spyMoi = () => { const a = []; const f = (...x) => { a.push(x); return Promise.resolve({ok:true}); }; f.dem = () => a.length; return f; };

  const s1 = spyMoi(); let ten1 = "KHONG-NEM-LOI"; // KHÔNG tiêm bangMauTin → bảng thật rỗng (mau-tin.js)
  try { await guiTinMau(pool, ctxA, { soNhan:"+84900000011", tenMau:"mau_la", thamSo:{}, donHangId: don.id }, { guiMau: s1 }); }
  catch (e) { ten1 = e.name; }

  const s2 = spyMoi(); let ten2 = "NEM-LOI";
  try {
    await guiTinMau(pool, ctxA, { soNhan:"+84900000011", tenMau:"mau_ok", thamSo:{}, donHangId: don.id }, { guiMau: s2, bangMauTin: { mau_ok: { da_duyet: true } } });
    ten2 = "KHONG-NEM-LOI";
  } catch (e) { ten2 = e.name; }

  console.log(`${ten1}|${s1.dem()}|${ten2}|${s2.dem()}`);
});')"
IFS='|' read -r TEN_M1 SPY_M1 TEN_M2 SPY_M2 <<< "${KQ2}"
bang "mẫu chưa duyệt/không có trong bảng — lỗi có tên" "${TEN_M1}" "LoiMauChuaDuyet"
bang "mẫu chưa duyệt — spy" "${SPY_M1}" "0"
bang "mẫu da_duyet:true — KHÔNG ném lỗi" "${TEN_M2}" "KHONG-NEM-LOI"
bang "mẫu da_duyet:true — spy" "${SPY_M2}" "1"

# ═══ ③ RÀO NGUỒN ĐƠN — chỉ trang_ban_hang (guard MỞ để cô lập) ═════════════════
muc "③ nguồn đơn: đơn messenger → LoiSaiNguonDon · đơn trang_ban_hang → qua"
KQ3="$(nodex '
const { guiTinMau } = await import("./src/channels/whatsapp/index.js");
const { voiPool } = await import("./db/ket-noi.js");
process.env.V3_WA_GUI = "1"; delete process.env.PANCAKE_READONLY;
await voiPool(async (pool) => {
  const tA = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const ctxA = { teamId: tA, nguoiDungId: null };
  const donMsg = (await pool.query("INSERT INTO don_hang (team_id,nguon,trang_thai_he) VALUES ($1,$2,$3) RETURNING id",[tA,"messenger","GREET"])).rows[0];
  const donTbh = (await pool.query("INSERT INTO don_hang (team_id,nguon,trang_thai_he) VALUES ($1,$2,$3) RETURNING id",[tA,"trang_ban_hang","cho_xac_nhan"])).rows[0];
  const bangMauTin = { mau_ok: { da_duyet: true } };
  const spyMoi = () => { const a = []; const f = (...x) => { a.push(x); return Promise.resolve({ok:true}); }; f.dem = () => a.length; return f; };

  const s1 = spyMoi(); let ten1 = "KHONG-NEM-LOI";
  try { await guiTinMau(pool, ctxA, { soNhan:"+84900000012", tenMau:"mau_ok", thamSo:{}, donHangId: donMsg.id }, { guiMau: s1, bangMauTin }); }
  catch (e) { ten1 = e.name; }

  const s2 = spyMoi(); let ten2 = "NEM-LOI";
  try {
    await guiTinMau(pool, ctxA, { soNhan:"+84900000012", tenMau:"mau_ok", thamSo:{}, donHangId: donTbh.id }, { guiMau: s2, bangMauTin });
    ten2 = "KHONG-NEM-LOI";
  } catch (e) { ten2 = e.name; }

  console.log(`${ten1}|${s1.dem()}|${ten2}|${s2.dem()}`);
});')"
IFS='|' read -r TEN_N1 SPY_N1 TEN_N2 SPY_N2 <<< "${KQ3}"
bang "đơn nguon=messenger — lỗi có tên" "${TEN_N1}" "LoiSaiNguonDon"
bang "đơn nguon=messenger — spy" "${SPY_N1}" "0"
bang "đơn nguon=trang_ban_hang — KHÔNG ném lỗi" "${TEN_N2}" "KHONG-NEM-LOI"
bang "đơn nguon=trang_ban_hang — spy" "${SPY_N2}" "1"

# ═══ ④ ĐỊNH TUYẾN TEAM — đơn thuộc team khác ctx → chặn + nhat_ky ═══════════════
muc "④ định tuyến team: đơn KHÁC team ctx → lỗi có tên + nhat_ky(chan_don_xuyen_team) +1"
KQ4="$(nodex '
const { guiTinMau } = await import("./src/channels/whatsapp/index.js");
const { voiPool } = await import("./db/ket-noi.js");
process.env.V3_WA_GUI = "1"; delete process.env.PANCAKE_READONLY;
await voiPool(async (pool) => {
  const tid = async (slug) => (await pool.query("SELECT id FROM team WHERE slug=$1",[slug])).rows[0].id;
  const tA = await tid("tieu-alpha"), tB = await tid("auus");
  const ctxA = { teamId: tA, nguoiDungId: null };
  const donB = (await pool.query("INSERT INTO don_hang (team_id,nguon,trang_thai_he) VALUES ($1,$2,$3) RETURNING id",[tB,"trang_ban_hang","cho_xac_nhan"])).rows[0];
  const bangMauTin = { mau_ok: { da_duyet: true } };
  const dem = async () => Number((await pool.query("SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong=$1",["chan_don_xuyen_team"])).rows[0].c);
  const truoc = await dem();
  let ten = "KHONG-NEM-LOI"; let spyDem = 0;
  const spy = (...a) => { spyDem++; return Promise.resolve({ok:true}); };
  try { await guiTinMau(pool, ctxA, { soNhan:"+84900000013", tenMau:"mau_ok", thamSo:{}, donHangId: donB.id }, { guiMau: spy, bangMauTin }); }
  catch (e) { ten = e.name; }
  const sau = await dem();
  console.log(`${ten}|${spyDem}|${truoc}|${sau}`);
});')"
IFS='|' read -r TEN4 SPY4 TR4 SA4 <<< "${KQ4}"
bang "đơn thuộc team khác — lỗi có tên" "${TEN4}" "LoiDonKhongThuocTeam"
bang "không gọi xuống adapter — spy" "${SPY4}" "0"
so "nhat_ky(chan_don_xuyen_team) trước→sau" "${TR4}→${SA4}"
bang "nhat_ky +1" "$((SA4 - TR4))" "1"

# ═══ ④b ctxHeThong() GẮN TEAM (job nền tự dựng ctx, mang team_id THẬT) ══════════
muc "④b ctxHeThong(): job nền tự dựng ctx gắn ĐÚNG team của đơn → nhat_ky mang team_id thật"
KQ4B="$(nodex '
const { guiTinMau } = await import("./src/channels/whatsapp/index.js");
const { voiPool } = await import("./db/ket-noi.js");
const { ctxHeThong } = await import("./src/db/index.js");
process.env.V3_WA_GUI = "1"; delete process.env.PANCAKE_READONLY;
await voiPool(async (pool) => {
  const tA = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const don = (await pool.query("INSERT INTO don_hang (team_id,nguon,trang_thai_he) VALUES ($1,$2,$3) RETURNING id",[tA,"trang_ban_hang","cho_xac_nhan"])).rows[0];
  const bangMauTin = { mau_ok: { da_duyet: true } };
  const spy = async () => ({ ok: true });
  await guiTinMau(pool, ctxHeThong(), { soNhan:"+84900000014", tenMau:"mau_ok", thamSo:{}, donHangId: don.id }, { guiMau: spy, bangMauTin });
  const dong = (await pool.query("SELECT team_id FROM nhat_ky WHERE hanh_dong=$1 ORDER BY id DESC LIMIT 1",["wa_gui_bat_dau"])).rows[0];
  console.log(`${dong.team_id}|${tA}`);
});')"
IFS='|' read -r TEAM_GHI TEAM_CHO <<< "${KQ4B}"
bang "nhat_ky(wa_gui_bat_dau) dòng mới — team_id (chờ = team thật của đơn, KHÔNG NULL)" "${TEAM_GHI}" "${TEAM_CHO}"

# ═══ ④c NHẬT KÝ HAI PHA — thành công / từ chối-đã-biết / mất phản hồi (mồ côi) ═══
muc "④c hai pha: thành công +1/+1 · từ chối coPhanHoi=true +1/+1 · timeout KHÔNG coPhanHoi +1/+0 (mồ côi)"
KQ4C="$(nodex '
const { guiTinMau } = await import("./src/channels/whatsapp/index.js");
const { voiPool } = await import("./db/ket-noi.js");
process.env.V3_WA_GUI = "1"; delete process.env.PANCAKE_READONLY;
await voiPool(async (pool) => {
  const tA = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const ctxA = { teamId: tA, nguoiDungId: null };
  const bangMauTin = { mau_ok: { da_duyet: true } };
  const dem = async (h) => Number((await pool.query("SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong=$1",[h])).rows[0].c);
  const donMoi = async () => (await pool.query("INSERT INTO don_hang (team_id,nguon,trang_thai_he) VALUES ($1,$2,$3) RETURNING id",[tA,"trang_ban_hang","cho_xac_nhan"])).rows[0].id;

  // (a) thành công
  const bd0 = await dem("wa_gui_bat_dau"), kq0 = await dem("wa_gui_ket_qua");
  await guiTinMau(pool, ctxA, { soNhan:"+84900000015", tenMau:"mau_ok", thamSo:{}, donHangId: await donMoi() }, { guiMau: async () => ({ok:true,id:"m1"}), bangMauTin });
  const a = `${(await dem("wa_gui_bat_dau")) - bd0};${(await dem("wa_gui_ket_qua")) - kq0}`;

  // (b) từ chối ĐÃ BIẾT (coPhanHoi=true)
  class LoiGia extends Error { constructor(m){ super(m); this.name="LoiGia"; this.coPhanHoi = true; } }
  const bd1 = await dem("wa_gui_bat_dau"), kq1 = await dem("wa_gui_ket_qua");
  try { await guiTinMau(pool, ctxA, { soNhan:"+84900000015", tenMau:"mau_ok", thamSo:{}, donHangId: await donMoi() }, { guiMau: async () => { throw new LoiGia("từ chối"); }, bangMauTin }); } catch {}
  const b = `${(await dem("wa_gui_bat_dau")) - bd1};${(await dem("wa_gui_ket_qua")) - kq1}`;

  // (c) mất phản hồi (KHÔNG coPhanHoi) → mồ côi
  const bd2 = await dem("wa_gui_bat_dau"), kq2 = await dem("wa_gui_ket_qua");
  try { await guiTinMau(pool, ctxA, { soNhan:"+84900000015", tenMau:"mau_ok", thamSo:{}, donHangId: await donMoi() }, { guiMau: async () => { throw new Error("socket hang up"); }, bangMauTin }); } catch {}
  const c = `${(await dem("wa_gui_bat_dau")) - bd2};${(await dem("wa_gui_ket_qua")) - kq2}`;

  console.log(`${a}|${b}|${c}`);
});')"
IFS='|' read -r P4CA P4CB P4CC <<< "${KQ4C}"
so "(a) thành công — Δbat_dau;Δket_qua" "${P4CA}"
bang "(a) đủ hai pha" "${P4CA}" "1;1"
so "(b) từ chối coPhanHoi=true — Δbat_dau;Δket_qua" "${P4CB}"
bang "(b) đủ hai pha (KHÔNG mồ côi)" "${P4CB}" "1;1"
so "(c) timeout KHÔNG coPhanHoi — Δbat_dau;Δket_qua" "${P4CC}"
bang "(c) dòng bắt-đầu MỒ CÔI (1 bắt đầu, 0 kết quả)" "${P4CC}" "1;0"

# ═══ ⑤ ADAPTER THẬT — endpoint CHƯA CHỐT (H1 chưa chạy) ═══════════════════════
muc "⑤ adapter thật guiMauQuaPancake() — endpoint CHƯA CHỐT"
KQ5="$(nodex '
const { guiMauQuaPancake } = await import("./src/channels/whatsapp/adapter.js");
let ten = "KHONG-NEM-LOI"; let coPhanHoi = "?";
try { await guiMauQuaPancake({ soNhan:"x", tenMau:"y", thamSo:{}, donHangId:1 }); }
catch (e) { ten = e.name; coPhanHoi = String(e.coPhanHoi); }
console.log(`${ten}|${coPhanHoi}`);')"
IFS='|' read -r TEN5 CPH5 <<< "${KQ5}"
bang "gọi thẳng adapter thật — lỗi có tên" "${TEN5}" "LoiChuaCoEndpoint"
bang "coPhanHoi (kết cục ĐÃ BIẾT, không phải mất tín hiệu mạng)" "${CPH5}" "true"
hoan "GỬI THẬT qua Pancake WhatsApp API (§7b T1 sổ điều hành) — CHƯA CHẠY, chờ điểm
        kiểm H1 xác định endpoint (01-QUYET-DINH.md §4: \"gửi bằng API cần thử một lần
        thật\"). Đo được ở đây: adapter mặc định ném đúng LoiChuaCoEndpoint (phép trên),
        không giả xanh bằng cách bỏ qua hay mock ngầm bên trong guiMauQuaPancake."

# ═══ ⑥ npm test: bộ l1-m3 xanh ═══════════════════════════════════════════════
muc "⑥ npm test: bộ l1-m3 xanh"
so "node --version" "$(node --version)"
if node --test test/l1-m3-*.test.js >/tmp/l1m3-test.txt 2>&1; then
  dat "bộ ca l1-m3: $(grep -c '^✔' /tmp/l1m3-test.txt) xanh / 0 đỏ"
else
  truot "bộ ca l1-m3 có ca đỏ:"; grep -E '^✖|not ok' /tmp/l1m3-test.txt | head -20
fi

# ── tổng ─────────────────────────────────────────────────────────────────────
printf '\n═══════════════════════════════════════════════════════════════\n'
printf 'TỔNG: %d phép · ĐẠT %d · TRƯỢT %d · HOÃN %d (⏸ = cố ý chưa chạy, không phải đạt)\n' \
  "${PHEP}" "$((PHEP - LOI))" "${LOI}" "${HOAN}"
[ "${LOI}" -eq 0 ] && exit 0 || exit 1
