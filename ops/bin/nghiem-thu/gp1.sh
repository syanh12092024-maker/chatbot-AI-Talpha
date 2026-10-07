#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU GP1 — «ĐIỀN SẴN BẬC GIÁ CHO MÓN POS CHƯA CÓ GIÁ TỪ COD ĐƠN POS MỘT MÓN» (người quyết 05/10 «làm trọn vẹn»).
# Chạy: ops/bin/nghiem-thu/gp1.sh   (rc=0 là đạt) · GIU_TAM=1 giữ thư mục đảo-vá · BO_CONG_CU=1 bỏ ⑥ cổng cũ (lượt sửa nhanh — KHÔNG phải
# lượt nghiệm thu) · CHAY_NPM_TEST=1 chạy thêm `npm test` (④8 «không thêm ca đỏ» — mặc định HOÃN, luật 6: không chạy song song lượt khác).
# Thi hành ĐÚNG 8 phép của ④ trong docs/thi-cong/phieu/PHIEU-GP1.md. Mỗi phép in MỘT số đo / một bảng đếm.
# VÒNG 2 (07/10 — đối kháng `refute-gp1.verdict.yaml` F1–F4 + người quyết «Miễn ship»): thêm ca A19 A20 (F1 thuần) · X10 (F1 trọn đường) ·
# X11 (F2 đường lùi bền) · X12 (miễn ship → prompt bot thật) · M9 M11 (F3 sau áp / sau «Thử lại») · M10 (F4) · M4 sửa theo luật F3 · đột biến
# vòng 2 ở ④ (bản vá cũng là code mới — luật 26).
# Tầm đo: lưới HỒI QUY do chính thợ viết (luật 32) — ba tệp ca: tầng A thuần (đáp án từ đề bài + số đo review (a) G1), Postgres HỘP CÁT riêng
# (`db/sandbox.js`, tên `aicloser_v3_test_gp1_p<pid>`, tự dựng tự dọn) với BigQuery GIẢ, router + màn thật trên DOM giả. KHÔNG gọi BigQuery
# thật, KHÔNG khoá thật, KHÔNG đo `aicloser_v3` dev, KHÔNG đo prod, không gửi tin, không gọi POS.
# Đảo-vá trên BẢN SAO TẠM (không bao giờ sửa cây làm việc chung); mỗi đột biến là MỘT tiến trình node mới; đột biến phải làm ĐỎ ít nhất
# đúng các ca đã khai (đọc bảng «đột biến nào KHÔNG đỏ» — luật viet-thuoc).
# Môi trường: thiếu `DATABASE_URL_V3` thì tự nạp từ `.env` (không in giá trị). Không dùng `rg` — chỉ `grep -E`. macOS không `timeout`.
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
BASE=b04d0dc
CA_A=test/gp1-tinh-bac.test.mjs
CA_P=test/gp1-xem-ap.test.mjs
CA_C=v3/test/b/gp1-cua-man.test.mjs
LOI=0; PHEP=0
muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-62s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP+1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP+1)); LOI=$((LOI+1)); printf '   ✘ %s\n' "$1"; }
dem() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+' | paste -sd+ - | bc 2>/dev/null; }
chay_ca() { (cd "$1" && node --env-file-if-exists="$GOC/.env" --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "${@:2}" 2>&1); }
do_tap() { echo "$1" | grep -oE "✖ [AXHM][0-9]+ ·" | sed 's/^✖ //; s/ ·$//' | LC_ALL=C sort -u | tr '\n' ' ' | sed 's/ $//'; }

if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát · rc=2"; exit 2; }
noi=$(node -e 'const u=new URL(process.env.DATABASE_URL_V3);console.log(`${u.hostname}:${u.port||5432}`)' 2>/dev/null || echo "?")
echo "CỔNG NGHIỆM THU GP1 · $(date '+%F %T') · cây $GOC @ $(git rev-parse --short HEAD) · base $BASE"
echo "── môi trường: MÁY DEV · hộp cát Postgres trên $noi (CSDL aicloser_v3_test_gp1_p<pid>, tự dựng tự dọn — không phải aicloser_v3 dev, không prod) · BigQuery GIẢ"
node -e 'import("./src/products/gia-tu-don-pos.js").then(()=>console.log("   (tầng A nạp từ " + require("path").resolve("src/products/gia-tu-don-pos.js") + ")"))' 2>/dev/null

# ═══ ① BỘ CA GP1 — thước SÀN (fail=0 và pass ≥ sàn), HAI múi giờ (UTC và UTC+14) — không neo số tuyệt đối ════════════════════════
muc "① bộ ca GP1 (tầng A thuần · Postgres hộp cát + BQ giả · cửa + màn) — hai múi giờ"
OUT=""
for tz in UTC Pacific/Kiritimati; do
  o=$(TZ=$tz PGTZ=$tz chay_ca "$GOC" "$CA_A" "$CA_P" "$CA_C"); p=$(dem "$o" pass); f=$(dem "$o" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
  so "TZ=$tz" "pass=$p fail=$f"
  [ "$f" -eq 0 ] && [ "$p" -ge 52 ] && dat "bộ ca GP1 ($tz) pass=$p fail=0 (sàn ≥52)" || truot "bộ ca GP1 ($tz) pass=$p fail=$f"
  [ "$tz" = UTC ] && OUT="$o"
done

# ═══ ② MỖI PHÉP ④1–④6 CÓ CA XANH RIÊNG (bảng đếm thấy/đòi) ══════════════════════════════════════════════════════════════════════════
#   ④1 (a)=A1 (a′)=A2 (a″)=A3 (b)=A4 (c)=A5 (d)=A6 (e)=A7 (f)=A8 · ④2=X1 · ④3=X5 · ④4=X4 · ④5=X2 X3 · ④6=X8 H1 H2
#   ngoài ④ (đỡ ④): chốt trong giao dịch X6 · chọn món + trần mỗi lượt X7 · BQ chưa nối/hỏng X9 · 409 H3 · chưa nối H4 · màn M1–M8 ·
#   biên A9–A15 · /code-review: bậc phân tán bỏ cả món A16 · thứ tự toàn phần A17 · đệm BigQuery A18 · trần M6 · vẽ đè M7 · đếm page M8
#   vòng 2: F1 A19 A20 X10 · F2 X11 · miễn ship A8 X5 X12 M2 · F3 M4 M9 M11 · F4 M10 · /code-review vòng 2: A21 X13 M12 M13
muc "② mỗi phép ④1–④6 có ca XANH riêng"
thay=0; doi=0; thieu=""
for tag in A1 A2 A3 A4 A5 A6 A7 A8 X1 X5 X4 X2 X3 X8 H1 H2 X6 X7 X9 H3 H4 M1 M2 M3 M4 M5 A16 A17 A18 M6 M7 M8 \
  A19 A20 A21 X10 X11 X12 X13 M9 M10 M11 M12 M13; do
  doi=$((doi+1))
  if echo "$OUT" | grep -qE "✔ $tag ·"; then thay=$((thay+1)); else thieu="$thieu $tag"; fi
done
so "ca xanh thấy / đòi" "$thay/$doi${thieu:+ · thiếu:$thieu}"
[ "$thay" -eq "$doi" ] && dat "mọi phép ④1–④6 có ca xanh ($thay/$doi)" || truot "thiếu ca xanh:$thieu"

# ═══ ③ HỢP ĐỒNG HÌNH DẠNG (luật 30 — chỉ là lưới; đường đi dữ liệu do ① đo) ════════════════════════════════════════════════════════
muc "③ nối dây v3/chay-that.js · một đường ghi giá · đường đứng trước /:id · tệp cấm"
n1=$(grep -cF 'xemGiaTuDon: (bc, t) => giaTuDon.xemTruoc(pool, bc.teamId, nguonGiaDon, t),' v3/chay-that.js)
n2=$(grep -cF 'luuGia: (x) => luuGiaMonGoc(bc, x.gocId, x.posMa, { offers: x.offers, version: x.version }, { chot: x.chot }),' v3/chay-that.js)
n3=$(grep -cF 'return saveProduct(chot ? poolChotDauGiaoDich(pool, chot) : pool, bc, m.id, { offers: t.offers, version: t.version },' v3/chay-that.js)
n4=$(grep -cE 'saveProduct\(' v3/chay-that.js)
so "chay-that: xem=$n1 · áp qua luuGiaMonGoc=$n2 · chot vào giao dịch=$n3 · lời gọi saveProduct" "$n4 (đòi 1·1·1·1)"
[ "$n1" -eq 1 ] && [ "$n2" -eq 1 ] && [ "$n3" -eq 1 ] && [ "$n4" -eq 1 ] && dat "nối dây chay-that đúng khuôn ca dựng lại (deps.luuGia của gp1-xem-ap)" \
  || truot "nối dây chay-that lệch khuôn ca (xem=$n1 áp=$n2 chot=$n3 saveProduct=$n4)"
if [ -f src/products/gia-tu-don-pos.js ]; then
  n5=$(grep -ciE 'INSERT INTO|DELETE FROM|UPDATE [a-z_]+ SET|saveProduct\(' src/products/gia-tu-don-pos.js)
  so "tầng A: câu SQL ghi / lời gọi saveProduct trong gia-tu-don-pos.js" "$n5 (đòi 0 — cấm đường ghi giá thứ hai)"
  [ "$n5" -eq 0 ] && dat "tầng A không có đường ghi riêng (ghi qua luuGia được tiêm)" || truot "tầng A có câu ghi riêng ($n5)"
else truot "tầng A src/products/gia-tu-don-pos.js CHƯA CÓ — câu đo không đọc được (không đọc là đạt)"; fi
l_gtd=$(grep -nF "r.get('/api/san-pham/gia-tu-don'" v3/src/ui/san-pham/router.js | head -1 | cut -d: -f1)
l_id=$(grep -nF "r.get('/api/san-pham/:id'" v3/src/ui/san-pham/router.js | head -1 | cut -d: -f1)
so "router: dòng gia-tu-don / dòng /:id" "${l_gtd:-?} / ${l_id:-?}"
[ -n "$l_gtd" ] && [ -n "$l_id" ] && [ "$l_gtd" -lt "$l_id" ] && dat "/api/san-pham/gia-tu-don đứng TRƯỚC /api/san-pham/:id" || truot "đường gia-tu-don không đứng trước /:id"
# Tệp phiếu cấm (② ③): không commit nào của GP1 chạm, và cây không có sửa dở. Đo theo TIÊU ĐỀ commit (giữ nguyên qua cherry-pick) — so
# base với cây thì phiếu khác (TT1b sửa operations.js) làm phép đỏ oan.
CAM='src/admin-v3/operations.js src/hrm/bigquery.js src/products/ban-chep-bot.js'
# shellcheck disable=SC2086
n_cam=$(git log --format='%s' "$BASE"..HEAD -- $CAM | grep -c 'GP1')
# shellcheck disable=SC2086
git diff --quiet HEAD -- $CAM; n_do=$?
so "commit GP1 chạm tệp cấm · sửa dở trên tệp cấm" "$n_cam · $n_do (đòi 0 · 0)"
[ "$n_cam" -eq 0 ] && [ "$n_do" -eq 0 ] && dat "không sửa operations.js · bigquery.js · ban-chep-bot.js" || truot "đụng tệp cấm (commit=$n_cam · dở=$n_do)"

# ═══ ④ ĐẢO-VÁ trên BẢN SAO TẠM — mỗi đột biến PHẢI làm đỏ ít nhất tập ca đã khai ═════════════════════════════════════════════════════
muc "④ đảo-vá (④7 + đột biến thêm) — bản sao tạm, cây chung không bao giờ bị sửa"
TAM=$(mktemp -d "${TMPDIR:-/tmp}/gp1-dao-va.XXXXXX")
WT_BASE=""
don() {
  [ -n "$WT_BASE" ] && git worktree remove --force "$WT_BASE" >/dev/null 2>&1; git worktree prune >/dev/null 2>&1
  if [ "${GIU_TAM:-0}" = 1 ]; then echo "   (giữ $TAM)"; else rm -rf "$TAM"; fi
}
trap don EXIT; trap 'exit 130' INT TERM
cp -R src v3 test db package.json "$TAM/"; ln -s "$GOC/node_modules" "$TAM/node_modules"
DS_TEP_DOT='src/products/gia-tu-don-pos.js v3/src/ui/san-pham/kho-goc.js v3/src/ui/san-pham/trang/san-pham.html'
for f in $DS_TEP_DOT; do cp "$TAM/$f" "$TAM/$f.goc"; done
bam_cay() { (for f in $DS_TEP_DOT; do cat "$GOC/$f"; done) | shasum | cut -d' ' -f1; }
BAM_TRUOC=$(bam_cay)
o0=$(chay_ca "$TAM" "$CA_A" "$CA_P" "$CA_C"); f0=$(dem "$o0" fail); p0=$(dem "$o0" pass)
so "lượt CHỨNG (bản sao chưa đột biến)" "pass=${p0:-0} fail=${f0:-?}"
[ "${f0:-1}" -eq 0 ] && [ "${p0:-0}" -ge 52 ] && dat "bản sao tạm xanh trước đột biến" || truot "bản sao tạm KHÔNG xanh trước đột biến — đảo-vá vô nghĩa"
# tên | tệp đột biến | ca PHẢI đỏ (tập con của tập đỏ thật, cách bằng dấu cách)
DS_DOT_BIEN='
gan_day_ca_cua_so|src/products/gia-tu-don-pos.js|A2
bo_0_dong_gia|src/products/gia-tu-don-pos.js|X1 X5
bo_tang_dan|src/products/gia-tu-don-pos.js|A6
bo_dau|src/products/gia-tu-don-pos.js|X4
bo_loc_team|src/products/gia-tu-don-pos.js|X2
bo_chot|src/products/gia-tu-don-pos.js|X6
bo_te_thi_truong|src/products/gia-tu-don-pos.js|X3
doi_gia_chi_bac|src/products/gia-tu-don-pos.js|A10
bo_pos_co_gia_mon|src/products/gia-tu-don-pos.js|A3
bo_sku_thu|src/products/gia-tu-don-pos.js|A7
bo_it_don|src/products/gia-tu-don-pos.js|A4
bo_phan_tan|src/products/gia-tu-don-pos.js|A5
offers_chia_100|src/products/gia-tu-don-pos.js|A8 X5
bo_vai|v3/src/ui/san-pham/kho-goc.js|H1 X8
nhat_ky_sai_ma|v3/src/ui/san-pham/kho-goc.js|H2 X5
man_bo_dau|v3/src/ui/san-pham/trang/san-pham.html|M3
man_409_khong_tinh_lai|v3/src/ui/san-pham/trang/san-pham.html|M10
phan_tan_chi_bac|src/products/gia-tu-don-pos.js|A10 A16
bo_thu_tu_toan_phan|src/products/gia-tu-don-pos.js|A17
ngoai_he_thanh_khong_ghep|src/products/gia-tu-don-pos.js|X3
bo_tran_mot_luot|src/products/gia-tu-don-pos.js|X7
dem_khong_gioi_han|src/products/gia-tu-don-pos.js|A18
man_ve_de|v3/src/ui/san-pham/trang/san-pham.html|M7
man_dem_page_trung|v3/src/ui/san-pham/trang/san-pham.html|M8
man_chon_ca_vuot_tran|v3/src/ui/san-pham/trang/san-pham.html|M6
bo_khong_ro_team|src/products/gia-tu-don-pos.js|A19 X10
khong_ro_bo_nguong|src/products/gia-tu-don-pos.js|A19
khong_ro_khac_te|src/products/gia-tu-don-pos.js|A20
gan_nhat_chi_team|src/products/gia-tu-don-pos.js|A20 X10
bo_gia_tay_xoa|src/products/gia-tu-don-pos.js|X11
bo_mien_ship|src/products/gia-tu-don-pos.js|A8 X5 X12
nhat_ky_mien_ship|v3/src/ui/san-pham/kho-goc.js|X5
man_quen_nguoi_bo|v3/src/ui/san-pham/trang/san-pham.html|M4 M9 M11
man_409_quen_nguoi_bo|v3/src/ui/san-pham/trang/san-pham.html|M4
man_tai_lai_quen_nguoi_bo|v3/src/ui/san-pham/trang/san-pham.html|M9
man_bo_chon_khong_nho|v3/src/ui/san-pham/trang/san-pham.html|M4 M9
man_thu_lai_mat_bo|v3/src/ui/san-pham/trang/san-pham.html|M11
man_chon_san_lech|v3/src/ui/san-pham/trang/san-pham.html|M10
man_khong_to_lech|v3/src/ui/san-pham/trang/san-pham.html|M10
man_chu_mien_ship|v3/src/ui/san-pham/trang/san-pham.html|M2
man_tu_choi_moi_lan_bo|v3/src/ui/san-pham/trang/san-pham.html|M12
man_doi_y_mat_tu_choi|v3/src/ui/san-pham/trang/san-pham.html|M13
man_thu_lai_mat_ket_qua|v3/src/ui/san-pham/trang/san-pham.html|M11
man_ti_le_giau_khong_ro|v3/src/ui/san-pham/trang/san-pham.html|M2
ti_le_chi_team|src/products/gia-tu-don-pos.js|A20 A21 X10
dau_bo_lech|src/products/gia-tu-don-pos.js|X13
'
while IFS='|' read -r ten tep doi_do; do
  [ -z "$ten" ] && continue
  cp "$TAM/$tep.goc" "$TAM/$tep"
  if ! python3 - "$TAM/$tep" "$ten" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1]); s = p.read_text(encoding='utf-8'); ten = sys.argv[2]
old, new = {
  # ④7 — «lấy mức của cả cửa sổ thay vì ganDay đơn gần nhất»
  'gan_day_ca_cua_so': ('    const b = tinhMotBac(theoSl.get(sl), ts);', '    const b = tinhMotBac(theoSl.get(sl), { ...ts, ganDay: Infinity });'),
  # ④7 — «bỏ điều kiện 0 dòng goi_gia»
  'bo_0_dong_gia': ("    if (m.so_bac) { boMon(g, m, 'da_co_gia', `đã có ${m.so_bac} bậc`); continue; }\n", ''),
  # ④7 — «bỏ kiểm tăng dần»
  'bo_tang_dan': ('    if (g.bac[i].gia < g.bac[i - 1].gia) {', '    if (false) {'),
  # ④7 — «bỏ dấu»
  'bo_dau': ('  if (dauXemTruoc !== xt.dauXemTruoc) {', '  if (false) {'),
  # ④7 — «bỏ lọc team» (đơn team khác vào bậc của team này)
  'bo_loc_team': ('    else if (t.slug === team.slug) cuaTeam.push', '    else cuaTeam.push'),
  # thêm — chốt «0 dòng goi_gia» TRONG giao dịch ghi
  'bo_chot': ('        chot: (c) => chotMonChuaCoGia(c, teamId, d.monId) });', '        chot: null });'),
  # thêm — tiền tệ đơn ≡ tiền tệ thị trường shop
  'bo_te_thi_truong': ('    if (!teTT || g.tienTe !== teTT) {', '    if (!teTT) {'),
  # thêm — giá đổi gần đây ở MỘT bậc ⇒ bỏ CẢ món
  'doi_gia_chi_bac': ('  if (doi.length) {', '  if (false) {'),
  'bo_pos_co_gia_mon': ("  if (coGia) return bo('pos_co_gia_mon'", "  if (false) return bo('pos_co_gia_mon'"),
  'bo_sku_thu': ("  if (rs.some((r) => SKU_THU.has(chuanSku(r.sku)))) return bo('sku_thu'", "  if (false) return bo('sku_thu'"),
  'bo_it_don': ("  if (tong < toiThieu) return { lyDo: 'it_don'", "  if (false) return { lyDo: 'it_don'"),
  'bo_phan_tan': ("  if (tiLe < nguong) return { lyDo: 'phan_tan'", "  if (false) return { lyDo: 'phan_tan'"),
  # thêm — quy đơn vị theo HE_SO_TE (TT1: TWD ×1) ⇒ «chia 100» cố định là lỗi ×100 của tệ không xu
  'offers_chia_100': ('  return Number(gia) / HE_SO_TE[te];', '  return Number(gia) / 100;'),
  'bo_vai': ("  batBuocVai(bc, ...VAI_SUA_DUOC);\n  return hamGiaTuDon('xemGiaTuDon')(bc, { soNgay });", "  return hamGiaTuDon('xemGiaTuDon')(bc, { soNgay });"),
  'nhat_ky_sai_ma': ('        hanhDong: HANH_DONG.DIEN_GIA_TU_DON_POS, doiTuongLoai: BANG,', '        hanhDong: HANH_DONG.DOI_SOAT_BAN_SAO, doiTuongLoai: BANG,'),
  'man_bo_dau': ('body: JSON.stringify({ dauXemTruoc: du.dauXemTruoc, monIds, soNgay: du.soNgay })', 'body: JSON.stringify({ monIds, soNgay: du.soNgay })'),
  # (vòng 2 thay `man_giu_chon_sau_409`): 409 mà không tính lại tập chọn ⇒ lựa chọn TAY trên dòng lệch mang sang bảng người chưa thấy
  'man_409_khong_tinh_lai': ('      g.du = j.duLieu.xemTruoc; tinhChonGtd(g);', '      g.du = j.duLieu.xemTruoc;'),
  # ── bản vá sau /code-review (luật 26: bản vá cũng là code mới — đảo-vá đo bản SAU vá) ──
  'phan_tan_chi_bac': ('  if (tan.length) {', '  if (false) {'),
  'bo_thu_tu_toan_phan': (': (a.cod - b.cod) || (a.soDon - b.soDon));', ': 0);'),
  'ngoai_he_thanh_khong_ghep': ('    if (!t) continue;', '    if (!t) { cuaTeam.push({ ...r, team_code: null }); continue; }'),
  'bo_tran_mot_luot': ('  if (chon.length > tranMotLuot) {', '  if (false) {'),
  'dem_khong_gioi_han': ('        while (dem.size >= toiDa) dem.delete(dem.keys().next().value);', ''),
  'man_ve_de': ("const dangXemGtd = (g) => GTD === g && new URL(location.href).searchParams.get('xem') === 'gia-tu-don';", 'const dangXemGtd = () => true;'),
  'man_dem_page_trung': ('new Set(kq.ghi.flatMap((m) => (m.dongBo && Array.isArray(m.dongBo.page) ? m.dongBo.page : []).map((p) => String(p.pageId)))).size',
                         'kq.ghi.flatMap((m) => (m.dongBo && Array.isArray(m.dongBo.page) ? m.dongBo.page : [])).length'),
  'man_chon_ca_vuot_tran': ('    if (nguoiBo.has(d.monId) || lechGanNhat(d) || n >= tran) bo.add(d.monId); else n += 1;',
                            '    if (nguoiBo.has(d.monId) || lechGanNhat(d)) bo.add(d.monId); else n += 1;'),
  # ── vòng 2 (đối kháng F1–F4 + «Miễn ship») — bản vá cũng là code mới (luật 26) ──
  'bo_khong_ro_team': ("  if (lechKr.length) return bo('khac_gia_khong_ro_team'", "  if (false) return bo('khac_gia_khong_ro_team'"),
  'khong_ro_bo_nguong': ('    if (muc.cod !== b.gia || muc.n / lay < ts.nguong) {', '    if (muc.cod !== b.gia) {'),
  'khong_ro_khac_te': ("  if (teKr.length) {\n    return bo('lech_tien_te'", "  if (false) {\n    return bo('lech_tien_te'"),
  'gan_nhat_chi_team': ('    if (gop[0].team == null) b.ganNhat = { gia: gop[0].cod, ngay: gop[0].ngay, khongRoTeam: true };\n', ''),
  'bo_gia_tay_xoa': ("    if (m.gia_tay) { boMon(g, m, 'nguoi_da_xoa_gia', CHI_TIET_XOA_GIA); continue; }\n", ''),
  'bo_mien_ship': ('tien_te: tienTe, mien_ship: true }));', 'tien_te: tienTe }));'),
  'nhat_ky_mien_ship': ("      + (m.mienShip ? ' · bậc đã gồm ship · miễn ship' : '');", "      + '';"),
  'man_quen_nguoi_bo': ('    if (nguoiBo.has(d.monId) || lechGanNhat(d) || n >= tran) bo.add(d.monId); else n += 1;',
                        '    if (lechGanNhat(d) || n >= tran) bo.add(d.monId); else n += 1;'),
  'man_409_quen_nguoi_bo': ('      g.du = j.duLieu.xemTruoc; tinhChonGtd(g);', '      g.du = j.duLieu.xemTruoc; g.nguoiBo = new Set(); tinhChonGtd(g);'),
  'man_tai_lai_quen_nguoi_bo': ("g.loiDoc = ''; tinhChonGtd(g); }", "g.loiDoc = ''; g.nguoiBo = new Set(); tinhChonGtd(g); }"),
  'man_bo_chon_khong_nho': ('if (g.macDinh.has(id) || g.daTuChoi.has(id)) { g.nguoiBo.add(id); g.daTuChoi.add(id); }', ''),
  # ── sau /code-review vòng 2 (luật 26: đảo-vá đo bản SAU vá) ──
  'man_tu_choi_moi_lan_bo': ('if (g.macDinh.has(id) || g.daTuChoi.has(id)) { g.nguoiBo.add(id); g.daTuChoi.add(id); }', '{ g.nguoiBo.add(id); g.daTuChoi.add(id); }'),
  'man_doi_y_mat_tu_choi': ('if (g.macDinh.has(id) || g.daTuChoi.has(id)) {', 'if (g.macDinh.has(id)) {'),
  'man_thu_lai_mat_ket_qua': ('ketQua: cu ? cu.ketQua : null', 'ketQua: null'),
  'man_ti_le_giau_khong_ro': ("${b.soDonKhongRo ? ` (gồm ${so(b.soDonKhongRo)} đơn chưa ghép team)` : ''}", ''),
  'ti_le_chi_team': ('      Object.assign(b, { soDonMuc: muc.n, soDonGanDay: lay, tiLe: muc.n / lay, soDonKhongRo: layKhongRo });', '      Object.assign(b, {});'),
  'dau_bo_lech': ('b.ganNhat && b.ganNhat.gia !== b.gia ? 1 : 0])', '0])'),
  'man_thu_lai_mat_bo': ("    $('#thuGiaTuDon').onclick = () => veGiaTuDon(g); return;", "    $('#thuGiaTuDon').onclick = () => veGiaTuDon(); return;"),
  'man_chon_san_lech': ('    if (nguoiBo.has(d.monId) || lechGanNhat(d) || n >= tran) bo.add(d.monId); else n += 1;',
                        '    if (nguoiBo.has(d.monId) || n >= tran) bo.add(d.monId); else n += 1;'),
  'man_khong_to_lech': ("${lechGanNhat(d) ? ' data-muc=\"warning\"' : ''}>", '>'),
  'man_chu_mien_ship': ('      Đã gồm ship · miễn ship (bậc ghi', '      Đã gồm ship (bậc ghi'),
}[ten]
assert s.count(old) == 1, (ten, old[:60])
p.write_text(s.replace(old, new), encoding='utf-8')
PY
  then truot "đảo-vá $ten: không áp được đột biến (khuôn không còn khớp — sửa thước)"; continue; fi
  o=$(chay_ca "$TAM" "$CA_A" "$CA_P" "$CA_C"); f=$(dem "$o" fail)
  cp "$TAM/$tep.goc" "$TAM/$tep"
  that=" $(do_tap "$o") "; song=""
  for c in $doi_do; do case "$that" in *" $c "*) ;; *) song="$song $c";; esac; done
  so "đột biến $ten" "đỏ thật:${that% } · đòi: $doi_do · fail=${f:-?}"
  [ -z "$song" ] && [ "${f:-0}" -ge 1 ] && dat "đảo-vá $ten ⇒ $doi_do đỏ" || truot "đảo-vá $ten: đột biến SỐNG ở:${song:- (fail=0)}"
done <<< "$DS_DOT_BIEN"
o1=$(chay_ca "$TAM" "$CA_A" "$CA_P" "$CA_C"); f1=$(dem "$o1" fail)
so "lượt khôi phục bản sao ⇒ fail" "${f1:-?}"
[ "${f1:-1}" -eq 0 ] && dat "khôi phục ⇒ xanh lại (thước không tự đỏ)" || truot "khôi phục mà vẫn đỏ (fail=${f1:-?}) — thước hỏng"
[ "$BAM_TRUOC" = "$(bam_cay)" ] && dat "cây chung không dính đột biến (băm 3 tệp đột biến trước = sau)" || truot "cây chung BỊ ĐỔI trong lượt đảo-vá"

# ═══ ⑤ BỘ CA LL15d RIÊNG + LƯỚI GẦN (rc tách dòng) ═══════════════════════════════════════════════════════════════════════════════
muc "⑤ bộ ca LL15d riêng + lưới hồi quy gần"
for t in test/ll15d-marketer-san-pham.test.mjs v3/test/b/ll15d-marketer-man.test.mjs test/gsp3-doi-soat.test.mjs v3/test/b/gsp3-doi-soat-man.test.mjs \
  test/ve8b-gia-page.test.mjs v3/test/b/ve8b-man.test.mjs v3/test/b/phan-quyen-nam-vai.test.mjs test/tt1-tien-te-ngoai-gcc.test.mjs \
  test/ll17d-team-theo-ngay.test.mjs v3/test/b/san-pham.test.mjs test/tt1b-te-thi-truong.test.mjs test/l2-m3-rap-prompt.test.js; do
  [ -f "$t" ] || { truot "lưới gần $t: tệp không còn"; continue; }
  o=$(chay_ca "$GOC" "$t"); p=$(dem "$o" pass); f=$(dem "$o" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -3 | sed 's/^/   ↳ /'
  [ "$f" -eq 0 ] && [ "$p" -ge 1 ] && dat "$t pass=$p fail=0" || truot "$t pass=$p fail=$f"
done

# ═══ ⑥ CỔNG CŨ (rc TÁCH DÒNG): gsp2 · gsp3 · gsp3b · tt1 ═════════════════════════════════════════════════════════════════════════
# Cổng cũ ĐỎ ⇒ ĐỐI CHỨNG cùng thước: chạy CHÍNH cổng đó trên worktree tạm ở $BASE, so DANH SÁCH dòng đỏ (chuẩn hoá id/pid). Giống hệt ⇒
# đỏ SẴN trước phiếu (nợ cũ), 0 dòng mới ⇒ đạt; khác ⇒ đỏ. Trần thời gian mỗi cổng con (`TRAN_CON` giây) — quá ⇒ giết cả nhóm ⇒ «TREO».
muc "⑥ cổng cũ (rc tách dòng)"
if [ "${BO_CONG_CU:-0}" = 1 ]; then
  echo "   cổng cũ: BỎ theo BO_CONG_CU=1 — lượt này KHÔNG phải lượt nghiệm thu (không tính vào PHÉP/LỖI)"
else
  SHIM="$TAM/shim"; mkdir -p "$SHIM"; printf '#!/bin/sh\nexec grep -E "$@"\n' > "$SHIM/rg"; chmod +x "$SHIM/rg"
  PATH_CON="$PATH"; command -v rg >/dev/null 2>&1 || PATH_CON="$SHIM:$PATH"
  chuan_do() { grep -E "✘|🔴" | sed -E 's/[0-9]{4,}//g; s/p[0-9]+//g; s/[0-9]+(\.[0-9]+)?ms//g' | sort; }
  TRAN_CON="${TRAN_CON:-2700}"
  chay_con() {
    local tep=$1 out; out=$(mktemp)
    set -m; PATH="$PATH_CON" bash "$tep" > "$out" 2>&1 & local pid=$!; set +m
    local t=0
    while kill -0 "$pid" 2>/dev/null; do
      sleep 5; t=$((t+5))
      if [ "$t" -ge "$TRAN_CON" ]; then kill -KILL -- "-$pid" 2>/dev/null; wait "$pid" 2>/dev/null; cat "$out"; rm -f "$out"; return 124; fi
    done
    wait "$pid"; local rc=$?; cat "$out"; rm -f "$out"; return "$rc"
  }
  for g in gsp2 gsp3 gsp3b tt1; do
    t0=$(date +%s); _o=$(chay_con "ops/bin/nghiem-thu/$g.sh"); _r=$?; t1=$(date +%s)
    so "cổng cũ $g.sh" "rc=$_r · $((t1 - t0))s"
    if [ "$_r" -eq 0 ]; then dat "cổng cũ $g rc=0"; continue; fi
    if [ "$_r" -eq 124 ]; then
      echo "$_o" | grep -E "✘|🔴" | tail -3 | sed 's/^/   ↳ /'
      truot "cổng cũ $g TREO quá ${TRAN_CON}s — giết cả nhóm; chạy riêng cổng đó để phân biệt chập chờn"; continue
    fi
    if [ -z "$WT_BASE" ]; then
      WT_BASE="$TAM/wt-base"
      git worktree add -q --detach "$WT_BASE" "$BASE" >/dev/null 2>&1 && ln -s "$GOC/node_modules" "$WT_BASE/node_modules" \
        && { [ ! -f "$GOC/.env" ] || ln -s "$GOC/.env" "$WT_BASE/.env"; }
    fi
    _moi=$(echo "$_o" | chuan_do)
    if [ -z "$_moi" ]; then echo "$_o" | tail -3 | sed 's/^/   ↳ /'; truot "cổng cũ $g rc=$_r mà không in dòng đỏ nào — cổng con chết giữa chừng"; continue; fi
    _cu=$( (cd "$WT_BASE" 2>/dev/null && chay_con "ops/bin/nghiem-thu/$g.sh") | chuan_do)
    _them=$(comm -13 <(echo "$_cu") <(echo "$_moi") | grep -c .)
    if [ -n "$_cu" ] && [ "$_them" -eq 0 ]; then
      dat "cổng cũ $g rc=$_r — ĐỎ SẴN ở $BASE: $(echo "$_moi" | grep -c .) dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ cũ, không do GP1)"
    else
      comm -13 <(echo "$_cu") <(echo "$_moi") | head -5 | sed 's/^/   ↳ MỚI: /'
      truot "cổng cũ $g rc=$_r · $_them dòng đỏ MỚI so với $BASE"
    fi
  done
fi
if [ "${CHAY_NPM_TEST:-}" = 1 ]; then
  o=$(npm test 2>&1); nt=$(dem "$o" tests); nf=$(dem "$o" fail)
  [ "${nf:-1}" -eq 0 ] && dat "npm test tests=${nt:-?} fail=0" || truot "npm test tests=${nt:-?} fail=${nf:-?}"
else
  echo "   npm test: HOÃN (CHAY_NPM_TEST=1 khi không lượt đo nào khác đang chạy — luật 6) — không tính vào PHÉP/LỖI"
fi

echo; echo "PHÉP=$PHEP LỖI=$LOI · môi trường: máy dev, hộp cát aicloser_v3_test_gp1_p<pid>, BigQuery giả"
exit $((LOI > 0))
