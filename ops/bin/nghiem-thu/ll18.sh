#!/usr/bin/env bash
# CỔNG NGHIỆM THU PHIẾU LL18 — khung vẽ ở máy chủ + nén + cache theo phiên bản + khung theo bản vẽ (CR-28-09c).
# Chạy: ops/bin/nghiem-thu/ll18.sh        (rc=0 là đạt)
# ① bộ ca LL18 (HTTP thật qua `dungPhanB`) · ② bốn thước khung đã sửa theo luật mới · ③ HÀNH VI: chạy `veKhung`
# cho ba vai, in năm đích + hàng 2 · ④ không trang 403 nào còn trỏ `/dieu-phoi` · ⑤ cổng LL1 + LL3 (menu cùng đọc).
# Tầm đo: lưới HỒI QUY do chính thợ viết. Bằng chứng thật: e2e Chromium dưới mạng giả lập prod (nhật ký phiếu) +
# người dùng mở màn trên prod.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2
do=0; xanh=0
ket() { if [ "$2" -eq 0 ]; then xanh=$((xanh+1)); echo "✅ $1 ${3:-}"; else do=$((do+1)); echo "🔴 $1 ${3:-}"; fi; }
chay() { node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test "$1" 2>&1; }
so() { echo "$1" | grep -oE "^ℹ $2 [0-9]+" | grep -oE '[0-9]+'; }

out=$(chay v3/test/b/ll18-khung.test.mjs); p=$(so "$out" pass); f=$(so "$out" fail); p=${p:-0}; f=${f:-1}
[ "$f" -eq 0 ] && [ "$p" -ge 12 ]; ket "①bộ-ca-LL18" $? "pass=$p fail=$f (đòi ≥12: khung theo vai · chèn HTML · cache theo mã · gzip · / theo vai · 403 · liên kết cấm)"

for t in v3/test/b/he-kieu.test.mjs v3/test/b/dieu-huong.test.mjs v3/test/b/ll3-cum.test.mjs v3/test/b/vai-b-noi-day.test.mjs; do
  o=$(chay "$t"); ff=$(so "$o" fail); ff=${ff:-1}; [ "$ff" -ne 0 ] && echo "$o" | grep -E "^✖ " | sort -u | head -3 | sed 's/^/   ↳ /'; [ "$ff" -eq 0 ]; ket "②thước" $? "$t fail=$ff"
done

kq=$(node --input-type=module -e '
process.env.V3_KHOA_VE ||= Buffer.alloc(32, 1).toString("base64");
const { menuCua } = await import("./v3/src/ui/chung/man-hinh.js");
const { veKhung } = await import("./v3/src/ui/chung/khung.js");
const { VAI } = await import("./v3/src/auth/boi-canh.js");
const lk = (h, n) => ((h.match(new RegExp(`aria-label="${n}[^"]*">([\\s\\S]*?)</nav>`)) || [])[1] || "").match(/>[^<]+</g)?.map((x) => x.slice(1, -1)).join("|") || "-";
for (const [v, d] of [[VAI.QUAN_TRI, "/bo-luat"], [VAI.MARKETER, "/san-pham"], [VAI.SALE, "/ban-hoi-thoai"]]) {
  const k = veKhung({ nhom: menuCua([v]), vai: [v], tenDangNhap: "x" }, d);
  console.log(`${v}@${d} chinh=${lk(k.html, "Chính")} hai=${lk(k.html, "Trong mục")}`);
}' 2>/dev/null)
echo "$kq" | sed 's/^/   /'
echo "$kq" | grep -q "quan-tri@/bo-luat chinh=Hộp thư|Sản phẩm|Page|Số liệu|Cài đặt hai=Tất cả page|Luật chung" \
  && echo "$kq" | grep -q "sale@/ban-hoi-thoai chinh=Hộp thư hai=Hộp thư|Việc đang chờ"
ket "③khung-thật-theo-vai" $? "quản trị năm đích + «Trong mục Page» · sale chỉ Hộp thư"

n=$(grep -rl '<a href="/dieu-phoi">← Về bảng điều phối</a>' v3/src/ui | wc -l | tr -d ' ')
[ "$n" -eq 0 ]; ket "④403-không-ngõ-cụt" $? "trang «cần vai» còn trỏ /dieu-phoi: $n (đòi 0)"

for g in ll1 ll3; do bash "ops/bin/nghiem-thu/$g.sh" >/dev/null 2>&1; ket "⑤cổng-trước" $? "$g.sh"; done

echo "== ĐỎ $do / XANH $xanh"
[ "$do" -eq 0 ]
