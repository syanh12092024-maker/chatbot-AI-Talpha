#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL15c — TEAM TỰ NHẬN DIỆN: người quyết 02/10 «tự nhận diện theo team, không có màn chọn team, chọn team
# chỉ dành cho quản trị» + (hỏi thẳng) sale ba team ⇒ «team mặc định + nút đổi nhỏ». Đăng nhập: nhiều team KHÔNG quản trị ⇒ vé đủ
# quyền cho team mặc định (gợi ý `v3_team_cuoi` kiểm lại bằng danh sách team thật) · quản trị nhiều team ⇒ vé tạm + màn chọn team ·
# chip team: chữ (một team) · menu nhỏ (sale) · sang màn chọn (quản trị) — máy chủ vẽ sẵn và đường lùi dùng chung `doiTeamCua`.
# Chạy: ops/bin/nghiem-thu/ll15c.sh        (rc=0 là đạt)
# Tầm đo: lưới HỒI QUY do chính thợ viết — máy chủ vai-b thật + CSDL giả; `dieu-huong.js` thật chạy trong DOM giả.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }
out=$(chay v3/test/b/ll15c-team-mac-dinh.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -ne 0 ] && echo "$out" | grep -E "^✖ " | sort -u | head -5 | sed 's/^/   ↳ /'
[ "$f" -eq 0 ] && [ "$p" -ge 6 ]; ket "①chạy-thật" $? "ll15c-team-mac-dinh pass=$p fail=$f (đòi ≥6: sale vào thẳng · nhớ team · gợi ý lệch · quản trị vẫn chọn · khung · dieu-huong.js thật)"
# ② gợi ý team KHÔNG mang quyền: chỉ chọn trong danh sách team thật của người
grep -q "return dsTeam.find((t) => String(t.teamId) === String(goiY ?? '')) || dsTeam\[0\];" v3/src/auth/router.js
ket "②gợi-ý-không-mang-quyền" $? "v3/src/auth/router.js#teamMacDinh"
# ③ thước liền kề
for t in v3/test/b/auth-router.test.mjs v3/test/b/ll18-khung.test.mjs v3/test/b/dieu-huong.test.mjs v3/test/b/vai-b-noi-day.test.mjs \
         v3/test/b/he-kieu.test.mjs v3/test/b/trang-parse-duoc.test.mjs v3/test/b/ll1-nam-dich.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "③thước" $? "$t fail=$ff"
done
_o=$(bash ops/bin/nghiem-thu/ll15b.sh 2>&1); _r=$?; [ "$_r" -ne 0 ] && echo "$_o" | grep -E "🔴|↳" | sed 's/^/   ↳ /'; ket "④cổng-trước" $_r "ll15b.sh (kèm ll15a · ve7e · …)"
echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
