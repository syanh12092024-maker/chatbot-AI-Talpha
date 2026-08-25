#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU G2-A4 — phiên bản · duyệt · đo ảnh hưởng cho bộ luật chung và kỹ năng.
#
# Bộ luật chung là 2.256 token dùng chung. Cổng này canh ba câu của sổ giao việc:
#   ① sửa KHÔNG áp ngay          ② nói được bao nhiêu page bị chạm TRƯỚC khi bấm
#   ③ lùi được, và có nhật ký
# …cộng hai rào mà chỉ tầng dữ liệu dựng được: MỘT bản đang áp, và áp là MỘT giao dịch.
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

DB="aicloser_v3_nt_g2a4"
LOI=0; PHEP=0
muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-58s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP + 1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP + 1)); LOI=$((LOI + 1)); printf '   ✘ %s\n' "$1"; }
bang() {
  so "$1" "$2"
  case "$2" in *LOI-NODE*) truot "$1: câu đo HỎNG — không đọc là đạt"; return ;; esac
  if [ "$2" = "$3" ]; then dat "$1 = $3"; else truot "$1: thật=$2 · chờ=$3"; fi
}
nodex() {
  local out
  if out="$(node -e "$1" 2>/tmp/g2a4-err.txt)"; then printf '%s' "${out}"; else printf 'LOI-NODE'; fi
}

GOC_URL="$(node -e 'const {chuoiNoi}=await import("./db/ket-noi.js");console.log(chuoiNoi());')"
[ -z "${GOC_URL}" ] && { echo "✘ thiếu DATABASE_URL_V3"; exit 2; }
quanly() {
  node -e '
    const pg = (await import("pg")).default;
    const u = new URL(process.argv[1]); u.pathname = "/postgres";
    const p = new pg.Pool({ connectionString: u.toString(), max: 1 });
    try { await p.query(process.argv[2]); } finally { await p.end(); }
  ' "${GOC_URL}" "$1"
}
URL_THAT="${GOC_URL}"
quanly "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1
quanly "CREATE DATABASE ${DB}" >/dev/null 2>&1 || { echo "✘ không tạo được ${DB}"; exit 2; }
DATABASE_URL_V3="$(node -e '
const u = new URL(process.argv[1]); u.pathname = "/" + process.argv[2]; console.log(u.toString());
' "${GOC_URL}" "${DB}")"
export DATABASE_URL_V3
don_dep() {
  [ "${GIU_SANDBOX:-0}" = "1" ] && { printf '\n(giữ %s)\n' "${DB}"; return; }
  quanly "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1
}
trap don_dep EXIT

echo "CỔNG NGHIỆM THU G2-A4 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo: ${DB} (sandbox) · máy chủ $(node -e 'console.log(new URL(process.argv[1]).host)' "${GOC_URL}")"
node db/migrate.js >/dev/null 2>&1

muc "① migration 009 lên/xuống — và LƯỢC ĐỒ khớp sau round-trip"
CHUP="SELECT count(*)||':'||md5(string_agg(
        table_name||'.'||column_name||':'||data_type, ',' ORDER BY table_name, column_name))
      FROM information_schema.columns WHERE table_schema='public'"
psqlx() {
  node -e '
    const pg = (await import("pg")).default;
    const p = new pg.Pool({ connectionString: process.env.DATABASE_URL_V3, max: 1 });
    try { const r = await p.query(process.argv[1]);
      console.log(r.rows.map(o => Object.values(o).join("|")).join("\n"));
    } finally { await p.end(); }' "$1" 2>/dev/null || printf 'LOI-NODE'
}
LD1="$(psqlx "${CHUP}")"
node db/migrate.js down >/dev/null 2>&1
node db/migrate.js      >/dev/null 2>&1
LD2="$(psqlx "${CHUP}")"
SO_COT="${LD1%%:*}"
if [ -n "${SO_COT}" ] && [ "${SO_COT}" -ge 100 ] 2>/dev/null; then
  dat "vân tay lược đồ đếm ${SO_COT} cột (thước có đo thật)"
else
  truot "vân tay đếm ${SO_COT:-0} cột — THƯỚC RỖNG"
fi
bang "lược đồ trước ↔ sau round-trip 009" "${LD2}" "${LD1}"

muc "② RF-17 — trạng thái «hai bản cùng đang áp» KHÔNG tồn tại được"
KQ2="$(nodex '
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (p) => {
  const t = (await p.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  await p.query(`INSERT INTO bo_luat_chung (team_id,phien_ban,noi_dung,dang_dung,nguoi_sua)
                 VALUES ($1,1,$2,true,$3)`, [t, "A\nB\nC", "cong"]);
  await p.query(`INSERT INTO bo_luat_chung (team_id,phien_ban,noi_dung,dang_dung,nguoi_sua)
                 VALUES ($1,2,$2,false,$3)`, [t, "A\nB2\nD", "cong"]);
  let ma = "LOT";
  try { await p.query("UPDATE bo_luat_chung SET dang_dung=true WHERE team_id=$1 AND phien_ban=2",[t]); }
  catch (e) { ma = e.constraint || "co-chan"; }
  const dem = (await p.query("SELECT count(*)::int c FROM bo_luat_chung WHERE team_id=$1 AND dang_dung",[t])).rows[0].c;
  console.log(`${ma}|${dem}`);
});')"
IFS='|' read -r A4_CHAN A4_DEM <<< "${KQ2}"
bang "ghi thẳng bản thứ hai dang_dung=true" "${A4_CHAN}" "bo_luat_chung_mot_ban_dang_ap"
bang "số bản đang áp sau lượt bị chặn" "${A4_DEM}" "1"

muc "③ sửa KHÔNG áp ngay · bốn mắt · AI phải duyệt · áp/lùi · ảnh hưởng"
KQ3="$(nodex '
const { voiPool } = await import("./db/ket-noi.js");
const M = await import("./src/db/index.js");
await voiPool(async (p) => {
  const t = (await p.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const nguoi = async (e, v) => {
    const id = (await p.query("INSERT INTO nguoi_dung (email,ten) VALUES ($1,$1) RETURNING id",[e])).rows[0].id;
    await p.query(`INSERT INTO thanh_vien_team (team_id,nguoi_dung_id,vai_id)
                   SELECT $1,$2,v.id FROM vai v WHERE v.ma=$3`,[t,id,v]);
    return id;
  };
  const a = await nguoi("nt-soan@t.test","quan-tri"), b = await nguoi("nt-duyet@t.test","quan-tri");
  const cx = { teamId: t, nguoiDungId: a }, cy = { teamId: t, nguoiDungId: b };
  await p.query("INSERT INTO page (team_id,page_id,ten,bot_ai_bat) VALUES ($1,$2,$3,true)",[t,"fb-nt-a4","P"]);

  const dangApTruoc = (await p.query("SELECT phien_ban FROM bo_luat_chung WHERE team_id=$1 AND dang_dung",[t])).rows[0].phien_ban;
  const moi = await M.taoBanBoLuat(p, cx, { noiDung: "A\nB3\nE", ghiChu: "cổng" });
  const dangApSau = (await p.query("SELECT phien_ban FROM bo_luat_chung WHERE team_id=$1 AND dang_dung",[t])).rows[0].phien_ban;

  let tuDuyet = "LOT";
  try { await M.duyetBoLuat(p, cx, { id: moi.id }); } catch (e) { tuDuyet = e.name; }
  const ai = await M.taoBanBoLuat(p, cx, { noiDung: "AI soan", nguon: "ai" });
  let aiChuaDuyet = "LOT";
  try { await M.apBoLuat(p, cy, { id: ai.id }); } catch (e) { aiChuaDuyet = "bi-chan"; }

  const kq = await M.apBoLuat(p, cy, { id: moi.id, lyDo: "cổng" });
  const v1 = (await p.query("SELECT id FROM bo_luat_chung WHERE team_id=$1 AND phien_ban=1",[t])).rows[0].id;
  const lui = await M.apBoLuat(p, cy, { id: v1, lyDo: "lùi" });
  const nk = (await p.query("SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong=$1",["ap_bo_luat"])).rows[0].c;
  console.log([
    String(dangApTruoc) === String(dangApSau) ? "KHONG-DOI" : "DA-DOI",
    tuDuyet, aiChuaDuyet,
    kq.anhHuong.soPageDangBatBot, kq.laLui ? "lui" : "tien", lui.laLui ? "lui" : "tien", nk,
  ].join("|"));
});')"
IFS='|' read -r A4_TAO A4_TUDUYET A4_AI A4_AH A4_L1 A4_L2 A4_NK <<< "${KQ3}"
bang "tạo bản mới → bản đang áp" "${A4_TAO}" "KHONG-DOI"
bang "người soạn tự duyệt bản mình" "${A4_TUDUYET}" "LoiXuyenTeam"
bang "áp bản AI chưa duyệt" "${A4_AI}" "bi-chan"
bang "số page ĐANG BẬT BOT bị chạm, trả về lúc áp" "${A4_AH}" "1"
bang "lượt áp tiến / lượt áp lùi" "${A4_L1}/${A4_L2}" "tien/lui"
bang "số dòng nhật ký ap_bo_luat" "${A4_NK}" "2"

muc "④ phép ĐẾM ảnh hưởng khớp BỘ ĐỌC PROMPT thật — trên CSDL THẬT, chỉ đọc"
# Câu «bao nhiêu page bị chạm» chỉ đúng nếu nó dùng ĐÚNG luật bộ ráp prompt dùng lúc chạy.
# Đo bằng cách chạy CẢ HAI vị từ trên TỪNG page của CSDL thật rồi so danh sách — không so
# hai công thức trên giấy.
LECH="$(DATABASE_URL_V3="${URL_THAT}" nodex '
const { taoPool } = await import("./db/ket-noi.js");
const { docKyNang } = await import("./src/chat/rap-prompt.js");
const pool = taoPool();
try {
  const cu = (r, ds) => { const n = Array.isArray(r.bat_cho_nhom_sp) ? r.bat_cho_nhom_sp : [];
    const m = new Set(ds); return !n.length || n.some((g) => m.has(g)); };
  let soPage = 0, lech = 0;
  for (const tm of (await pool.query("SELECT id FROM team WHERE NOT la_ky_thuat")).rows) {
    const rows = (await pool.query("SELECT * FROM ky_nang WHERE team_id=$1 AND bat",[tm.id])).rows;
    for (const p of (await pool.query("SELECT id FROM page WHERE team_id=$1",[tm.id])).rows) {
      soPage++;
      const sp = (await pool.query("SELECT ma FROM san_pham WHERE team_id=$1 AND page_id=$2",[tm.id,p.id])).rows.map(x=>x.ma);
      const A = rows.filter((r) => cu(r, sp)).map((r) => r.ma).sort().join(",");
      const B = (await docKyNang(pool, tm.id, sp)).map((r) => r.ma).sort().join(",");
      if (A !== B) lech++;
    }
  }
  console.log(`${soPage}|${lech}`);
} finally { await pool.end(); }')"
IFS='|' read -r A4_SOPAGE A4_LECH <<< "${LECH}"
so "số page đã so trên CSDL THẬT" "${A4_SOPAGE}"
bang "số page LỆCH giữa phép đếm và bộ đọc" "${A4_LECH}" "0"

muc "⑤ bộ ca chi tiết"
if node --test test/l0-m2-noi-dung.test.js >/tmp/g2a4-test.txt 2>&1; then
  dat "test/l0-m2-noi-dung.test.js: $(grep -c '^# Subtest' /tmp/g2a4-test.txt) ca, 0 đỏ"
else
  truot "bộ ca có ca đỏ:"; grep -E '^not ok' /tmp/g2a4-test.txt | head -8
fi

printf '\n═══════════════════════════════════════════════════════════════\n'
printf 'TỔNG: %d phép · ĐẠT %d · TRƯỢT %d\n' "${PHEP}" "$((PHEP - LOI))" "${LOI}"
[ "${LOI}" -eq 0 ] && exit 0 || exit 1
