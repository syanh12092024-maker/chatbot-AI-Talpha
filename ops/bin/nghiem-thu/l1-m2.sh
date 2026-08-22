#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU PHIẾU L1-M2 — Cửa Pancake Messenger: bọc code cũ + định tuyến team +
# guard tại cửa. Thi hành đúng các phép của ④ trong docs/thi-cong/phieu/PHIEU-L1-M2.md.
#
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT DIFF DANH SÁCH. Không có dòng nào chỉ nói
#       "chạy xong không lỗi". Cùng khuôn ops/bin/nghiem-thu/l0-m2.sh (cố ý — một cách
#       đọc cổng cho mọi phiếu).
#
# Cổng TỰ DỰNG CSDL sandbox `aicloser_v3_nt_l1m2` từ khuôn trần rồi TỰ DỌN — không đo
# trên CSDL dev đang có thợ khác dùng (luật 11 sổ điều hành).
#
#   bash ops/bin/nghiem-thu/l1-m2.sh                # chạy đủ các phép
#   GIU_SANDBOX=1 bash ops/bin/nghiem-thu/l1-m2.sh  # giữ CSDL lại để soi tay
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail

GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

CONTAINER="talpha-pg"
DB="aicloser_v3_nt_l1m2"
LOI=0
PHEP=0

# ── khung in (giống hệt l0-m2.sh) ───────────────────────────────────────────────
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

# Chạy một khối node -e; in đúng NỘI DUNG stdout, hoặc "LOI-NODE" khi rc≠0 — KHÔNG in
# nguyên văn lỗi (hai lượt cùng hỏng ra hai chuỗi BẰNG NHAU thì phép so đọc nhầm ĐẠT).
nodex() {
  local out
  if out="$(node -e "$1" 2>/tmp/l1m2-node-err.txt)"; then
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

echo "CỔNG NGHIỆM THU L1-M2 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo: ${DB} (sandbox, không phải aicloser_v3 dev) · container ${CONTAINER}"

node db/migrate.js >/dev/null 2>&1

# ═══ ① GUARD FAIL-CLOSED — 3 ca đối chứng a/b/c (N1+N4) ═══════════════════════
# CÙNG một spy trên pancake.js (tiêm qua deps), CÙNG hàm (guiTin), env đặt TRONG
# harness (KHÔNG thừa hưởng .env — set/unset ngay trong khối node trước mỗi ca).
muc "① GUARD FAIL-CLOSED, đo cặp đối chứng (N1+N4) — CÙNG spy, CÙNG hàm guiTin"
KQ1="$(nodex '
const { guiTin } = await import("./src/channels/messenger/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const tA = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const ctxA = { teamId: tA, nguoiDungId: null };
  const page = (await pool.query("INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,$3) RETURNING id",[tA,"fb-g1","Page G1"])).rows[0];
  await pool.query("INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu) VALUES ($1,$2,$3,$4,$5)",[tA,page.id,"psid-g1","GREET","AI"]);
  const goi = { pageId: "fb-g1", psid: "psid-g1", convId: "pk-g1", custId: "cust-g1", text: "hi" };
  const spyMoi = () => { const a = []; const f = (...x) => { a.push(x); return Promise.resolve({ok:true}); }; f.dem = () => a.length; return f; };

  delete process.env.V3_PANCAKE_GUI; delete process.env.PANCAKE_READONLY;
  const sA = spyMoi(); let tenA = "KHONG-NEM-LOI";
  try { await guiTin(pool, ctxA, goi, { send: sA }); } catch (e) { tenA = e.name; }

  process.env.V3_PANCAKE_GUI = "1"; process.env.PANCAKE_READONLY = "1";
  const sB = spyMoi(); let tenB = "KHONG-NEM-LOI";
  try { await guiTin(pool, ctxA, goi, { send: sB }); } catch (e) { tenB = e.name; }

  process.env.V3_PANCAKE_GUI = "1"; delete process.env.PANCAKE_READONLY;
  const sC = spyMoi(); let tenC = "KHONG-NEM-LOI";
  try { await guiTin(pool, ctxA, goi, { send: sC }); } catch (e) { tenC = e.name; }

  console.log(`${tenA}|${sA.dem()}|${tenB}|${sB.dem()}|${tenC}|${sC.dem()}`);
});')"
IFS='|' read -r TEN_A SPY_A TEN_B SPY_B TEN_C SPY_C <<< "${KQ1}"
bang "ca a (vắng V3_PANCAKE_GUI) — lỗi có tên" "${TEN_A}" "LoiCuaGuiDong"
bang "ca a — spy" "${SPY_A}" "0"
bang "ca b (GUI=1 + READONLY=1) — lỗi có tên" "${TEN_B}" "LoiCuaGuiDong"
bang "ca b — spy" "${SPY_B}" "0"
bang "ca c (GUI=1, không READONLY) — KHÔNG ném lỗi (đối chứng dương)" "${TEN_C}" "KHONG-NEM-LOI"
bang "ca c — spy" "${SPY_C}" "1"
printf '   TÓM TẮT ①: a=%s · b=%s · c=%s\n' "${SPY_A}" "${SPY_B}" "${SPY_C}"

# ═══ ①b TÍNH DUY NHẤT TRONG V3 (N2) ════════════════════════════════════════════
muc "①b tính duy nhất — import pancake.js trực tiếp trong V3 CHỈ ở cửa messenger"
DS1B=""
for d in src/db src/pos src/channels src/chat src/orders src/queue; do
  [ -d "$d" ] || continue
  m=$(grep -rlE "from[[:space:]]+[\"'][^\"']*pancake\.js[\"']" "$d" 2>/dev/null)
  [ -n "$m" ] && DS1B="${DS1B}${m}
"
done
DS1B="$(printf '%s' "${DS1B}" | grep -v '^$' | sort | tr '\n' ' ')"
bang "danh sách file import pancake.js trong src/{db,pos,channels,chat,orders,queue}" "${DS1B}" "src/channels/messenger/index.js "

# ═══ ② Định tuyến team — page thuộc team khác ctx → lỗi có tên + nhat_ky +1 ═════
muc "② định tuyến team: page KHÁC team ctx → lỗi có tên + nhat_ky(chan_page_xuyen_team) +1"
KQ2="$(nodex '
const { docHoiThoai } = await import("./src/channels/messenger/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const tid = async (slug) => (await pool.query("SELECT id FROM team WHERE slug=$1",[slug])).rows[0].id;
  const tA = await tid("tieu-alpha"), tB = await tid("auus");
  const ctxA = { teamId: tA, nguoiDungId: null };
  await pool.query("INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,$3)",[tA,"fb-t2a","Page T2A"]);
  await pool.query("INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,$3)",[tB,"fb-t2b","Page T2B"]);
  const dem = async () => Number((await pool.query("SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong=$1",["chan_page_xuyen_team"])).rows[0].c);
  const truoc = await dem();
  let ten = "KHONG-NEM-LOI"; let spyDem = 0;
  const spy = (...a) => { spyDem++; return Promise.resolve([]); };
  try { await docHoiThoai(pool, ctxA, { pageId: "fb-t2b" }, { getConversations: spy }); }
  catch (e) { ten = e.name; }
  const sau = await dem();
  console.log(`${ten}|${spyDem}|${truoc}|${sau}`);
});')"
IFS='|' read -r TEN2 SPY2 TR2 SA2 <<< "${KQ2}"
bang "page thuộc team khác — lỗi có tên" "${TEN2}" "LoiPageKhongThuocTeam"
bang "không gọi xuống pancake.js — spy" "${SPY2}" "0"
so "nhat_ky(chan_page_xuyen_team) trước→sau" "${TR2}→${SA2}"
bang "nhat_ky +1" "$((SA2 - TR2))" "1"

# ═══ ②b N5 — psid không thuộc pageId → lỗi có tên, không gọi xuống (spy=0) ══════
muc "②b N5 — psid KHÔNG khớp hoi_thoai của page (guard MỞ để đo N5 độc lập) → spy=0"
KQ2B="$(nodex '
const { guiTin } = await import("./src/channels/messenger/index.js");
const { voiPool } = await import("./db/ket-noi.js");
process.env.V3_PANCAKE_GUI = "1"; delete process.env.PANCAKE_READONLY;
await voiPool(async (pool) => {
  const tA = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const ctxA = { teamId: tA, nguoiDungId: null };
  const page = (await pool.query("INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,$3) RETURNING id",[tA,"fb-t2c","Page T2C"])).rows[0];
  await pool.query("INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu) VALUES ($1,$2,$3,$4,$5)",[tA,page.id,"psid-that","GREET","AI"]);
  let ten = "KHONG-NEM-LOI"; let spyDem = 0;
  const spy = (...a) => { spyDem++; return Promise.resolve({ok:true}); };
  try {
    await guiTin(pool, ctxA, { pageId: "fb-t2c", psid: "psid-gia-mao", convId: "pk-x", custId: "c1", text: "x" }, { send: spy });
  } catch (e) { ten = e.name; }
  console.log(`${ten}|${spyDem}`);
});')"
IFS='|' read -r TEN2B SPY2B <<< "${KQ2B}"
bang "psid xuyên page — lỗi có tên (guard đang MỞ, không phải guard chặn)" "${TEN2B}" "LoiHoiThoaiKhongThuocPage"
bang "không gọi xuống pancake.js — spy" "${SPY2B}" "0"

# ═══ ③ ctxHeThong GẮN TEAM (N3) — nhat_ky dòng mới mang team_id THẬT ═══════════
muc "③ ctxHeThong(): job nền tự dựng ctx gắn ĐÚNG team của page → nhat_ky mang team_id thật"
KQ3="$(nodex '
const { docTin } = await import("./src/channels/messenger/index.js");
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (pool) => {
  const tA = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  const page = (await pool.query("INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,$3) RETURNING id",[tA,"fb-t3","Page T3"])).rows[0];
  await pool.query("INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu) VALUES ($1,$2,$3,$4,$5)",[tA,page.id,"psid-t3","GREET","AI"]);
  const { ctxHeThong } = await import("./src/db/index.js");
  await docTin(pool, ctxHeThong(), { pageId: "fb-t3", psid: "psid-t3", convId: "pk-t3", custId: "c1" }, { getMessages: async () => [] });
  const dong = (await pool.query("SELECT team_id FROM nhat_ky WHERE hanh_dong=$1 ORDER BY id DESC LIMIT 1",["doc"])).rows[0];
  console.log(`${dong.team_id}|${tA}`);
});')"
IFS='|' read -r TEAM_GHI TEAM_CHO <<< "${KQ3}"
bang "nhat_ky dòng mới — team_id (chờ = team thật của page, KHÔNG NULL/chua-phan)" "${TEAM_GHI}" "${TEAM_CHO}"

# ═══ ④ Hàm ĐỌC dưới guard đóng → KHÔNG bị chặn ═════════════════════════════════
muc "④ hàm ĐỌC (docHoiThoai) dưới guard ĐÓNG (vắng V3_PANCAKE_GUI) → vẫn đọc được"
KQ4="$(nodex '
const { docHoiThoai } = await import("./src/channels/messenger/index.js");
const { voiPool } = await import("./db/ket-noi.js");
delete process.env.V3_PANCAKE_GUI; process.env.PANCAKE_READONLY = "1";
await voiPool(async (pool) => {
  const tA = (await pool.query("SELECT id FROM team WHERE slug=$1",["tieu-alpha"])).rows[0].id;
  await pool.query("INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,$3)",[tA,"fb-t4","Page T4"]);
  const ra = await docHoiThoai(pool, { teamId: tA, nguoiDungId: null }, { pageId: "fb-t4" }, { getConversations: async () => [{id:"mau-1"}] });
  console.log(JSON.stringify(ra));
});')"
bang "guard đóng — ĐỌC vẫn trả về dữ liệu mock" "${KQ4}" "[{\"id\":\"mau-1\"}]"

# ═══ ⑤ Nhánh Pancake THẬT — NHÁNH-VPS ═══════════════════════════════════════════
muc "⑤ nhánh Pancake THẬT"
echo "   CHƯA CHẠY — chờ VPS (token 121 ở IP cá nhân, xem docs/thi-cong/nhat-ky/phieu-l1-m2.md)"

# ═══ ⑥ npm test: bộ l1-m2 xanh ═══════════════════════════════════════════════
muc "⑥ npm test: bộ l1-m2 xanh (không chạy bộ cũ — nợ §9 conv-state)"
so "node --version" "$(node --version)"
if node --test test/l1-m2-*.test.js >/tmp/l1m2-test.txt 2>&1; then
  dat "bộ ca l1-m2: $(grep -c '^✔' /tmp/l1m2-test.txt) xanh / 0 đỏ"
else
  truot "bộ ca l1-m2 có ca đỏ:"; grep -E '^✖|not ok' /tmp/l1m2-test.txt | head -20
fi

# ── tổng ─────────────────────────────────────────────────────────────────────
printf '\n═══════════════════════════════════════════════════════════════\n'
printf 'TỔNG: %d phép · ĐẠT %d · TRƯỢT %d\n' "${PHEP}" "$((PHEP - LOI))" "${LOI}"
[ "${LOI}" -eq 0 ] && exit 0 || exit 1
