#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU GSP3c — «ĐÓNG HAI LỖ LÀM BỘ ĐẾM "PAGE CHƯA CHUYỂN XONG" VỀ 0 SỚM» (điều kiện trước GSP4):
#   (1) đổi món của gốc × shop ⇒ quyết định đối soát cũ hết hiệu lực — MỘT hàm bỏ dấu dùng chung (`boDauDoiSoatGocShop`) gọi ở BA cửa:
#       gắn món · gỡ món (màn Sản phẩm) · «Kéo danh mục» tự nối món theo SKU/số hiệu (nợ N-GSP3-DOI-MON + F6 · review (a) C1 · N3);
#   (2) «Kéo danh mục» (`dongBoTuPos`) không ghi `het_hang` / không đẩy bản chép cho bản sao của page ĐÃ gắn (N-GSP3B-NEN F4 · N4);
#   (3) quét lùi chỉ-đọc `demDauCu` (N1) · nhật ký gắn/gỡ nói số bản sao bị bỏ dấu (N2) · sửa giá KHÔNG bỏ dấu (N5 — ghi ở chú thích).
# Chạy: ops/bin/nghiem-thu/gsp3c.sh   (rc=0 là đạt) · GIU_TAM=1 giữ thư mục đảo-vá · CHAY_CONG_CU=0 bỏ qua ⑥ cổng cũ (mặc định CHẠY — ④8) ·
#       CHAY_NPM_TEST=1 chạy thêm `npm test` (④8 — mặc định HOÃN, luật 6: hai lượt `npm test` không chạy song song).
# Tầm đo: lưới HỒI QUY do chính thợ viết (luật 32) — bộ ca tự dựng Postgres HỘP CÁT riêng (`db/sandbox.js`, tên `_p<pid>`), tầng A + lớp
# vai/nhật ký `kho-goc.js` THẬT, `docDanhMuc` THẬT với POS giả (`nap`), `day` bản chép GIẢ đếm lời gọi. Không đo prod, không gửi tin.
# Đảo-vá trên BẢN SAO TẠM (không bao giờ sửa cây làm việc); mỗi đột biến là MỘT tiến trình node mới và phải làm ĐÚNG tập ca đã khai đỏ.
# Môi trường: thiếu `DATABASE_URL_V3` thì tự nạp từ `.env` (không in giá trị). Không dùng `rg` — chỉ `grep -E`.
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$@" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
BASE=e68a62e
CA=test/gsp3c-doi-mon.test.mjs
SAN=14

if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát"; exit 2; }
noi=$(node -e 'const u=new URL(process.env.DATABASE_URL_V3);console.log(`${u.hostname}:${u.port||5432}`)' 2>/dev/null || echo "?")
echo "── môi trường: máy dev · hộp cát Postgres trên $noi (CSDL aicloser_v3_test_gsp3c_p<pid>, tự dựng tự dọn) · cây $GOC"

# ① bộ ca GSP3c ở HAI múi giờ, ép CẢ HAI đầu (Node `TZ` + phiên CSDL `PGOPTIONS -c TimeZone`) — `demDauCu` so mốc thời gian. Thước SÀN
#    (fail=0 và pass ≥ sàn) + đọc lại múi giờ phiên CSDL mà chính ca in ra (múi giờ không ăn ⇒ đo một thế giới khác ⇒ đỏ).
OUT_CA=""
for tz in UTC Pacific/Kiritimati; do
  out=$(TZ="$tz" PGOPTIONS="-c TimeZone=$tz" chay "$CA"); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
  tz_that=$(echo "$out" | grep -oE 'GSP3c-MOI-TRUONG TimeZone=[^ ]+' | head -1 | sed 's/.*TimeZone=//')
  [ "$f" -ne 0 ] && echo "$out" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
  [ "$f" -eq 0 ] && [ "$p" -ge "$SAN" ] && [ "$tz_that" = "$tz" ]
  ket "①bộ-ca-gsp3c@$tz" $? "pass=$p fail=$f (sàn ≥$SAN) · TimeZone phiên CSDL=${tz_that:-?}"
  [ -z "$OUT_CA" ] && OUT_CA="$out"
done

# ② mỗi phép của ④ có ca XANH riêng (bảng đếm thấy/đòi). ④1=P1 · ④2=P2 · ④3=P3 · ④4=P4 · ④5=P5 · ④1b=P1b · ④2b=P2b · ④5b=P5b ·
#    ④5c=P5d (demDauCu) · ④6=P6 (lưới 032) · thêm: D0 (dựng — CHO-QUA: E «xong» nhờ dấu) · P5c (cửa ra của dongBoTuPos) ·
#    P1c (/code-review #2: kéo danh mục song song với gắn món cùng gốc × shop — không 40P01).
thay=0; doi=0; thieu=""
for tag in 'D0 ·' 'P1 ·' 'P2 ·' 'P2b ·' 'P3 ·' 'P4 ·' 'P1b ·' 'P1c ·' 'P5 ·' 'P5b ·' 'P5c ·' 'P5d ·' 'P6 ·'; do
  doi=$((doi+1))
  if echo "$OUT_CA" | grep -qF -- "✔ $tag"; then thay=$((thay+1)); else thieu="$thieu [$tag]"; fi
done
[ "$thay" -eq "$doi" ]; ket "②phép-④-có-ca-xanh" $? "$thay/$doi${thieu:+ · thiếu:$thieu}"

# ③ PHẠM VI (③ phiếu): tệp đổi trong các commit mang mã GSP3c (hoặc — khi chưa commit — cây làm việc so với $BASE) chỉ thuộc ③ +
#    nhật ký/sổ (`docs/thi-cong/`). `chuyen-ban-sao.js` (TT1/GP1 giữ — `daQuyet` không đổi) và năm tệp bộ não KHÔNG được đụng.
#    Đo theo COMMIT CỦA PHIẾU (không so $BASE với cây hiện tại) — phiếu về sau sửa các tệp này không làm phép đỏ oan (bài học TT1 · gsp3b ③c).
#    «Commit của phiếu» = tiêu đề theo khuôn thợ `type(scope): GSP3c — …` (gạch dài) — commit sổ của tổng («GSP3c → 🔨 phát», «GSP3c ✅»)
#    không tính; chưa có commit nào của thợ ⇒ đo cây làm việc.
ds_commit=$(git log --format=%H -E --grep='GSP3[cC] —' "$BASE"..HEAD 2>/dev/null)
if [ -n "$ds_commit" ]; then
  tep_doi=$(for h in $ds_commit; do git show --name-only --format= "$h"; done | grep . | sort -u); nguon="$(echo "$ds_commit" | grep -c .) commit mang mã GSP3c"
else
  tep_doi=$( (git diff --name-only "$BASE"; git ls-files --others --exclude-standard) | grep . | sort -u); nguon="cây làm việc so với $BASE (chưa commit)"
fi
#    Tổng NỚI ③ 07/10: + `test/gsp3-doi-soat.test.mjs` CHỈ ca ④9c F1 (dựng «món rời gốc» bằng SQL tay thay cửa gỡ — cửa gỡ từ GSP3c tự bỏ
#    dấu nên đột biến `bo_don_dau_bo_goc` của gsp3.sh hết ca đỏ) ⇒ phép ③c: tệp đó chỉ được mất ĐÚNG một dòng — lời gọi cửa gỡ của ④9c F1.
ngoai=$(echo "$tep_doi" | grep . | grep -vE '^(src/products/san-pham-goc\.js|src/products/noi-pos\.js|src/pos/doc-danh-muc\.js|v3/src/ui/san-pham/kho-goc\.js|test/gsp3c-[^/]*\.test\.mjs|test/gsp3-doi-soat\.test\.mjs|ops/bin/nghiem-thu/gsp3c\.sh|docs/thi-cong/.*)$')
[ -z "$ngoai" ]; ket "③phạm-vi-③-phiếu" $? "$nguon · tệp ngoài ③: ${ngoai:-0}"
if [ -n "$ds_commit" ]; then
  xoa_f1=$(for h in $ds_commit; do git show --format= "$h" -- test/gsp3-doi-soat.test.mjs; done | grep -E '^-[^-]')
else
  xoa_f1=$(git diff "$BASE" -- test/gsp3-doi-soat.test.mjs | grep -E '^-[^-]')
fi
n_xoa_f1=$(echo "$xoa_f1" | grep -c .)
{ [ "$n_xoa_f1" -eq 0 ] || { [ "$n_xoa_f1" -eq 1 ] && echo "$xoa_f1" | grep -qF "await goMonPosKhoiGoc(pool, T, E0.id, '111:e1');"; }; }
ket "③c-nới-③-chỉ-ca-④9c-F1" $? "dòng cũ bị sửa/xoá trong test/gsp3-doi-soat.test.mjs=$n_xoa_f1 (đòi ≤1, đúng lời gọi gỡ e1 của ④9c F1)"
cam=$(echo "$tep_doi" | grep -cE '^src/(products/chuyen-ban-sao|prompts|closer|tools|fast-lane|outbound-guard)\.js$')
[ "$cam" -eq 0 ]; ket "③b-không-đụng-chuyen-ban-sao-và-bộ-não" $? "số tệp cấm bị đụng=$cam (đòi 0)"

# ④ ĐẢO-VÁ trên BẢN SAO TẠM: lượt CHỨNG (bản sao chưa đột biến phải xanh) rồi từng đột biến phải làm ĐÚNG tập ca đỏ đã khai.
TAM=$(mktemp -d "${TMPDIR:-/tmp}/gsp3c-dao-va.XXXXXX")
SHIM=$(mktemp -d "${TMPDIR:-/tmp}/gsp3c-shim.XXXXXX")
don() { [ "${GIU_TAM:-}" = 1 ] && echo "   (giữ $TAM)" || rm -rf "$TAM"; rm -rf "$SHIM"; }
trap don EXIT; trap 'exit 130' INT TERM
cp -R src v3 test db package.json "$TAM/"; ln -s "$GOC/node_modules" "$TAM/node_modules"
[ -f .env ] && cp .env "$TAM/.env"
DS_TEP_DOT='src/products/san-pham-goc.js src/products/noi-pos.js src/pos/doc-danh-muc.js v3/src/ui/san-pham/kho-goc.js'
for f in $DS_TEP_DOT; do cp "$TAM/$f" "$TAM/$f.goc"; done
bam_cay() { (for f in $DS_TEP_DOT; do cat "$GOC/$f"; done) | shasum | cut -d' ' -f1; }
BAM_TRUOC=$(bam_cay)
chay_tam() { (cd "$TAM" && node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$CA" 2>&1); }
chuan_tap() { tr ';' '\n' | grep . | LC_ALL=C sort -u | tr '\n' ';' | sed 's/;$//'; }
do_cua() { echo "$1" | grep -oE "✖ [A-Z][0-9]+[a-z]? ·" | sed 's/^✖ //' | tr '\n' ';' | chuan_tap; }
oc=$(chay_tam); fc=$(so "$oc" fail); pc=$(so "$oc" pass)
[ "${fc:-1}" -eq 0 ] && [ "${pc:-0}" -ge "$SAN" ]; ket "④0-lượt-chứng-bản-sao-tạm-xanh" $? "pass=${pc:-0} fail=${fc:-?}"
# tên | tệp đột biến | tập ca PHẢI đỏ, ĐÚNG BẰNG (cách bằng ;) — ④7 phiếu: go ⇒ P1 · gan ⇒ P2 · doc-danh-muc ⇒ P1b · bỏ kẹp team ⇒ P2b ·
#   bỏ lọc page đã gắn ⇒ P5. Thêm: từng lớp của dongBoTuPos · chuỗi rỗng (N4) · gắn lại daCo (N3) · demDauCu · lưới 032 · nhật ký (N2).
DS_DOT_BIEN='
go_bo_don|src/products/san-pham-goc.js|P1 ·;P2b ·;P3 ·
gan_bo_don|src/products/san-pham-goc.js|P2 ·;P3 ·
keo_bo_don|src/pos/doc-danh-muc.js|P1b ·
keo_bo_don_bu|src/pos/doc-danh-muc.js|P1b ·
keo_bo_don_moi|src/pos/doc-danh-muc.js|P1b ·
keo_bo_dau_giua_luot|src/pos/doc-danh-muc.js|P1c ·
bo_kep_team|src/products/san-pham-goc.js|P1 ·;P2b ·
gan_lai_van_bo_dau|src/products/san-pham-goc.js|P2b ·
dong_bo_bo_loc_da_gan|src/products/noi-pos.js|P5 ·;P5c ·
dong_bo_bo_loc_cau_chon|src/products/noi-pos.js|P5 ·;P5b ·;P5c ·
dong_bo_bo_cua_ra|src/products/noi-pos.js|P5c ·
dong_bo_rong_la_da_gan|src/products/noi-pos.js|P5b ·
dem_bo_moc|src/products/san-pham-goc.js|P5d ·
dem_bo_kep_team|src/products/san-pham-goc.js|P5d ·
bo_luoi_032|src/products/san-pham-goc.js|P6 ·
nhat_ky_bo_cau|v3/src/ui/san-pham/kho-goc.js|P1 ·;P2 ·
'
while IFS='|' read -r ten tep dong; do
  [ -z "$ten" ] && continue
  cp "$TAM/$tep.goc" "$TAM/$tep"
  if ! python3 - "$TAM/$tep" "$ten" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1]); s = p.read_text(encoding='utf-8'); ten = sys.argv[2]
DOT = {
  # ③ phiếu: bỏ bước dọn dấu ở từng cửa
  'go_bo_don': [('    const boDau = await boDauDoiSoatGocShop(khach, teamId, r.rows[0].ma_goc, shopCua(ma));\n', '    const boDau = 0;\n')],
  'gan_bo_don': [('    const boDau = daCo ? 0 : await boDauDoiSoatGocShop(khach, teamId, g.ma_goc, shopCua(ma));\n', '    const boDau = 0;\n')],
  'keo_bo_don': [('  for (const g of gocDoiMon) await boDauDoiSoatGocShop(pool, team.teamId, g, String(ketNoi.shopId));\n', '')],
  'keo_bo_don_bu': [('          if (thieuGoc) gocDoiMon.add(maGoc);\n', '')],
  'keo_bo_don_moi': [('        if (maGoc) gocDoiMon.add(maGoc);', '        void 0;')],
  # /code-review #2: bỏ dấu GIỮA lượt (ngay tại nhánh bù) ⇒ thứ tự khoá ngược gắn/gỡ ⇒ 40P01 khi chạy song song
  'keo_bo_dau_giua_luot': [('          if (thieuGoc) gocDoiMon.add(maGoc);\n',
                            '          if (thieuGoc) await boDauDoiSoatGocShop(pool, team.teamId, maGoc, String(ketNoi.shopId));\n')],
  # review N3: kẹp team · gắn lại món vốn thuộc gốc không bỏ dấu
  'bo_kep_team': [("      WHERE team_id = $1 AND nguon <> 'pos' AND doi_soat IN ('chep', 'giu_gia_mon') AND doi_soat_goc = $2 AND doi_soat_shop = $3`,",
                   "      WHERE $1::bigint IS NOT NULL AND nguon <> 'pos' AND doi_soat IN ('chep', 'giu_gia_mon') AND doi_soat_goc = $2 AND doi_soat_shop = $3`,")],
  'gan_lai_van_bo_dau': [('    const boDau = daCo ? 0 : await boDauDoiSoatGocShop(', '    const boDau = await boDauDoiSoatGocShop(')],
  # ② Ra 2 + N4: lọc page đã gắn (câu chọn + cửa ra) — bỏ CẢ HAI lớp / từng lớp / chuỗi rỗng thành «đã gắn»
  'dong_bo_bo_loc_da_gan': [("        AND COALESCE(pg.san_pham_goc_ma, '') = ''`,", "`,"), ('      if (daGanGoc(trang)) {', '      if (false) {')],
  'dong_bo_bo_loc_cau_chon': [("        AND COALESCE(pg.san_pham_goc_ma, '') = ''`,", "`,")],
  'dong_bo_bo_cua_ra': [('      if (daGanGoc(trang)) {', '      if (false) {')],
  'dong_bo_rong_la_da_gan': [("        AND COALESCE(pg.san_pham_goc_ma, '') = ''`,", "        AND pg.san_pham_goc_ma IS NULL`,")],
  # ② Ra 6 (N1): mốc «món đổi sau dấu» · kẹp team của phép nối
  'dem_bo_moc': [(' AND m.sua_luc > b.doi_soat_luc\n', '\n')],
  'dem_bo_kep_team': [("JOIN san_pham m ON m.team_id = b.team_id AND m.nguon = 'pos'", "JOIN san_pham m ON m.nguon = 'pos'")],
  # ② lưới migration 032 của hàm bỏ dấu
  'bo_luoi_032': [('  if (!(await coCotDoiSoat(db))) return 0;\n', '')],
  # ② Ra 1 + N2: câu nhật ký nói số bản sao bị bỏ dấu
  'nhat_ky_bo_cau': [('const cauBoDau = (kq) => (kq.boDauDoiSoat\n', "const cauBoDau = (kq) => (false\n")],
}[ten]
for o, n in DOT:
    assert s.count(o) == 1, (ten, o[:70])
    s = s.replace(o, n)
p.write_text(s, encoding='utf-8')
PY
  then ket "④đảo-vá-$ten" 1 "không áp được đột biến (khuôn không còn khớp — thước cũ)"; continue; fi
  o=$(chay_tam)
  cp "$TAM/$tep.goc" "$TAM/$tep"
  that=$(do_cua "$o"); cho=$(echo "$dong" | chuan_tap)
  [ "$that" = "$cho" ]; ket "④đảo-vá-${ten} ⇒ đỏ đúng «${dong}»" $? "thật: ${that:-(không ca nào đỏ)}"
done <<< "$DS_DOT_BIEN"
oh=$(chay_tam); fh=$(so "$oh" fail)
[ "${fh:-1}" -eq 0 ]; ket "④z-khôi-phục-bản-sao-xanh-lại" $? "fail=${fh:-?}"
[ "$(bam_cay)" = "$BAM_TRUOC" ] && [ -z "$(git status --porcelain -- '*.goc')" ]
ket "④cây-làm-việc-không-dính-đột-biến" $? "băm 4 tệp bị đột biến trong cây trước = sau · 0 tệp .goc lạc"

# ⑤ bộ ca cũ chạm đúng bốn tệp đã sửa — chạy RIÊNG (rc tách dòng): gắn/gỡ món · nối POS · kéo danh mục · nhật ký kho-goc · đối soát GSP3.
for t in test/ll13-san-pham-goc.test.mjs test/mn8-noi-pos.test.mjs test/ve8a-gop-mon.test.mjs test/keo-danh-muc.test.mjs \
         test/l1-m1-doc-pos.test.js test/gsp2-chuyen-ban-sao.test.mjs test/gsp3-doi-soat.test.mjs test/gsp3b-chot-ban-sao.test.mjs \
         v3/test/b/ll13-san-pham.test.mjs v3/test/b/gsp1-san-pham-goc-chi-tu-gop.test.mjs v3/test/b/ll15d-marketer-man.test.mjs; do
  o=$(chay "$t"); pp=$(so "$o" pass); ff=$(so "$o" fail); pp=${pp:-0}; ff=${ff:-1}
  [ "$ff" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -3 | sed 's/^/   ↳ /'
  [ "$ff" -eq 0 ] && [ "$pp" -ge 1 ]; ket "⑤ca-cũ" $? "$t pass=$pp fail=$ff"
done

# ⑥ cổng cũ của ④8 (rc TÁCH DÒNG). Cổng con gọi `rg` thì cấp shim `rg → grep -E` CHỈ cho tiến trình con (nợ N-GSP-CONG-RG-ENV).
#    Cổng con ĐỎ ⇒ ĐỐI CHỨNG cùng thước: chạy CHÍNH cổng đó trên worktree tạm ở $BASE, so DANH SÁCH dòng đỏ (chuẩn hoá số id/pid) —
#    giống hệt ⇒ đỏ SẴN có từ trước phiếu; một dòng đỏ MỚI ⇒ đỏ. Trần thời gian mỗi cổng con (máy dev không có `timeout`).
if [ "${CHAY_CONG_CU:-1}" = 1 ]; then
  printf '#!/bin/sh\nexec grep -E "$@"\n' > "$SHIM/rg"; chmod +x "$SHIM/rg"
  PATH_CON="$PATH"; command -v rg >/dev/null 2>&1 || { PATH_CON="$SHIM:$PATH"; echo "   (máy này không có rg trong bash — cổng con nhận shim grep -E · nợ N-GSP-CONG-RG-ENV)"; }
  chuan_do() { grep -E "✘|🔴" | sed -E 's/[0-9]{4,}//g; s/p[0-9]+//g; s/\([0-9.]+ms\)//g' | sort; }
  TRAN_CON="${TRAN_CON:-3600}"
  # Giết TRỌN cây con (con trước, cha sau): cổng con lồng nhau tự `set -m` ⇒ cháu nằm ở nhóm tiến trình KHÁC, `kill -- -pid` không với
  # tới ⇒ mồ côi treo mãi (đo 07/10 lượt 2: gsp3b → gsp3 → ll15b treo 51′ dưới PID 1, cwd worktree đối chứng tạm).
  giet_cay() { local c; for c in $(pgrep -P "$1" 2>/dev/null); do giet_cay "$c"; done; kill -KILL "$1" 2>/dev/null; }
  chay_con() {   # chay_con <tệp cổng> — in log của cổng con; rc=124 khi quá TRAN_CON giây
    local tep=$1 out; out=$(mktemp)
    set -m; PATH="$PATH_CON" bash "$tep" > "$out" 2>&1 & local pid=$!; set +m
    local t=0
    while kill -0 "$pid" 2>/dev/null; do
      sleep 5; t=$((t+5))
      if [ "$t" -ge "$TRAN_CON" ]; then giet_cay "$pid"; kill -KILL -- "-$pid" 2>/dev/null; wait "$pid" 2>/dev/null; cat "$out"; rm -f "$out"; return 124; fi
    done
    wait "$pid"; local rc=$?; cat "$out"; rm -f "$out"; return "$rc"
  }
  WT_BASE=""
  don_wt() { [ -n "$WT_BASE" ] && git worktree remove --force "$WT_BASE" >/dev/null 2>&1; rm -rf "$(dirname "${WT_BASE:-/nonexistent/x}")" 2>/dev/null; }
  trap 'don; don_wt' EXIT
  for g in gsp2 gsp3 gsp3b ve8a ll13; do
    _o=$(chay_con "ops/bin/nghiem-thu/$g.sh"); _r=$?
    if [ "$_r" -eq 0 ]; then ket "⑥cổng-cũ-$g" 0 "rc=0"; continue; fi
    if [ "$_r" -eq 124 ]; then
      echo "$_o" | grep -E "✘|🔴" | tail -3 | sed 's/^/   ↳ /'
      ket "⑥cổng-cũ-$g" 1 "TREO quá ${TRAN_CON}s — giết cả nhóm; chạy riêng cổng đó để phân biệt chập chờn"; continue
    fi
    if [ -z "$WT_BASE" ]; then
      WT_BASE="$(mktemp -d "${TMPDIR:-/tmp}/gsp3c-base.XXXXXX")/wt"
      git worktree add -q --detach "$WT_BASE" "$BASE" >/dev/null 2>&1 && ln -s "$GOC/node_modules" "$WT_BASE/node_modules" \
        && { [ ! -f "$GOC/.env" ] || ln -s "$GOC/.env" "$WT_BASE/.env"; }
    fi
    _moi=$(echo "$_o" | chuan_do)
    _cu=$( (cd "$WT_BASE" 2>/dev/null && chay_con "ops/bin/nghiem-thu/$g.sh") | chuan_do)
    _them=$(comm -13 <(echo "$_cu") <(echo "$_moi") | grep -c .)
    if [ -z "$_moi" ]; then
      echo "$_o" | tail -3 | sed 's/^/   ↳ /'; ket "⑥cổng-cũ-$g" 1 "rc=$_r mà không in dòng đỏ nào — cổng con chết giữa chừng"; continue
    fi
    if [ -n "$_cu" ] && [ "$_them" -eq 0 ]; then
      ket "⑥cổng-cũ-$g" 0 "rc=$_r — ĐỎ SẴN ở $BASE: $(echo "$_moi" | grep -c .) dòng đỏ giống hệt base, 0 dòng đỏ mới (không do GSP3c)"
    else
      comm -13 <(echo "$_cu") <(echo "$_moi") | head -5 | sed 's/^/   ↳ MỚI: /'
      ket "⑥cổng-cũ-$g" 1 "rc=$_r · $_them dòng đỏ MỚI so với $BASE"
    fi
  done
else
  echo "   ⑥cổng-cũ: BỎ QUA (CHAY_CONG_CU=0) — không tính vào ĐỎ/XANH; nghiệm thu phải chạy mặc định"
fi

# ⑦ npm test (④8) — chỉ khi CHAY_NPM_TEST=1. Thước: fail=0 (mốc worktree base 64a13a9: 2489 ca · 0 đỏ · 22 bỏ qua vì thiếu dữ liệu thật).
if [ "${CHAY_NPM_TEST:-}" = 1 ]; then
  o=$(npm test 2>&1); nt=$(so "$o" tests); nf=$(so "$o" fail)
  [ "${nf:-1}" -eq 0 ]; ket "⑦npm-test" $? "tests=${nt:-?} fail=${nf:-?}"
else
  echo "   ⑦npm-test: HOÃN (đặt CHAY_NPM_TEST=1 khi không lượt đo nào khác đang chạy — luật 6) — không tính vào ĐỎ/XANH"
fi
echo "== ĐỎ $do / XANH $xanh"
exit $((do > 0))
