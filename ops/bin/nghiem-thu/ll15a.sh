#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL15a — HRM từ BigQuery `levelup-465304`, CHỈ ĐỌC: khách REST tự ký JWT (token phạm vi
# `bigquery.readonly`, đệm token) · bộ đọc HRM đệm một ngày + «đọc lại» · màn Người và team (hồ sơ theo email · bảng marketer
# POS của ĐÚNG team, bốn nhóm loại trừ nhau) · Kết nối › HRM (số đọc từ nguồn; chưa nối / đọc hỏng nói đúng vì sao).
# Chạy: ops/bin/nghiem-thu/ll15a.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — mạng Google giả (JWT ký + KIỂM thật bằng cặp khoá RSA sinh trong ca) + máy chủ
# vai-b + trang chạy thật. Đọc thật với Google đã đo tay 02/10 (118 hồ sơ · 324 dòng ghép) — cổng không gọi Google.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
for cap in "test/ll15a-hrm.test.mjs:6:tầng A — JWT phạm vi chỉ đọc · đệm token · schema · lỗi không lộ khoá · đệm HRM · xếp nhóm" \
           "v3/test/b/ll15a-hrm-man.test.mjs:6:màn — hồ sơ theo email · đúng team · đọc hỏng · Kết nối số thật · đọc lại · chưa nối"; do
  t=${cap%%:*}; r=${cap#*:}; nho=${r%%:*}; mo=${r#*:}
  out=$(chay "$t"); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$out" | grep -E "^✖ " | sort -u | head -5 | sed 's/^/   ↳ /'
  [ "$f" -eq 0 ] && [ "$p" -ge "$nho" ]; ket "①chạy-thật" $? "$t pass=$p fail=$f (đòi ≥$nho: $mo)"
done
# ② bí mật: không tệp theo dõi nào mang khoá riêng; không kéo gói Google (khách REST tự viết, CHỈ cửa jobs.query)
# (loại chính tệp cổng này — nó mang chuỗi cần tìm; lượt đầu 02/10 tự khớp mình)
! git grep -lq "BEGIN PRIVATE KEY" -- . ':!test/**' ':!v3/test/**' ':!ops/bin/nghiem-thu/ll15a.sh' 2>/dev/null; ket "②không-khoá-trong-git" $? "git grep BEGIN PRIVATE KEY = 0"
! grep -q '"@google-cloud/bigquery"' package.json; ket "②không-gói-google" $? "package.json"
[ "$(grep -c "fetchFn(" src/hrm/bigquery.js)" -eq 2 ] && ! grep -qE "insertAll|tables/|datasets/|jobs/.*(delete|cancel)" src/hrm/bigquery.js
ket "②một-cửa-đọc" $? "src/hrm/bigquery.js chỉ gọi token + jobs.query"
# ③ vắng biến = đóng: máy chủ chỉ dựng bộ đọc HRM khi có V3_BQ_KHOA; biến đã khai ở bảng biến môi trường
grep -q "if (!process.env.V3_BQ_KHOA) return undefined;" v3/chay-that.js && grep -q '`V3_BQ_KHOA`' docs/v3/ban-giao/bien-moi-truong-v3.md
ket "③vắng-biến-đóng" $? "v3/chay-that.js + bien-moi-truong-v3.md"
# ④ thước liền kề
for t in v3/test/b/ve7b-ket-noi.test.mjs v3/test/b/ve7d-nguoi-team.test.mjs v3/test/b/vai-b-noi-day.test.mjs v3/test/b/ket-noi.test.mjs \
         v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs v3/test/b/bien-moi-truong-khai-du.test.mjs v3/test/b/va1-ten-chua-khai.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "④thước" $? "$t fail=$ff"
done
_o=$(bash ops/bin/nghiem-thu/ve7e.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "⑤cổng-trước" $_r "ve7e.sh (kèm ve7d · ve7c · ve7b · ve7a · …)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
