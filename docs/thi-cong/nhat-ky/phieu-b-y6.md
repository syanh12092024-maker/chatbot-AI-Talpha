# NHẬT KÝ PHIẾU B-Y6 — ba chỗ lược đồ chặn sóng 2

> Người A · 25/08/2026 · nhánh `main` · làn 🟨 · đo trên **VPS · PostgreSQL 16.15**

---

## ⓐ · TẦNG TRÊN CỦA CÂY KỊCH BẢN — và một lỗi thiết kế CỦA TÔI ở G2-A5

Phiếu xin «một chỗ lưu được kịch bản không gắn page». Tôi **đã làm ở migration 010**
(G2-A5), trước khi phiếu này tới — nhưng đọc kỹ thì hình dạng của tôi có một chỗ hỏng thật.

010 dựng cây `sản phẩm → (sản phẩm × nước) → page`, và ràng bằng `kich_ban_khoa_dung_cap`:
bản `cap='nuoc'` **bắt buộc** có `san_pham_ma`. Mà đo lại:

```
san_pham            : 0 dòng          ← tầng sản phẩm không có khoá nào
page.thi_truong     : 140/514 page    ← tầng nước thì CÓ dữ liệu
```

Tức là **tôi treo một tầng dùng được (nước) vào một tầng chưa tồn tại (sản phẩm)**. Tầng
nước của tôi chưa bao giờ tới được page nào. Cách của B — khoá bằng `thi_truong` một mình —
sống được ngay cho 140 page.

Migration 012 gỡ đúng chỗ đó: `cap='nuoc'` chỉ bắt buộc `thi_truong`; `san_pham_ma` thì
tuỳ. Cây thành **bốn mức**, hẹp trước rộng sau:

```
sản phẩm  →  (sản phẩm × nước)  →  NƯỚC  →  page
```

Và phiếu chỉ đúng một cái lỗ tôi để lại: `UNIQUE (team_id, san_pham_ma, thi_truong)` KHÔNG
ràng được khi `san_pham_ma` là NULL — hai NULL trong Postgres là khác nhau, nên **hai bản
LIVE cùng một nước sẽ lọt**. Bịt bằng `coalesce(san_pham_ma, '')`. Ca `K19` khoá lại.

> Tôi giữ vốn từ của mình (`cap` · `san_pham_ma` · `thi_truong`) thay vì đổi sang
> `pham_vi`/`khoa_pham_vi` của phiếu — phiếu cho phép («A muốn hình dạng khác thì cứ đổi»),
> và đổi tên cột lúc này là bắt B viết lại phần đã chạy mà không được gì thêm.

## ⓑ · LỚP TRẢ LỜI 0 ĐỒNG — bảng `mau_0_dong`

Hôm nay `fastLanePrice`/`fastLaneShip`/`fastLaneHowto` nằm trong `kich_ban.noi_dung_nguoi`
theo TỪNG PAGE ⇒ 514 page là 514 lần gõ lại cùng một câu trả lời phí ship.

Bảng mới có `tu_khoa text[]` (đối chiếu bộ từ khoá Botcake bằng `&&`, có chỉ mục GIN) và
một bộ đếm `so_lan_chan`.

**Chỗ dễ sai nhất là MẪU SỐ.** Phiếu gợi ý «B tự đếm từ `so_ai.loai='reply'` nếu A cho biết
cách phân biệt». Không có cách nào — vì **lượt 0 đồng KHÔNG gọi model nên KHÔNG đẻ dòng
`so_ai` nào**. Đếm ở `so_ai` là đếm cái không tồn tại, và lấy `so_ai` làm mẫu số là chia cho
đúng phần KHÔNG bị chặn: tỉ lệ luôn đẹp và luôn sai. Nên:

```
tổng lưu lượng = (bị chặn, đếm ở mau_0_dong) + (có gọi model, đếm ở so_ai)
[S18] chặn 20 · gọi model 39 · tổng 59 · tỉ lệ 0.34
```

Và bộ đếm cộng **nguyên tử trong CSDL**, không `đọc → +1 → ghi`: hai lượt chat đồng thời
cùng khớp một mẫu thì cả hai đọc cùng một số rồi cùng ghi số đó+1 — mất một lượt, im lặng.
Một bộ đếm đếm thiếu thì con số «chặn ≥33%» không nghiệm thu được. Ca `S16`: **20 lượt đồng
thời → đúng 20**.

⚠️ Đã khai thẳng trong kết quả trả về: `so_lan_chan` là bộ đếm **cộng dồn**, không cắt theo
khoảng, còn `soLuotGoiModel` thì có cắt. Hai vế khác thước ⇒ tỉ lệ chỉ đúng khi khoảng đo
phủ toàn bộ thời gian. Muốn cắt theo khoảng thì cần một bảng lịch sử từng lượt chặn — chưa
có, ghi §9.

Và bảng được thêm vào `BANG_NGHIEP_VU_CHUAN`: không thêm thì màn của B **không đụng được nó
bằng đường nào cả** — tầng truy vấn chặn mọi bảng ngoài danh sách.

## ⓒ · THƯ VIỆN ẢNH — phiếu hỏi «ảnh đang ở đâu», đây là câu trả lời

Không dựng bảng. Phiếu dặn đúng: *«A cho biết ảnh hiện lưu ở đâu, rồi mới bàn bảng.»*

**Ảnh nằm trong `kb-overrides.json`**, lồng ở `page → products[] → images[]`:

```json
{ "url": "/uploads/1100561323151723-test-1783503087753.webp", "label": "Ảnh sản phẩm" }
```

Đo được:

| | |
|---|---|
| Ảnh khai trong `kb-overrides.json` | **32** ảnh / 7 page |
| Số NHÃN khác nhau | **5** — `Ảnh sản phẩm` · `Thành phần` · `Chứng nhận` · `Ảnh feedback` · `Feedback` |
| Tệp thật | `public/uploads/` — **49 tệp · 34 MB** trên VPS (17 tệp ở máy cá nhân) |
| Nơi bot lấy ảnh ra gửi | `src/handler.js:270` → `state.pendingImages` từ `fl.images` |

⇒ **B đoán đúng**: chỉ cần một bảng NHÃN trỏ tới URL sẵn có, không cần lưu tệp. Nhưng thiết
kế bảng đó cần một câu chốt mà tôi không tự trả lời được: *nhãn thuộc về ẢNH hay thuộc về
(ảnh × ngữ cảnh)?* — «Ảnh feedback» và «Feedback» đang là hai nhãn khác nhau cho cùng một
thứ, tức bộ nhãn hiện tại chưa được chuẩn hoá. Dựng bảng trước khi chốt bộ nhãn là dựng
một bảng phải sửa ngay. **Ghi §9, chờ người quyết.**

## BẰNG CHỨNG MÁY

```
l0-m2-kich-ban  20 pass / 0 fail    [K17] tuDau="kế thừa từ tầng NƯỚC (cả nước Bahrain)"
                                    [K18] có cả hai mức → dùng "HẸP"
l0-m2-so-lieu   18 pass / 0 fail    [S16] 20 lượt đồng thời → so_lan_chan=20
                                    [S18] chặn 20 · gọi model 39 · tổng 59 · tỉ lệ 0.34
l0-m1-luoc-do   13 pass / 0 fail    (24 bảng)
```
