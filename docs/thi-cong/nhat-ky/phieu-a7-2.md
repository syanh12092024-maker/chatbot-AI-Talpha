# A7-2 · NỐI HỘI THOẠI MESSENGER VÀO HỒ SƠ KHÁCH — 26/08/2026

Lát thứ hai của A7. A7-1 (khoá định danh) đã nghiệm thu; theo luật tuần tự thì A7-2 mới
được mở. A7-3 (cửa đọc hồ sơ) chưa mở.

---

## 1 · Đo trước khi viết

Trên CSDL thật (`aicloser_v3`, VPS):

```
hoi_thoai:  28.953 dòng · 790 có ho_so->>'phone' · khach_id NOT NULL: 0
```

**Không một dòng nào trong 28.953 từng được nối.** Grep xác nhận không có chỗ nào ghi
`hoi_thoai.khach_id` — cột tồn tại từ migration 001 và chưa ai dùng.

Nước tra qua `pos_shop_id`, trong số 790 hội thoại CÓ SĐT:

| Saudi | UAE | Kuwait | Qatar | Bahrain | Oman | không tra được |
|---|---|---|---|---|---|---|
| 520 | 226 | 36 | 5 | 1 | 1 | **1** |

**789/790 = 99,9%** tra được. Và **746/790 = 94% nằm đúng cặp Saudi+UAE** — cặp mà A7-1
vừa tách ra. Nếu làm A7-2 trước A7-1 thì 94% dữ liệu vào sai chỗ ngay lượt đầu; thứ tự
hai lát này không phải sở thích.

---

## 2 · Ba quyết định

**① Nước tra qua `pos_shop_id`, không qua `page.thi_truong`.** Đã đo 23/08 ở
`hang-cho.js`: khớp theo TÊN trúng **0/502** page (`KSA` vs `Saudi`). Tôi không dựng lại
`traMarketCuaPage` — nhưng cũng không gọi nó: job này quét hàng loạt nên cần một câu JOIN
một lượt, còn `traMarketCuaPage` là tra-từng-page (hai `pool.query` mỗi lượt gọi). Cùng
LUẬT, khác HÌNH DẠNG truy vấn; luật được khoá lại bằng cổng ② (`grep` cấm join theo
`p.thi_truong`, bắt buộc có `pos_shop_id` và `k.bat`).

**② Hội thoại không tra được nước ⇒ BỎ QUA và ĐẾM**, không tạo `khach` nước-NULL. Tạo
một dòng `thi_truong = NULL` là cố ý đẻ một bản trùng: khoá `|sdt` không bao giờ gộp với
`Saudi|sdt` của cửa POS. Bỏ qua thì lượt sau tự nối khi page có `pos_shop_id`. Số bỏ qua
đi ra `kq.thieuNuoc` **kèm tên page đang chặn**, và `viSaoRong()` nói thẳng phải điền cột
nào — bài học 3 của GD2 («màn hình rỗng phải nói VÌ SAO rỗng»).

**③ KHÔNG dựng cửa UPDATE hẹp thứ NĂM.** `ti-le-hoan.js` phải tự dựng `CAU_GHI_CHAM` vì
lúc đó `suaTheoId` chưa nhận `ctxHeThong()` — nợ N3, cắn bốn lần, và §9 đã chốt «bản vá
đúng là suaTheoId cho ctxHeThong rồi gộp CẢ BỐN về một». G2-A1 cấp `ctxHeThong()` +
`{neu}` rồi, nên job này đi cửa chung. Ghi là **so-và-đặt** `{neu: {khach_id: null}}`:
trượt nghĩa là lượt khác vừa nối, không phải lỗi.

Một chi tiết phải tra tài liệu mới biết: `ctxHeThong()` đòi `team_id` **tường minh**, đặt
ở `duLieu` HOẶC `neu` (ban-giao §3c). Tôi đặt ở `neu` — ở đó nó vừa khai team vừa là vế
«chỉ sửa dòng của team mình», một chỗ làm hai việc.

---

## 3 · Nghiệm thu

```
bash ops/bin/nghiem-thu/a7-2.sh          → ĐẠT 8 · TRƯỢT 0 · rc=0
node --test test/a7-2-noi-ho-so.test.js  → 10 pass / 0 fail   (Postgres 16.15 thật)
```

Ca chính là **G3**: cửa POS đọc một đơn Saudi → tạo khách; rồi hội thoại Messenger của
CÙNG người trên page cùng shop → phải **nối vào dòng đó**, `khachMoi = 0`, tổng `khach`
= 1, và `hoi_thoai.khach_id === don_hang.khach_id`. Đó là toàn bộ mục đích của A7.

**G4 là ca KHÔNG khớp** và nó bắt buộc phải có: cùng số, khác nước ⇒ hai hồ sơ. Không có
G4 thì G3 vẫn xanh trên một bản cài gộp bừa mọi thứ làm một — đúng bài học B-Y7 25/08.

Quét hồi quy: **482 ca · 467 pass · 4 fail** — `D1`·`D9`·`D10` + `l2-m3-rap-prompt`, cùng
đúng bốn cái đã A/B ở lượt A7-1. Không thêm đỏ nào.

---

## 4 · Lượt đảo-vá SỐNG SÓT — và đó là phần đáng giá nhất của lượt này

Đổi `khoaKhach(h.market, h.sdt_tho)` → `khoaKhach(null, …)` thì **cả 9 ca vẫn xanh**.

Phản xạ sai ở đây là kết luận «vậy khoá không quan trọng» hoặc «thước cùn». Đo tiếp thì
ra: câu tra CSDL còn kẹp `thi_truong = $2`, nên với mỗi hội thoại đi RIÊNG LẺ hành vi vẫn
đúng — cửa RA cứu được cửa VÀO (án lệ #31). Lỗ thật mà đột biến mở nằm ở **bản đồ trong
lượt** (`banDo`), thứ chỉ lộ ra khi hai hội thoại **cùng số, khác nước, trong CÙNG một
lượt**: cái thứ hai ăn khách của cái thứ nhất và không lần nào chạm CSDL để biết mình sai.

Bộ ca của tôi không có ca nào như thế. **Ca `G10` sinh ra từ chính lượt đảo-vá đó**, và
phép ⑤ của cổng giữ nó lại để sau này không ai xoá G10 mà cổng vẫn xanh.

Bài học ghi §9: đảo-vá không đỏ thì câu hỏi đúng là **«nhánh nào của đột biến này chưa ai
đo»**, không phải «vậy là code đúng rồi».

---

## 5 · Còn treo

1. **`khach` vẫn 0 dòng** — thiếu đúng một lượt chạy `docDon` thật trên 7 shop. Code hai
   đầu đã khớp nhau ở bộ ca. Lượt đó GHI vào CSDL thật ⇒ cần người gật, và nên chạy **sau**
   khi 013 lên được VPS, kẻo nạp theo khoá cũ rồi phải gỡ ngược.
2. **012 vẫn chưa lên VPS** (`cdae76d`+`0787283` chưa push) — CSDL thật đang ở 011, khe
   `011 → [012] → 013` chưa đóng.
3. **A7-3 (cửa đọc hồ sơ)** chưa mở. Người B đang chặn màn «Hồ sơ khách hàng» ở đúng hai
   vế: `khach` 0 dòng (mục 1) và `khach_id` 0/28.953 (**A7-2 đã gỡ vế này**).
4. **«Kênh thứ ba» vẫn chưa có**: `don_hang.nguon CHECK IN ('trang_ban_hang','messenger')`.
   Tôi cố ý không dựng sẵn nhánh WhatsApp — một nhánh không có dữ liệu đi qua là một nhánh
   không ai biết đúng sai. Khi cửa WhatsApp có thật thì nó nối vào cùng `khoaKhach`.
