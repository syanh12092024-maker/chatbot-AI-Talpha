#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU GL4 — NGẮT CẢ PAGE 30′ khi kênh Pancake lỗi 2 lần liên tiếp (gửi HOẶC đọc), tự mở; tin tồn giữ ở chờ; đèn
# đỏ có lý do. rc=0 là đạt. Thi hành mục ④ của docs/thi-cong/phieu/PHIEU-GL4.md.
# Tầm đo: lưới HỒI QUY (luật 32) do chính thợ viết, trên MÁY DEV — không đo prod, không đo `aicloser_v3`. Hộp cát Postgres riêng mỗi
# tệp ca (`db/sandbox.js`, hậu tố `_p<pid>`, migration 034 áp trong hộp cát, tự dựng tự dọn). Fetch GIẢ trong mọi ca (host ≠ pages.fm
# ⇒ ném), ≥2 token giả, van gửi mở CHỈ trong env tiến trình ca (không sửa `.env`). Phép 1–5·8 đi CỬA THẬT (motLuot/chayMotVong →
# docTin → pkDocTin → pkFetchPage → fetch giả; gửi qua bocCuaGuiBen thật) — không tiêm docTin/cua/docLichSu:false/dsChoPhep. Đồng hồ
# CSDL («qua 30′» = UPDATE ngat_den). Đảo-vá trên BẢN SAO TẠM (src · db · v3/src · v3/testkit · ca), mỗi đột biến một tiến trình node
# mới (bẫy 15). Chỉ `grep -E` (máy dev: `rg` là hàm zsh — cổng con được cấp shim).
# Cờ: GIU_TAM=1 giữ bản sao · BO_CONG_CU=1 bỏ ⑥ (cổng cũ — DÀI) · CHAY_NPM_TEST=1 chạy ⑦ (mặc định HOÃN, luật 6).
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "$@" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+' | head -1; }
do_ten() { echo "$1" | grep -E "^\s*✖ GL4 [A-Za-z0-9]+ ·" | sed -E 's/^\s*✖ GL4 ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
xanh_ten() { echo "$1" | grep -E "^\s*✔ GL4 [A-Za-z0-9]+ ·" | sed -E 's/^\s*✔ GL4 ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
BASE=a0cc56a
DB="aicloser_v3_nt_gl4_p$$"   # khai theo phiếu; mỗi tệp ca tự dựng hộp cát riêng (db/sandbox.js, hậu tố _p<pid>) — không ghi vào tên này
if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát"; exit 2; }
noi=$(node -e 'const u=new URL(process.env.DATABASE_URL_V3);console.log(`${u.hostname}:${u.port||5432}`)' 2>/dev/null || echo "?")
echo "── môi trường: máy dev · hộp cát Postgres trên $noi (aicloser_v3_test_gl4*_p<pid>, tự dựng tự dọn) · cây $GOC · $(git rev-parse --short HEAD)"
CA_W=test/gl4-ngat-page.test.mjs
CA_M=test/gl4-chua-034.test.mjs
CA_D=v3/test/b/gl4-den-ngat-kenh.test.mjs
CA_U=v3/test/b/gl4-den-don-vi.test.mjs

# ⓪ luật 1 §0a: máy này vẫn CHỈ ĐỌC (ca mở van trong tiến trình ca, không đụng .env)
ro=$(grep -E '^PANCAKE_READONLY=' .env 2>/dev/null | tail -1 | cut -d= -f2)
[ "$ro" = "1" ]; ket "⓪.env-PANCAKE_READONLY=1" $? "đọc được: '${ro:-vắng}'"

# ①②③ bộ ca — mỗi phép của ④ có ca XANH riêng (bảng đếm thấy/đòi), thước SÀN (fail=0, pass ≥ số tên đòi)
bo_ca() { # bo_ca <nhãn> <các tên phải xanh> <tệp ca…>
  local nhan="$1" can="$2"; shift 2
  local o p f co t thieu=""; o=$(chay "$@"); p=$(so "$o" pass); f=$(so "$o" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
  co=$(xanh_ten "$o"); for t in $can; do echo " $co " | grep -qF " $t " || thieu="$thieu$t "; done
  [ "$f" -eq 0 ] && [ "$p" -ge "$(echo "$can" | wc -w)" ] && [ -z "$thieu" ]
  ket "$nhan" $? "pass=$p fail=$f · xanh: ${co:-không}(đòi: $can)${thieu:+ THIẾU: $thieu}"
  echo "$o" | grep -E "^\s*\[gl4\] " | sed 's/^ */   · /' | cut -c1-260
}
bo_ca "①phép-1·1b·1c·2·2c·2d·3·4·5·8-worker-cửa-thật" \
  "P1 P1b P1c P2q P2m P2n P2h P2v P2c P2d P2e P2k P3a P3b P3c P3d P4a P4b P4c P4d P5 P8 R" "$CA_W"
bo_ca "②phép-7-CSDL-chưa-034-+-up/down/up" "M7a M7b" "$CA_M"
bo_ca "③phép-6-đèn-+-máy-không-hỏng-+-màn-Page-(HTTP-thật,-2-team)" "D1 D2 D4" "$CA_D"
bo_ca "③b-phép-6-đơn-vị-(XÁM-khi-chưa-034,-giờ-VN,-số-tin-qua-xetNhip,-không-che-khi-còn-page-chạy)" "D3 D5 D6" "$CA_U"
# ③c — đèn + giờ VN ở HAI múi giờ khác hẳn nhau (đồng hồ máy + phiên CSDL), bẫy 21: thước chỉ đúng một phần ngày là không có
for tz in "UTC UTC" "America/Los_Angeles Asia/Tokyo"; do
  set -- $tz
  o=$(TZ=$1 PGTZ=$2 chay "$CA_D" "$CA_U"); p=$(so "$o" pass); f=$(so "$o" fail)
  [ "${f:-1}" -eq 0 ] && [ "${p:-0}" -ge 6 ]; ket "③c-đèn-ở-TZ=$1-PGTZ=$2" $? "pass=${p:-?} fail=${f:-?}"
done

# ④ tĩnh (phụ — hành vi đã đo ở ①–③)
n_fetch=$(grep -vE '^\s*//' src/pancake.js | grep -cE '(^|[^.A-Za-z_])fetch\(')
n_goi=$(grep -vE '^\s*//' src/pancake.js | grep -cE 'goiPancake\(')
[ "$n_fetch" -eq 1 ] && [ "$n_goi" -eq 6 ]; ket "④a-pancake.js-vẫn-một-cửa-fetch-(gl3-③)" $? "fetch( mã=$n_fetch (đòi 1) · goiPancake( =$n_goi (đòi 6)"
xuat() { grep -oE '^export (async )?(function|const|let|class) [A-Za-z_0-9]+' | sed -E 's/.* //' | sort; }
them=$(comm -13 <(git show "$BASE:src/pancake.js" | xuat) <(xuat < src/pancake.js) | tr '\n' ' ')
[ -z "$them" ]; ket "④b-pancake.js-không-thêm-export-(R2-N5)" $? "export mới: ${them:-không}"
git diff --quiet "$BASE" -- src/queue/page-routing.js; ket "④c-page-routing.js-không-đổi-(nguồn-6-màn)" $? "$(git diff --stat "$BASE" -- src/queue/page-routing.js | tail -1)"
node -e 'import("./db/migrate.js").then(({sinhSchema})=>{process.exit(require("fs").readFileSync("db/schema.sql","utf8")===sinhSchema()?0:1)})'
ket "④d-schema.sql-sinh-từ-migrate/-(có-034)" $? "$(grep -c '034_page_ngat_kenh' db/schema.sql) lần nhắc 034"
grep -qF 'ÁP TRÊN VPS TRƯỚC KHI CHẠY MÃ GL4' db/migrate/034_page_ngat_kenh.up.sql; ket "④e-034-khai-thứ-tự-«áp-VPS-trước-mã»" $?

# ⑤ ĐẢO-VÁ (④9) trên BẢN SAO TẠM — mỗi đột biến một tiến trình node mới. Luật đọc: các ca khai PHẢI nằm trong tập đỏ.
T=$(mktemp -d "${TMPDIR:-/tmp}/gl4.XXXXXX"); [ "${GIU_TAM:-0}" = 1 ] || trap 'rm -rf "$T"' EXIT
mkdir -p "$T/test" "$T/v3/test/b"
chep() { rm -rf "$T/src" "$T/db" "$T/v3/src" "$T/v3/testkit"; cp -R src "$T/src"; cp -R db "$T/db"; cp -R v3/src "$T/v3/src"; cp -R v3/testkit "$T/v3/testkit"; }
chep; cp test/_an-toan.mjs "$CA_W" "$CA_M" "$T/test/"; cp "$CA_D" "$CA_U" "$T/v3/test/b/"
cp package.json "$T/"; ln -s "$GOC/node_modules" "$T/node_modules"; [ -f .env ] && ln -s "$GOC/.env" "$T/.env"
dot() { (cd "$T" && node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "$@" 2>&1); }
dot_bien() { # dot_bien <tệp> <gốc1> <đột-biến1> [<gốc2> <đột-biến2> …] — mỗi chuỗi gốc phải khớp ĐÚNG MỘT lần
  local tep=$1; shift
  python3 - "$T/$tep" "$@" <<'PY'
import sys
p = sys.argv[1]; cap = sys.argv[2:]; s = open(p).read()
for a, b in zip(cap[0::2], cap[1::2]):
    assert s.count(a) == 1, f"chuỗi gốc xuất hiện {s.count(a)} lần: {a[:70]!r}"
    s = s.replace(a, b)
open(p, 'w').write(s)
PY
}
dao() { # dao <nhãn> <các ca phải ĐỎ> <tệp ca> <mẫu tên> <tệp đột biến> <gốc> <đột biến> [<gốc> <đột biến> …]
  local nhan="$1" phai="$2" ca="$3" mau="$4" tep="$5"; shift 5
  chep
  if ! dot_bien "$tep" "$@"; then ket "$nhan" 1 "đột biến không áp được (chuỗi gốc đổi?)"; return; fi
  # shellcheck disable=SC2086 — <tệp ca> có thể là NHIỀU tệp cách bằng dấu cách (đường dẫn tương đối, không dấu cách)
  local o r t thieu=""; o=$(dot --test-name-pattern="$mau" $ca); r=$(do_ten "$o")
  for t in $phai; do echo " $r " | grep -qF " $t " || thieu="$thieu$t "; done
  [ -z "$thieu" ]; ket "$nhan" $? "đỏ: ${r:-không} (đòi đỏ: $phai)"
}
W=src/queue/worker.js; NP=src/queue/ngat-page.js; LG=src/queue/lan-gui.js; CWK=src/queue/chay-worker.js; SK=v3/src/ui/suc-khoe/kho-suc-khoe.js
# — mười hai đảo-vá của ④9 (vế «đèn lộ tên page team khác» đã BỎ theo R2-N6: đèn đọc kẹp team, không có đường lộ để đột biến) —
dao "⑤a-đọc-OK-xoá-cả-bộ-đếm-gửi-⇒-phép-2/3-đỏ" "P2q P2m P2n P2h P3c" "$CA_W" "GL4 (P2q|P2m|P2n|P2h|P3c) ·" "$W" \
  '  else if (k.docOk) await ghiDocTot(p, dinh);' '  else if (k.docOk) await ghiGuiTot(p, dinh);'
dao "⑤b-kiểm-theo-vòng-(ngắt-không-vào-bộ-nhớ-chung)-⇒-1b-đỏ" "P1b" "$CA_W" "GL4 P1b ·" "$NP" \
  '    _ngat.set(String(p.page_id), muc);
' ''
dao "⑤c-đếm-theo-lượt-(không-theo-tin)-⇒-1c-đỏ" "P1c" "$CA_W" "GL4 P1c ·" "$NP" \
  'IS NOT DISTINCT FROM $3::bigint THEN' 'IS NOT DISTINCT FROM $3::bigint AND false THEN'
dao "⑤d-đếm-lượt-rút-lại-sau-crash-⇒-2c-đỏ" "P2c" "$CA_W" "GL4 P2c ·" "$W" \
  '    else if (e?.cause?.kenh === true) kenh.loi = { kieu: "gui", lyDo: cauLyDoGui(e.cause.chiTiet) };' \
  '    else if (e?.cause?.kenh === true || e?.name === "LoiCanDoiChieuGui") kenh.loi = { kieu: "gui", lyDo: cauLyDoGui(e.cause?.chiTiet) };'
dao "⑤e-đếm-gatThe/ghiNote/không-HTTP-⇒-2d-đỏ" "P2d P2e P2k" "$CA_W" "GL4 (P2d|P2e|P2k) ·" "$LG" \
  '    kenh: LOAI_KENH.has(loai) && r.daGoi === true && r.biChan !== true,' '    kenh: r.biChan !== true,'
dao "⑤f-phân-loại-đọc-theo-câu-chữ-⇒-4-(105/121-không-mã)-đỏ" "P4b P4c" "$CA_W" "GL4 P4[a-d] ·" src/channels/messenger/index.js \
  '{ capKenh: kq?.capKenh === true }' '{ capKenh: /quá hạn|lỗi mạng|HTTP/.test(String(kq?.loi)) }'
dao "⑤g-ghi*-dùng-client-giao-dịch-⇒-7-đỏ" "M7a" "$CA_M" "GL4 M7a ·" "$W" \
  '      kenh.docOk = true;
' '      kenh.docOk = true;
      await ghiDocTot(khach, { teamId: tin.team_id, pageId: tin.page_id });
'
dao "⑤h-mở-lại-không-điều-kiện-⇒-8-đỏ" "P8" "$CA_W" "GL4 P8 ·" "$NP" \
  "        WHERE ngat_ly_do <> '' AND ngat_den <= now()" "        WHERE ngat_den <= now()"
dao "⑤i-bỏ-lọc-page-ngắt-⇒-1-đỏ" "P1 P1b" "$CA_W" "GL4 P1b? ·" "$W" \
  'pageIds: locPageNgat(deps.pageIds ?? null)' 'pageIds: deps.pageIds ?? null'
dao "⑤j-ngắt-vì-gửi-mà-bỏ-nạp-⇒-2-(vế-nạp)-đỏ" "P2v" "$CA_W" "GL4 P2v ·" "$CWK" \
  '  const boNap = new Set(ngat.filter((x) => x.vi === "doc").map((x) => x.pageId));' '  const boNap = new Set(ngat.map((x) => x.pageId));'
dao "⑤k-denMayChayBot-không-nhánh-ngắt-⇒-6-đỏ" "D1" "$CA_D" "GL4 D[124] ·" "$SK" \
  "  if (giu.length && !conPageChay && (x.muc === MUC.DO || x.muc === MUC.VANG) && /tin chờ/.test(String(x.so || ''))) {" '  if (false) {'
dao "⑤l-không-đẻ-việc-cho-tin-gửi-lỗi-⇒-2-đỏ" "P2q P2m P2n P2h" "$CA_W" "GL4 (P2q|P2m|P2n|P2h) ·" "$W" \
  '      if (so.khongRo) await viecGuiLoi(khach, tin);' '      if (false) await viecGuiLoi(khach, tin);'
# — thêm ngoài danh sách ④9: chỗ review vòng 2 động vào + «đột biến nào KHÔNG đỏ» hay lọt —
dao "⑤m-ghiGuiTot-cả-lượt-XONG-không-gửi-(nhường)-(R2-N3)-⇒-3c-đỏ" "P3c" "$CA_W" "GL4 P3c ·" "$W" \
  '      const lyDo = "page đã trả lời trước — nhường, không gọi model";' '      const lyDo = "page đã trả lời trước — nhường, không gọi model"; kenh.guiOk = true;'
dao "⑤n-đang-ngắt-vẫn-đếm-/-ngắt-chồng-(R2-N3)-⇒-8-đỏ" "P8" "$CA_W" "GL4 P8 ·" "$NP" \
  "        WHERE team_id = \$1 AND page_id = \$2 AND ngat_ly_do = ''" '        WHERE team_id = $1 AND page_id = $2'
dao "⑤o-ngưỡng-1-thay-2-⇒-1c-đỏ" "P1c P3a P3b" "$CA_W" "GL4 (P1c|P3a|P3b) ·" "$NP" \
  'export const NGUONG_LOI_KENH = 2;' 'export const NGUONG_LOI_KENH = 1;'
dao "⑤p-lượt-làm-mới-ghi-đè-bộ-nhớ-(R2-N2)-⇒-R-đỏ" "R" "$CA_W" "GL4 R ·" "$NP" \
  '!ds.some((x) => x.pageId === pid) && m.den <= bay' '!ds.some((x) => x.pageId === pid)'
dao "⑤q-đếm-mọi-LoiDocLichSu-(bỏ-capKenh)-⇒-4a/4d-đỏ" "P4a P4d" "$CA_W" "GL4 P4[a-d] ·" "$W" \
  'if (e?.name === "LoiDocLichSu" && e.capKenh === true)' 'if (e?.name === "LoiDocLichSu")'
dao "⑤r-bỏ-ngoại-lệ-121-không-mã-⇒-4c-đỏ" "P4c" "$CA_W" "GL4 P4c ·" src/pancake.js \
  "  return j?.success === false && j?.error_code == null && /gói cước/i.test(String(j?.message || ''));" '  return false;'
dao "⑤s-cạn-token-không-là-lỗi-kênh-⇒-1/4b-đỏ" "P1b P4b" "$CA_W" "GL4 (P1b|P4b) ·" src/pancake.js \
  '  if (soLoi.hetToken || !allToks().length || j?.thanHong === true) return true;' '  if (j?.thanHong === true) return true;'
dao "⑤t-lan-gui-gắn-dấu-cả-lỗi-ghi-sổ-SAU-gửi-OK-⇒-2k-đỏ" "P2k" "$CA_W" "GL4 P2k ·" "$LG" \
  '  if (result?.ok === true) return null;
' ''
dao "⑤u-lý-do-gửi-mất-mã-Pancake-⇒-2q-đỏ" "P2q" "$CA_W" "GL4 P2q ·" "$NP" \
  '  if (ma != null) return `Pancake từ chối gửi (mã ${ma})`;' ''
dao "⑤v-giờ-VN-thành-giờ-UTC-⇒-6-đỏ" "D1 D5" "$CA_D $CA_U" "GL4 D[1-5] ·" "$NP" \
  '  const d = new Date(ms + 7 * 3600e3);' '  const d = new Date(ms);'
dao "⑤w-đèn-đếm-cả-việc-khác-lý-do-⇒-6-đỏ" "D1" "$CA_D" "GL4 D1 ·" "$SK" \
  '(v) => v.dong_luc == null && v.ly_do_day === LY_DO_VIEC_GUI_LOI' '(v) => v.dong_luc == null'
dao "⑤x-máy-không-hỏng-che-cả-khi-HẾT-hạn-⇒-4D-đỏ" "D4" "$CA_D" "GL4 D[124] ·" "$SK" \
  '  const giu = (ngat?.ds || []).filter((p) => p.conHieuLuc);' '  const giu = (ngat?.ds || []);'
dao "⑤y-màn-Page-mất-giờ-trên-nhãn-⇒-6-đỏ" "D1" "$CA_D" "GL4 D1 ·" v3/src/ui/page-bot/kho-page.js \
  '? `Ngắt kênh tới ${gioVN(p.ngat_den)}`' "? 'Ngắt kênh'"
dao "⑤z-ngắt-vì-đọc-vẫn-nạp-⇒-1-đỏ" "P1" "$CA_W" "GL4 P1 ·" "$CWK" \
  '    const pages = trongBang.filter((p) => choPhep.includes(p) && !boNap.has(p));' '    const pages = trongBang.filter((p) => choPhep.includes(p));'
# sau /code-review (bẫy 26: bản vá cũng là code mới — mỗi chỗ vừa vá một đột biến)
dao "⑤aa-lượt-gửi-ĐƯỢC-rồi-hỏng-không-xoá-chuỗi-gửi-(#4)-⇒-3d-đỏ" "P3d" "$CA_W" "GL4 P3d ·" "$W" \
  '    if (so.daGuiThat) kenh.guiOk = true;
' ''
dao "⑤ab-việc-«Gửi-không-rõ»-cả-khi-chỉ-thẻ-hỏng-(#5)-⇒-2d-đỏ" "P2d" "$CA_W" "GL4 P2d ·" "$W" \
  '      if (so.khongRo) await viecGuiLoi(khach, tin);' '      if (daGui) await viecGuiLoi(khach, tin);'
dao "⑤ac-máy-không-hỏng-che-cả-khi-còn-page-bật-không-ngắt-(#1)-⇒-D6-đỏ" "D6" "$CA_U" "GL4 D6 ·" "$SK" \
  '  if (giu.length && !conPageChay && (x.muc' '  if (giu.length && (x.muc'
dao "⑤ad-nhãn-màn-Page-nói-giờ-đã-qua-(#10)-⇒-D4-đỏ" "D4" "$CA_D" "GL4 D[124] ·" v3/src/ui/page-bot/kho-page.js \
  '        nhan: new Date(p.ngat_den).getTime() > Date.now()' '        nhan: true'
dao "⑤ae-làm-mới-một-câu-mà-quên-mở-lại-(#8)-⇒-1/8-đỏ" "P1 P8" "$CA_W" "GL4 P[18] ·" "$NP" \
  '  if (hetHan) await moLaiPageHetHan(pool);' ''
chep; o=$(dot "$CA_W" "$CA_M" "$CA_D" "$CA_U"); f=$(so "$o" fail); p=$(so "$o" pass)
[ "${f:-1}" -eq 0 ] && [ "${p:-0}" -ge 31 ]; ket "⑤0-bản-sao-nguyên-vẹn-xanh-(thước-không-tự-đỏ)" $? "pass=${p:-?} fail=${f:-?}"

# ⑥ phép 10 — cổng cũ XANH (rc tách dòng) + bộ ca chạm worker/gửi/lược đồ/đèn. gl3b.sh: đảo-vá V2c/V2d (⑤v ⑤v2 ⑤v3 ⑤w) phải ✅.
if [ "${BO_CONG_CU:-0}" != 1 ]; then
  SHIM=$(mktemp -d "${TMPDIR:-/tmp}/gl4-shim.XXXXXX"); printf '#!/bin/sh\nexec grep -E "$@"\n' > "$SHIM/rg"; chmod +x "$SHIM/rg"
  PATH_CON="$PATH"; command -v rg >/dev/null 2>&1 || PATH_CON="$SHIM:$PATH"
  for g in gl3b gl3 gl2; do
    o=$(env -u CHAY_NPM_TEST -u CHAY_SO_BASE PATH="$PATH_CON" bash "ops/bin/nghiem-thu/$g.sh" 2>&1); r=$?
    [ "$r" -ne 0 ] && echo "$o" | grep -E "^(🔴|   ✘)" | head -8 | sed 's/^/   ↳ /'
    ket "⑥$g.sh" "$r" "rc=$r · $(echo "$o" | grep -E '^== ĐỎ' | tail -1)"
    if [ "$g" = gl3b ]; then
      nv=$(echo "$o" | grep -cE '^✅ ⑤(v|v2|v3|w)-')
      [ "$nv" -eq 4 ]; ket "⑥b-gl3b-đảo-vá-V2c/V2d-(⑤v·⑤v2·⑤v3·⑤w)-còn-đỏ-đúng" $? "✅ $nv/4"
    fi
  done
  rm -rf "$SHIM"
  for c in test/va-p7-chay-worker.test.js test/phase1-chat-flow.test.js test/l2-m1-hang-doi.test.js test/l0-m1-luoc-do.test.js \
           test/gl2-tran-page-bat.test.mjs test/gl3b-worker-doc-loi.test.mjs test/gl3b-nap-doc-loi.test.mjs test/gl3b-pancake-van-hanh.test.mjs \
           test/gl3b-vong2.test.mjs v3/test/b/suc-khoe.test.mjs test/l2-m1-nhac-truong.test.js test/gl3-han-cho-pancake.test.mjs; do
    o=$(chay "$c"); r=$?; f=$(so "$o" fail); p=$(so "$o" pass)
    [ "$r" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -4 | sed 's/^/   ↳ /'
    [ "$r" -eq 0 ] && [ "${f:-1}" -eq 0 ] && [ "${p:-0}" -ge 1 ]; ket "⑥$(basename "$c")" $? "rc=$r pass=${p:-?} fail=${f:-?}"
  done
else
  echo "⏸ ⑥cổng-cũ HOÃN (BO_CONG_CU=1)"
fi

# ⑦ npm test — chỉ khi CHAY_NPM_TEST=1 (luật 6). Thước: fail=0 (mốc base ghi ở nhật ký GL4: 2581 ca · 0 đỏ).
if [ "${CHAY_NPM_TEST:-}" = 1 ]; then
  o=$(npm test 2>&1); nt=$(so "$o" tests); nf=$(so "$o" fail)
  [ "${nf:-1}" -eq 0 ]; ket "⑦npm-test" $? "tests=${nt:-?} fail=${nf:-?}"
else
  echo "⏸ ⑦npm-test HOÃN — đặt CHAY_NPM_TEST=1 (luật 6: không chạy song song)"
fi
echo "== ĐỎ $do / XANH $xanh"; [ "$do" -eq 0 ]
