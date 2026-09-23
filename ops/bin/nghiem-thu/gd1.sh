#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU GD1 — MỘT NGUỒN CHO MỖI CÂU HỎI.
#
# Phiếu GD1 (kế hoạch `docs/v3/09-KE-HOACH-GIAO-DIEN.md` mục 5) sửa ba chỗ:
#   ① điều kiện của page chạy BẢN MỚI đi tới màn dưới dạng MÃ, không phải câu chữ tự do;
#   ② mỗi page khai nó chạy bằng bản nào và được chấm bằng danh sách điều kiện của bản đó;
#   ③ dải trạng thái đếm page CỦA TEAM, bằng đúng phép đếm của màn «Page còn thiếu gì».
#
# CỔNG KHÔNG CẦN CSDL. Ba chỗ trên là logic mô-đun + lời khai trong mã nguồn, nên phép đo
# chạy được ở mọi máy — kể cả CI không có Postgres. Đổi lại, cổng KHÔNG chứng nhận được
# đường chạy thật có CSDL; cái đó là việc của bộ ca và của lượt mở màn trên bản dev.
#
# ⚠️ Cổng này canh HỒI QUY, không phải bằng chứng «giao diện đã dễ dùng». Nó bắt lại đúng
#    ba lỗi đã đo được ngày 22/09, không nói gì về lỗi chưa ai đo.
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

LOI=0; PHEP=0
muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-56s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP + 1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP + 1)); LOI=$((LOI + 1)); printf '   ✘ %s\n' "$1"; }
bang() {
  so "$1" "$2"
  case "$2" in *LOI-NODE*) truot "$1: câu đo HỎNG — không đọc là đạt"; return ;; esac
  if [ "$2" = "$3" ]; then dat "$1 = $3"; else truot "$1: thật=$2 · chờ=$3"; fi
}
nodex() {
  local out
  if out="$(node --input-type=module -e "$1" 2>/tmp/gd1-err.txt)"; then printf '%s' "${out}"
  else printf 'LOI-NODE'; fi
}

printf '═══ CỔNG GD1 · một nguồn cho mỗi câu hỏi ═══\n'
printf 'cây: %s\n' "${GOC}"

# ── ① Mọi câu chặn của bản mới đều có MÃ ────────────────────────────────────────────
# Đọc thẳng hai mã nguồn, không nạp module: bảng dịch là chép tay nên phải khoá vào nguồn.
muc "① Điều kiện của bản mới mang mã, không mang câu chữ"
SOT="$(nodex '
  const fs = await import("node:fs");
  const cau = [...new Set([...fs.readFileSync("src/admin-v3/operations.js", "utf8")
    .matchAll(/blockers\.push\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1]))];
  const src = fs.readFileSync("v3/src/noi-day/van-hanh-v3.js", "utf8");
  const i = src.indexOf("const MA_CUA_CAU");
  const khoi = src.slice(i, src.indexOf("});", i));
  const dich = new Set([...khoi.matchAll(/"([^"]+)":\s*"([A-Z0-9_]+)"/g)].map((m) => m[1]));
  const sot = cau.filter((c) => !dich.has(c));
  console.log(sot.length ? sot.join(" | ") : "0");
')"
bang "câu chặn chưa có mã" "${SOT}" "0"

CO_CHU_TRAN="$(nodex '
  const fs = await import("node:fs");
  const src = fs.readFileSync("v3/src/noi-day/van-hanh-v3.js", "utf8");
  console.log(/blockers\.map\(\s*\(\s*text\s*\)\s*=>\s*\(\{\s*code:\s*text/.test(src) ? "CO" : "KHONG");
')"
bang "cầu còn nhét nguyên câu vào ô mã" "${CO_CHU_TRAN}" "KHONG"

# ── ② Page khai bản bot, và được chấm bằng danh sách của bản đó ──────────────────────
muc "② Mỗi page chấm bằng danh sách điều kiện của chính bản bot nó chạy"
CHAM="$(nodex '
  process.env.V3_KHOA_VE ||= "khoa-thu-cho-cong-gd1-dai-hon-32-ky-tu-xyz";
  const { dungCongGia } = await import("./v3/testkit/db-gia.js");
  const { taoBoiCanh, VAI } = await import("./v3/src/auth/boi-canh.js");
  const ss = await import("./v3/src/ui/san-sang/kho-san-sang.js");
  const bd = await import("./v3/src/ui/bat-dau/kho-bat-dau.js");
  const { taoTruyVan } = dungCongGia({
    team: [{ id: "t1", slug: "a", ten: "A", la_ky_thuat: false }],
    page: [
      { id: "p1", team_id: "t1", page_id: "111", ten: "moi", bot_ai_bat: true },
      { id: "p2", team_id: "t1", page_id: "222", ten: "cu", bot_ai_bat: false },
    ],
  });
  ss.datTaoTruyVan(taoTruyVan);
  ss.datDocSanSang(async () => ({ pages: [
    { pageId: "111", runtime: "v3", aiEnabled: true, aiAllowed: false, readiness: "BLOCKED",
      blockers: [{ code: "BOTMOI_THIEU_GIA", detail: "" }],
      warnings: [{ code: "BOTMOI_CHUA_DO_MAY_CHAY_BOT", detail: "" }], missing: [] },
    { pageId: "222", readiness: "BLOCKED", aiAllowed: false, aiEnabled: false,
      blockers: [{ code: "NO_TOKEN", detail: "" }], warnings: [], missing: [] },
  ] }));
  const bc = taoBoiCanh({ nguoiDungId: "u1", tenDangNhap: "a@b.vn", teamId: "t1", vai: [VAI.QUAN_TRI] });
  const d = await bd.manBatDau(bc);
  const moi = d.page.find((p) => p.pageId === "111");
  const cu = d.page.find((p) => p.pageId === "222");
  const la = d.page.flatMap((p) => p.la || []).length;
  console.log([
    moi.banBot, cu.banBot,
    moi.chan.map((b) => b.ma).join(",") || "rong",
    cu.chan.map((b) => b.ma).join(",") || "rong",
    `la=${la}`,
  ].join(" · "));
')"
bang "nhãn bản bot + điều kiện giữ được" "${CHAM}" "moi · cu · BOTMOI_THIEU_GIA · NO_TOKEN · la=0"

TEN="$(nodex '
  const ss = await import("./v3/src/ui/san-sang/kho-san-sang.js");
  const thieu = Object.keys(ss.DIEU_KIEN_V3).filter((m) => !ss.DIEU_KIEN_TAT_CA[m]?.nhan);
  console.log(thieu.length ? thieu.join(",") : "0");
')"
bang "mã của bản mới chưa có tên người đọc" "${TEN}" "0"

# ── ③ Dải trạng thái cùng mẫu số với danh sách page ──────────────────────────────────
muc "③ Dải trạng thái đếm page của TEAM"
DAI="$(nodex '
  process.env.V3_KHOA_VE ||= "khoa-thu-cho-cong-gd1-dai-hon-32-ky-tu-xyz";
  const { dungCongGia } = await import("./v3/testkit/db-gia.js");
  const { taoBoiCanh, VAI } = await import("./v3/src/auth/boi-canh.js");
  const ss = await import("./v3/src/ui/san-sang/kho-san-sang.js");
  const dai = await import("./v3/src/ui/chung/trang-thai.js");
  const { taoTruyVan } = dungCongGia({
    team: [{ id: "t1", slug: "a", ten: "A", la_ky_thuat: false }],
    page: [
      { id: "p1", team_id: "t1", page_id: "111", ten: "a", bot_ai_bat: true },
      { id: "p2", team_id: "t1", page_id: "222", ten: "b", bot_ai_bat: false },
      { id: "p3", team_id: "t1", page_id: "333", ten: "c", bot_ai_bat: false },
    ],
  });
  ss.datTaoTruyVan(taoTruyVan);
  const dong = (pageId, bat) => ({ pageId, readiness: "READY", aiAllowed: true, aiEnabled: bat,
    blockers: [], warnings: [], missing: [] });
  // Cầu thấy 2 page: MỘT của team, MỘT của team khác — đúng cảnh làm hiện «1/1 page».
  ss.datDocSanSang(async () => ({ pages: [dong("111", true), dong("999", true)] }));
  dai.xoaNho();
  dai.datDocSanSang(async () => ({ pages: [dong("111", true), dong("999", true)] }));
  dai.datDemTeam(async (bc) => {
    const d = await ss.manSanSang(bc);
    return { aiBat: d.dem.dangChay, tong: d.dem.tong };
  });
  const bc = taoBoiCanh({ nguoiDungId: "u1", tenDangNhap: "a@b.vn", teamId: "t1", vai: [VAI.QUAN_TRI] });
  const t = await dai.docTrangThai({ boiCanh: bc });
  const man = await ss.manSanSang(bc);
  console.log(`${t.aiBat}/${t.tong} · man=${man.dem.dangChay}/${man.dem.tong} · theoTeam=${t.theoTeam}`);
')"
bang "dải = danh sách page (team 3 page, 1 đang chạy)" "${DAI}" "1/3 · man=1/3 · theoTeam=true"

HONG="$(nodex '
  process.env.V3_KHOA_VE ||= "khoa-thu-cho-cong-gd1-dai-hon-32-ky-tu-xyz";
  const { taoBoiCanh, VAI } = await import("./v3/src/auth/boi-canh.js");
  const dai = await import("./v3/src/ui/chung/trang-thai.js");
  dai.xoaNho();
  dai.datDocSanSang(async () => ({ pages: [{ pageId: "999", aiEnabled: true }] }));
  dai.datDemTeam(async () => { throw new Error("cầu chết"); });
  const bc = taoBoiCanh({ nguoiDungId: "u1", tenDangNhap: "a@b.vn", teamId: "t1", vai: [VAI.QUAN_TRI] });
  const t = await dai.docTrangThai({ boiCanh: bc });
  console.log(`docDuoc=${t.docDuoc} · aiBat=${t.aiBat}`);
')"
bang "đếm theo team hỏng thì NÓI HỎNG, không tụt mẫu số" "${HONG}" "docDuoc=false · aiBat=null"

# ── ④ Bộ ca của phiếu ───────────────────────────────────────────────────────────────
muc "④ Bộ ca GD1"
if node --test v3/test/b/gd1-mot-nguon.test.mjs >/tmp/gd1-test.txt 2>&1; then
  dat "v3/test/b/gd1-mot-nguon.test.mjs xanh ($(grep -c '^✔' /tmp/gd1-test.txt) ca)"
else
  truot "bộ ca GD1 đỏ — xem /tmp/gd1-test.txt"
fi
if node --test v3/test/b/san-sang.test.mjs v3/test/b/bien-moi-truong-khai-du.test.mjs >/tmp/gd1-canh.txt 2>&1; then
  dat "hai thước cũ vẫn xanh (bậc thang bản cũ · bảng biến môi trường)"
else
  truot "thước cũ đỏ — xem /tmp/gd1-canh.txt"
fi

printf '\n═══ %s/%s phép đạt ═══\n' "$((PHEP - LOI))" "${PHEP}"
[ "${LOI}" -eq 0 ] || exit 1
exit 0
