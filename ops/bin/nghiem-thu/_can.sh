# ═══════════════════════════════════════════════════════════════════════════════
# «CỔNG NÀY CẦN GÌ» — HOÃN MINH BẠCH thay vì TRƯỢT oan. Tệp trợ giúp, không phải cổng.
#
# Bản shell của `test/_can-du-lieu-that.mjs`. Cùng một ý, để cổng và bộ ca nói chung một
# thứ tiếng: thiếu thứ CI không thể có thì NÓI RA, đừng khai là trượt.
#
# VÌ SAO CÓ NÓ (đo 14/09/2026, lượt 34801106602). Sáu cổng đỏ trên CI — va-r1 · va-r2 ·
# b-y4 · l0-m1 · g2-a4 · l1-m1 — KHÔNG cổng nào đỏ vì mã. Chúng thiếu `.env`, thiếu tệp dữ
# liệu thật, thiếu kết nối POS. Nhưng cả sáu đều khai ✘ TRƯỢT, tức nói sai bệnh: người đọc
# tưởng mã hỏng trong khi máy đo thiếu đồ nghề.
#
# ⚠️ HOÃN ≠ CHE, và HOÃN ≠ ĐẠT.
#   · Chỉ hoãn phép đã BIẾT CHẮC nó cần thứ gì. Một phép đỏ CHƯA GIẢI THÍCH ĐƯỢC mà đem
#     hoãn là tự dựng cổng mù — đúng cảnh «màn trống vẫn đạt».
#   · Trên máy CÓ đủ đồ nghề, các hàm này trả rỗng nên phép chạy như thường, không mất
#     một phép đo nào.
#   · Cổng hoãn KHÔNG BAO GIỜ được trả rc=0. Hoãn trọn cổng ⇒ rc=2.
#
# Bày ra:  `thieu_env`  ·  `thieu_tep <tên>…`   — in LÝ DO ra stdout, rỗng = không thiếu gì
# ═══════════════════════════════════════════════════════════════════════════════

# `.env` có ở máy này không. Nhiều cổng chạy `node --env-file=.env`; thiếu tệp thì node
# chết ngay với "`.env`: not found" và MỌI phép sau đó đọc thành LOI-NODE.
thieu_env() {
  [ -f .env ] && return 0
  printf 'cần `.env` (cổng gọi `node --env-file=.env`) — tệp gitignore, chỉ có trên máy dev/VPS'
}

# Tệp dữ liệu THẬT ở gốc repo. Tất cả đều gitignore.
thieu_tep() {
  local thieu=""
  local t
  for t in "$@"; do
    [ -f "$t" ] || thieu="${thieu}${thieu:+, }$t"
  done
  [ -z "${thieu}" ] && return 0
  printf 'cần dữ liệu thật (%s) — tệp gitignore, chỉ có trên máy dev/VPS' "${thieu}"
}

# ── HAI CHỮ, ĐỪNG GỘP ────────────────────────────────────────────────────────
# `hoan()` sẵn có ở vài cổng nghĩa là CỐ Ý CHƯA CHẠY Ở ĐÂY (ví dụ: ghi ngược POS thật phải
# diễn tập trên VPS). Đó là lựa chọn của người viết phiếu, biết trước, và KHÔNG đổi mã thoát.
#
# `khong_do()` dưới đây nghĩa khác hẳn: MÁY NÀY THIẾU ĐỒ NGHỀ nên phép không trả lời được.
# Nó PHẢI đổi mã thoát sang 2. Gộp hai chữ làm một thì một cổng thiếu nửa số phép vẫn ra
# rc=0, và ta dựng lại đúng cái cổng mù vừa đập bỏ.
KHONG_DO=0
khong_do() { KHONG_DO=$((KHONG_DO + 1)); printf '   ⏸ KHÔNG ĐO ĐƯỢC — %s\n' "$1"; }

# Mã thoát BA TRẠNG THÁI. Gọi ở cuối cổng: `thoat_ba_trang_thai "${LOI}"`
#   1 = có phép TRƯỢT (mã sai)
#   2 = không trượt, nhưng còn phép KHÔNG ĐO ĐƯỢC (máy thiếu đồ nghề)
#   0 = đo hết và đạt hết
thoat_ba_trang_thai() {
  if   [ "${1:-0}"      -gt 0 ]; then exit 1
  elif [ "${KHONG_DO}"  -gt 0 ]; then exit 2
  else exit 0; fi
}
