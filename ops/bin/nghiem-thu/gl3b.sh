#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU GL3b — đọc lịch sử Pancake lỗi/chậm: KHÔNG trả lời mù, KHÔNG câm im — lùi dài rồi giao sale CÓ dòng
# việc (+ bộ nạp lùi theo hội thoại, sổ bỏ-qua `doc_tin_loi`, màn Vận hành, pkTagId, F2/F3). rc=0 là đạt.
# Thi hành mục ④ của docs/thi-cong/phieu/PHIEU-GL3B.md. KHÔNG gọi mạng thật: fetch GIẢ trong mọi ca (host ≠ pages.fm ⇒ ném),
# ≥2 token giả, van gửi mở CHỈ trong tiến trình ca (không sửa `.env`). Phép 1–4 đi CỬA THẬT (chayMotVong → docTin → pkDocTin →
# pkFetchPage → cổng HTTP ghi → fetch giả) — không tiêm docTin/getMessages/cua.
# Tầm đo: lưới HỒI QUY (luật 32) do chính thợ viết, trên máy dev; hộp cát Postgres riêng mỗi tệp ca (`db/sandbox.js`, hậu tố
# `_p<pid>`, migration 033 áp trong hộp cát). Đảo-vá trên BẢN SAO TẠM (src · db · v3/src · ca), mỗi đột biến một tiến trình node
# mới (bẫy 15) — không bao giờ sửa cây làm việc chung. Chỉ `grep -E` (máy dev: `rg` là hàm zsh).
# Cờ: GIU_TAM=1 giữ bản sao đảo-vá · CHAY_SO_BASE=1 chạy ⑦ (ba cổng cũ «so với base» trên worktree tạm ở $BASE — DÀI: gsp3b
# kéo cả chuỗi cổng cũ) · CHAY_NPM_TEST=1 chạy ⑧. Hai cờ sau mặc định HOÃN (luật 6: không chạy song song lượt đo khác).
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; cd "$GOC" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "$@" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+' | head -1; }
do_ten() { echo "$1" | grep -E "^\s*✖ GL3b [A-Za-z0-9]+ ·" | sed -E 's/^\s*✖ GL3b ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
xanh_ten() { echo "$1" | grep -E "^\s*✔ GL3b [A-Za-z0-9]+ ·" | sed -E 's/^\s*✔ GL3b ([A-Za-z0-9]+) ·.*/\1/' | sort -u | tr '\n' ' '; }
BASE=08ff546
DB="aicloser_v3_nt_gl3b_p$$"   # khai theo khuôn; mỗi tệp ca tự dựng hộp cát riêng (db/sandbox.js, hậu tố _p<pid>) — không ghi vào tên này
if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  DATABASE_URL_V3="$(grep -E '^DATABASE_URL_V3=' .env | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//')"; export DATABASE_URL_V3
fi
[ -n "${DATABASE_URL_V3:-}" ] || { echo "🔴 thiếu DATABASE_URL_V3 (môi trường lẫn .env) — không dựng được hộp cát"; exit 2; }
noi=$(node -e 'const u=new URL(process.env.DATABASE_URL_V3);console.log(`${u.hostname}:${u.port||5432}`)' 2>/dev/null || echo "?")
echo "── môi trường: máy dev · hộp cát Postgres trên $noi (CSDL aicloser_v3_test_gl3b_*_p<pid>, tự dựng tự dọn) · cây $GOC"
CA_W=test/gl3b-worker-doc-loi.test.mjs
CA_N=test/gl3b-nap-doc-loi.test.mjs
CA_P=test/gl3b-pancake-van-hanh.test.mjs

# ⓪ luật 1 §0a: máy này vẫn CHỈ ĐỌC (ca mở van trong tiến trình ca, không đụng .env)
ro=$(grep -E '^PANCAKE_READONLY=' .env 2>/dev/null | tail -1 | cut -d= -f2)
[ "$ro" = "1" ]; ket "⓪.env-PANCAKE_READONLY=1" $? "đọc được: '${ro:-vắng}'"

# ①②③ ba bộ ca — mỗi phép của ④ phải có ca XANH riêng (bảng đếm thấy/đòi), thước SÀN (fail=0, pass ≥ số tên đòi)
bo_ca() { # bo_ca <nhãn> <tệp ca> <các tên phải xanh>
  local o p f co t thieu=""; o=$(chay "$2"); p=$(so "$o" pass); f=$(so "$o" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -8 | sed 's/^/   ↳ /'
  co=$(xanh_ten "$o"); for t in $3; do echo " $co " | grep -qF " $t " || thieu="$thieu$t "; done
  [ "$f" -eq 0 ] && [ "$p" -ge "$(echo "$3" | wc -w)" ] && [ -z "$thieu" ]
  ket "$1" $? "pass=$p fail=$f · xanh: ${co:-không}(đòi: $3)${thieu:+ THIẾU: $thieu}"
  echo "$o" | grep -E "^\s*\[gl3b\] " | sed 's/^ */   · /'
}
bo_ca "①phép-1–4-worker-cửa-thật" "$CA_W" "P0 P1a P1b P1c P1d P1e P1f P2 P3a P3b P4"
bo_ca "②phép-4b-bộ-nạp-+-migration-033" "$CA_N" "N1 N2 N3 N4 N5 N6 N7"
bo_ca "③phép-②2·5·6·7-pancake-+-màn-Vận-hành" "$CA_P" "D1 T6 F2 F3 V5"

# ④ phép 8 — đường trả lời khách + màn Vận hành không còn gọi `pkGetMessages` (bỏ dòng chú thích `//` · ` *`)
n8=$(grep -nE "pkGetMessages" src/channels/messenger/index.js src/queue/*.js v3/src/ui/van-hanh/router.js | grep -vE '^[^:]+:[0-9]+:\s*(//|\*)' | grep -c .)
[ "$n8" -eq 0 ]; ket "④phép-8-không-còn-pkGetMessages-trên-đường-trả-lời" $? "dòng mã=$n8 (đòi 0)"
# đi kèm: ③ của gl3.sh — mọi fetch của pancake.js vẫn qua MỘT cửa có hạn (GL3b không thêm lượt gọi trần nào)
n_fetch=$(grep -vE '^\s*//' src/pancake.js | grep -cE '(^|[^.A-Za-z_])fetch\(')
n_goi=$(grep -vE '^\s*//' src/pancake.js | grep -cE 'goiPancake\(')
[ "$n_fetch" -eq 1 ] && [ "$n_goi" -eq 6 ]; ket "④b-pancake.js-vẫn-một-cửa-fetch" $? "fetch( mã=$n_fetch (đòi 1) · goiPancake( =$n_goi (đòi 6)"

# ⑤ phép 9 — ĐẢO-VÁ trên bản sao tạm (mỗi đột biến một tiến trình mới). Luật đọc: các ca khai PHẢI nằm trong tập đỏ.
T=$(mktemp -d "${TMPDIR:-/tmp}/gl3b.XXXXXX"); [ "${GIU_TAM:-0}" = 1 ] || trap 'rm -rf "$T"' EXIT
mkdir -p "$T/test" "$T/v3"
cp -R src "$T/src"; cp -R db "$T/db"; cp -R v3/src "$T/v3/src"; cp test/_an-toan.mjs "$CA_W" "$CA_N" "$CA_P" "$T/test/"
cp package.json "$T/"; ln -s "$GOC/node_modules" "$T/node_modules"; [ -f .env ] && ln -s "$GOC/.env" "$T/.env"
dot() { (cd "$T" && node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test --test-force-exit "$@" 2>&1); }
khoi_phuc() { rm -rf "$T/src" "$T/db" "$T/v3/src"; cp -R src "$T/src"; cp -R db "$T/db"; cp -R v3/src "$T/v3/src"; }
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
dao() { # dao <nhãn> <các ca phải ĐỎ> <tệp ca> <mẫu tên> <tệp đột biến | :bo-033> [<gốc> <đột biến> …]
  local nhan="$1" phai="$2" ca="$3" mau="$4" tep="$5"; shift 5
  khoi_phuc
  if [ "$tep" = ":bo-033" ]; then rm -f "$T"/db/migrate/033_*.sql
  elif ! dot_bien "$tep" "$@"; then ket "$nhan" 1 "đột biến không áp được (chuỗi gốc đổi?)"; return; fi
  local o r t thieu=""; o=$(dot --test-name-pattern="$mau" "test/$(basename "$ca")"); r=$(do_ten "$o")
  for t in $phai; do echo " $r " | grep -qF " $t " || thieu="$thieu$t "; done
  [ -z "$thieu" ]; ket "$nhan" $? "đỏ: ${r:-không} (đòi đỏ: $phai)"
}
dao "⑤a-cửa-về-pkGetMessages-(lỗi⇒[])-⇒-phép-1/3-đỏ" "P1a P1b P3a P3b" "$CA_W" "GL3b P(1a|1b|3a|3b) ·" src/channels/messenger/index.js \
  '  pkDocTin,
  pkSendReply,' '  pkDocTin,
  pkGetMessages,
  pkSendReply,' \
  '  const kq = await pkDocTin(pageId, convId, custId);' '  return pkGetMessages(pageId, convId, custId);
  const kq = await pkDocTin(pageId, convId, custId);'
dao "⑤b-bỏ-chèn-viec_can_xu_ly-⇒-phép-1-đỏ" "P1a P1b" "$CA_W" "GL3b P(1a|1b) ·" src/queue/worker.js \
  'WHERE NOT EXISTS (' 'WHERE false AND NOT EXISTS ('
dao "⑤c-bỏ-migration-033-⇒-4b-đỏ-(dòng-doc_tin_loi-+-the_chan)" "N1 N5" "$CA_N" "GL3b N[1-7] ·" ":bo-033"
dao "⑤d-nạp-ghi-mốc-khi-đọc-lỗi-⇒-4b-đỏ-(tin-mất)" "N2 N3 N4" "$CA_N" "GL3b N[1-7] ·" src/queue/nap.js \
  '      const lan = lui && dongHo() - lui.toi < LUI_DOC_TIN_TRAN_MS ? lui.lan + 1 : 1;' \
  '      if (moc) mocDaXu.set(khoaMoc, moc); const lan = lui && dongHo() - lui.toi < LUI_DOC_TIN_TRAN_MS ? lui.lan + 1 : 1;'
dao "⑤e-bỏ-lùi-theo-hội-thoại-⇒-4b-đỏ" "N2 N3" "$CA_N" "GL3b N[1-7] ·" src/queue/nap.js \
  '    if (lui && dongHo() < lui.toi) {' '    if (false && lui && dongHo() < lui.toi) {'
dao "⑤f-bỏ-nhánh-nhường-page-⇒-phép-2-đỏ" "P2" "$CA_W" "GL3b P2 ·" src/queue/worker.js \
  '    if (deps.docLichSu !== false && lichSu.length && !gomCumTinKhach(lichSu, tin.page_id)) {' '    if (false) {'
dao "⑤g-router-về-pkGetMessages-⇒-phép-5-đỏ" "V5" "$CA_P" "GL3b V5 ·" v3/src/ui/van-hanh/router.js \
  '          const { pkDocTin } = await import("../../../../src/pancake.js");
          const kq = await pkDocTin(h.page_text, moc.conv_id, moc.cust_id);
          if (!kq?.ok) throw new Error(kq?.loi || "Pancake không trả lịch sử");
          const ds = kq.messages;' '          const { pkGetMessages } = await import("../../../../src/pancake.js");
          const ds = await pkGetMessages(h.page_text, moc.conv_id, moc.cust_id);'
dao "⑤h-pkTagId-cache-khi-lỗi-⇒-phép-6-đỏ" "T6" "$CA_P" "GL3b T6 ·" src/pancake.js \
  '    if (docDuoc) _tagCache.set(k, e);' '    if (true) _tagCache.set(k, e);'
dao "⑤i-bỏ-vế-mới-F2-⇒-phép-7-F2-đỏ" "F2" "$CA_P" "GL3b F2 ·" src/pancake.js \
  ' || permErr(j) || j?.biChan
      || (j?.error_code != null && Number(j.error_code) !== -1));' ');'
dao "⑤j-bỏ-xét-success-trước-permErr-(F3)-⇒-phép-7-F3-đỏ-(2-POST)" "F3" "$CA_P" "GL3b F3 ·" src/pancake.js \
  '    if (!doc && j?.success === true) { _pageTokIdx.set(String(pageId), i); return j; }' ''
# thêm ngoài danh sách ④9 — ba chỗ «đột biến nào KHÔNG đỏ» hay lọt nhất
dao "⑤k-lùi-ngắn-(1 s·2ⁿ-mặc-định)-⇒-phép-1/3-đỏ" "P1a P1b P3a P3b" "$CA_W" "GL3b P(1a|1b|3a|3b) ·" src/queue/worker.js \
  '          await phien.ketThuc(THU_LAI, lyDo, tre);' '          await phien.ketThuc(THU_LAI, lyDo, 1000 * 2 ** (lan - 1));'
dao "⑤l-bỏ-điều-kiện-bot-đang-giữ-⇒-cảnh-phụ-SALE/CLOSING-đỏ" "P1c P1d" "$CA_W" "GL3b P1[cd] ·" src/queue/worker.js \
  "            AND h.chu_so_huu='AI' AND h.trang_thai IN ('GREET','QUALIFY','SELLING')
          RETURNING h.id" "
          RETURNING h.id"
dao "⑤m-quá-hạn-khai-thành-«hết-token»-⇒-phép-1/②2-đỏ" "P1a" "$CA_W" "GL3b P1a ·" src/pancake.js \
  '  if (j?.quaHan) return `Pancake quá hạn — ${j.message}`;' "  if (j?.quaHan) return 'không có token Pancake nào còn hạn';"
dao "⑤m2-như-trên-ở-bộ-ca-đơn-vị" "D1" "$CA_P" "GL3b D1 ·" src/pancake.js \
  '  if (j?.quaHan) return `Pancake quá hạn — ${j.message}`;' "  if (j?.quaHan) return 'không có token Pancake nào còn hạn';"
# sau /code-review (bốn chỗ vừa vá — bẫy 26: bản vá cũng là code mới)
dao "⑤n-bỏ-trả-lại-mục-chờ-gõ-khi-lỗi-⇒-N6-đỏ-(hết-lùi-phải-chờ-gõ-lại)" "N6" "$CA_N" "GL3b N[1-7] ·" src/queue/nap.js \
  '      if (choDaQua) choGoXong.set(khoaMoc, choDaQua);' ''
dao "⑤o-mang-lần-lùi-của-sự-cố-cũ-⇒-N7-đỏ" "N7" "$CA_N" "GL3b N[1-7] ·" src/queue/nap.js \
  'lui && dongHo() - lui.toi < LUI_DOC_TIN_TRAN_MS ? lui.lan + 1 : 1;' '(lui?.lan || 0) + 1;'
dao "⑤p-bỏ-giữ-lỗi-5 s-của-pkTagId-⇒-T6-đỏ-(verifyTags-kết-luận-oan)" "T6" "$CA_P" "GL3b T6 ·" src/pancake.js \
  '  if ((!e || Date.now() - e.t > 10 * 60e3) && Date.now() - (_tagLoi.get(k) ?? -Infinity) < THE_LOI_GIU_MS) return null;' ''
dao "⑤q-bỏ-điều-kiện-page-bật-bot/nguồn-khi-giao-sale-⇒-P1f-đỏ" "P1f" "$CA_W" "GL3b P1f ·" src/queue/worker.js \
  "AND p.bot_ai_bat = true AND (\$4 = '' OR p.nguon_tin = \$4)" "AND (\$4 = '' OR true)"
khoi_phuc; o=$(dot "test/$(basename "$CA_W")" "test/$(basename "$CA_N")" "test/$(basename "$CA_P")"); f=$(so "$o" fail); p=$(so "$o" pass)
[ "${f:-1}" -eq 0 ] && [ "${p:-0}" -ge 23 ]; ket "⑤0-bản-sao-nguyên-vẹn-xanh-(thước-không-tự-đỏ)" $? "pass=${p:-?} fail=${f:-?}"

# ⑥ phép 10 — XANH TUYỆT ĐỐI, rc tách dòng: cổng GL3 + chín bộ ca chạm đường đọc/gửi/hàng đợi/lược đồ
o=$(bash ops/bin/nghiem-thu/gl3.sh 2>&1); r=$?
[ "$r" -ne 0 ] && echo "$o" | grep -E "^🔴" | head -6 | sed 's/^/   ↳ /'
ket "⑥gl3.sh" "$r" "rc=$r · $(echo "$o" | grep -E '^== ĐỎ' | tail -1)"
for c in test/l1-m2-cua.test.js test/va-r1-van-gui.test.js test/phase0-webhook-delivery.test.js test/l2-m1-nhac-truong.test.js \
         test/phase1-chat-flow.test.js test/l2-m1-hang-doi.test.js test/va-p7-chay-worker.test.js test/gl3-han-cho-pancake.test.mjs \
         test/l0-m1-luoc-do.test.js; do
  o=$(chay "$c"); r=$?; f=$(so "$o" fail); p=$(so "$o" pass)
  [ "$r" -ne 0 ] && echo "$o" | grep -E "^\s*✖ " | sort -u | head -4 | sed 's/^/   ↳ /'
  [ "$r" -eq 0 ] && [ "${f:-1}" -eq 0 ] && [ "${p:-0}" -ge 1 ]; ket "⑥$(basename "$c")" $? "rc=$r pass=${p:-?} fail=${f:-?}"
done

# ⑦ phép 10 «so với base» — l1-m2.sh (①b đỏ SẴN từ base: src/orders/legacy*.js import pancake.js, ngoài ③) · gsp3b.sh · ll2.sh.
#    Chạy CHÍNH cổng đó ở cây này và ở worktree tạm tại $BASE, in HAI danh sách dòng đỏ (chuẩn hoá số id/pid), đạt ⇔ 0 dòng đỏ MỚI.
if [ "${CHAY_SO_BASE:-}" = 1 ]; then
  SHIM=$(mktemp -d "${TMPDIR:-/tmp}/gl3b-shim.XXXXXX"); printf '#!/bin/sh\nexec grep -E "$@"\n' > "$SHIM/rg"; chmod +x "$SHIM/rg"
  PATH_CON="$PATH"; command -v rg >/dev/null 2>&1 || PATH_CON="$SHIM:$PATH"
  WT="$(mktemp -d "${TMPDIR:-/tmp}/gl3b-base.XXXXXX")/wt"
  git worktree add -q --detach "$WT" "$BASE" >/dev/null 2>&1 && ln -s "$GOC/node_modules" "$WT/node_modules" \
    && { [ ! -f "$GOC/.env" ] || ln -s "$GOC/.env" "$WT/.env"; }
  trap '[ "${GIU_TAM:-0}" = 1 ] || rm -rf "$T"; rm -rf "$SHIM"; git worktree remove --force "$WT" >/dev/null 2>&1; rm -rf "$(dirname "$WT")"' EXIT
  chuan_do() { grep -E "✘|🔴" | sed -E 's/[0-9]{4,}//g; s/p[0-9]+//g; s/[0-9]+ ms//g' | sort -u; }
  for g in l1-m2 ll2 gsp3b; do
    moi=$(env -u CHAY_NPM_TEST -u CHAY_SO_BASE PATH="$PATH_CON" bash "ops/bin/nghiem-thu/$g.sh" 2>&1); rm_=$?
    cu=$( (cd "$WT" && env -u CHAY_NPM_TEST -u CHAY_SO_BASE PATH="$PATH_CON" bash "ops/bin/nghiem-thu/$g.sh" 2>&1); echo "__rc=$?")
    rc_cu=$(echo "$cu" | grep -oE '__rc=[0-9]+' | tail -1 | cut -d= -f2)
    ds_moi=$(echo "$moi" | chuan_do); ds_cu=$(echo "$cu" | chuan_do)
    them=$(comm -13 <(echo "$ds_cu") <(echo "$ds_moi") | grep -c .)
    echo "   ── $g · BASE $BASE rc=$rc_cu · $(echo "$ds_cu" | grep -c .) dòng đỏ:"; echo "$ds_cu" | grep . | sed 's/^/      base │ /'
    echo "   ── $g · SAU SỬA rc=$rm_ · $(echo "$ds_moi" | grep -c .) dòng đỏ:"; echo "$ds_moi" | grep . | sed 's/^/      sau  │ /'
    if [ "$rm_" -ne 0 ] && [ -z "$ds_moi" ]; then ket "⑦so-base-$g" 1 "rc=$rm_ mà không in dòng đỏ nào — cổng con chết giữa chừng"; continue; fi
    [ "$them" -eq 0 ]; ket "⑦so-base-$g" $? "rc base=$rc_cu · sau=$rm_ · dòng đỏ MỚI=$them (đòi 0)"
  done
else
  echo "⏸ ⑦so-với-base (l1-m2 · ll2 · gsp3b) HOÃN — đặt CHAY_SO_BASE=1 khi không lượt đo nào khác đang chạy (luật 6; gsp3b kéo cả chuỗi cổng cũ)"
fi

# ⑧ npm test — chỉ khi CHAY_NPM_TEST=1 (luật 6). Thước: fail=0 (mốc base ghi ở nhật ký GL3b).
if [ "${CHAY_NPM_TEST:-}" = 1 ]; then
  o=$(npm test 2>&1); nt=$(so "$o" tests); nf=$(so "$o" fail)
  [ "${nf:-1}" -eq 0 ]; ket "⑧npm-test" $? "tests=${nt:-?} fail=${nf:-?}"
else
  echo "⏸ ⑧npm-test HOÃN — đặt CHAY_NPM_TEST=1 (luật 6: không chạy song song)"
fi
echo "== ĐỎ $do / XANH $xanh"; [ "$do" -eq 0 ]
