#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU B-Y3 — chuyển page sang team khác, KÈM mọi bảng con.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT DANH SÁCH. Không dòng nào chỉ nói "chạy xong".
#
# Cổng TỰ DỰNG CSDL sandbox `aicloser_v3_nt_by3` từ khuôn trần rồi TỰ DỌN (án lệ #28),
# và nói chuyện với CSDL bằng gói `pg` của repo — KHÔNG qua docker (container `talpha-pg`
# không còn tồn tại ở đâu; xem ghi chú cùng loại ở l0-m1.sh và l0-m2.sh).
#
#   bash ops/bin/nghiem-thu/b-y3.sh                # đủ phép, tự dọn
#   GIU_SANDBOX=1 bash ops/bin/nghiem-thu/b-y3.sh  # giữ CSDL lại để soi tay
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

DB="aicloser_v3_nt_by3"
LOI=0
PHEP=0

muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-58s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP + 1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP + 1)); LOI=$((LOI + 1)); printf '   ✘ %s\n' "$1"; }
bang() {
  so "$1" "$2"
  case "$2" in *LOI-NODE*) truot "$1: câu đo HỎNG (LOI-NODE) — không đọc là đạt"; return ;; esac
  if [ "$2" = "$3" ]; then dat "$1 = $3"; else truot "$1: thật=$2 · chờ=$3"; fi
}
nodex() {
  local out
  if out="$(node -e "$1" 2>/tmp/by3-node-err.txt)"; then printf '%s' "${out}"; else printf 'LOI-NODE'; fi
}

GOC_URL="$(node -e 'const {chuoiNoi}=await import("./db/ket-noi.js");console.log(chuoiNoi());')"
if [ -z "${GOC_URL}" ]; then
  echo "✘ không đọc được DATABASE_URL_V3 — cổng không đo được"; exit 2
fi
quanly() {
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
URL_THAT="${GOC_URL}"
DATABASE_URL_V3="$(node -e '
const u = new URL(process.argv[1]); u.pathname = "/" + process.argv[2]; console.log(u.toString());
' "${GOC_URL}" "${DB}")"
export DATABASE_URL_V3

don_dep() {
  if [ "${GIU_SANDBOX:-0}" = "1" ]; then printf '\n(giữ lại CSDL %s theo GIU_SANDBOX=1)\n' "${DB}"
  else quanly "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1; fi
}
trap don_dep EXIT

echo "CỔNG NGHIỆM THU B-Y3 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo: ${DB} (sandbox) · máy chủ $(node -e 'console.log(new URL(process.argv[1]).host)' "${GOC_URL}")"
node db/migrate.js >/dev/null 2>&1

# Một lượt dựng-và-chuyển dùng chung cho các phép dưới. In:
#   <danh mục con>|<daChuyen>|<boLai>|<moCoi sau chuyển>|<số dòng nhật ký>|<team của từng bảng>
KQ="$(nodex '
const { voiPool } = await import("./db/ket-noi.js");
const { chuyenPageSangTeam, demMoCoi, VAI_DUOC_CHUYEN } = await import("./src/db/index.js");
await voiPool(async (pool) => {
  const tid = async (s) => (await pool.query("SELECT id FROM team WHERE slug=$1",[s])).rows[0].id;
  const tA = await tid("tieu-alpha"), tB = await tid("auus");
  const nd = (await pool.query(
    "INSERT INTO nguoi_dung (email, ten) VALUES ($1,$2) RETURNING id", ["nt-y3@t.test","NT"])).rows[0].id;
  await pool.query(
    `INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id)
     SELECT $1,$2,v.id FROM vai v WHERE v.ma=$3`, [tA, nd, VAI_DUOC_CHUYEN]);

  const fb = "fb-nt-y3";
  const p = (await pool.query(
    "INSERT INTO page (team_id,page_id,ten) VALUES ($1,$2,$3) RETURNING id",[tA,fb,"NT Y3"])).rows[0];
  const kh = (await pool.query(
    "INSERT INTO khach (team_id,ten) VALUES ($1,$2) RETURNING id",[tA,"K"])).rows[0];
  const ht = (await pool.query(
    `INSERT INTO hoi_thoai (team_id,page_id,psid,khach_id,trang_thai,chu_so_huu)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,[tA,p.id,"psid-nt",kh.id,"GREET","AI"])).rows[0];
  await pool.query(
    `INSERT INTO kich_ban (team_id,page_id,phien_ban,trang_thai,noi_dung_nguoi,noi_dung_may)
     VALUES ($1,$2,1,$3,$4,$5)`,[tA,p.id,"LIVE","{}","kb"]);
  await pool.query("INSERT INTO san_pham (team_id,page_id,ma,ten) VALUES ($1,$2,$3,$4)",
    [tA,p.id,"sp-nt","SP"]);
  await pool.query(
    `INSERT INTO don_hang (team_id,page_id,hoi_thoai_id,khach_id,nguon,trang_thai_he)
     VALUES ($1,$2,$3,$4,$5,$6)`,[tA,p.id,ht.id,kh.id,"messenger","cho_sale"]);
  await pool.query(
    `INSERT INTO tin_cho_xu_ly (team_id,page_id,psid,conv_id,msg_id,noi_dung)
     VALUES ($1,$2,$3,$4,$5,$6)`,[tA,fb,"psid-nt","c1","m1","hi"]);
  await pool.query(
    `INSERT INTO so_ai (team_id,xay_ra_luc,page_id,psid,loai,ma_model,nguon_tep,nguon_dong)
     VALUES ($1, now(), $2,$3,$4,$5,$6,1)`,[tA,fb,"psid-nt","reply","kimi-k2.6","nt.jsonl"]);

  const kq = await chuyenPageSangTeam(pool, { teamId: tA, nguoiDungId: nd },
    { pageId: p.id, teamDichId: tB, lyDo: "cổng nghiệm thu" });
  const mc = await demMoCoi(pool);
  const nk = (await pool.query(
    "SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong=$1",["chuyen_page_team"])).rows[0].c;
  const doc = async (b,c,v) =>
    String((await pool.query(`SELECT team_id FROM ${b} WHERE ${c}=$1 LIMIT 1`,[v])).rows[0].team_id);
  const team = [
    await doc("page","id",p.id), await doc("hoi_thoai","page_id",p.id),
    await doc("kich_ban","page_id",p.id), await doc("san_pham","page_id",p.id),
    await doc("don_hang","page_id",p.id), await doc("tin_cho_xu_ly","page_id",fb),
  ];
  console.log([
    Object.keys(kq.daChuyen).sort().join(","),
    Object.values(kq.daChuyen).reduce((a,b)=>a+b,0),
    JSON.stringify(kq.boLai),
    Object.values(mc.moCoi).reduce((a,b)=>a+b,0),
    JSON.stringify(mc.boLaiCoChuDich),
    nk,
    new Set(team).size === 1 && team[0] === String(tB) ? "DONG-BO" : "LECH:"+team.join("/"),
    await doc("so_ai","page_id",fb) === String(tA) ? "SO_AI-O-LAI" : "SO_AI-DI",
  ].join("|"));
});')"
IFS='|' read -r Y3_BANG Y3_TONG Y3_BOLAI Y3_MOCOI Y3_BOLAI2 Y3_NK Y3_DONGBO Y3_SOAI <<< "${KQ}"

muc "① danh mục bảng con TỰ SINH — phiếu kê tay 3 bảng, lược đồ thật có 5 phải đi"
bang "bảng con đã chuyển" "${Y3_BANG}" "don_hang,hoi_thoai,kich_ban,san_pham,tin_cho_xu_ly"
bang "tổng số dòng con đã chuyển (mỗi bảng 1)" "${Y3_TONG}" "5"

muc "② con ĐI THEO page — đọc lại team của từng bảng từ CSDL, không tin số hàm tự khai"
bang "page + 5 bảng con cùng một team đích" "${Y3_DONGBO}" "DONG-BO"

muc "③ so_ai CỐ Ý ở lại, và con số đó phải HIỆN RA (⑧ của phiếu chờ chốt)"
bang "boLai trả về" "${Y3_BOLAI}" '{"so_ai":1}'
bang "so_ai còn ở team cũ" "${Y3_SOAI}" "SO_AI-O-LAI"

muc "④ 0 dòng MỒ CÔI sau chuyển — và nhóm ở-lại KHÔNG bị đếm nhầm thành mồ côi"
bang "tổng mồ côi (nhóm phải-bằng-0)" "${Y3_MOCOI}" "0"
bang "nhóm bỏ-lại-có-chủ-đích" "${Y3_BOLAI2}" '{"so_ai":1}'

muc "⑤ mọi lượt chuyển để lại DẤU — không truy ngược được thì không được phép làm"
bang "số dòng nhat_ky hanh_dong=chuyen_page_team" "${Y3_NK}" "1"

muc "⑥ ba cửa chặn: team kỹ thuật · sai vai · người ngoài cả hai team"
KQ6="$(nodex '
const { voiPool } = await import("./db/ket-noi.js");
const { chuyenPageSangTeam, VAI_DUOC_CHUYEN } = await import("./src/db/index.js");
await voiPool(async (pool) => {
  const tid = async (s) => (await pool.query("SELECT id FROM team WHERE slug=$1",[s])).rows[0].id;
  const tA = await tid("tieu-alpha"), tB = await tid("auus"), tC = await tid("pialpha-eu");
  const tKT = await tid("chua-phan");
  const them = async (email, team, vai) => {
    const id = (await pool.query(
      "INSERT INTO nguoi_dung (email,ten) VALUES ($1,$1) RETURNING id",[email])).rows[0].id;
    await pool.query(`INSERT INTO thanh_vien_team (team_id,nguoi_dung_id,vai_id)
      SELECT $1,$2,v.id FROM vai v WHERE v.ma=$3`,[team,id,vai]);
    return id;
  };
  const qt = await them("y3-qt@t.test", tA, VAI_DUOC_CHUYEN);
  const sale = await them("y3-sale@t.test", tA, "sale");
  const qtC = await them("y3-qtc@t.test", tC, VAI_DUOC_CHUYEN);
  const p = (await pool.query(
    "INSERT INTO page (team_id,page_id,ten) VALUES ($1,$2,$3) RETURNING id",
    [tA,"fb-nt-y3-chan","chặn"])).rows[0];
  const thu = async (ctx, dich) => {
    try { await chuyenPageSangTeam(pool, ctx, { pageId: p.id, teamDichId: dich }); return "LOT"; }
    catch (e) { return e.name; }
  };
  const a = await thu({ teamId: tA, nguoiDungId: qt }, tKT);
  const b = await thu({ teamId: tA, nguoiDungId: sale }, tB);
  const c = await thu({ teamId: tC, nguoiDungId: qtC }, tB);
  const con = String((await pool.query("SELECT team_id FROM page WHERE id=$1",[p.id])).rows[0].team_id);
  console.log(`${a}|${b}|${c}|${con === String(tA) ? "GIU-NGUYEN" : "DA-DOI"}`);
});')"
IFS='|' read -r Y3_KT Y3_VAI Y3_NGOAI Y3_GIU <<< "${KQ6}"
bang "teamDich = team KỸ THUẬT" "${Y3_KT}" "LoiXuyenTeam"
bang "vai sale thay vì quan-tri" "${Y3_VAI}" "LoiXuyenTeam"
bang "ctx thuộc team thứ ba" "${Y3_NGOAI}" "LoiXuyenTeam"
bang "page sau 3 lượt bị chặn" "${Y3_GIU}" "GIU-NGUYEN"

muc "⑦ bộ ca chi tiết"
if node --test test/l0-m2-chuyen-team.test.js >/tmp/by3-test.txt 2>&1; then
  dat "test/l0-m2-chuyen-team.test.js: $(grep -c '^# Subtest' /tmp/by3-test.txt) ca, 0 đỏ"
else
  truot "bộ ca có ca đỏ:"; grep -E '^not ok' /tmp/by3-test.txt | head -8
fi

muc "⑧ CSDL THẬT (chỉ đọc) — mồ côi phải bằng 0"
# Đo trên `aicloser_v3` chứ không phải sandbox: câu này là câu quan trọng nhất của phiếu,
# và nó phải ra 0 cả TRƯỚC lẫn SAU. Chỉ SELECT, không ghi một byte nào.
THAT="$(DATABASE_URL_V3="${URL_THAT}" nodex '
const { taoPool } = await import("./db/ket-noi.js");
const { demMoCoi } = await import("./src/db/index.js");
const pool = taoPool();
try {
  const r = await demMoCoi(pool);
  console.log(Object.values(r.moCoi).reduce((a,b)=>a+b,0));
} finally { await pool.end(); }')"
so "CSDL đo" "$(node -e 'console.log(new URL(process.argv[1]).pathname.slice(1))' "${URL_THAT}")"
bang "tổng dòng mồ côi trên CSDL THẬT" "${THAT}" "0"

printf '\n═══════════════════════════════════════════════════════════════\n'
printf 'TỔNG: %d phép · ĐẠT %d · TRƯỢT %d\n' "${PHEP}" "$((PHEP - LOI))" "${LOI}"
[ "${LOI}" -eq 0 ] && exit 0 || exit 1
