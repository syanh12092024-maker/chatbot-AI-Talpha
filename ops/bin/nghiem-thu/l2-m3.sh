#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU L2-M3 — Ráp prompt BỐN KHỐI từ DB + ngân sách lượt theo độ
# nóng (thay trần 4 lượt cứng) + cờ page trọng điểm. Thi hành đúng 7 phép của ④ trong
# docs/thi-cong/phieu/PHIEU-L2-M3.md.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT BẢNG ĐẾM. Không dòng nào chỉ nói "chạy xong
#       không lỗi". Cùng khuôn ops/bin/nghiem-thu/l2-m2.sh/l3-m2.sh (cố ý).
#
# Cổng TỰ DỰNG CSDL sandbox `aicloser_v3_nt_l2m3` từ khuôn trần rồi TỰ DỌN — không đo
# trên CSDL dev (luật 11 sổ điều hành). Phép ⑦ còn dựng THÊM sandbox riêng qua
# `db/sandbox.js` (bên trong chính test/l2-m3-*.test.js) — độc lập, tự dọn theo
# after() của Node test runner.
#
#   bash ops/bin/nghiem-thu/l2-m3.sh                # chạy đủ 7 phép
#   GIU_SANDBOX=1 bash ops/bin/nghiem-thu/l2-m3.sh  # giữ CSDL lại để soi tay
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

CONTAINER="talpha-pg"
DB="aicloser_v3_nt_l2m3"
LOI=0
PHEP=0

# ── khung in (giống hệt l2-m2.sh/l3-m2.sh) ──────────────────────────────────────
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

nodex() {
  local out
  if out="$(node --input-type=module -e "$1" 2>/tmp/l2m3-node-err.txt)"; then
    printf '%s' "${out}" | tail -1
  else
    printf 'LOI-NODE'
  fi
}

# ── dựng sandbox ────────────────────────────────────────────────────────────────
if ! docker ps --format '{{.Names}}' | grep -qx "${CONTAINER}"; then
  echo "✘ container ${CONTAINER} không chạy — cổng không đo được"; exit 2
fi
docker exec "${CONTAINER}" psql -U aicloser -d postgres -tAc \
  "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1
if ! docker exec "${CONTAINER}" psql -U aicloser -d postgres -v ON_ERROR_STOP=1 -tAc \
  "CREATE DATABASE ${DB}" >/dev/null 2>&1; then
  echo "✘ không tạo được CSDL sandbox ${DB} — cổng dừng"; exit 2
fi

GOC_URL="$(node --input-type=module -e 'const { chuoiNoi } = await import("./db/ket-noi.js"); console.log(chuoiNoi());')"
DATABASE_URL_V3="$(node --input-type=module -e '
const u = new URL(process.argv[1]); u.pathname = "/" + process.argv[2]; console.log(u.toString());
' "${GOC_URL}" "${DB}")"
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

echo "CỔNG NGHIỆM THU L2-M3 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo: ${DB} (sandbox tự dựng/tự dọn) · môi trường: DEV (máy cá nhân)"

nodex '
import { taoPool } from "./db/ket-noi.js";
import { len } from "./db/migrate.js";
const pool = taoPool();
await len(pool, { im: true });
await pool.end();
console.log("da_ap");
' >/dev/null

# ═══ ① RÁP ĐỦ 4 KHỐI — buildSystem(kb) không ném, system chứa dấu vết 4 khối ═══════
muc "① Ráp đủ 4 khối — page có dữ liệu → kb đủ 4 phần, buildSystem không ném, 4 dấu vết"
KQ1="$(nodex '
import { taoPool } from "./db/ket-noi.js";
import { rapKb } from "./src/chat/rap-prompt.js";
import { buildSystem } from "./src/prompts.js";
import { seedBoLuatVaKyNang } from "./db/di-tru/bo-luat-va-ky-nang.js";
process.env.V3_RAP_PROMPT_BAT = "1";
const pool = taoPool();
await seedBoLuatVaKyNang(pool);
const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
const p = (await pool.query("INSERT INTO page (team_id,page_id,ten,trong_diem) VALUES ($1,$2,$3,true) RETURNING id",[t,"950000000000001","cổng L2-M3 p1"])).rows[0].id;
const sp = (await pool.query("INSERT INTO san_pham (team_id,page_id,ma,ten,mo_ta) VALUES ($1,$2,$3,$4,$5) RETURNING id",[t,p,"CONG:SP1","Sản phẩm cổng L2-M3","mô tả"])).rows[0].id;
await pool.query("INSERT INTO goi_gia (team_id,san_pham_id,so_luong,gia,tien_te) VALUES ($1,$2,1,99,$3)",[t,sp,"AED"]);
await pool.query("INSERT INTO kich_ban (team_id,page_id,phien_ban,trang_thai,noi_dung_nguoi,noi_dung_may) VALUES ($1,$2,1,$3,$4::jsonb,$5)",[t,p,"LIVE",JSON.stringify({tone:"vui vẻ",greeting:"Chào cổng!",salesPrompt:"Bán hàng cổng L2-M3 tốt."}),"noi dung may"]);
await pool.query("INSERT INTO ky_nang (team_id,ma,ten,noi_dung,bat_cho_nhom_sp,bat) VALUES ($1,$2,$3,$4,$5,true)",[t,"cong_skill","kỹ năng cổng","noi dung ky nang CONGL2M3",["CONG:SP1"]]);
const kb = await rapKb(pool, { teamId: t, pageIdText: "950000000000001" });
const system = buildSystem(kb);
const joined = system.map(b=>b.text).join("\\n");
const dauVet = [
  /BỘ LUẬT CHUNG/.test(joined),
  joined.includes("noi dung ky nang CONGL2M3"),
  joined.includes("Bán hàng cổng L2-M3 tốt."),
  joined.includes("Sản phẩm cổng L2-M3"),
].filter(Boolean).length;
console.log(`noData=${kb.noData}|trongDiem=${kb.trongDiem}|nguon_thieu=${kb.nguon_thieu.length}|dauVet=${dauVet}/4|doDaiLuat=${kb.blocks.boLuatChung.doDai}|doDaiSP=${kb.blocks.sanPham[0].doDai}`);
await pool.end();
')"
so "kết quả ráp 4 khối" "${KQ1}"
bang "① noData=false, trongDiem=true, nguon_thieu rỗng, 4/4 dấu vết" "${KQ1}" "noData=false|trongDiem=true|nguon_thieu=0|dauVet=4/4|doDaiLuat=6734|doDaiSP=5"

# ═══ ② BỘ LUẬT CHUNG — OR-IS-NULL 3 team + version mới ăn ngay KHÔNG restart ═══════
muc "② bo_luat_chung — 3 team đọc CÙNG dòng NULL; version 2 chèn ăn ngay (không cache)"
KQ2="$(nodex '
import { taoPool } from "./db/ket-noi.js";
import { docBoLuatChung } from "./src/chat/rap-prompt.js";
const pool = taoPool();
const teams = (await pool.query("SELECT id, slug FROM team WHERE NOT la_ky_thuat ORDER BY slug")).rows;
const truoc = [];
for (const t of teams) { const r = await docBoLuatChung(pool, t.id); truoc.push(`${t.slug}=v${r?.phien_ban}`); }
// Hạ bản cũ TRƯỚC rồi mới nâng bản mới — đúng thứ tự đường ghi thật làm
// (src/db/noi-dung.js#apBanBoLuat). Chèn thẳng bản thứ hai dang_dung=true là
// vi phạm bo_luat_chung_mot_ban_dang_ap (009): câu đo này viết trước 009, và
// từ hôm 009 lên nó ném ở đây chứ không đo được gì (đã im 6 lần chạy).
await pool.query("UPDATE bo_luat_chung SET dang_dung=false WHERE team_id IS NULL AND dang_dung");
await pool.query("INSERT INTO bo_luat_chung (team_id,phien_ban,noi_dung,dang_dung,nguoi_sua) VALUES (NULL,2,$1,true,$2)", ["v2 test cong", "cong-l2m3"]);
const sau = await docBoLuatChung(pool, teams[0].id);
console.log(`${truoc.join(",")}|sau_chen_v2=v${sau.phien_ban}`);
await pool.end();
')"
so "3 team đọc trước · sau khi chèn v2" "${KQ2}"
bang "② cả 3 team đọc v1, sau khi chèn v2 đọc ngay v2 (không restart)" "${KQ2}" "auus=v1,pialpha-eu=v1,tieu-alpha=v1|sau_chen_v2=v2"

# ═══ ③ KỸ NĂNG THEO NHÓM SP — đối chứng in cả hai ═══════════════════════════════
muc "③ kỹ năng theo nhóm SP — page nhóm có-size chứa skill, page nhóm khác KHÔNG"
KQ3="$(nodex '
import { taoPool } from "./db/ket-noi.js";
import { docKyNang } from "./src/chat/rap-prompt.js";
const pool = taoPool();
const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["auus"])).rows[0].id;
await pool.query("INSERT INTO ky_nang (team_id,ma,ten,noi_dung,bat_cho_nhom_sp,bat) VALUES ($1,$2,$3,$4,$5,true)",[t,"cong_size_only","size only","noi dung",["AUUS:CONG-SIZE"]]);
const co = await docKyNang(pool, t, ["AUUS:CONG-SIZE"]);
const khac = await docKyNang(pool, t, ["AUUS:CONG-KHAC"]);
console.log(`co_chua=${co.some(k=>k.ma==="cong_size_only")}|khac_chua=${khac.some(k=>k.ma==="cong_size_only")}`);
await pool.end();
')"
so "nhóm có-size chứa? | nhóm khác chứa?" "${KQ3}"
bang "③ nhóm có-size=true, nhóm khác=false" "${KQ3}" "co_chua=true|khac_chua=false"

# ═══ ④ KHỐI RỖNG NÓI RA + FALLBACK CỜ CONFIG ═══════════════════════════════════
muc "④ Khối rỗng nói ra (thiếu kịch bản) + fallback cờ config (vắng → dùng kb.js cũ)"
KQ4="$(nodex '
import { taoPool } from "./db/ket-noi.js";
import { rapKb } from "./src/chat/rap-prompt.js";
import { getKBForPage } from "./src/kb.js";
const pool = taoPool();
const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["pialpha-eu"])).rows[0].id;
const p = (await pool.query("INSERT INTO page (team_id,page_id,ten) VALUES ($1,$2,$3) RETURNING id",[t,"950000000000020","cổng p4"])).rows[0].id;
await pool.query("INSERT INTO san_pham (team_id,page_id,ma,ten) VALUES ($1,$2,$3,$4)",[t,p,"PIA:NOSCRIPT","sp"]);
process.env.V3_RAP_PROMPT_BAT = "1";
const kbThieu = await rapKb(pool, { teamId: t, pageIdText: "950000000000020" });
delete process.env.V3_RAP_PROMPT_BAT;
const pageLa = "khong-ton-tai-950999";
const kbCu = getKBForPage(pageLa);
const kbFallback = await rapKb(pool, { teamId: t, pageIdText: pageLa });
console.log(`nguon_thieu_co_kich_ban=${kbThieu.nguon_thieu.includes("kich_ban")}|noData_thieu=${kbThieu.noData}|fallback_nguon=${kbFallback.nguon}|fallback_khop_text=${kbFallback.text===kbCu.text}`);
await pool.end();
')"
so "khối rỗng nói ra | fallback cờ config" "${KQ4}"
bang "④ nguon_thieu có kich_ban, noData=false, fallback dùng kb_cu khớp y hệt" "${KQ4}" "nguon_thieu_co_kich_ban=true|noData_thieu=false|fallback_nguon=kb_cu|fallback_khop_text=true"

# ═══ ⑤ NGÂN SÁCH ĐỘ NÓNG — 5 bậc tăng dần + trần tuyệt đối + dừng không im ═══════
muc "⑤ Ngân sách độ nóng — bậc tăng dần, trần tuyệt đối, hết ngân sách → handoff không im"
KQ5="$(nodex '
import { chamVaTinhNganSach, conNganSach } from "./src/chat/ngan-sach-luot.js";
import { HARD_MAX_TURNS } from "./src/lead-score.js";
const bac = [
  ["LANH", []],
  ["AM", ["price","ship"]],
  ["NONG", ["buy"]],
  ["DANG_CHOT", ["phone","buy"]],
  ["SAT_DON", ["phone","address"]],
];
const max = bac.map(([_,sig]) => chamVaTinhNganSach("ok", { signals: sig }).budget.max);
const tangDan = max.every((v,i) => i===0 || v>=max[i-1]);
const tran = chamVaTinhNganSach("ok", { signals: ["phone","address","obj_price"] }).budget;
const hetNganSach = conNganSach({ max: 3, tier: "AM" }, 3);
console.log(`bang=${max.join(",")}|tangDan=${tangDan}|tran=${tran.max}|tranDungHARD=${tran.max===HARD_MAX_TURNS}|hetOk=${hetNganSach.ok}|coLyDo=${typeof hetNganSach.lyDo === "string" && hetNganSach.lyDo.length>10}`);
')"
so "bảng 5 bậc | tăng dần | trần | hết ngân sách" "${KQ5}"
bang "⑤ 1,3,6,10,12 tăng dần, trần=12=HARD_MAX_TURNS, hết ngân sách chặn có lý do" "${KQ5}" "bang=1,3,6,10,12|tangDan=true|tran=12|tranDungHARD=true|hetOk=false|coLyDo=true"

# ═══ ⑥ SEED MỒI — bo_luat_chung v1 rút từ prompts.js + ky_nang hỏi size ═══════════
muc "⑥ Seed mồi — bo_luat_chung v1 KHỚP prompts.js#CORE + ky_nang hỏi size đủ 3 team"
KQ6="$(nodex '
import { taoPool } from "./db/ket-noi.js";
import { seedBoLuatVaKyNang, MA_KY_NANG_HOI_SIZE } from "./db/di-tru/bo-luat-va-ky-nang.js";
import { CORE } from "./src/prompts.js";
const pool = taoPool();
const r1 = await seedBoLuatVaKyNang(pool); // lượt 2 (lượt 1 chạy ở phép ①/nội bộ mỗi nodex là process riêng nên đây là lượt ĐẦU của phép này)
const v1 = await pool.query("SELECT noi_dung FROM bo_luat_chung WHERE team_id IS NULL AND phien_ban=1");
const khop = v1.rows[0].noi_dung === CORE;
console.error(`[⑥ 200 ký tự đầu] ${v1.rows[0].noi_dung.slice(0,200)}`);
const kn = await pool.query("SELECT team_id FROM ky_nang WHERE ma=$1", [MA_KY_NANG_HOI_SIZE]);
const r2 = await seedBoLuatVaKyNang(pool); // idempotent — chạy lại
console.log(`khopCore=${khop}|soTeamKyNang=${kn.rowCount}|lanHaiThem=${r2.boLuatChung.them}|lanHaiGiuNguyen=${r2.kyNang.giuNguyen.length}`);
await pool.end();
')"
grep -h "^\[⑥" /tmp/l2m3-node-err.txt 2>/dev/null | sed 's/^/   /'
so "khớp CORE | số team có kỹ năng size | idempotent" "${KQ6}"
bang "⑥ khớp CORE, 3 team có kỹ năng, lượt 2 KHÔNG thêm mới" "${KQ6}" "khopCore=true|soTeamKyNang=3|lanHaiThem=false|lanHaiGiuNguyen=3"

# ═══ ⑦ node --test l2-m3 XANH + HỒI QUY l2-m1/l2-m2 KHÔNG GÃY ════════════════════
# Đếm bằng dòng tổng kết CHUẨN `ℹ pass`/`ℹ fail` của chính node --test — KHÔNG đếm ký
# hiệu ✔/✖ bằng grep thô: node in TRÙNG tên ca đỏ ở khối "failing tests:" cuối log (+
# một dòng "✖ failing tests:" tự nó cũng khớp `^✖ `), nên `grep -c '^✖ '` ăn gấp 2-3
# lần số ca đỏ THẬT — bẫy phát hiện khi VIẾT cổng này (chưa lộ ở l2-m2.sh/l3-m2.sh vì
# hai cổng đó chưa từng đỏ). ⚠️ `$?` PHẢI đọc NGAY sau lệnh `node --test` — đọc sau một
# lệnh `so`/`printf` khác là đọc nhầm rc của lệnh đó (luôn 0), một bẫy cổng-lỏng khác
# (án lệ #5) tự bắt được khi chạy thử tay.
dem_xanh_do() { # $1=file log node --test → in "xanh/do"
  local x d
  x=$(grep -oE '^ℹ pass [0-9]+' "$1" | grep -oE '[0-9]+' | tail -1)
  d=$(grep -oE '^ℹ fail [0-9]+' "$1" | grep -oE '[0-9]+' | tail -1)
  printf '%s/%s' "${x:-?}" "${d:-?}"
}

muc "⑦ Bộ ca l2-m3 xanh + hồi quy l2-m1/l2-m2"
LOG_M3="/tmp/l2m3-test.log"
node --test test/l2-m3-ngan-sach-luot.test.js test/l2-m3-rap-prompt.test.js test/l2-m3-handler.test.js >"${LOG_M3}" 2>&1
RC_M3=$?
so "bộ ca l2-m3   xanh/đỏ" "$(dem_xanh_do "${LOG_M3}")"
bang "⑦a bộ ca l2-m3 rc" "${RC_M3}" "0"

LOG_M1A="/tmp/l2m3-hoiquy-m1-hangdoi.log"
node --test test/l2-m1-hang-doi.test.js >"${LOG_M1A}" 2>&1
RC_M1A=$?
so "hồi quy l2-m1 hàng đợi   xanh/đỏ" "$(dem_xanh_do "${LOG_M1A}")"
bang "⑦b hồi quy l2-m1 hàng đợi rc" "${RC_M1A}" "0"

if node --experimental-test-module-mocks -e 'process.exit(0)' >/dev/null 2>&1; then
  LOG_M1B="/tmp/l2m3-hoiquy-m1-nhactruong.log"
  node --experimental-test-module-mocks --test test/l2-m1-nhac-truong.test.js >"${LOG_M1B}" 2>&1
  RC_M1B=$?
  so "hồi quy l2-m1 nhạc trưởng   xanh/đỏ" "$(dem_xanh_do "${LOG_M1B}")"
  bang "⑦c hồi quy l2-m1 nhạc trưởng rc" "${RC_M1B}" "0"
else
  truot "⑦c node không nhận --experimental-test-module-mocks — không đo được"
fi

LOG_M2A="/tmp/l2m3-hoiquy-m2-tukhoa.log"
node --test test/l2-m2-lop-tu-khoa.test.js >"${LOG_M2A}" 2>&1
RC_M2A=$?
so "hồi quy l2-m2 lớp từ khoá   xanh/đỏ" "$(dem_xanh_do "${LOG_M2A}")"
bang "⑦d hồi quy l2-m2 lớp từ khoá rc" "${RC_M2A}" "0"

# ⚠️ l2-m2-handler.test.js dùng CHUNG 1 hoi_thoai cho 6 ca (before() tạo 1 lần). Ngân
# sách THẬT (phiếu này) cắt đúng ranh giới hai ca chia sẻ hội thoại đó — KHÔNG phải
# hồi quy mới. Đo bằng TÊN ca đỏ (không phải chỉ đếm số) — án lệ #8 "so DANH SÁCH,
# không so SỐ" + luật v3.1 "thước biết phân biệt đỏ-vì-lỗi và đỏ-vì-thước-cũ". Chi
# tiết + đề xuất vá 1-3 dòng: §9 sổ điều hành (đất test của L2-M2, TỔNG vá).
muc "⑦e hồi quy l2-m2 handler (biết trước 1 ca đỏ do CHIA SẺ hoi_thoai — xem §9)"
LOG_M2B="/tmp/l2m3-hoiquy-m2-handler.log"
node --test test/l2-m2-handler.test.js >"${LOG_M2B}" 2>&1
SO_XANH_M2B=$(grep -oE '^ℹ pass [0-9]+' "${LOG_M2B}" | grep -oE '[0-9]+' | tail -1); SO_XANH_M2B="${SO_XANH_M2B:-0}"
SO_DO_M2B=$(grep -oE '^ℹ fail [0-9]+' "${LOG_M2B}" | grep -oE '[0-9]+' | tail -1); SO_DO_M2B="${SO_DO_M2B:-0}"
# Tên ca đỏ CHỈ lấy trong khối TUẦN TỰ đầu log (trước dòng "ℹ tests") — node --test in
# LẶP LẠI mọi ca đỏ ở khối "failing tests:" cuối log, lấy cả hai khối sẽ đếm/khai trùng.
TEN_DO_M2B="$(sed -n '1,/^ℹ tests/p' "${LOG_M2B}" | grep -E '^✖ ' | sed -E 's/^✖ //; s/ \([0-9.]+ms\)$//')"
so "xanh/đỏ | tên ca đỏ" "${SO_XANH_M2B}/${SO_DO_M2B} · ${TEN_DO_M2B:-<không có>}"
CA_BIET_TRUOC="không cướp diễn đàn (ở tầng handler) — câu ngoài 2 luật vẫn đi fastLane như trước, dù KB đủ dữ liệu"
if [ "${SO_DO_M2B}" -eq 1 ] && [ "${TEN_DO_M2B}" = "${CA_BIET_TRUOC}" ]; then
  dat "⑦e đúng 1 ca đỏ ĐÃ BIẾT TRƯỚC (§9) — KHÔNG phải hồi quy mới"
elif [ "${SO_DO_M2B}" -eq 0 ]; then
  dat "⑦e 0 ca đỏ — ca đã biết trước đã được vá (tốt hơn dự kiến)"
else
  truot "⑦e SỐ/TÊN ca đỏ KHÁC dự kiến — hồi quy MỚI, cần điều tra (không phải thước cũ)"
fi

printf '\n═══ TỔNG: %d phép · ĐẠT %d · TRƯỢT %d\n' "${PHEP}" "$((PHEP - LOI))" "${LOI}"
[ "${LOI}" -eq 0 ]
