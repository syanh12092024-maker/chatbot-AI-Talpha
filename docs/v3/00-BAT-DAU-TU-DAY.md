# BẮT ĐẦU TỪ ĐÂY

> Dành cho người mới nhận việc trong dự án này. Đọc hết file này trước, mất khoảng 10 phút.
> Cập nhật 22/08/2026.

---

## Dự án này là gì

Bot AI bán hàng trên Facebook Messenger và WhatsApp cho **~478 page**, thị trường **Trung Đông và Philippines**, hàng **thu tiền khi nhận (COD)**. Mỗi page bán đúng một sản phẩm.

Bot làm ba việc: **trả lời khách và chốt đơn qua Messenger** · **nhắn WhatsApp xác nhận đơn từ trang bán hàng** · **đẩy việc khó về cho sale**.

---

## Có hai bản, đừng nhầm

| | Bản đang chạy | Bản v3 đang thiết kế |
|---|---|---|
| Trạng thái | Đang phục vụ khách thật, 51 page bật AI | Chưa viết dòng code nào |
| Nằm ở đâu | `src/` — 13.304 dòng | Tài liệu trong `docs/v3/` |
| Lưu dữ liệu | 15 file JSON | PostgreSQL |
| Team | Không có khái niệm team | 3 team tách hẳn |
| Tài liệu | `docs/TONG-QUAN-HE-THONG.md` | `docs/v3/02-KE-HOACH-CODE.md` |

**Bản đang chạy vẫn phải sống bình thường trong lúc làm v3.** Không được để gián đoạn — nó đang có khách thật.

---

## Ba luật bất di bất dịch

1. **Máy cá nhân KHÔNG BAO GIỜ được gửi tin cho khách.** File `.env` ở máy bạn phải luôn có `PANCAKE_READONLY=1`. Thiếu dòng này thì máy bạn và máy chủ cùng trả lời một hội thoại — khách nhận tin đúp từ hai bot.
2. **Không xoá đơn hàng trên POS**, ở bất kỳ trạng thái nào, kể cả đơn test hay đơn trùng.
3. **Chỉ thao tác trên repo này và máy chủ `169.58.33.8`.** Không thêm remote mới, không deploy sang host khác, không đẩy code hay dữ liệu ra nơi thứ ba.

---

## Đọc gì, theo thứ tự

### Ai cũng đọc

| # | File | Nội dung |
|---|---|---|
| 1 | File này | Bức tranh chung |
| 2 | [`01-QUYET-DINH.md`](01-QUYET-DINH.md) | **Mọi quyết định đã chốt và vì sao.** Đọc để không đào lại chuyện đã quyết |
| 3 | [`02-KE-HOACH-CODE.md`](02-KE-HOACH-CODE.md) | Làm gì trước, làm gì sau, nghiệm thu thế nào |

### Người viết code

| # | File | Nội dung |
|---|---|---|
| 4 | [`../TONG-QUAN-HE-THONG.md`](../TONG-QUAN-HE-THONG.md) | Bản đang chạy hoạt động ra sao — 14 phần, đọc kỹ phần 5 và 6 |
| 5 | [`../BAN-GIAO-DEV.md`](../BAN-GIAO-DEV.md) | Deploy, máy chủ, các file không có trên git |
| 6 | [`../../README.md`](../../README.md) | 14 nguyên tắc AI chat với khách — **luật hành vi, không phải tài liệu kỹ thuật** |
| 7 | [`03-MAN-HINH.md`](03-MAN-HINH.md) | 37 màn hình v3, kèm link bản vẽ |

### Người làm nội dung, sale, marketing

| # | File | Nội dung |
|---|---|---|
| 4 | [`../HUONG-DAN-SALE-MKT.md`](../HUONG-DAN-SALE-MKT.md) | Hướng dẫn dùng bản đang chạy |
| 5 | [`03-MAN-HINH.md`](03-MAN-HINH.md) | Màn hình v3 sẽ trông thế nào |

### Đọc khi cần

| File | Khi nào cần |
|---|---|
| `docs/v2/` | Muốn hiểu vì sao bản đang chạy được thiết kế như vậy — có số đo thật từ 10/08/2026 |
| `90-phu-luc-bang-hoi-ky-thuat.md` | Hồ sơ: bảng hỏi kỹ thuật đã dùng để chốt nghiệp vụ |
| `91-phu-luc-bang-hoi-nghiep-vu.md` | Hồ sơ: bảng hỏi bằng tiếng thường, 62 câu đã trả lời xong |

---

## Bản vẽ màn hình

37 màn hình đã vẽ xong, chia 8 nhóm. Xem bản vẽ tương tác:

- **Màn hình v3** — <https://claude.ai/code/artifact/34dbfd0d-50cd-4e95-b07e-6adf202c7632>
- **Thiết kế hệ thống** — <https://claude.ai/code/artifact/e9a6da26-43c6-45fc-a6fa-611a2d0c1c99>
- **Kế hoạch code** — <https://claude.ai/code/artifact/53dcf438-7d94-4c5b-83e3-70922fb4f9ea>

Danh sách màn hình dạng chữ nằm ở [`03-MAN-HINH.md`](03-MAN-HINH.md).

---

## Chạy thử ở máy mình

```bash
cd messenger-closer
npm install
cp .env.example .env      # rồi điền giá trị thật — xin ở BAN-GIAO-DEV.md mục 5
npm start                 # dashboard: http://localhost:3100/admin
```

Thử AI ngay trong terminal, không cần Facebook:

```bash
npm run chat
```

Chạy bộ kiểm thử:

```bash
npm test
```

**Lưu ý:** token Pancake chạy từ IP máy cá nhân thường bị chặn (lỗi 121 trên mọi page). Muốn xem dữ liệu Pancake thật thì phải chạy trên máy chủ — đừng mất thời gian gỡ ở máy mình.

---

## Bắt đầu từ đâu nếu bạn là người viết code đầu tiên của v3

Giai đoạn 1 có năm luồng, làm tuần tự. Luồng đầu là **L0 — nền dữ liệu, team và đăng nhập**. Chi tiết và tiêu chí nghiệm thu ở [`02-KE-HOACH-CODE.md`](02-KE-HOACH-CODE.md).

Trước khi viết dòng nào, làm bốn **điểm kiểm chặn** trong tuần đầu — mỗi cái một ngày, và kết quả có thể đổi cả nhánh thiết kế. Xem mục 5 của kế hoạch.
