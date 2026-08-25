# NHẬT KÝ PHIẾU B-Y5 — cửa ĐỌC không ghi nhật ký cho `ctxHeThong()`

> Người A · 25/08/2026 · nhánh `main` · làn 🟨 · đo trên **VPS · PostgreSQL 16.15**

---

## 0 · ĐO LẠI — nặng hơn phiếu khai

Phiếu đo được 15 dòng `doc` cho ba lượt xem. Đo lại hôm nay:

```
$ SELECT hanh_dong, count(*) FROM nhat_ky GROUP BY 1
doc | 1557
```

**1557 dòng, và 100% là `doc`.** Không một dòng nghiệp vụ nào. Cuốn sổ sinh ra để trả lời
«ai làm gì, lúc nào» hiện toàn tiếng ồn.

Ba hệ quả, và cái thứ ba mới là cái đau:

- `nhat_ky` có trigger `tg_chi_insert_nhat_ky` — **cấm xoá, kể cả chủ CSDL**. Rác nằm vĩnh viễn.
- Màn «Nhật ký thao tác» lọc theo `hanh_dong` — mọi dòng thật bị chôn.
- **Máy trạng thái màn «Bộ luật chung» của người B SUY TRẠNG THÁI từ chính bảng này**
  (`kho-bo-luat.js`: không có dòng `ap_bo_luat` = chưa bao giờ chạy). Lấp `nhat_ky` là làm
  hỏng một công cụ mà code khác đang dựa vào — không chỉ làm bẩn một cái báo cáo.

Và phiếu nói đúng một điều quan trọng: **không phải lỗi của bên nào.** Luật «ghi cả việc
máy làm» đúng cho *job nền GHI dữ liệu*. Cái mới là một màn XEM đi qua cùng cửa đó.

## 1 · LÀM THEO ĐƯỜNG 1 CỦA PHIẾU — nhưng cờ nằm không thì vô dụng

`ctxHeThong({ ghiNhatKy: false })`, mặc định `true` nên mọi nơi gọi hiện có không đổi.
Cờ **chỉ** tắt cho lệnh ĐỌC; lệnh GHI luôn để lại dấu vết, không cờ nào tắt được.

Nhưng thêm cờ mà không ai bật thì bằng không có cờ — đúng cảnh `apBoLuat()` nằm đó chờ B
sang gọi. Nơi gây ồn là `src/chat/rap-prompt.js` (5 lời gọi `ctxHeThong()`), và đó là
`src/chat/*` — đất tôi được đụng. Nên tôi bật luôn ở đó, và ca **B22** khoá lại: nếu ai lỡ
tay trả nó về `ctxHeThong()` trần, ca đó đỏ.

## 2 · NHÁNH QUAN TRỌNG NHẤT

Phiếu ⑤#3 đánh dấu ⚠️ đúng chỗ: *cờ tắt phải chỉ tắt cho ĐỌC, không tắt cho GHI*. Tắt dấu
vết của một lượt GHI là chuyện khác hẳn — đó là xoá bằng chứng, không phải dọn rác.

```
[B18] mặc định: nhat_ky 6 → 7 (chờ +1)              ← không đổi hành vi cũ
[B19] 3 lượt ĐỌC với cờ tắt: 7 → 7 (chờ +0)
[B20] themMoi với cờ tắt:  7 → 8 (chờ +1)           ← GHI vẫn phải có dấu vết
[B20] suaTheoId với cờ tắt: 8 → 9 (chờ +1)
[B22] 2 bộ đọc khối prompt: 9 → 9 (chờ +0)          ← cờ được BẬT THẬT, không nằm không
```

## 3 · MỘT BỘ CA CHẬP CHỜN — ĐO RỒI MỚI KẾT LUẬN, KHÔNG NHẬN VƠ

Quét hồi quy sau lượt sửa cho `l2-m3-rap-prompt.test.js` **5 pass / 1 fail**, lỗi lạ:
`Unable to deserialize cloned data` — lỗi của BỘ CHẠY test, không phải assert nào đỏ. Chạy
thẳng `node test/...` thì 6/6.

Không đoán. Đo:

```
BẢN MỚI (có B-Y5): 2 đỏ / 8 lượt
BẢN CŨ  (HEAD)   : 2 đỏ / 8 lượt
```

**Tỉ lệ y hệt ⇒ chập chờn có SẴN, không phải do B-Y5.** Ghi §9, ngoài phạm vi phiếu.

Đáng nhớ: một bộ ca chập chờn ~25% **tệ hơn một bộ ca đỏ**, vì nó dạy người ta chạy lại cho
tới khi xanh. Và nó làm mọi lượt «quét hồi quy» của tôi trong phiên này có ~25% khả năng
hiện một dòng đỏ giả.

## 4 · NGOÀI PHẠM VI → SỔ NỢ

**Mặc định của cờ đang SAI, và tôi cố ý không tự lật.** Đo được: 1557/1557 dòng là rác, tức
mặc định «ĐỌC thì ghi» chưa từng phục vụ ai. Nhưng lật mặc định là bỏ một khả năng kiểm
toán (ai đó có thể cần dấu vết đọc bảng `khach` — nó mang SĐT và địa chỉ khách), và phiếu
⑤#1 khai thẳng «mặc định không đổi». Nên: làm đúng phiếu, ghi §9, để người quyết chốt.

- 1557 dòng `doc` đang có: **không dọn được**, `nhat_ky` cấm xoá. Cứ để.
- Đường 3 của phiếu (ghi MỘT dòng mỗi «phiên xem») đúng hơn về ngữ nghĩa nhưng cần một khái
  niệm «phiên» mà tầng truy vấn chưa có — không nhét vào phiếu này.
