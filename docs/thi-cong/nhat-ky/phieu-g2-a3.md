# NHẬT KÝ PHIẾU G2-A3 — gộp ba cửa ghi hẹp về một bộ dựng SQL

> Thợ: người A (trục dữ liệu) · 25/08/2026 · nhánh `main`
> Nợ đóng: ba đường `UPDATE` tay sinh ra vì `suaTheoId` quá hẹp (nợ N3, đã mở ở G2-A1)
> Môi trường đo: **VPS 169.58.33.8 · PostgreSQL 16.15**, sandbox tự dựng

---

## 0 · NỢ THẬT LÀ GÌ — đọc kỹ chỗ này trước khi "dọn nốt"

Câu nợ trong mã nguồn là: *«repo tạm có **ba đường UPDATE hẹp** thay vì một»*. Chỗ hỏng là
**ba bộ dựng câu SQL**, không phải ba cái hàm. Ba hàm đó mỗi cái còn thêm một thứ mà tầng
chung CỐ Ý không có:

| Cửa | Thứ nó thật sự thêm | Xoá được không |
|---|---|---|
| `src/chat/kho.js` | allow-list cột của đường chat · khuôn jsonb · nhật ký giấu nội dung khách | **không** — giữ, nhưng bỏ câu SQL |
| `src/pos/kho.js` | allow-list 3 bảng POS · nhật ký ghi CẢ lượt 0 dòng | **không** — giữ, bỏ câu SQL |
| `src/orders/may-trang-thai.js` | CAS + **ném** `LoiGhiDonAnhCu` | **không** — giữ, bỏ câu SQL |

Nên lượt này gộp **câu SQL**, không xoá file. Sau lượt gộp, ba cửa còn **0** câu `UPDATE`
tay, và mọi đường ghi đi qua đúng một bộ dựng ở `src/db/truy-van.js`.

## 1 · BỐN CÁI BẪY, MỖI CÁI SẬP THẬT TRONG LƯỢT NÀY

**① MẢNG JS vào cột jsonb.** Đo trên Postgres 16.15:

```
suaHoiThoai (bản cũ, có JSON.stringify) : jsonb_typeof=array  ✅
suaTheoId thẳng, truyền mảng JS         : NÉM «invalid input syntax for type json»
suaTheoId sau khi JSON.stringify        : jsonb_typeof=array  length=2  ✅
```

`pg` tuần tự hoá mảng JS thành mảng **POSTGRES** `{a,b}`, không thành JSON.
`hoi_thoai.moc_luot_llm` là cột jsonb nhận MẢNG — bỏ `JSON.stringify` lúc gộp là hỏng đúng
cột đó. **Trước lượt này KHÔNG bộ ca nào ghi `moc_luot_llm` qua `suaHoiThoai`** (đã grep),
nên nó sẽ hỏng câm. Nay có ca `G1` khoá, và ca `G2` là **vế đảo chiều**: bỏ stringify ra thì
phải đỏ.

**② Guard đầu tiên tôi viết QUÁ CHẶT — và nó làm đỏ 5 ca.** Bản đầu tôi chặn mọi mảng trong
`duLieu`. Chạy hồi quy thì `l1-m1-doc-pos` 2 đỏ · `va-q12-doc-don` 2 đỏ:

```
error: 'duLieu."san_pham_ma" là MẢNG — tầng truy vấn không đoán kiểu cột đích…'
```

Đo lại lược đồ: `don_hang.san_pham_ma` là **`text[]` THẬT**, và `ky_nang.bat_cho_nhom_sp`
cũng vậy. Truyền mảng vào đó là ĐÚNG. Nên đổi cách: **không chặn trước, chỉ DỊCH LẠI câu
lỗi** khi Postgres thật sự ném lỗi json — không tốn gì ở đường lành, và người gặp lỗi biết
ngay phải làm gì. Ca `G3` khoá chiều này lại.

**③ `sua_luc` dùng đồng hồ nào.** Bản cũ đặt `sua_luc = now()` — **đồng hồ CSDL**. Chuyển
sang `new Date()` là trộn đồng hồ máy vào một cột đang toàn đồng hồ CSDL (án lệ #18). Nên
`suaTheoId` có thêm cờ `datSuaLuc` (hằng SQL `now()`, không có giá trị nào của nơi gọi đi
vào chuỗi).

**Mặc định TẮT**, và lý do rất cụ thể: `test/l3-m2-ti-le-hoan.test.js:270` có hợp đồng NGƯỢC
LẠI — cổng ghi chậm của L3-M2 bị **cấm** chạm `sua_luc`. Bật mặc định là phá đúng hợp đồng
đó, và phá cả các phép đo dùng `max(sua_luc)` làm vân tay «có ai ghi gì không». Ca `G6` đo
cả hai chiều, và khẳng định mốc nằm trong cửa sổ `now()` của CHÍNH lượt đo.

**④ `null` → ném.** `suaTheoId` trả `null` khi 0 dòng khớp; `ghiDon` phải **NÉM**
`LoiGhiDonAnhCu`. Hai ngữ nghĩa khác hẳn: với tầng chung «0 dòng» là chuyện thường, còn ở
máy trạng thái đơn nó nghĩa là **một lượt khác đã ghi trước** — ảnh cũ đè ảnh mới thì hai sổ
POS/hệ lệch (RF-13). Quên dịch là biến lá chắn RF-13 thành lệnh RỖNG. Tôi đã ghi cảnh báo
này vào §9 từ lúc làm G2-A1; lượt này thi hành nó, và phép ⑤ của cổng canh nó.

## 2 · DỌN CODE CHẾT VÀ LỜI KHAI HẾT HẠN

- `kiemTenCot` + `RE_TEN_COT` ở `src/pos/kho.js` thành code chết sau khi gộp (bộ kiểm tên
  cột nay ở tầng chung) → xoá, đúng luật 12.
- `ket_noi_pos` **bỏ khỏi `BANG_POS_DUOC_GHI`**: grep ba nơi gọi `suaTheoIdPos` thì chúng
  dùng `don_hang`/`san_pham`/`goi_gia`, chưa từng dùng `ket_noi_pos`. Bảng đó do
  `db/di-tru/ket-noi-pos.js` ghi bằng câu riêng và CỐ Ý ngoài `BANG_NGHIEP_VU_CHUAN`. Một
  mục allow-list không ai dùng là cái lỗ chờ người sau bước vào (án lệ #22).
- Ba header file khai *«`suaTheoId` không nhận ctxHeThong»* và *«dữ liệu đậu ở `chua-phan`»*
  — **cả hai đã hết hạn** (24–25/08). Viết lại thành mục LỊCH SỬ có đánh dấu, vì lời khai
  sai là bằng chứng giả: người sau tin nó thay vì đi đo (án lệ #3).

## 3 · MỘT CÁI HỘP KIỂM KÊ NÓI DỐI — CỦA CHÍNH TÔI

Bản cổng đầu tiên in một hộp kiểm kê **gõ tay** 8 dòng. Chạy thật thì con số cổng đo được
lệch với hộp ở bốn tệp (`truy-van` 1↔0, `hang-cho` 3↔1, `chuyen-team` 2↔1…) — vì tôi đếm
tay bằng một regex khác với regex của cổng.

Cổng lỏng mà log nói dối là **hai** lỗi (án lệ #5). Nay hộp đó **sinh từ chính phép đo**:
con số luôn đo, chỉ LÝ DO là gõ tay, và tệp nào có câu `UPDATE` mà **chưa khai lý do** thì
cổng ĐỎ. Không có đường nào để kiểm kê trôi khỏi thực tế nữa.

## 4 · BẰNG CHỨNG MÁY

```
CỔNG G2-A3 · TỔNG: 6 phép · ĐẠT 6 · TRƯỢT 0
   ✔ tổng câu UPDATE tay ở BA cửa = 0
   ✔ không có cửa ghi mới nào mọc lên (8 ≤ 8)
   ✔ tệp có câu UPDATE mà CHƯA KHAI lý do = 0
   ✔ test/l0-m2-gop-cua-hep.test.js: 7 ca, 0 đỏ
   ✔ bộ ca xanh / 7 = 7
   ✔ ghiDon dịch null → LoiGhiDonAnhCu (có mặt trong nhánh !dong)

   [G1] jsonb_typeof=array length=3      [G3] san_pham_ma = ["SP-1","SP-2"]
   [G5] nhat_ky.sau = {"cot": ["ho_so"]}  ← không có SĐT, không có địa chỉ
   [G6] sua_luc bump 04:46:36.646 → .720  (trong cửa sổ now() của lượt đo)
   [G7] câu UPDATE tay còn lại: 0
```

**Quét hồi quy 31 bộ ca v3:** chỉ `l0-m1-di-tru` còn 1 đỏ (D7, đã A/B ở G2-A1). Năm ca đỏ
do guard quá chặt của tôi đã hết sau khi đổi sang bộ dịch lỗi.

## 5 · CÒN LẠI GÌ — nói thẳng để «xong G2-A3» không bị đọc quá tay

Ba cửa được giao = 0. Nhưng đất người A vẫn còn **8 câu `UPDATE` tay**, cổng in đủ kèm lý do:

| Tệp | Số | |
|---|---|---|
| `src/db/truy-van.js` | (bộ dựng chung) | ✅ cái duy nhất nên có |
| `src/db/chuyen-team.js` | 1 | ✅ cửa B-Y3, có chủ đích |
| `src/orders/lich-nhac.js` | 2 | 🟨 **gộp được** — ngoài phạm vi G2-A3 |
| `src/orders/hang-cho.js` | 1 | 🟨 **gộp được** — ngoài phạm vi |
| `src/orders/ti-le-hoan.js` | 1 | 🟨 gộp được, nhưng có hợp đồng cấm chạm `sua_luc` |
| `src/queue/kho.js` | 1 | ⛔ `tin_cho_xu_ly` CỐ Ý ngoài `BANG_NGHIEP_VU_CHUAN` |
| `src/chat/handler-v3.js` · `src/queue/worker.js` | 1+1 | ➖ không phải SQL — cụm tiếng Việt «UPDATE tay» |

Bốn câu 🟨 là **nợ còn lại**, đã ghi §9. Không gộp trong phiếu này vì ngoài phạm vi ③ và
`src/orders/ti-le-hoan.js` có hợp đồng test riêng cần đọc kỹ trước khi đụng.
