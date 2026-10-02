# MỞ VAN — LL15b: người + vai theo HRM (bước 1: mã + migration 029, CHƯA bật tự động) (CR-28-09c)

> **TRẠNG THÁI: ✅ GIỮ** — gật «deploy» 02/10 · migration 029 áp · restart `aicloser-v3` 05:19:44 CEST · mốc +1′/+5′/+15′ sạch. Phiếu: `phieu-LL15b.md`. Lượt trước: `phat-hanh-20261002-ll15a.md` (prod `679d583`, GIỮ).

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

## 8 · Lệnh đã gõ

Người quyết gật «deploy» 02/10. Giờ prod (CEST):
1. cửa vào (máy dev, lượt đủ không bị cắt): 51 xanh / 12 đỏ = 12 nợ cũ · `npm test` 2.457 đạt 0 đỏ · CHANGELOG + hồ sơ `24abe05`
2. đẩy nhánh `679d583..24abe05` (4 commit)
3. mốc lùi `/var/backups/aicloser/truoc-ll15b-20261002T031910Z/` — `commit.txt` = `679d583` · `env.bak` (600) · `bang-quyen.json`
   (600: `nguoi_dung` 2 · `thanh_vien_team` 4 · `team` 4)
4. prod `checkout -f -B vao-ui-v3-17-09 origin/vao-ui-v3-17-09` → `24abe05` · 0 tệp theo dõi sửa tại chỗ (trước và sau)
5. `node --env-file=.env db/migrate.js` → **ÁP 029_dong_bo_hrm · áp mới 1 · tổng 29**; kiểm: `thanh_vien_team.nguon` (mặc định
   'tay') · `nguoi_dung.ma_nv` · chỉ mục `nguoi_dung_ma_nv` 1 · CHECK `thanh_vien_team_nguon` 1 · 4/4 dòng vai `nguon='tay'`
6. KHÔNG đổi `.env` (không `V3_HRM_TU_DONG`)
7. `systemctl restart aicloser-v3` lúc **05:19:44** — chỉ dịch vụ này (lượt đầu dừng TRƯỚC restart vì câu đếm nhật ký sai tên cột
   `tao_luc` → `xay_ra_luc`; chuỗi `&&` chặn đúng)

Ghi chú mốc chuẩn: 04:55 đo 1 tài khoản · 3 vai; lúc sao lưu (05:19) 2 · 4 — nhật ký 1 giờ qua có đúng 1 dòng `tao_nguoi_dung` do
NGƯỜI (màn «Tạo người dùng»), không phải máy. Canh theo mốc 2 · 4.

## 9 · Số đo từng mốc

| Mốc | Giờ | Kết quả |
|---|---|---|
| +1′ | 05:20:56 | ba dịch vụ active · `aicloser-v3` Started 1 · lỗi 0/0/0 · hai dịch vụ kia `ActiveEnterTimestamp` y nguyên (28/09 11:25:42 · 01/10 06:14:55) · `/health` 200 · `/api/team/hrm/ke-hoach` `/api/team/thanh-vien` `/cau-hinh-team` `POST ap-dung` `POST mat-khau-dau` 401 · đối chứng 404 · khởi động: «đồng bộ người theo HRM → màn Người và team» 1 · «chưa nối: dongBoHrm» 0 · «tự động mỗi» 0 · lượt tự động 0 · HRM nối 1 · `HEAD` `24abe05` · bảng quyền 2 · 4 · `nguon` tay 4 · nhật ký `hrm_*` 0 · **kế hoạch thật (chỉ lập, không áp): tạo 21 · gắn mã 0 · cấp 41 (GCC 4 · AUUS 2 · EU 5 marketer; 10 sale × 3 team) · rút 0 · khoá 0 · mở khoá 0 · đổi tên 2 · cảnh báo 0 · qua rào** — khớp bản chạy thử |
| +5′ | 05:25:08 | y như +1′ — Started 1 · lỗi 0/0/0 · hai dịch vụ kia y nguyên · đường đúng mã · bảng quyền 2 · 4 · `hrm_*` 0 |
| +15′ | 05:35:15 | y như +1′ — Started 1 · lỗi 0/0/0 · hai dịch vụ kia y nguyên · đường đúng mã · bảng quyền 2 · 4 · `hrm_*` 0 |

## 10 · Kết

**GIỮ.** Ba mốc sạch, không vòng restart, không lỗi mới; bộ đồng bộ nối thật, KHÔNG ghi gì khi chưa ai bấm; kế hoạch thật trên prod
khớp bản chạy thử. Nợ của phiếu (đã ở §9 sổ): N-HRM-RUT-GAP · N-MK-HANG-LOAT · N-KHOA-PHIEN · N-HRM-LANCUOI-NHO.

Việc sau deploy (người, Quản trị của cả ba team): Cài đặt › Người và team → «Lấy người từ HRM (BigQuery)» → xem kế hoạch → «Áp dụng»
(21 tài khoản · 41 vai · tên team «Tiểu Alpha» → «Pialpha GCC», «Auus» → «Pialpha AUUS») → «Đặt mật khẩu» cho từng người (theo
từng team). **Bước 2** (gật riêng): đặt `V3_HRM_TU_DONG=1` + restart `aicloser-v3` ⇒ tự đồng bộ mỗi 24 giờ. Người quyết gật
«deploy» 02/10.
