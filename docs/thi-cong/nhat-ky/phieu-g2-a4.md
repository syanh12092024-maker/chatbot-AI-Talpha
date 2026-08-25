# NHẬT KÝ PHIẾU G2-A4 — phiên bản · duyệt · đo ảnh hưởng cho bộ luật chung và kỹ năng

> Thợ: người A (trục dữ liệu) · 25/08/2026 · nhánh `main` · làn 🟥
> Môi trường đo: **VPS 169.58.33.8 · PostgreSQL 16.15** — sandbox tự dựng, cộng một phép
> CHỈ-ĐỌC trên `aicloser_v3` với **514 page thật**

---

## 0 · PHẠM VI ĐÃ ĐỔI GIỮA CHỪNG, VÀ CHỦ DỰ ÁN ĐÃ CHỐT

Đang đo nguyên liệu thì phát hiện **người B đã dựng xong `v3/src/ui/bo-luat/` và
`v3/src/ui/ky-nang/`** trên lược đồ cũ, và họ đã tự làm cả ba thứ phiếu giao cho tôi:
`soSanh()` · `demAnhHuong()` · `apPhienBan()`.

Tôi đã trình hai đường: (a) chỉ dựng hai cái rào mà tầng màn hình không dựng được, hoặc
(b) dựng bảng + API riêng như phiếu gốc. **Chủ dự án chốt (b).** Nên lượt này làm đủ, với
một ràng buộc cứng tự đặt: **không được đập hai màn B vừa xong.**

## 1 · BA CHỖ THIẾT KẾ PHẢI NHƯỜNG, VÌ B ĐÃ CHẠY TRÊN ĐÓ

**① Không thêm cột `trang_thai` vào `bo_luat_chung`.** Ý đầu là làm máy trạng thái
`NHAP/CHO_DUYET/LIVE`. Bỏ, vì `dang_dung` đã là cờ LIVE mà cả bộ đọc prompt lẫn màn của B
đang dùng — thêm cột thứ hai nói cùng một chuyện là đúng án lệ «bản khai thứ hai». Duyệt
được diễn đạt bằng `duyet_boi`/`duyet_luc` (cộng thêm, không tranh chấp).

**② Lịch sử kỹ năng ra BẢNG RIÊNG.** `bo_luat_chung` vốn đã nhiều dòng một team nên phiên
bản nằm sẵn trong bảng. `ky_nang` thì không: màn của B đọc `db.chon('ky_nang', {})` và
hiện **mỗi dòng là một kỹ năng**. Nhét phiên bản vào chính bảng đó là màn của họ hiện một
kỹ năng thành N dòng. Nên `ky_nang_lich_su` là bảng riêng, và `UNIQUE (team_id, ma)` của
bảng gốc **giữ nguyên**. Ca `N12` khoá bất biến đó lại.

**③ Chưa siết `CHECK (NOT dang_dung OR duyet_luc IS NOT NULL)`.** Rào đó là đúng đích,
nhưng bật ngay là màn của B chết — họ còn ghi thẳng qua `db.sua()`. Cutover hai bước: cửa
API chặn trước, siết CSDL sau khi B đổi sang gọi `apBoLuat()`. Đã ghi §9.

## 2 · HAI RÀO CHỈ TẦNG DỮ LIỆU DỰNG ĐƯỢC

**RF-17 đóng ở đây.** §9 sổ điều hành, 23/08: *«`bo_luat_chung` thiếu UNIQUE… dup luật toàn
hệ khi chạy song song»*. Và `apPhienBan()` của B hạ bản cũ rồi dựng bản mới bằng **hai lời
gọi rời** — hai lượt áp đồng thời có thể để lại hai bản `dang_dung=true`, mà bộ đọc của tôi
(`docBoLuatChung`) thì **che đi** bằng cách lấy `phien_ban` cao nhất, tức hệ tự chọn kẻ
thắng trong im lặng.

```
✔ ghi thẳng bản thứ hai dang_dung=true = bo_luat_chung_mot_ban_dang_ap
✔ số bản đang áp sau lượt bị chặn = 1
```

Chỉ mục riêng phần chặn kể cả lượt ghi thẳng bằng psql. ⚠️ `team_id` NULLABLE (NULL = luật
toàn hệ) và trong Postgres hai NULL là KHÁC nhau, nên phải `COALESCE(team_id, 0)` — không
thì dòng toàn hệ không được ràng.

**Áp là MỘT giao dịch.** B tự khai *«KHÔNG có giao dịch: tầng truy vấn của A chưa phơi
`giaoDich()` ra»*, và lập luận rằng hạ-xong-dựng-hỏng thì rơi về bản toàn hệ nên «hỏng theo
hướng an toàn». Đúng là an toàn hơn rỗng — nhưng nó vẫn là **mọi page đang bật bot đổi cách
nói mà không ai bấm nút nào**. Ca `N8` ép nhật ký hỏng bằng một trigger THẬT rồi khẳng định
bản cũ **vẫn đang áp**, và số bản đang áp vẫn đúng bằng 1.

## 3 · CA QUAN TRỌNG NHẤT — «bao nhiêu page» phải là con số THẬT

Câu *«đổi cái này ảnh hưởng bao nhiêu page»* chỉ đúng nếu nó dùng **đúng luật mà bộ ráp
prompt dùng lúc chạy thật**. Hai bản cài của cùng một luật là cách chắc chắn nhất để màn
hình nói «2 page» trong khi bot đổi giọng ở 3 page.

Nên vị từ `apDungChoPage()` khai **một lần** ở `src/db/noi-dung.js`, và
`src/chat/rap-prompt.js#docKyNang` **import chính nó** — không gõ lại.

Và không tin lời khai đó: ca `N15` chạy **cả hai** trên từng page rồi so danh sách, còn cổng
④ làm điều tương tự **trên CSDL thật, 514 page**:

```
số page đã so trên CSDL THẬT                        514
✔ số page LỆCH giữa phép đếm và bộ đọc = 0
```

Thêm một phép nữa: đối chiếu vị từ CŨ (chép nguyên văn bản trước lượt gộp) với vị từ MỚI
trên toàn bộ 514 page — **0 page lệch**. Tức lượt refactor không đổi một lựa chọn nào.

## 4 · VỀ YÊU CẦU «CHẠY BA LƯỢT MODEL»

Nghiệm thu sóng 1 dặn: *«Với mọi thay đổi chạm cách bot nói: chạy ít nhất BA lượt và đánh
giá cả ba — model không tất định.»*

Lượt này **không chạy ba lượt model**, và đây là lý do — xin soi kỹ chỗ này:

- Nội dung prompt **không đổi một byte**. Thứ duy nhất chạm đường ráp prompt là `docKyNang`
  đổi từ vị từ nội tuyến sang vị từ dùng chung, và tôi đã đo **0/514 page lệch** giữa hai
  bản. Bộ luật chung thì bộ đọc vẫn đọc đúng bản đang áp (ca `N17`).
- Ba lượt model đo **tính bất định của model**, hữu ích khi nội dung prompt ĐỔI. Ở đây phép
  đo đúng là **so prompt trước/sau**, và nó tất định, mạnh hơn, và đã cho 0 lệch.

Khi nào phải chạy ba lượt: lúc ai đó **áp một bản bộ luật chung mới có nội dung khác**. Đó
là thao tác của người dùng qua màn hình, không phải của lượt code này. Ghi §9 để người mở
sóng 1 không bỏ sót.

## 5 · HAI THƯỚC CŨ PHẢI SỬA — cả hai đều là luật đổi, không phải code sai

- `test/l2-m3-rap-prompt.test.js` ca ② **tự dựng** đúng trạng thái «hai bản cùng đang áp»
  (chèn v2 `dang_dung=true` khi v1 còn đang áp) để đo hot-reload. Chỉ mục mới chặn đúng.
  Sửa thước: hạ v1 rồi mới dựng v2 — đúng như mọi nơi gọi hợp lệ phải làm. **Ý đồ của ca
  không đổi.** (án lệ #27)
- `test/l0-m1-luoc-do.test.js`: 22 → 23 bảng (`ky_nang_lich_su`).

## 6 · BẰNG CHỨNG MÁY

```
CỔNG G2-A4 · TỔNG: 12 phép · ĐẠT 12 · TRƯỢT 0
   ✔ vân tay lược đồ đếm 266 cột · round-trip 009 khớp
   ✔ ghi thẳng bản thứ hai dang_dung=true = bo_luat_chung_mot_ban_dang_ap
   ✔ tạo bản mới → bản đang áp = KHONG-DOI
   ✔ người soạn tự duyệt bản mình = LoiXuyenTeam        ← bốn mắt
   ✔ áp bản AI chưa duyệt = bi-chan                      ← 01-QUYET-DINH §9
   ✔ lượt áp tiến / lượt áp lùi = tien/lui               ← áp và lùi CÙNG một hàm
   ✔ số dòng nhật ký ap_bo_luat = 2
   ✔ số page LỆCH giữa phép đếm và bộ đọc = 0  (514 page THẬT)
   ✔ test/l0-m2-noi-dung.test.js: 17 ca, 0 đỏ
```

```
[N8]  sau lượt hỏng: vẫn đang áp v1      ← giao dịch giữ
[N12] bảng gốc 1 dòng · lịch sử 2 bản    ← màn của B không đổi hình
[N15] API=["fb-size","fb-tat"] · bộ đọc=["fb-size","fb-tat"]
[N16] v2 → lùi về v1, thành v3           ← lùi vẫn TIẾN số bản: lùi ≠ xoá
```

**Quét hồi quy 32 bộ ca v3:** chỉ `l0-m1-di-tru` còn 1 đỏ (D7, đã A/B ở G2-A1).

## 7 · NGOÀI PHẠM VI / NỢ

- `CHECK` buộc `dang_dung` đi kèm `duyet_luc` — bước hai của cutover, chờ B đổi sang
  `apBoLuat()`.
- Bản **toàn hệ** (`team_id IS NULL`) vẫn không sửa/áp được từ cửa team. Cố ý — nó là bản
  KẾ THỪA, đúng kết luận của B ở khối ② đầu `kho-bo-luat.js`.
- `soSanhBoLuat` là phép so **tập hợp dòng**, không phải diff có thứ tự: dòng bị chuyển chỗ
  hiện thành một bỏ + một thêm. Hàm TỰ KHAI điều đó trong trường `phepSo`.
- Chưa nói với người B rằng đã có `apBoLuat()`/`suaKyNang()` để họ đổi sang. Cái rào thứ hai
  chỉ có tác dụng khi nơi gọi đi qua nó.
