#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL15d — «MARKETER CHỈ THẤY SẢN PHẨM MÌNH PHỤ TRÁCH» (01 §9) + marketer CHỌN từ hồ sơ HRM (CR-28-09c; 30/09:
# một marketer cho mọi thị trường) + GỢI Ý từ đơn POS 60 ngày (BigQuery chỉ đọc, đệm một ngày). Migration 031 (chỉ thêm cột
# `san_pham_goc.marketer_ma_nv`). Lọc: danh sách · chi tiết · kiến thức · lịch sử sản phẩm; cột page · trang page · bản sao theo page.
# Chạy: ops/bin/nghiem-thu/ll15d.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — Postgres hộp cát (cổng danh tính + tầng truy vấn + kho sản phẩm gốc THẬT) + máy chủ vai-b +
# trang Sản phẩm thật; đơn POS giả. Đo prod 02/10 (chỉ đọc): 30/31 mã marketer của đơn 60 ngày ra mã NV · 11/11 marketer đang làm có đơn.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
for cap in "test/ll15d-marketer-san-pham.test.mjs:4:tầng A (hộp cát) — mã NV + tên cùng đổi · page kế thừa · gộp · gợi ý · bộ đọc đệm" \
           "v3/test/b/ll15d-marketer-man.test.mjs:5:đầu-cuối — chỉ của tôi · page kế thừa · không mã NV · chọn từ HRM · trang thật"; do
  t=${cap%%:*}; r=${cap#*:}; nho=${r%%:*}; mo=${r#*:}
  out=$(chay "$t"); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
  [ "$f" -ne 0 ] && echo "$out" | grep -E "^✖ " | sort -u | head -5 | sed 's/^/   ↳ /'
  [ "$f" -eq 0 ] && [ "$p" -ge "$nho" ]; ket "①chạy-thật" $? "$t pass=$p fail=$f (đòi ≥$nho: $mo)"
done
# ② lược đồ: 031 hai chiều + schema.sql khớp; 030 để dành cho phiên MB (CR-02-10) — bộ chạy migration không đòi số liền
[ -f db/migrate/031_marketer_hrm_san_pham.up.sql ] && [ -f db/migrate/031_marketer_hrm_san_pham.down.sql ] \
  && grep -q "ALTER TABLE san_pham_goc ADD COLUMN IF NOT EXISTS marketer_ma_nv text;" db/schema.sql
ket "②migration-031" $? "up/down + db/schema.sql"
# ③ gợi ý CHỈ ĐỌC: câu BigQuery không có động từ ghi; vắng V3_BQ_KHOA thì không dựng bộ đọc
! grep -qiE "\b(INSERT|UPDATE|DELETE|MERGE|CREATE|DROP)\b" src/hrm/goi-y-marketer.js && grep -q "const docGoiYMarketer = await" v3/chay-that.js \
  && grep -A2 "const docGoiYMarketer = await" v3/chay-that.js | grep -q "if (!process.env.V3_BQ_KHOA) return undefined;"
ket "③chỉ-đọc-vắng-biến-đóng" $? "src/hrm/goi-y-marketer.js + v3/chay-that.js"
# ④ một luật phạm vi: ba nơi đọc page/sản phẩm cùng gọi `chung/pham-vi-marketer.js`
[ "$(grep -l "pham-vi-marketer.js" v3/src/ui/san-pham/kho-goc.js v3/src/ui/san-pham/kho-san-pham.js v3/src/ui/mot-page/kho-mot-page.js | wc -l)" -eq 3 ]
ket "④một-luật-phạm-vi" $? "kho-goc · kho-san-pham · kho-mot-page"
# ⑤ thước liền kề
for t in v3/test/b/san-pham.test.mjs v3/test/b/mot-page.test.mjs v3/test/b/ve2-mot-page.test.mjs v3/test/b/vai-b-noi-day.test.mjs \
         v3/test/b/ve8a-gop.test.mjs v3/test/b/ve8b-man.test.mjs test/ve8a-gop-mon.test.mjs \
         v3/test/b/ve2b-page-gop.test.mjs v3/test/b/ll13-san-pham.test.mjs test/ll11-kien-thuc.test.mjs \
         v3/test/b/phan-quyen-nam-vai.test.mjs v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs v3/test/b/va1-ten-chua-khai.test.mjs \
         v3/test/b/bien-moi-truong-khai-du.test.mjs; do
  [ -f "$t" ] || { ket "⑤thước" 1 "$t KHÔNG CÓ"; continue; }
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "⑤thước" $? "$t fail=$ff"
done
_o=$(bash ops/bin/nghiem-thu/ll15c.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "⑥cổng-trước" $_r "ll15c.sh (kèm ll15b · ll15a · …)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
