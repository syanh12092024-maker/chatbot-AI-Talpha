#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU L0-M2 — tầng truy vấn tự chèn điều kiện team, thiếu bối cảnh
# → NÉM LỖI. Thi hành đúng 8 phép của ④ trong docs/thi-cong/phieu/PHIEU-L0-M2.md.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT DIFF DANH SÁCH. Không có dòng nào chỉ nói
#       "chạy xong không lỗi".
#
# Cổng TỰ DỰNG CSDL sandbox `aicloser_v3_nt_l0m2` từ khuôn trần rồi TỰ DỌN — không đo
# trên CSDL dev đang có thợ khác dùng (luật 11 sổ điều hành), không phụ thuộc trạng
# thái tay của thợ. Cùng khuôn với `ops/bin/nghiem-thu/l0-m1.sh` (cố ý — hai cổng phải
# đọc giống nhau để TỔNG không phải học lại cách đọc cổng mỗi phiếu).
#
#   bash ops/bin/nghiem-thu/l0-m2.sh                # chạy đủ 8 phép
#   GIU_SANDBOX=1 bash ops/bin/nghiem-thu/l0-m2.sh  # giữ CSDL lại để soi tay
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

DB="aicloser_v3_nt_l0m2"
LOI=0
PHEP=0

# ── khung in ─────────────────────────────────────────────────────────────────
muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-58s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP + 1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP + 1)); LOI=$((LOI + 1)); printf '   ✘ %s\n' "$1"; }
bang() {
  so "$1" "$2"
  case "$2" in
    *LOI-NODE*) truot "$1: câu đo HỎNG (LOI-NODE) — không đọc là đạt"; return ;;
  esac
  if [ "$2" = "$3" ]; then dat "$1 = $3"; else truot "$1: thật=$2 · chờ=$3"; fi
}

# Chạy một khối node -e; in đúng NỘI DUNG stdout, hoặc chuỗi cố định "LOI-NODE" khi rc≠0
# — KHÔNG in nguyên văn lỗi (hai lượt cùng hỏng ra hai chuỗi BẰNG NHAU thì phép so đọc
# nhầm thành ĐẠT, án lệ giống hệt `psqlx` của l0-m1.sh).
nodex() {
  local out
  if out="$(node -e "$1" 2>/tmp/l0m2-node-err.txt)"; then
    printf '%s' "${out}"
  else
    printf 'LOI-NODE'
  fi
}

# ── dựng sandbox ─────────────────────────────────────────────────────────────
# ⚠️ SỬA 25/08 (G2-A1): khối này TỪNG gọi `docker exec talpha-pg`. Đo lại thì KHÔNG NƠI
# NÀO còn container đó — máy dev không có docker, VPS chạy Postgres cài thẳng. Cổng đã
# chết câm `exit 2` từ lúc nào không ai biết, tức là mọi lượt «chạy lại cổng L0-M2» sau
# đó đều không đo gì. Nay dựng/dọn bằng chính gói `pg` của repo: không phụ thuộc CSDL
# được cài kiểu gì, chạy ở đâu có `DATABASE_URL_V3` là chạy (án lệ #28).
GOC_URL="$(node -e 'const {chuoiNoi}=await import("./db/ket-noi.js");console.log(chuoiNoi());')"
if [ -z "${GOC_URL}" ]; then
  echo "✘ không đọc được DATABASE_URL_V3 — cổng không đo được"; exit 2
fi

quanly() { # $1 = câu SQL chạy trên CSDL `postgres` của cùng máy chủ
  node -e '
    const pg = (await import("pg")).default;
    const u = new URL(process.argv[1]); u.pathname = "/postgres";
    const p = new pg.Pool({ connectionString: u.toString(), max: 1 });
    try { await p.query(process.argv[2]); } finally { await p.end(); }
  ' "${GOC_URL}" "$1"
}

quanly "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1
if ! quanly "CREATE DATABASE ${DB}" >/dev/null 2>&1; then
  echo "✘ không tạo được CSDL sandbox ${DB} — cổng dừng."
  echo "  (vai CSDL trong DATABASE_URL_V3 đã có quyền CREATEDB chưa?)"; exit 2
fi

DATABASE_URL_V3="$(node -e '
const u = new URL(process.argv[1]); u.pathname = "/" + process.argv[2]; console.log(u.toString());
' "${GOC_URL}" "${DB}")"
export DATABASE_URL_V3
V3_KHOA_MA_HOA="$(node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))')"
export V3_KHOA_MA_HOA

don_dep() {
  if [ "${GIU_SANDBOX:-0}" = "1" ]; then
    printf '\n(giữ lại CSDL %s theo GIU_SANDBOX=1)\n' "${DB}"
  else
    quanly "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1
  fi
}
trap don_dep EXIT

echo "CỔNG NGHIỆM THU L0-M2 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo: ${DB} (sandbox, không phải aicloser_v3) · máy chủ $(node -e '
  console.log(new URL(process.argv[1]).host)' "${GOC_URL}")"

node db/migrate.js >/dev/null 2>&1

# ═══ ① ctx THIẾU → ném đúng lỗi có tên ═══════════════════════════════════════
muc "① gọi layNhieu KHÔNG ctx → ném đúng lỗi có tên"
TEN_LOI1="$(nodex '
const { layNhieu } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  try { await layNhieu(pool, undefined, "khach"); console.log("KHONG-NEM-LOI"); }
  catch (e) { console.log(e.name); }
});')"
bang "tên lỗi bắt được (ctx=undefined)" "${TEN_LOI1}" "LoiThieuBoiCanhTeam"

# ═══ ② CHỐNG ĐẠT RỖNG — chèn mẩu TRỘN ≥2 team rồi đo cách ly bằng DANH SÁCH id ═══
muc "② chống ĐẠT RỖNG — chèn mẩu trộn ≥2 team, đo cách ly bằng DANH SÁCH id (không phải count)"
KQ2="$(nodex '
const { themMoi, layNhieu } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const tid = async (slug) => (await pool.query("SELECT id FROM team WHERE slug=$1",[slug])).rows[0].id;
  const tA = await tid("tieu-alpha"), tB = await tid("auus");
  const ctxA = { teamId: tA, nguoiDungId: null }, ctxB = { teamId: tB, nguoiDungId: null };
  const a1 = await themMoi(pool, ctxA, "khach", { ten: "NT-A1" });
  const a2 = await themMoi(pool, ctxA, "khach", { ten: "NT-A2" });
  const b1 = await themMoi(pool, ctxB, "khach", { ten: "NT-B1" });
  const soA = (await layNhieu(pool, ctxA, "khach")).map(r=>r.id).sort().join(",");
  const soB = (await layNhieu(pool, ctxB, "khach")).map(r=>r.id).sort().join(",");
  const chenA = [a1.id,a2.id].sort().join(",");
  console.log(`${soA}|${soB}|${chenA}|${b1.id}`);
});')"
IFS='|' read -r THAY_A THAY_B DA_CHEN_A ID_B <<< "${KQ2}"
so "chèn cho tieu-alpha (id)" "${DA_CHEN_A}"
so "ctx tieu-alpha đọc lại (id)" "${THAY_A}"
bang "danh sách ĐỌC = danh sách ĐÃ CHÈN (tieu-alpha)" "${THAY_A}" "${DA_CHEN_A}"
so "ctx auus đọc lại (id)" "${THAY_B}"
bang "danh sách ĐỌC = danh sách ĐÃ CHÈN (auus, đúng 1 dòng)" "${THAY_B}" "${ID_B}"
case ",${THAY_A}," in
  *",${ID_B},"*) truot "tieu-alpha LẪN dòng của auus (id ${ID_B})" ;;
  *) dat "tieu-alpha KHÔNG lẫn dòng của auus" ;;
esac

# ═══ ③ truyền tay team_id khác trong tham số/filter → CHẶN + nhat_ky +1 ═════════
muc "③ truyền tay team_id KHÁC ctx trong filter/tham số → CHẶN (lỗi có tên) + nhat_ky +1"
KQ3="$(nodex '
const { layNhieu, themMoi, LoiXuyenTeam } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const tid = async (slug) => (await pool.query("SELECT id FROM team WHERE slug=$1",[slug])).rows[0].id;
  const tA = await tid("tieu-alpha"), tB = await tid("auus");
  const ctxA = { teamId: tA, nguoiDungId: null };
  const dem = async () => Number((await pool.query("SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong=$1",["chan_xuyen_team"])).rows[0].c);
  const truoc = await dem();
  let tenLoiDoc = "KHONG-NEM-LOI";
  try { await layNhieu(pool, ctxA, "khach", { dieuKien: { team_id: tB } }); }
  catch (e) { tenLoiDoc = e instanceof LoiXuyenTeam ? e.name : `SAI-LOAI:${e.name}`; }
  const giua = await dem();
  let tenLoiGhi = "KHONG-NEM-LOI";
  try { await themMoi(pool, ctxA, "khach", { team_id: tB, ten: "hack" }); }
  catch (e) { tenLoiGhi = e instanceof LoiXuyenTeam ? e.name : `SAI-LOAI:${e.name}`; }
  const sau = await dem();
  console.log(`${tenLoiDoc}|${tenLoiGhi}|${truoc}|${giua}|${sau}`);
});')"
IFS='|' read -r TEN_LOI_DOC TEN_LOI_GHI DEM_TRUOC DEM_GIUA DEM_SAU <<< "${KQ3}"
bang "ĐỌC bị chặn — tên lỗi" "${TEN_LOI_DOC}" "LoiXuyenTeam"
bang "GHI bị chặn — tên lỗi" "${TEN_LOI_GHI}" "LoiXuyenTeam"
so "nhat_ky(chan_xuyen_team) trước→giữa→sau" "${DEM_TRUOC}→${DEM_GIUA}→${DEM_SAU}"
bang "nhat_ky +1 sau lượt ĐỌC bị chặn" "$((DEM_GIUA - DEM_TRUOC))" "1"
bang "nhat_ky +1 sau lượt GHI bị chặn" "$((DEM_SAU - DEM_GIUA))" "1"

# ═══ ④ ctx trỏ team la_ky_thuat (chua-phan) → ném lỗi (rào N2 phía đọc) ═════════
muc "④ ctx.teamId = team KỸ THUẬT (chua-phan) → ném lỗi (rào N2)"
TEN_LOI4="$(nodex '
const { layNhieu } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["chua-phan"])).rows[0].id;
  try { await layNhieu(pool, { teamId: t, nguoiDungId: null }, "khach"); console.log("KHONG-NEM-LOI"); }
  catch (e) { console.log(e.name); }
});')"
bang "tên lỗi bắt được (ctx=chua-phan)" "${TEN_LOI4}" "LoiThieuBoiCanhTeam"

# ═══ ⑤ bo_luat_chung — (team_id = $ctx OR team_id IS NULL) ═════════════════════
muc "⑤ hợp đồng đọc bo_luat_chung: (team_id = \$ctx OR team_id IS NULL)"
KQ5="$(nodex '
const { themMoi, layNhieu } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const tid = async (slug) => (await pool.query("SELECT id FROM team WHERE slug=$1",[slug])).rows[0].id;
  const tA = await tid("tieu-alpha"), tB = await tid("auus"), tC = await tid("pialpha-eu");
  await pool.query("INSERT INTO bo_luat_chung (team_id, noi_dung) VALUES (NULL,$1)", ["toan he"]);
  await themMoi(pool, { teamId: tA, nguoiDungId: null }, "bo_luat_chung", { noi_dung: "rieng A" });
  const n = async (id) => (await layNhieu(pool, { teamId: id, nguoiDungId: null }, "bo_luat_chung")).length;
  console.log(`${await n(tA)}|${await n(tB)}|${await n(tC)}`);
});')"
IFS='|' read -r N_A N_B N_C <<< "${KQ5}"
bang "ctx tieu-alpha thấy" "${N_A}" "2"
bang "ctx auus thấy" "${N_B}" "1"
bang "ctx pialpha-eu thấy" "${N_C}" "1"

# ═══ ⑥ picker team — đúng 3 slug nghiệp vụ, KHÔNG có chua-phan ═════════════════
muc "⑥ layDanhSachTeamChon → đúng 3 slug nghiệp vụ, không có chua-phan"
DS6="$(nodex '
const { layDanhSachTeamChon } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const ds = await layDanhSachTeamChon(pool);
  console.log(ds.map(t=>t.slug).sort().join(","));
});')"
bang "danh sách slug picker" "${DS6}" "auus,pialpha-eu,tieu-alpha"

# ═══ ⑦ ctxHeThong — một lượt gọi ghi nhat_ky (count trước/sau lệch 1) ══════════
muc "⑦ ctxHeThong(): một lượt gọi → nhat_ky đúng +1 (máy làm cũng ghi, 01 §9)"
KQ7="$(nodex '
const { themMoi, ctxHeThong } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const dem = async () => Number((await pool.query("SELECT count(*)::int c FROM nhat_ky")).rows[0].c);
  const truoc = await dem();
  await themMoi(pool, ctxHeThong(), "khach", { team_id: t, ten: "he-thong" });
  const sau = await dem();
  console.log(`${truoc}|${sau}`);
});')"
IFS='|' read -r HT_TRUOC HT_SAU <<< "${KQ7}"
so "nhat_ky trước→sau" "${HT_TRUOC}→${HT_SAU}"
bang "nhat_ky +1 sau đúng 1 lượt gọi ctxHeThong" "$((HT_SAU - HT_TRUOC))" "1"

# ═══ ⑧ TEST — test cũ + l0-m1 + l0-m2 ═══════════════════════════════════════
muc "⑧ npm test xanh toàn bộ (test cũ + l0-m1 + l0-m2)"
so "node --version" "$(node --version)"
# ⚠️ `node --test test/` KHÔNG chạy được trên Node v25 (nhận thư mục làm tệp mở đầu) —
#    kế thừa nguyên vá của l0-m1.sh: gọi thẳng glob tệp, không gọi bare `test/`.
if node --test test/l0-m1-*.test.js test/l0-m2-*.test.js >/tmp/l0m2-test-moi.txt 2>&1; then
  dat "bộ ca l0-m1 + l0-m2: $(grep -c '^✔' /tmp/l0m2-test-moi.txt) xanh / 0 đỏ"
else
  truot "bộ ca l0-m1 + l0-m2 có ca đỏ:"; grep -E '^✖|not ok' /tmp/l0m2-test-moi.txt | head -10
fi
# Bộ ca CŨ (bản đang chạy) — cùng vá CONV_STATE_FILE tạm như l0-m1.sh, cùng lý do
# (test cũ ghi thẳng vào conv-state.json thật ở gốc repo — nợ §9, không phải việc phiếu này).
TMP_CONV="$(mktemp -d)"
PASS=0; FAIL=0; DO_LIST=""
for f in test/*.test.mjs; do
  if CONV_STATE_FILE="${TMP_CONV}/conv-state.json" node --test "${f}" >/dev/null 2>&1; then
    PASS=$((PASS + 1))
  else FAIL=$((FAIL + 1)); DO_LIST="${DO_LIST} $(basename "${f}")"; fi
done
rm -rf "${TMP_CONV}"
so "bộ ca CŨ (bản đang chạy): tệp xanh / đỏ" "${PASS} / ${FAIL}"
so "tệp cũ ĐỎ" "${DO_LIST:-(không)}"
# ⚠️ SỬA 25/08 (G2-A1): mốc nền cũ là DANH SÁCH GÕ TAY 5 tệp «đã đỏ sẵn ở base 3d1eed1»
# — `conv-owner · guard-fastlane · intro · l8-botcake-rules · viec-2345`. Đo lại 25/08 thì
# CẢ NĂM ĐỀU XANH, ở CẢ HAI môi trường: máy cá nhân (.env 17 khoá) 5/5 xanh, VPS (.env rút
# gọn 3 biến) 23/23 tệp xanh. Chúng được vá ở đâu đó sau base mà không ai sửa mốc ⇒ cổng
# TRƯỢT mỗi khi mã nguồn TỐT LÊN, và vì cổng còn chết ở khối docker phía trên nên chưa ai
# thấy. Danh sách gõ tay là lỗ hẹn giờ (án lệ #22) — thay bằng luật tự bảo trì: KHÔNG tệp
# nào được đỏ. Thêm một tệp đỏ là cổng đỏ, không phải sửa mốc nữa.
if [ "${FAIL}" -eq 0 ]; then
  dat "bộ ca cũ: 0 tệp đỏ trên ${PASS} tệp"
else
  truot "bộ ca cũ có tệp ĐỎ (${FAIL}/$((PASS + FAIL))):${DO_LIST}"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# PHIEU-B-Y1 — bốn phép mới. Mỗi phép in MỘT CON SỐ, và phép ⑨ có CỔNG THỨ HAI:
# cùng câu đo, bỏ `neu` ra thì kết quả phải ĐẢO CHIỀU. Không có vế đảo chiều thì
# «1 lượt thắng» có thể xanh vì hàng đợi kết nối chứ không vì so-và-đặt (án lệ #19).
# ═══════════════════════════════════════════════════════════════════════════════
muc "⑨ SO-VÀ-ĐẶT — 4 lượt «Nhận việc» ĐỒNG THỜI trên MỘT dòng viec_can_xu_ly"
KQ9="$(nodex '
const { themMoi, suaTheoId } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const tA = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const ctx = { teamId: tA, nguoiDungId: null };
  const pg1 = (await pool.query("INSERT INTO page (team_id,page_id,ten) VALUES ($1,$2,$3) RETURNING id",
    [tA, "nt-y1-page", "NT Y1"])).rows[0];
  const ht = await themMoi(pool, ctx, "hoi_thoai",
    { page_id: pg1.id, psid: "nt-y1-psid", trang_thai: "GREET", chu_so_huu: "AI" });
  const sale = [];
  for (let i = 1; i <= 4; i++)
    sale.push((await pool.query("INSERT INTO nguoi_dung (email,ten) VALUES ($1,$2) RETURNING id",
      [`nt-y1-sale${i}@t.test`, `S${i}`])).rows[0].id);
  const moiViec = async () => themMoi(pool, ctx, "viec_can_xu_ly",
    { loai: "hoi_thoai", hoi_thoai_id: ht.id, ly_do_day: "nt", han_luc: new Date(Date.now()+6e5) });
  const dua = async (viecId, coNeu) => (await Promise.all(sale.map((u) =>
    suaTheoId(pool, ctx, "viec_can_xu_ly", viecId, { nguoi_nhan_id: u, nhan_luc: new Date() },
      coNeu ? { neu: { nguoi_nhan_id: null } } : {})))).filter(Boolean).length;
  const co  = await dua((await moiViec()).id, true);
  const khg = await dua((await moiViec()).id, false);
  console.log(`${co}|${khg}`);
});')"
IFS='|' read -r Y1_CO Y1_KHONG <<< "${KQ9}"
bang "số lượt THẮNG khi CÓ neu (chờ đúng 1)" "${Y1_CO}" "1"
bang "số lượt THẮNG khi BỎ neu — vế đảo chiều" "${Y1_KHONG}" "4"

muc "⑩ neu không khớp → null (không ném) · tên cột rác → Error và 0 lượt chạm CSDL"
KQ10="$(nodex '
const { suaTheoId } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const tA = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const ctx = { teamId: tA, nguoiDungId: null };
  const kh = (await pool.query("INSERT INTO khach (team_id,ten) VALUES ($1,$2) RETURNING id",
    [tA, "NT-Y1-khach"])).rows[0];
  const truot = await suaTheoId(pool, ctx, "khach", kh.id, { ten: "moi" },
    { neu: { ten: "khong-phai-ten-nay" } });
  let dem = 0;
  const poolDem = { query: (...a) => { dem += 1; return pool.query(...a); } };
  let ten = "KHONG-NEM";
  try { await suaTheoId(poolDem, ctx, "khach", kh.id, { ten: "x" }, { neu: { "a b": 1 } }); }
  catch (e) { ten = e.constructor.name; }
  console.log(`${truot === null ? "null" : "CO-DONG"}|${ten}|${dem}`);
});')"
IFS='|' read -r Y1_TRUOT Y1_LOICOT Y1_DEM <<< "${KQ10}"
bang "neu không khớp trả về" "${Y1_TRUOT}" "null"
bang "tên cột rác ném loại lỗi" "${Y1_LOICOT}" "Error"
bang "số lượt chạm CSDL khi tên cột rác" "${Y1_DEM}" "0"

muc "⑪ layNhieu nhận MẢNG — đọc gom id không còn phải kéo trọn bảng"
KQ11="$(nodex '
const { themMoi, layNhieu } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const tid = async (sl) => (await pool.query("SELECT id FROM team WHERE slug=$1",[sl])).rows[0].id;
  const tA = await tid("tieu-alpha"), tB = await tid("auus");
  const ctxA = { teamId: tA, nguoiDungId: null }, ctxB = { teamId: tB, nguoiDungId: null };
  const a = [];
  for (let i = 0; i < 5; i++) a.push(await themMoi(pool, ctxA, "khach", { ten: `NT-Y1-M${i}` }));
  const b1 = await themMoi(pool, ctxB, "khach", { ten: "NT-Y1-B" });
  const chon = [a[0].id, a[2].id, a[4].id];
  const ra = (await layNhieu(pool, ctxA, "khach", { dieuKien: { id: chon } })).map(r=>String(r.id)).sort();
  const rong = await layNhieu(pool, ctxA, "khach", { dieuKien: { id: [] } });
  const cheo = await layNhieu(pool, ctxA, "khach", { dieuKien: { id: [b1.id] } });
  console.log(`${ra.join(",")}|${chon.map(String).sort().join(",")}|${rong.length}|${cheo.length}`);
});')"
IFS='|' read -r Y1_RA Y1_XIN Y1_RONG Y1_CHEO <<< "${KQ11}"
bang "DANH SÁCH id đọc bằng mảng khớp danh sách xin" "${Y1_RA}" "${Y1_XIN}"
bang "mảng RỖNG → số dòng" "${Y1_RONG}" "0"
bang "mảng chứa id team KHÁC → số dòng" "${Y1_CHEO}" "0"

muc "⑫ suaTheoId nhận ctxHeThong — job nền sửa được, và MỌI lượt ghi nhat_ky"
KQ12="$(nodex '
const { themMoi, suaTheoId, ctxHeThong } = await import("./src/db/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const tA = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const dem = async () => (await pool.query("SELECT count(*)::int c FROM nhat_ky")).rows[0].c;
  const kh = await themMoi(pool, ctxHeThong(), "khach", { team_id: tA, ten: "NT-Y1-nen" });
  let thieu = "KHONG-NEM";
  try { await suaTheoId(pool, ctxHeThong(), "khach", kh.id, { ten: "x" }); }
  catch (e) { thieu = e.name; }
  const truoc = await dem();
  const ok = await suaTheoId(pool, ctxHeThong(), "khach", kh.id, { team_id: tA, ten: "da-sua-nen" });
  const sau = await dem();
  console.log(`${thieu}|${ok ? ok.ten : "null"}|${sau - truoc}`);
});')"
IFS='|' read -r Y1_THIEU Y1_TEN Y1_NK <<< "${KQ12}"
bang "ctxHeThong THIẾU team_id → tên lỗi" "${Y1_THIEU}" "LoiThieuBoiCanhTeam"
bang "ctxHeThong CÓ team_id → giá trị đã sửa" "${Y1_TEN}" "da-sua-nen"
bang "số dòng nhat_ky đẻ ra bởi 1 lượt sửa nền" "${Y1_NK}" "1"

# ── tổng ─────────────────────────────────────────────────────────────────────
printf '\n═══════════════════════════════════════════════════════════════\n'
printf 'TỔNG: %d phép · ĐẠT %d · TRƯỢT %d\n' "${PHEP}" "$((PHEP - LOI))" "${LOI}"
[ "${LOI}" -eq 0 ] && exit 0 || exit 1
