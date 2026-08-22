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

CONTAINER="talpha-pg"
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

echo "CỔNG NGHIỆM THU L0-M2 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo: ${DB} (sandbox, không phải aicloser_v3 dev) · container ${CONTAINER}"

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
# Mốc nền — GIỐNG HỆT mốc l0-m1.sh (đo tại base 3d1eed1, cây chưa có dòng code nào của
# chuỗi phiếu L0). L0-M2 không đụng src/ phẳng hay db/ nên mốc không có lý do trôi.
NEN_DO="conv-owner.test.mjs guard-fastlane.test.mjs intro.test.mjs l8-botcake-rules.test.mjs viec-2345.test.mjs"
if [ "$(echo ${DO_LIST} | tr ' ' '\n' | sort | tr '\n' ' ')" = "$(echo ${NEN_DO} | tr ' ' '\n' | sort | tr '\n' ' ')" ]; then
  dat "bộ ca cũ KHÔNG gãy thêm — đúng 5 tệp đã đỏ sẵn ở mốc nền"
else
  truot "bộ ca cũ LỆCH mốc nền · nền: ${NEN_DO} · nay:${DO_LIST}"
fi

# ── tổng ─────────────────────────────────────────────────────────────────────
printf '\n═══════════════════════════════════════════════════════════════\n'
printf 'TỔNG: %d phép · ĐẠT %d · TRƯỢT %d\n' "${PHEP}" "$((PHEP - LOI))" "${LOI}"
[ "${LOI}" -eq 0 ] && exit 0 || exit 1
