#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU L3-M4 — Hàng chờ tạo đơn luồng Messenger: NĂM cửa +
# `duyet()` = TẠO ĐƠN POS THẬT. Thi hành đúng các phép của ④ trong
# docs/thi-cong/phieu/PHIEU-L3-M4.md.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT DANH SÁCH. Không dòng nào chỉ nói "chạy xong".
# BA TRẠNG THÁI — ✔ ĐẠT · ✘ TRƯỢT · ⏸ HOÃN (khuôn l1-m1/l3-m1/l3-m3.sh).
#
# ⛔ KHÔNG lượt POST THẬT nào tới POS: `nap` (fetch) TIÊM ở mọi phép. Phép tạo đơn THẬT
#    là §7b **T7** (cần `V3_POS_GHI=1` + người chọn shop) — cổng in ⏸ HOÃN cho nó.
#
# HAI CSDL, cố ý:
#   · sandbox `aicloser_v3_nt_l3m4` (tự dựng/tự dọn) cho mọi phép có GHI;
#   · `aicloser_v3` DEV cho phép ③b — `kiemTrung` chạy THẬT trên 3.218 khách/3.784 đơn
#     (chữ phiếu: «cấm mock»). Phép đó CHỈ ĐỌC: `chayNamCua` không có câu ghi nào, và
#     cổng đếm lại `hang_cho_tao_don`/`don_hang` của dev trước-sau để chứng minh.
#
#   bash ops/bin/nghiem-thu/l3-m4.sh
#   GIU_SANDBOX=1 bash ops/bin/nghiem-thu/l3-m4.sh   # giữ CSDL lại để soi tay
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

CONTAINER="talpha-pg"
DB="aicloser_v3_nt_l3m4"
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
  if out="$(node -e "$1" 2>/tmp/l3m4-node-err.txt)"; then
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

don_dep() {
  if [ "${GIU_SANDBOX:-0}" = "1" ]; then
    printf '\n(giữ lại CSDL %s theo GIU_SANDBOX=1)\n' "${DB}"
  else
    docker exec "${CONTAINER}" psql -U aicloser -d postgres -tAc \
      "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1
  fi
}
trap don_dep EXIT

echo "CỔNG NGHIỆM THU L3-M4 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL ghi: ${DB} (sandbox) · CSDL đọc-thật: ${URL_DEV##*/} · container ${CONTAINER}"

node db/migrate.js >/dev/null 2>&1
CO_BANG="$(docker exec "${CONTAINER}" psql -U aicloser -d "${DB}" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_name='hang_cho_tao_don'" 2>/dev/null | tr -d ' ')"
so "bảng hang_cho_tao_don có mặt sau migrate" "${CO_BANG}"
[ "${CO_BANG}" = "1" ] || { echo "✘ bảng hang_cho_tao_don chưa có — cổng dừng"; exit 2; }

# ── Hàm dùng chung cho mọi khối node -e ─────────────────────────────────────────
# ⚠️ CẤM nháy đơn trần trong khối này: nó nằm trong một bash single-quote, và bash
#    KHÔNG escape được nháy đơn lồng (án lệ l3-m3.sh). Chuỗi SQL dùng nháy KÉP hoặc
#    tham số hoá; hằng SQL dùng $$…$$.
HELPER='
const SHOP = "9996001";
const MARKET = "GiaLapGate";
const UUID_BT = "3e272c3b-ea70-4d10-981e-e9049090322b";
const BIEN_THE = SHOP + ":" + UUID_BT;
const KHOA = { V3_KHOA_MA_HOA: "d".repeat(64) };
const MO = { ...KHOA, V3_POS_GHI: "1" };
const DONG = { ...KHOA };
const HO_SO = {
  ten: "Gate Sara", sdt: "+971500000123", dia_chi: "Marina 1", thanh_pho: "Dubai",
  so_luong: 2, tong_tien: 199, tien_te: "AED", san_pham_ma: BIEN_THE, kho_hang: "kho-gate",
};
function napGia({ idMoi = 80001, httpTao = 200, nemTao = null, donGet = [], nemGet = null } = {}) {
  const f = async (url, tuyChon = {}) => {
    if ((tuyChon.method || "GET") === "POST") {
      f.post += 1; f.than.push(JSON.parse(tuyChon.body));
      if (nemTao) throw nemTao;
      return { ok: httpTao >= 200 && httpTao < 300, status: httpTao,
        text: async () => httpTao < 300 ? JSON.stringify({ data: { id: idMoi } })
                                        : JSON.stringify({ message: "tu choi" }) };
    }
    f.get += 1;
    if (nemGet) throw nemGet;
    return { ok: true, status: 200,
      text: async () => JSON.stringify({ data: donGet, total_entries: donGet.length }) };
  };
  f.post = 0; f.get = 0; f.than = [];
  return f;
}
// ⚠️ MỖI KHỐI `node -e` DÙNG CHUNG một sandbox: đơn/khách khối trước ĐỌNG LẠI và làm
//    `kiemTrung` của khối sau báo trùng (đã dính đúng lỗi này khi dựng cổng). Nên mỗi
//    khối lấy một SĐT riêng — cách ly bằng DỮ LIỆU, không bằng thứ tự chạy.
async function nen(pool) {
  const { maHoa } = await import("./db/khoa.js");
  const team = (await pool.query("SELECT id FROM team WHERE slug = $1", ["tieu-alpha"])).rows[0].id;
  const pageText = "556000" + Math.floor(Math.random() * 1e6);
  const page = (await pool.query(
    "INSERT INTO page (team_id, page_id, ten, thi_truong, pos_shop_id) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [team, pageText, "Page gate", "NhanKhongKhop", SHOP])).rows[0];
  await pool.query(
    "INSERT INTO ket_noi_pos (team_id, market, shop_id, api_key_ma) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING",
    [team, MARKET, SHOP, maHoa("khoa-gate", KHOA)]);
  const hoSo = { ...HO_SO, sdt: "+9715" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0") };
  return { team, page, pageText, hoSo };
}
async function themGiaCho(pool, team, page, { gia = 199, sl = 2, te = "AED" } = {}) {
  const sp = (await pool.query(
    "INSERT INTO san_pham (team_id, page_id, ma, ten) VALUES ($1,$2,$3,$4) RETURNING id",
    [team, page.id, BIEN_THE + ":" + Math.random(), "SP gate"])).rows[0].id;
  await pool.query(
    "INSERT INTO goi_gia (team_id, san_pham_id, so_luong, gia, tien_te) VALUES ($1,$2,$3,$4,$5)",
    [team, sp, sl, gia, te]);
  return sp;
}
async function dungDong(pool, ctxHeThong, vaoHangCho, n, { psid, hoSo = null, tinId, noiDung = "yes i confirm" }) {
  const { team, page, pageText } = n;
  hoSo = hoSo || n.hoSo;
  const h = (await pool.query(
    "INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [team, page.id, psid, "CLOSING", "AI"])).rows[0];
  await pool.query(
    "INSERT INTO tin_cho_xu_ly (team_id, page_id, psid, conv_id, msg_id, noi_dung, trang_thai) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [team, pageText, psid, "conv-" + psid, "msg-" + psid, noiDung, "xong"]);
  const kq = await vaoHangCho(pool, ctxHeThong(), {
    hoiThoaiId: h.id, teamId: team, hoSo, convId: "conv-" + psid, tinId,
  }, { env: MO, nap: napGia() });
  return { hoiThoai: h, hangChoId: kq.id, cua_kiem: kq.cua_kiem };
}
'

# ═══ ①#1 — VÀO HÀNG CHỜ: 1 dòng + kết quả NĂM cửa (in JSON) ═════════════════════
muc "① VÀO HÀNG CHỜ — 1 dòng hang_cho_tao_don kèm kết quả NĂM cửa (in JSON)"
KQ1="$(nodex "${HELPER}"'
const { vaoHangCho, docHangCho } = await import("./src/orders/hang-cho.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const n = await nen(pool);
  const a = await dungDong(pool, ctxHeThong, vaoHangCho, n, { psid: "gate1", tinId: 100001 });
  const dong = await docHangCho(pool, ctxHeThong(), { hangChoId: a.hangChoId, teamId: n.team });
  console.error("   JSON cua_kiem (①): " + JSON.stringify(dong.cua_kiem));
  const cong = Object.keys(dong.cua_kiem.cong).sort().join(",");
  const c3 = dong.cua_kiem.cong[Object.keys(dong.cua_kiem.cong).find((k) => k.startsWith("3"))];
  const ng = Object.keys(c3.nguon).sort().join(",");
  const b = await dungDong(pool, ctxHeThong, vaoHangCho, n, {
    psid: "gate1b", tinId: 100002, hoSo: { ...n.hoSo, sdt: "", dia_chi: "" } });
  const dongB = await docHangCho(pool, ctxHeThong(), { hangChoId: b.hangChoId, teamId: n.team });
  const c1 = dongB.cua_kiem.cong[Object.keys(dongB.cua_kiem.cong).find((k) => k.startsWith("1"))];
  const dem = (await pool.query("SELECT count(*)::int c FROM hang_cho_tao_don")).rows[0].c;
  console.log([cong, ng, dongB.trang_thai, (c1.thieu_truong || []).join("+"), dem].join("|"));
});')"
so "kết quả ① (5 cửa|5 nguồn|trạng thái dòng thiếu|thiếu gì|đếm dòng)" "${KQ1}"
bang "①a cua_kiem khai ĐỦ NĂM cửa" "$(echo "${KQ1}" | cut -d'|' -f1)" \
  "1_du_truong,2_tien,3_chong_trung,4_hang_cho,5_tao_don"
bang "①b cửa ③ khai ĐỦ NĂM nguồn (so DANH SÁCH, không so số)" "$(echo "${KQ1}" | cut -d'|' -f2)" \
  "a_so_ai,b_pos_song,c_trang_thai_hoi_thoai,d_fb_commerce,e_kiem_trung"
bang "①c thiếu trường VẪN vào hàng chờ" "$(echo "${KQ1}" | cut -d'|' -f3)" "cho_duyet"
bang "①d gắn ĐÚNG TÊN trường thiếu" "$(echo "${KQ1}" | cut -d'|' -f4)" "sdt+dia_chi"
bang "①e tổng dòng hàng chờ sau 2 lượt vào" "$(echo "${KQ1}" | cut -d'|' -f5)" "2"

# ═══ ②#2 — CỬA TIỀN: goi_gia rỗng ⇒ unknown-là-đóng · seed gói khớp ⇒ mở ════════
muc "② CỬA TIỀN — goi_gia rỗng ⇒ unknown VÀ ĐÓNG (in lý do) · seed 1 gói khớp ⇒ mở"
KQ2="$(nodex "${HELPER}"'
const { vaoHangCho, duyet, cua2Tien, chuanHoaHoSo } = await import("./src/orders/hang-cho.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const n = await nen(pool);
  const a = await dungDong(pool, ctxHeThong, vaoHangCho, n, { psid: "gate2", tinId: 100011 });
  const nap = napGia();
  const chan = await duyet(pool, ctxHeThong(), { hangChoId: a.hangChoId, teamId: n.team }, { env: MO, nap });
  console.error("   lý do CHẶN (②): " + JSON.stringify(chan.chan_vi));
  const truoc = chan.chan_vi.join(",");
  await themGiaCho(pool, n.team, n.page);
  const mo = await cua2Tien(pool, { teamId: n.team, pageId: n.page.id, duLieu: chuanHoaHoSo(n.hoSo) });
  console.log([truoc, nap.post, chan.tao, mo.qua, mo.ly_do].join("|"));
});')"
so "kết quả ② (lý do chặn|POST|tạo|cửa sau seed|lý do)" "${KQ2}"
bang "②a duyet BỊ CHẶN đúng tên lỗi (unknown = ĐÓNG)" "$(echo "${KQ2}" | cut -d'|' -f1)" \
  "cua2:unknown_chua_co_bang_gia"
bang "②b lượt bị chặn KHÔNG bắn POST nào" "$(echo "${KQ2}" | cut -d'|' -f2)" "0"
bang "②c không tạo đơn" "$(echo "${KQ2}" | cut -d'|' -f3)" "false"
bang "②d seed 1 goi_gia khớp ⇒ cửa tiền MỞ" "$(echo "${KQ2}" | cut -d'|' -f4)" "true"
bang "②e lý do khi mở" "$(echo "${KQ2}" | cut -d'|' -f5)" "khop_dung_mot_goi"

# ═══ ②b — NGUỒN POS SỐNG (N2) ══════════════════════════════════════════════════
muc "②b NGUỒN (b) POS SỐNG — timeout ⇒ unknown + CHẶN · đơn tay chưa quét ⇒ bắt trùng"
KQ2B="$(nodex "${HELPER}"'
const { vaoHangCho, duyet } = await import("./src/orders/hang-cho.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const n = await nen(pool);
  await themGiaCho(pool, n.team, n.page);
  const a = await dungDong(pool, ctxHeThong, vaoHangCho, n, { psid: "gate2b", tinId: 100021 });
  const napTo = napGia({ nemGet: new Error("ETIMEDOUT") });
  const to = await duyet(pool, ctxHeThong(), { hangChoId: a.hangChoId, teamId: n.team }, { env: MO, nap: napTo });
  console.error("   lý do CHẶN (②b timeout): " + JSON.stringify(to.chan_vi));
  const b = await dungDong(pool, ctxHeThong, vaoHangCho, n, { psid: "gate2b2", tinId: 100022 });
  const napTay = napGia({ donGet: [{ id: 60777, status: 0, conversation_id: "conv-gate2b2" }] });
  const tay = await duyet(pool, ctxHeThong(), { hangChoId: b.hangChoId, teamId: n.team }, { env: MO, nap: napTay });
  console.error("   lý do CHẶN (②b đơn tay): " + JSON.stringify(tay.chan_vi));
  const guong = (await pool.query("SELECT count(*)::int c FROM don_hang WHERE ma_pos LIKE $1", ["%60777"])).rows[0].c;
  console.log([to.chan_vi.join(","), napTo.post, tay.chan_vi.join(","), napTay.post, guong].join("|"));
});')"
so "kết quả ②b (chặn-timeout|POST|chặn-đơn-tay|POST|gương don_hang)" "${KQ2B}"
bang "②b1 POS timeout ⇒ unknown + CHẶN" "$(echo "${KQ2B}" | cut -d'|' -f1)" \
  "cua3:unknown_la_dong: b_pos_song"
bang "②b2 lượt timeout KHÔNG bắn POST" "$(echo "${KQ2B}" | cut -d'|' -f2)" "0"
bang "②b3 đơn tay MỚI (POS sống) ⇒ bắt trùng" "$(echo "${KQ2B}" | cut -d'|' -f3)" \
  "cua3:trung: b_pos_song"
bang "②b4 lượt trùng KHÔNG bắn POST" "$(echo "${KQ2B}" | cut -d'|' -f4)" "0"
bang "②b5 GƯƠNG don_hang KHÔNG hề có đơn đó (đọc gương là mất cơ chế)" "$(echo "${KQ2B}" | cut -d'|' -f5)" "0"

# ═══ ③ — CHỐNG TRÙNG NĂM NGUỒN: từng nguồn dương MỘT ═══════════════════════════
muc "③ CHỐNG TRÙNG — bật DƯƠNG từng nguồn một (in từng nguồn) + nguồn (e) LỖI ⇒ unknown"
node -e "${HELPER}"'
const { vaoHangCho, duyet, KET_NGUON } = await import("./src/orders/hang-cho.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
let bad = 0, n_ca = 0;
await voiPool(async (pool) => {
  const n = await nen(pool);
  await themGiaCho(pool, n.team, n.page);
  const chay = async (ten, { psid, tinId, truoc = async () => {}, sau = async () => {}, nap = napGia(), deps = {}, cho, noiDung = "yes i confirm" }) => {
    await truoc(n);
    const a = await dungDong(pool, ctxHeThong, vaoHangCho, n, { psid, tinId, noiDung });
    await sau(n, a);
    const kq = await duyet(pool, ctxHeThong(), { hangChoId: a.hangChoId, teamId: n.team }, { env: MO, nap, ...deps });
    const ok = kq.tao === false && kq.chan_vi.join(",") === cho && nap.post === 0;
    n_ca += 1; if (!ok) bad += 1;
    console.log("   " + (ok ? "✔" : "✘") + " " + ten + " -> chan_vi=" + JSON.stringify(kq.chan_vi)
      + " POST=" + nap.post + " [chờ " + cho + "]");
  };
  await chay("(a) so_ai đã có sự kiện order", { psid: "g3a", tinId: 100031,
    truoc: async (n) => { await pool.query(
      "INSERT INTO so_ai (team_id, xay_ra_luc, page_id, psid, loai, ma_model, nguon_tep, nguon_dong) VALUES ($1, now(), $2, $3, $4, $5, $6, $7)",
      [n.team, n.pageText, "g3a", "order", "khong-goi-model", "tin_cho_xu_ly:order", 999031]); },
    cho: "cua3:trung: a_so_ai" });
  await chay("(b) POS SỐNG có đơn của hội thoại", { psid: "g3b", tinId: 100032,
    nap: napGia({ donGet: [{ id: 61001, status: 0, conversation_id: "conv-g3b" }] }),
    cho: "cua3:trung: b_pos_song" });
  await chay("(c) hội thoại ở POST_SALE", { psid: "g3c", tinId: 100033,
    sau: async (n, a) => { await pool.query(
      "UPDATE hoi_thoai SET trang_thai = $1 WHERE id = $2", ["POST_SALE", a.hoiThoai.id]); },
    cho: "cua3:trung: c_trang_thai_hoi_thoai" });
  await chay("(d) dấu hiệu đơn FB Commerce trong hội thoại", { psid: "g3d", tinId: 100034,
    noiDung: "You have placed an order, thanks",
    cho: "cua3:trung: d_fb_commerce" });
  await chay("(e) kiemTrung CHÉO bắt trùng (chạy THẬT, không mock)", { psid: "g3e", tinId: 100035,
    truoc: async (n) => {
      const k = (await pool.query("INSERT INTO khach (team_id, so_dien_thoai) VALUES ($1,$2) RETURNING id",
        [n.team, n.hoSo.sdt])).rows[0].id;
      await pool.query(
        "INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos, khach_id, san_pham_ma) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [n.team, SHOP + ":90001", "trang_ban_hang", "moi_tu_pos", "0", k, [BIEN_THE]]); },
    cho: "cua3:trung: e_kiem_trung" });
  await chay("(e) kiemTrung NÉM ⇒ unknown là ĐÓNG", { psid: "g3f", tinId: 100036,
    deps: { kiemTrung: async () => { throw new Error("CSDL dut"); } },
    cho: "cua3:unknown_la_dong: e_kiem_trung" });
});
console.log("SO=" + n_ca + "|BAD=" + bad);
' > /tmp/l3m4-nguon.txt 2>/tmp/l3m4-nguon-err.txt
grep -E '^   [✔✘]' /tmp/l3m4-nguon.txt || cat /tmp/l3m4-nguon-err.txt | tail -5
N3_SO="$(grep -oE 'SO=[0-9]+' /tmp/l3m4-nguon.txt | cut -d= -f2)"
N3_BAD="$(grep -oE 'BAD=[0-9]+' /tmp/l3m4-nguon.txt | cut -d= -f2)"
bang "③a đủ 6 ca nguồn (5 nguồn dương + 1 nguồn lỗi)" "${N3_SO:-LOI-NODE}" "6"
bang "③b tất cả ca CHẶN đúng nguồn + POST=0" "${N3_BAD:-LOI-NODE}" "0"

# ═══ ③b — kiemTrung chạy THẬT trên CSDL DEV (cấm mock) ═════════════════════════
muc "③b kiemTrung THẬT trên ${URL_DEV##*/} (3.218 khách / 3.784 đơn) — CHỈ ĐỌC, known-answer"
KQ3B="$(DATABASE_URL_V3="${URL_DEV}" nodex '
const { chayNamCua, KET_NGUON } = await import("./src/orders/hang-cho.js");
const { kiemTrung, KEO_NGAY_MAC_DINH } = await import("./src/orders/loc-trung.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const truoc = (await pool.query("SELECT (SELECT count(*) FROM hang_cho_tao_don)::int h, (SELECT count(*) FROM don_hang)::int d")).rows[0];
  // Cặp trùng chéo đo phép này được TÌM MỖI LƯỢT, không gõ cứng nữa. Cặp cũ
  // (966501984606 / #68771·#68769, tạo 22/08) rơi ra ngoài cửa sổ 7 ngày từ 30/08,
  // nên từ hôm đó năm phép ③b đỏ vì LỊCH TRÔI chứ không vì mã hỏng. Phép ③b5 đi qua
  // `chayNamCua` — đường thật, không truyền cửa sổ vào được — nên lối duy nhất giữ
  // được vế đó là dùng một cặp CÒN TRONG HẠN. Không tìm ra cặp nào thì HOÃN, ở dưới.
  const cap = (await pool.query(`
    SELECT k.so_dien_thoai AS sdt, sp.ma AS sp
      FROM don_hang d
      JOIN khach k ON k.id = d.khach_id AND k.team_id = d.team_id
      CROSS JOIN LATERAL unnest(d.san_pham_ma) AS sp(ma)
     WHERE d.team_id = 4 AND k.so_dien_thoai IS NOT NULL
       AND d.tao_luc >= now() - ($1 * interval $$1 day$$)
     GROUP BY 1, 2
    HAVING count(*) >= 2 AND count(DISTINCT d.nguon) = 2
     ORDER BY max(d.tao_luc) DESC
     LIMIT 1`, [KEO_NGAY_MAC_DINH])).rows[0];
  if (!cap) { console.log("KHONG-CO-CAP"); return; }
  const SP = cap.sp;
  const kt = await kiemTrung(pool, ctxHeThong(), { soDienThoai: cap.sdt, sanPhamId: SP, teamId: 4 });
  const nam = await chayNamCua(pool, ctxHeThong(), {
    teamId: 4, hoiThoai: { trang_thai: "SELLING" }, pageId: null,
    pageIdText: "khong-co", psid: "khong-co", convId: null, market: null,
    duLieu: { ten: "x", sdt: cap.sdt, dia_chi: "y", so_luong: 1, tong_tien: 1,
              tien_te: "SAR", san_pham_ma: SP },
    tinId: null,
  }, { nap: async () => { throw new Error("GATE: cấm chạm mạng"); } });
  const e = nam.cong["3_chong_trung"].nguon.e_kiem_trung;
  const sau = (await pool.query("SELECT (SELECT count(*) FROM hang_cho_tao_don)::int h, (SELECT count(*) FROM don_hang)::int d")).rows[0];
  const phu = (await pool.query(`
    SELECT count(*) FILTER (WHERE kn.id IS NOT NULL)::int qua_shop, count(*)::int tong
      FROM page p LEFT JOIN ket_noi_pos kn ON kn.team_id=p.team_id AND kn.shop_id=p.pos_shop_id AND kn.bat`)).rows[0];
  console.error("   cặp đo lượt này: sđt=" + cap.sdt + " sp=" + SP);
  console.error("   danh sách đơn kiemTrung bắt được: " + JSON.stringify(kt.don.map((d) => d.ma_pos + "/" + d.nguon)));
  console.error("   chan_vi (③b): " + JSON.stringify(nam.chan_vi));
  console.log([kt.trung, kt.ly_do, kt.nguon_trung, kt.don.length, e.ket,
    truoc.h + "/" + sau.h, truoc.d + "/" + sau.d, phu.qua_shop + "/" + phu.tong].join("|"));
});')"
so "kết quả ③b (trùng|lý do|nguồn|số đơn|nguồn e|hàngchờ trước/sau|đơn trước/sau|phủ POS)" "${KQ3B}"
if [ "${KQ3B}" = "KHONG-CO-CAP" ]; then
  # HOÃN chứ không giả xanh: CSDL dev lúc này không có cặp đơn nào cùng khách + cùng
  # sản phẩm, hai luồng khác nhau, còn trong cửa sổ 7 ngày. Nạp POS một lượt là có lại.
  hoan "③b1–b5 kiemTrung THẬT — không có cặp trùng chéo nào còn trong cửa sổ ${KEO_NGAY:-7} ngày trên dev; chạy \`npm run nap-pos\` rồi đo lại"
  hoan "③b6–b8 phép chỉ-đọc trên dev — đi kèm ③b, hoãn theo"
else
bang "③b1 kiemTrung THẬT bắt được cặp trùng chéo" "$(echo "${KQ3B}" | cut -d'|' -f1)" "true"
bang "③b2 lý do = trùng ĐÃ XÁC MINH" "$(echo "${KQ3B}" | cut -d'|' -f2)" "trung_khop_san_pham"
bang "③b3 nguồn trùng = cả hai luồng" "$(echo "${KQ3B}" | cut -d'|' -f3)" "ca_hai"
bang "③b4 số đơn bắt được ≥ 2" "$(( $(echo "${KQ3B}" | cut -d'|' -f4) >= 2 ? 1 : 0 ))" "1"
bang "③b5 nguồn (e) trong chayNamCua = dương" "$(echo "${KQ3B}" | cut -d'|' -f5)" "duong"
DEV_H="$(echo "${KQ3B}" | cut -d'|' -f6)"
DEV_D="$(echo "${KQ3B}" | cut -d'|' -f7)"
bang "③b6 DEV hang_cho_tao_don KHÔNG đổi (phép chỉ-đọc)" "${DEV_H}" "${DEV_H%%/*}/${DEV_H%%/*}"
bang "③b7 DEV don_hang KHÔNG đổi (0 đơn thật bị đụng)" "${DEV_D}" "${DEV_D%%/*}/${DEV_D%%/*}"
so   "③b8 độ phủ resolver POS theo page trên DEV (qua pos_shop_id / tổng)" "$(echo "${KQ3B}" | cut -d'|' -f8)"
fi

# ═══ ④ — DUYỆT ĐƯỜNG LÀNH ══════════════════════════════════════════════════════
muc "④ DUYỆT ĐƯỜNG LÀNH — mock POST ⇒ đơn tạo đúng payload · don_hang +1 · máy · so_ai +1"
KQ4="$(nodex "${HELPER}"'
const { vaoHangCho, duyet, docHangCho } = await import("./src/orders/hang-cho.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const n = await nen(pool);
  await themGiaCho(pool, n.team, n.page);
  const a = await dungDong(pool, ctxHeThong, vaoHangCho, n, { psid: "gate4", tinId: 100041 });
  const truoc = (await pool.query("SELECT count(*)::int c FROM don_hang")).rows[0].c;
  const nap = napGia({ idMoi: 80777 });
  const kq = await duyet(pool, ctxHeThong(), { hangChoId: a.hangChoId, teamId: n.team }, { env: MO, nap });
  console.error("   PAYLOAD gửi POS (④): " + JSON.stringify(kq.payload));
  const sau = (await pool.query("SELECT count(*)::int c FROM don_hang")).rows[0].c;
  const don = (await pool.query("SELECT * FROM don_hang WHERE ma_pos = $1", [kq.maPos])).rows[0];
  const sa = (await pool.query("SELECT count(*)::int c FROM so_ai WHERE nguon_tep = $1", ["hang_cho_tao_don:order"])).rows[0].c;
  const hc = await docHangCho(pool, ctxHeThong(), { hangChoId: a.hangChoId, teamId: n.team });
  console.log([nap.post, kq.maPos, sau - truoc, don.nguon, don.trang_thai_pos, don.trang_thai_he,
    sa, hc.trang_thai, String(hc.don_hang_id) === String(don.id)].join("|"));
});')"
so "kết quả ④ (POST|ma_pos|đơn+|nguồn|tt_pos|tt_hệ|so_ai|hàng chờ|nối id)" "${KQ4}"
bang "④a POST đúng MỘT lượt" "$(echo "${KQ4}" | cut -d'|' -f1)" "1"
bang "④b ma_pos = shop:id POS trả về" "$(echo "${KQ4}" | cut -d'|' -f2)" "9996001:80777"
bang "④c don_hang +1" "$(echo "${KQ4}" | cut -d'|' -f3)" "1"
bang "④d nguon = messenger" "$(echo "${KQ4}" | cut -d'|' -f4)" "messenger"
bang "④e trang_thai_pos = 12 («Chờ in»)" "$(echo "${KQ4}" | cut -d'|' -f5)" "12"
bang "④f trang_thai_he = day_cho_in (donMessengerDaTao ĐÃ chạy)" "$(echo "${KQ4}" | cut -d'|' -f6)" "day_cho_in"
bang "④g so_ai +1 (neo riêng hang_cho_tao_don:order)" "$(echo "${KQ4}" | cut -d'|' -f7)" "1"
bang "④h dòng hàng chờ sang da_duyet" "$(echo "${KQ4}" | cut -d'|' -f8)" "da_duyet"
bang "④i hàng chờ nối đúng don_hang_id" "$(echo "${KQ4}" | cut -d'|' -f9)" "true"

# ═══ ⑤ — BỐN CỬA CỦA `taoDon` ══════════════════════════════════════════════════
muc "⑤ BỐN CỬA taoDon — van vắng ⇒ api=0 · status=12 tường minh · idempotent · nhật ký 2 pha"
KQ5="$(nodex "${HELPER}"'
const { taoDon, dungPayload, moCoiTruocPost, MA_CHO_IN } = await import("./src/pos/tao-don.js");
const { vaoHangCho, duyet } = await import("./src/orders/hang-cho.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const n = await nen(pool);
  await themGiaCho(pool, n.team, n.page);
  // (a) van VẮNG
  const napVan = napGia();
  let tenLoi = "KHONG-NEM";
  try {
    await taoDon(pool, ctxHeThong(), { hangChoId: 555001, teamId: n.team, market: MARKET,
      pageIdText: n.pageText, don: { ten: "a", sdt: "b", diaChi: "c", soLuong: 1,
        tongTien: 10, tienTe: "AED", sanPhamMa: BIEN_THE, khoHang: "k" } },
      { nap: napVan, env: DONG });
  } catch (e) { tenLoi = e.name; }
  const nkChan = (await pool.query(
    "SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong = $1 AND doi_tuong_id = $2", ["pos_tao_don_bi_chan", "555001"])).rows[0].c;
  // (b) payload status
  const pl = dungPayload({ pageIdText: n.pageText, don: { ten: "a", soLuong: 1, tongTien: 10, tienTe: "AED" },
    variationId: UUID_BT, khoHang: "k" });
  console.error("   PAYLOAD status (⑤): status=" + pl.status + " variation_id=" + JSON.stringify(pl.items[0].variation_id));
  // (c) idempotent TUẦN TỰ qua duyet
  const a = await dungDong(pool, ctxHeThong, vaoHangCho, n, { psid: "gate5", tinId: 100051 });
  const n1 = napGia({ idMoi: 80801 });
  await duyet(pool, ctxHeThong(), { hangChoId: a.hangChoId, teamId: n.team }, { env: MO, nap: n1 });
  const n2 = napGia({ idMoi: 80802 });
  let ten2 = "KHONG-NEM";
  try { await duyet(pool, ctxHeThong(), { hangChoId: a.hangChoId, teamId: n.team }, { env: MO, nap: n2 }); }
  catch (e) { ten2 = e.name; }
  const soDon = (await pool.query("SELECT count(*)::int c FROM don_hang WHERE hoi_thoai_id = $1", [a.hoiThoai.id])).rows[0].c;
  const mc = await moCoiTruocPost(pool, { teamId: n.team, hangChoId: a.hangChoId });
  // (d) mất phản hồi ⇒ mồ côi ⇒ lượt sau bị cửa c3 chặn
  const b = await dungDong(pool, ctxHeThong, vaoHangCho, n, { psid: "gate5b", tinId: 100052 });
  const nTo = napGia({ nemTao: new Error("ETIMEDOUT") });
  try { await duyet(pool, ctxHeThong(), { hangChoId: b.hangChoId, teamId: n.team }, { env: MO, nap: nTo }); } catch (e) {}
  const mc2 = await moCoiTruocPost(pool, { teamId: n.team, hangChoId: b.hangChoId });
  const nLai = napGia({ idMoi: 80803 });
  let ten3 = "KHONG-NEM";
  try { await duyet(pool, ctxHeThong(), { hangChoId: b.hangChoId, teamId: n.team }, { env: MO, nap: nLai }); }
  catch (e) { ten3 = e.name + ":" + (e.lop || "?"); }
  console.log([tenLoi, napVan.post, nkChan, pl.status, MA_CHO_IN, ten2, n2.post, soDon,
    mc.batDau + "/" + mc.ketQua, mc2.batDau + "/" + mc2.ketQua, ten3, nLai.post].join("|"));
});')"
so "kết quả ⑤ (lỗi van|POST|nk chặn|status|MA|lỗi lần2|POST2|số đơn|2pha|2pha mồ côi|lỗi lần3|POST3)" "${KQ5}"
bang "⑤a V3_POS_GHI vắng ⇒ LoiVanGhiDong" "$(echo "${KQ5}" | cut -d'|' -f1)" "LoiVanGhiDong"
bang "⑤b van đóng ⇒ api = 0 lượt" "$(echo "${KQ5}" | cut -d'|' -f2)" "0"
bang "⑤c lượt bị chặn VẪN ghi nhat_ky (im lặng thì không ai biết)" "$(echo "${KQ5}" | cut -d'|' -f3)" "1"
bang "⑤d payload.status = 12 TƯỜNG MINH (KHÔNG bê 0 khuôn cũ)" "$(echo "${KQ5}" | cut -d'|' -f4)" "12"
bang "⑤e MA_CHO_IN suy từ BANG_MA đã xác minh" "$(echo "${KQ5}" | cut -d'|' -f5)" "12"
bang "⑤f duyet lần hai (tuần tự) bị chặn" "$(echo "${KQ5}" | cut -d'|' -f6)" "LoiHangChoDaXuLy"
bang "⑤g lần hai KHÔNG bắn POST" "$(echo "${KQ5}" | cut -d'|' -f7)" "0"
bang "⑤h vẫn ĐÚNG MỘT đơn cho hội thoại đó" "$(echo "${KQ5}" | cut -d'|' -f8)" "1"
bang "⑤i nhật ký 2 pha đủ (bắt_đầu/kết_quả)" "$(echo "${KQ5}" | cut -d'|' -f9)" "1/1"
bang "⑤j mất phản hồi ⇒ pha 2 MỒ CÔI" "$(echo "${KQ5}" | cut -d'|' -f10)" "1/0"
bang "⑤k lượt tạo lại bị cửa (c)③ chặn" "$(echo "${KQ5}" | cut -d'|' -f11)" "LoiDonDaTao:c3"
bang "⑤l lượt tạo lại KHÔNG bắn POST thứ hai" "$(echo "${KQ5}" | cut -d'|' -f12)" "0"

# ═══ ⑤b — RACE (N4): hai lượt duyet SONG SONG ══════════════════════════════════
muc "⑤b RACE — 2 lượt duyet SONG SONG cùng hangChoId (FOR UPDATE), in CẢ HAI kết quả"
KQ5B="$(nodex "${HELPER}"'
const { vaoHangCho, duyet } = await import("./src/orders/hang-cho.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const n = await nen(pool);
  await themGiaCho(pool, n.team, n.page);
  const a = await dungDong(pool, ctxHeThong, vaoHangCho, n, { psid: "gate5b", tinId: 100061 });
  const nA = napGia({ idMoi: 80901 });
  const nB = napGia({ idMoi: 80902 });
  const [x, y] = await Promise.allSettled([
    duyet(pool, ctxHeThong(), { hangChoId: a.hangChoId, teamId: n.team }, { env: MO, nap: nA }),
    duyet(pool, ctxHeThong(), { hangChoId: a.hangChoId, teamId: n.team }, { env: MO, nap: nB }),
  ]);
  const ta = (z) => z.status === "fulfilled" ? "OK:" + z.value.maPos : "CHAN:" + z.reason.name;
  console.error("   KẾT QUẢ SONG SONG: lượt1=" + ta(x) + " · lượt2=" + ta(y));
  const soDon = (await pool.query("SELECT count(*)::int c FROM don_hang WHERE hoi_thoai_id = $1", [a.hoiThoai.id])).rows[0].c;
  const thanh = [x, y].filter((z) => z.status === "fulfilled").length;
  const chan = [x, y].filter((z) => z.status === "rejected").map((z) => z.reason.name).join(",");
  console.log([thanh, chan, nA.post + nB.post, soDon].join("|"));
});')"
so "kết quả ⑤b (thành công|lỗi lượt kia|tổng POST|số đơn)" "${KQ5B}"
bang "⑤b1 ĐÚNG MỘT lượt thành công" "$(echo "${KQ5B}" | cut -d'|' -f1)" "1"
bang "⑤b2 lượt kia bị chặn có TÊN" "$(echo "${KQ5B}" | cut -d'|' -f2)" "LoiHangChoDaXuLy"
bang "⑤b3 tổng POST = 1 (2 lượt = 2 kiện COD thật)" "$(echo "${KQ5B}" | cut -d'|' -f3)" "1"
bang "⑤b4 đúng MỘT đơn trong don_hang" "$(echo "${KQ5B}" | cut -d'|' -f4)" "1"

# ═══ ⑤c — boSung (N6) ══════════════════════════════════════════════════════════
muc "⑤c boSung — thiếu trường ⇒ chặn cửa ① · sale bổ sung ⇒ CHẠY LẠI đủ cửa rồi đi tiếp"
KQ5C="$(nodex "${HELPER}"'
const { vaoHangCho, duyet } = await import("./src/orders/hang-cho.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const n = await nen(pool);
  await themGiaCho(pool, n.team, n.page);
  const a = await dungDong(pool, ctxHeThong, vaoHangCho, n, { psid: "gate5c", tinId: 100071,
    hoSo: { ...n.hoSo, sdt: "", dia_chi: "" } });
  const n1 = napGia();
  const khong = await duyet(pool, ctxHeThong(), { hangChoId: a.hangChoId, teamId: n.team }, { env: MO, nap: n1 });
  console.error("   chặn khi KHÔNG boSung (⑤c): " + JSON.stringify(khong.chan_vi));
  const n2 = napGia({ idMoi: 81001 });
  const co = await duyet(pool, ctxHeThong(), { hangChoId: a.hangChoId, teamId: n.team,
    boSung: { sdt: "+971500009999", dia_chi: "Marina 5" } }, { env: MO, nap: n2 });
  console.error("   payload sau boSung (⑤c): " + JSON.stringify(co.payload && co.payload.shipping_address));
  console.log([khong.tao, khong.chan_vi.join(","), n1.post, co.tao, n2.post,
    co.payload ? co.payload.bill_phone_number : "?"].join("|"));
});')"
so "kết quả ⑤c (tạo-không|chặn vì|POST|tạo-có|POST|SĐT payload)" "${KQ5C}"
# Thiếu SĐT thì cửa ① chặn VÀ nguồn (e) không phán được (chua_co_sdt ⇒ unknown ⇒ ĐÓNG) —
# chờ ĐÚNG CẢ HAI, vì «chỉ cửa ①» sẽ là một lời khai thiếu về đường thật.
bang "⑤c1 không boSung ⇒ CHẶN ở cửa ① + (e) unknown" "$(echo "${KQ5C}" | cut -d'|' -f2)" \
  "cua1:thieu_truong: sdt, dia_chi,cua3:unknown_la_dong: e_kiem_trung"
bang "⑤c2 lượt chặn KHÔNG bắn POST" "$(echo "${KQ5C}" | cut -d'|' -f3)" "0"
bang "⑤c3 có boSung ⇒ chạy lại cửa ① qua, TẠO được đơn" "$(echo "${KQ5C}" | cut -d'|' -f4)" "true"
bang "⑤c4 POST đúng 1 lượt" "$(echo "${KQ5C}" | cut -d'|' -f5)" "1"
bang "⑤c5 payload mang SĐT sale vừa bổ sung" "$(echo "${KQ5C}" | cut -d'|' -f6)" "+971500009999"

# ═══ ⑥ — LOẠI + duyệt sau loại ═════════════════════════════════════════════════
muc "⑥ LOẠI — đóng + lý do + nhat_ky · duyet SAU loai ⇒ chặn (trạng thái dòng)"
KQ6="$(nodex "${HELPER}"'
const { vaoHangCho, duyet, loai, docHangCho } = await import("./src/orders/hang-cho.js");
const { ctxHeThong } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const n = await nen(pool);
  await themGiaCho(pool, n.team, n.page);
  const a = await dungDong(pool, ctxHeThong, vaoHangCho, n, { psid: "gate6", tinId: 100081 });
  const ra = await loai(pool, ctxHeThong(), { hangChoId: a.hangChoId, teamId: n.team,
    lyDo: "khách nhắn lại là không mua nữa" });
  const nk = (await pool.query(
    "SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong = $1 AND doi_tuong_id = $2",
    ["hang_cho_loai", String(a.hangChoId)])).rows[0].c;
  const nap = napGia();
  let ten = "KHONG-NEM";
  try { await duyet(pool, ctxHeThong(), { hangChoId: a.hangChoId, teamId: n.team }, { env: MO, nap }); }
  catch (e) { ten = e.name + ":" + e.trangThai; }
  const con = (await pool.query("SELECT count(*)::int c FROM hang_cho_tao_don WHERE id = $1", [a.hangChoId])).rows[0].c;
  console.log([ra.dong.trang_thai, ra.dong.cua_kiem.ket_thuc.ly_do, nk, ten, nap.post, con].join("|"));
});')"
so "kết quả ⑥ (trạng thái|lý do|nhat_ky|lỗi duyệt|POST|dòng còn lại)" "${KQ6}"
bang "⑥a loai ⇒ trang_thai = tu_choi" "$(echo "${KQ6}" | cut -d'|' -f1)" "tu_choi"
bang "⑥b lý do giữ NGUYÊN VĂN" "$(echo "${KQ6}" | cut -d'|' -f2)" "khách nhắn lại là không mua nữa"
bang "⑥c ghi nhat_ky đúng 1 dòng" "$(echo "${KQ6}" | cut -d'|' -f3)" "1"
bang "⑥d duyet SAU loai bị chặn (đọc được trạng thái)" "$(echo "${KQ6}" | cut -d'|' -f4)" \
  "LoiHangChoDaXuLy:tu_choi"
bang "⑥e KHÔNG bắn POST" "$(echo "${KQ6}" | cut -d'|' -f5)" "0"
bang "⑥f dòng KHÔNG bị xoá (luật 2 §0a)" "$(echo "${KQ6}" | cut -d'|' -f6)" "1"

# ═══ ⑦ — BỘ CA + HỒI QUY ═══════════════════════════════════════════════════════
muc "⑦ node --test bộ l3-m4 + hồi quy l3-m1/l3-m2/l3-m3/l2-m1 KHÔNG gãy"
TEST_OUT="$(DATABASE_URL_V3="${URL_DEV}" node --test --experimental-test-module-mocks \
  test/l3-m4-hang-cho.test.js test/l3-m4-duyet.test.js \
  test/l3-m1-may-trang-thai.test.js test/l3-m1-quet-don.test.js \
  test/l3-m2-loc-trung.test.js test/l3-m2-ti-le-hoan.test.js \
  test/l3-m3-doc-y.test.js test/l3-m3-lich-nhac.test.js test/l3-m3-nhan-phan-hoi-wa.test.js \
  test/l2-m1-hang-doi.test.js test/l2-m1-nhac-truong.test.js 2>&1)"
RC_TEST=$?   # ← ĐỌC NGAY sau node --test (án lệ l2-m3 §9: đọc sau lệnh in ra rc=0 GIẢ)
TPASS="$(echo "${TEST_OUT}" | grep -E '^ℹ pass ' | grep -oE '[0-9]+' | head -1)"
TFAIL="$(echo "${TEST_OUT}" | grep -E '^ℹ fail ' | grep -oE '[0-9]+' | head -1)"
so "⑦a ca xanh / đỏ (l3-m4 + hồi quy l3-m1·m2·m3 + l2-m1)" "${TPASS:-?} / ${TFAIL:-?} · rc=${RC_TEST}"
bang "⑦a bộ ca gộp đỏ" "${TFAIL:-LOI-NODE}" "0"
if [ "${TFAIL:-1}" != "0" ]; then
  echo "${TEST_OUT}" | sed -n '/failing tests:/,$p' | grep '^✖' | head -10
fi

# ⑦b — CSDL DEV còn nguyên (phiếu này chỉ ĐỌC dev ở phép ③b)
DEV_SAU="$(DATABASE_URL_V3="${URL_DEV}" nodex '
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const r = await pool.query("SELECT (SELECT count(*) FROM hang_cho_tao_don)::int h, (SELECT count(*) FROM don_hang)::int d, (SELECT count(*) FROM khach)::int k");
  console.log(r.rows[0].h + "|" + r.rows[0].d + "|" + r.rows[0].k);
});')"
so "⑦b DEV ${URL_DEV##*/} — hàng chờ | đơn | khách" "${DEV_SAU}"
bang "⑦b dev hang_cho_tao_don còn 0 dòng (phiếu KHÔNG ghi vào dev)" "$(echo "${DEV_SAU}" | cut -d'|' -f1)" "0"

# ═══ ⑧ — PHÉP THẬT CÒN HOÃN ════════════════════════════════════════════════════
muc "⑧ Phép cần THẾ GIỚI THẬT — hoãn minh bạch, không giả xanh"
hoan "TẠO ĐƠN THẬT trên POS (§7b **T7**) — cần V3_POS_GHI=1 + người chọn shop ít dùng nhất; đơn nháp đánh dấu TEST để NGUYÊN (luật 2 cấm xoá)"
so   "V3_POS_GHI trên máy này (fail-closed đo được)" "${V3_POS_GHI:-(vắng)}"

printf '\n═══ TỔNG: %d phép · %d ĐỎ · %d HOÃN ═══\n' "${PHEP}" "${LOI}" "${HOAN}"
[ "${LOI}" -eq 0 ] || exit 1
exit 0
