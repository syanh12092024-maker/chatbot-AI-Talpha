#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU BH9 — bộ não pilot: cổng sau bán (câu cố định + giao sale) · bốn luật cửa ra mới · COD ngầm + tên Facebook (cờ
# đơn nháp tới Hộp thư) · một luật tên · dấu hiệu y tế. Thi hành ④1–④11 của docs/thi-cong/phieu/PHIEU-BH9.md. rc=0 là đạt.
# LUẬT: mỗi phép in MỘT CON SỐ hoặc MỘT BẢNG ĐẾM. Không dòng nào chỉ nói "chạy xong không lỗi".
#
# Tầm đo: lưới HỒI QUY (luật 32) do chính thợ viết, trên MÁY DEV — không đo prod, không đo `aicloser_v3`. Hộp cát Postgres riêng mỗi
# tệp ca (`db/sandbox.js`, hậu tố `_p<pid>`, tự dựng tự dọn). KHÔNG mạng, KHÔNG model: cửa gửi + `chayCloser` TIÊM. ④9 (M6) đọc hai CSDL
# giả lập dev `aicloser_gialap_pilot` · `aicloser_gialap_2` CHỈ ĐỌC (`default_transaction_read_only=on`) — ngữ cảnh từng lượt PHỎNG DỰNG
# (lịch sử Pancake đã mất; xem đầu `test/bh9-phat-lai.test.mjs`) ⇒ số của ④9 là số có điều kiện. «Giống base» đo bằng bản base THẬT
# (`git archive a6f670d src`). Đảo-vá trên BẢN SAO TẠM, mỗi đột biến một tiến trình node mới (bẫy 15). Chỉ `grep -E`.
# Cờ: GIU_TAM=1 giữ bản sao · BO_DAO_VA=1 bỏ ⑩ · CHAY_CONG_CU=1 chạy năm cổng cũ ở ⑪ (mặc định HOÃN — dài) · CHAY_NPM_TEST=1 chạy npm test.
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "$@" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+' | head -1; }
xanh_ten() { echo "$1" | grep -E "^\s*✔ BH9 [A-Za-z0-9]+ ·" | sed -E 's/^\s*✔ BH9 ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
do_ten() { echo "$1" | grep -E "^\s*✖ (BH9 )?[A-Za-z0-9]+ ·" | sed -E 's/^\s*✖ (BH9 )?([A-Za-z0-9]+) ·.*/\2/' | sort -u | tr '\n' ' '; }
do_ten_chung() { echo "$1" | grep -E "^\s*✖ " | grep -v "failing tests" | sed -E 's/^\s*✖ //; s/ \([0-9.]+ms\)$//' | cut -c1-50 | sort -u | tr '\n' '|'; }
BASE=a6f670d
DB="aicloser_v3_nt_bh9_p$$"   # khai theo khuôn; mỗi tệp ca tự dựng hộp cát riêng (aicloser_v3_test_bh9{w,m}_p<pid>)
if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/[[:space:]]*#.*$//;s/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát"; exit 2; }
noi=$(node -e 'const u=new URL(process.env.DATABASE_URL_V3);console.log(`${u.hostname}:${u.port||5432}`)' 2>/dev/null || echo "?")
echo "── môi trường: máy dev · hộp cát Postgres trên $noi (aicloser_v3_test_bh9*_p<pid>) + CSDL giả lập CHỈ ĐỌC · cây $GOC · $(git rev-parse --short HEAD 2>/dev/null || echo '?') · node $(node -v)"
CA_T=test/bh9-ham-thuan.test.mjs; CA_W=test/bh9-luot-worker.test.mjs; CA_M=test/bh9-hang-cho-man.test.mjs; CA_R=test/bh9-phat-lai.test.mjs

# ⓪ luật 1 §0a: máy này vẫn CHỈ ĐỌC
ro=$(grep -E '^PANCAKE_READONLY=' .env 2>/dev/null | tail -1 | cut -d= -f2 | sed 's/[[:space:]]*#.*$//')
[ "$ro" = "1" ]; ket "⓪.env-PANCAKE_READONLY=1" $? "đọc được: '${ro:-vắng}'"

# ①–⑨ — mỗi tệp ca chạy MỘT lần; mỗi phép đọc bảng tên XANH của nó (thước SÀN: mọi tên đòi phải xanh, tệp fail=0)
O_T=$(chay "$CA_T"); O_W=$(chay "$CA_W"); O_M=$(chay "$CA_M"); O_R=$(chay "$CA_R"); O_C=$(chay test/context.test.mjs)
tep() { # tep <nhãn> <output>
  local f p k; f=$(so "$2" fail); p=$(so "$2" pass); k=$(so "$2" skipped); f=${f:-1}
  [ "$f" -eq 0 ] && [ "${p:-0}" -gt 0 ]; ket "$1" $? "pass=${p:-?} fail=$f skipped=${k:-?}"
  [ "$f" -ne 0 ] && echo "$2" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
}
nhom() { # nhom <nhãn> <output> <các tên phải xanh>
  local co t thieu=""; co=" $(xanh_ten "$2") "
  for t in $3; do echo "$co" | grep -qF " $t " || thieu="$thieu$t "; done
  local doi=$(echo "$3" | wc -w | tr -d ' ') thieu_n=$(echo "$thieu" | wc -w | tr -d ' ')
  [ -z "$thieu" ]; ket "$1" $? "xanh $((doi - thieu_n))/$doi đòi${thieu:+ · THIẾU: $thieu}"
}
tep "tệp-ca-hàm-thuần" "$O_T"; tep "tệp-ca-worker" "$O_W"; tep "tệp-ca-hàng-chờ-màn" "$O_M"; tep "tệp-ca-phát-lại" "$O_R"; tep "test/context.test.mjs" "$O_C"
nhom "①tên-(tachTen·name·hasName-một-bảng)" "$O_T" "T01 T02 T03 T04 T05 T06 T07 T08 T09 T10 T11 T12 T13 T14 T15 T16 T17 T18 T19 T20 T21 T22 T23 T24 T25 TH TS"
echo "$O_T" | grep -E "^\s*✔ BH9 T[0-9]+ ·" | wc -l | sed 's/^ */   · số dòng bảng tên xanh: /'
nhom "②bộ-dò-đơn-page·khách·laCauSauBan·bocDonTuLichSu" "$O_T" "DP DA DO DQ DR DK DN LS DB"
nhom "③COD·lastAi·codNgam·[S10]·gói" "$O_T" "K1 K2 K3 K4 K5 K6"
nhom "④cửa-ra-bốn-luật-mới-+-bảo-toàn-luật-cũ-so-base" "$O_T" "G01 G02 G03 G04 G05 G06 G07 G08 G09 G10 G11 G12 G13 G14 G15 G16 G17 G18 G19 G20 G21 G22 G23 G24 G25 G26 G27 G28 G29 G30 G31 G32 G33 G34 G35 G36 G37 G38 G39 G40 G41 G42 G43 G44 G45 G46 G47 G48 GL GS GC GF GK"
echo "$O_T" | grep -E "\[bh9t\] GC:" | sed 's/^ */   · /'
nhom "⑤y-tế" "$O_T" "Y1 Y2 Y3"
nhom "⑥khối-hồ-sơ-(+bản-chụp-không-kích-hoạt-giống-base)" "$O_T" "H1 H2 H3 H4 H5"
c_co=" $(echo "$O_C" | grep -E "^\s*✔ C[0-9]+ ·" | sed -E 's/^\s*✔ (C[0-9]+) ·.*/\1/' | tr '\n' ' ') "; thieu=""
for t in C11 C30 C31 C39; do echo "$c_co" | grep -qF " $t " || thieu="$thieu$t "; done
[ -z "$thieu" ]; ket "⑥b-context.test-C11·C30·C31·C39-xanh" $? "${thieu:+THIẾU: $thieu}"
nhom "⑦handler-qua-chayMotVong-(4a·câu-cố-định·captureOrder·y-tế·COD-ngầm·≤1·luật-2·[S4])" "$O_W" "Wa Wa2 Wa3 Wb Wc Wd1 Wd2 We Wf1 Wf2 Wg1 Wg2 Wg3 Wg4 Wg5 Wh1 Wh2 Wi Wj Wk"
nhom "⑧hàng-chờ·luuDonCho·Hộp-thư·Vận-hành" "$O_M" "M1 M2 M3 M4 M5"
nhom "⑨M6-phát-lại-trên-giả-lập" "$O_R" "Ra Rb Rc Rd Re Rf"
k=$(so "$O_R" skipped); [ "${k:-1}" -eq 0 ]; ket "⑨b-M6-CHẠY-THẬT-(không-HOÃN)" $? "skipped=${k:-?} (máy không có CSDL giả lập ⇒ đỏ ở cổng, HOÃN ở npm test)"
echo "$O_R" | grep -E "\[bh9r\]" | sed 's/^ */   · /' | cut -c1-330

# ⑩ ĐẢO-VÁ (④10) trên BẢN SAO TẠM — mỗi đột biến một tiến trình node mới. Luật đọc: các ca khai PHẢI nằm trong tập đỏ.
if [ "${BO_DAO_VA:-0}" != 1 ]; then
T=$(mktemp -d "${TMPDIR:-/tmp}/bh9.XXXXXX"); [ "${GIU_TAM:-0}" = 1 ] && echo "GIU_TAM=1 — giữ $T" || trap 'rm -rf "$T"' EXIT
mkdir -p "$T/test" "$T/base"
git archive "$BASE" src | tar -x -C "$T/base"; cp package.json "$T/base/"; ln -s "$GOC/node_modules" "$T/base/node_modules"
export BH9_BASE_SRC="$T/base"
chep() { rm -rf "$T/src" "$T/db" "$T/v3"; mkdir -p "$T/v3"; cp -R src "$T/src"; cp -R db "$T/db"; cp -R v3/src "$T/v3/src"; cp -R v3/testkit "$T/v3/testkit"; }
chep; cp test/_an-toan.mjs test/_bat-cua-de-do.mjs "$CA_T" "$CA_W" "$CA_M" "$CA_R" test/context.test.mjs \
  test/guard-fastlane.test.mjs test/guard-localfix.test.mjs test/cua-ra-sua-tai-cho.test.js "$T/test/"
cp package.json "$T/"; ln -s "$GOC/node_modules" "$T/node_modules"; [ -f .env ] && ln -s "$GOC/.env" "$T/.env"
dot() { (cd "$T" && node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "$@" 2>&1); }
dot_bien() { # dot_bien <tên đột biến> — mỗi chuỗi gốc phải khớp ĐÚNG MỘT lần
  python3 - "$T" "$1" <<'PY'
import os, sys
T, ten = sys.argv[1], sys.argv[2]
LS, CX, OG, OM, H, HC, HT = "src/lead-score.js", "src/context.js", "src/outbound-guard.js", "src/our-messages.js", "src/chat/handler-v3.js", "src/orders/hang-cho.js", "v3/src/ui/hop-thu/trang/hop-thu-ui.js"
KHACH_CU = """const KHACH_NOI_VE_DON = [
  ['khách KHÔNG muốn nhận nữa', /\\b(?:i\\s+d(?:o\\s+not|on'?t)\\s+want|don'?t\\s+want)\\b[^.\\n]{0,24}\\b(?:this\\s+)?(?:order|item|product|delivery|parcel)\\b|\\bcancel\\s+(?:my|the)\\s+order\\b|\\bhindi\\s+ko\\s+na\\s+kukunin\\b/i],
  ['khách đang hỏi về chuyến giao', /\\bthe\\s+(?:delivery|order|parcel|package|courier|rider)\\b[^.\\n]{0,40}\\b(?:was|is|has|scheduled|today|tomorrow|call(?:ed)?|came|arriv\\w*)\\b|\\bdelivery\\s+(?:boy|guy|man|person|staff)\\b/i],
  ['khách nói ĐƠN CŨ chưa xong', /\\b(?:my|the)\\s+order\\b[^.\\n]{0,30}\\b(?:not|haven'?t|hasn'?t|still|delay\\w*|late)\\b|\\bwala\\s+pa\\b[^.\\n]{0,20}\\border\\b|\\b(?:fifteen|[0-9]{1,2})\\s+days?\\b[^.\\n]{0,24}\\b(?:order|deliver\\w*|waiting)\\b/i],
];"""
GATE_4A = ("    // ── 4a · CỔNG SAU BÁN", "    // ── 4b · LỚP TỪ-KHOÁ", "    // ── 6 · PHÂN LOẠI")
KHOI_BH9 = """  if (ctx.luatBH9 === true) {
    const v = luatBH9(t, ctx, kbText);
    if (v) return rewrite(v.rule, v.reason);
  }
"""
BANG = {
  "ten-cu": [(LS, "  // ① nhãn RÕ\n", "  { const cu = s.match(/(?:my name is|my name's|i am|i'?m|this is|ako si|ako po si|pangalan ko(?: po)?(?: ay)?|name\\s*[:=-]|pangalan\\s*[:=-]|اسمي|الاسم\\s*[:=-])\\s*([\\p{L}][\\p{L}\\s.'-]{1,40})/iu); if (cu) return cu[1].trim().replace(/\\s+/g, ' ').slice(0, 40); }\n  // ① nhãn RÕ\n"),
             (LS, "  if (t.length < 4 || t.length > 40 || /\\d/.test(t) || laDiaChi(t)) return false;", "  return t.length >= 4 && t.length <= 40 && !/\\d/.test(t) && /^[\\p{L}][\\p{L}.'-]+(?:\\s+[\\p{L}][\\p{L}.'-]+){1,3}$/u.test(t);")],
  "bo-loc-dia-danh": [(LS, " || /\\d/.test(t) || laDiaChi(t)) return false;", " || /\\d/.test(t)) return false;")],
  "bo-tach-duoi": [(LS, "    if (m && laDongTen(m[1])) return m[1].trim().replace(/\\s+/g, ' ');", "")],
  "hasname-rieng": [(LS, "  return !!tachTen(text);", "  return /(?:my name is|i am|i'?m|this is|ako si)\\s*[\\p{L}]/iu.test(String(text || '')) || !!tachTen(text);")],
  "don-cu": [(CX, "const KHUON_MOI = [", "const KHUON_MOI = [];\nconst KHUON_MOI_TAT = ["), ("re", CX, r"const KHACH_NOI_VE_DON = \[[\s\S]*?\n\];", KHACH_CU)],
  "suy-ordernoted": [(CX, "    const d = donTuTinPage(raw);\n    if (d) prof.donDaCo = d;\n  }\n  return prof;",
                      "    const d = donTuTinPage(raw);\n    if (d) prof.donDaCo = d;\n  }\n  if (!prof.donDaCo && prof.otherBot?.orderNoted) prof.donDaCo = { trangThai: 'đã tạo', cau: '', nguon: 'page' };\n  return prof;")],
  "hai-ban-luat": [(CX, "  if (prof) bocDonTuLichSu(msgs, pageId, prof);\n", "")],
  "bo-cong-4a": [(H, "    if (sauBan.la && !yTe) {", "    if (false && sauBan.la && !yTe) {")],
  "cong-sau-fast-lane": [("move", H) + GATE_4A],
  "bo-chan-capture": [(H, '        if (prof.donDaCo?.nguon === "page") {', "        if (false) {")],
  "bo-y-te": [(OG, "  if (ctx.dauHieuYTe) {", "  if (false) {")],
  "bo-bia": [(OG, "  if (!ctx.orderCreated) {", "  if (false) {")],
  "bo-tu-hua": [(OG, "  if (hua) return { rule: 'TU_HUA'", "  if (false) return { rule: 'TU_HUA'")],
  "bo-ban-lai": [(OG, "  if (ctx.donDaCo && !ctx.isOrderSummary) {", "  if (false) {")],
  "luat-moi-truoc": [(OG, KHOI_BH9, ""), (OG, "  // ── Luật 8 · ký tự vô hình", KHOI_BH9 + "  // ── Luật 8 · ký tự vô hình")],
  "duong-cu-im": [(H, "    const cauCoDinhMa = !guarded && cuaRaChan", "    const cauCoDinhMa = false && !guarded && cuaRaChan")],
  "bo-da-ban-giao": [(OG, "(!ctx.daBanGiao && !ctx.isOrderSummary &&", "(!ctx.isOrderSummary &&")],
  "bo-mien-kb": [(OG, "    if (kb.includes(m[0].toLowerCase())) continue;\n", "")],
  "cod-ok-cu": [(CX, "    || s.split(/[\\n;]+/).some((dong) => COD_TU_NOI.test(dong.trim()))\n", "")],
  "bo-last-ai": [(CX, "\n    || (HOI_COD.test(String(lastAi || '')) && DONG_Y_NGAN.test(s.trim()));", ";")],
  "bo-cod-ngam": [(CX, "  if (prof.cod || prof.codTuChoi || !prof.phone || !prof.address) return false;", "  return false;")],
  "cod-tin-khach": [(CX, ".some((m) => String(m?.from?.id) === String(pageId)\n", ".some((m) => true\n")],
  "bo-phu-dinh-yte": [(CX, "      if (PHU_DINH_YTE.test(truoc)) continue;", "      void 0;")],
  "bo-b-rash": [(CX, "new RegExp(`\\\\brash\\\\b|", "new RegExp(`rash|")],
  "bo-co-ten-fb": [(HC, "    else if (tuTen.every((w) => tuFb.has(w))) d.ten_tu_facebook = true;\n", "")],
  "giu-nhanh-cu": [(CX, "    if (re.test(t)) return laHoiTruocBan(t, trangThai) ? null :", "    if (re.test(t)) return false ? null :")],
  "bo-s2": [(CX, "        if (sauDieuKien(t, m.index, moi)) continue;\n", ""), (CX, "        if (moi && quyTrinhSau(t, m.index + m[0].length)) continue;\n", ""),
            (CX, "        if (moi && trangThai === 'đã tạo' && (!VE_DA_CHOT.test(t) || CON_CHAO_MUA.test(t))) continue;   // (iii)\n", ""),
            (CX, "\\btracking\\s*(?:number|no\\.?|#)?\\s*[:#]?\\s*\\d{4,}", "\\btracking\\s*(?:number|no\\.?|#)?")],
  "capture-ca-khach": [(H, '        if (prof.donDaCo?.nguon === "page") {', "        if (prof.donDaCo) {")],
  "vao-fixed": [(OM, "const fixed = new Set([...HOLDING_MESSAGES,", "const fixed = new Set([CAU_NHAN_BAN_GIAO.en, CAU_Y_TE.en, ...HOLDING_MESSAGES,")],
  "xa-anh-false": [(H, "      boHangAnh();   // [S5]", "      void 0;   // [S5]"), (H, "    const nAnh = await xaAnh(!!guarded);", "    const nAnh = await xaAnh(cauCoDinhMa ? false : !!guarded);")],
  "dung-o-reply": [(H, '        maModel: KHONG_GOI_MODEL, lane: "cau_co_dinh", trangThai: hoiThoai.trang_thai, lyDo: state.handoffReason,',
                    '        maModel: KHONG_GOI_MODEL, lane: "cau_co_dinh", trangThai: hoiThoai.trang_thai, lyDo: state.handoffReason, dung,')],
  "bo-co-luat-bh9": [(OG, "  if (ctx.luatBH9 === true) {", "  if (true) {")],
  "bo-mien-tom-tat": [(OG, "...(ctx.isOrderSummary ? [] : [XAC_NHAN_DON])", "XAC_NHAN_DON"), (OG, "(!ctx.daBanGiao && !ctx.isOrderSummary &&", "(!ctx.daBanGiao &&")],
  "bo-sau-khi-dung": [(CX, "    if (loai === 'kích ứng sau khi dùng' && !SAU_KHI_DUNG.test(t)) continue;\n", "")],
  "ar-chuoi-tron": [(CX, "const AR = (s) => `(?<!\\\\p{L})(?:ال|بال|وال|لل|و|ب)?(?:${s})(?!\\\\p{L})`;", "const AR = (s) => `(?:${s})`;")],
  "ar-b": [(CX, "const AR = (s) => `(?<!\\\\p{L})(?:ال|بال|وال|لل|و|ب)?(?:${s})(?!\\\\p{L})`;", "const AR = (s) => `\\\\b(?:${s})\\\\b`;")],
  "bo-nhuong-yte": [(H, "    const tk = yTe\n", "    const tk = false\n"), (H, "    const fl = yTe\n", "    const fl = false\n")],
  "bo-loc-cod-phu-dinh": [(CX, "const neuCodThat = (t) => NEU_COD.test(t) && !COD_KHONG.test(t) && !COD_PHU_DINH.test(t);", "const neuCodThat = (t) => NEU_COD.test(t);")],
  "bo-tien-to": [(CX, "        ? `Bước còn thiếu: ĐÃ CÓ SĐT, địa chỉ", "        ? `ĐÃ CÓ SĐT, địa chỉ")],
  "bo-canh-hop-thu": [(HT, "  const canhCoDon = (du) => CO_DON.filter(", "  const canhCoDon = (du) => \"\" || CO_DON.slice(0, 0).filter(")],
  # — chỗ /code-review BH9 vừa sửa (bẫy 26) —
  "cr1-cau-y-te-theo-luat": [(H, "guarded = cauCoDinh(yTe ? CAU_Y_TE : CAU_NHAN_BAN_GIAO);", "guarded = cauCoDinh(cuaRaChan.rule === \"Y_TE\" ? CAU_Y_TE : CAU_NHAN_BAN_GIAO);")],
  "cr1-yte-ban-giao-sau-cua": [(H, "    if (yTe && !state.handoff) {\n      state.handoff = true;\n      state.handoffReason = `Y TẾ · khách báo ${yTe}`;\n    }\n    const guarded0", "    const guarded0")],
  "cr2-bo-cau-dang-mua": [(CX, "  /\\bi\\s+(?:want|wanna|would\\s+like)\\b|", "  /\\bi_khong_khop_\\b|")],
  "cr3-hoi-xin-dia-chi": [(OG, "const HUA_TEAM_CO = /(?<!\\b(?:can|could|may|would|shall|do|did)\\s+)", "const HUA_TEAM_CO = /")],
  "cr4-handoff-truoc-gui": [(H, "    boHangAnh();\n    await guiChu(cau);\n    state.handoff = true;\n    state.handoffReason = lyDo;\n", "    boHangAnh();\n    state.handoff = true;\n    state.handoffReason = lyDo;\n    await guiChu(cau);\n")],
  "cr5-bia-cu": [(OG, "|will|would|usually|normally|typically|can|could|should|send|provide)\\b/i;", ")\\b/i;"),
                 (OG, "        if (sauDieuKien(t, m.index) || quyTrinhSau(t, m.index + m[0].length)) continue;", "        if (sauDieuKien(t, m.index)) continue;")],
  "cr6-khuon-page-rong": [(CX, "/\\byour\\s+(?:order|parcel|package|item)\\b[^.!?\\n]{0,40}?\\b(?:is|was|has\\s+been)\\s+(?:now\\s+)?(?:scheduled|set)\\s+for", "/\\b(?:scheduled|set)\\s+for")],
  "cr7-dk-ca-cau-khuon-cu": [(CX, "  const ve = t.slice(dauDoan(t, idx, ['.', '!', '?', '\\n', ',', ';']), idx);", "  const ve = t.slice(dauDoan(t, idx, ['.', '!', '?', '\\n']), idx);")],
  "cr8-bo-cod-tu-choi": [(CX, "  if (prof.cod || prof.codTuChoi || !prof.phone || !prof.address) return false;", "  if (prof.cod || !prof.phone || !prof.address) return false;")],
  "cr9-gamitin-tron": [(CX, "|\\bafter\\s+(?:ko\\s+)?(?:gamitin|ilagay)\\b|", "|\\bgamitin\\b|")],
  "cr10-linggo": [(OG, "|biyernes|sabado)\\\\b'", "|biyernes|sabado|linggo)\\\\b'")],
  "cr11-cod-khong-cu": [(CX, "const COD_KHONG = /(?<!\\p{L})(?:no|not|don'?t|dont|hindi|ayaw|không)(?![\\p{L}']).{0,35}\\bcod\\b|\\bcod\\b.{0,25}(?<!\\p{L})(?:not|cancel|không)/iu;",
                          "const COD_KHONG = /(?:no|not|don't|dont|hindi|ayaw|không).{0,35}\\bcod\\b|\\bcod\\b.{0,25}(?:not|cancel|không)/i;")],
  "cr12-ar-khong-tien-to": [(CX, "const AR = (s) => `(?<!\\\\p{L})(?:ال|بال|وال|لل|و|ب)?(?:${s})(?!\\\\p{L})`;", "const AR = (s) => `(?<!\\\\p{L})(?:${s})(?!\\\\p{L})`;"),
                            (OG, "(?<!\\p{L})(?:ال|بال|وال|لل|و|ب)?(?:طبيب|مستشفى|توقف|توقفي)(?!\\p{L})", "(?<!\\p{L})(?:طبيب|مستشفى|توقف|توقفي)(?!\\p{L})")],
  "cr13-bo-yet": [(CX, "|didn'?t|yet\\s+to)(?:\\s+yet)?\\s+)", "|didn'?t|yet\\s+to)\\s+)")],
  "cr14-ten-hai-cham": [(LS, "الاسم\\s*[:=-])\\s*[:=-]?\\s*/iu;", "الاسم\\s*[:=-])\\s*/iu;"),
                        (LS, " && !/^\\p{Lu}{2,5}$/u.test(w)", "")],
  "cr15-co-don-da-duyet": [(HT, "    if (choDuyet && canhCoDon(du)) canh.push(canhCoDon(du));", "    if (canhCoDon(du)) canh.push(canhCoDon(du));")],
}
import re as _re
for e in BANG[ten]:
    if e[0] == "move":
        _, tep, a, b, dich = e
        p = os.path.join(T, tep); s = open(p).read()
        assert s.count(a) == 1 and s.count(b) == 1 and s.count(dich) == 1, f"{tep}: mốc move không duy nhất"
        i, j = s.index(a), s.index(b); khoi = s[i:j]; s = s[:i] + s[j:]
        k = s.index(dich); s = s[:k] + khoi + s[k:]
        open(p, "w").write(s); continue
    if e[0] == "re":
        _, tep, pat, repl = e
        p = os.path.join(T, tep); s = open(p).read()
        assert len(_re.findall(pat, s)) == 1, f"{tep}: regex mốc khớp {len(_re.findall(pat, s))} lần"
        open(p, "w").write(_re.sub(pat, lambda m: repl, s)); continue
    tep, a, b = e
    p = os.path.join(T, tep); s = open(p).read()
    assert s.count(a) == 1, f"{tep}: chuỗi gốc xuất hiện {s.count(a)} lần: {a[:70]!r}"
    open(p, "w").write(s.replace(a, b))
PY
}
dao() { # dao <nhãn> <các ca phải ĐỎ> <mẫu tên> <tên đột biến> <tệp ca…>
  local nhan="$1" phai="$2" mau="$3" ten="$4"; shift 4
  chep
  if ! dot_bien "$ten"; then ket "$nhan" 1 "đột biến không áp được (chuỗi gốc đổi?)"; return; fi
  local o r t thieu=""; o=$(dot --test-name-pattern="$mau" "$@"); r=$(do_ten "$o")
  for t in $phai; do echo " $r " | grep -qF " $t " || thieu="$thieu$t "; done
  [ -z "$thieu" ]; ket "$nhan" $? "đỏ: ${r:-không} (đòi đỏ: $phai)"
}
tT="test/$(basename "$CA_T")"; tW="test/$(basename "$CA_W")"; tM="test/$(basename "$CA_M")"; tR="test/$(basename "$CA_R")"
# — danh sách ④10 của phiếu —
dao "⑩a-trả-NAME_LABEL/NAME_LINE-cũ" "T01 T03 T04 T06 T07 T08 T09 T10 T12 T14" "BH9 T[0-9]+ ·" "ten-cu" "$tT"
dao "⑩b-bỏ-lọc-địa-danh" "T02 T05" "BH9 T[0-9]+ ·" "bo-loc-dia-danh" "$tT"
dao "⑩c-bỏ-tách-đuôi-sau-SĐT" "T13" "BH9 T13 ·" "bo-tach-duoi" "$tT"
dao "⑩d-hasName-giữ-regex-riêng" "TH" "BH9 TH ·" "hasname-rieng" "$tT"
dao "⑩e-trả-DON_TRANG_THAI/KHACH_NOI_VE_DON-cũ" "DP DK" "BH9 D[PK] ·" "don-cu" "$tT"
dao "⑩f-suy-donDaCo-từ-orderNoted" "DO" "BH9 DO ·" "suy-ordernoted" "$tT"
dao "⑩g-cleanHistory-không-gọi-bocDonTuLichSu" "DB" "BH9 DB ·" "hai-ban-luat" "$tT"
dao "⑩h-bỏ-cổng-4a" "Wa Wa2" "BH9 Wa2? ·" "bo-cong-4a" "$tW"
dao "⑩i-đặt-cổng-SAU-Fast-Lane/lớp-từ-khoá" "Wa2" "BH9 Wa2 ·" "cong-sau-fast-lane" "$tW"
dao "⑩j-bỏ-chặn-captureOrder" "Wf1" "BH9 Wf1 ·" "bo-chan-capture" "$tW"
dao "⑩k1-bỏ-luật-Y_TE" "G19 G21" "BH9 G(19|21) ·" "bo-y-te" "$tT"
dao "⑩k2-bỏ-luật-BIA_TRANG_THAI_DON" "G01 G02 G03 G04 G29 G36" "BH9 G(01|02|03|04|29|36) ·" "bo-bia" "$tT"
dao "⑩k3-bỏ-luật-TU_HUA" "G05 G10 G11 G13 G27 G31" "BH9 G(05|10|11|13|27|31) ·" "bo-tu-hua" "$tT"
dao "⑩k4-bỏ-luật-BAN_LAI_SAU_BAN" "G15 G17" "BH9 G(15|17) ·" "bo-ban-lai" "$tT"
dao "⑩l-luật-mới-TRƯỚC-luật-cũ" "GC Ra" "BH9 (GC|Ra) ·" "luat-moi-truoc" "$tT" "$tR"
dao "⑩m-luật-mới-đi-đường-cũ-(im)" "Wd1 Wd2" "BH9 Wd[12] ·" "duong-cu-im" "$tW"
dao "⑩n-bỏ-daBanGiao" "G12 G35" "BH9 G(12|35) ·" "bo-da-ban-giao" "$tT"
dao "⑩o-bỏ-miễn-KB" "G26" "BH9 G26 ·" "bo-mien-kb" "$tT"
dao "⑩p1-trả-COD_OK-cũ" "K1" "BH9 K1 ·" "cod-ok-cu" "$tT"
dao "⑩p2-bỏ-lastAi" "K2" "BH9 K2 ·" "bo-last-ai" "$tT"
dao "⑩p3-bỏ-codNgam" "K3 Wh1 Wh2" "BH9 (K3|Wh[12]) ·" "bo-cod-ngam" "$tT" "$tW"
dao "⑩q-codNgam-tính-cả-tin-khách" "K3" "BH9 K3 ·" "cod-tin-khach" "$tT"
dao "⑩r-bỏ-phủ-định-y-tế" "Y2" "BH9 Y2 ·" "bo-phu-dinh-yte" "$tT"
dao "⑩s-bỏ-\\b-của-rash" "Y2" "BH9 Y2 ·" "bo-b-rash" "$tT"
dao "⑩t-bỏ-cờ-ten_tu_facebook" "Wh1 M1" "BH9 (Wh1|M1) ·" "bo-co-ten-fb" "$tW" "$tM"
# — soát (a) thêm —
dao "⑩u-giữ-nhánh-1–3-cũ-KHACH_NOI_VE_DON-[S1]" "DN" "BH9 DN ·" "giu-nhanh-cu" "$tT"
dao "⑩v-bỏ-(i)(ii)(iii)-[S2]" "DA" "BH9 (DA|Rf) ·" "bo-s2" "$tT" "$tR"
dao "⑩w-captureOrder-chặn-cả-nguồn-khách" "Wf2" "BH9 Wf2 ·" "capture-ca-khach" "$tW"
dao "⑩x-câu-cố-định-vào-fixed-[S4]" "Wk" "BH9 Wk ·" "vao-fixed" "$tW"
dao "⑩y-xaAnh(false)-thay-bỏ-hàng-[S5]" "Wd1" "BH9 Wd[12] ·" "xa-anh-false" "$tW"
dao "⑩z-dung-ở-dòng-reply-câu-cố-định-[S6]" "Wd1 Wd2" "BH9 Wd[12] ·" "dung-o-reply" "$tW"
dao "⑩A-bỏ-cờ-luatBH9-[S7]" "GS" "BH9 GS ·" "bo-co-luat-bh9" "$tT"
dao "⑩B-bỏ-miễn-isOrderSummary-[S8]" "G28 G30" "BH9 G(28|30) ·" "bo-mien-tom-tat" "$tT"
dao "⑩C-bỏ-điều-kiện-«sau-khi-dùng»-[S9]" "Y3" "BH9 Y3 ·" "bo-sau-khi-dung" "$tT"
dao "⑩D1-rào-Ả-Rập-bằng-chuỗi-trơn" "Y3" "BH9 Y3 ·" "ar-chuoi-tron" "$tT"
dao "⑩D2-rào-Ả-Rập-bằng-\\b" "Y1" "BH9 Y1 ·" "ar-b" "$tT"
dao "⑩E-bỏ-nhường-model-khi-y-tế-[S9]" "Wg3" "BH9 Wg3 ·" "bo-nhuong-yte" "$tW"
dao "⑩F-bỏ-lọc-COD-phủ-định-ở-tin-page-[S10]" "K4" "BH9 K4 ·" "bo-loc-cod-phu-dinh" "$tT"
dao "⑩G-bỏ-tiền-tố-«Bước-còn-thiếu:-»-[S11]" "C11 H2" "(C11|BH9 H2) ·" "bo-tien-to" "test/context.test.mjs" "$tT"
dao "⑩H-bỏ-cảnh-báo-ở-Hộp-thư-[S3]" "M3" "BH9 M3 ·" "bo-canh-hop-thu" "$tM"
# — chỗ /code-review BH9 vừa sửa (bẫy 26: bản vá cũng là code mới) —
dao "⑩cr1a-câu-thay-theo-LUẬT-thay-vì-theo-lượt-y-tế" "Wg5" "BH9 Wg5 ·" "cr1-cau-y-te-theo-luat" "$tW"
dao "⑩cr1b-bàn-giao-y-tế-SAU-cửa-ra" "Wg4" "BH9 Wg4 ·" "cr1-yte-ban-giao-sau-cua" "$tW"
dao "⑩cr2-bỏ-dấu-câu-đang-muốn-mua" "DN" "BH9 DN ·" "cr2-bo-cau-dang-mua" "$tT"
dao "⑩cr3-HUA_TEAM_CO-bắt-câu-hỏi-xin-địa-chỉ" "G48" "BH9 G(38|48) ·" "cr3-hoi-xin-dia-chi" "$tT"
dao "⑩cr4-đặt-handoff-TRƯỚC-gửi-câu-cố-định" "Wa3" "BH9 Wa3 ·" "cr4-handoff-truoc-gui" "$tW"
dao "⑩cr5-BIA-bỏ-tương-lai/quy-trình" "G39 G41 G43" "BH9 G(39|41|43) ·" "cr5-bia-cu" "$tT"
dao "⑩cr6-khuôn-page-không-cần-chủ-ngữ" "DA" "BH9 DA ·" "cr6-khuon-page-rong" "$tT"
dao "⑩cr7-khuôn-cũ-xét-điều-kiện-cả-câu" "DQ" "BH9 DQ ·" "cr7-dk-ca-cau-khuon-cu" "$tT"
dao "⑩cr8-bỏ-nhớ-từ-chối-COD" "K6" "BH9 K6 ·" "cr8-bo-cod-tu-choi" "$tT"
dao "⑩cr9-«gamitin»-trơn-là-dấu-đã-dùng" "Y3" "BH9 Y3 ·" "cr9-gamitin-tron" "$tT"
dao "⑩cr10-trả-«linggo»-vào-MOC" "G44" "BH9 G44 ·" "cr10-linggo" "$tT"
dao "⑩cr11-COD_KHONG-không-ranh-giới-từ" "K1 K3" "BH9 K[13] ·" "cr11-cod-khong-cu" "$tT"
dao "⑩cr12-Ả-Rập-không-tiền-tố-ال" "Y1 G37" "BH9 (Y1|G37) ·" "cr12-ar-khong-tien-to" "$tT"
dao "⑩cr13-bỏ-«yet»-trong-lookbehind" "DR" "BH9 DR ·" "cr13-bo-yet" "$tT"
dao "⑩cr14-nhãn-«:»-+-viết-tắt" "T21 T22 T25" "BH9 T2[1245] ·" "cr14-ten-hai-cham" "$tT"
dao "⑩cr15-cờ-hiện-cả-đơn-đã-duyệt" "M5" "BH9 M5 ·" "cr15-co-don-da-duyet" "$tM"
chep; o=$(dot "$tT" "$tW" "$tM" "$tR" test/context.test.mjs); f=$(so "$o" fail); p=$(so "$o" pass)
[ "${f:-1}" -eq 0 ] && [ "${p:-0}" -ge 150 ]; ket "⑩0-bản-sao-nguyên-vẹn-xanh-(thước-không-tự-đỏ)" $? "pass=${p:-?} fail=${f:-?}"
else
  echo "⏸ ⑩đảo-vá HOÃN (BO_DAO_VA=1)"
fi

# ⑪ bộ ca cũ (rc tách dòng) — các tệp phiếu ④11 nêu; context.test đã đo ở ⑥b
for f in test/guard-fastlane.test.mjs test/guard-localfix.test.mjs test/cua-ra-sua-tai-cho.test.js "test/ngon-ngu-*.test.*" test/l2-m2-handler.test.js \
         test/lan-chot-nhuong-model.test.js test/gl8-luot-emoji.test.mjs test/conv-owner.test.mjs test/danh-tinh-nguoi-gui.test.mjs \
         v3/test/b/hop-thu.test.mjs v3/test/b/ve5-hop-thu.test.mjs; do
  # shellcheck disable=SC2086
  o=$(chay $f); fl=$(so "$o" fail); p=$(so "$o" pass); fl=${fl:-1}
  [ "$fl" -eq 0 ] && [ "${p:-0}" -gt 0 ]; ket "⑪ca-cũ-$f" $? "pass=${p:-?} fail=$fl$([ "$fl" -ne 0 ] && echo " · đỏ: $(do_ten_chung "$o")")"
done
if [ "${CHAY_CONG_CU:-}" = 1 ]; then
  for c in gl8 rp2 rp1 bh7 bh8; do
    bash "ops/bin/nghiem-thu/$c.sh" > "${TMPDIR:-/tmp}/bh9-cong-$c-$$.log" 2>&1; rc=$?
    ket "⑪cổng-cũ-$c.sh" $rc "rc=$rc · $(grep -E '^== ĐỎ' "${TMPDIR:-/tmp}/bh9-cong-$c-$$.log" | tail -1)"
  done
else
  echo "⏸ ⑪cổng-cũ gl8·rp2·rp1·bh7·bh8 HOÃN (CHAY_CONG_CU=1 để chạy — nhật ký BH9 ghi rc từng cổng)"
fi
if [ "${CHAY_NPM_TEST:-}" = 1 ]; then
  o=$(npm test -- --test-force-exit 2>&1); nt=$(so "$o" tests); nf=$(so "$o" fail)
  [ "${nf:-1}" -eq 0 ]; ket "⑪npm-test" $? "tests=${nt:-?} fail=${nf:-?}$([ "${nf:-1}" -ne 0 ] && echo " · đỏ: $(do_ten_chung "$o")")"
else
  echo "⏸ ⑪npm-test HOÃN (CHAY_NPM_TEST=1 để chạy — nhật ký BH9 ghi số trước/sau)"
fi

echo "== ĐỎ $do / XANH $xanh (DB khai: $DB)"
[ "$do" -eq 0 ]
