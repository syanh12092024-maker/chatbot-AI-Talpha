#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU L2-M1 — Đường xử lý tin nền mới: hàng đợi + handler v3,
# MỌI outbound qua cửa. Thi hành đúng 9 phép của ④ trong docs/thi-cong/phieu/PHIEU-L2-M1.md.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT BẢNG ĐẾM. Không dòng nào chỉ nói "chạy xong
#       không lỗi". Cùng khuôn ops/bin/nghiem-thu/l1-m2.sh (cố ý — một cách đọc cổng
#       cho mọi phiếu).
#
# Cổng TỰ DỰNG CSDL sandbox `aicloser_v3_nt_l2m1` từ khuôn trần rồi TỰ DỌN — không đo
# trên CSDL dev đang giữ 18.790 hội thoại thật (luật 11 sổ điều hành).
#
#   bash ops/bin/nghiem-thu/l2-m1.sh                # chạy đủ 9 phép
#   GIU_SANDBOX=1 bash ops/bin/nghiem-thu/l2-m1.sh  # giữ CSDL lại để soi tay
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

CONTAINER="talpha-pg"
DB="aicloser_v3_nt_l2m1"
LOI=0
PHEP=0

# ── khung in (giống hệt l1-m2.sh) ───────────────────────────────────────────────
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

# Chạy một khối ESM; in đúng NỘI DUNG stdout, hoặc "LOI-NODE" khi rc≠0 — KHÔNG in nguyên
# văn lỗi (hai lượt cùng hỏng ra hai chuỗi BẰNG NHAU thì phép so đọc nhầm ĐẠT).
#
# ⚠️ CHỈ LẤY DÒNG CUỐI. `src/llm.js:41` in một BANNER ra stdout ngay lúc import
#    («[llm] Nhà cung cấp AI: kimi … closer=…»), nên phép ⑧ (có import llm.js) nhận về
#    HAI dòng và so chuỗi trượt — trong khi số đo thì đúng. Đây đúng cái án lệ #10 của
#    skill tho-thi-cong ở dạng khác: `pm2 pid` trộn banner vào stdout. Mọi khối dưới in
#    ĐÚNG MỘT dòng kết quả, nên `tail -1` là phép cắt an toàn, không phải bịt lỗi.
nodex() {
  local out
  if out="$(node --input-type=module -e "$1" 2>/tmp/l2m1-node-err.txt)"; then
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

echo "CỔNG NGHIỆM THU L2-M1 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo: ${DB} (sandbox tự dựng/tự dọn) · môi trường: DEV (máy cá nhân)"

# ═══ ① MIGRATION 003 — 2 lượt lũy đẳng + down→up trên CSDL ĐÃ CÓ DỮ LIỆU ══════════
muc "① Migration 003_tin_cho_xu_ly"
KQ1="$(nodex '
import { taoPool } from "./db/ket-noi.js";
import { len, xuong, daAp } from "./db/migrate.js";
const pool = taoPool();
const lan1 = await len(pool, { im: true });
const lan2 = await len(pool, { im: true });
// gieo dữ liệu THẬT rồi mới diễn tập down (án lệ: down phải chạy trên DB đã seed)
const t = (await pool.query("SELECT id FROM team WHERE slug=$1", ["tieu-alpha"])).rows[0].id;
const p = (await pool.query("INSERT INTO page (team_id,page_id,ten) VALUES ($1,$2,$3) RETURNING id",[t,"800000000000001","cổng L2-M1"])).rows[0].id;
await pool.query("INSERT INTO hoi_thoai (team_id,page_id,psid,trang_thai,chu_so_huu) VALUES ($1,$2,$3,$4,$5)",[t,p,"psid-cong","QUALIFY","AI"]);
await pool.query("INSERT INTO tin_cho_xu_ly (team_id,page_id,psid,conv_id,msg_id,noi_dung) VALUES ($1,$2,$3,$4,$5,$6)",[t,"800000000000001","psid-cong","conv-cong","m0","seed"]);
// gỡ LÙI cho tới khi 003 rời _migrations (cây có phiên song song — đừng neo "003 là mới nhất")
let go = [], v = 0;
while (v++ < 20) { const g = await xuong(pool, { im: true }); if (!g.length) break; go.push(...g); if (g.includes("003_tin_cho_xu_ly")) break; }
const con = (await pool.query("SELECT to_regclass($1) t, to_regclass($2) h",["public.tin_cho_xu_ly","public.hoi_thoai"])).rows[0];
await len(pool, { im: true });
const ap = await daAp(pool);
console.log(JSON.stringify({
  ap_lan1: lan1.length > 0, ap_lan2: lan2.length,
  go_co_003: go.includes("003_tin_cho_xu_ly"),
  sau_down_bang_tin: con.t, sau_down_con_hoi_thoai: con.h !== null,
  ap_lai_co_003: ap.includes("003_tin_cho_xu_ly"),
}));
await pool.end();
')"
so "kết quả ①" "${KQ1}"
bang "①a áp lượt 2 (số bản mới)" "$(printf '%s' "${KQ1}" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).ap_lan2' 2>/dev/null || echo LOI-NODE)" "0"
bang "①b down gỡ được 003" "$(printf '%s' "${KQ1}" | node -pe 'String(JSON.parse(require("fs").readFileSync(0,"utf8")).go_co_003)' 2>/dev/null || echo LOI-NODE)" "true"
bang "①c down KHÔNG đụng bảng của 001" "$(printf '%s' "${KQ1}" | node -pe 'String(JSON.parse(require("fs").readFileSync(0,"utf8")).sau_down_con_hoi_thoai)' 2>/dev/null || echo LOI-NODE)" "true"
bang "①d up lại có 003" "$(printf '%s' "${KQ1}" | node -pe 'String(JSON.parse(require("fs").readFileSync(0,"utf8")).ap_lai_co_003)' 2>/dev/null || echo LOI-NODE)" "true"

# `db/schema.sql` là bản SINH RA — so NỘI DUNG TRÊN ĐĨA với bản sinh lại, lệch là đỏ
# (luật của L0-M1, ca S11). ⛔ KHÔNG so bằng `git diff`: cổng sẽ đỏ chỉ vì bản migration
# mới CHƯA COMMIT — đó là đo "đã commit chưa", không phải "hai nguồn có trôi khỏi nhau
# không". Và cổng KHÔNG tự ghi lại tệp: một cổng sửa cây là cổng tự chứng nhận cho mình.
KQ1E="$(nodex '
import fs from "node:fs";
import { sinhSchema } from "./db/migrate.js";
const tren_dia = fs.readFileSync("db/schema.sql", "utf8");
console.log(tren_dia === sinhSchema() ? "khop" : "lech");
')"
so "db/schema.sql vs sinh lại từ db/migrate/" "${KQ1E}"
bang "①e schema.sql không trôi khỏi migrate/" "${KQ1E}" "khop"
# ⚠️ PHỐI HỢP HAI PHIẾU (22/08): `db/schema.sql` là tệp SINH RA từ CẢ THƯ MỤC migrate/, mà
# cây này có hai phiếu chạy song song (L2-M1 thêm 003, L3-M1 thêm 004). Ai commit tệp này
# trước là kéo migration của người kia vào commit của mình, và HEAD thành mâu thuẫn
# (schema.sql khai một bản migration chưa có trong git). Cả hai phiếu cố ý KHÔNG commit nó;
# TỔNG sinh lại MỘT LƯỢT sau khi 003 và 004 đã gộp. Phép ①e đo NỘI DUNG TRÊN ĐĨA nên nó
# vẫn nói thật về «hai nguồn có trôi khỏi nhau không» — chỉ cần chạy
# `node db/migrate.js schema` sau mỗi lần thêm bản. Đã ghi §9 sổ điều hành.

# ═══ ② XẾP TIN LŨY ĐẲNG ═════════════════════════════════════════════════════════
muc "② Xếp tin lũy đẳng — bơm CÙNG 1 tin 2 lần"
KQ2="$(nodex '
import { taoPool } from "./db/ket-noi.js";
import { xepTin } from "./src/queue/kho.js";
const pool = taoPool();
const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
const tin = { teamId: t, pageId: "800000000000001", psid: "psid-cong", convId: "conv-dup", custId: "k", msgId: "m-dup", noiDung: "xin chào" };
const a = await xepTin(pool, tin);
const b = await xepTin(pool, { ...tin, noiDung: "xin chào (lượt 2)" });
const n = (await pool.query("SELECT count(*)::int n FROM tin_cho_xu_ly WHERE msg_id=$1",["m-dup"])).rows[0].n;
console.log(`${a.them}|${b.them}|${n}`);
await pool.end();
')"
so "them lượt1 | them lượt2 | số dòng" "${KQ2}"
bang "② số dòng sau 2 lượt bơm cùng tin" "${KQ2}" "true|false|1"

# ═══ ③ KHOÁ HỘI THOẠI (N2) — phép KHẲNG ĐỊNH ════════════════════════════════════
muc "③ Khoá HỘI THOẠI: 2 worker × 2 tin cùng conv / khác conv"
KQ3="$(nodex '
import { taoPool } from "./db/ket-noi.js";
import { xepTin, moPhienRut, TRANG_THAI } from "./src/queue/kho.js";
const pool = taoPool();
const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
await pool.query("DELETE FROM tin_cho_xu_ly");
const mau = (o) => ({ teamId: t, pageId: "800000000000001", psid: "psid-cong", custId: "k", noiDung: "x", ...o });
await xepTin(pool, mau({ convId: "conv-K", msgId: "k1" }));
await xepTin(pool, mau({ convId: "conv-K", msgId: "k2" }));
const A = await moPhienRut(pool, { khoaWorker: "A" });
const B = await moPhienRut(pool, { khoaWorker: "B" });   // cùng conv → phải 0 dòng
const bTruoc = B ? 1 : 0;
await A.ketThuc(TRANG_THAI.XONG, "cổng");
const B2 = await moPhienRut(pool, { khoaWorker: "B" });  // A nhả → phải 1 dòng
const bSau = B2 ? 1 : 0;
if (B2) await B2.ketThuc(TRANG_THAI.XONG, "cổng");
// khác conv → hai worker song song
await pool.query("DELETE FROM tin_cho_xu_ly");
await xepTin(pool, mau({ convId: "conv-P", msgId: "p1" }));
await xepTin(pool, mau({ convId: "conv-Q", msgId: "q1" }));
const C = await moPhienRut(pool, { khoaWorker: "C" });
const D = await moPhienRut(pool, { khoaWorker: "D" });
const songSong = (C ? 1 : 0) + (D ? 1 : 0);
if (C) await C.ketThuc(TRANG_THAI.XONG, "cổng");
if (D) await D.ketThuc(TRANG_THAI.XONG, "cổng");
console.log(`${bTruoc}|${bSau}|${songSong}`);
await pool.end();
')"
so "B rút khi A giữ | B rút sau khi A nhả | 2 conv khác" "${KQ3}"
bang "③ khoá hội thoại (0 · 1 · 2)" "${KQ3}" "0|1|2"

# ═══ ③b NGUỒN FAIL-CLOSED (N1a) ═════════════════════════════════════════════════
muc "③b Van NGUỒN fail-closed — PANCAKE_READONLY / V3_NAP_DEV"
KQ3B="$(nodex '
import { taoPool } from "./db/ket-noi.js";
import { napTuPoll } from "./src/queue/nap.js";
const pool = taoPool();
await pool.query("DELETE FROM tin_cho_xu_ly");
const convs = [{ id: "conv-nap", from_psid: "psid-cong", customers: [{ id: "k" }] }];
const msgs = [{ id: "n1", from: { id: "800000000000001" }, message: "chào" },
              { id: "n2", from: { id: "psid-cong" }, message: "giá bao nhiêu" }];
const deps = { docHoiThoai: async () => convs, docTin: async () => msgs };
process.env.PANCAKE_READONLY = "1"; delete process.env.V3_NAP_DEV;
const dong = await napTuPoll(pool, { pageId: "800000000000001" }, { docHoiThoai: async () => { throw new Error("KHÔNG được gọi cửa khi van ĐÓNG"); } });
const nDong = (await pool.query("SELECT count(*)::int n FROM tin_cho_xu_ly")).rows[0].n;
process.env.V3_NAP_DEV = "1";
const mo = await napTuPoll(pool, { pageId: "800000000000001" }, deps);
const nMo = (await pool.query("SELECT count(*)::int n FROM tin_cho_xu_ly")).rows[0].n;
console.error("LÝ DO KHI ĐÓNG: " + dong.lyDo);
console.log(`${dong.mo}|${nDong}|${mo.mo}|${nMo}`);
await pool.end();
')"
grep -h "LÝ DO KHI ĐÓNG" /tmp/l2m1-node-err.txt 2>/dev/null | sed 's/^/   /' || true
so "van mở? | dòng khi ĐÓNG | van mở? | dòng khi V3_NAP_DEV=1" "${KQ3B}"
bang "③b fail-closed + đối chứng dương" "${KQ3B}" "false|0|true|1"

# ═══ ④ PHÉP ĐẮT NHẤT — CÔ LẬP BỘ NÃO, BA DÂN SỐ ═════════════════════════════════
muc "④ Cô lập bộ não (N1) — mock pancake.js + messenger.js + pancake-orders.js, BA dân số"
if node --experimental-test-module-mocks -e 'process.exit(0)' >/dev/null 2>&1; then
  LOG_NT="/tmp/l2m1-nhac-truong.log"
  node --experimental-test-module-mocks --test test/l2-m1-nhac-truong.test.js >"${LOG_NT}" 2>&1
  RC_NT=$?
  echo "   ── BẢNG ĐẾM BA DÂN SỐ (a=tin thường · b=ép chốt đơn · c=ép chuyển người):"
  grep -E '^\s+\[(a|b|c|guard)\] ' "${LOG_NT}" | sed 's/^/  /'
  echo "   ── bảng phụ:"
  grep -E '^\s+\[(so_ai|DI|đơn|idempotent)\] ' "${LOG_NT}" | sed 's/^/  /'
  SO_XANH="$(grep -cE '^✔ ' "${LOG_NT}")"
  SO_DO="$(grep -cE '^✖ ' "${LOG_NT}")"
  so "bộ ca nhạc trưởng: xanh / đỏ" "${SO_XANH} / ${SO_DO}"
  bang "④ bộ ca nhạc trưởng rc" "${RC_NT}" "0"
  # Ba dân số phải CÙNG CÓ MẶT — "nhánh không chạy" không tính là đạt (phiếu ④#4).
  for d in a b c; do
    if grep -qE "^\s+\[${d}\] " "${LOG_NT}"; then dat "④ dân số ${d} CÓ CHẠY (in bảng đếm)"
    else truot "④ dân số ${d} KHÔNG chạy — nhánh không chạy không tính là đạt"; fi
  done
  # 0 lượt LỌT RA NGOÀI mock ở CẢ BA dân số (bẫy globalThis.fetch).
  N_LOT="$(grep -oE 'fetch-lọt=[0-9]+' "${LOG_NT}" | grep -cv 'fetch-lọt=0')"
  bang "④ số dân số có HTTP lọt ra ngoài mock" "${N_LOT}" "0"
  # Tin chữ KHÔNG BAO GIỜ được đi đường ngầm (pkSendReply) ở bất kỳ dân số nào.
  N_NGAM="$(grep -oE 'pkSendReply=[0-9]+' "${LOG_NT}" | grep -cv 'pkSendReply=0')"
  bang "④ số dân số có tin chữ đi đường NGẦM" "${N_NGAM}" "0"
else
  truot "④ node không nhận --experimental-test-module-mocks — không đo được phép đắt nhất"
  RC_NT=1
fi

# ═══ ⑤+⑥b GUARD ĐÓNG → chan_guard, KHÔNG retry ══════════════════════════════════
muc "⑤/⑥b Guard đóng → trạng thái 'chan_guard' (KHÔNG phải 'loi'), không retry"
KQ5="$(nodex '
import { taoPool } from "./db/ket-noi.js";
import { xepTin, moPhienRut, docTinTheoId, TRANG_THAI } from "./src/queue/kho.js";
const pool = taoPool();
const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
await pool.query("DELETE FROM tin_cho_xu_ly");
const r = await xepTin(pool, { teamId: t, pageId: "800000000000001", psid: "psid-cong", convId: "conv-G", custId: "k", msgId: "g1", noiDung: "x" });
const A = await moPhienRut(pool, { khoaWorker: "A" });
await A.ketThuc(TRANG_THAI.CHAN_GUARD, "cửa gửi ĐÓNG (V3_PANCAKE_GUI)");
const sau = await docTinTheoId(pool, r.id, t);
const B = await moPhienRut(pool, { khoaWorker: "B" });   // phải KHÔNG nhặt lại
console.log(`${sau.trang_thai}|${sau.so_lan_thu}|${B ? "NHAT-LAI" : "khong-nhat"}`);
if (B) await B.huy();
await pool.end();
')"
so "trạng thái | số lần thử | worker vòng sau" "${KQ5}"
bang "⑤/⑥b chan_guard đứng yên, không retry" "${KQ5}" "chan_guard|1|khong-nhat"

# ═══ ⑥ SỔ AI ĐỦ LOẠI + ma_model không phải hằng bịa ══════════════════════════════
muc "⑥ Sổ AI đủ 5 loại của §11.2 + ma_model đổi theo model (đo trong bộ ca ④)"
if [ "${RC_NT:-1}" = "0" ]; then
  DONG_SOAI="$(grep -oE '\[so_ai\] bảng đếm theo loại: \{.*\}' "${LOG_NT}" | head -1 | sed 's/.*: //')"
  so "bảng đếm so_ai theo loại" "${DONG_SOAI:-KHÔNG ĐỌC ĐƯỢC}"
  THIEU=""
  for loai in reply image order handoff spent_no_send; do
    case "${DONG_SOAI}" in *"\"${loai}\""*) ;; *) THIEU="${THIEU} ${loai}";; esac
  done
  if [ -z "${THIEU}" ]; then dat "⑥ đủ 5 loại sự kiện (reply·image·order·handoff·spent_no_send)"
  else truot "⑥ THIẾU loại:${THIEU}"; fi
  DONG_MA="$(grep -oE '\[DI\] ma_model hai lượt: \[.*\]' "${LOG_NT}" | head -1 | sed 's/.*: //')"
  so "ma_model hai lượt (đổi mock model)" "${DONG_MA:-KHÔNG ĐỌC ĐƯỢC}"
  bang "⑥ ma_model đổi theo model" "${DONG_MA}" '["mo-hinh-A","mo-hinh-B"]'
else
  truot "⑥ không đo được — bộ ca ④ không chạy"
fi

# ═══ ⑦ autoCreateOrder GIỮ TẮT ══════════════════════════════════════════════════
muc "⑦ autoCreateOrder giữ TẮT + không dòng don_hang nào sinh từ lượt test"
KQ7="$(nodex '
import { taoPool } from "./db/ket-noi.js";
import { config } from "./src/config.js";
const pool = taoPool();
const n = (await pool.query("SELECT count(*)::int n FROM don_hang")).rows[0].n;
console.log(`${config.autoCreateOrder}|${n}`);
await pool.end();
')"
so "config.autoCreateOrder | số dòng don_hang" "${KQ7}"
bang "⑦ van tạo đơn TẮT, 0 đơn sinh ra" "${KQ7}" "false|0"

# ═══ ⑧ CHỖ CẮM MODEL (DI) ═══════════════════════════════════════════════════════
muc "⑧ layModel: mặc định trả client llm.js + maModel từ config THẬT (cấm hằng bịa)"
KQ8="$(nodex '
import { taoPool } from "./db/ket-noi.js";
import { layModel } from "./src/chat/model.js";
import { anthropic } from "./src/llm.js";
import { config } from "./src/config.js";
const pool = taoPool();
const t = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
const m = await layModel(pool, { teamId: t }, { vaiTro: "chinh" });
console.log(`${m.nguon}|${m.client === anthropic}|${m.maModel === config.modelCloser}|${m.maModel}`);
await pool.end();
')"
so "nguồn | client===llm.anthropic | maModel===config | maModel" "${KQ8}"
case "${KQ8}" in
  "config|true|true|"*) dat "⑧ DI model: đường lui đúng — client llm.js, maModel từ config (${KQ8##*|})" ;;
  *LOI-NODE*)           truot "⑧ câu đo HỎNG (LOI-NODE)" ;;
  *)                    truot "⑧ DI model sai: ${KQ8}" ;;
esac

# ═══ ⑨ BỘ CA L2-M1 XANH ═════════════════════════════════════════════════════════
muc "⑨ Bộ ca l2-m1 (2 tệp)"
LOG_HD="/tmp/l2m1-hang-doi.log"
node --test test/l2-m1-hang-doi.test.js >"${LOG_HD}" 2>&1
RC_HD=$?
so "hàng đợi   xanh/đỏ" "$(grep -cE '^✔ ' "${LOG_HD}") / $(grep -cE '^✖ ' "${LOG_HD}")"
# ⚠️ KHÔNG nối `|| echo 0` sau `grep -c`: khi đếm ra 0 thì grep ĐÃ IN "0" rồi mới trả
# rc=1, nên `|| echo 0` cho ra HAI dòng "0" và làm vỡ dòng in. Đúng lỗi (b) mà thợ L0-M1
# đã ghi §9 cho `_chan1.sh` — vấp lại ở đây một lần rồi mới nhớ.
so "nhạc trưởng xanh/đỏ" "$(grep -cE '^✔ ' "${LOG_NT:-/dev/null}" 2>/dev/null) / $(grep -cE '^✖ ' "${LOG_NT:-/dev/null}" 2>/dev/null)"
bang "⑨a bộ ca hàng đợi rc" "${RC_HD}" "0"
bang "⑨b bộ ca nhạc trưởng rc" "${RC_NT:-1}" "0"

# ⑩ KHÔNG đụng vùng cấm: 62 file phẳng ngay dưới src/ (bản đang chạy, luật 4 §0a).
#
# ⚠️ HAI CÁI BẪY của phép này, cả hai đã cắn một lần ở chính lượt L2-M1:
#   (a) ⛔ KHÔNG dùng `git status`: nó đọc INDEX. Thợ commit bằng nghi thức private-index
#       (`GIT_INDEX_FILE` riêng) thì index CHÍNH trở nên stale và báo mọi tệp vừa commit là
#       «D » (đã xoá) ⇒ phép này đỏ với đúng những tệp vừa thêm. `git diff HEAD` so CÂY
#       LÀM VIỆC với HEAD, không đọc index — đó mới là thứ đang hỏi.
#   (b) ⛔ Pathspec `src/*.js` của git dùng fnmatch KHÔNG có FNM_PATHNAME, nên `*` ăn cả
#       dấu `/`: nó khớp luôn `src/queue/nap.js`. Phải lọc bằng regex `^src/[^/]+\.js$`
#       (cùng cách `_chan1.sh` phép ⑤ làm).
muc "⑩ Vùng cấm — 62 file phẳng ngay dưới src/"
BAN="$(git diff --name-only HEAD | grep -E '^src/[^/]+\.js$' | head -20)"
if [ -z "${BAN}" ]; then dat "⑩ 0 file phẳng src/*.js bị sửa (đo cây vs HEAD, không qua index)"
else so "file phẳng bị sửa" "$(echo "${BAN}" | tr '\n' ' ')"; truot "⑩ ĐỤNG vùng cấm"; fi

printf '\n═══ TỔNG: %d phép · ĐẠT %d · TRƯỢT %d\n' "${PHEP}" "$((PHEP - LOI))" "${LOI}"
[ "${LOI}" -eq 0 ]
