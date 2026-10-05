#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU GSP3b — «TRANG PAGE ĐỌC ĐÚNG THỨ BOT ĐỌC; KHOÁ SỬA BẢN SAO CỦA PAGE ĐÃ GẮN» (CR-02-10b mục 2 lớp 4 · 5e · G2-N1).
# Chạy: ops/bin/nghiem-thu/gsp3b.sh      (rc=0 là đạt) · GIU_TAM=1 giữ thư mục đảo-vá · CHAY_NPM_TEST=1 chạy thêm `npm test` (④8 — mặc định
# HOÃN vì luật 6: hai lượt `npm test` không chạy song song; chạy khi chắc không ai đang đo).
# Tầm đo: lưới HỒI QUY do chính thợ viết (luật 32) — ba tệp ca tự dựng Postgres HỘP CÁT riêng (`db/sandbox.js`, tên `_p<pid>`), router +
# tầng sản phẩm THẬT, `day` bản chép GIẢ đếm lời gọi, trang page chạy script THẬT trên DOM giả. Không đo prod, không gửi tin.
# Đảo-vá trên BẢN SAO TẠM (luật cổng GSP1 — không bao giờ sửa cây làm việc chung); mỗi đột biến là MỘT tiến trình node mới, và phải làm
# ĐÚNG tập ca đã khai đỏ (không thừa, không thiếu) — «bỏ chốt ở một cửa ⇒ đỏ đúng cửa đó» (④6).
# Môi trường: thiếu `DATABASE_URL_V3` thì tự nạp từ `.env` (không in giá trị). Không dùng `rg` (nợ N-GSP-CONG-RG-ENV) — chỉ `grep -E`.
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$@" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
BASE=aa43268
CA_A=test/gsp3b-chot-ban-sao.test.mjs
CA_C=v3/test/b/gsp3b-cua-luu.test.mjs
CA_P=v3/test/b/gsp3b-trang-page.test.mjs

if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát"; exit 2; }
noi=$(node -e 'const u=new URL(process.env.DATABASE_URL_V3);console.log(`${u.hostname}:${u.port||5432}`)' 2>/dev/null || echo "?")
echo "── môi trường: máy dev · hộp cát Postgres trên $noi (CSDL aicloser_v3_test_gsp3b*_p<pid>, tự dựng tự dọn) · cây $GOC"

# ① bộ ca GSP3b — thước SÀN (fail=0 và pass ≥ sàn), không neo số tuyệt đối
out=$(chay "$CA_A" "$CA_C" "$CA_P"); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -ne 0 ] && echo "$out" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
[ "$f" -eq 0 ] && [ "$p" -ge 32 ]; ket "①bộ-ca-gsp3b" $? "pass=$p fail=$f (sàn ≥32)"

# ② mỗi phép của ④ có ca XANH riêng (bảng đếm thấy/đòi). ④1 = H1 H2 H3 T1 T2 · ④2 = H4 H5b H6 H9 D1–D8 D11–D14 · ④3 = H5 H7 D9 D10 ·
#   ④5 = T3 T4 T5 T6 (T5 · T6 + D12–D14 · H5b · H9 thêm sau /code-review).
thay=0; doi=0; thieu=""
for tag in 'H1 ·' 'H2 ·' 'H3 ·' 'H4 ·' 'H5 ·' 'H5b ·' 'H6 ·' 'H7 ·' 'H8 ·' 'H9 ·' 'D1 ·' 'D2 ·' 'D3 ·' 'D4 ·' 'D5 ·' 'D6 ·' 'D7 ·' 'D8 ·' \
           'D9 ·' 'D10 ·' 'D11 ·' 'D12 ·' 'D13 ·' 'D14 ·' 'T1 ·' 'T2 ·' 'T3 ·' 'T4 ·' 'T5 ·' 'T6 ·'; do
  doi=$((doi+1))
  if echo "$out" | grep -qF -- "✔ $tag"; then thay=$((thay+1)); else thieu="$thieu [$tag]"; fi
done
[ "$thay" -eq "$doi" ]; ket "②phép-④-có-ca-xanh" $? "$thay/$doi${thieu:+ · thiếu:$thieu}"

# ③ nối dây `v3/chay-that.js` (cần cả hệ — bộ ca không khởi động được): docKhoi.sanPham đi ĐÚNG bộ đọc có `trang`. Đây là phép HÌNH DẠNG
#    (luật 30): đường đi dữ liệu của chính `docSanPhamTrangPage` do ① đo (H1/T1/T2 + đột biến bo_trang).
n_moi=$(grep -cE '^\s*sanPham: \(teamId, pageRowId\) => chuyenBanSao\.docSanPhamTrangPage\(pool, teamId, pageRowId\),$' v3/chay-that.js)
n_cu=$(grep -cE 'docSanPhamGoiGia\(pool, teamId, pageRowId\)' v3/chay-that.js)
[ "$n_moi" -eq 1 ] && [ "$n_cu" -eq 0 ]; ket "③nối-dây-chay-that" $? "dòng nối mới=$n_moi (đòi 1) · lời gọi thiếu trang=$n_cu (đòi 0)"

# ③b TIỀN ĐỀ của quyết định ② 4 (không chặn món POS ở hai cửa ĐẦY ĐỦ): còn màn gọi cửa đầy đủ với id lấy từ bộ đọc nhánh `page_id`
#     (trang page — nhánh này trả cả món POS RF-15, ca D10). Về 0 ⇒ tiền đề hết, phải xét lại ② 4 với tổng.
n_man=$(grep -rlE 'anh-san-pham/san-pham/|/api/van-hanh/products/' v3/src/ui --include='*.html' --include='*.js' | grep -vE '/router(-anh)?\.js$' | grep -c .)
[ "$n_man" -ge 1 ]; ket "③b-tiền-đề-②4-còn-màn-gọi-cửa-đầy-đủ" $? "số màn=$n_man (mot-page.html: id từ bộ đọc page_id, gồm món POS RF-15)"

# ③c tệp phiếu không được đụng (② 5: cửa lưu giá chỉ-giá · bộ đọc chung · bản chép · kho ảnh · nối POS · màn Prompt) + GSP2/GSP3 trong
#     chuyen-ban-sao.js CHỈ THÊM (0 dòng cũ bị sửa/xoá)
git diff --quiet "$BASE" -- src/admin-v3/operations.js src/products/catalog.js src/products/ban-chep-bot.js src/products/anh-san-pham.js \
  src/products/noi-pos.js src/products/san-pham-goc.js v3/src/ui/prompt-page/kho-prompt.js
ket "③c-không-sửa-tệp-cấm" $? "so với $BASE"
n_xoa=$(git diff "$BASE" -- src/products/chuyen-ban-sao.js | grep -cE '^-[^-]')
[ "$n_xoa" -eq 0 ]; ket "③d-chuyen-ban-sao-chỉ-thêm" $? "dòng cũ bị sửa/xoá=$n_xoa (đòi 0)"

# ④ đảo-vá trên BẢN SAO TẠM: lượt CHỨNG (bản gốc trong bản sao phải xanh) rồi từng đột biến phải làm ĐÚNG tập ca đỏ
TAM=$(mktemp -d "${TMPDIR:-/tmp}/gsp3b-dao-va.XXXXXX")
SHIM=$(mktemp -d "${TMPDIR:-/tmp}/gsp3b-shim.XXXXXX")
don() { [ "${GIU_TAM:-}" = 1 ] && echo "   (giữ $TAM)" || rm -rf "$TAM"; rm -rf "$SHIM"; }
trap don EXIT INT TERM
cp -R src v3 test db package.json "$TAM/"; ln -s "$GOC/node_modules" "$TAM/node_modules"
DS_TEP_DOT='src/products/chuyen-ban-sao.js v3/src/ui/van-hanh/router-anh.js v3/src/ui/van-hanh/router.js v3/src/ui/mot-page/kho-mot-page.js v3/src/ui/mot-page/trang/mot-page.html'
for f in $DS_TEP_DOT; do cp "$TAM/$f" "$TAM/$f.goc"; done
bam_cay() { (for f in $DS_TEP_DOT; do cat "$GOC/$f"; done) | shasum | cut -d' ' -f1; }
BAM_TRUOC=$(bam_cay)
tep_ca() { case "$1" in A) echo "$CA_A";; C) echo "$CA_C";; P) echo "$CA_P";; esac; }
chay_tam() { local o="" c; for c in $(echo "$1" | grep -oE '.'); do o="$o
$(cd "$TAM" && node --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$(tep_ca "$c")" 2>&1)"; done; echo "$o"; }
chuan_tap() { tr ';' '\n' | grep . | LC_ALL=C sort -u | tr '\n' ';' | sed 's/;$//'; }
do_cua() { echo "$1" | grep -oE "✖ [A-Z][0-9]+[a-z]? ·" | sed 's/^✖ //' | tr '\n' ';' | chuan_tap; }
oc=$(chay_tam ACP); fc=$(echo "$oc" | grep -oE "^ℹ fail [0-9]+" | grep -oE '[0-9]+' | paste -sd+ - | bc); pc=$(echo "$oc" | grep -oE "^ℹ pass [0-9]+" | grep -oE '[0-9]+' | paste -sd+ - | bc)
[ "${fc:-1}" -eq 0 ] && [ "${pc:-0}" -ge 32 ]; ket "④0-lượt-chứng-bản-sao-tạm-xanh" $? "pass=${pc:-0} fail=${fc:-?}"
# tên | tệp đột biến | tệp ca (A/C/P) | tập ca PHẢI đỏ, ĐÚNG BẰNG (cách bằng ;, so sau khi xếp)
DS_DOT_BIEN='
bo_trang|src/products/chuyen-ban-sao.js|AP|H1 ·;H3 ·;T1 ·;T2 ·
chot_bo_dieu_kien_gan|src/products/chuyen-ban-sao.js|A|H5 ·;H7 ·
chot_ca_mon_pos|src/products/chuyen-ban-sao.js|A|H5 ·
chot_luon_cho_qua|src/products/chuyen-ban-sao.js|A|H4 ·;H6 ·;H9 ·
id_la_cho_qua|src/products/chuyen-ban-sao.js|AC|H5b ·;D14 ·
bo_for_share|src/products/chuyen-ban-sao.js|AC|H9 ·;D12 ·
bo_cua_ra|v3/src/ui/van-hanh/router.js|C|D11 ·;D12 ·;D13 ·
tp_bo_chot_truoc|v3/src/ui/van-hanh/router-anh.js|C|D1 ·
vh_bo_chot_truoc|v3/src/ui/van-hanh/router.js|C|D2 ·
bo_chot_tai_len|v3/src/ui/van-hanh/router-anh.js|C|D3 ·;D14 ·
bo_chot_link|v3/src/ui/van-hanh/router-anh.js|C|D4 ·;D14 ·
bo_chot_sua_nhan|v3/src/ui/van-hanh/router-anh.js|C|D5 ·;D14 ·
bo_chot_bo_anh|v3/src/ui/van-hanh/router-anh.js|C|D14 ·
bo_chot_xep_anh|v3/src/ui/van-hanh/router-anh.js|C|D7 ·
bo_chot_noi_pos|v3/src/ui/van-hanh/router-anh.js|C|D8 ·;D14 ·
anh_bo_ma_409|v3/src/ui/van-hanh/router-anh.js|C|D1 ·;D3 ·;D4 ·;D5 ·;D6 ·;D7 ·;D8 ·;D11 ·;D12 ·;D14 ·
vh_bo_ma_409|v3/src/ui/van-hanh/router.js|C|D2 ·;D11 ·
kho_bo_chuyen|v3/src/ui/mot-page/kho-mot-page.js|P|T1 ·;T3 ·;T5 ·;T6 ·
man_bo_chi_xem|v3/src/ui/mot-page/trang/mot-page.html|P|T3 ·;T5 ·
man_bo_cau|v3/src/ui/mot-page/trang/mot-page.html|P|T3 ·;T5 ·;T6 ·
man_chi_xem_moi_page|v3/src/ui/mot-page/trang/mot-page.html|P|T4 ·;T5 ·
man_khong_khoa_sau_409|v3/src/ui/mot-page/trang/mot-page.html|P|T5 ·
man_chua_shop_hai_cau|v3/src/ui/mot-page/trang/mot-page.html|P|T6 ·
'
while IFS='|' read -r ten tep ca dong; do
  [ -z "$ten" ] && continue
  cp "$TAM/$tep.goc" "$TAM/$tep"
  if ! python3 - "$TAM/$tep" "$ten" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1]); s = p.read_text(encoding='utf-8'); ten = sys.argv[2]
old, new = {
  'bo_trang': ('return docSanPhamGoiGia(db, teamId, trang.id, trang);', 'return docSanPhamGoiGia(db, teamId, trang.id);'),
  'chot_bo_dieu_kien_gan': ('  if (!r || !r.san_pham_goc_ma) return null;\n', '  if (!r) return null;\n'),
  'chot_ca_mon_pos': ("WHERE s.team_id = $1 AND s.id = $2 AND s.nguon <> 'pos'\n", "WHERE s.team_id = $1 AND s.id = $2\n"),
  'chot_luon_cho_qua': ('  if (!r || !r.san_pham_goc_ma) return null;\n', '  if (true) return null;\n'),
  'id_la_cho_qua': ('if (!/^[1-9]\\d*$/.test(s)) throw new', 'if (!/^[1-9]\\d*$/.test(s)) return null; if (false) throw new'),
  'bo_for_share': ('\n        FOR SHARE OF p`,', '`,'),
  'bo_cua_ra': ('    await chanBanSaoDaChuyen(c, bc.teamId, id);\n    try {', '    try {'),
  'tp_bo_chot_truoc': ('    await chanBanSaoDaChuyen(pool, q.boiCanh.teamId, q.params.spId);\n    s.json(', '    s.json('),
  'vh_bo_chot_truoc': ('      await chanBanSaoDaChuyen(pool, q.boiCanh.teamId, q.params.id);\n', ''),
  'bo_chot_tai_len': ('          await chanBanSaoDaChuyen(c, q.boiCanh.teamId, spId);   // GSP3b — trước khi ghi (tệp vừa ghi bị xoá ở catch)\n', ''),
  'bo_chot_link': ('      await chanBanSaoDaChuyen(c, q.boiCanh.teamId, q.params.spId);   // GSP3b\n      const a = await themAnh(', '      const a = await themAnh('),
  'bo_chot_sua_nhan': None,
  'bo_chot_bo_anh': ('      await chanBanSaoDaChuyen(c, q.boiCanh.teamId, await spCuaAnh(c, q.boiCanh.teamId, q.params.id));   // GSP3b\n      const a = await boAnh(',
                     '      const a = await boAnh('),
  'bo_chot_xep_anh': ('      await chanBanSaoDaChuyen(c, q.boiCanh.teamId, q.params.spId);   // GSP3b\n      const ds = await xepAnh(', '      const ds = await xepAnh('),
  'bo_chot_noi_pos': ('      await chanBanSaoDaChuyen(c, q.boiCanh.teamId, q.params.spId);   // GSP3b — nối món cũng đẩy bản sao theo cùng chuỗi\n', ''),
  'anh_bo_ma_409': ('json({ ok: false, ma: e.ma, thongDiep: e.message, ...(e.duLieu ? { duLieu: e.duLieu } : {}) });', 'json({ ok: false, thongDiep: e.message });'),
  'vh_bo_ma_409': ('        ...(e instanceof LoiSanPhamGoc ? { ma: e.ma, ...(e.duLieu ? { duLieu: e.duLieu } : {}) } : {}),\n', ''),
  'kho_bo_chuyen': ('    if (!tho?.san_pham_goc_ma) return null;\n', '    return null;\n'),
  'man_bo_chi_xem': ('const SUA_SP = () => !CHI_XEM() && (', 'const SUA_SP = () => ('),
  'man_bo_cau': ("  if (!c) return '';\n  return `<div class=\"panel\" data-chuyen>", "  return '';\n  return `<div class=\"panel\" data-chuyen>"),
  'man_chi_xem_moi_page': ('const CHI_XEM = () => !!(daDocNoiDung && daDocNoiDung.chuyen);', 'const CHI_XEM = () => true;'),
  'man_khong_khoa_sau_409': ("  if (!e || e.ma !== 'ban_sao_da_chuyen') return;", '  return;'),
  'man_chua_shop_hai_cau': ('  if (!cuaBot.length && CHI_XEM()) {', '  if (false) {'),
}[ten] or (None, None)
if ten == 'bo_chot_sua_nhan':
    # chốt của cửa sửa nhãn = dòng `await chanBanSaoDaChuyen(… spCuaAnh …)` NGAY TRƯỚC `suaNhanAnh` (dòng y hệt đứng trước `boAnh` —
    # nên cắt theo VỊ TRÍ, không replace chuỗi)
    k = '      await chanBanSaoDaChuyen(c, q.boiCanh.teamId, await spCuaAnh(c, q.boiCanh.teamId, q.params.id));   // GSP3b\n      const a = await suaNhanAnh('
    assert s.count(k) == 1, (ten, 'khuôn')
    a = s.index(k); b = s.index('      const a = await suaNhanAnh(', a)
    p.write_text(s[:a] + s[b:], encoding='utf-8')
else:
    assert old is not None and s.count(old) == 1, (ten, (old or '')[:60])
    p.write_text(s.replace(old, new), encoding='utf-8')
PY
  then ket "④đảo-vá-$ten" 1 "không áp được đột biến (khuôn không còn khớp — thước cũ)"; continue; fi
  o=$(chay_tam "$ca")
  cp "$TAM/$tep.goc" "$TAM/$tep"
  that=$(do_cua "$o"); cho=$(echo "$dong" | chuan_tap)
  [ "$that" = "$cho" ]; ket "④đảo-vá-${ten} ⇒ đỏ đúng «${dong}»" $? "thật: ${that:-(không ca nào đỏ)}"
done <<< "$DS_DOT_BIEN"
oh=$(chay_tam ACP); fh=$(echo "$oh" | grep -oE "^ℹ fail [0-9]+" | grep -oE '[0-9]+' | paste -sd+ - | bc)
[ "${fh:-1}" -eq 0 ]; ket "④z-khôi-phục-bản-sao-xanh-lại" $? "fail=${fh:-?}"
[ "$(bam_cay)" = "$BAM_TRUOC" ] && [ -z "$(git status --porcelain -- '*.goc')" ]
ket "④cây-chung-không-dính-đột-biến" $? "băm 5 tệp bị đột biến trong cây chung trước = sau · 0 tệp .goc lạc"

# ⑤ bộ ca canh phạm vi LL15d — chạy RIÊNG (④7) + cổng ll15d
for t in test/ll15d-marketer-san-pham.test.mjs v3/test/b/ll15d-marketer-man.test.mjs; do
  o=$(chay "$t"); pp=$(so "$o" pass); ff=$(so "$o" fail); pp=${pp:-0}; ff=${ff:-1}
  [ "$ff" -eq 0 ] && [ "$pp" -ge 4 ]; ket "⑤LL15d-phạm-vi" $? "$t pass=$pp fail=$ff"
done

# ⑥ cổng cũ (rc TÁCH DÒNG — ④7 ll15d + ④8). Cổng con gọi `rg` thì cấp shim `rg → grep -E` CHỈ cho tiến trình con (N-GSP-CONG-RG-ENV).
printf '#!/bin/sh\nexec grep -E "$@"\n' > "$SHIM/rg"; chmod +x "$SHIM/rg"
PATH_CON="$PATH"; command -v rg >/dev/null 2>&1 || { PATH_CON="$SHIM:$PATH"; echo "   (máy này không có rg trong bash — cổng con nhận shim grep -E · nợ N-GSP-CONG-RG-ENV)"; }
# Cổng con ĐỎ ⇒ ĐỐI CHỨNG cùng thước: chạy CHÍNH cổng đó trên worktree tạm ở $BASE, so DANH SÁCH dòng đỏ (chuẩn hoá số id/pid).
# Giống hệt ⇒ đỏ SẴN có từ trước phiếu (nợ §9), 0 dòng đỏ mới ⇒ đạt; khác một dòng ⇒ đỏ.
chuan_do() { grep -E "✘|🔴" | sed -E 's/[0-9]{4,}//g; s/p[0-9]+//g' | sort; }
WT_BASE=""
don_wt() { [ -n "$WT_BASE" ] && git worktree remove --force "$WT_BASE" >/dev/null 2>&1; rm -rf "$(dirname "${WT_BASE:-/nonexistent/x}")" 2>/dev/null; }
trap 'don; don_wt' EXIT INT TERM
for g in ll15d gsp1 gsp2 gsp3 ve2 ve2b ve8b va-r2; do
  _o=$(PATH="$PATH_CON" bash "ops/bin/nghiem-thu/$g.sh" 2>&1)
  _r=$?
  if [ "$_r" -eq 0 ]; then ket "⑥cổng-cũ-$g" 0 "rc=0"; continue; fi
  if [ -z "$WT_BASE" ]; then
    WT_BASE="$(mktemp -d "${TMPDIR:-/tmp}/gsp3b-base.XXXXXX")/wt"
    git worktree add -q --detach "$WT_BASE" "$BASE" >/dev/null 2>&1 && ln -s "$GOC/node_modules" "$WT_BASE/node_modules" \
      && { [ ! -f "$GOC/.env" ] || ln -s "$GOC/.env" "$WT_BASE/.env"; }
  fi
  _moi=$(echo "$_o" | chuan_do)
  _cu=$( (cd "$WT_BASE" 2>/dev/null && PATH="$PATH_CON" bash "ops/bin/nghiem-thu/$g.sh" 2>&1) | chuan_do)
  _them=$(comm -13 <(echo "$_cu") <(echo "$_moi") | grep -c .)
  # rc≠0 mà KHÔNG in dòng đỏ nào (chết giữa chừng · lỗi nạp · exit 2) ⇒ ĐỎ: so danh sách rỗng với nợ cũ là xanh giả (/code-review CR3)
  if [ -z "$_moi" ]; then
    echo "$_o" | tail -3 | sed 's/^/   ↳ /'; ket "⑥cổng-cũ-$g" 1 "rc=$_r mà không in dòng đỏ nào — cổng con chết giữa chừng"; continue
  fi
  if [ -n "$_cu" ] && [ "$_them" -eq 0 ]; then
    ket "⑥cổng-cũ-$g" 0 "rc=$_r — ĐỎ SẴN ở $BASE: $(echo "$_moi" | grep -c .) dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ §9, không do GSP3b)"
  else
    comm -13 <(echo "$_cu") <(echo "$_moi") | head -5 | sed 's/^/   ↳ MỚI: /'
    ket "⑥cổng-cũ-$g" 1 "rc=$_r · $_them dòng đỏ MỚI so với $BASE"
  fi
done

# ⑦ npm test (④8) — chỉ khi CHAY_NPM_TEST=1 (luật 6). Thước: fail=0 (mốc base aa43268/6c2f8ef: 2384 ca · 0 đỏ).
if [ "${CHAY_NPM_TEST:-}" = 1 ]; then
  o=$(npm test 2>&1); nt=$(so "$o" tests); nf=$(so "$o" fail)
  [ "${nf:-1}" -eq 0 ]; ket "⑦npm-test" $? "tests=${nt:-?} fail=${nf:-?}"
else
  echo "   ⑦npm-test: HOÃN (đặt CHAY_NPM_TEST=1 khi không lượt đo nào khác đang chạy — luật 6) — không tính vào ĐỎ/XANH"
fi
echo "== ĐỎ $do / XANH $xanh"
exit $((do > 0))
