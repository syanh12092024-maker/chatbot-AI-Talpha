#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU UI-HT2 — màn «Bàn hội thoại» (CR-28-09).
# Chạy: ops/bin/nghiem-thu/ui-ht2.sh        (rc=0 là đạt)
# ① đường cổng + HTTP · ② SQL có LIMIT trên Postgres SANDBOX (tự dựng, tự dọn) · ③④ NEO §10.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2

do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }

out=$(chay v3/test/b/ban-hoi-thoai-ds.test.mjs)
p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 7 ]; ket "①danh-sách+HTTP" $? "pass=$p fail=$f (đòi ≥7, 0 đỏ)"

out=$(chay test/ui-ht2-sql.test.js)
p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 4 ]; ket "②SQL-sandbox" $? "pass=$p fail=$f (đòi ≥4: cửa sổ · chỉ bot · tìm không lọt team · LIMIT)"

# ③ §10 — trang không có ô soạn tin, không đường gửi
n=$(sed 's/<!--.*-->//' v3/src/ui/ban-hoi-thoai/trang/ban-hoi-thoai.html | grep -cE "<textarea|pkSend|/api/.*gui")
[ "$n" -eq 0 ]; ket "③không-soạn-không-gửi" $? "chỗ soạn/gửi trong trang: $n (đòi 0)"

# ④ bộ đọc SQL kẹp team bằng bối cảnh, KHÔNG nhận team từ nơi gọi
t=$(grep -c "WHERE h.team_id = \$1" v3/src/ui/ban-hoi-thoai/kho-ban-hoi-thoai.js)
b=$(grep -c "\[bc.teamId," v3/src/ui/ban-hoi-thoai/kho-ban-hoi-thoai.js)
[ "$t" -eq 1 ] && [ "$b" -eq 1 ]; ket "④kẹp-team-từ-bối-cảnh" $? "WHERE team=\$1: $t · tham số đầu bc.teamId: $b (đòi 1 · 1)"

# ⑤ các thước đổi theo §10 mới vẫn xanh (menu sale · quyền năm vai · hệ kiểu)
for tt in v3/test/b/dieu-huong.test.mjs v3/test/b/phan-quyen-nam-vai.test.mjs v3/test/b/he-kieu.test.mjs v3/test/b/vai-b-noi-day.test.mjs; do
  o=$(chay "$tt"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "⑤thước" $? "$tt fail=$ff"
done

echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
