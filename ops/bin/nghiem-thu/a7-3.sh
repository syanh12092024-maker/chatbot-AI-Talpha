#!/usr/bin/env bash
# CỔNG NGHIỆM THU A7-3 — cửa đọc hồ sơ khách.
#
# ⛔ CẤM `node --test … | grep -q …`: `grep -q` đóng ống khi khớp ⇒ node ăn SIGPIPE (141)
#    ⇒ `set -o pipefail` biến pipeline thành TRƯỢT dù bộ ca xanh. Đã cắn ở cổng a7-1 (26/08).
set -uo pipefail
cd "$(dirname "$0")/../../.."

DAT=0; TRUOT=0
kiem() { if eval "$2" >/dev/null 2>&1; then echo "  ĐẠT   $1"; DAT=$((DAT+1));
         else echo "  TRƯỢT $1"; TRUOT=$((TRUOT+1)); fi; }

echo "═══ A7-3 · cửa đọc hồ sơ khách ═══"

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

F=src/orders/doc-ho-so.js
chay() { node --test test/a7-3-doc-ho-so.test.js 2>&1 || true; }

# ⛔ SOI MÃ, KHÔNG SOI CHÚ THÍCH. Cắn ngay lượt dựng cổng này (26/08): hai phép «KHÔNG được
#    có X» TRƯỢT vì chính đoạn chú thích giải thích VÌ SAO không dùng X có chứa chữ X.
#    Một cổng bắt tội người ta vì đã ghi lại lý do là một cổng dạy người ta xoá lý do đi.
ma() { grep -vE '^\s*(//|\*|/\*)' "$F"; }

echo "① KHÔNG có vòng nhập — file ở src/orders, nhập XUÔI xuống src/db"
kiem "nạp được src/orders/index.js" \
  "node --input-type=module -e 'import(\"./src/orders/index.js\").then(m=>process.exit(m.docHoSoKhach?0:1))'"
kiem "không có import động giấu phụ thuộc" "! ma | grep -q 'await import('"

echo "② KHÔNG dựng phép gộp thứ hai ở đường đọc — gộp đã xảy ra ở tầng GHI"
kiem "không tự dựng khoá định danh" "! ma | grep -q 'khoaKhach'"
kiem "dùng chuanHoaSdt để tra, không viết lại luật cắt tiền tố" "ma | grep -q 'chuanHoaSdt'"

echo "③ KHÔNG khai đã gộp kênh chưa nối"
kiem "có kê KENH_CHUA_NOI"    "ma | grep -q 'KENH_CHUA_NOI'"
kiem "whatsapp được gọi tên"  "ma | grep -qi 'whatsapp'"

echo "④ KHÔNG có nhánh chặn nào (01 §11 còn Chờ chốt)"
kiem "không có nhánh chặn theo tầng hoàn" \
  "! ma | grep -qE \"(chan|tuChoi|block).*tang_hoan|tang_hoan.*(chan|tuChoi)\""

echo "⑤ bộ ca chạy trên Postgres THẬT"
RA="$(chay)"
# Node <=24 in "# pass N", Node >=25 in "ℹ pass N" — nhận CẢ HAI. Đo 01/09: máy chạy
# v25.8.0, bộ ca xanh trọn mà cổng vẫn TRƯỢT — thước cũ đọc thành "lỗi code".
kiem "12/12 ca a7-3 xanh" "grep -qE '^(#|ℹ) fail 0$' <<< \"\$RA\" && grep -qE '^(#|ℹ) pass 12$' <<< \"\$RA\""

echo "⑥ ĐẢO-VÁ: gõ cứng kenh.coMat ⇒ bộ ca PHẢI ĐỎ"
# H7 dựng khách có ĐỦ hai kênh nên nó xanh cả khi coMat bị khai sẵn; ca H12 (khách chỉ có
# MỘT kênh) là ca duy nhất phân biệt «đếm từ dữ liệu» với «khai sẵn». Phép này giữ H12 lại.
cp "$F" /tmp/a73-dhs.bak
python3 - <<'PY'
import pathlib
p = pathlib.Path("src/orders/doc-ho-so.js")
s = p.read_text()
goc = """    const kenhCoMat = [];
    if (ht.rowCount) kenhCoMat.push("messenger");
    for (const n of KENH_CO_THAT)
      if (theoNguon[n] && !kenhCoMat.includes(n)) kenhCoMat.push(n);"""
if goc in s:
    p.write_text(s.replace(goc, "    const kenhCoMat = [...KENH_CO_THAT];"))
PY
RA_DB="$(chay)"
if grep -qE '^(#|ℹ) fail 0$' <<< "$RA_DB"; then
  echo "  TRƯỢT đảo-vá — không ca nào phân biệt «đếm từ dữ liệu» với «khai sẵn»"
  TRUOT=$((TRUOT+1))
else
  echo "  ĐẠT   đảo-vá làm bộ ca đỏ ($(grep -cE '^not ok' <<< "$RA_DB") ca)"
  DAT=$((DAT+1))
fi
cp /tmp/a73-dhs.bak "$F"; rm -f /tmp/a73-dhs.bak

echo "───────────────────────────────────────────"
echo "ĐẠT $DAT · TRƯỢT $TRUOT"
[ "$TRUOT" -eq 0 ] || exit 1
