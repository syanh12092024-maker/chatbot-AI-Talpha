#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL2 — Hộp thư (CR-28-09c · 01 §10 bổ sung): nhận thay bot · sửa/duyệt/loại đơn
# Messenger cạnh chat · tab Đơn chờ · hồ sơ khách theo số — vẫn KHÔNG ô soạn tin, KHÔNG đường gửi tin.
# Chạy: ops/bin/nghiem-thu/ll2.sh        (rc=0 là đạt)
# ① thước module ghi (đồ thị import · đường · chắn · script · đọc Đơn chờ) · ② hành vi trên Postgres thật
# · ③ thước chỉ-đọc của bàn vẫn xanh · ④ van-hanh dùng CHUNG thân hàm đơn chờ · ⑤ e2e van-hanh vẫn xanh
# · ⑥ hợp đồng · ⑦ cổng LL1 + UI-HT1..4.
# Tầm đo: lưới HỒI QUY do chính thợ viết — bắt tái phạm đã biết. Bằng chứng thật là sale dùng thật.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2

do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }

out=$(chay v3/test/b/hop-thu.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 7 ]; ket "①thước-Hộp-thư" $? "pass=$p fail=$f (đòi ≥7: import · đường · chắn · script · Đơn chờ · bối cảnh · ?ht)"

out=$(chay test/ll2-hop-thu.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 6 ]; ket "②Postgres-thật" $? "pass=$p fail=$f (đòi ≥6: đơn chờ · duyệt MỘT đơn POS · loại · nhận thay bot · tìm khách)"

out=$(chay v3/test/b/ban-hoi-thoai-khong-gui.test.mjs); f=$(so "$out" fail); f=${f:-1}
[ "$f" -eq 0 ]; ket "③bàn-vẫn-chỉ-đọc" $? "ban-hoi-thoai-khong-gui fail=$f"

a=$(grep -c "from \"./don-cho.js\"" v3/src/ui/van-hanh/router.js); b=$(grep -c "from '../van-hanh/don-cho.js'" v3/src/ui/hop-thu/router.js)
c=$(grep -cE "await duyet\(|await loai\(" v3/src/ui/van-hanh/router.js)
[ "$a" -eq 1 ] && [ "$b" -eq 1 ] && [ "$c" -eq 0 ]; ket "④một-thân-hàm-đơn" $? "van-hanh nhập don-cho=$a · hop-thu nhập don-cho=$b · van-hanh tự gọi duyet/loai=$c (đòi 1·1·0)"

out=$(chay test/frontend-v3-e2e.test.js); f=$(so "$out" fail); f=${f:-1}
[ "$f" -eq 0 ]; ket "⑤e2e-van-hanh" $? "frontend-v3-e2e fail=$f (sale vẫn 403 ở /api/van-hanh — chỉ vào đơn qua Hộp thư)"

x=$(grep -c "^### 7b · HỘP THƯ" v3/docs/spec/L4-M1-bang-dieu-phoi.md); y=$(grep -c "Đã làm ở LL2" docs/v3/03-MAN-HINH.md)
[ "$x" -eq 1 ] && [ "$y" -eq 1 ]; ket "⑥hợp-đồng" $? "spec §7b=$x · 03 Hộp thư=$y (đòi 1·1)"

for g in ll1 ui-ht1 ui-ht2 ui-ht3 ui-ht4; do
  bash "ops/bin/nghiem-thu/$g.sh" >/dev/null 2>&1; ket "⑦cổng-trước" $? "$g.sh"
done

echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
