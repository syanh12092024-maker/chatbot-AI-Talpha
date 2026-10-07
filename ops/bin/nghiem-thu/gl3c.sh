#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU GL3c — Pancake lỗi KÉO DÀI không thành «bot câm im lặng»: danh sách hội thoại lỗi LIÊN TỤC ≥ T_NGAT_DS (2′) ⇒
# ngắt page `doc` (chập ngắn chỉ log) · lỗi KÊNH khi bộ nạp đọc lịch sử ⇒ đếm GL4 theo hội thoại (cùng khoá worker — R2-N2) · hội thoại
# lỗi DỮ LIỆU bền ⇒ lượt 3 giao sale CÓ việc (gộp qua quãng ngắt) · webhook đi nhánh GL3b. rc=0 là đạt. Thi hành mục ④ của
# docs/thi-cong/phieu/PHIEU-GL3C.md.
# Tầm đo: lưới HỒI QUY (luật 32) do chính thợ viết, trên MÁY DEV — không đo prod, không đo `aicloser_v3`. Hộp cát Postgres riêng mỗi tệp
# ca (`db/sandbox.js`, `aicloser_v3_test_gl3c_*_p<pid>`, tự dựng tự dọn). Fetch GIẢ trong mọi ca (host ≠ pages.fm ⇒ ném), 2 token giả, van
# mở CHỈ trong env tiến trình ca (không sửa `.env`). Cửa THẬT: napTuPoll → docHoiThoai → pkGetConversations → pkFetchPage → fetch giả;
# worker chayMotVong thật; CHẠY XEN nạp/xử; «qua 30′» = UPDATE ngat_den (đồng hồ CSDL) rồi motLuot mở thật. Đảo-vá trên BẢN SAO TẠM
# (src · db · v3/src · v3/testkit · ca), mỗi đột biến một tiến trình node mới (bẫy 15). Chỉ `grep -E` (máy dev: `rg` là hàm zsh — cổng
# con được cấp shim).
# Cờ: GIU_TAM=1 giữ bản sao · BO_CONG_CU=1 bỏ ④ (cổng cũ — DÀI) · CHAY_NPM_TEST=1 chạy ⑤ (mặc định HOÃN, luật 6).
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "$@" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+' | head -1; }
do_ten() { echo "$1" | grep -E "^\s*✖ GL3c [A-Za-z0-9]+ ·" | sed -E 's/^\s*✖ GL3c ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
xanh_ten() { echo "$1" | grep -E "^\s*✔ GL3c [A-Za-z0-9]+ ·" | sed -E 's/^\s*✔ GL3c ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
BASE=ff3526a
DB="aicloser_v3_nt_gl3c_p$$"   # khai theo phiếu; mỗi tệp ca tự dựng hộp cát riêng (db/sandbox.js, hậu tố _p<pid>) — không ghi vào tên này
if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát"; exit 2; }
noi=$(node -e 'const u=new URL(process.env.DATABASE_URL_V3);console.log(`${u.hostname}:${u.port||5432}`)' 2>/dev/null || echo "?")
echo "── môi trường: máy dev · hộp cát Postgres trên $noi (aicloser_v3_test_gl3c_*_p<pid>, tự dựng tự dọn; nhãn $DB) · cây $GOC · $(git rev-parse --short HEAD)"
CA_N=test/gl3c-nap-loi.test.mjs
CA_W=test/gl3c-webhook-legacy.test.mjs

# ⓪ luật 1 §0a: máy này vẫn CHỈ ĐỌC (ca mở van trong tiến trình ca, không đụng .env)
ro=$(grep -E '^PANCAKE_READONLY=' .env 2>/dev/null | tail -1 | cut -d= -f2)
[ "$ro" = "1" ]; ket "⓪.env-PANCAKE_READONLY=1" $? "đọc được: '${ro:-vắng}'"

# ① bộ ca — mỗi phép của ④ có ca XANH riêng (bảng đếm thấy/đòi), thước SÀN (fail=0, pass ≥ số tên đòi)
bo_ca() { # bo_ca <nhãn> <các tên phải xanh> <tệp ca…>
  local nhan="$1" can="$2"; shift 2
  local o p f co t thieu=""; o=$(chay "$@"); p=$(so "$o" pass); f=$(so "$o" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
  co=$(xanh_ten "$o"); for t in $can; do echo " $co " | grep -qF " $t " || thieu="$thieu$t "; done
  [ "$f" -eq 0 ] && [ "$p" -ge "$(echo "$can" | wc -w)" ] && [ -z "$thieu" ]
  ket "$nhan" $? "pass=$p fail=$f · xanh: ${co:-không}(đòi: $can)${thieu:+ THIẾU: $thieu}"
  echo "$o" | grep -E "^\s*\[gl3c\] " | sed 's/^ */   · /' | cut -c1-300
}
bo_ca "①a-phép-1·1b·1c·1d·2·2b·3·3b·4-nạp-cửa-thật-+-xen-nạp/xử" \
  "P1 P1n P1b P1c P1d P1f P1h P1i P1g P1e P2 P2b P2c P3 P3b P3c P4" "$CA_N"
bo_ca "①b-phép-5·6-webhook-+-legacy-(cửa-thật)" "P5a P5b P6" "$CA_W"
# ①c — hai múi giờ khác hẳn nhau (đồng hồ máy + phiên CSDL), bẫy 21: «giờ VN» trong việc · hạn ngắt theo now() của CSDL
for tz in "UTC UTC" "America/Los_Angeles Asia/Tokyo"; do
  set -- $tz
  o=$(TZ=$1 PGTZ=$2 chay "$CA_N" "$CA_W"); p=$(so "$o" pass); f=$(so "$o" fail)
  [ "${f:-1}" -eq 0 ] && [ "${p:-0}" -ge 20 ]; ket "①c-cả-bộ-ở-TZ=$1-PGTZ=$2" $? "pass=${p:-?} fail=${f:-?}"
done

# ② tĩnh (phụ — hành vi đã đo ở ①)
xuat() { grep -oE '^export (async )?(function|const|let|class) [A-Za-z_0-9]+' | sed -E 's/.* //' | sort; }
them=$(comm -13 <(git show "$BASE:src/pancake.js" | xuat) <(xuat < src/pancake.js) | tr '\n' ' ')
[ -z "$them" ]; ket "②a-pancake.js-không-thêm-export-(②1-·-neo-gl4-④b)" $? "export mới: ${them:-không}"
n_fetch=$(grep -vE '^\s*//' src/pancake.js | grep -cE '(^|[^.A-Za-z_])fetch\(')
n_goi=$(grep -vE '^\s*//' src/pancake.js | grep -cE 'goiPancake\(')
[ "$n_fetch" -eq 1 ] && [ "$n_goi" -eq 6 ]; ket "②b-pancake.js-vẫn-một-cửa-fetch-(gl3-③)" $? "fetch( mã=$n_fetch (đòi 1) · goiPancake( =$n_goi (đòi 6)"
SK=v3/src/ui/suc-khoe/kho-suc-khoe.js
khac=$(git diff -U0 "$BASE" -- "$SK" | grep -E '^[-+][^-+]' | grep -vE '^[-+]\s*\*' | grep -vcE "vi: \`Không page nào của team đang ngắt kênh Pancake \(")
[ "$khac" -eq 0 ]; ket "②c-kho-suc-khoe.js-CHỈ-đổi-câu-(②6)" $? "dòng đổi ngoài chú thích / câu đèn xanh: $khac (đòi 0)"
git diff --quiet "$BASE" -- ops/bin/nghiem-thu/gl4.sh ops/bin/nghiem-thu/gl3b.sh; ket "②d-gl4.sh-·-gl3b.sh-không-đổi-(neo-giữ-nguyên)" $? "$(git diff --stat "$BASE" -- ops/bin/nghiem-thu/gl4.sh ops/bin/nghiem-thu/gl3b.sh | tail -1)"

# ③ ĐẢO-VÁ (④7) trên BẢN SAO TẠM — mỗi đột biến một tiến trình node mới. Luật đọc: các ca khai PHẢI nằm trong tập đỏ.
T=$(mktemp -d "${TMPDIR:-/tmp}/gl3c.XXXXXX"); [ "${GIU_TAM:-0}" = 1 ] || trap 'rm -rf "$T"' EXIT
mkdir -p "$T/test"
chep() { rm -rf "$T/src" "$T/db" "$T/v3"; mkdir -p "$T/v3"; cp -R src "$T/src"; cp -R db "$T/db"; cp -R v3/src "$T/v3/src"; cp -R v3/testkit "$T/v3/testkit"; }
chep; cp test/_an-toan.mjs "$CA_N" "$CA_W" "$T/test/"
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
  local o r t x ds="" thieu=""; for x in $ca; do ds="$ds test/$(basename "$x")"; done   # <tệp ca> có thể là NHIỀU tệp cách bằng dấu cách
  # shellcheck disable=SC2086
  o=$(dot --test-name-pattern="$mau" $ds); r=$(do_ten "$o")
  for t in $phai; do echo " $r " | grep -qF " $t " || thieu="$thieu$t "; done
  [ -z "$thieu" ]; ket "$nhan" $? "đỏ: ${r:-không} (đòi đỏ: $phai)"
}
NAP=src/queue/nap.js; W=src/queue/worker.js; NP=src/queue/ngat-page.js; CWK=src/queue/chay-worker.js; IX=src/channels/messenger/index.js; PK=src/pancake.js
# — mười đảo-vá của ④7 —
dao "③a-cửa-nuốt-lỗi-(docHoiThoai-không-ném)-⇒-1/5-đỏ" "P1 P5a" "$CA_N $CA_W" "GL3c (P1|P5a) ·" "$IX" \
  '  if (soLoi.ok === false) {' '  if (false) {'
dao "③a2-cửa-nuốt-lỗi-(pkGetConversations-luôn-ok)-⇒-1/6-đỏ" "P1 P6" "$CA_N $CA_W" "GL3c (P1|P6) ·" "$PK" \
  '    const ok = Array.isArray(j?.conversations);' '    const ok = true;'
dao "③b-đếm-mỗi-vòng-(lỗi-danh-sách-vào-bộ-đếm-theo-khoá)-⇒-1b/1c-đỏ" "P1b P1c" "$CA_N" "GL3c P1[bc] ·" "$NAP" \
  '  dsLoiTu.set(pid, tu);' '  dsLoiTu.set(pid, tu); await ghiLoiKenh(pool, { teamId, pageId: pid, tinId: -bay, kieu: "doc", lyDo: "mỗi vòng" });'
dao "③c-danh-sách-OK-gọi-ghiDocTot-⇒-2b-đỏ" "P2b" "$CA_N" "GL3c P2b ·" "$NAP" \
  '  dsLoiTu.delete(String(pageId));   // đọc được danh sách' '  await ghiDocTot(pool, { teamId, pageId }); dsLoiTu.delete(String(pageId));   // đọc được danh sách'
dao "③d-không-đếm-lỗi-kênh-ở-nạp-⇒-2-đỏ" "P2" "$CA_N" "GL3c P2 ·" "$NAP" \
  '      if (!duLieu && ht?.id != null) {' '      if (false) {'
dao "③e-giao-cả-lỗi-kênh-⇒-2-đỏ" "P2" "$CA_N" "GL3c P2 ·" "$NAP" \
  '(duLieu ? 1 : 0)' '1' \
  '      if (duLieu && luot >= LUOT_LOI_GIAO_SALE && ht?.id != null) {' '      if (luot >= LUOT_LOI_GIAO_SALE && ht?.id != null) {'
dao "③f-bỏ-giao-lỗi-bền-⇒-3-đỏ" "P3" "$CA_N" "GL3c P3 ·" "$NAP" \
  '      if (duLieu && luot >= LUOT_LOI_GIAO_SALE && ht?.id != null) {' '      if (false) {'
dao "③g-giao-ở-lượt-1-⇒-3-(vế-chưa-giao)-đỏ" "P3" "$CA_N" "GL3c P3 ·" "$NAP" \
  'export const LUOT_LOI_GIAO_SALE = 3;' 'export const LUOT_LOI_GIAO_SALE = 1;'
dao "③h-đặt-lại-luot-sau-quãng-ngắt-(theo-lan)-⇒-3b-đỏ" "P3b" "$CA_N" "GL3c P3b ·" "$NAP" \
  '      const luot = (lui?.luot || 0) + (duLieu ? 1 : 0);' '      const luot = (lan === 1 ? 0 : lui?.luot || 0) + (duLieu ? 1 : 0);'
dao "③i-giao-khi-sale-giữ-⇒-4-đỏ" "P4" "$CA_N" "GL3c P4 ·" "$NAP" \
  "          AND h.chu_so_huu = 'AI' AND h.trang_thai IN ('GREET', 'QUALIFY', 'SELLING')" ''
dao "③j-webhook-về-banGiaoLoi-(không-ném-lại-LoiDocLichSu)-⇒-5-đỏ" "P5a" "$CA_W" "GL3c P5a ·" "$W" \
  '        throw new LoiDocLichSu(eDs.message, { capKenh: eDs.capKenh === true });' '        throw eDs;'
# — thêm ngoài danh sách ④7: chỗ review vòng 2 động vào (R2-N1 · R2-N2 · R2-N3) + biên + «đột biến nào KHÔNG đỏ» hay lọt —
dao "③k-không-xoá-mốc-lỗi-danh-sách-khi-ngắt-(R2-N1)-⇒-1d-đỏ" "P1d" "$CA_N" "GL3c P1d ·" "$NAP" \
  'dsLoiTu.delete(pid);   // R2-N1' '/* đột biến: không xoá */   // R2-N1'
dao "③l-giữ-mốc-của-page-vòng-này-không-thấy-lỗi-(ngắt-đọc-đường-khác-·-đổi-webhook)-⇒-1f/1i-đỏ" "P1f P1i" "$CA_N" "GL3c P1[fi] ·" "$NAP" \
  '  for (const pid of [...dsLoiTu.keys()]) if (!giu.has(pid)) dsLoiTu.delete(pid);' ''
dao "③l2-nối-chuỗi-cả-khi-page-đang-ngắt-gửi-⇒-1h-đỏ" "P1h" "$CA_N" "GL3c P1h ·" "$NAP" \
  '  if (!locPageNgat([pid]).length) {' '  if (false) {'
dao "③m-worker-đếm-đọc-theo-TIN-(một-khách-hai-khoá,-R2-N2)-⇒-1e-đỏ" "P1e" "$CA_N" "GL3c P1e ·" "$W" \
  'tinId: k.loi.kieu === "doc" ? await khoaDocTheoHoiThoai(p, k.tin) : k.tin.id' 'tinId: k.tin.id'
dao "③n-nạp-đọc-lịch-sử-OK-không-ghiDocTot-(R2-N2)-⇒-2c-đỏ" "P2c" "$CA_N" "GL3c P2c ·" "$NAP" \
  'await ghiDocTot(pool, { teamId, pageId });   // R2-N2' '/* đột biến: không ghiDocTot */   // R2-N2'
dao "③o-ngatPage-không-cập-nhật-bộ-nhớ-chung-⇒-1-đỏ-(tin-W-bị-rút-trong-lượt-ngắt)" "P1" "$CA_N" "GL3c P1 ·" "$NP" \
  '    _ngat.set(ra.pageId, { vi: ra.vi, den: ra.den, lyDo: ra.lyDo });' ''
dao "③p-ngắt-ngay-lỗi-đầu-(bỏ-ngưỡng-thời-gian)-⇒-1/1b-đỏ" "P1 P1b" "$CA_N" "GL3c P1b? ·" "$NAP" \
  '  if (bay - tu >= T_NGAT_DS_MS) {' '  if (true) {'
dao "③q-biên-ngưỡng-(>=-thành->)-⇒-1-đỏ" "P1" "$CA_N" "GL3c P1 ·" "$NAP" \
  '  if (bay - tu >= T_NGAT_DS_MS) {' '  if (bay - tu > T_NGAT_DS_MS) {'
dao "③r-biên-lượt-giao-(>=-thành->)-⇒-3-đỏ" "P3" "$CA_N" "GL3c P3 ·" "$NAP" \
  'duLieu && luot >= LUOT_LOI_GIAO_SALE' 'duLieu && luot > LUOT_LOI_GIAO_SALE'
dao "③s-N6-chỉ-lỗi-cấp-kênh-mới-là-lỗi-danh-sách-⇒-1n-đỏ" "P1n" "$CA_N" "GL3c P1n ·" "$IX" \
  '  if (soLoi.ok === false) {' '  if (soLoi.ok === false && soLoi.capKenh === true) {'
dao "③t-ngatPage-bỏ-điều-kiện-«chưa-ngắt»-⇒-1g-đỏ" "P1g" "$CA_N" "GL3c P1g ·" "$NP" \
  "        WHERE ngat_ly_do = '' AND team_id = \$1 AND page_id = \$2" '        WHERE team_id = $1 AND page_id = $2'
dao "③v-rời-đi-không-đặt-lại-đếm-lỗi-bền-⇒-3c-đỏ" "P3c" "$CA_N" "GL3c P3c ·" "$NAP" \
  '  if (lu) { lu.luot = 0; lu.tu = null; }' ''
# sau /code-review (bẫy 26: bản vá cũng là code mới)
dao "③w-giao-0-dòng-giữ-đếm-cũ-(/code-review-#5)-⇒-4-đỏ" "P4" "$CA_N" "GL3c P4 ·" "$NAP" \
  '          luiDocTin.delete(khoaMoc);' '          if (giao.banGiao) luiDocTin.delete(khoaMoc);'
dao "③x-giữ-mốc-cả-page-nạp-mà-không-tới-bước-đọc-danh-sách-(/code-review-#2)-⇒-1i-đỏ" "P1i" "$CA_N" "GL3c P1i ·" "$CWK" \
  '        if (r.dsLoi) { ket.nap.dsLoi += 1; ket.nap.dsLoiCuoi = `${pageId}: ${r.lyDo}`; loiDsVong.push(pageId); }' \
  '        loiDsVong.push(pageId); if (r.dsLoi) { ket.nap.dsLoi += 1; ket.nap.dsLoiCuoi = `${pageId}: ${r.lyDo}`; }'
dao "③u-log-vòng-không-in-page-lỗi-danh-sách-⇒-1b-đỏ" "P1b" "$CA_N" "GL3c P1b ·" "$CWK" \
  '        if (r.dsLoi) { ket.nap.dsLoi += 1;' '        if (false) { ket.nap.dsLoi += 1;'
chep; o=$(dot "test/$(basename "$CA_N")" "test/$(basename "$CA_W")"); f=$(so "$o" fail); p=$(so "$o" pass)
[ "${f:-1}" -eq 0 ] && [ "${p:-0}" -ge 20 ]; ket "③0-bản-sao-nguyên-vẹn-xanh-(thước-không-tự-đỏ)" $? "pass=${p:-?} fail=${f:-?}"

# ④ phép 8 — cổng cũ XANH (rc tách dòng) + bộ ca chạm cửa/hàng đợi/worker/đèn. gl3b.sh: đảo-vá ⑤d ⑤o ⑤b phải còn ✅ (neo nap.js/worker.js).
if [ "${BO_CONG_CU:-0}" != 1 ]; then
  SHIM=$(mktemp -d "${TMPDIR:-/tmp}/gl3c-shim.XXXXXX"); printf '#!/bin/sh\nexec grep -E "$@"\n' > "$SHIM/rg"; chmod +x "$SHIM/rg"
  PATH_CON="$PATH"; command -v rg >/dev/null 2>&1 || PATH_CON="$SHIM:$PATH"
  # gl4.sh chạy ①–⑤ của nó (BO_CONG_CU=1 bỏ ⑥ lồng gl3b/gl3/gl2 — hai cổng đầu chạy riêng ngay dưới, rc tách dòng)
  for g in gl4 gl3b gl3; do
    o=$(env -u CHAY_NPM_TEST -u CHAY_SO_BASE BO_CONG_CU=1 PATH="$PATH_CON" bash "ops/bin/nghiem-thu/$g.sh" 2>&1); r=$?
    [ "$r" -ne 0 ] && echo "$o" | grep -E "^(🔴|   ✘)" | head -8 | sed 's/^/   ↳ /'
    ket "④$g.sh" "$r" "rc=$r · $(echo "$o" | grep -E '^== ĐỎ' | tail -1)"
    if [ "$g" = gl3b ]; then
      nv=$(echo "$o" | grep -cE '^✅ ⑤(d|o|b)-')
      [ "$nv" -eq 3 ]; ket "④b-gl3b-đảo-vá-⑤d·⑤o·⑤b-còn-đỏ-đúng" $? "✅ $nv/3"
    fi
  done
  rm -rf "$SHIM"
  for c in test/l1-m2-cua.test.js test/l2-m1-hang-doi.test.js test/l2-m1-nhac-truong.test.js test/va-p7-chay-worker.test.js \
           test/phase1-chat-flow.test.js test/gl3b-worker-doc-loi.test.mjs test/gl3b-nap-doc-loi.test.mjs test/gl3b-pancake-van-hanh.test.mjs \
           test/gl3b-vong2.test.mjs test/gl4-ngat-page.test.mjs test/gl4-chua-034.test.mjs v3/test/b/suc-khoe.test.mjs; do
    o=$(chay "$c"); r=$?; f=$(so "$o" fail); p=$(so "$o" pass)
    [ "$r" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -4 | sed 's/^/   ↳ /'
    [ "$r" -eq 0 ] && [ "${f:-1}" -eq 0 ] && [ "${p:-0}" -ge 1 ]; ket "④$(basename "$c")" $? "rc=$r pass=${p:-?} fail=${f:-?}"
  done
else
  echo "⏸ ④cổng-cũ HOÃN (BO_CONG_CU=1)"
fi

# ⑤ npm test — chỉ khi CHAY_NPM_TEST=1 (luật 6). Thước: fail=0. `--test-force-exit` vì `npm test` trần TREO ở một tệp ca không thoát
# tiến trình (đo 07/10: v3/test/b/ll15a-hrm-man.test.mjs chạy riêng 6/6 trong 3,5 s, trong lượt cả bộ thì tiến trình con đứng 12′+).
if [ "${CHAY_NPM_TEST:-}" = 1 ]; then
  o=$(npm test -- --test-force-exit 2>&1); nt=$(so "$o" tests); nf=$(so "$o" fail)
  [ "${nf:-1}" -eq 0 ]; ket "⑤npm-test" $? "tests=${nt:-?} fail=${nf:-?}"
else
  echo "⏸ ⑤npm-test HOÃN — đặt CHAY_NPM_TEST=1 (luật 6: không chạy song song)"
fi
echo "== ĐỎ $do / XANH $xanh"; [ "$do" -eq 0 ]
