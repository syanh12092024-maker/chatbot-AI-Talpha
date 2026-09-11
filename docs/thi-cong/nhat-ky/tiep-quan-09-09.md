# NHẬT KÝ TIẾP QUẢN — 09→11/09/2026 · phiên mới, người mới nhận maintain

> Phiên tiếp quản (không nhận vai TỔNG, không cầm phiếu nào) · HEAD lúc vào `ccc6be5` ·
> bảy phép đo của skill `tiep-quan`: **bốn đo được, ba mù** vì máy không có `.env` lẫn
> Postgres · cổng tĩnh `ops/bin/kiem-tinh.sh` rc=0 (PHÉP=5 · ĐỎ=0) · không commit gì trong
> pha đo · sáu mục nợ đã ghi §9.

## 1 · Bảy phép đo — output máy

| # | Phép | Kết quả |
| --- | --- | --- |
| ① | commit + cây | HEAD `ccc6be5` · 2 tệp `M`: `.claude/skills/{tho-thi-cong,tong-dieu-phoi}/SKILL.md` (có sẵn từ trước phiên) |
| ② | chưa push / nhánh lạc | 1 commit chưa push · remote: `main` · `docs/thiet-ke-v3` · `v3/vai-b` · `wip/va-r2` (nhánh wip đã gộp, xoá được) |
| ③ | `npm test` | ⛔ KHÔNG CHẠY ĐƯỢC — thiếu `.env` và Postgres |
| ④ | 25 cổng nghiệm thu | ⛔ KHÔNG CHẠY ĐƯỢC — mọi cổng cần CSDL |
| ⑤ | CSDL dev | ⛔ KHÔNG CÓ — máy không có `docker`, không có `psql`; container `talpha-pg` chưa từng dựng ở đây |
| ⑥ | `PANCAKE_READONLY=1` | ⚠️ KHÔNG CÓ `.env` ⇒ không có token ⇒ máy này chưa thể gửi tin. Xin được `.env` thì việc ĐẦU TIÊN là kiểm dòng đó |
| ⑦ | prod `169.58.33.8` | chưa chạy — phép chỉ-đọc, chờ lệnh người quyết |
| ＋ | cổng tĩnh | `bash ops/bin/kiem-tinh.sh` → **rc=0 · PHÉP=5 · ĐỎ=0** · 349 tệp JS parse được · 26 cổng nguyên vẹn · 28 phiếu · 51 tệp nhật ký |

```
$ node -v
v24.19.0                      ← sổ khai Node v25; ba cổng a7-* nhận khuôn Node 25
$ which psql pg_ctl docker
(không có cái nào)
```

## 2 · Đối chiếu — bốn chỗ sổ khai lệch với máy

| Chỗ | Sổ khai | Máy đo |
| --- | --- | --- |
| 💓 nhịp tim | «SÓNG VÁ 2/4 · đang chạy VA-R1+VA-R2 · repro còn 5 dấu 🔴» | VA-R1 ✅ `1562d58` · VA-R2 ✅ `5caf5be` · gate RVA ✅. Nhịp tim đứng ở 23/08 trong khi §10 đã ghi tới 01/09 |
| §5b bảng | VA-R1 · VA-R2 = «🎫 chờ review» | cả hai đã có cổng riêng (`va-r1.sh` 12/12 · `va-r2.sh` 17/17); §10 01/09 báo 25/25 cổng rc=0 |
| BAN-GIAO §1 | «chưa push — ~100 commit local» | `origin/main` = `af1e764`; còn 1 commit chưa push |
| môi trường | «Node v25 · CSDL dev ở migration 007» | Node v24.19.0 · không có CSDL nào |

Bốn dòng này đã đổ vào §9 (mục ⬜ «giấy tờ trôi»). **Không tự sửa bảng** — luật 9.

## 3 · Đo tiếp 10–11/09 — ba phát hiện nặng hơn cả bốn chỗ trên

### 3a · Bot tắt 13,7 ngày, bảng sức khoẻ báo XANH

Đọc `/admin/api/ops/health` trên **cổng 3100** lúc 02:55 UTC 11/09:

```
context.aiPages          = 0        ← không page nào bật AI
context.repliesSinceBoot = 0        ← server chạy 21,3 giờ, chưa gửi tin nào
context.lastLogAt        = 28/08/2026 09:56 UTC   → 13,7 NGÀY trước
probe.ok = true · 773ms · kimi-k2.6 · lastOkAt = 0 phút trước
pancake_token: 0/6 chết · pages_backoff: 0 · level: "green"
```

Tầng LLM khoẻ, token sống, không page backoff ⇒ **không phải H6 tái phát**. Bot không
chết — bot đang TẮT. Vì sao không đèn nào đỏ: xem §9 (hai check bị ép xanh bởi `aiPages > 0`).

### 3b · Máy chủ chạy hai app, tài liệu khai một

```
$ curl -s -D - http://169.58.33.8:3102/ -o /dev/null
HTTP/1.1 302 Found
Location: /dieu-phoi                  ← đường của bản v3
$ curl -s -o /dev/null -w "%{http_code}" http://169.58.33.8:3100/admin/api/pages
401  "Cần đăng nhập."                 ← nguyên văn src/server.js:48 ⇒ 3100 = repo này
```

`v3/chay-that.js:144` → `CHAYTHAT_CONG || 3102`. Tức 3100 = v1 (`/admin`), 3102 = v3
(`/dieu-phoi`). `docs/TONG-QUAN-HE-THONG.md §3.2` chỉ khai bốn app: 3000 · 3001 · 3002 · 3100.

Giá phải trả: nửa buổi tưởng mất mã nguồn, vì lệnh gọi `/admin/api/*` chạy ở tab 3102 ra 404.

### 3c · Hai chỗ lược đồ lệch với hình dạng kinh doanh

Người quyết mô tả 11/09: mỗi page bán một SP, **một SP ở nhiều page nhiều thị trường**.

- `san_pham` có `UNIQUE (team_id, ma)` + ĐÚNG MỘT `page_id` ⇒ một SP không gắn được nhiều page.
- `san_pham.ma` = `` `${ketNoi.shopId}:${v.id}` `` (`src/pos/doc-danh-muc.js:102`) mang theo mã
  shop, mà mỗi thị trường là một shop ⇒ tầng `cap='san_pham'` của cây kịch bản ba tầng
  không phủ được nhiều nước, và tầng `cap='nuoc'` thành dư.

⚠️ **Suy từ lược đồ, CHƯA đo trên dữ liệu thật** — máy không có CSDL. Chi tiết ở §9.

## 4 · Nước đi đề nghị

**Xin gói bàn giao nội bộ (`.env`) + dựng Postgres 16.** Bốn trong bảy phép đang mù, và
không phiếu nào nghiệm thu được khi chưa chạy nổi `npm test` và 25 cổng.

Ba dự phòng nếu chưa xin được: ① nạp `soi-lech` soi `docs/v3/ban-giao/*` với code (chỉ đọc)
· ② nhận vai TỔNG một lượt, sửa nhịp tim + §5b cho khớp máy · ③ đẩy H8 (chọn 3 page thử) —
việc người, không cần máy.

**Nhưng trước cả ba: hỏi ai tắt bot ngày 28/08 và vì sao.** Bật lại mà chưa biết lý do là
tái hiện đúng sự cố đã khiến người ta tắt.
