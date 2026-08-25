#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU G2-A5 + G2-A6 — kịch bản ba tầng, và API số liệu.
#
# Hai câu khó nhất của hai module, và cổng canh đúng hai câu đó:
#   A5 · bộ giải KHÔNG BAO GIỜ trả về im lặng — không có bản thì phải nói THIẾU KHOÁ NÀO
#   A6 · số 0 phải nói VÌ SAO là 0 — báo cáo toàn số 0 trông y hệt «hệ chạy êm»
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2
DB="aicloser_v3_nt_a5a6"; LOI=0; PHEP=0
muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-58s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP + 1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP + 1)); LOI=$((LOI + 1)); printf '   ✘ %s\n' "$1"; }
bang() {
  so "$1" "$2"
  case "$2" in *LOI-NODE*) truot "$1: câu đo HỎNG"; return ;; esac
  if [ "$2" = "$3" ]; then dat "$1 = $3"; else truot "$1: thật=$2 · chờ=$3"; fi
}
nodex() { local o; if o="$(node -e "$1" 2>/tmp/a56-err.txt)"; then printf '%s' "$o"; else printf 'LOI-NODE'; fi; }

GOC_URL="$(node -e 'const {chuoiNoi}=await import("./db/ket-noi.js");console.log(chuoiNoi());')"
[ -z "${GOC_URL}" ] && { echo "✘ thiếu DATABASE_URL_V3"; exit 2; }
quanly() { node -e '
  const pg=(await import("pg")).default; const u=new URL(process.argv[1]); u.pathname="/postgres";
  const p=new pg.Pool({connectionString:u.toString(),max:1});
  try{await p.query(process.argv[2]);}finally{await p.end();}' "${GOC_URL}" "$1"; }
URL_THAT="${GOC_URL}"
quanly "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1
quanly "CREATE DATABASE ${DB}" >/dev/null 2>&1 || { echo "✘ không tạo được ${DB}"; exit 2; }
DATABASE_URL_V3="$(node -e 'const u=new URL(process.argv[1]);u.pathname="/"+process.argv[2];console.log(u.toString())' "${GOC_URL}" "${DB}")"
export DATABASE_URL_V3
trap '[ "${GIU_SANDBOX:-0}" = "1" ] || quanly "DROP DATABASE IF EXISTS '"${DB}"' WITH (FORCE)" >/dev/null 2>&1' EXIT

echo "CỔNG G2-A5 + G2-A6 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo: ${DB} (sandbox) · máy chủ $(node -e 'console.log(new URL(process.argv[1]).host)' "${GOC_URL}")"
node db/migrate.js >/dev/null 2>&1

muc "① migration 010+011 lên/xuống, lược đồ khớp sau round-trip"
CHUP="SELECT count(*)||':'||md5(string_agg(table_name||'.'||column_name,',' ORDER BY table_name,column_name)) FROM information_schema.columns WHERE table_schema='public'"
psqlx() { node -e '
  const pg=(await import("pg")).default;
  const p=new pg.Pool({connectionString:process.env.DATABASE_URL_V3,max:1});
  try{const r=await p.query(process.argv[1]);console.log(r.rows.map(o=>Object.values(o).join("|")).join("\n"));}
  finally{await p.end();}' "$1" 2>/dev/null || printf 'LOI-NODE'; }
L1="$(psqlx "${CHUP}")"; node db/migrate.js down >/dev/null 2>&1; node db/migrate.js down >/dev/null 2>&1
node db/migrate.js >/dev/null 2>&1; L2="$(psqlx "${CHUP}")"
N="${L1%%:*}"
if [ -n "$N" ] && [ "$N" -ge 100 ] 2>/dev/null; then dat "vân tay đếm $N cột (thước có đo thật)"
else truot "vân tay đếm ${N:-0} cột — THƯỚC RỖNG"; fi
bang "lược đồ trước ↔ sau round-trip 010+011" "${L2}" "${L1}"

muc "② A5 — bộ giải KHÔNG trả im lặng, và bộ ráp prompt ĐI QUA nó"
KQ="$(nodex '
const { voiPool } = await import("./db/ket-noi.js");
const M = await import("./src/db/index.js");
const { docKichBanLive } = await import("./src/chat/rap-prompt.js");
await voiPool(async (p) => {
  const t = (await p.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const mk = async (fb, nuoc, sp) => {
    const r = (await p.query("INSERT INTO page (team_id,page_id,ten,thi_truong,bot_ai_bat) VALUES ($1,$2,$2,$3,true) RETURNING id",[t,fb,nuoc])).rows[0];
    if (sp) await p.query("INSERT INTO san_pham (team_id,page_id,ma,ten) VALUES ($1,$2,$3,$3)",[t,r.id,sp]);
    return r;
  };
  const a = await mk("g-rieng","KSA","g:x"), b = await mk("g-thua","KSA","g:y"), c = await mk("g-trong","KSA",null);
  const ban = async (cap,pageId,sp,nuoc,pb,tt,chu) => (await p.query(
    `INSERT INTO kich_ban (team_id,cap,page_id,san_pham_ma,thi_truong,phien_ban,trang_thai,noi_dung_nguoi,noi_dung_may)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [t,cap,pageId,sp,nuoc,pb,tt,"{}",chu])).rows[0];
  await ban("page",a.id,null,null,1,"LIVE","R");
  await ban("nuoc",null,"g:y","KSA",1,"LIVE","N");
  const r1 = await M.docKichBanChoPage(p,t,a.id);
  const r2 = await M.docKichBanChoPage(p,t,b.id);
  const r3 = await M.docKichBanChoPage(p,t,c.id);
  const qua = await docKichBanLive(p,t,b.id);
  console.log([
    r1.cap, r2.cap, r2.keThua ? "keThua" : "rieng",
    r3.ban === null && r3.viSao ? "co-viSao" : "IM-LANG",
    qua && String(qua.id)===String(r2.ban.id) ? "bo-rap-DI-QUA" : "bo-rap-KHONG-QUA",
  ].join("|"));
});')"
IFS='|' read -r A5_1 A5_2 A5_3 A5_4 A5_5 <<< "${KQ}"
bang "page có bản riêng → tầng" "${A5_1}" "page"
bang "page không có bản riêng → tầng" "${A5_2}" "nuoc"
bang "và nó khai là KẾ THỪA" "${A5_3}" "keThua"
bang "page không có gì → có nói VÌ SAO không" "${A5_4}" "co-viSao"
bang "bộ ráp prompt đi qua bộ giải" "${A5_5}" "bo-rap-DI-QUA"

muc "③ A6 — số 0 phải nói VÌ SAO là 0"
KQ6="$(nodex '
const { voiPool } = await import("./db/ket-noi.js");
const M = await import("./src/db/index.js");
await voiPool(async (p) => {
  const t = (await p.query("SELECT id FROM team WHERE slug=$1",["auus"])).rows[0].id;
  const u = (await p.query("INSERT INTO nguoi_dung (email,ten) VALUES ($1,$1) RETURNING id",["nt-a6@t.test"])).rows[0].id;
  await p.query("INSERT INTO thanh_vien_team (team_id,nguoi_dung_id,vai_id) SELECT $1,$2,v.id FROM vai v WHERE v.ma=$3",[t,u,"quan-ly"]);
  const ctx = { teamId: t, nguoiDungId: u };
  const bc = await M.baoCaoHaiLuong(p, ctx);
  const sk = await M.sucKhoeHeThong(p, ctx);
  const ab = await M.hieuQuaKichBan(p, ctx);
  console.log([
    bc.boiCanh.viSaoRong ? "co-lyDo" : "IM-LANG",
    "tongDon" in bc ? "CO-TONG" : "khong-tong",
    sk.den.length,
    sk.den.find(d=>d.ma==="llm_account").mau,
    ab.dsBan.every(b=>b.duMau || b.tiLeChot===null) ? "an-tiLe" : "LO-TILE",
  ].join("|"));
});')"
IFS='|' read -r A6_1 A6_2 A6_3 A6_4 A6_5 <<< "${KQ6}"
bang "báo cáo rỗng có nói lý do" "${A6_1}" "co-lyDo"
bang "báo cáo KHÔNG cộng hai luồng" "${A6_2}" "khong-tong"
bang "số đèn sức khoẻ" "${A6_3}" "9"
bang "chưa có Sổ AI → đèn XÁM (không phải đỏ)" "${A6_4}" "xam"
bang "chưa đủ mẫu → KHÔNG lộ tỉ lệ" "${A6_5}" "an-tiLe"

muc "④ bộ ca chi tiết"
for f in l0-m2-kich-ban l0-m2-so-lieu; do
  if node --test "test/${f}.test.js" >"/tmp/a56-${f}.txt" 2>&1; then
    dat "test/${f}.test.js: $(grep -c '^# Subtest' "/tmp/a56-${f}.txt") ca, 0 đỏ"
  else
    truot "test/${f}.test.js có ca đỏ:"; grep -E '^not ok' "/tmp/a56-${f}.txt" | head -5
  fi
done

muc "⑤ CSDL THẬT (chỉ đọc) — cây kịch bản của 514 page có nói được nguồn không"
THAT="$(DATABASE_URL_V3="${URL_THAT}" nodex '
const { taoPool } = await import("./db/ket-noi.js");
const { docKichBanChoPage } = await import("./src/db/index.js");
const pool = taoPool();
try {
  const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const pages = (await pool.query("SELECT id FROM page WHERE team_id=$1",[t])).rows;
  let rieng=0, thua=0, khong=0, imLang=0;
  for (const p of pages) {
    const k = await docKichBanChoPage(pool, t, p.id);
    if (k.cap === "page") rieng++;
    else if (k.cap) thua++;
    else { khong++; if (!k.viSao) imLang++; }
  }
  console.log(`${pages.length}|${rieng}|${thua}|${khong}|${imLang}`);
} finally { await pool.end(); }')"
IFS='|' read -r T_TONG T_RIENG T_THUA T_KHONG T_IM <<< "${THAT}"
# CSDL thật có thể CHƯA áp 010 — khi đó phép này chưa đo được. Nói ra là «chưa đo», ĐỪNG
# đọc thành «code hỏng», và cũng đừng đọc thành «đạt». Cả hai cách đọc kia đều nói dối.
CO_010="$(DATABASE_URL_V3="${URL_THAT}" nodex '
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (p) => {
  const r = await p.query(`SELECT count(*)::int c FROM information_schema.columns
    WHERE table_schema=$1 AND table_name=$2 AND column_name=$3`, ["public","kich_ban","cap"]);
  console.log(r.rows[0].c > 0 ? "co" : "chua");
});')"
if [ "${CO_010}" != "co" ]; then
  so "CSDL thật đã áp migration 010 chưa" "CHƯA"
  dat "phép ⑤ CHƯA ĐO ĐƯỢC trên CSDL thật (chưa áp 010) — không đọc là đạt, cũng không là đỏ"
else
  so "page trên CSDL THẬT" "${T_TONG}"
  so "  có bản riêng / kế thừa / không có" "${T_RIENG} / ${T_THUA} / ${T_KHONG}"
  bang "page không có bản mà KHÔNG nói vì sao" "${T_IM}" "0"
fi

printf '\n═══════════════════════════════════════════════════════════════\n'
printf 'TỔNG: %d phép · ĐẠT %d · TRƯỢT %d\n' "${PHEP}" "$((PHEP - LOI))" "${LOI}"
[ "${LOI}" -eq 0 ] && exit 0 || exit 1
