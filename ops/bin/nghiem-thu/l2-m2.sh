#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU L2-M2 — Lớp từ khoá v3 (2 luật Botcake chưa phủ: thật/giả +
# hỏi size) + vá lỗ `paano mag order`. Thi hành đúng 6 phép của ④ trong
# docs/thi-cong/phieu/PHIEU-L2-M2.md.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT BẢNG ĐẾM. Không dòng nào chỉ nói "chạy xong
#       không lỗi". Cùng khuôn ops/bin/nghiem-thu/l2-m1.sh (cố ý).
#
# Cổng TỰ DỰNG CSDL sandbox `aicloser_v3_nt_l2m2` từ khuôn trần rồi TỰ DỌN — không đo
# trên CSDL dev (luật 11 sổ điều hành). Phép ⑥ còn dựng THÊM 1-2 sandbox riêng qua
# `db/sandbox.js` (bên trong chính các tệp test/l2-m2-*.test.js) — độc lập với sandbox
# của cổng này, tự dọn theo `after()` của Node test runner.
#
#   bash ops/bin/nghiem-thu/l2-m2.sh                # chạy đủ 6 phép
#   GIU_SANDBOX=1 bash ops/bin/nghiem-thu/l2-m2.sh  # giữ CSDL lại để soi tay
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

CONTAINER="talpha-pg"
DB="aicloser_v3_nt_l2m2"
LOI=0
PHEP=0

# ── khung in (giống hệt l2-m1.sh) ───────────────────────────────────────────────
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

# Chạy một khối ESM; in đúng NỘI DUNG stdout (DÒNG CUỐI), hoặc "LOI-NODE" khi rc≠0 —
# KHÔNG in nguyên văn lỗi (án lệ #10 skill tho-thi-cong ở dạng khác: banner import lọt
# vào stdout làm phép so chuỗi trượt trong khi số đo thì đúng). Dòng debug thì in ra
# stderr (console.error) — không lẫn vào giá trị được so.
nodex() {
  local out
  if out="$(node --input-type=module -e "$1" 2>/tmp/l2m2-node-err.txt)"; then
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

echo "CỔNG NGHIỆM THU L2-M2 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo: ${DB} (sandbox tự dựng/tự dọn) · môi trường: DEV (máy cá nhân)"

# áp migration một lượt lên sandbox rỗng (không thêm migration nào ở phiếu này —
# phép này chỉ để bảng tồn tại cho ①③⑤ dùng qua handler thật).
nodex '
import { taoPool } from "./db/ket-noi.js";
import { len } from "./db/migrate.js";
const pool = taoPool();
await len(pool, { im: true });
await pool.end();
console.log("da_ap");
' >/dev/null

# ═══ ① BẮT ĐÚNG — ≥12 câu thật/giả + ≥8 câu size (đa ngôn ngữ), qua HANDLER thật ═
# In từng câu + lane bằng bảng debug (stderr), gate bằng tỉ lệ bắt đúng + 0 lượt
# gọi model (đếm qua spy `chayCloser` — xem giải thích thuật ngữ ở đầu
# test/l2-m2-handler.test.js: `layModel` tra cấu hình chạy KHÔNG ĐIỀU KIỆN ở bước 2
# của handler cho MỌI tin, kiến trúc L2-M1 có sẵn — tín hiệu "0 token" đúng nghĩa là
# `chayCloser`/`dem.goiModel`, không phải hàm `layModel`).
muc "① Bắt đúng ≥12 câu thật/giả + ≥8 câu size (đa ngôn ngữ EN/PH/AR)"
KQ1="$(nodex '
import { taoPool } from "./db/ket-noi.js";
import { xepTin, docTinTheoId } from "./src/queue/kho.js";
import { xuLyMotTin } from "./src/chat/handler-v3.js";
const pool = taoPool();
const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
const p = (await pool.query("INSERT INTO page (team_id,page_id,ten) VALUES ($1,$2,$3) RETURNING id",[t,"800000000000010","cổng L2-M2 p1"])).rows[0].id;
await pool.query("INSERT INTO hoi_thoai (team_id,page_id,psid,trang_thai,chu_so_huu) VALUES ($1,$2,$3,$4,$5)",[t,p,"psid-l2m2-1","QUALIFY","AI"]);
const kb = { config: {
  fastLaneAuth: "Oo po, 100% original — may seal + warranty card. 😊",
  fastLaneSize: "📏 S(34-36) · M(38-40) · L(42-44) · XL(46-48)",
} };
const authCau = ["is this real?","is it fake?","is it genuine?","is it authentic?","are they authentic?","is it legit?","orig ba to?","original po ba ito?","totoo po ba?","peke ba to?","hindi po peke?","tunay ba ito?","هل هذا اصلي؟","هل هو أصلي ولا تقليد؟"];
const sizeCau = ["what size do you have?","size chart please","sizing guide?","available sizes?","meron po ba size L?","ano po ang size niyo?","pwede po malaman ang sukat?","mga sukat po?"];
let demChayCloser = 0, seq = 0;
async function motLuot(noiDung) {
  seq++;
  const r = await xepTin(pool, { teamId: t, pageId: "800000000000010", psid: "psid-l2m2-1", convId: "conv-l2m2-1", custId: "k", msgId: `p1-${seq}`, noiDung });
  const tin = await docTinTheoId(pool, r.id, t);
  return xuLyMotTin(pool, tin, {
    layKb: () => kb,
    cua: { guiTin: async () => ({ok:true,id:"x"}), guiAnh: async()=>({ok:true,id:"x"}), ghiNote: async()=>({ok:true}), gatThe: async()=>({ok:true,tags:[]}) },
    chayCloser: async () => { demChayCloser++; return "KHONG-NEN-TOI-DAY"; },
    phanLoai: async () => ({intent:"other", is_spam_conf:0}),
    lanNhanh: () => ({handled:false, reply:null, lane:"", reason:"stub"}),
    kiemTinRa: () => ({ok:true}),
  });
}
let okAuth = 0, okSize = 0;
for (const c of authCau) { const kq = await motLuot(c); const ok = kq.lyDo === "tu_khoa_v3:that_gia"; if (ok) okAuth++; console.error(`[auth] "${c}" -> ${kq.lyDo}`); }
for (const c of sizeCau) { const kq = await motLuot(c); const ok = kq.lyDo === "tu_khoa_v3:hoi_size"; if (ok) okSize++; console.error(`[size] "${c}" -> ${kq.lyDo}`); }
console.log(`${okAuth}/${authCau.length}|${okSize}/${sizeCau.length}|goiModel=${demChayCloser}`);
await pool.end();
')"
grep -h "^\[auth\]\|^\[size\]" /tmp/l2m2-node-err.txt 2>/dev/null | sed 's/^/   /'
so "khớp thật/giả | khớp size | lượt gọi model" "${KQ1}"
bang "① bắt đúng ≥12 thật/giả · ≥8 size · 0 lượt model" "${KQ1}" "14/14|8/8|goiModel=0"

# ═══ ② VÁ `paano mag order` — ≥3 biến thể, ĐỐI CHỨNG bản cũ KHÔNG bắt ═══════════
muc "② Vá paano — biến thể tách chữ, đối chứng bản cũ fastLane KHÔNG bắt"
KQ2="$(nodex '
import { lopTuKhoa } from "./src/chat/lop-tu-khoa.js";
const ASK_HOWTO_BAN_CU = /(how to order|how do i order|how can i order|paano (?:mag)?(?:order|umorder|bumili)|pano (?:mag)?order|pa ?order|kaano|كيف أطلب|كيفية الطلب|طريقة الطلب)/i;
const bienThe = ["paano mag order","paano mag-order","pano mag order","pano mag-order","paano po mag order","paano ba mag-umorder"];
const kb = { config: { fastLaneHowto: "Send Name+Number+Address. COD po." } };
let bcuKhongBat = 0, moiBatDung = 0;
for (const c of bienThe) {
  const cuBat = ASK_HOWTO_BAN_CU.test(c);
  if (!cuBat) bcuKhongBat++;
  const r = lopTuKhoa({ text: c, kb });
  console.error(`[paano] "${c}" · bản_cũ=${cuBat ? "BẮT" : "trượt"} · lớp_mới=${r.handled ? r.rule : "khong-bat"}`);
  if (r.handled && r.rule === "paano_gap" && r.reply === kb.config.fastLaneHowto) moiBatDung++;
}
console.log(`${bienThe.length}|${bcuKhongBat}|${moiBatDung}`);
')"
grep -h "^\[paano\]" /tmp/l2m2-node-err.txt 2>/dev/null | sed 's/^/   /'
so "tổng biến thể | bản cũ trượt | lớp mới bắt đúng" "${KQ2}"
bang "② paano ≥3 biến thể — bản cũ trượt hết, lớp mới bắt hết" "${KQ2}" "6|6|6"

# ═══ ③ NHƯỜNG ĐÚNG — thiếu KB size → không đáp, model ĐƯỢC gọi (spy=1) ═══════════
muc "③ NHƯỜNG đúng — page KHÔNG có KB size → không bịa, model ĐƯỢC gọi"
KQ3="$(nodex '
import { taoPool } from "./db/ket-noi.js";
import { xepTin, docTinTheoId } from "./src/queue/kho.js";
import { xuLyMotTin } from "./src/chat/handler-v3.js";
const pool = taoPool();
const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
const p = (await pool.query("INSERT INTO page (team_id,page_id,ten) VALUES ($1,$2,$3) RETURNING id",[t,"800000000000030","cổng L2-M2 p3"])).rows[0].id;
await pool.query("INSERT INTO hoi_thoai (team_id,page_id,psid,trang_thai,chu_so_huu) VALUES ($1,$2,$3,$4,$5)",[t,p,"psid-l2m2-3","QUALIFY","AI"]);
const kbRong = { config: {} };
let demChayCloser = 0, demGuiTin = 0;
const r = await xepTin(pool, { teamId: t, pageId: "800000000000030", psid: "psid-l2m2-3", convId: "conv-l2m2-3", custId: "k", msgId: "p3-1", noiDung: "what size do you have?" });
const tin = await docTinTheoId(pool, r.id, t);
const kq = await xuLyMotTin(pool, tin, {
  layKb: () => kbRong,
  cua: { guiTin: async () => { demGuiTin++; return {ok:true,id:"x"}; }, guiAnh: async()=>({ok:true,id:"x"}), ghiNote: async()=>({ok:true}), gatThe: async()=>({ok:true,tags:[]}) },
  chayCloser: async () => { demChayCloser++; return "stub AI reply"; },
  phanLoai: async () => ({intent:"other", is_spam_conf:0}),
  lanNhanh: () => ({handled:false, reply:null, lane:"", reason:"stub"}),
  kiemTinRa: () => ({ok:true}),
});
const soAiHang = (await pool.query("SELECT lane FROM so_ai WHERE team_id=$1 AND loai=$2 ORDER BY id DESC LIMIT 1",[t,"reply"])).rows[0];
console.log(`${kq.dem.goiModel}|${demChayCloser}|${demGuiTin}|${soAiHang?.lane}`);
await pool.end();
')"
so "dem.goiModel | lượt chayCloser | lượt guiTin | so_ai.lane" "${KQ3}"
bang "③ không đáp từ lớp từ khoá — model ĐƯỢC gọi, so_ai lane=AI" "${KQ3}" "1|1|1|AI"

# ═══ ④ KHÔNG CƯỚP DIỄN ĐÀN — 10 câu ngoài 2 luật, DÙ KB đủ dữ liệu ═══════════════
muc "④ Không cướp diễn đàn — 10 câu ngoài 2 luật, KHÔNG bắt dù KB có đủ dữ liệu"
KQ4="$(nodex '
import { lopTuKhoa } from "./src/chat/lop-tu-khoa.js";
const kbDay = { config: { fastLaneAuth: "x", fastLaneSize: "y", fastLaneHowto: "z" } };
const cauNgoai = ["magkano po ang presyo?","how much is this","san po kayo located?","what is your address","salamat po","thank you","ok","hi po good morning","kailan darating ang order","free shipping ba?"];
let khongBat = 0;
for (const c of cauNgoai) { const r = lopTuKhoa({ text: c, kb: kbDay }); console.error(`[ngoai] "${c}" -> handled=${r.handled}`); if (!r.handled) khongBat++; }
console.log(`${khongBat}/${cauNgoai.length}`);
')"
grep -h "^\[ngoai\]" /tmp/l2m2-node-err.txt 2>/dev/null | sed 's/^/   /'
so "số câu KHÔNG bị bắt / tổng" "${KQ4}"
bang "④ 10 câu ngoài phạm vi — 0 câu bị cướp" "${KQ4}" "10/10"

# ═══ ⑤ SO_AI — lane='tu_khoa_v3', 0 token (SELECT thật) ═════════════════════════
muc "⑤ so_ai: lượt bắt được ghi lane='tu_khoa_v3', ma_model=khong-goi-model, 0 token"
KQ5="$(nodex '
import { taoPool } from "./db/ket-noi.js";
import { xepTin, docTinTheoId } from "./src/queue/kho.js";
import { xuLyMotTin } from "./src/chat/handler-v3.js";
const pool = taoPool();
const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
const p = (await pool.query("INSERT INTO page (team_id,page_id,ten) VALUES ($1,$2,$3) RETURNING id",[t,"800000000000050","cổng L2-M2 p5"])).rows[0].id;
await pool.query("INSERT INTO hoi_thoai (team_id,page_id,psid,trang_thai,chu_so_huu) VALUES ($1,$2,$3,$4,$5)",[t,p,"psid-l2m2-5","QUALIFY","AI"]);
const kb = { config: { fastLaneAuth: "A", fastLaneSize: "S", fastLaneHowto: "H" } };
const deps = {
  layKb: () => kb,
  cua: { guiTin: async()=>({ok:true,id:"x"}), guiAnh: async()=>({ok:true,id:"x"}), ghiNote: async()=>({ok:true}), gatThe: async()=>({ok:true,tags:[]}) },
  chayCloser: async () => "KHONG-NEN-TOI-DAY",
  phanLoai: async () => ({intent:"other", is_spam_conf:0}),
  lanNhanh: () => ({handled:false, reply:null, lane:"", reason:"stub"}),
  kiemTinRa: () => ({ok:true}),
};
let seq = 0;
async function motLuot(noiDung) {
  seq++;
  const r = await xepTin(pool, { teamId: t, pageId: "800000000000050", psid: "psid-l2m2-5", convId: "conv-l2m2-5", custId: "k", msgId: `p5-${seq}`, noiDung });
  const tin = await docTinTheoId(pool, r.id, t);
  return xuLyMotTin(pool, tin, deps);
}
await motLuot("is this original?");
await motLuot("size chart please");
await motLuot("paano mag order");
// Lọc thêm page_id CỦA CHÍNH phép này — team `tieu-alpha` dùng CHUNG cho ①③⑤ trong
// cùng một sandbox script, không lọc page thì đếm dính cả 22 dòng của phép ①.
const r = await pool.query("SELECT lane, ma_model, token_vao, token_ra FROM so_ai WHERE team_id=$1 AND lane=$2 AND page_id=$3 ORDER BY id", [t, "tu_khoa_v3", "800000000000050"]);
console.error(`[so_ai] ${JSON.stringify(r.rows)}`);
const tong = r.rows.length;
const okHet = r.rows.every((x) => x.ma_model === "khong-goi-model" && x.token_vao === null && x.token_ra === null);
console.log(`${tong}|${okHet}`);
await pool.end();
')"
grep -h "^\[so_ai\]" /tmp/l2m2-node-err.txt 2>/dev/null | sed 's/^/   /'
so "số dòng so_ai lane=tu_khoa_v3 | tất cả 0 token" "${KQ5}"
bang "⑤ so_ai ghi đúng lane + ma_model + 0 token" "${KQ5}" "3|true"

# ═══ ⑥ BỘ CA node --test XANH + HỒI QUY L2-M1 KHÔNG GÃY ═════════════════════════
muc "⑥ Bộ ca test/l2-m2-*.test.js xanh + hồi quy l2-m1 không gãy"
LOG_M2="/tmp/l2m2-test.log"
node --test test/l2-m2-lop-tu-khoa.test.js test/l2-m2-handler.test.js >"${LOG_M2}" 2>&1
RC_M2=$?
so "bộ ca l2-m2   xanh/đỏ" "$(grep -cE '^✔ ' "${LOG_M2}") / $(grep -cE '^✖ ' "${LOG_M2}")"
bang "⑥a bộ ca l2-m2 rc" "${RC_M2}" "0"

LOG_HD="/tmp/l2m2-hoiquy-hangdoi.log"
node --test test/l2-m1-hang-doi.test.js >"${LOG_HD}" 2>&1
RC_HD=$?
so "hồi quy l2-m1 hàng đợi   xanh/đỏ" "$(grep -cE '^✔ ' "${LOG_HD}") / $(grep -cE '^✖ ' "${LOG_HD}")"
bang "⑥b hồi quy l2-m1 hàng đợi rc" "${RC_HD}" "0"

if node --experimental-test-module-mocks -e 'process.exit(0)' >/dev/null 2>&1; then
  LOG_NT="/tmp/l2m2-hoiquy-nhactruong.log"
  node --experimental-test-module-mocks --test test/l2-m1-nhac-truong.test.js >"${LOG_NT}" 2>&1
  RC_NT=$?
  so "hồi quy l2-m1 nhạc trưởng   xanh/đỏ" "$(grep -cE '^✔ ' "${LOG_NT}") / $(grep -cE '^✖ ' "${LOG_NT}")"
  bang "⑥c hồi quy l2-m1 nhạc trưởng rc" "${RC_NT}" "0"
else
  truot "⑥c node không nhận --experimental-test-module-mocks — không đo được hồi quy nhạc trưởng"
fi

printf '\n═══ TỔNG: %d phép · ĐẠT %d · TRƯỢT %d\n' "${PHEP}" "$((PHEP - LOI))" "${LOI}"
[ "${LOI}" -eq 0 ]
