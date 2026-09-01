#!/usr/bin/env bash
# CỔNG NGHIỆM THU A7-2 — nối hội thoại Messenger vào hồ sơ khách.
#
# ⛔ CẤM `node --test … | grep -q …` trong file này: `grep -q` đóng ống khi khớp ⇒ node
#    ăn SIGPIPE (141) ⇒ `set -o pipefail` biến pipeline thành TRƯỢT dù bộ ca xanh trọn.
#    Đã cắn khi dựng cổng a7-1 (26/08). Hứng ra biến rồi mới soi.
set -uo pipefail
cd "$(dirname "$0")/../../.."

DAT=0; TRUOT=0
kiem() { if eval "$2" >/dev/null 2>&1; then echo "  ĐẠT   $1"; DAT=$((DAT+1));
         else echo "  TRƯỢT $1"; TRUOT=$((TRUOT+1)); fi; }

echo "═══ A7-2 · nối hội thoại vào hồ sơ khách ═══"

# Nạp `.env` của repo khi biến chưa có sẵn trong môi trường — mọi cổng l*/va-* chạy bộ ca
# bằng `node --env-file=.env`, cổng này thì không, nên nó thoát 2 ngay trên chính máy có
# .env đầy đủ (đo 01/09). Biến đặt sẵn ngoài shell vẫn THẮNG (không ghi đè).
if [ -z "${DATABASE_URL_V3:-}" ] && [ -f .env ]; then
  eval "$(grep -E '^(DATABASE_URL_V3|V3_KHOA_MA_HOA)=' .env | sed 's/^/export /')"
fi

if [ -z "${DATABASE_URL_V3:-}" ]; then
  echo "  ⛔ thiếu DATABASE_URL_V3 (và .env cũng không có) — cổng này KHÔNG đo được gì. Thoát 2 (không phải ĐẠT)."
  exit 2
fi

chay() { node --test test/a7-2-noi-ho-so.test.js 2>&1 || true; }

echo "① KHÔNG dựng cửa UPDATE hẹp thứ NĂM — đi bằng suaTheoId (nợ N3)"
kiem "có gọi suaTheoId"        "grep -q 'suaTheoId(' src/chat/ho-so-khach.js"
kiem "không có UPDATE gõ tay"  "! grep -qiE '^\s*(UPDATE|\`UPDATE)' src/chat/ho-so-khach.js"

echo "② nước tra qua pos_shop_id, KHÔNG qua page.thi_truong (khớp tên trúng 0/502)"
kiem "join theo pos_shop_id"      "grep -q 'pos_shop_id' src/chat/ho-so-khach.js"
kiem "KHÔNG join theo thi_truong" "! grep -q 'p.thi_truong' src/chat/ho-so-khach.js"
kiem "kẹp k.bat (kết nối đang bật)" "grep -q 'k.bat' src/chat/ho-so-khach.js"

echo "③ ghi là SO-VÀ-ĐẶT, không ghi đè người đã gán"
kiem "neu khach_id null" "grep -q 'khach_id: null' src/chat/ho-so-khach.js"

echo "④ bộ ca chạy trên Postgres THẬT"
RA="$(chay)"
# Node <=24 in "# pass N", Node >=25 in "ℹ pass N" — nhận CẢ HAI. Đo 01/09: máy chạy
# v25.8.0, bộ ca xanh trọn mà cổng vẫn TRƯỢT — thước cũ đọc thành "lỗi code".
kiem "10/10 ca a7-2 xanh" "grep -qE '^(#|ℹ) fail 0$' <<< \"\$RA\" && grep -qE '^(#|ℹ) pass 10$' <<< \"\$RA\""

echo "⑤ ĐẢO-VÁ: bỏ nước khỏi khoá bản đồ trong lượt ⇒ bộ ca PHẢI ĐỎ"
# Đột biến này TỪNG SỐNG SÓT cả 9 ca đầu (câu tra CSDL còn kẹp thi_truong nên cứu được
# hành vi ở tầng dưới); ca G10 sinh ra chính từ lượt đảo-vá đó. Giữ phép này để G10
# không bị ai xoá mất mà cổng vẫn xanh.
CS=src/chat/ho-so-khach.js
cp "$CS" /tmp/a72-hsk.bak
python3 - <<'PY'
import pathlib
p = pathlib.Path("src/chat/ho-so-khach.js")
s = p.read_text()
goc = "const khoa = khoaKhach(h.market, h.sdt_tho);"
if goc in s:
    p.write_text(s.replace(goc, "const khoa = khoaKhach(null, h.sdt_tho);"))
PY
RA_DB="$(chay)"
if grep -qE '^(#|ℹ) fail 0$' <<< "$RA_DB"; then
  echo "  TRƯỢT đảo-vá — thước KHÔNG bắt được, nhánh bản đồ trong lượt đang không ai đo"
  TRUOT=$((TRUOT+1))
else
  echo "  ĐẠT   đảo-vá làm bộ ca đỏ ($(grep -cE '^not ok' <<< "$RA_DB") ca)"
  DAT=$((DAT+1))
fi
cp /tmp/a72-hsk.bak "$CS"; rm -f /tmp/a72-hsk.bak

echo "───────────────────────────────────────────"
echo "ĐẠT $DAT · TRƯỢT $TRUOT"
[ "$TRUOT" -eq 0 ] || exit 1
