# MỞ VAN — LL15b: người + vai theo HRM (bước 1: mã + migration 029, CHƯA bật tự động) (CR-28-09c)

> **TRẠNG THÁI: ĐANG MỞ** — gật «deploy» 02/10. Phiếu: `phieu-LL15b.md`. Lượt trước: `phat-hanh-20261002-ll15a.md` (prod `679d583`, GIỮ).

## 1 · Mở cái gì

MÃ `679d583 → HEAD`: hồ sơ LL15a `06d4db9` · LL15b `3500986` + giấy `2cd4558` · hồ sơ này. **1 migration** `029_dong_bo_hrm`
(CHỈ THÊM: `nguoi_dung.ma_nv` + chỉ mục duy nhất khi có · `thanh_vien_team.nguon` mặc định `'tay'` + CHECK) · **0 gói** · **0 tệp
bộ não** · **0 biến đặt lượt này** — `V3_HRM_TU_DONG` (lượt tự động) là bước 2, gật riêng sau lượt áp tay đầu tiên.
Ai đọc: chỉ `aicloser-v3` (`v3/chay-that.js` dựng bộ đồng bộ khi có `V3_BQ_KHOA` — đã có từ LL15a). Hai cột mới nằm ở bảng dùng
chung; hai dịch vụ kia không đọc chúng (cột có mặc định ⇒ câu ghi cũ không đổi) ⇒ **chỉ restart `aicloser-v3`**.

## 2 · Bậc phơi

Bậc ② — prod, màn quản trị. Khách không thấy gì. Deploy KHÔNG ghi tài khoản nào: chỉ khi Quản trị bấm «Lấy người từ HRM» → «Áp
dụng» thì bảng quyền mới đổi (kế hoạch chạy thử trên dữ liệu prod 02/10: tạo 21 · cấp 41 · đổi tên 2 team · 0 rút/khoá).

## 3 · Cửa vào (02/10)

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | ✔ (lượt đo trên `2cd4558`) |
| ② | Nhánh | chưa đẩy 3 commit so với nhánh prod (`679d583`) + hồ sơ này |
| ③ | `npm test` | **2.457 đạt · 0 đỏ** (2.461 ca · 4 bỏ qua) |
| ④ | Cổng | **51 xanh / 12 đỏ** = đúng 12 nợ cũ theo TÊN (b-y3 bh1 bh7 g2-a3 l0-m1 l1-m2 l2-m1 l2-m2 l2-m3 l3-m4 va-r1 va-r2); lượt đủ, không bị cắt; `ll15b` 15/15 (lồng `ll15a`) |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑥ | Biến `V3_*` | `V3_HRM_TU_DONG` có dòng ở `bien-moi-truong-v3.md` (cột VPS: vắng — khớp lượt này); cảnh báo cũ 3 tên ghép động `V3_GIA_*` (không chặn, có từ trước) |
| ⑦ | Prod (04:55:35 CEST 02/10) | `679d583` · 0 tệp sửa tại chỗ · ba dịch vụ active (`aicloser-v3` từ 02/10 04:04:01; worker 01/10 06:14:55; v1 28/09 11:25:42) · lỗi 1 giờ 0/0/0 · `/health` 200 · migration 28 · cột 029 chưa có · `nguoi_dung` 1 · `thanh_vien_team` 3 · `.env` có `V3_BQ_KHOA`, không `V3_HRM_TU_DONG` |

## 6 · Ngưỡng + mốc quan sát

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| ngay | migration | `db/migrate.js` → áp mới 1 · tổng 29; hai cột + chỉ mục + CHECK có | lỗi = DỪNG, chưa restart |
| +1′ | sống, không vòng restart | `is-active` · `Started` từ giờ restart | chết / >1 = lùi |
| +1′ | nối thật | nhật ký khởi động có «đồng bộ người theo HRM → màn Người và team», KHÔNG «chưa nối: dongBoHrm», KHÔNG «tự động mỗi» | thiếu = điều tra |
| +1′ | cửa sống | `/api/team/hrm/ke-hoach` · `POST /api/team/hrm/ap-dung` · `POST /api/team/nguoi-dung/x/mat-khau-dau` · `/cau-hinh-team` 401 (chưa đăng nhập) · đối chứng 404 | 5xx = lùi |
| +1′ | kế hoạch thật trên prod, CHỈ ĐỌC | node trên prod: `taoDongBoHrm(...).keHoach({lamMoi:true})` — chỉ in số đếm | lệch xa bản chạy thử = điều tra |
| +1′ · +5′ · +15′ | KHÔNG ai/máy ghi bảng quyền | `nguoi_dung` 1 · `thanh_vien_team` 3 · mọi dòng `nguon='tay'` · 0 dòng nhật ký `hrm_%` | đổi mà người chưa bấm = lùi |
| +5′ · +15′ | lỗi mới | journalctl ba dịch vụ | lỗi mới lặp = lùi |
| +15′ | hai dịch vụ KHÔNG restart | `ActiveEnterTimestamp` y nguyên | đổi = điều tra |

## 7 · Đường lùi

Lùi mã (rẻ nhất, < 1 phút): `cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 679d583 && systemctl restart aicloser-v3`.
**Giữ lược đồ** (luật mo-van §5): hai cột chỉ thêm, có mặc định — mã `679d583` đọc `SELECT *` không vỡ; KHÔNG chạy `029.down` trên
prod (xoá `ma_nv` là mất liên kết tài khoản ↔ HRM).
Lùi DỮ LIỆU (chỉ khi đã bấm «Áp dụng» rồi muốn bỏ): sao lưu ba bảng `nguoi_dung` · `thanh_vien_team` · `team` ở mốc lùi (dưới);
tay: `DELETE FROM thanh_vien_team WHERE nguon='hrm'` · `UPDATE nguoi_dung SET hoat_dong=false WHERE ma_nv IS NOT NULL` · đổi lại tên
team theo bản sao lưu. Tắt cả đồng bộ: xoá `V3_BQ_KHOA` khỏi `.env` + restart (màn về «HRM chưa nối»).
