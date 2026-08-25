#!/usr/bin/env bash
# CỔNG NGHIỆM THU A7-1 — khoá định danh khách = (team, NƯỚC, SĐT), migration 013.
#
# Tự dựng sandbox từ khuôn trần và tự dọn (án lệ #28). Chạy ở đâu có DATABASE_URL_V3
# là chạy — máy dev macOS KHÔNG có Postgres, nên thực tế cổng này chạy trên VPS.
#
# Cổng canh HÀNH VI, không canh TỒN TẠI (án lệ #19/#30): phép ⑤ là một lượt ĐỘT BIẾN —
# bỏ nước khỏi khoá JS thì bộ ca PHẢI đỏ. Cổng xanh mà đột biến cũng xanh = thước hỏng.
set -uo pipefail
cd "$(dirname "$0")/../../.."

DAT=0; TRUOT=0
kiem() { # <tên> <lệnh>
  if eval "$2" >/dev/null 2>&1; then echo "  ĐẠT   $1"; DAT=$((DAT+1));
  else echo "  TRƯỢT $1"; TRUOT=$((TRUOT+1)); fi
}

echo "═══ A7-1 · khoá định danh khách theo nước ═══"

if [ -z "${DATABASE_URL_V3:-}" ]; then
  echo "  ⛔ thiếu DATABASE_URL_V3 — cổng này KHÔNG đo được gì. Thoát 2 (không phải ĐẠT)."
  exit 2
fi

echo "① migration 013 có mặt và có cả chiều xuống"
kiem "013 up tồn tại"   "test -f db/migrate/013_khoa_dinh_danh_khach.up.sql"
kiem "013 down tồn tại" "test -f db/migrate/013_khoa_dinh_danh_khach.down.sql"

echo "② coalesce có mặt trong chỉ mục — thiếu nó là lọt hai-NULL (lỗ 012 vừa bịt)"
kiem "chỉ mục dùng coalesce(thi_truong,'')" \
  "grep -q \"coalesce(thi_truong, '')\" db/migrate/013_khoa_dinh_danh_khach.up.sql"

echo "③ KHÔNG gõ tay danh sách tên nước trong migration (án lệ #22)"
kiem "không có CHECK liệt kê nước" \
  "! grep -qiE \"CHECK *\\(.*thi_truong .*IN *\\(\" db/migrate/013_khoa_dinh_danh_khach.up.sql"

# ⛔ CẤM `node --test … | grep -q …` ở đây: `grep -q` đóng ống ngay khi khớp ⇒ node ăn
#    SIGPIPE (141) ⇒ `set -o pipefail` biến cả pipeline thành TRƯỢT dù bộ ca xanh trọn.
#    Đã cắn một lần khi dựng chính cổng này (26/08): ④ báo TRƯỢT trong khi chạy tay là
#    11/11, còn ⑤ thì ĐẠT vì lý do SAI. Hứng ra biến rồi mới soi.
chay_bo_ca() { node --test test/a7-1-khoa-khach.test.js 2>&1 || true; }

echo "④ bộ ca chạy trên Postgres THẬT"
RA="$(chay_bo_ca)"
kiem "11/11 ca a7-1 xanh" "grep -qE '^# fail 0$' <<< \"\$RA\" && grep -qE '^# pass 11$' <<< \"\$RA\""

echo "⑤ ĐẢO-VÁ: bỏ nước khỏi khoá JS ⇒ bộ ca PHẢI ĐỎ"
CS=src/orders/loc-trung.js
cp "$CS" /tmp/a71-loc-trung.bak
python3 - <<'PY'
import pathlib
p = pathlib.Path("src/orders/loc-trung.js")
s = p.read_text()
goc = 'return `${String(thiTruong ?? "").trim()}|${sdt}`;'
p.write_text(s.replace(goc, "return sdt;")) if goc in s else None
PY
RA_DB="$(chay_bo_ca)"
if grep -qE '^# fail 0$' <<< "$RA_DB"; then
  echo "  TRƯỢT đảo-vá — thước KHÔNG bắt được đột biến, bộ ca này không chứng minh gì"
  TRUOT=$((TRUOT+1))
else
  echo "  ĐẠT   đảo-vá làm bộ ca đỏ ($(grep -cE '^not ok' <<< "$RA_DB") ca) đúng như phải thế"
  DAT=$((DAT+1))
fi
cp /tmp/a71-loc-trung.bak "$CS"; rm -f /tmp/a71-loc-trung.bak

echo "───────────────────────────────────────────"
echo "ĐẠT $DAT · TRƯỢT $TRUOT"
[ "$TRUOT" -eq 0 ] || exit 1
