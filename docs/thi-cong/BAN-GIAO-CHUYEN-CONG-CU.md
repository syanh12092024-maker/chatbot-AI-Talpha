# BÀN GIAO — CHUYỂN SANG CÔNG CỤ KHÁC (23/08/2026)

> Gói tự chứa để một người/công cụ khác tiếp quản phần việc **CODER A** của AI Closer v3.
> Đọc file này trước, rồi `docs/thi-cong/SO-DIEU-HANH-THI-CONG.md` (sổ điều hành — nguồn
> trạng thái sống).

## 1. Đang ở đâu

**Code phần A XONG 12/12 module + 4 phiếu vá; gate máy 13/13 cổng xanh; refute tổng thể
5 mảng đã chạy, lộ 10 CHẶN → sóng vá 4 cụm, ĐÃ ĐÓNG 2/4.**

| Việc | Trạng thái |
| --- | --- |
| L0-M1 · L0-M2 (nền + tầng truy vấn team) | ✅ |
| L1-M1 · L1-M2 · L1-M3 (POS · Messenger · WhatsApp) | ✅ |
| L2-M1 · L2-M2 · L2-M3 (hàng đợi/handler · từ khoá · prompt 4 khối) | ✅ |
| L3-M1..M4 (máy trạng thái · lọc trùng · nhắc · hàng chờ tạo đơn) | ✅ |
| VA-P1 · VA-Q12 · VA-T1 (vá trong lúc thi công) | ✅ |
| **VA-R3** (CAS ghiDon + nhặt đơn kẹt) · **VA-R4** (đọc ý phủ định) | ✅ |
| **VA-R1** (bộ não bắn HTTP thật) | ✅ 23/08 · commit `1562d58` · cổng `va-r1.sh` 12/12 |
| **VA-R2** (tiền ×hệ-số + tạo đơn) | ✅ 23/08 · commit `5caf5be` (gộp nhánh `wip/va-r2` vào `main`, nhánh wip có thể xoá) · cổng `va-r2.sh` 17/17 |
| Gate RVA (chốt sóng vá) | ✅ 23/08 · 17 cổng rc=0 · 352/352 test · repro tổng-thể-1 🔴=0 · MẢNG-2 còn ❌ F4/F5 mức NÊN (§9) |
| Push lên GitHub | ⬜ **chưa push — ~100 commit local trên `main`** |

## 2. Việc phải làm tiếp — theo thứ tự

> **Cập nhật 23/08 (sau VA-R1/R2/gate RVA ✅):** mục 1–3 dưới đây ĐÃ XONG, giữ lại làm sử. Việc còn lại = mục 4 (push + §7b chạy thử thật + việc người H1–H9) + nợ NÊN §9 (F4 ảnh trơ · F5 thử lại N5 · NHOM_HUY_HOAN gộp nguồn).

1. **Quyết VA-R2 dở dang** — nằm ở **nhánh `wip/va-r2`** (3 commit, `main` sạch không dính):
   `src/orders/hang-cho.js` · `src/pos/tao-don.js` · `src/pos/doc-danh-muc.js` (+186/−27) +
   `db/migrate/007_idempotent_tao_don_va_don_vi_tien.{up,down}.sql`. **CHƯA nghiệm thu, chưa
   có `ops/bin/nghiem-thu/va-r2.sh`, migration 007 CHƯA áp** (thợ báo lúc bị dừng: «007 không
   được nhận, vẫn 6 bản — kiểm regex `danhSachBan()` trong `db/migrate.js`»). Hai lựa chọn:
   `git checkout wip/va-r2` làm tiếp theo `docs/thi-cong/phieu/PHIEU-VA-R2.md`, hoặc bỏ nhánh
   làm lại từ đầu trên `main`.
1b. **VA-R1 chưa ai đụng file nào.** Ghi chú thợ để lại lúc bị dừng (đáng đọc trước khi làm):
   trong repro `refute-MANG-2.repro.mjs` có ca **S4b** kỳ vọng `nguonDangMo()=true` khi
   `V3_NAP_DEV=1` trên DB `aicloser_v3` (localhost) ⇒ nếu chốt điều kiện «chỉ mở khi tên DB
   chứa `_test_`» sẽ PHÁ S4b; nên chốt theo **host localhost/sandbox** thay vì tên DB, và grep
   hết caller của `worker.js` trước khi đổi điều kiện.
2. **Làm VA-R1** theo `docs/thi-cong/phieu/PHIEU-VA-R1.md` (chưa ai đụng).
3. **Gate RVA:** chạy 13 cổng `ops/bin/nghiem-thu/{l*,va-*}.sh` (rc đo TÁCH DÒNG) + toàn bộ
   `node --env-file=.env --test test/l0-* test/l1-* test/l2-* test/l3-* test/va-*` + hai repro
   `docs/thi-cong/nhat-ky/refute-MANG-2.repro.mjs` và `refute-tong-the-1.repro.mjs` phải
   **0 dấu 🔴** (đếm bằng `grep -c "🔴"` rồi IN TỪNG DÒNG — repro luôn thoát rc=0 kể cả khi đỏ).
4. Sau đó mới tính push + §7b chạy thử thật + việc người H1–H9.

## 3. Dựng lại môi trường (máy mới)

```bash
git clone <repo>            # hoặc copy nguyên thư mục này
npm install
docker run -d --name talpha-pg -e POSTGRES_USER=aicloser -e POSTGRES_PASSWORD=aicloser_dev \
  -e POSTGRES_DB=aicloser_v3 -p 5433:5432 -v talpha-pg-data:/var/lib/postgresql/data postgres:16
npm run migrate && npm run di-tru        # 001→006, 21 bảng
```

⚠️ `.env` KHÔNG có trên git (chứa secret thật). Lấy từ gói bàn giao nội bộ
`ban-giao-noi-bo-20260819/messenger-closer/.env`; **phải có `PANCAKE_READONLY=1`** và
thêm hai dòng dev: `DATABASE_URL_V3=postgres://aicloser:aicloser_dev@localhost:5433/aicloser_v3`
+ `V3_KHOA_MA_HOA=<32 byte hex>`. Bảng biến v3: `docs/v3/ban-giao/bien-moi-truong-v3.md`.

## 4. Bốn luật không được vi phạm (§0a sổ)

1. `.env` máy dev LUÔN `PANCAKE_READONLY=1` — máy dev không được gửi tin/ghi ra khách thật.
2. Không xoá đơn POS ở bất kỳ trạng thái nào.
3. Chỉ thao tác repo này + máy chủ `169.58.33.8`.
4. Không đụng bản đang chạy: 62 file phẳng ngay dưới `src/` (đang phục vụ 51 page khách
   thật). Code v3 sống ở `src/db|pos|channels|chat|orders|queue` + `db/`.
   Bộ não chat DÙNG NGUYÊN, cấm sửa: `prompts.js` `closer.js` `tools.js` `fast-lane.js`
   `outbound-guard.js`.

## 5. Đọc gì để hiểu hệ

| Cần gì | File |
| --- | --- |
| Trạng thái sống + sổ nợ + §7b chạy thử + việc người | `docs/thi-cong/SO-DIEU-HANH-THI-CONG.md` |
| Ý đồ nghiệp vụ (thắng mọi tài liệu) | `docs/v3/01-QUYET-DINH.md` |
| Kế hoạch + 18 bảng + nghiệm thu từng luồng | `docs/v3/02-KE-HOACH-CODE.md` |
| Hợp đồng giữa các module (8 file) | `docs/v3/ban-giao/` |
| Vì sao từng phiếu làm thế | `docs/thi-cong/nhat-ky/phieu-*.md` |
| 10 CHẶN refute + 4 cụm vá | sổ §9 + §9b · verdict `docs/thi-cong/nhat-ky/refute-*.yaml` |
| Quy trình dây chuyền (nếu dùng lại) | `.claude/skills/{tong-dieu-phoi,tho-thi-cong,phan-bien-refute,review-nghiep-vu}` |

## 6. Bài học đắt nhất (đừng trả giá lại)

- **Gate xanh không có nghĩa là đúng.** 13/13 cổng + 328 test xanh mà refute vẫn lộ 10 lỗ
  đường tiền/gửi. Thước hiện đo «hệ có hỏng không», chưa đo «tiền có đúng, tin có bay không».
- **Repro in màu nhưng luôn `rc=0`** — cổng nào tin exit code là cổng hổng. Đếm dấu 🔴 bằng
  `grep -c` và IN TỪNG DÒNG (tổng đã hai lần suýt báo «sạch» sai vì đếm nhầm ký tự/regex hỏng).
- **Thước known-answer trôi theo cây sống** (neo «26 đơn», «2/1/1 dòng») — neo bằng DELTA
  hoặc bất biến TRƯỚC≡SAU, không neo con số chụp thời điểm.
- **`migrate.js down` gỡ bản MỚI NHẤT**, không phải bản mình muốn — lùi từng bản tới đúng ranh.
- **Commit phải mang pathspec** (kể cả commit sổ) — một lần commit không pathspec đã nuốt 6
  tệp code của phiếu khác. Thợ dùng private-index phải kết bằng `git reset -- <pathspec>`.
- **Đề bài có thể khai sai**: mã 8 POS là `packing` chứ không phải hủy (tài liệu cũ sai, bản
  đang chạy đếm thiếu đơn thành công) · `variation_id` là UUID không phải số · endpoint
  WhatsApp của Pancake **chưa tồn tại**. Luôn đo lại nguyên liệu trước khi code.
