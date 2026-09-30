# MỞ VAN — VE7c · VE7d · VE7e: Cài đặt nói đúng thứ bot dùng (Model · Người và team · Nhật ký) (CR-28-09c)

> **TRẠNG THÁI: CHỜ GẬT** — soạn 01/10. Phiếu: `phieu-VE7c.md` · `phieu-VE7d.md` · `phieu-VE7e.md`. Lượt trước:
> `phat-hanh-20260930-ve7-ve8.md` (prod `ecce575`, GIỮ).

## 1 · Mở cái gì

MÃ `ecce575 → HEAD`: VE7c `4dd6b93` + giấy `f701f30` · VE7d `e258e14` + `7266c60` · VE7e `61863a1` + `0cc373a` · hồ sơ lô trước
`ef0a40d` · hồ sơ này. **0 migration** · **0 biến** · **0 gói** · **0 tệp bộ não**.
Một tệp đường chat: `src/chat/model.js` — tách `chonModel` / `khoaCuaBot` khỏi `layModel` (hành vi `layModel` y nguyên: ca
`l2-m1-nhac-truong` N3/N3c + `journey-chat-e2e` + handler xanh; ca VE7c C9 đo `chonModel` ≡ `layModel` mọi nhánh; cổng `l2-m2`
đỏ Y HỆT trên `HEAD` trước khi tách — đo ở worktree riêng).

**Ai chạy code đổi (đo 01/10):** `src/chat/model.js` nạp bởi `aicloser-worker-v3` (handler-v3) và `aicloser-v3` (dịch bản máy ·
Vận hành · màn Model); bot cũ (`src/server.js`) không nạp. Hành vi `layModel` không đổi ⇒ **chỉ restart `aicloser-v3`**; worker
giữ bản cũ trong bộ nhớ (cùng hành vi) tới lần restart sau. Màn + danh mục mã nhật ký chỉ `aicloser-v3` đọc.

## 2 · Bậc phơi

Bậc ② — prod, đường nội bộ (màn quản trị). Khách không thấy gì: không đổi chữ bot nói, không đổi model bot gọi.
Hai thao tác MỚI có tác dụng ra ngoài, cả hai chỉ quản trị bấm được: «Thay khoá và thử một lượt» gọi nhà model MỘT lần (16 token,
vài đồng; chặn bấm dồn 10 giây) · dán khoá cho team chưa lưu cấu hình tạo cấu hình riêng (đường có sẵn từ trước — màn nói trước).

## 3 · Cửa vào (01/10)

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | ✔ (sau commit hồ sơ này) |
| ② | Nhánh | chưa đẩy 8 commit so với nhánh prod (`ecce575`) |
| ③ | `npm test` (trên `61863a1`) | **2.434 ca · 2.430 đạt · 0 đỏ · 4 bỏ qua** |
| ④ | Cổng | **49 xanh / 12 đỏ** = đúng 12 nợ cũ (b-y3 bh1 bh7 g2-a3 l0-m1 l1-m2 l2-m1 l2-m2 l2-m3 l3-m4 va-r1 va-r2); `ve7c` 17/17 · `ve7d` 15/15 · `ve7e` 10/10 (lồng nhau) |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑥ | Biến `V3_*` | lượt này không đặt biến |
| ⑦ | Prod (00:33:42 CEST 01/10) | `ecce575` · 0 tệp theo dõi sửa tại chỗ · ba dịch vụ active (`aicloser-v3` từ 30/09 11:40:31) · lỗi 1 giờ **0/0/0** · `/health` **131** |

## 6 · Ngưỡng + mốc quan sát

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| +1′ | sống, không vòng restart | `is-active` · `Started` từ giờ restart | chết / >1 = lùi |
| +1′ | mã mới trên đĩa | `chonModel` · `khoaCuaBot` (src/chat/model.js) · `baVaiCua` · `TEN_VIEC_MAY` · `/api/model/thu` có mặt | thiếu = điều tra |
| +1′ | cửa vẫn sống | `/model-ai` `/cau-hinh-team` `/nhat-ky` · `/api/model/cau-hinh` `/api/team/thanh-vien` `/api/nhat-ky` 401 (chưa đăng nhập) · `/api/model/thu` POST 401 · đối chứng 404 | 5xx = lùi |
| +5′ · +15′ | lỗi mới | journalctl ba dịch vụ | lỗi mới lặp = lùi |
| +15′ | hai dịch vụ KHÔNG restart | `ActiveEnterTimestamp` y nguyên · `/health` | đổi = điều tra |
| sau deploy (người) | màn Model nói đúng | team 1: «Bot đang gọi kimi-k2.6 · khoá riêng của team · độ ngẫu nhiên 0,3»; bấm «Thay khoá và thử một lượt» (ô khoá TRỐNG) một lần ⇒ «Khoá dùng được» hoặc câu lỗi đọc được | câu lỗi = xem (khoá/tài khoản), không phải lỗi deploy |

## 7 · Đường lùi

```bash
cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 ecce575 && systemctl restart aicloser-v3    # < 1 phút
```
Lùi CODE; không có lược đồ để lùi. Mất dữ liệu: không (dòng `thu_model` trong nhật ký — nếu đã bấm thử — ở lại, bảng chỉ thêm).
Worker không restart ở lượt này nên không có gì để lùi ở worker.
