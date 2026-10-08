#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU RP2 — «hai núm ẩn chạm pilot»: khối Chính sách · FAQ · Phản đối vào đường CSDL (`rapKb` cờ bật, đọc THEO TEAM
# từ `khoi_dung_chung`, dựng bằng hàm đường cũ) · chấm điểm lead trong HANDLER trên tin KHÁCH của lịch sử kể từ mốc (cả câu Botcake đã
# trả lời) · `AM_THRESHOLD` 2 → 1 (Đụng bộ não `src/lead-score.js` — CHỈ hằng đó).
# Chạy: ops/bin/nghiem-thu/rp2.sh   (rc=0 là đạt) · GIU_TAM=1 giữ thư mục đảo-vá · BO_CONG_CU=1 bỏ ⑦ cổng cũ (lượt sửa nhanh — KHÔNG phải
# lượt nghiệm thu) · CHAY_NPM_TEST=1 chạy thêm `npm test -- --test-force-exit` (④7 «không thêm ca đỏ» — mặc định HOÃN, luật 6).
# Thi hành ĐÚNG 7 phép của ④ trong docs/thi-cong/phieu/PHIEU-RP2.md. Mỗi phép in MỘT số đo / một bảng đếm.
# Tầm đo: lưới HỒI QUY do chính thợ viết (luật 32 — bắt tái phạm đã biết, không phải bằng chứng «kín»). Bốn tệp ca: tầng thuần (chấm
# trên lịch sử + ngưỡng), worker THẬT (A' · A · B), rapKb trên Postgres HỘP CÁT riêng (`db/sandbox.js`, `aicloser_v3_test_rp2*_p<pid>`, tự
# dựng tự dọn) và công cụ đo chi phí. KHÔNG mạng (cửa gửi/model tiêm), KHÔNG đo `aicloser_v3` dev, KHÔNG prod; `V3_RAP_PROMPT_BAT=1` chỉ
# trong env tiến trình ca. Đảo-vá trên BẢN SAO TẠM; mỗi đột biến là MỘT tiến trình node mới; đột biến phải làm ĐỎ ít nhất đúng tập ca đã
# khai (đọc bảng «đột biến nào KHÔNG đỏ» — luật viet-thuoc).
# Môi trường: thiếu `DATABASE_URL_V3` thì tự nạp từ `.env` (không in giá trị). Không dùng `rg` — chỉ `grep -E`. macOS không `timeout`.
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
BASE=5ff70a7
CA="test/rp2-cham-lich-su.test.mjs test/rp2-worker-a-phay.test.mjs test/rp2-khoi-chung.test.mjs test/rp2-do-chi-phi.test.mjs"
SAN=28
LOI=0; PHEP=0
muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-62s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP+1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP+1)); LOI=$((LOI+1)); printf '   ✘ %s\n' "$1"; }
dem() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+' | paste -sd+ - | bc 2>/dev/null; }
# shellcheck disable=SC2086
chay_ca() { (cd "$1" && node --env-file-if-exists="$GOC/.env" --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit ${@:2} 2>&1); }
do_tap() { echo "$1" | grep -oE "✖ [KCWND][0-9]+[a-z]? ·" | sed 's/^✖ //; s/ ·$//' | LC_ALL=C sort -u | tr '\n' ' ' | sed 's/ $//'; }
xanh_tap() { echo "$1" | grep -oE "✔ [KCWND][0-9]+[a-z]? ·" | sed 's/^✔ //; s/ ·$//' | LC_ALL=C sort -u | tr '\n' ' ' | sed 's/ $//'; }

if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát · rc=2"; exit 2; }
noi=$(node -e 'const u=new URL(process.env.DATABASE_URL_V3);console.log(`${u.hostname}:${u.port||5432}`)' 2>/dev/null || echo "?")
echo "CỔNG NGHIỆM THU RP2 · $(date '+%F %T') · cây $GOC @ $(git rev-parse --short HEAD) · base $BASE"
echo "── môi trường: MÁY DEV · hộp cát Postgres trên $noi (CSDL aicloser_v3_test_rp2*_p<pid>, tự dựng tự dọn — không phải aicloser_v3 dev, không prod) · Pancake/model GIẢ"
node -e 'console.log("   (tệp đo: " + require("path").resolve("src/chat/ngan-sach-luot.js") + " · cwd " + process.cwd() + ")")'

# ═══ ① BỘ CA RP2 — thước SÀN (fail=0 và pass ≥ sàn), HAI múi giờ (④3: UTC và UTC+14) ═══════════════════════════════════════════
muc "① bộ ca RP2 (thuần · worker thật · rapKb hộp cát · công cụ đo) — hai múi giờ"
OUT=""
for tz in UTC Pacific/Kiritimati; do
  o=$(TZ=$tz PGTZ=$tz chay_ca "$GOC" $CA); p=$(dem "$o" pass); f=$(dem "$o" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
  so "TZ=$tz" "pass=$p fail=$f"
  [ "$f" -eq 0 ] && [ "$p" -ge "$SAN" ] && dat "bộ ca RP2 ($tz) pass=$p fail=0 (sàn ≥$SAN)" || truot "bộ ca RP2 ($tz) pass=$p fail=$f"
  [ "$tz" = UTC ] && OUT="$o"
done

# ═══ ② MỖI PHÉP ④1–④5 CÓ CA XANH RIÊNG (bảng đếm thấy/đòi) ══════════════════════════════════════════════════════════════════════
#   ④1 K1a–K1g · ④2 K2a · ④3 C1–C11 (C3b; C10 C11 = /code-review #3 #1 #2) W1–W4 · ④4 N1 N2 · ④5 D1 D2
muc "② mỗi phép ④1–④5 có ca XANH riêng"
thay=0; doi=0; thieu=""
for tag in K1a K1b K1c K1d K1e K1f K1g K2a C1 C2 C3 C3b C4 C5 C7 C8 C9 C10 C11 W1 W2 W3 W4 N1 N2 D1 D2; do
  doi=$((doi+1))
  if echo "$OUT" | grep -qE "✔ $tag ·"; then thay=$((thay+1)); else thieu="$thieu $tag"; fi
done
so "ca xanh thấy / đòi" "$thay/$doi${thieu:+ · thiếu:$thieu}"
[ "$thay" -eq "$doi" ] && dat "mọi phép ④1–④5 có ca xanh ($thay/$doi)" || truot "thiếu ca xanh:$thieu"

# ═══ ③ PHẠM VI ③ + HỢP ĐỒNG HÌNH DẠNG (luật 30 — chỉ là lưới; đường đi dữ liệu do ① đo) ════════════════════════════════════════
muc "③ phạm vi ③ phiếu · bộ não chỉ AM_THRESHOLD · tệp cấm (phase1 · bh7 · neo gl3*/gl4/rp1) · lời khai tài liệu"
# Commit của THỢ: «<loại>(<phạm vi>): RP2 — …» / «… RP2 vòng N — …» trong BASE..HEAD (giữ qua cherry-pick) + sửa dở trên cây.
DS_RP2=$(git log --format='%H %s' "$BASE"..HEAD | grep -E ' [a-z-]+\([^)]*\): RP2( vòng [0-9]+)? — ' | grep -vE ' docs\((phieu|dieu-hanh)\):' | cut -d' ' -f1)
NAO_KHAC='src/prompts.js src/closer.js src/tools.js src/fast-lane.js src/outbound-guard.js src/context.js'
CAM='test/phase1-chat-flow.test.js ops/bin/nghiem-thu/bh7.sh ops/bin/nghiem-thu/gl3.sh ops/bin/nghiem-thu/gl3b.sh ops/bin/nghiem-thu/gl3c.sh ops/bin/nghiem-thu/gl4.sh ops/bin/nghiem-thu/rp1.sh'
PHAM_VI='^(src/chat/rap-prompt\.js|src/products/khoi-chung\.js|src/kb\.js|src/chat/handler-v3\.js|src/chat/ngan-sach-luot\.js|src/lead-score\.js|docs/v3/ban-giao/bien-moi-truong-v3\.md|test/lead-score\.test\.mjs|test/rp2-[^/]+\.test\.mjs|ops/bin/nghiem-thu/rp2\.sh|ops/bin/do-ngan-sach-luot\.mjs|docs/thi-cong/nhat-ky/phieu-rp2\.md|docs/thi-cong/SO-DIEU-HANH-THI-CONG\.md)$'
n_nao=0; n_cam=0; n_ngoai=0; ngoai=""
for c in $DS_RP2; do
  for f in $(git show --name-only --format= "$c"); do
    case " $NAO_KHAC " in *" $f "*) n_nao=$((n_nao+1));; esac
    case " $CAM " in *" $f "*) n_cam=$((n_cam+1));; esac
    echo "$f" | grep -qE "$PHAM_VI" || { n_ngoai=$((n_ngoai+1)); ngoai="$ngoai $f"; }
  done
done
# shellcheck disable=SC2086
git diff --quiet HEAD -- $NAO_KHAC $CAM; n_do=$?
so "commit RP2: $(echo "$DS_RP2" | grep -c .) · chạm bộ não KHÁC · chạm tệp cấm · tệp ngoài ③" "$n_nao · $n_cam · $n_ngoai${ngoai:+ ($ngoai)} (đòi 0 · 0 · 0)"
so "sửa dở trên bộ não khác / tệp cấm" "$n_do (đòi 0)"
[ "$n_nao" -eq 0 ] && [ "$n_cam" -eq 0 ] && [ "$n_ngoai" -eq 0 ] && [ "$n_do" -eq 0 ] && dat "đúng pathspec ③ · bộ não chỉ lead-score.js · không đụng phase1/bh7/neo gl3*/gl4/rp1" \
  || truot "lệch phạm vi (não khác=$n_nao · cấm=$n_cam · ngoài ③=$n_ngoai · dở=$n_do)"
# Dòng MÃ đổi (bỏ chú thích/dòng trống) của RP2 commits + sửa dở, theo tệp. Mỗi tệp chỉ được đổi đúng phần ③ cho phép.
dong_ma() {   # dong_ma <tệp> <+|-> → các dòng mã thêm/bớt
  { for c in $DS_RP2; do git show -U0 "$c" -- "$1"; done; git diff -U0 HEAD -- "$1"; } \
    | grep -E "^\\$2[^-+]" | grep -vE "^\\$2\s*(//|\*|/\*\*|$)"
}
# lead-score: so phần MÃ (bỏ chú thích cuối dòng) của dòng bớt với dòng thêm — dòng chỉ đổi chú thích cuối thì triệt tiêu.
ls_bot=$(dong_ma src/lead-score.js - | sed -E 's#[[:space:]]*//.*$##; s/^-//' | LC_ALL=C sort)
ls_them=$(dong_ma src/lead-score.js + | sed -E 's#[[:space:]]*//.*$##; s/^[+]//' | LC_ALL=C sort)
l_ls=$( (comm -23 <(echo "$ls_bot") <(echo "$ls_them"); comm -13 <(echo "$ls_bot") <(echo "$ls_them")) | grep -vcE '^$|^export const AM_THRESHOLD = [0-9]+;$')
l_ls_moi=$(dong_ma src/lead-score.js + | grep -cE '^\+export const AM_THRESHOLD = 1;$')
l_h=$( (dong_ma src/chat/handler-v3.js -; dong_ma src/chat/handler-v3.js +) | grep -vcE 'chamVaTinhNganSach|chamTheoLichSu')
l_ns=$(dong_ma src/chat/ngan-sach-luot.js - | grep -c .)
l_kb=$(dong_ma src/kb.js - | grep -vcE 'function sharedTuTep\(\) \{|const d = docTepKhoiChung\(\);')
l_kc=$(dong_ma src/products/khoi-chung.js - | grep -c .)
l_ts=$( (dong_ma test/lead-score.test.mjs -; dong_ma test/lead-score.test.mjs +) | grep -vcE "test\('B1 |turnBudget\(\{ score: 1, signals: \['price'\] \}\)")
so "lead-score: dòng mã ngoài AM_THRESHOLD · có «= 1»" "$l_ls · $l_ls_moi (đòi 0 · 1)"
so "handler-v3: dòng mã đổi ngoài chỗ chấm · ngan-sach-luot: dòng mã XOÁ" "$l_h · $l_ns (đòi 0 · 0)"
so "kb.js: dòng mã XOÁ ngoài thân sharedTuTep · khoi-chung.js: dòng mã XOÁ" "$l_kb · $l_kc (đòi 0 · 0)"
so "lead-score.test: dòng mã đổi ngoài kỳ vọng B1" "$l_ts (đòi 0)"
[ "$l_ls" -eq 0 ] && [ "$l_ls_moi" -eq 1 ] && [ "$l_h" -eq 0 ] && [ "$l_ns" -eq 0 ] && [ "$l_kb" -eq 0 ] && [ "$l_kc" -eq 0 ] && [ "$l_ts" -eq 0 ] \
  && dat "bộ não chỉ AM_THRESHOLD=1 · handler/ngan-sach chỉ phần chấm · kb/khoi-chung chỉ export · B1 chỉ kỳ vọng" \
  || truot "sửa ngoài ràng buộc ③ (ls=$l_ls/$l_ls_moi · h=$l_h · ns=$l_ns · kb=$l_kb · kc=$l_kc · test=$l_ts)"
# ②4 + luật 3 tho-thi-cong: lời khai «HUMAN_TAKEOVER chỉ tác dụng ở mã cũ» phải còn ĐÚNG — đo bằng grep mỗi lượt.
n_doc=$(grep -cE '^`HUMAN_TAKEOVER`.*CHỈ có tác dụng ở mã cũ' docs/v3/ban-giao/bien-moi-truong-v3.md)
n_goi=$(grep -rnE 'decideConv\(' src v3/src | grep -vc 'export function decideConv')
n_doc_env=$(grep -rnE "process\.env\.HUMAN_TAKEOVER" src v3/src | grep -vc '^src/conv-owner.js:')
so "tài liệu khai HUMAN_TAKEOVER · chỗ gọi decideConv · chỗ đọc biến ngoài conv-owner" "$n_doc · $n_goi · $n_doc_env (đòi 1 · 0 · 0)"
[ "$n_doc" -eq 1 ] && [ "$n_goi" -eq 0 ] && [ "$n_doc_env" -eq 0 ] && dat "bien-moi-truong-v3.md khai HUMAN_TAKEOVER chỉ mã cũ — và lời khai còn đúng" \
  || truot "lời khai HUMAN_TAKEOVER thiếu hoặc SAI (doc=$n_doc · gọi decideConv=$n_goi · đọc biến=$n_doc_env)"

# ═══ ④ ĐẢO-VÁ trên BẢN SAO TẠM (④6 + đột biến thêm) ═════════════════════════════════════════════════════════════════════════════
muc "④ đảo-vá (④6 + đột biến thêm) — bản sao tạm, cây làm việc không bao giờ bị sửa"
TAM=$(mktemp -d "${TMPDIR:-/tmp}/rp2-dao-va.XXXXXX")
WT_BASE=""
don() {
  [ -n "$WT_BASE" ] && git worktree remove --force "$WT_BASE" >/dev/null 2>&1; git worktree prune >/dev/null 2>&1
  if [ "${GIU_TAM:-0}" = 1 ]; then echo "   (giữ $TAM)"; else rm -rf "$TAM"; fi
}
trap don EXIT; trap 'exit 130' INT TERM
mkdir -p "$TAM/ops/bin"; cp -R src v3 test db package.json "$TAM/"; cp ops/bin/do-ngan-sach-luot.mjs "$TAM/ops/bin/"; ln -s "$GOC/node_modules" "$TAM/node_modules"
DS_TEP_DOT='src/chat/rap-prompt.js src/chat/handler-v3.js src/chat/ngan-sach-luot.js src/lead-score.js src/queue/worker.js ops/bin/do-ngan-sach-luot.mjs'
for f in $DS_TEP_DOT; do cp "$TAM/$f" "$TAM/$f.goc"; done
bam_cay() { (for f in $DS_TEP_DOT; do cat "$GOC/$f"; done) | shasum | cut -d' ' -f1; }
BAM_TRUOC=$(bam_cay)
o0=$(chay_ca "$TAM" $CA); f0=$(dem "$o0" fail); p0=$(dem "$o0" pass)
so "lượt CHỨNG (bản sao chưa đột biến)" "pass=${p0:-0} fail=${f0:-?}"
[ "${f0:-1}" -eq 0 ] && [ "${p0:-0}" -ge "$SAN" ] && dat "bản sao tạm xanh trước đột biến" || truot "bản sao tạm KHÔNG xanh trước đột biến — đảo-vá vô nghĩa"
# tên | ca PHẢI đỏ (tập con của tập đỏ thật) | múi giờ chạy | ca PHẢI còn xanh (chứng minh đột biến đúng chỗ — để trống nếu không đòi)
DS_DOT_BIEN='
bo_khoi_chung|K1a K1b K1c K2a|UTC|K1d K1e
doc_tep_toan_he|K1d K2a|UTC|
nho_ram|K2a|UTC|K1a K1b
chi_cham_cum|W1 W2|UTC|W3 W4
cham_o_nhanh_nhuong_worker|W1|UTC|W2
khong_gan_lai_moc|C1 C4 C5|UTC|
cham_ca_chu_botcake|C2 C5 W4|UTC|
bo_moc_24h_lan_dau|C3 C3b|UTC|
nguong_ve_2|N1 W1 W2 W3|UTC|N2
dem_doi_cum_hien_tai|C5|UTC|
moc_phu_ca_tin_sau|C7|UTC|
moc_khong_phu_tin_hien_tai|C1 C5 C7|UTC|
cham_tung_tin|C4|UTC|
chi_kep_24h_khi_chua_moc|C3b|UTC|C3
cua_so_theo_dong_ho_may|C3|Pacific/Kiritimati|
tieu_de_tro|K1d K1e|UTC|
them_nguon_thieu_khoi_chung|K1f|UTC|
cong_cu_sau_cham_cum|D1|UTC|D2
cong_cu_bo_mo_phong_botcake|D1|UTC|
bo_lui_khi_khong_thay_tin|C10|UTC|
bo_loc_fb_pma|C11|UTC|
noi_bang_xuong_dong|C11|UTC|C4 C5
turnbudget_troi|D1 N2|UTC|
turnbudget_troi_dang_chot|D1 N2|UTC|
'
while IFS='|' read -r ten doi_do tz doi_xanh; do
  [ -z "$ten" ] && continue
  for f in $DS_TEP_DOT; do cp "$TAM/$f.goc" "$TAM/$f"; done
  if ! python3 - "$TAM" "$ten" <<'PY'
import sys
from pathlib import Path
goc, ten = Path(sys.argv[1]), sys.argv[2]
RP, HD, NS, LS, WK, CC = 'src/chat/rap-prompt.js', 'src/chat/handler-v3.js', 'src/chat/ngan-sach-luot.js', 'src/lead-score.js', 'src/queue/worker.js', 'ops/bin/do-ngan-sach-luot.mjs'
CAT = '  const cat = Math.max(mocTruoc, moiNhat ? moiNhat - CUA_SO_LUOT_MS : 0);'
CHI_CUM = (HD, '  const { lead, budget } = d.chamTheoLichSu(text, prevLead, { lichSu: d.lichSu, tin });',
               '  const { lead, budget } = d.chamTheoLichSu(text, prevLead, { lichSu: [], tin });')
DOT = {
  # ── ④6 ──
  'bo_khoi_chung': [(RP, '    vanBanKhoiChung(khoiChung.noiDung),\n', '')],
  'doc_tep_toan_he': [(RP, 'import { getKBForPage, productImages, vanBanKhoiChung } from "../kb.js";',
                           'import { getKBForPage, productImages, vanBanKhoiChung, khoiChungHienTai } from "../kb.js";'),
                      (RP, '    docKhoiChung(pool, teamId),\n', '    Promise.resolve({ noiDung: khoiChungHienTai().tep }),\n')],
  'nho_ram': [(RP, 'import { docKhoiChung } from "../products/khoi-chung.js";',
                   'import { docKhoiChung } from "../products/khoi-chung.js";\nconst _NHO_KHOI = new Map();'),
              (RP, '    docKhoiChung(pool, teamId),\n',
                   '    (_NHO_KHOI.has(String(teamId)) ? _NHO_KHOI : _NHO_KHOI.set(String(teamId), docKhoiChung(pool, teamId))).get(String(teamId)),\n')],
  'chi_cham_cum': [CHI_CUM],
  'cham_o_nhanh_nhuong_worker': [CHI_CUM,
     (WK, '      const lyDo = "page đã trả lời trước — nhường, không gọi model";',
          '      { const { scoreTurn } = await import("../lead-score.js");\n'
          '        const h = (await khach.query("SELECT h.id, h.diem_lead FROM hoi_thoai h JOIN page p ON p.id=h.page_id WHERE h.team_id=$1 AND p.page_id=$2 AND h.psid=$3", [tin.team_id, tin.page_id, tin.psid])).rows[0];\n'
          '        if (h) { const l = scoreTurn(String(tinXuLy.noi_dung || ""), h.diem_lead || {}); await khach.query("UPDATE hoi_thoai SET diem_lead=$2::jsonb, diem_nong=$3 WHERE id=$1", [h.id, JSON.stringify(l), l.score]); } }\n'
          '      const lyDo = "page đã trả lời trước — nhường, không gọi model";')],
  'khong_gan_lai_moc': [(NS, '  return { lead: moc > 0 ? { ...lead, moc } : lead, budget };', '  return { lead, budget };')],
  'cham_ca_chu_botcake': [(NS, '    .filter((m) => !laPage(m) && messageTime(m) > cat)', '    .filter((m) => messageTime(m) > cat)')],
  'bo_moc_24h_lan_dau': [(NS, CAT, '  const cat = mocTruoc;')],
  'nguong_ve_2': [(LS, 'export const AM_THRESHOLD = 1;', 'export const AM_THRESHOLD = 2;')],
  # ── thêm (nhánh phụ của ② 2 — mỗi quyết định ghi nhật ký có một đột biến) ──
  'dem_doi_cum_hien_tai': [(NS, '  const chuThem = history.slice(0, cuoiPage + 1)', '  const chuThem = history')],
  'moc_phu_ca_tin_sau': [(NS, 'Math.max(mocTruoc, messageTime(tinNay)));', 'Math.max(mocTruoc, moiNhat));')],
  'moc_khong_phu_tin_hien_tai': [(NS, 'Math.max(mocTruoc, messageTime(tinNay)));', 'mocTruoc);')],
  'cham_tung_tin': [(NS, '  const { lead, budget } = chamVaTinhNganSach([...chuThem, String(text ?? "")].join("\\n·\\n"), prevLead);',
                         '  let _l = prevLead; for (const t of [...chuThem, String(text ?? "")]) _l = chamVaTinhNganSach(t, _l).lead;\n  const lead = _l, budget = turnBudget(_l);')],
  'chi_kep_24h_khi_chua_moc': [(NS, CAT, '  const cat = mocTruoc || (moiNhat ? moiNhat - CUA_SO_LUOT_MS : 0);')],
  'cua_so_theo_dong_ho_may': [(NS, CAT, '  const cat = Math.max(mocTruoc, Date.now() - CUA_SO_LUOT_MS);')],
  'tieu_de_tro': [(RP, 'import { getKBForPage, productImages, vanBanKhoiChung } from "../kb.js";',
                       'import { getKBForPage, productImages, vanBanKhoiChung, buildShared } from "../kb.js";'),
                  (RP, '    vanBanKhoiChung(khoiChung.noiDung),\n',
                       '    buildShared(khoiChung.noiDung.policies, khoiChung.noiDung.faqs, khoiChung.noiDung.objections),\n')],
  'them_nguon_thieu_khoi_chung': [(RP, '  if (!sp.length) nguonThieu.push(KHOI.SAN_PHAM);\n',
                                       '  if (!sp.length) nguonThieu.push(KHOI.SAN_PHAM);\n  if (!vanBanKhoiChung(khoiChung.noiDung)) nguonThieu.push("khoi_chung");\n')],
  'cong_cu_sau_cham_cum': [(CC, '      if (cham === "lichSu") {', '      if (false) {')],
  'cong_cu_bo_mo_phong_botcake': [(CC, '      if (nhuong && c.botcake) { cumNhuong += 1; continue; }', '      if (false) { cumNhuong += 1; continue; }')],
  # ── sau /code-review (luật 26: bản vá cũng là code mới — mỗi chỗ vừa vá một đột biến) ──
  'bo_lui_khi_khong_thay_tin': [(NS, '  if (!tinNay) {', '  if (false) {'),
                                (NS, 'Math.max(mocTruoc, messageTime(tinNay)));', 'Math.max(mocTruoc, tinNay ? messageTime(tinNay) : 0));')],
  'bo_loc_fb_pma': [(NS, '    .filter((t) => !/fb-pma:\\/\\//i.test(t))\n', '')],
  'noi_bang_xuong_dong': [(NS, '.join("\\n·\\n"), prevLead);', '.join("\\n"), prevLead);')],
  'turnbudget_troi': [(LS, "    base = 6; tier = 'NONG';", "    base = 5; tier = 'NONG';")],
  'turnbudget_troi_dang_chot': [(LS, "    base = 10; tier = 'DANG_CHOT';", "    base = 9; tier = 'DANG_CHOT';")],
}[ten]
for tep, old, new in DOT:
    p = goc / tep; s = p.read_text(encoding='utf-8')
    assert s.count(old) == 1, (ten, tep, old[:80])
    p.write_text(s.replace(old, new), encoding='utf-8')
PY
  then truot "đảo-vá $ten: không áp được đột biến (khuôn không còn khớp — sửa thước)"; continue; fi
  o=$(TZ=$tz PGTZ=$tz chay_ca "$TAM" $CA); f=$(dem "$o" fail)
  for f2 in $DS_TEP_DOT; do cp "$TAM/$f2.goc" "$TAM/$f2"; done
  that=" $(do_tap "$o") "; xanh=" $(xanh_tap "$o") "; song=""; hong=""
  for c in $doi_do; do case "$that" in *" $c "*) ;; *) song="$song $c";; esac; done
  for c in $doi_xanh; do case "$xanh" in *" $c "*) ;; *) hong="$hong $c";; esac; done
  so "đột biến $ten (TZ=$tz)" "đỏ thật:${that% } · đòi: $doi_do${doi_xanh:+ · đòi còn xanh: $doi_xanh} · fail=${f:-?}"
  if [ -z "$song" ] && [ -z "$hong" ] && [ "${f:-0}" -ge 1 ]; then dat "đảo-vá $ten ⇒ $doi_do đỏ"
  else truot "đảo-vá $ten: đột biến SỐNG ở:${song:- —}${hong:+ · ca phải còn xanh mà đỏ:$hong}"; fi
done <<< "$DS_DOT_BIEN"
o1=$(chay_ca "$TAM" $CA); f1=$(dem "$o1" fail)
so "lượt khôi phục bản sao ⇒ fail" "${f1:-?}"
[ "${f1:-1}" -eq 0 ] && dat "khôi phục ⇒ xanh lại (thước không tự đỏ)" || truot "khôi phục mà vẫn đỏ (fail=${f1:-?}) — thước hỏng"
[ "$BAM_TRUOC" = "$(bam_cay)" ] && dat "cây làm việc không dính đột biến (băm tệp đột biến trước = sau)" || truot "cây làm việc BỊ ĐỔI trong lượt đảo-vá"

# ═══ ⑤ ĐO CHI PHÍ (④5 · N8) — mẫu 719 hội thoại máy dev, trước/sau, có mô phỏng nhường Botcake. KHÔNG có ngưỡng đạt ═══════════════
muc "⑤ đo chi phí — ops/bin/do-ngan-sach-luot.mjs (in số, không chấm đạt/trượt theo số)"
o5=$(node ops/bin/do-ngan-sach-luot.mjs 2>&1); r5=$?
echo "$o5" | sed 's/^/   │ /'
if [ "$r5" -ne 0 ]; then truot "công cụ đo chi phí chết rc=$r5"
elif echo "$o5" | grep -q "không có mẫu"; then echo "   (mẫu vắng trên máy này — HOÃN số đo, không tính vào PHÉP/LỖI)"
else dat "công cụ đo chi phí chạy rc=0 trên mẫu (số ghi nhật ký — không ngưỡng)"; fi

# ═══ ⑥ BỘ CA CŨ ④7 (rc tách dòng) ═══════════════════════════════════════════════════════════════════════════════════════════════
muc "⑥ bộ ca cũ ④7 — mỗi tệp một tiến trình (rc tách dòng)"
DS_CU=$( (grep -rlE "rapKb|turnBudget|lead-score|khoi-chung|AM_THRESHOLD" test v3/test; echo test/phase1-chat-flow.test.js; echo test/bh1-gia-va-cua-chot.test.js) \
  | grep -vE '/rp2-' | LC_ALL=C sort -u)
for t in $DS_CU; do
  [ -f "$t" ] || { truot "bộ ca cũ $t: tệp không còn"; continue; }
  o=$(chay_ca "$GOC" "$t"); p=$(dem "$o" pass); f=$(dem "$o" fail); hu=$(dem "$o" cancelled); p=${p:-0}; f=${f:-1}; hu=${hu:-0}
  [ "$f" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -3 | sed 's/^/   ↳ /'
  if [ "$f" -eq 0 ] && [ "$p" -ge 1 ]; then dat "$t pass=$p fail=0 huỷ=$hu"
  elif [ "$f" -eq 0 ] && [ "$p" -eq 0 ] && [ "$hu" -gt 0 ]; then dat "$t pass=0 fail=0 huỷ=$hu (huỷ SẴN ở base — tự bỏ qua khi thiếu dữ liệu thật)"
  else truot "$t pass=$p fail=$f"; fi
done

# ═══ ⑦ CỔNG CŨ ④7 (rc TÁCH DÒNG): rp1 · gl3b · gl4 · bh7 — ĐỎ thì so DANH SÁCH dòng đỏ với base ════════════════════════════════
# rp1.sh chạy với BO_CONG_CU=1 (⑥ của nó = gl4 · gl3b · gl3 — gl4/gl3b chạy riêng ngay dưới, gl3 nằm trong ⑥ của gl3b); gl3b · gl4
# chạy TRỌN (không CHAY_SO_BASE ⇒ gl3b KHÔNG kéo gsp3b.sh — lệnh tổng: không chạy gsp1/gsp3b). bh7.sh đỏ SẴN ở base (phép ④
# «luật-tin-ngắn-trong-CORE») — phiếu ④7: «SO VỚI BASE, không thêm dòng đỏ».
muc "⑦ cổng cũ (rc tách dòng)"
if [ "${BO_CONG_CU:-0}" = 1 ]; then
  echo "   cổng cũ: BỎ theo BO_CONG_CU=1 — lượt này KHÔNG phải lượt nghiệm thu (không tính vào PHÉP/LỖI)"
else
  SHIM="$TAM/shim"; mkdir -p "$SHIM"; printf '#!/bin/sh\nexec grep -E "$@"\n' > "$SHIM/rg"; chmod +x "$SHIM/rg"
  PATH_CON="$PATH"; command -v rg >/dev/null 2>&1 || PATH_CON="$SHIM:$PATH"
  chuan_do() { grep -E "✘|🔴|❌" | sed -E 's/[0-9]{4,}//g; s/p[0-9]+//g; s/[0-9]+(\.[0-9]+)?ms//g; s/[0-9]+s$//' | sort; }
  TRAN_CON="${TRAN_CON:-2700}"
  chay_con() {
    local tep=$1 bo=$2 out; out=$(mktemp)
    set -m; env -u CHAY_NPM_TEST -u CHAY_SO_BASE PATH="$PATH_CON" BO_CONG_CU="$bo" bash "$tep" > "$out" 2>&1 & local pid=$!; set +m
    local t=0
    while kill -0 "$pid" 2>/dev/null; do
      sleep 5; t=$((t+5))
      if [ "$t" -ge "$TRAN_CON" ]; then kill -KILL -- "-$pid" 2>/dev/null; wait "$pid" 2>/dev/null; cat "$out"; rm -f "$out"; return 124; fi
    done
    wait "$pid"; local rc=$?; cat "$out"; rm -f "$out"; return "$rc"
  }
  for g in rp1 gl3b gl4 bh7; do
    bo=0; [ "$g" = rp1 ] && bo=1
    t0=$(date +%s); _o=$(chay_con "ops/bin/nghiem-thu/$g.sh" "$bo"); _r=$?; t1=$(date +%s)
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
    _cu=$( (cd "$WT_BASE" 2>/dev/null && chay_con "ops/bin/nghiem-thu/$g.sh" "$bo") | chuan_do)
    _them=$(comm -13 <(echo "$_cu") <(echo "$_moi") | grep -c .)
    if [ -n "$_cu" ] && [ "$_them" -eq 0 ]; then
      dat "cổng cũ $g rc=$_r — ĐỎ SẴN ở $BASE: $(echo "$_moi" | grep -c .) dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ cũ, không do RP2)"
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

echo; echo "PHÉP=$PHEP LỖI=$LOI · môi trường: máy dev, hộp cát aicloser_v3_test_rp2*_p<pid>, Pancake/model giả"
exit $((LOI > 0))
