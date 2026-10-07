#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU GSP3 — «ĐỐI SOÁT GIÁ + ẢNH CỦA BẢN SAO THEO ĐƠN VỊ GỐC × SHOP» (CR-02-10b mục 5 + 5e).
# Chạy: ops/bin/nghiem-thu/gsp3.sh        (rc=0 là đạt) · GIU_TAM=1 giữ thư mục đảo-vá để soi tay.
# Tầm đo: lưới HỒI QUY do chính thợ viết — mỗi tệp ca tự dựng Postgres HỘP CÁT riêng (`db/sandbox.js`, tên `_p<pid>`), cửa lưu giá
# THẬT (saveProduct chỉ-giá + taoBuocDayBot), `day` bản chép GIẢ; router + kho-goc + màn thật (DOM giả). Không đo prod, không gửi tin.
# Đảo-vá trên BẢN SAO TẠM (không bao giờ sửa cây làm việc chung — luật cổng GSP1); mỗi đột biến là MỘT tiến trình node mới.
# Môi trường: thiếu `DATABASE_URL_V3` thì tự nạp từ `.env` (không in giá trị). Không dùng `rg` (nợ N-GSP-CONG-RG-ENV) — chỉ `grep -E`.
# Vòng 2 (đối kháng): F1 dấu đơn vị GET→POST (ca V2-K0..K4) · F4 tiền tệ chỉ chặn bảng SẼ GHI (ca V2-K6 · K6b · K6c) + đột biến tương ứng.
# Cột «ca PHẢI đỏ» nhận nhiều ca cách nhau bằng `;` — đột biến chỉ tính là bị bắt khi MỌI ca đó cùng đỏ trong một lượt.
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$@" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
BASE=b0b82d7
CA_A=test/gsp3-doi-soat.test.mjs
CA_B=v3/test/b/gsp3-doi-soat-man.test.mjs

if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát"; exit 2; }
noi=$(node -e 'const u=new URL(process.env.DATABASE_URL_V3);console.log(`${u.hostname}:${u.port||5432}`)' 2>/dev/null || echo "?")
echo "── môi trường: máy dev · hộp cát Postgres trên $noi (CSDL aicloser_v3_test_gsp3_p<pid>, tự dựng tự dọn) · cây $GOC"

# ① bộ ca GSP3 (tầng A trên Postgres + cửa/vai/màn) — thước SÀN, không neo số tuyệt đối
out=$(chay "$CA_A" "$CA_B"); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -ne 0 ] && echo "$out" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
[ "$f" -eq 0 ] && [ "$p" -ge 37 ]; ket "①bộ-ca-gsp3" $? "pass=$p fail=$f (sàn ≥37)"

# ② từng phép của ④ có ca XANH riêng (bảng đếm: thấy/đòi)
thay=0; doi=0; thieu=""
for tag in 'A0 ·' 'A9b ·' '④1 ·' '④2 ·' '④3a ·' '④3 ·' '④4 ·' '④5 ·' '④6 ·' '④7 ·' '④8 ·' '④8b ·' '④9 · marketer' \
           '④9c F1 ·' '④9c F2 ·' '④9 · CSDL' 'R1 ·' 'R3 ·' 'GSP3 · cửa thật' 'GSP3 · màn: dòng chờ' 'GSP3 · màn: lưu khi chưa chọn' \
           'GSP3 · màn: sản phẩm nhiều món' 'GSP3 · màn: bảng bản sao trùng' \
           'V2-K0 ·' 'V2-K1 ·' 'V2-K2 ·' 'V2-K3 ·' 'V2-K4 ·' 'V2-K6c ·' 'V2-K6 ·' 'V2-K6b ·' 'GSP3 · màn: đơn vị đổi' \
           'GSP3 · màn: bảng mang tiền tệ sai' 'GSP3 · màn: bảng DUY NHẤT' 'GSP3 · màn: lỗi KHÁC'; do
  doi=$((doi+1))
  if echo "$out" | grep -qF -- "✔ $tag"; then thay=$((thay+1)); else thieu="$thieu [$tag]"; fi
done
[ "$thay" -eq "$doi" ]; ket "②phép-④-có-ca-xanh" $? "$thay/$doi${thieu:+ · thiếu:$thieu}"

# ③ ba tệp phiếu cấm sửa (cửa lưu giá · kho ảnh · bản chép) đứng nguyên TRONG KHOẢNG COMMIT CỦA GSP3 ($BASE..$CUOI_GSP3 — commit cuối
#    vòng 2). TT1 05/10 (tổng duyệt): bản cũ so $BASE với CÂY HIỆN TẠI ⇒ phiếu về sau ĐƯỢC PHÉP sửa các tệp này (TT1 sửa operations.js —
#    quy đơn vị saveProduct) cũng làm phép đỏ oan. Ý đồ giữ nguyên: «GSP3 không đụng ba tệp đó». Giá phải trả (/code-review TT1 #8): phép
#    nay là sự thật LỊCH SỬ, không tự đỏ nữa — GSP3 mở vòng 3 thì PHẢI dời CUOI_GSP3 tới commit cuối vòng đó.
CUOI_GSP3=0f2c4bf
git diff --quiet "$BASE" "$CUOI_GSP3" -- src/admin-v3/operations.js src/products/anh-san-pham.js src/products/ban-chep-bot.js
ket "③không-sửa-operations/anh/ban-chep" $? "trong $BASE..$CUOI_GSP3"

# ④ đảo-vá trên BẢN SAO TẠM: lượt CHỨNG (bản gốc trong bản sao phải xanh) rồi từng đột biến phải làm ĐÚNG ca đỏ
TAM=$(mktemp -d "${TMPDIR:-/tmp}/gsp3-dao-va.XXXXXX")
SHIM=$(mktemp -d "${TMPDIR:-/tmp}/gsp3-shim.XXXXXX")
don() { [ "${GIU_TAM:-}" = 1 ] && echo "   (giữ $TAM)" || rm -rf "$TAM"; rm -rf "$SHIM"; }
trap don EXIT INT TERM
cp -R src v3 test db package.json "$TAM/"; ln -s "$GOC/node_modules" "$TAM/node_modules"
for f in src/products/chuyen-ban-sao.js src/products/san-pham-goc.js v3/src/ui/san-pham/kho-goc.js v3/src/ui/san-pham/router.js \
         v3/src/ui/san-pham/trang/san-pham.html src/pos/tao-don.js; do cp "$TAM/$f" "$TAM/$f.goc"; done
DS_TEP_DOT='src/products/chuyen-ban-sao.js src/products/san-pham-goc.js v3/src/ui/san-pham/kho-goc.js v3/src/ui/san-pham/router.js v3/src/ui/san-pham/trang/san-pham.html src/pos/tao-don.js'
bam_cay() { (for f in $DS_TEP_DOT; do cat "$GOC/$f"; done) | shasum | cut -d' ' -f1; }
BAM_TRUOC=$(bam_cay)
chay_tam() { (cd "$TAM" && node --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1); }
oc=$(chay_tam "$CA_A"); oc2=$(chay_tam "$CA_B")
fc=$(( $(so "$oc" fail || echo 1) + $(so "$oc2" fail || echo 1) )); pc=$(( $(so "$oc" pass || echo 0) + $(so "$oc2" pass || echo 0) ))
[ "$fc" -eq 0 ] && [ "$pc" -ge 37 ]; ket "④0-lượt-chứng-bản-sao-tạm-xanh" $? "pass=$pc fail=$fc"
# tên | tệp đột biến | tệp ca | ca PHẢI đỏ (khuôn grep -E trên dòng ✖)
DS_DOT_BIEN='
lech_giua_page|src/products/chuyen-ban-sao.js|A|④1 ·
chep_bon_cot|src/products/chuyen-ban-sao.js|A|④2 ·
bo_day_nhanh_giong|src/products/chuyen-ban-sao.js|A|④5 ·
bo_go_anh_khi_hong|src/products/chuyen-ban-sao.js|A|④8 ·
dau_theo_page_bam|src/products/chuyen-ban-sao.js|A|④2 ·
bo_chia_don_vi|src/products/chuyen-ban-sao.js|A|A9b ·
bo_kiem_tien_te|src/products/chuyen-ban-sao.js|A|④7 ·
doan_japan|src/pos/tao-don.js|A|④7 ·
bo_luoi_032|src/products/chuyen-ban-sao.js|A|④9 · CSDL
bo_don_dau_bo_goc|src/products/san-pham-goc.js|A|④9c F1 ·
bo_don_bo_qua_khi_gan|src/products/san-pham-goc.js|A|④9c F2 ·
bo_kiem_vai|v3/src/ui/san-pham/kho-goc.js|A|④9 · marketer
bo_du_lieu_409|v3/src/ui/san-pham/router.js|B|GSP3 · cửa thật
bo_nut_doi_soat|v3/src/ui/san-pham/trang/san-pham.html|B|GSP3 · màn: dòng chờ
bo_kiem_truoc_khi_ghi|src/products/chuyen-ban-sao.js|A|R3 ·
bo_nhat_ky_doi_soat_do|v3/src/ui/san-pham/kho-goc.js|A|R1 ·
lech_ca_don_vi_tren_man|v3/src/ui/san-pham/trang/san-pham.html|B|GSP3 · màn: sản phẩm nhiều món
man_hua_chep_khi_trung|v3/src/ui/san-pham/trang/san-pham.html|B|GSP3 · màn: bảng bản sao trùng
bo_so_dau|src/products/chuyen-ban-sao.js|A|V2-K1 ·;V2-K2 ·
duong_khong_dau|src/products/chuyen-ban-sao.js|A|V2-K0 ·
dau_bo_bang_mon|src/products/chuyen-ban-sao.js|A|V2-K3 ·
dau_bo_page|src/products/chuyen-ban-sao.js|A|V2-K4 ·
kiem_te_ca_ban_sao_thua|src/products/chuyen-ban-sao.js|A|V2-K6 ·
bo_kiem_te_bang_thang|src/products/chuyen-ban-sao.js|A|V2-K6c ·
router_bo_dau|v3/src/ui/san-pham/router.js|B|GSP3 · cửa thật
man_khong_gui_dau|v3/src/ui/san-pham/trang/san-pham.html|B|GSP3 · màn: lưu khi chưa chọn
man_giu_chon_khi_doi|v3/src/ui/san-pham/trang/san-pham.html|B|GSP3 · màn: đơn vị đổi
man_giu_chon_sau_loi_khac|v3/src/ui/san-pham/trang/san-pham.html|B|GSP3 · màn: lỗi KHÁC
man_bat_nut_khi_sai_te|v3/src/ui/san-pham/trang/san-pham.html|B|GSP3 · màn: bảng DUY NHẤT
'
while IFS='|' read -r ten tep ca dong; do
  [ -z "$ten" ] && continue
  cp "$TAM/$tep.goc" "$TAM/$tep"
  if ! python3 - "$TAM/$tep" "$ten" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1]); s = p.read_text(encoding='utf-8'); ten = sys.argv[2]
if ten == 'chep_bon_cot':
    a = s.index('const offerTu = '); b = s.index('\n});', a) + 4
    old = s[a:b]; new = 'const offerTu = ({ dong: d }) => ({ so_luong: d.so_luong, price: lonTheoTe(d.gia, d.tien_te), tien_te: d.tien_te, nhan: d.nhan ?? "" });'
else:
    old, new = {
      'lech_giua_page': ('else if (nhom.size > 1) { lech.push({ m, nhom, kyMon }); continue; }', 'else if (false) { lech.push({ m, nhom, kyMon }); continue; }'),
      'bo_day_nhanh_giong': ('else await dayMon(m.id);', 'else void dayMon;'),
      'bo_go_anh_khi_hong': ('try { await boAnh(pool, teamId, id); } catch { con.push(id); }', 'void boAnh;'),
      'dau_theo_page_bam': ('[teamId, chuaQuyet.map((b) => b.id), chep, dv.goc.ma_goc, dv.shop]', '[teamId, chep, chep, dv.goc.ma_goc, dv.shop]'),
      'bo_chia_don_vi': ('Number(v) / (HE_SO_TE[String(te || "").toUpperCase()] || 1)', 'Number(v)'),
      'bo_kiem_tien_te': ('const teSai = (bac) => bacSaiTe(bac, dv.tienTe);', 'const teSai = () => false;'),
      # TT1 (05/10): Taiwan đã vào bảng (TWD) ⇒ ví dụ «thị trường lạ» của ④7 là Japan (chưa kết nối) — đoán Japan thì ④7 phải đỏ.
      'doan_japan': ('Australia: "AUD", Taiwan: "TWD",\n});', 'Australia: "AUD", Taiwan: "TWD", Japan: "JPY",\n});'),
      'bo_luoi_032': ('if (!(await coCot032(pool))) {\n    throw new LoiSanPhamGoc("CSDL chưa áp migration 032 — đối soát', 'if (false) {\n    throw new LoiSanPhamGoc("CSDL chưa áp migration 032 — đối soát'),
      'bo_don_dau_bo_goc': ('doi_soat_goc IN (SELECT ma_goc FROM bo)', 'false AND doi_soat_goc IN (SELECT ma_goc FROM bo)'),
      'bo_don_bo_qua_khi_gan': ("AND page_id = $2 AND nguon <> 'pos' AND doi_soat = 'bo_qua'", "AND page_id = $2 AND nguon <> 'pos' AND false"),
      # neo theo dòng chú thích `dauDonVi` (vòng 2 chèn nó giữa kiểm vai và `vao` — khuôn cũ không còn khớp)
      'bo_kiem_vai': ("  batBuocVai(bc, ...VAI_SUA_DUOC);\n  // `dauDonVi`: dấu đơn vị khung đã đọc", "  // `dauDonVi`: dấu đơn vị khung đã đọc"),
      'bo_du_lieu_409': ("...(e.duLieu ? { duLieu: e.duLieu } : {})", ""),
      'bo_nut_doi_soat': ('<button type="button" class="nut" data-doisoat>', '<button type="button" class="nut" data-doisoat-cu>'),
      'bo_kiem_truoc_khi_ghi': ('if (khongChep.length) {', 'if (false) {'),
      'bo_nhat_ky_doi_soat_do': ('if (du?.nuaVoi || du?.daXongMon?.length) {', 'if (du?.nuaVoi) {'),
      'lech_ca_don_vi_tren_man': ('const soMonLech = capDu ? du.mon.filter((m) => bangCuaMon(du, m).length > 1).length : 0;', 'const soMonLech = du.bangKhacNhau.length > 1 ? 1 : 0;'),
      'man_hua_chep_khi_trung': ("ds[0].laGiaMon ? 'trùng giá món", "false ? 'trùng giá món"),
      # vòng 2 · F1 — dấu đơn vị
      'bo_so_dau': ('if (thieuDau || dauDonVi !== dauCuaDonVi(dv)) {', 'if (thieuDau) {'),
      'duong_khong_dau': ('if (thieuDau || dauDonVi !== dauCuaDonVi(dv)) {', 'if (!thieuDau && dauDonVi !== dauCuaDonVi(dv)) {'),
      'dau_bo_bang_mon': ('mon: dv.mon.map((m) => [m.ma, kyBang(m.bac)]),', 'mon: dv.mon.map((m) => [m.ma]),'),
      'dau_bo_page': ('    page: dv.pages.map((p) => String(p.id)),\n', ''),
      'router_bo_dau': (', dauDonVi: req.body?.dauDonVi', ''),
      'man_khong_gui_dau': ('const than = { gocId: d.gocId, shopId: d.shopId, dauDonVi: du.dauDonVi };', 'const than = { gocId: d.gocId, shopId: d.shopId };'),
      'man_giu_chon_khi_doi': ('if (doi || (d.du && d.du.dauDonVi !== du.dauDonVi)) {', 'if (false) {'),
      'man_giu_chon_sau_loi_khac': ('if (doi || (d.du && d.du.dauDonVi !== du.dauDonVi)) {', 'if (doi) {'),
      'man_bat_nut_khi_sai_te': ("d.dangGui || !du.co032 || kc.includes('sai_te') ? ' disabled' : ''", "d.dangGui || !du.co032 ? ' disabled' : ''"),
      # vòng 2 · F4 — tiền tệ chỉ chặn bảng sẽ ghi (kiem_te_ca_ban_sao_thua = bản vòng 1: kiểm MỌI bản sao chưa quyết)
      'kiem_te_ca_ban_sao_thua': ('  const lechTe = [];\n', '  const lechTe = [];\n  { const t0 = chuaQuyet.flatMap((b) => b.bac.filter((x) => x.dong.tien_te !== dv.tienTe).map((x) => ({ ...banSaoRa(b), soLuong: x.dong.so_luong, tienTe: x.dong.tien_te }))); if (t0.length) throw loi409("lệch tệ", "lech_tien_te", { tienTeThiTruong: dv.tienTe, bac: t0 }); }\n'),
      'bo_kiem_te_bang_thang': ('if (ghiGia && teSai(thang.bac)) {', 'if (false) {'),
    }[ten]
assert s.count(old) == 1, (ten, old[:60])
p.write_text(s.replace(old, new), encoding='utf-8')
PY
  then ket "④đảo-vá-$ten" 1 "không áp được đột biến (khuôn không còn khớp — thước cũ)"; continue; fi
  if [ "$ca" = A ]; then o=$(chay_tam "$CA_A"); else o=$(chay_tam "$CA_B"); fi
  cp "$TAM/$tep.goc" "$TAM/$tep"
  fo=$(so "$o" fail); fo=${fo:-0}
  trung=0; IFS=';' read -ra _ca_do <<< "$dong"
  for _ca in "${_ca_do[@]}"; do echo "$o" | grep -E "^\s*✖ " | grep -qF -- "✖ $_ca" || trung=1; done
  [ "$fo" -ge 1 ] && [ "$trung" -eq 0 ]; ket "④đảo-vá-${ten} ⇒ «${dong}» đỏ" $? "fail=$fo"
done <<< "$DS_DOT_BIEN"
oh=$(chay_tam "$CA_A"); fh=$(so "$oh" fail); fh=${fh:-1}
[ "$fh" -eq 0 ]; ket "④z-khôi-phục-bản-sao-xanh-lại" $? "fail=$fh"
[ "$(bam_cay)" = "$BAM_TRUOC" ] && [ -z "$(git status --porcelain -- '*.goc')" ]
ket "④cây-chung-không-dính-đột-biến" $? "băm 5 tệp bị đột biến trong cây chung trước = sau · 0 tệp .goc lạc"

# ⑤ bộ ca canh phạm vi marketer LL15d — chạy RIÊNG
for t in test/ll15d-marketer-san-pham.test.mjs v3/test/b/ll15d-marketer-man.test.mjs; do
  o=$(chay "$t"); pp=$(so "$o" pass); ff=$(so "$o" fail); pp=${pp:-0}; ff=${ff:-1}
  [ "$ff" -eq 0 ] && [ "$pp" -ge 4 ]; ket "⑤LL15d-phạm-vi" $? "$t pass=$pp fail=$ff"
done

# ⑥ cổng cũ (rc TÁCH DÒNG). Cổng con nào gọi `rg` (nợ N-GSP-CONG-RG-ENV) thì cấp shim `rg → grep -E` CHỈ cho tiến trình con.
printf '#!/bin/sh\nexec grep -E "$@"\n' > "$SHIM/rg"; chmod +x "$SHIM/rg"
PATH_CON="$PATH"; command -v rg >/dev/null 2>&1 || { PATH_CON="$SHIM:$PATH"; echo "   (máy này không có rg trong bash — cổng con nhận shim grep -E · nợ N-GSP-CONG-RG-ENV)"; }
# Cổng con ĐỎ ⇒ ĐỐI CHỨNG cùng thước: chạy CHÍNH cổng đó trên worktree tạm ở $BASE, so DANH SÁCH dòng đỏ (chuẩn hoá số id/pid).
# Giống hệt ⇒ đỏ SẴN có từ trước phiếu (ghi nợ §9), 0 dòng đỏ mới ⇒ đạt; khác một dòng ⇒ đỏ. Không đỏ thì không dựng worktree.
chuan_do() { grep -E "✘|🔴" | sed -E 's/[0-9]{4,}//g; s/p[0-9]+//g' | sort; }
WT_BASE=""
don_wt() { [ -n "$WT_BASE" ] && git worktree remove --force "$WT_BASE" >/dev/null 2>&1; rm -rf "$(dirname "${WT_BASE:-/nonexistent/x}")" 2>/dev/null; }
trap 'don; don_wt' EXIT INT TERM
for g in gsp1 gsp2 ve8b va-r2 l3-m4 ll15d; do
  _o=$(PATH="$PATH_CON" bash "ops/bin/nghiem-thu/$g.sh" 2>&1)
  _r=$?
  if [ "$_r" -eq 0 ]; then ket "⑥cổng-cũ-$g" 0 "rc=0"; continue; fi
  if [ -z "$WT_BASE" ]; then
    WT_BASE="$(mktemp -d "${TMPDIR:-/tmp}/gsp3-base.XXXXXX")/wt"
    git worktree add -q --detach "$WT_BASE" "$BASE" >/dev/null 2>&1 && ln -s "$GOC/node_modules" "$WT_BASE/node_modules" \
      && { [ ! -f "$GOC/.env" ] || ln -s "$GOC/.env" "$WT_BASE/.env"; }
  fi
  _moi=$(echo "$_o" | chuan_do)
  _cu=$( (cd "$WT_BASE" 2>/dev/null && PATH="$PATH_CON" bash "ops/bin/nghiem-thu/$g.sh" 2>&1) | chuan_do)
  _them=$(comm -13 <(echo "$_cu") <(echo "$_moi") | grep -c .)
  if [ -n "$_cu" ] && [ "$_them" -eq 0 ]; then
    ket "⑥cổng-cũ-$g" 0 "rc=$_r — ĐỎ SẴN ở $BASE: $(echo "$_moi" | grep -c .) dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ §9, không do GSP3)"
  else
    comm -13 <(echo "$_cu") <(echo "$_moi") | head -5 | sed 's/^/   ↳ MỚI: /'
    ket "⑥cổng-cũ-$g" 1 "rc=$_r · $_them dòng đỏ MỚI so với $BASE"
  fi
done
echo "== ĐỎ $do / XANH $xanh"
exit $((do > 0))
