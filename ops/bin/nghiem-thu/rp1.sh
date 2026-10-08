#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU RP1 — «ĐƯỜNG ĐỌC CSDL (V3_RAP_PROMPT_BAT=1) ĐỦ CHO PILOT»: ảnh sản phẩm · ảnh hỏng không chặn chữ · «Tên bậc»
# từ giao diện + luật qty có điều kiện (draft.js) · tên món bỏ số hiệu giữ đuôi biến thể · lọc hết hàng · luật lõi giữ trong mã.
# Chạy: ops/bin/nghiem-thu/rp1.sh   (rc=0 là đạt) · GIU_TAM=1 giữ thư mục đảo-vá · BO_CONG_CU=1 bỏ ⑥ cổng cũ (lượt sửa nhanh — KHÔNG
# phải lượt nghiệm thu) · CHAY_TT1B_SH=1 chạy thêm cổng tt1b.sh ở ⑥ (mặc định đo bằng bộ ca test/tt1b-* ở ⑤ — phiếu ④9 cho phép) ·
# CHAY_NPM_TEST=1 chạy thêm `npm test -- --test-force-exit` (④9 «không thêm ca đỏ» — mặc định HOÃN: luật 6, không chạy song song lượt khác).
# Thi hành ĐÚNG 9 phép của ④ trong docs/thi-cong/phieu/PHIEU-RP1.md. Mỗi phép in MỘT số đo / một bảng đếm.
# Tầm đo: lưới HỒI QUY do chính thợ viết (luật 32 — bắt tái phạm đã biết, không phải bằng chứng «kín»). Hai tệp ca: tầng thuần (nhãn +
# luật qty) và Postgres HỘP CÁT riêng (`db/sandbox.js`, tên `aicloser_v3_test_rp1_p<pid>`, tự dựng tự dọn) đi đường thật tới fetch GIẢ.
# KHÔNG mạng, KHÔNG đo `aicloser_v3` dev, KHÔNG prod; `V3_RAP_PROMPT_BAT=1` + van gửi chỉ mở trong env tiến trình ca.
# Đảo-vá trên BẢN SAO TẠM (không bao giờ sửa cây làm việc); mỗi đột biến là MỘT tiến trình node mới; đột biến phải làm ĐỎ ít nhất đúng
# tập ca đã khai (đọc bảng «đột biến nào KHÔNG đỏ» — luật viet-thuoc).
# Môi trường: thiếu `DATABASE_URL_V3` thì tự nạp từ `.env` (không in giá trị). Không dùng `rg` — chỉ `grep -E`. macOS không `timeout`.
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
BASE=9f2755c
CA="test/rp1-nhan-qty.test.mjs test/rp1-duong-csdl.test.mjs"
SAN=39
LOI=0; PHEP=0
muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-62s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP+1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP+1)); LOI=$((LOI+1)); printf '   ✘ %s\n' "$1"; }
dem() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+' | paste -sd+ - | bc 2>/dev/null; }
# shellcheck disable=SC2086
chay_ca() { (cd "$1" && node --env-file-if-exists="$GOC/.env" --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit ${@:2} 2>&1); }
do_tap() { echo "$1" | grep -oE "✖ [NQR][0-9]+[a-z]? ·" | sed 's/^✖ //; s/ ·$//' | LC_ALL=C sort -u | tr '\n' ' ' | sed 's/ $//'; }

if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát · rc=2"; exit 2; }
noi=$(node -e 'const u=new URL(process.env.DATABASE_URL_V3);console.log(`${u.hostname}:${u.port||5432}`)' 2>/dev/null || echo "?")
echo "CỔNG NGHIỆM THU RP1 · $(date '+%F %T') · cây $GOC @ $(git rev-parse --short HEAD) · base $BASE"
echo "── môi trường: MÁY DEV · hộp cát Postgres trên $noi (CSDL aicloser_v3_test_rp1_p<pid>, tự dựng tự dọn — không phải aicloser_v3 dev, không prod) · Pancake GIẢ"
node -e 'console.log("   (tệp đo: " + require("path").resolve("src/chat/rap-prompt.js") + " · cwd " + process.cwd() + ")")'

# ═══ ① BỘ CA RP1 — thước SÀN (fail=0 và pass ≥ sàn), HAI múi giờ — không neo số tuyệt đối ═════════════════════════════════════════
muc "① bộ ca RP1 (tầng thuần nhãn/qty · Postgres hộp cát + Pancake giả, đường thật) — hai múi giờ"
OUT=""
for tz in UTC Pacific/Kiritimati; do
  o=$(TZ=$tz PGTZ=$tz chay_ca "$GOC" $CA); p=$(dem "$o" pass); f=$(dem "$o" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
  so "TZ=$tz" "pass=$p fail=$f"
  [ "$f" -eq 0 ] && [ "$p" -ge "$SAN" ] && dat "bộ ca RP1 ($tz) pass=$p fail=0 (sàn ≥$SAN)" || truot "bộ ca RP1 ($tz) pass=$p fail=$f"
  [ "$tz" = UTC ] && OUT="$o"
done

# ═══ ② MỖI PHÉP ④1–④7 CÓ CA XANH RIÊNG (bảng đếm thấy/đòi) ══════════════════════════════════════════════════════════════════════
#   ④1 R1a–R1f · ④2 R2a–R2j (R2i: lệch phiếu tổng nhận — lỗi quyền ném như cũ · R2j: /code-review #3 #4) · ④3 N1–N5 Q1–Q9 R3a R3b
#   (Q9: /code-review #1) · ④4 R4a R4b · ④5 R5a R5b · ④6 R6a R6b (R6b: /code-review #6) · ④7 R7a
muc "② mỗi phép ④1–④7 có ca XANH riêng"
thay=0; doi=0; thieu=""
for tag in R1a R1b R1c R1d R1e R1f R2a R2b R2c R2d R2e R2f R2g R2h R2i R2j N1 N2 N3 N4 N5 Q1 Q2 Q3 Q4 Q5 Q6 Q7 Q8 Q9 R3a R3b R4a R4b R5a R5b R6a R6b R7a; do
  doi=$((doi+1))
  if echo "$OUT" | grep -qE "✔ $tag ·"; then thay=$((thay+1)); else thieu="$thieu $tag"; fi
done
so "ca xanh thấy / đòi" "$thay/$doi${thieu:+ · thiếu:$thieu}"
[ "$thay" -eq "$doi" ] && dat "mọi phép ④1–④7 có ca xanh ($thay/$doi)" || truot "thiếu ca xanh:$thieu"

# ═══ ③ PHẠM VI + HỢP ĐỒNG HÌNH DẠNG (luật 30 — chỉ là lưới; đường đi dữ liệu do ① đo) ════════════════════════════════════════════
muc "③ phạm vi ③ phiếu · biến mới khai · tệp cấm · neo cổng cũ"
# Đo theo TIÊU ĐỀ commit «RP1» trong BASE..HEAD (giữ nguyên qua cherry-pick) + sửa dở trên cây — không so base với cây (phiếu khác đổi
# cùng tệp làm phép đỏ oan).
# Commit của THỢ: «<loại>(<phạm vi>): RP1 — …» / «… RP1 vòng N — …»; commit phiếu/sổ của tổng (docs(phieu) · docs(dieu-hanh)) không tính.
DS_RP1=$(git log --format='%H %s' "$BASE"..HEAD | grep -E ' [a-z-]+\([^)]*\): RP1( vòng [0-9]+)? — ' | grep -vE ' docs\((phieu|dieu-hanh)\):' | cut -d' ' -f1)
nb=$(grep -cE '^\| `V3_LUAT_CHUNG_CSDL`' docs/v3/ban-giao/bien-moi-truong-v3.md)
ncode=$(grep -cF 'process.env.V3_LUAT_CHUNG_CSDL === "1"' src/chat/rap-prompt.js)
so "biến V3_LUAT_CHUNG_CSDL: dòng bảng khai · chỗ đọc (vắng = ĐÓNG)" "$nb · $ncode (đòi 1 · 1)"
[ "$nb" -eq 1 ] && [ "$ncode" -eq 1 ] && dat "biến mới khai ở bien-moi-truong-v3.md và đọc đúng luật vắng=đóng" || truot "biến mới chưa khai/đọc lệch ($nb · $ncode)"
NAO='src/prompts.js src/closer.js src/tools.js src/fast-lane.js src/outbound-guard.js'
NEO='ops/bin/nghiem-thu/gl3.sh ops/bin/nghiem-thu/gl3b.sh ops/bin/nghiem-thu/gl4.sh ops/bin/nghiem-thu/gl3c.sh test/gl4-ngat-page.test.mjs'
n_nao=0; n_neo=0; n_ngoai=0; ngoai=""
PHAM_VI='^(src/chat/rap-prompt\.js|src/chat/handler-v3\.js|src/orders/draft\.js|docs/v3/ban-giao/bien-moi-truong-v3\.md|test/l4-prompt\.test\.mjs|test/rp1-[^/]+\.test\.mjs|v3/test/b/rp1-[^/]+\.test\.mjs|ops/bin/nghiem-thu/rp1\.sh|docs/thi-cong/nhat-ky/phieu-rp1\.md|docs/thi-cong/SO-DIEU-HANH-THI-CONG\.md)$'
for c in $DS_RP1; do
  for f in $(git show --name-only --format= "$c"); do
    case " $NAO " in *" $f "*) n_nao=$((n_nao+1));; esac
    case " $NEO " in *" $f "*) n_neo=$((n_neo+1));; esac
    echo "$f" | grep -qE "$PHAM_VI" || { n_ngoai=$((n_ngoai+1)); ngoai="$ngoai $f"; }
  done
done
# shellcheck disable=SC2086
git diff --quiet HEAD -- $NAO $NEO; n_do=$?
so "commit RP1: $(echo "$DS_RP1" | grep -c .) · chạm bộ não · chạm neo cổng cũ · tệp ngoài ③" "$n_nao · $n_neo · $n_ngoai${ngoai:+ ($ngoai)} (đòi 0 · 0 · 0)"
so "sửa dở trên bộ não / neo cổng cũ" "$n_do (đòi 0)"
[ "$n_nao" -eq 0 ] && [ "$n_neo" -eq 0 ] && [ "$n_ngoai" -eq 0 ] && [ "$n_do" -eq 0 ] && dat "đúng pathspec ③ · không đụng 5 tệp bộ não · không đụng neo gl3/gl3b/gl4/gl3c" \
  || truot "lệch phạm vi (bộ não=$n_nao · neo=$n_neo · ngoài ③=$n_ngoai · dở=$n_do)"
# l4-prompt: CHỈ dòng `boLuatChung` (③). handler-v3: CHỈ `xaAnh` + hàm phụ + hai chỗ ghi sổ ảnh — dòng XOÁ (không phải chú thích) phải
# nằm trong thân `xaAnh` cũ / hai chỗ `if (nAnh)` (lưới hình dạng).
n_l4=0; n_h=0
for c in $DS_RP1; do
  a=$(git show -U0 "$c" -- test/l4-prompt.test.mjs | grep -E '^[-+][^-+]' | grep -vcE 'boLuatChung|V3_LUAT_CHUNG_CSDL'); n_l4=$((n_l4+a))
  b=$(git show -U0 "$c" -- src/chat/handler-v3.js | grep -E '^-[^-]' | grep -vE '^-\s*(//|\*|/\*\*)' \
    | grep -vcE 'for \(const im of hang\) \{|await assertCanAct\(\);|await guiDaXacNhan\(\(\) => d\.cua\.guiAnh\(|^-\s+(pool|ctx),$|\{ \.\.\.diaChi, url: im\.url, caption \},|d\.depsPancake,|^-\s+\)\);$|if \(nAnh\) \{|duLieu: \{ n: nAnh \},'); n_h=$((n_h+b))
done
so "l4-prompt: dòng đổi ngoài boLuatChung · handler-v3: dòng mã XOÁ ngoài xaAnh/ghi sổ ảnh" "$n_l4 · $n_h (đòi 0 · 0)"
[ "$n_l4" -eq 0 ] && [ "$n_h" -eq 0 ] && dat "l4-prompt chỉ dòng boLuatChung · handler-v3 chỉ xaAnh + hàm phụ" || truot "sửa ngoài ràng buộc ③ (l4=$n_l4 · handler=$n_h)"

# ═══ ④ ĐẢO-VÁ trên BẢN SAO TẠM (④8 + đột biến thêm) ═════════════════════════════════════════════════════════════════════════════
muc "④ đảo-vá (④8 + đột biến thêm) — bản sao tạm, cây làm việc không bao giờ bị sửa"
TAM=$(mktemp -d "${TMPDIR:-/tmp}/rp1-dao-va.XXXXXX")
WT_BASE=""
don() {
  [ -n "$WT_BASE" ] && git worktree remove --force "$WT_BASE" >/dev/null 2>&1; git worktree prune >/dev/null 2>&1
  if [ "${GIU_TAM:-0}" = 1 ]; then echo "   (giữ $TAM)"; else rm -rf "$TAM"; fi
}
trap don EXIT; trap 'exit 130' INT TERM
cp -R src v3 test db package.json "$TAM/"; ln -s "$GOC/node_modules" "$TAM/node_modules"
DS_TEP_DOT='src/chat/rap-prompt.js src/chat/handler-v3.js src/orders/draft.js'
for f in $DS_TEP_DOT; do cp "$TAM/$f" "$TAM/$f.goc"; done
bam_cay() { (for f in $DS_TEP_DOT; do cat "$GOC/$f"; done) | shasum | cut -d' ' -f1; }
BAM_TRUOC=$(bam_cay)
o0=$(chay_ca "$TAM" $CA); f0=$(dem "$o0" fail); p0=$(dem "$o0" pass)
so "lượt CHỨNG (bản sao chưa đột biến)" "pass=${p0:-0} fail=${f0:-?}"
[ "${f0:-1}" -eq 0 ] && [ "${p0:-0}" -ge "$SAN" ] && dat "bản sao tạm xanh trước đột biến" || truot "bản sao tạm KHÔNG xanh trước đột biến — đảo-vá vô nghĩa"
# tên | tệp đột biến | ca PHẢI đỏ (tập con của tập đỏ thật)
DS_DOT_BIEN='
bo_images|src/chat/rap-prompt.js|R1a R1c R1d R1e R1f
bo_catch_anh|src/chat/handler-v3.js|R2a R2c
bo_thu_lai|src/chat/handler-v3.js|R2a R2b
nuot_loi_khong_http|src/chat/handler-v3.js|R2d R2e
nhan_ve_buy_n|src/chat/rap-prompt.js|N2 N3 R3a
draft_so_qty_cu|src/orders/draft.js|Q1 R3b
draft_ep_qty|src/orders/draft.js|Q3 Q4 Q5 Q7
ten_giu_so_hieu|src/chat/rap-prompt.js|R4a
ten_bo_duoi_bien_the|src/chat/rap-prompt.js|R4a
bo_loc_het_hang|src/chat/rap-prompt.js|R5a R5b
luat_csdl_khi_vang_bien|src/chat/rap-prompt.js|R6a
nuot_loi_quyen|src/chat/handler-v3.js|R2i
khong_ro_van_thu_lai|src/chat/handler-v3.js|R2c
caption_khong_doi|src/chat/handler-v3.js|R2f
bo_so_anh_hong|src/chat/handler-v3.js|R2a R2c R2g
so_anh_hong_bo_nhanh_model|src/chat/handler-v3.js|R2h
bo_dong_anh_co_san|src/chat/rap-prompt.js|R1b
noi_ca_khi_co_total|src/chat/rap-prompt.js|N3 R3a
draft_bo_bac_khac|src/orders/draft.js|Q4 Q7
page_chua_gan_cung_bo_so|src/chat/rap-prompt.js|R4b
draft_bo_chon_theo_qty|src/orders/draft.js|Q9
khong_ro_van_gui_tiep|src/chat/handler-v3.js|R2j
cau_khai_luat_chi_theo_bien|src/chat/rap-prompt.js|R6b
dong_anh_ke_ca_anh_khong_gui_duoc|src/chat/rap-prompt.js|R1b
'
while IFS='|' read -r ten tep doi_do; do
  [ -z "$ten" ] && continue
  cp "$TAM/$tep.goc" "$TAM/$tep"
  if ! python3 - "$TAM/$tep" "$ten" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1]); s = p.read_text(encoding='utf-8'); ten = sys.argv[2]
old, new = {
  # ④8 — «bỏ images»
  'bo_images': ('    images: (Array.isArray(s.anh) ? s.anh : []).map((a) => ({ url: a.duong, label: a.nhan })),\n', ''),
  # ④8 — «bỏ catch ảnh» (mọi lỗi ảnh ném như trước RP1)
  'bo_catch_anh': ('        const loai = loaiLoiAnh(e);\n', '        const loai = null;\n'),
  # ④8 — «bỏ thử lại»
  'bo_thu_lai': ('        if (loai === "tu_choi" && lan === 0) {', '        if (false) {'),
  # ④8 — «nuốt cả lỗi không-HTTP» (cổng chặn · thiếu url)
  'nuot_loi_khong_http': ('  if (c?.name !== "LoiCanDoiChieuGui" || c.kenh !== true || c.loai !== "guiAnh") return null;',
                          '  if (c?.name !== "LoiCanDoiChieuGui") return null;'),
  # ④8 — «label về Buy N»
  'nhan_ve_buy_n': ('  return { label: nhanGoiGia(g), qty: Number(g.so_luong),', '  return { label: `Buy ${g.so_luong}`, qty: Number(g.so_luong),'),
  # ④8 — «draft.js so qty cũ»
  'draft_so_qty_cu': ("    if (soMuaDauNhan(explicit.label) !== order.qty || coBacKhac) fail('số lượng không khớp gói giá');",
                      "    fail('số lượng không khớp gói giá');"),
  # ④8 — «draft.js ép qty vô điều kiện»
  'draft_ep_qty': ("    if (soMuaDauNhan(explicit.label) !== order.qty || coBacKhac) fail('số lượng không khớp gói giá');\n", ''),
  # ④8 — «name giữ số hiệu»
  'ten_giu_so_hieu': ('  return tachSoHieu(ten).ten || String(sp.tenGoc || "").trim() || ten;', '  return ten;'),
  # ④8 — «bỏ đuôi biến thể» (dùng thẳng tên gốc)
  'ten_bo_duoi_bien_the': ('  return tachSoHieu(ten).ten || String(sp.tenGoc || "").trim() || ten;', '  return String(sp.tenGoc || "").trim() || ten;'),
  # ④8 — «bỏ lọc hết hàng»
  'bo_loc_het_hang': ('  const spBan = sp.filter((s) => !s.het_hang);', '  const spBan = sp;'),
  # ④8 — «luật CSDL khi vắng biến»
  'luat_csdl_khi_vang_bien': ('    boLuatChung: luat && luatChungTuCsdl() ? String(luat.noi_dung || "") : "",',
                              '    boLuatChung: luat ? String(luat.noi_dung || "") : "",'),
  # ── thêm (lệch phiếu tổng nhận · nhánh phụ của ② — bản vá cũng là code mới, luật 26) ──
  'nuot_loi_quyen': ('  if ((Array.isArray(c.chiTiet?.ma) ? c.chiTiet.ma : []).some((m) => MA_LOI_QUYEN.has(Number(m)))) return null;\n', ''),
  'khong_ro_van_thu_lai': ('        if (loai === "tu_choi" && lan === 0) {', '        if (lan === 0) {'),
  'caption_khong_doi': ('      if (kq === "tu_choi") continue;', '      if (kq === "tu_choi") { caption = ""; continue; }'),
  'bo_so_anh_hong': ('        anhHong.push(loai);\n', ''),
  'so_anh_hong_bo_nhanh_model': ('        lane: "AI",\n        duLieu: duLieuAnh(nAnh),', '        lane: "AI",\n        duLieu: { n: nAnh },'),
  'bo_dong_anh_co_san': ('    if (nhanAnh.length) out.push(', '    if (false) out.push('),
  'noi_ca_khi_co_total': ('  if (chuan === `buy ${sl}` || /\\btotal\\s*:?\\s*\\d/.test(chuan)) return nhan;', '  if (chuan === `buy ${sl}`) return nhan;'),
  'draft_bo_bac_khac': ("    if (soMuaDauNhan(explicit.label) !== order.qty || coBacKhac) fail('số lượng không khớp gói giá');",
                        "    if (soMuaDauNhan(explicit.label) !== order.qty) fail('số lượng không khớp gói giá');"),
  'page_chua_gan_cung_bo_so': ('  if (!ganGoc) return sp.ten;\n', ''),
  # ── sau /code-review (luật 26: bản vá cũng là code mới — mỗi chỗ vừa vá một đột biến) ──
  'draft_bo_chon_theo_qty': ('  const variant = theoQty.length === 1 ? theoQty[0].label : order.variant;', '  const variant = order.variant;'),
  'khong_ro_van_gui_tiep': ('        for (let k = i + 1; k < hang.length; k += 1) anhHong.push("bo_sau_khong_ro");\n        break;', '        continue;'),
  'cau_khai_luat_chi_theo_bien': ('    xayVanBanBoLuatChung(luat, luatCsdlDangAp),', '    xayVanBanBoLuatChung(luat, !!luat && luatChungTuCsdl()),'),
  'dong_anh_ke_ca_anh_khong_gui_duoc': ('      .filter((im) => /^https?:\/\//.test(im.url)).map((im) => im.label || "Ảnh SP");', '      .map((im) => im.label || "Ảnh SP");'),
}[ten]
assert s.count(old) == 1, (ten, old[:70])
p.write_text(s.replace(old, new), encoding='utf-8')
PY
  then truot "đảo-vá $ten: không áp được đột biến (khuôn không còn khớp — sửa thước)"; continue; fi
  o=$(chay_ca "$TAM" $CA); f=$(dem "$o" fail)
  cp "$TAM/$tep.goc" "$TAM/$tep"
  that=" $(do_tap "$o") "; song=""
  for c in $doi_do; do case "$that" in *" $c "*) ;; *) song="$song $c";; esac; done
  so "đột biến $ten" "đỏ thật:${that% } · đòi: $doi_do · fail=${f:-?}"
  [ -z "$song" ] && [ "${f:-0}" -ge 1 ] && dat "đảo-vá $ten ⇒ $doi_do đỏ" || truot "đảo-vá $ten: đột biến SỐNG ở:${song:- (fail=0)}"
done <<< "$DS_DOT_BIEN"
o1=$(chay_ca "$TAM" $CA); f1=$(dem "$o1" fail)
so "lượt khôi phục bản sao ⇒ fail" "${f1:-?}"
[ "${f1:-1}" -eq 0 ] && dat "khôi phục ⇒ xanh lại (thước không tự đỏ)" || truot "khôi phục mà vẫn đỏ (fail=${f1:-?}) — thước hỏng"
[ "$BAM_TRUOC" = "$(bam_cay)" ] && dat "cây làm việc không dính đột biến (băm 3 tệp đột biến trước = sau)" || truot "cây làm việc BỊ ĐỔI trong lượt đảo-vá"

# ═══ ⑤ BỘ CA CŨ ④9 (rc tách dòng) ═══════════════════════════════════════════════════════════════════════════════════════════════
muc "⑤ bộ ca cũ ④9 — mỗi tệp một tiến trình (rc tách dòng)"
DS_CU=$( (grep -rlE "rapKb|rap-prompt|orders/draft" test v3/test; ls test/tt1b-*.test.* test/l3-m4-*.test.* 2>/dev/null; \
  echo test/mn3-ban-chep-bot.test.mjs; echo test/gl4-ngat-page.test.mjs) | grep -vE '/rp1-' | LC_ALL=C sort -u)
for t in $DS_CU; do
  [ -f "$t" ] || { truot "bộ ca cũ $t: tệp không còn"; continue; }
  o=$(chay_ca "$GOC" "$t"); p=$(dem "$o" pass); f=$(dem "$o" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -3 | sed 's/^/   ↳ /'
  [ "$f" -eq 0 ] && [ "$p" -ge 1 ] && dat "$t pass=$p fail=0" || truot "$t pass=$p fail=$f"
done

# ═══ ⑥ CỔNG CŨ ④9 (rc TÁCH DÒNG): gl4 · gl3b · gl3 (+ tt1b khi CHAY_TT1B_SH=1) ════════════════════════════════════════════════════
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
  DS_CONG="gl4 gl3b gl3"; [ "${CHAY_TT1B_SH:-0}" = 1 ] && DS_CONG="$DS_CONG tt1b"
  for g in $DS_CONG; do
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
      dat "cổng cũ $g rc=$_r — ĐỎ SẴN ở $BASE: $(echo "$_moi" | grep -c .) dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ cũ, không do RP1)"
    else
      comm -13 <(echo "$_cu") <(echo "$_moi") | head -5 | sed 's/^/   ↳ MỚI: /'
      truot "cổng cũ $g rc=$_r · $_them dòng đỏ MỚI so với $BASE"
    fi
  done
fi
if [ "${CHAY_NPM_TEST:-}" = 1 ]; then
  o=$(npm test -- --test-force-exit 2>&1); nt=$(dem "$o" tests); nf=$(dem "$o" fail)
  [ "${nf:-1}" -eq 0 ] && dat "npm test tests=${nt:-?} fail=0" || { echo "$o" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'; truot "npm test tests=${nt:-?} fail=${nf:-?}"; }
else
  echo "   npm test: HOÃN (CHAY_NPM_TEST=1 khi không lượt đo nào khác đang chạy — luật 6) — không tính vào PHÉP/LỖI"
fi

echo; echo "PHÉP=$PHEP LỖI=$LOI · môi trường: máy dev, hộp cát aicloser_v3_test_rp1_p<pid>, Pancake giả"
exit $((LOI > 0))
