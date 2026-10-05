#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL15e — KHOÁ TÀI KHOẢN CẮT PHIÊN (nợ N-KHOA-PHIEN của LL15b). Vé đăng nhập là chuỗi ký sống 8 tiếng, không bảng
# phiên: trước bản này người nghỉ bị đồng bộ HRM khoá vẫn dùng vé cũ tới hết hạn, rút vai không rút khỏi vé, và người bị khoá còn ĐỔI
# TEAM bằng vé cũ để lấy vé mới 8 tiếng. Nay `lopBoiCanh` hỏi lại CSDL (đệm 30 giây mỗi người × team × vai): khoá ⇒ coi như chưa
# đăng nhập (cả vé tạm) · rút vai ⇒ vé mất đúng vai đó · CSDL hỏng ⇒ 500, không đoán.
# Chạy: ops/bin/nghiem-thu/ll15e.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — máy chủ HTTP thật + kho giả + Postgres hộp cát + ứng dụng `dungPhanB` thật.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/khoa-phien.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -ne 0 ] && echo "$out" | grep -E "^✖ " | sort -u | head -5 | sed 's/^/   ↳ /'
[ "$f" -eq 0 ] && [ "$p" -ge 7 ]; ket "①chạy-thật" $? "v3/test/b/khoa-phien.test.mjs pass=$p fail=$f (đòi ≥7: khoá · rút vai · đổi team · đệm · CSDL hỏng · dây nối · Postgres)"
# ② MỘT cửa: lớp đọc vé hỏi `vaiConLaiCuaVe`, bối cảnh dựng bằng vai CÒN LẠI; vé tạm cũng qua phép cắt trước khi gắn `req.veTam`
grep -q "const vai = await vaiConLaiCuaVe(than);" v3/src/auth/lop-express.js \
  && grep -qE "^\s+vai,\s+// vai CÒN LẠI" v3/src/auth/lop-express.js \
  && awk '/if \(!vai\) return next\(\);/{a=NR} /if \(than.tam\) \{ req.veTam = than; return next\(\); \}/{b=NR} END{exit !(a && b && a < b)}' v3/src/auth/lop-express.js
ket "②một-cửa-cắt-phiên" $? "v3/src/auth/lop-express.js"
for t in v3/test/b/auth-router.test.mjs v3/test/b/auth-ve.test.mjs v3/test/b/dispatch-router.test.mjs v3/test/b/vai-b-noi-day.test.mjs \
         v3/test/b/phan-quyen-nam-vai.test.mjs v3/test/b/ll15c-team-mac-dinh.test.mjs v3/test/b/ll15b-dong-bo-man.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "③thước" $? "$t fail=$ff"
done
_o=$(bash ops/bin/nghiem-thu/ll15d.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "④cổng-trước" $_r "ll15d.sh (kèm ll15c · ll15b · ll15a · …)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
