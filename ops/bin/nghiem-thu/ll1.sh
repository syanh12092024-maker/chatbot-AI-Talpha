#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL1 — khung năm đích (CR-28-09c): Hộp thư · Sản phẩm · Page · Số liệu · Cài đặt.
# Chạy: ops/bin/nghiem-thu/ll1.sh        (rc=0 là đạt)
# ① bộ ca LL1 (bản chụp trước/sau) · ② thước menu cũ đã sửa theo đích mới · ③ HK10 · ④ sale vào thẳng Hộp thư
# · ⑤ menu THẬT theo vai (chạy `menuCua`) · ⑥ hợp đồng + kế hoạch giao diện trỏ LL1 · ⑦ bốn cổng UI-HT vẫn xanh.
# Tầm đo: lưới HỒI QUY do chính thợ viết — bắt tái phạm đã biết. Bằng chứng thật là người dùng mở menu.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2

do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }

out=$(chay v3/test/b/ll1-nam-dich.test.mjs)
p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 7 ]; ket "①bộ-ca-LL1" $? "pass=$p fail=$f (đòi ≥7: đích · biểu tượng · đường · chỗ ngồi · tập màn theo vai · đích Sản phẩm · chỗ đặt chân)"

out=$(chay v3/test/b/dieu-huong.test.mjs)
f=$(so "$out" fail); f=${f:-1}
n=$(grep -c "'hop-thu', 'san-pham', 'page', 'so-lieu', 'cai-dat'" v3/test/b/dieu-huong.test.mjs)
[ "$f" -eq 0 ] && [ "$n" -ge 1 ]; ket "②thước-menu-cũ" $? "dieu-huong fail=$f · neo năm đích=$n (đòi 0 · ≥1)"

out=$(chay v3/test/b/he-kieu.test.mjs)
f=$(so "$out" fail); f=${f:-1}
h=$(echo "$out" | grep -c "^✔ HK10")
[ "$f" -eq 0 ] && [ "$h" -eq 1 ]; ket "③HK10" $? "he-kieu fail=$f · HK10 xanh=$h (đòi 0 · 1)"

out=$(chay v3/test/b/vai-b-noi-day.test.mjs)
f=$(so "$out" fail); f=${f:-1}
[ "$f" -eq 0 ]; ket "④sale-vào-thẳng-Hộp-thư" $? "vai-b-noi-day fail=$f (đăng nhập thật ⇒ diTiep /ban-hoi-thoai)"

# ⑤ HÀNH VI: chạy chính `menuCua` cho từng vai, in đích + số màn hiện — người đọc cổng thấy menu thật.
kq=$(node --input-type=module -e '
process.env.V3_KHOA_VE ||= Buffer.alloc(32, 1).toString("base64");
process.env.V3_KHOA_CHU ||= Buffer.alloc(32, 2).toString("base64");
const mh = await import("./v3/src/ui/chung/man-hinh.js");
const { VAI } = await import("./v3/src/auth/boi-canh.js");
const dong = [];
for (const [k, v] of Object.entries(VAI)) {
  const m = mh.menuCua([v]);
  dong.push(`${k}:${m.map((n) => n.ma).join(",")}:${m.reduce((a, n) => a + n.man.filter((x) => !x.an).length, 0)}`);
}
console.log(dong.join(" "));' 2>/dev/null | tail -1)
echo "   menu theo vai (vai:đích:số màn hiện): $kq"
echo "$kq" | grep -q "QUAN_TRI:hop-thu,san-pham,page,so-lieu,cai-dat:18" \
  && echo "$kq" | grep -q "SALE:hop-thu:2"
ket "⑤menu-thật-theo-vai" $? "quản trị năm đích 18 màn · sale chỉ Hộp thư 2 màn"

# ⑥ hợp đồng: bảng đích có trong 03, kế hoạch giao diện trỏ LL1
a=$(grep -c "^## Màn cũ đi đâu" docs/v3/03-MAN-HINH.md)
b=$(grep -c "phiếu LL1" docs/v3/09-KE-HOACH-GIAO-DIEN.md)
[ "$a" -eq 1 ] && [ "$b" -ge 1 ]; ket "⑥hợp-đồng" $? "03 bảng đích=$a · 09 trỏ LL1=$b (đòi 1 · ≥1)"

# ⑦ bốn cổng của sóng UI-HT — menu là thứ chúng cùng đọc
for g in ui-ht1 ui-ht2 ui-ht3 ui-ht4; do
  bash "ops/bin/nghiem-thu/$g.sh" >/dev/null 2>&1; ket "⑦cổng-trước" $? "$g.sh"
done

echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
