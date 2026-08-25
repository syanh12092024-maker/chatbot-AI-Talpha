#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CỔNG NGHIỆM THU G2-A3 — gộp BA cửa ghi hẹp về MỘT bộ dựng câu UPDATE.
#
# Phép ① là phép của cả phiếu: đếm câu `UPDATE` TAY còn lại trong đất người A. Nó có hai
# vế, và vế thứ hai mới là vế khó:
#   · ba cửa được giao phải về 0 (hợp đồng của phiếu);
#   · tổng cả cây KHÔNG ĐƯỢC TĂNG so với kiểm kê đã ghi. Cửa thứ tư mọc lên là ĐỎ.
#
# ⚠️ Vì sao không đặt trần "tổng = 0": vì nó SAI. `src/queue/kho.js` ghi `tin_cho_xu_ly`,
#    bảng CỐ Ý ngoài `BANG_NGHIEP_VU_CHUAN` — không có đường hợp lệ nào qua tầng chung.
#    Đặt một mốc không bao giờ đạt được là cách chắc chắn nhất để cổng bị bỏ qua (đúng
#    bài học của mốc nền mục ở l0-m1.sh / l0-m2.sh, sửa cùng ngày).
# ═══════════════════════════════════════════════════════════════════════════════
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${GOC}" || exit 2

DB="aicloser_v3_nt_g2a3"
LOI=0; PHEP=0
muc()   { printf '\n── %s\n' "$1"; }
so()    { printf '   %-58s %s\n' "$1" "$2"; }
dat()   { PHEP=$((PHEP + 1)); printf '   ✔ %s\n' "$1"; }
truot() { PHEP=$((PHEP + 1)); LOI=$((LOI + 1)); printf '   ✘ %s\n' "$1"; }
bang() {
  so "$1" "$2"
  if [ "$2" = "$3" ]; then dat "$1 = $3"; else truot "$1: thật=$2 · chờ=$3"; fi
}

# Đếm câu UPDATE TAY trong một tệp. Bỏ dòng chú thích: lịch sử được phép NHẮC tới câu
# UPDATE cũ. Bộ đếm này CỐ Ý thô — nó còn bắt cả cụm tiếng Việt «UPDATE tay» nằm trong
# chuỗi thông báo lỗi (2 tệp, xem `ly_do`). Không siết regex cho khớp đúng SQL, vì một bộ
# đếm quá khôn là bộ đếm bỏ sót: thà đếm dư rồi KHAI LÝ DO từng tệp, còn hơn đếm thiếu và
# không ai biết. Cột lý do là chỗ phân biệt «SQL thật» với «văn xuôi».
demUpdate() {
  grep -vE '^\s*(//|\*|/\*)' "$1" 2>/dev/null | grep -cE 'UPDATE[[:space:]]+[a-z_]+[[:space:]]' || true
}

muc "① ba cửa ĐƯỢC GIAO không còn tự dựng câu UPDATE"
TONG3=0
for F in src/pos/kho.js src/chat/kho.js src/orders/may-trang-thai.js; do
  N="$(demUpdate "$F")"; TONG3=$((TONG3 + N)); so "  ${F}" "${N}"
done
bang "tổng câu UPDATE tay ở BA cửa" "${TONG3}" "0"

muc "② kiểm kê cả đất người A — cửa thứ tư mọc lên là ĐỎ"
# Kiểm kê đo ngày 25/08 sau khi gộp. Con số này là TRẦN, không phải mục tiêu: nó chỉ được
# GIẢM. Ai gộp thêm thì hạ trần xuống; ai dựng cửa mới thì cổng đỏ và phải nói ra lý do.
# Trần đo ngày 25/08 bằng CHÍNH bộ đếm dưới đây (không phải bằng tay — bản gõ tay đầu
# tiên lệch với phép đo ở bốn tệp, và một cái hộp kiểm kê nói sai là hai lỗi chứ không
# phải một). Trần chỉ được GIẢM: ai gộp thêm thì hạ nó xuống.
TRAN=8

# LÝ DO từng tệp — phần DUY NHẤT gõ tay ở đây. Con số thì luôn ĐO, không khai.
ly_do() {
  case "$1" in
    src/db/truy-van.js)        echo "✅ bộ dựng chung — cái duy nhất NÊN có" ;;
    src/db/chuyen-team.js)     echo "✅ cửa B-Y3, đổi chủ page + con, có chủ đích" ;;
    src/orders/lich-nhac.js)   echo "🟨 lich_nhac — gộp được, ngoài phạm vi G2-A3 (§9)" ;;
    src/orders/hang-cho.js)    echo "🟨 hang_cho_tao_don — gộp được, ngoài phạm vi (§9)" ;;
    src/orders/ti-le-hoan.js)  echo "🟨 khach — gộp được, nhưng có hợp đồng CẤM chạm sua_luc" ;;
    src/queue/kho.js)          echo "⛔ tin_cho_xu_ly — CỐ Ý ngoài BANG_NGHIEP_VU_CHUAN" ;;
    src/queue/worker.js)       echo "➖ KHÔNG phải SQL — cụm «UPDATE tay» trong câu tiếng Việt" ;;
    src/chat/handler-v3.js)    echo "➖ KHÔNG phải SQL — cụm «UPDATE tay» trong câu tiếng Việt" ;;
    *)                         echo "❓ CHƯA KHAI LÝ DO — khai vào ly_do() hoặc gộp đi" ;;
  esac
}

CHUA_KHAI=0; TONG=0
for F in $(find src/db src/pos src/chat src/orders src/queue src/channels -name '*.js' | sort); do
  N="$(demUpdate "$F")"
  [ "$N" -eq 0 ] && continue
  TONG=$((TONG + N))
  LD="$(ly_do "$F")"
  case "${LD}" in "❓"*) CHUA_KHAI=$((CHUA_KHAI + 1)) ;; esac
  printf '   · %-28s %s  %s\n' "$F" "$N" "${LD}"
done
so "tổng câu UPDATE tay trong đất A" "${TONG}"
so "trần kiểm kê 25/08 (chỉ được GIẢM)" "${TRAN}"
if [ "${TONG}" -le "${TRAN}" ]; then
  dat "không có cửa ghi mới nào mọc lên (${TONG} ≤ ${TRAN})"
else
  truot "CÓ CỬA GHI MỚI: ${TONG} > ${TRAN} — xem chi tiết trên, và khai lý do vào §9"
fi
bang "tệp có câu UPDATE mà CHƯA KHAI lý do" "${CHUA_KHAI}" "0"

muc "③ bộ ca khoá năm cái bẫy của lượt gộp"
if node --test test/l0-m2-gop-cua-hep.test.js >/tmp/g2a3-gop.txt 2>&1; then
  dat "test/l0-m2-gop-cua-hep.test.js: $(grep -c '^# Subtest' /tmp/g2a3-gop.txt) ca, 0 đỏ"
else
  truot "bộ ca gộp có ca đỏ:"; grep -E '^not ok' /tmp/g2a3-gop.txt | head -8
fi

muc "④ bảy bộ ca của ba cửa vừa gộp — không bộ nào được tụt"
DO=""; XANH=0
for f in l1-m1-doc-pos l1-m1-ghi-nguoc l2-m2-handler l2-m3-handler \
         l3-m1-may-trang-thai l3-m1-quet-don va-r3-cas-nhat-lai; do
  if node --test "test/${f}.test.js" >/tmp/g2a3-${f}.txt 2>&1; then XANH=$((XANH + 1))
  else DO="${DO} ${f}"; fi
done
bang "bộ ca xanh / 7" "${XANH}" "7"
[ -n "${DO}" ] && so "bộ ĐỎ" "${DO}"

muc "⑤ CAS của máy trạng thái đơn vẫn NÉM, không trả null"
# Điểm dễ mất nhất của lượt gộp: `suaTheoId` trả `null` khi 0 dòng, còn `ghiDon` phải NÉM.
# Quên dịch là lá chắn RF-13 thành lệnh rỗng. Đo bằng chính chuỗi tên lỗi.
if grep -q "LoiGhiDonAnhCu" src/orders/may-trang-thai.js && \
   grep -A3 "if (!dong)" src/orders/may-trang-thai.js | grep -q "LoiGhiDonAnhCu"; then
  dat "ghiDon dịch null → LoiGhiDonAnhCu (có mặt trong nhánh !dong)"
else
  truot "ghiDon KHÔNG còn dịch null → ném: lá chắn RF-13 thành lệnh rỗng"
fi

printf '\n═══════════════════════════════════════════════════════════════\n'
printf 'TỔNG: %d phép · ĐẠT %d · TRƯỢT %d\n' "${PHEP}" "$((PHEP - LOI))" "${LOI}"
[ "${LOI}" -eq 0 ] && exit 0 || exit 1
