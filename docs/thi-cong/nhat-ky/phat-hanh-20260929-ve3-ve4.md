# MỞ VAN — VE3 (danh sách page) + VE4 (Luật chung) theo bản vẽ (CR-28-09c)

> **TRẠNG THÁI: ĐANG MỞ — người quyết gật 29/09: «deploy»** (trả lời «Đề xuất deploy VE3 + VE4 ngay … Gõ «deploy»»).
> Phiếu: `phieu-VE3.md` · `phieu-VE4.md`. Lượt trước: `phat-hanh-20260929-ve1-ve2.md` (prod `f211036`).

## 1 · Mở cái gì

MÃ `f211036 → HEAD`: `05dcc72` VE3 · `083c9de` VE4 + giấy. **0** migration (27; VE4 dùng bảng `khoi_dung_chung` của 026 đã
có trên prod) · **0** gói · **0** biến · **0** tệp bộ não. Đồ thị import: `src/server.js` 0 tệp đổi · `src/queue/chay-worker.js`
0 · `v3/chay-that.js` 5 ⇒ **chỉ restart `aicloser-v3`**. Tầng dữ liệu: thêm MỘT cửa ĐỌC (`GET /api/anh-san-pham/khoi-chung`,
cùng router + rào với cửa ghi MN7) và MỘT trang (`/khoi-chung`); không cửa ghi mới. Thao tác hàng loạt VE3 đi qua cửa ghi
từng page đã có.

## 2 · Bậc phơi

Bậc ② — prod, đường nội bộ. Hai màn đổi cho mọi người dùng v3 khi restart. Khách không thấy gì trực tiếp; hai đường
chạm khách GIÁN TIẾP (đã có từ trước, nay có lối mới): bật bot hàng loạt (≤10, xác nhận) và lưu ba khối dùng chung (xác
nhận, cùng cửa ghi cũ) — cả hai do người bấm, không tự chạy.

## 3 · Cửa vào (29/09, HEAD `d8e490f`)

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | 0 tệp (trước CHANGELOG + tệp này) |
| ② | Nhánh | chưa đẩy 5 commit so với nhánh prod (`05dcc72` `0d0a7a8` `8e7699d` `083c9de` `d8e490f`) |
| ③ | `npm test` | lượt `phat-hanh.sh` đầu (16:26 giờ máy dev): **676 đỏ** — KHÔNG phải mã: log Postgres.app ghi **65** lượt `FATAL: Postgres.app failed to verify "trust" authentication` trong đúng khung 16:27:46–16:35:48 (hộp xin phép kết nối của Postgres.app không ai bấm), trước và sau khung đó 0 lượt; cùng khung, phép ④ «không nối được Postgres» ⇒ HOÃN. Chạy lại ngay sau: **2.309 ca · 2.305 đạt · 0 đỏ · 4 bỏ qua** (bằng lượt 16:0x trên cùng mã trừ `.bang-sua` + giấy) |
| ④ | Cổng (`BO_QUA_TEST=1`, lượt 2) | **35 xanh · 12 đỏ** — 12 đỏ TRÙNG TÊN từng cổng với danh sách nợ cũ của lượt VE1+VE2 (b-y3 bh1 bh7 g2-a3 l0-m1 l1-m2 l2-m1 l2-m2 l2-m3 l3-m4 va-r1 va-r2) · `ll3`/`ll5` xanh · `ve3`/`ve4` mới xanh · đếm từ chối Postgres sau lượt vẫn 65 (không lượt mới) |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑦ | Prod (11:26:57) | `f211036` · 0 tệp THEO DÕI sửa tại chỗ (23 tệp KHÔNG theo dõi, xem §7) · ba dịch vụ active (`aicloser-v3` từ 10:35:22) · lỗi 1 giờ **0/0/0** · `/health` 129 · `/khoi-chung` **404** (mã cũ) · `/api/khong-co-duong-nay` 404 |

Bộ ca riêng: VE3 D1–D4 · VE4 K1–K4 (Postgres) + Q1–Q4 · đảo-vá VE3 7/7 · VE4 8/8 · bấm thật VE3 (lọc · chọn · gắn hàng
loạt) và VE4 (bốn tab · lưu với bot giả · marketer · sale 403 · 390px) — 0 lỗi JS, 0 request hỏng.

## 6 · Ngưỡng + mốc quan sát

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| +1′ | sống, không vòng restart | `is-active` · `Started` từ giờ restart | chết / >1 = lùi |
| +1′ | mã MỚI đang phục vụ | `/khoi-chung` (curl, không Accept html) **401** — mã cũ **404** (đo trước 11:26); đối chứng `/api/khong-co-duong-nay` 404 | 404/5xx ở `/khoi-chung` = lùi |
| +1′ | trang mới trên đĩa prod | `page-bot.html` có `id="thanhLoc"` · `khoi-chung.html` có `bang-sua` · `mot-page.html` có `href="/khoi-chung"` | thiếu = điều tra |
| +5′ · +15′ | lỗi mới | journalctl ba dịch vụ | lỗi mới lặp = lùi |
| +15′ | hai dịch vụ không chạm | `ActiveEnterTimestamp` · `/health` | đổi = điều tra |
| +1 ngày | người dùng mở hai màn | người quyết | lỗi chặn việc = lùi |

(Không dùng `/api/anh-san-pham/khoi-chung` làm thước «mã mới»: mã cũ đã có POST cùng đường, rào đăng nhập chặn trước ⇒
cả hai bản đều 401 — đo 11:26.)

## 7 · Đường lùi

```bash
cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 f211036 && systemctl restart aicloser-v3    # < 1 phút
```
Mất dữ liệu: không — lượt này không thêm cửa ghi, không migration. Ba khối lưu qua màn mới nằm ở `khoi_dung_chung` (đã
có ở `f211036`, trang một page cũ vẫn sửa được). 23 tệp KHÔNG theo dõi trên prod (bản sao `.env.bak*`, `kb-overrides.bak*`,
`wa-auth.*`, 6 tệp `src/`, 2 tệp `v3/src/ui/van-hanh/trang.*`) không trùng tệp nào lượt này đổi (đo 0) ⇒ `checkout -f`
không chạm.
