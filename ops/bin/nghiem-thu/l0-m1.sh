#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU L0-M1 — lược đồ 19 bảng + di trú dữ liệu thật.
# Thi hành đúng 10 phép của ④ trong docs/thi-cong/phieu/PHIEU-L0-M1.md.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT DIFF DANH SÁCH. Không có dòng nào
#       chỉ nói "chạy xong không lỗi".
#
# Cổng TỰ DỰNG CSDL sandbox `aicloser_v3_nt_l0m1` từ khuôn trần rồi TỰ DỌN —
# không đo trên CSDL dev đang có thợ khác dùng (luật 11 sổ điều hành), và không
# phụ thuộc trạng thái tay của thợ.
#
#   bash ops/bin/nghiem-thu/l0-m1.sh              # chạy đủ 10 phép
#   GIU_SANDBOX=1 bash ops/bin/nghiem-thu/l0-m1.sh  # giữ CSDL lại để soi tay
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

DB="aicloser_v3_nt_l0m1"
LOI=0
PHEP=0

# ── khung in ─────────────────────────────────────────────────────────────────
muc()  { printf '\n── %s\n' "$1"; }
so()   { printf '   %-58s %s\n' "$1" "$2"; }
dat()  { PHEP=$((PHEP + 1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP + 1)); LOI=$((LOI + 1)); printf '   ✘ %s\n' "$1"; }
# bang <nhãn> <giá trị thật> <giá trị chờ>
bang() {
  so "$1" "$2"
  case "$2" in
    *LOI-PSQL*) truot "$1: câu đo HỎNG (LOI-PSQL) — không đọc là đạt"; return ;;
  esac
  if [ "$2" = "$3" ]; then dat "$1 = $3"; else truot "$1: thật=$2 · chờ=$3"; fi
}

# Trả về giá trị, hoặc đúng chuỗi "LOI-PSQL" khi câu lệnh hỏng. KHÔNG trả nguyên văn
# câu lỗi: hai lượt đo cùng hỏng sẽ ra hai chuỗi BẰNG NHAU và phép so đọc thành ĐẠT.
# ⚠️ SỬA 25/08 (G2-A2): khối này TỪNG chạy qua `docker exec talpha-pg`. Container đó không
# còn tồn tại ở đâu — máy dev không có docker, VPS chạy Postgres cài thẳng — nên cổng `exit
# 2` câm từ lâu. Nay nói chuyện với CSDL bằng chính gói `pg` của repo (cùng cách l0-m2.sh
# đã sửa), chạy ở đâu có `DATABASE_URL_V3` là chạy. Án lệ #28.
GOC_URL="$(node -e 'const {chuoiNoi}=await import("./db/ket-noi.js");console.log(chuoiNoi());')"
if [ -z "${GOC_URL}" ]; then
  echo "✘ không đọc được DATABASE_URL_V3 — cổng không đo được"; exit 2
fi

# $1 = câu SQL · $2 = tên CSDL. In từng ô cách nhau `|`, từng dòng một — cùng khuôn `-tAc`.
chay_sql() {
  node -e '
    const pg = (await import("pg")).default;
    const u = new URL(process.argv[1]); u.pathname = "/" + process.argv[3];
    const p = new pg.Pool({ connectionString: u.toString(), max: 1 });
    try {
      const r = await p.query(process.argv[2]);
      if (r.rows?.length) console.log(r.rows.map(o => Object.values(o).join("|")).join("\n"));
    } finally { await p.end(); }
  ' "${GOC_URL}" "$1" "$2"
}

psqlx() {
  local out
  if out="$(chay_sql "$1" "${DB}" 2>/dev/null)"; then
    printf '%s' "${out}"
  else
    printf 'LOI-PSQL'
  fi
}
psqlq() { chay_sql "$1" "${DB}" >/dev/null 2>&1; }

# Chạy một khối node -e; in đúng NỘI DUNG stdout, hoặc chuỗi cố định "LOI-NODE" khi rc≠0
# — KHÔNG in nguyên văn lỗi (hai lượt cùng hỏng ra hai chuỗi BẰNG NHAU thì phép so đọc
# nhầm thành ĐẠT — cùng lý do như `psqlx` ngay trên).
nodex() {
  local out
  if out="$(node -e "$1" 2>/tmp/l0m1-node-err.txt)"; then
    printf '%s' "${out}"
  else
    printf 'LOI-NODE'
  fi
}

# ── dựng sandbox ─────────────────────────────────────────────────────────────
chay_sql "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" postgres >/dev/null 2>&1
if ! chay_sql "CREATE DATABASE ${DB}" postgres >/dev/null 2>&1; then
  echo "✘ không tạo được CSDL sandbox ${DB} — cổng dừng."
  echo "  (vai CSDL trong DATABASE_URL_V3 đã có quyền CREATEDB chưa?)"; exit 2
fi

DATABASE_URL_V3="$(node -e '
const u = new URL(process.argv[1]); u.pathname = "/" + process.argv[2]; console.log(u.toString());
' "${GOC_URL}" "${DB}")"
export DATABASE_URL_V3
# Khoá mã hoá DÙNG MỘT LẦN của lượt đo — không đọc, không đụng khoá thật trong .env.
V3_KHOA_MA_HOA="$(node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))')"
export V3_KHOA_MA_HOA

don_dep() {
  if [ "${GIU_SANDBOX:-0}" = "1" ]; then
    printf '\n(giữ lại CSDL %s theo GIU_SANDBOX=1)\n' "${DB}"
  else
    chay_sql "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" postgres >/dev/null 2>&1
  fi
}
trap don_dep EXIT

# Vân tay tệp nguồn ĐẦU lượt — phép ⑪ so lại ở cuối: cổng chỉ ĐỌC, cấm sửa nguồn.
TRUOC_NGUON="$(node -e '
const fs = await import("node:fs");
const { duongDan } = await import("./db/di-tru/nguon.js");
const d = duongDan();
console.log(Object.keys(d).sort().map((k) => {
  const s = fs.statSync(d[k]); return `${k}:${s.size}|${s.mtimeMs}`;
}).join(" "));')"

echo "CỔNG NGHIỆM THU L0-M1 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo: ${DB} (sandbox, không phải aicloser_v3) · máy chủ $(node -e '
  console.log(new URL(process.argv[1]).host)' "${GOC_URL}")"

# ═══ ① MIGRATE IDEMPOTENT ════════════════════════════════════════════════════
muc "① migrate chạy 2 lần — lần 2 rc=0 và _migrations KHÔNG thêm dòng"
node db/migrate.js >/dev/null 2>&1
M1="$(psqlx 'SELECT count(*) FROM _migrations')"
node db/migrate.js >/dev/null 2>&1; RC2=$?
M2="$(psqlx 'SELECT count(*) FROM _migrations')"
so "rc lần 2" "${RC2}"
bang "_migrations sau lần 1 → lần 2" "${M1}→${M2}" "${M1}→${M1}"
[ "${RC2}" = "0" ] && dat "rc lần 2 = 0" || truot "rc lần 2 = ${RC2}"

# ═══ Hàm gói phép ②–⑧ để ⑨ (diễn tập down) chạy lại y hệt ═══════════════════
kiem_2_den_8() {

muc "② DANH SÁCH bảng ↔ NEO NGOÀI 19 tên trích từ 02-KE-HOACH-CODE §Nền dữ liệu"
# 22/08 TỔNG vá: +ket_noi_pos (20). 23/08: +tin_cho_xu_ly (21, migration 003 của L2-M1).
# 25/08 G2-A2: +khoa_nha (22, migration 008 — khoá API tách khỏi cau_hinh_model).
# 01/09: +ky_nang_lich_su (23, migration 009 — lịch sử bản kỹ năng, đi cùng UNIQUE
#        bo_luat_chung_mot_ban_dang_ap) và +mau_0_dong (24, migration 012 — bảng mẫu
#        lớp 0 đồng). Neo này CỐ Ý viết tay và cố ý phải sửa mỗi lần thêm bảng: sinh nó
#        từ db/schema.sql thì nó tự khớp với thứ đang đo, và phép mất hết răng.
NEO="$(printf '%s\n' ket_noi_pos tin_cho_xu_ly khoa_nha ky_nang_lich_su mau_0_dong \
  team nguoi_dung vai thanh_vien_team cau_hinh_model page san_pham \
  goi_gia khach hoi_thoai so_ai don_hang viec_can_xu_ly hang_cho_tao_don kich_ban \
  bo_luat_chung ky_nang lich_nhac nhat_ky | sort)"
THAT="$(psqlx "SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name<>'_migrations'
  ORDER BY table_name")"
THIEU="$(comm -23 <(printf '%s\n' "${NEO}") <(printf '%s\n' "${THAT}") | tr '\n' ' ')"
THUA="$(comm -13 <(printf '%s\n' "${NEO}") <(printf '%s\n' "${THAT}") | tr '\n' ' ')"
so "số bảng thật (không kể _migrations)" "$(printf '%s\n' "${THAT}" | wc -l | tr -d ' ')"
so "THIẾU so với neo" "${THIEU:-(không)}"
so "THỪA so với neo" "${THUA:-(không)}"
if [ -z "${THIEU}${THUA}" ]; then dat "danh sách bảng khớp neo $(printf '%s\n' "${NEO}" | wc -l | tr -d ' ') tên"
else truot "danh sách bảng LỆCH neo — xem từng tên ở trên"; fi
CO_MIG="$(psqlx "SELECT count(*) FROM information_schema.tables
  WHERE table_schema='public' AND table_name='_migrations'")"
bang "bảng _migrations tồn tại" "${CO_MIG}" "1"

muc "③ phủ team_id"
K1="$(psqlx "SELECT count(*) FROM information_schema.tables t
  WHERE t.table_schema='public' AND t.table_type='BASE TABLE'
    AND t.table_name NOT IN ('team','nguoi_dung','vai','_migrations')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns c
                    WHERE c.table_schema='public' AND c.table_name=t.table_name
                      AND c.column_name='team_id')")"
bang "bảng nghiệp vụ THIẾU cột team_id" "${K1}" "0"
K2="$(psqlx "SELECT string_agg(table_name,',' ORDER BY table_name)
  FROM information_schema.columns
  WHERE table_schema='public' AND column_name='team_id' AND is_nullable='YES'")"
bang "bảng có team_id NULLABLE" "${K2}" "bo_luat_chung"

muc "④ DI TRÚ — hai vế mỗi phép"
if ! node db/di-tru/index.js > /tmp/l0m1-ditru-1.txt 2>&1; then
  truot "di-tru lượt 1 hỏng — dừng phép ④, không đo tiếp trên CSDL rỗng"
  sed -n '1,20p' /tmp/l0m1-ditru-1.txt
  return 1
fi

# a. tập page_id pages.json ↔ bảng page
NGUON_PAGE="$(node -e 'const {docPages}=await import("./db/di-tru/nguon.js");
  console.log(docPages().map(p=>p.pageId).sort().join("\n"))')"
DICH_PAGE="$(psqlx 'SELECT page_id FROM page ORDER BY page_id')"
DIFF_A="$(diff <(printf '%s\n' "${NGUON_PAGE}" | sort) <(printf '%s\n' "${DICH_PAGE}" | sort) | head -20)"
so "a · pages.json = $(printf '%s\n' "${NGUON_PAGE}" | wc -l | tr -d ' ')  ↔  bảng page" \
   "$(printf '%s\n' "${DICH_PAGE}" | wc -l | tr -d ' ')"
if [ -z "${DIFF_A}" ]; then dat "a · diff tập page_id = RỖNG"
else truot "a · diff tập page_id:"; printf '%s\n' "${DIFF_A}"; fi

# b. CÔNG TẮC AI — diff HAI CHIỀU
BAT_DB="$(psqlx 'SELECT page_id FROM page WHERE bot_ai_bat ORDER BY page_id')"
BAT_FILE="$(node -e 'const {docAiEnabled}=await import("./db/di-tru/nguon.js");
  console.log(docAiEnabled().sort().join("\n"))')"
so "b · count(page WHERE bot_ai_bat)" "$(printf '%s\n' "${BAT_DB}" | grep -c . )"
so "b · ai-enabled.json" "$(printf '%s\n' "${BAT_FILE}" | grep -c . )"
THUA_DB="$(comm -23 <(printf '%s\n' "${BAT_DB}" | sort) <(printf '%s\n' "${BAT_FILE}" | sort) | tr '\n' ' ')"
if [ -z "${THUA_DB}" ]; then dat "b(i) · DB \\ ai-enabled.json = RỖNG (DB không tự bật thêm)"
else truot "b(i) · DB tự bật thêm: ${THUA_DB}"; fi
THIEU_DB="$(comm -13 <(printf '%s\n' "${BAT_DB}" | sort) <(printf '%s\n' "${BAT_FILE}" | sort))"
LAC="$(node -e 'const {pageLac}=await import("./db/di-tru/nguon.js");
  console.log(pageLac().map(p=>p.pageId).sort().join("\n"))')"
so "b(ii) · ai-enabled.json \\ DB (page lạc)" "$(printf '%s\n' "${THIEU_DB}" | tr '\n' ' ')"
so "b(ii) · page LẠC (mọi nguồn)" "$(printf '%s\n' "${LAC}" | tr '\n' ' ')"
LAC_CHUA_GHI=""
for p in ${THIEU_DB}; do
  printf '%s\n' "${LAC}" | grep -qx "${p}" || LAC_CHUA_GHI="${LAC_CHUA_GHI} ${p}(không-phải-page-lạc)"
  grep -q "${p}" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md || LAC_CHUA_GHI="${LAC_CHUA_GHI} ${p}(chưa-vào-§9)"
done
if [ -z "${LAC_CHUA_GHI}" ]; then dat "b(ii) · mọi page bật-AI-mà-thiếu đều là page lạc VÀ đã có trong sổ §9"
else truot "b(ii) ·${LAC_CHUA_GHI}"; fi
# mọi page LẠC (kể cả không bật AI) phải được ghi sổ — không chỉ page bật AI
for p in ${LAC}; do
  grep -q "${p}" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md \
    || truot "b(ii) · page lạc ${p} CHƯA được liệt kê trong sổ §9"
done

# c. hội thoại
CONV="$(node -e 'const {docConvState}=await import("./db/di-tru/nguon.js");
  const c=docConvState(); console.log(`${c.hoiThoai.length} ${c.khoaLa.length}`)')"
CONV_OK="$(printf '%s' "${CONV}" | cut -d' ' -f1)"
CONV_LA="$(printf '%s' "${CONV}" | cut -d' ' -f2)"
HT="$(psqlx 'SELECT count(*) FROM hoi_thoai')"
so "c · khoá conv-state SAI khuôn (bỏ qua, liệt kê)" "${CONV_LA}"
bang "c · conv-state hợp khuôn ↔ count(hoi_thoai)" "${CONV_OK}↔${HT}" "${CONV_OK}↔${CONV_OK}"

# d. kịch bản — in PHÉP QUY ĐỔI + hai vế
QD="$(node -e '
const {docKichBan, pageLac}=await import("./db/di-tru/nguon.js");
const k=docKichBan(); const lac=new Set(pageLac().map(p=>p.pageId));
const cuaLac=k.ban.filter(b=>lac.has(b.pageId)).length;
console.log(`${k.soTepLichSu} ${k.ban.length} ${k.soMucKb} ${k.kbRieng.length} ${cuaLac} ${k.ban.length-cuaLac}`)')"
set -- ${QD}
KB="$(psqlx 'SELECT count(*) FROM kich_ban')"
so "d · PHÉP QUY ĐỔI" "(bản trong $1 tệp script-versions) + (mục kb chưa có tệp: $4) − (bản của page lạc: $5)"
so "d · vế NGUỒN  = $2 bản − $5" "$6"
so "d · vế ĐÍCH   count(kich_ban)" "${KB}"
so "d · mục kb-overrides (không sinh dòng mới vì trùng bản LIVE)" "$3"
bang "d · hai vế" "${KB}" "$6"

# e. di trú lượt 2 — mọi count không đổi
T1="$(psqlx "SELECT count(*) FROM page")|$(psqlx "SELECT count(*) FROM page WHERE bot_ai_bat")|$(psqlx "SELECT count(*) FROM hoi_thoai")|$(psqlx "SELECT count(*) FROM kich_ban")"
node db/di-tru/index.js > /tmp/l0m1-ditru-2.txt 2>&1
T2="$(psqlx "SELECT count(*) FROM page")|$(psqlx "SELECT count(*) FROM page WHERE bot_ai_bat")|$(psqlx "SELECT count(*) FROM hoi_thoai")|$(psqlx "SELECT count(*) FROM kich_ban")"
bang "e · page|batAI|hội thoại|kịch bản sau lượt 2" "${T2}" "${T1}"
so "(vế Sổ AI KHÔNG đo ở đây — nợ §9, chạy trên VPS đợt cutover)" "hoãn"

muc "⑤ team + RÀO team kỹ thuật"
SLUG="$(psqlx "SELECT string_agg(slug,',' ORDER BY slug) FROM team")"
bang "a · slug team" "${SLUG}" "auus,chua-phan,pialpha-eu,tieu-alpha"
TV="$(psqlx "SELECT count(*) FROM thanh_vien_team tv JOIN team t ON t.id=tv.team_id
             WHERE t.la_ky_thuat")"
bang "b · thành viên trong team KỸ THUẬT" "${TV}" "0"
psqlq "INSERT INTO nguoi_dung (email,ten) VALUES ('nt-l0m1@test.local','NT') ON CONFLICT DO NOTHING"
if psqlq "INSERT INTO thanh_vien_team (team_id,nguoi_dung_id,vai_id)
          SELECT t.id, u.id, v.id FROM team t, nguoi_dung u, vai v
          WHERE t.slug='chua-phan' AND u.email='nt-l0m1@test.local' AND v.ma='quan-tri'"; then
  truot "c · DB CHO chèn thành viên vào chua-phan (rào hỏng)"
else
  dat "c · DB TỪ CHỐI chèn thành viên vào chua-phan (rc≠0)"
fi
if psqlq "INSERT INTO thanh_vien_team (team_id,nguoi_dung_id,vai_id)
          SELECT t.id, u.id, v.id FROM team t, nguoi_dung u, vai v
          WHERE t.slug='tieu-alpha' AND u.email='nt-l0m1@test.local' AND v.ma='sale'"; then
  dat "c · ca CHO-QUA: team nghiệp vụ vẫn nhận thành viên"
else
  truot "c · rào chặn NHẦM cả team nghiệp vụ"
fi

muc "⑥ CHỈ-INSERT: nhat_ky và so_ai"
psqlq "INSERT INTO nhat_ky (team_id,tac_nhan,hanh_dong)
       SELECT id,'may:nghiem-thu','nhap' FROM team WHERE slug='chua-phan'"
psqlq "INSERT INTO so_ai (team_id,xay_ra_luc,page_id,psid,loai,ma_model,nguon_tep,nguon_dong)
       SELECT id, now(), '0','0','reply','kimi-k2.6','nghiem-thu.jsonl',1
       FROM team WHERE slug='chua-phan'"
psqlq "UPDATE nhat_ky SET hanh_dong='doi'" \
  && truot "nhat_ky CHO UPDATE" || dat "nhat_ky từ chối UPDATE (rc≠0)"
psqlq "DELETE FROM nhat_ky" \
  && truot "nhat_ky CHO DELETE" || dat "nhat_ky từ chối DELETE (rc≠0)"
psqlq "UPDATE so_ai SET ma_model='doi'" \
  && truot "so_ai CHO UPDATE" || dat "so_ai từ chối UPDATE (rc≠0)"
psqlq "DELETE FROM so_ai" \
  && truot "so_ai CHO DELETE" || dat "so_ai từ chối DELETE (rc≠0)"

muc "⑦ hợp đồng đọc bo_luat_chung: (team_id = \$ctx OR team_id IS NULL) — đếm DELTA"
# 23/08 VA-T1 vá (chẩn đoán #1): seed mồi L2-M3 (di-tru chèn 1 dòng NULL toàn hệ vào
# bo_luat_chung) làm đếm TUYỆT ĐỐI ăn may theo trạng thái seed — 2/1/1 hoá 3/2/2 ngay
# khi phép ④ DI TRÚ ở trên đã chạy. Đếm SAU−TRƯỚC quanh đúng hai dòng lượt này tự
# chèn mới là bất biến ĐÚNG, không phụ thuộc seed nào khác (kể cả di-tru đổi seed sau).
dem_ctx() {
  psqlx "SELECT count(*) FROM bo_luat_chung
         WHERE team_id=(SELECT id FROM team WHERE slug='$1') OR team_id IS NULL"
}
T_TA="$(dem_ctx tieu-alpha)"; T_AU="$(dem_ctx auus)"; T_PI="$(dem_ctx pialpha-eu)"
# 01/09: hai lượt chèn dưới đây bỏ trống `phien_ban` nên cả hai lấy cùng một số mặc
# định, và từ migration 009 UNIQUE (COALESCE(team_id,0), phien_ban) chặn chúng. Lượt
# chèn dòng-toàn-hệ trượt lặng lẽ (psqlq nuốt rc), nên ba DELTA ra 1/0/0 thay vì 2/1/1
# — cổng đỏ vì CÂU CHÈN CŨ, không vì hợp đồng đọc. Nay chèn bản KẾ TIẾP tường minh.
psqlq "INSERT INTO bo_luat_chung (team_id,phien_ban,noi_dung)
       VALUES (NULL,(SELECT coalesce(max(phien_ban),0)+1 FROM bo_luat_chung WHERE team_id IS NULL),'luat toan he')"
psqlq "INSERT INTO bo_luat_chung (team_id,phien_ban,noi_dung)
       SELECT t.id,(SELECT coalesce(max(phien_ban),0)+1 FROM bo_luat_chung b WHERE b.team_id=t.id),'luat rieng tieu-alpha'
         FROM team t WHERE t.slug='tieu-alpha'"
S_TA="$(dem_ctx tieu-alpha)"; S_AU="$(dem_ctx auus)"; S_PI="$(dem_ctx pialpha-eu)"
bang "DELTA bối cảnh tieu-alpha (thấy CẢ HAI dòng vừa chèn)" "$((S_TA - T_TA))" "2"
bang "DELTA bối cảnh auus (chỉ thấy dòng toàn hệ)" "$((S_AU - T_AU))" "1"
bang "DELTA bối cảnh pialpha-eu (chỉ thấy dòng toàn hệ)" "$((S_PI - T_PI))" "1"

muc "⑧ khoá API của cau_hinh_model lưu dạng MÃ HOÁ"
node -e '
const { voiPool } = await import("./db/ket-noi.js");
const { ghiCauHinhModel } = await import("./db/khoa.js");
await voiPool((pool) => ghiCauHinhModel(pool, {
  teamSlug: "auus", vaiTro: "chinh", nhaCungCap: "moonshot",
  maModel: "kimi-k2.6", khoaApi: "sk-nghiem-thu-khong-duoc-lo",
}));' >/dev/null 2>&1
# 25/08 (G2-A2): khoá đã rời `cau_hinh_model` sang `khoa_nha` — phép này hỏi ĐÚNG chỗ mới.
# Sửa luật thì phải sửa cả THƯỚC (án lệ #27): để nguyên câu cũ thì cổng đỏ vì bảng đổi chỗ,
# không phải vì khoá lưu sai, và người đọc cổng sẽ đi tìm nhầm chỗ.
CUT="$(psqlx "SELECT left(k.khoa_api_ma,10) FROM khoa_nha k
              WHERE k.team_id=(SELECT id FROM team WHERE slug='auus')")"
so "10 ký tự đầu của giá trị ĐÃ LƯU" "${CUT}"
case "${CUT}" in
  sk-*|ey*) truot "khoá lưu NGUYÊN VĂN" ;;
  v1.*)     dat "khoá lưu dạng mã hoá (bao thư v1.…), không mở đầu sk-/ey" ;;
  *)        truot "khoá lưu dạng lạ: ${CUT}" ;;
esac

}   # hết kiem_2_den_8

kiem_2_den_8

# ═══ ⑨ DIỄN TẬP DOWN trên CSDL ĐÃ SEED + ĐÃ DI TRÚ ═══════════════════════════
muc "⑨ diễn tập down --het rồi up + di-tru lại → ②–⑧ vẫn đạt"
TRUOC_DOWN="$(psqlx 'SELECT count(*) FROM hoi_thoai')"
so "hội thoại TRƯỚC khi down (phải > 0, không phải DB vừa up xong)" "${TRUOC_DOWN}"
node db/migrate.js down --het >/dev/null 2>&1
CON_LAI="$(psqlx "SELECT count(*) FROM information_schema.tables
  WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name<>'_migrations'")"
bang "bảng còn lại sau down" "${CON_LAI}" "0"
node db/migrate.js >/dev/null 2>&1
LOI_TRUOC_LAP="${LOI}"
kiem_2_den_8
if [ "${LOI}" = "${LOI_TRUOC_LAP}" ]; then dat "⑨ · ②–⑧ vẫn đạt sau vòng down→up→di-tru"
else truot "⑨ · có phép ②–⑧ đỏ sau vòng down→up→di-tru"; fi

# ═══ ⑩ TEST ═════════════════════════════════════════════════════════════════
muc "⑩ test"
# ⚠️ `npm test` (`node --test test/`) KHÔNG chạy được trên Node v25 — nó nhận thư mục
#    làm tệp mở đầu. Sửa script `test` NGOÀI phạm vi phiếu này ⇒ đã ghi §9 sổ nợ.
#    Cổng gọi thẳng bộ ca, và đo bộ cũ theo TỪNG TỆP để so với mốc nền.
so "node --version" "$(node --version)"
if node --test test/l0-m1-*.test.js >/tmp/l0m1-test-moi.txt 2>&1; then
  dat "bộ ca MỚI của phiếu: $(grep -c '^✔' /tmp/l0m1-test-moi.txt) xanh / 0 đỏ"
else
  truot "bộ ca MỚI có ca đỏ:"; grep -E '^✖|not ok' /tmp/l0m1-test-moi.txt | head -10
fi
# ⚠️ Bộ ca CŨ GHI THẲNG vào `conv-state.json` thật ở gốc repo (chỉ l5-ab-followup tự trỏ
#    sổ đi nơi khác) — chạy cổng một lượt là đẻ thêm hội thoại `convN_…` vào dữ liệu vận
#    hành. Cổng trỏ `CONV_STATE_FILE` sang thư mục tạm để lượt ĐO không sửa nguồn.
#    Bản thân lỗ hổng của bộ ca cũ đã ghi §9 sổ nợ (ngoài phạm vi phiếu này).
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
# Mốc nền đo trên cây tại base 3d1eed1, SAU `npm install`, TRƯỚC mọi dòng code của phiếu.
# ⚠️ SỬA 25/08 (G2-A2): mốc nền cũ gõ tay 5 tệp «đỏ sẵn». Đo lại thì CẢ NĂM XANH ở cả hai
# môi trường (máy cá nhân 5/5 · VPS 23/23) ⇒ cổng TRƯỢT mỗi khi mã nguồn TỐT LÊN. Cùng bản
# vá với `l0-m2.sh`: danh sách gõ tay là lỗ hẹn giờ (án lệ #22), đổi thành luật «0 tệp đỏ».
if [ "${FAIL}" -eq 0 ]; then
  dat "bộ ca cũ: 0 tệp đỏ trên ${PASS} tệp"
else
  truot "bộ ca cũ có tệp ĐỎ (${FAIL}/$((PASS + FAIL))):${DO_LIST}"
fi

muc "⑪ cổng KHÔNG sửa tệp nguồn (phép tự soi của chính lượt đo)"
SAU_NGUON="$(node -e '
const fs = await import("node:fs");
const { duongDan } = await import("./db/di-tru/nguon.js");
const d = duongDan();
console.log(Object.keys(d).sort().map((k) => {
  const s = fs.statSync(d[k]); return `${k}:${s.size}|${s.mtimeMs}`;
}).join(" "));')"
bang "vân tay tệp nguồn (kích thước|mtime) đầu ↔ cuối lượt" "${SAU_NGUON}" "${TRUOC_NGUON}"

# ═══════════════════════════════════════════════════════════════════════════════
# PHIEU-B-Y2 (G2-A2) — khoá API MỘT bản mỗi (team × nhà). Ba phép.
# ═══════════════════════════════════════════════════════════════════════════════
muc "⑫ khoá đã RỜI cau_hinh_model, và khoa_nha có rào MỘT-BẢN"
CON_COT="$(psqlx "SELECT count(*) FROM information_schema.columns
  WHERE table_name='cau_hinh_model' AND column_name='khoa_api_ma'")"
bang "cột khoa_api_ma còn lại trên cau_hinh_model" "${CON_COT}" "0"
RANG="$(psqlx "SELECT count(*) FROM information_schema.table_constraints
  WHERE table_name='khoa_nha' AND constraint_type='UNIQUE'")"
bang "ràng buộc UNIQUE trên khoa_nha" "${RANG}" "1"
RAO="$(psqlx "SELECT count(*) FROM information_schema.check_constraints c
  JOIN information_schema.constraint_column_usage u USING (constraint_name)
  WHERE u.table_name='khoa_nha' AND u.column_name='khoa_api_ma'
    AND c.check_clause LIKE '%v1.%'")"
bang "rào LIKE 'v1.%' đi theo cột sang bảng mới" "${RAO}" "1"

muc "⑬ ĐỔI KHOÁ MỘT LẦN là đủ cho MỌI ô dùng nhà đó (④#4 — cái lỗi 008 sinh ra để vá)"
KQ13="$(nodex '
const { ghiCauHinhModel, ghiKhoaNha, docKhoaNha } = await import("./db/khoa.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const chung = { teamSlug: "auus", nhaCungCap: "kimi" };
  const K1 = "sk-kimi-ban-dau", K2 = "sk-kimi-da-doi";
  await ghiCauHinhModel(pool, { ...chung, vaiTro: "chinh", maModel: "kimi-k2.6", khoaApi: K1 });
  await ghiCauHinhModel(pool, { ...chung, vaiTro: "nen",   maModel: "kimi-k2.5", khoaApi: K1 });
  const soBan = (await pool.query(
    `SELECT count(*)::int c FROM khoa_nha k JOIN team t ON t.id=k.team_id
      WHERE t.slug=$1 AND k.nha_cung_cap=$2`, ["auus", "kimi"])).rows[0].c;
  await ghiKhoaNha(pool, { ...chung, khoaApi: K2 });          // đổi khoá ĐÚNG MỘT LẦN
  const o = (await pool.query(
    `SELECT c.vai_tro FROM cau_hinh_model c JOIN team t ON t.id=c.team_id
      WHERE t.slug=$1 AND c.nha_cung_cap=$2 ORDER BY c.vai_tro`, ["auus", "kimi"])).rows;
  const tid = (await pool.query("SELECT id FROM team WHERE slug=$1", ["auus"])).rows[0].id;
  const doc = await docKhoaNha(pool, { teamId: tid, nhaCungCap: "kimi" });
  const khop = o.filter(() => doc === K2).length;
  console.log(`${soBan}|${o.length}|${khop}`);
});')"
IFS='|' read -r A2_BAN A2_O A2_KHOP <<< "${KQ13}"
bang "chinh + nen cùng nhà kimi → số bản khoá lưu" "${A2_BAN}" "1"
bang "số ô model dùng nhà kimi" "${A2_O}" "2"
bang "số ô đọc ra khoá MỚI sau 1 lượt đổi" "${A2_KHOP}" "2"

muc "⑭ down 008 → up 008 : lược đồ khớp"
# Thước phải TỰ CHỨNG MINH nó có đo gì (án lệ #29): in kèm SỐ CỘT, và số đó phải > 0.
# Lượt đo đầu của G2-A2 khai «KHỚP — 0 dòng» vì câu chụp hỏng — hai tệp rỗng thì bằng nhau.
CHUP="SELECT count(*)||':'||md5(string_agg(
        table_name||'.'||column_name||':'||data_type||':'||is_nullable,
        ',' ORDER BY table_name, column_name))
      FROM information_schema.columns WHERE table_schema='public'"
LD_TRUOC="$(psqlx "${CHUP}")"
node db/migrate.js down >/dev/null 2>&1
node db/migrate.js      >/dev/null 2>&1
LD_SAU="$(psqlx "${CHUP}")"
so "vân tay lược đồ trước down/up" "${LD_TRUOC}"
so "vân tay lược đồ sau  down/up" "${LD_SAU}"
SO_COT="${LD_TRUOC%%:*}"
if [ -z "${SO_COT}" ] || [ "${SO_COT}" -lt 100 ] 2>/dev/null; then
  truot "vân tay lược đồ đếm được ${SO_COT:-0} cột — THƯỚC RỖNG, không đọc là đạt"
else
  dat "vân tay lược đồ đếm ${SO_COT} cột (thước có đo thật)"
fi
bang "lược đồ trước ↔ sau round-trip 008" "${LD_SAU}" "${LD_TRUOC}"

# ── tổng ─────────────────────────────────────────────────────────────────────
printf '\n═══════════════════════════════════════════════════════════════\n'
printf 'TỔNG: %d phép · ĐẠT %d · TRƯỢT %d\n' "${PHEP}" "$((PHEP - LOI))" "${LOI}"
[ "${LOI}" -eq 0 ] && exit 0 || exit 1
