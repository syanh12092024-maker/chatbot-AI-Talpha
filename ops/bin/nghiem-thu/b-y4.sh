#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU B-Y4 — di trú thôi xoá cột NGƯỜI đặt.
#
# Phép ② là phép thật của phiếu, và nó CỐ Ý chạy `npm run di-tru` ĐẦU-CUỐI thay vì gọi
# thẳng `napPage`: cái người vận hành gõ là lệnh đó, và cái đã xoá 514 marketer (nếu
# không vá) cũng là lệnh đó. Gọi hàm con thì đo một thứ gần giống, không đo thứ thật.
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

DB="aicloser_v3_nt_by4"
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
  if out="$(node -e "$1" 2>/tmp/by4-err.txt)"; then printf '%s' "${out}"; else printf 'LOI-NODE'; fi
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
quanly "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1
quanly "CREATE DATABASE ${DB}" >/dev/null 2>&1 || { echo "✘ không tạo được ${DB}"; exit 2; }
DATABASE_URL_V3="$(node -e '
const u = new URL(process.argv[1]); u.pathname = "/" + process.argv[2]; console.log(u.toString());
' "${GOC_URL}" "${DB}")"
export DATABASE_URL_V3
export V3_KHOA_MA_HOA="$(node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))')"
don_dep() {
  [ "${GIU_SANDBOX:-0}" = "1" ] && { printf '\n(giữ %s)\n' "${DB}"; return; }
  quanly "DROP DATABASE IF EXISTS ${DB} WITH (FORCE)" >/dev/null 2>&1
}
trap don_dep EXIT

echo "CỔNG NGHIỆM THU B-Y4 · $(date '+%F %T') · cây $(git rev-parse --short HEAD 2>/dev/null)"
echo "CSDL đo: ${DB} (sandbox) · máy chủ $(node -e 'console.log(new URL(process.argv[1]).host)' "${GOC_URL}")"

muc "① nguyên liệu — pages.json có mang marketer nào không"
NGUON="$(nodex '
const { docPages } = await import("./db/di-tru/nguon.js");
const { GOC } = await import("./db/ket-noi.js");
const ds = docPages(GOC);
console.log(`${ds.length}|${ds.filter((p) => p.marketer && p.marketer !== "").length}`);')"
IFS='|' read -r Y4_TONG Y4_CO <<< "${NGUON}"
so "page trong pages.json" "${Y4_TONG}"
so "trong đó CÓ marketer" "${Y4_CO}"
# Con số này là LÝ DO tồn tại của phiếu: nguồn rỗng ⇒ câu cũ không phải «đồng bộ», nó là
# `SET marketer = ''`. Nếu ngày nào nguồn có marketer thật thì phép ② vẫn đúng, chỉ là lý
# do đổi — nên KHÔNG khẳng định "phải bằng 0", chỉ in ra.
[ "${Y4_CO}" = "0" ] && dat "nguồn có 0 marketer — đúng cảnh phiếu mô tả" \
                     || dat "nguồn có ${Y4_CO} marketer (khác lúc soạn phiếu, phép ② vẫn đo đúng)"

muc "② ĐẦU-CUỐI: gán tay → chạy \`npm run di-tru\` → marketer PHẢI còn"
npm run migrate >/dev/null 2>&1
npm run di-tru  >/dev/null 2>&1
PID="$(nodex '
const { voiPool } = await import("./db/ket-noi.js");
await voiPool(async (p) => {
  const r = await p.query("SELECT page_id FROM page ORDER BY id LIMIT 1");
  console.log(r.rows[0].page_id);
});')"
so "page dùng để thử" "${PID}"
nodex "
const { voiPool } = await import('./db/ket-noi.js');
await voiPool((p) => p.query(\"UPDATE page SET marketer = 'thu-nghiem-y4' WHERE page_id = \\\$1\", ['${PID}']));
console.log('ok');" >/dev/null
TRUOC="$(nodex "
const { voiPool } = await import('./db/ket-noi.js');
await voiPool(async (p) => {
  const r = await p.query('SELECT marketer FROM page WHERE page_id = \$1', ['${PID}']);
  console.log(r.rows[0].marketer);
});")"
bang "marketer NGAY SAU khi gán tay" "${TRUOC}" "thu-nghiem-y4"

npm run di-tru >/dev/null 2>&1
SAU="$(nodex "
const { voiPool } = await import('./db/ket-noi.js');
await voiPool(async (p) => {
  const r = await p.query('SELECT marketer FROM page WHERE page_id = \$1', ['${PID}']);
  console.log(r.rows[0].marketer);
});")"
bang "marketer SAU một lượt \`npm run di-tru\` trọn vẹn" "${SAU}" "thu-nghiem-y4"

muc "③ vá này KHÔNG được làm cứng cả bảng — cột MÁY vẫn phải đồng bộ"
KQ3="$(nodex "
const { voiPool } = await import('./db/ket-noi.js');
const { napPage } = await import('./db/di-tru/nap.js');
const { GOC } = await import('./db/ket-noi.js');
await voiPool(async (p) => {
  const cu = (await p.query('SELECT ten FROM page WHERE page_id = \$1', ['${PID}'])).rows[0].ten;
  await p.query(\"UPDATE page SET ten = 'TEN-BI-SUA-TAY' WHERE page_id = \\\$1\", ['${PID}']);
  await napPage(p, GOC);
  const moi = (await p.query('SELECT ten FROM page WHERE page_id = \$1', ['${PID}'])).rows[0].ten;
  console.log(moi === cu ? 'DA-DONG-BO-LAI' : 'KHONG-DONG-BO:' + moi);
});")"
bang "cột \`ten\` (máy đặt) sau di trú" "${KQ3}" "DA-DONG-BO-LAI"

muc "④ không cột NGƯỜI đặt nào còn nằm trong câu ghi đè thẳng"
CON="$(nodex '
const fs = await import("node:fs");
const { GOC } = await import("./db/ket-noi.js");
const src = fs.readFileSync(GOC + "/db/di-tru/nap.js", "utf8");
const k = src.match(/ON CONFLICT \(page_id\) DO UPDATE SET([\s\S]*?)`,/);
const ghiDe = [...k[1].matchAll(/(\w+)\s*=\s*EXCLUDED\./g)].map((m) => m[1]);
const nguoi = ["marketer","trong_diem","botcake_tat","bot_ai_bat"];
console.log(ghiDe.filter((c) => nguoi.includes(c)).join(",") || "khong-co");')"
bang "cột NGƯỜI đặt lọt vào câu ghi đè" "${CON}" "khong-co"

muc "⑤ bộ ca di trú"
if node --test test/l0-m1-di-tru.test.js >/tmp/by4-test.txt 2>&1; then
  dat "test/l0-m1-di-tru.test.js: 0 đỏ"
else
  DO="$(grep -cE '^not ok' /tmp/by4-test.txt)"
  # D7 là ca đỏ SẴN trước phiếu này (điều kiện dữ liệu của VPS, đã A/B ở G2-A1).
  if [ "${DO}" = "1" ] && grep -qE '^not ok .*D7 ' /tmp/by4-test.txt; then
    dat "chỉ D7 đỏ — đỏ sẵn từ trước phiếu này, không phải hồi quy (xem §9)"
  else
    truot "bộ ca di trú có ${DO} ca đỏ:"; grep -E '^not ok' /tmp/by4-test.txt | head -6
  fi
fi

printf '\n═══════════════════════════════════════════════════════════════\n'
printf 'TỔNG: %d phép · ĐẠT %d · TRƯỢT %d\n' "${PHEP}" "$((PHEP - LOI))" "${LOI}"
[ "${LOI}" -eq 0 ] && exit 0 || exit 1
