# PHIẾU GD1 — MỘT NGUỒN CHO MỖI CÂU HỎI

> Làm 23/09/2026 · làn 🟨 · đất B (`v3/src/*`) · môi trường đo: **máy dev macOS**, bản dev sạch
> `aicloser_dev_1789621023909`, tiến trình giao diện dựng TỪ REPO ở cổng 3210 (không đụng tiến
> trình 3202 của người dùng — nó chạy bản chụp code cũ).
> Đề bài: `docs/v3/09-KE-HOACH-GIAO-DIEN.md` mục 5, dòng GD1. Phụ thuộc GD0 (đã xong 23/09).

## 1. Đo lại nguyên liệu trước khi code (bước 3 của quy trình thợ)

Đề bài nói «6 chỗ hiện điều kiện cho cùng một page phải ra cùng một danh sách». Đo lại thì
bản đồ thật là thế này — và nó đổi cách vá:

| Chỗ | Đọc từ đâu | Đo được |
|---|---|---|
| `/san-sang` | `manSanSang()` → cầu `docSanSang` | nguồn gốc |
| `/bat-dau` | gọi thẳng `manSanSang()` | đã cùng nguồn |
| `/page-bot` cột «Còn thiếu gì» | cùng cầu (`datDocSanSangPageBot`) | đã cùng nguồn |
| `/trang-chu` · `/len-chay` | cùng cầu | đã cùng nguồn |
| Dải trạng thái | cùng cầu, **nhưng đếm TOÀN HỆ** | ✗ khác mẫu số |
| `/cau-hinh-team` | cột `page.bot_ai_bat` (bản sao) | ✗ khác nguồn, **cố ý** |

⇒ Năm chỗ ĐÃ dùng chung một cầu. Bệnh thật nằm ở hai chỗ khác:

1. **Cầu chở điều kiện của bản mới dưới dạng CÂU CHỮ.** `noi-day/van-hanh-v3.js` làm
   `blockers.map(text => ({ code: text, detail: text }))` và thêm một cảnh báo giả
   `{ code: 'Chỉ kiểm tra cấu hình V3' }`. Mọi màn tra bảng từ vựng theo mã đều trượt ⇒ ô đỏ
   không tên, không nút sửa. Ảnh chụp 22/09: `/san-sang` hiện «Chỉ kiểm tra cấu hình V3 (mã
   lạ)», `/bat-dau` hiện «Bot trả về điều kiện màn này chưa biết».
2. **Dải trạng thái đếm toàn hệ.** `docTrangThai()` đếm mọi page cầu trả về. Trên bản dev,
   cầu sang bản cũ đang đóng nên nó chỉ thấy 1 page ⇒ «Bot đang chạy **1/1** page» trong khi
   team có **4** page. Con số sai ấy hiện ở MỌI trang.

**Chỗ đề bài khai thiếu, phát hiện khi code:** `/cau-hinh-team` KHÔNG phải lỗi — nó cố ý đếm
cột bản sao và khai rõ ra («đã có lần lệch 50 page»), vì gọi cầu mất 10–13 giây mỗi lần mở
màn. Không đụng. Ghi ra đây để người sau không «sửa» một quyết định đã cân nhắc.

**Lỗi thứ ba, tìm thấy giữa lượt (không có trong đề bài):** màn `/bat-dau` lọc điều kiện theo
đúng bốn mã CHẶN của bản cũ. Sau khi mã hoá, điều kiện của page bản mới không nằm trong bốn
mã ấy ⇒ rơi ra ngoài **và** không còn bị đếm là «mã lạ» ⇒ màn sẽ báo «4/4 điều kiện hoàn
thành» cho một page bot KHÔNG chạy được. Tức bản vá ① một mình làm hỏng thêm một chỗ — đúng
bẫy án lệ #26 «bản vá cũng là code mới». Nên phiếu phải gộp cả việc chấm theo danh sách của
chính bản bot.

## 2. Đã sửa gì

| # | Chỗ | Việc |
|---|---|---|
| ① | `san-sang/kho-san-sang.js` | Thêm `DIEU_KIEN_V3` (9 mã có `nhan` · `chan` · `lam` · `di`) + `DIEU_KIEN_TAT_CA`. Giữ `DIEU_KIEN` chỉ-bản-cũ vì ca `san-sang ①c` khoá nó vào `LADDER`. `nhan()` tra bảng CHUNG. Mỗi page khai `banBot: 'cu' \| 'moi'`. |
| ② | `noi-day/van-hanh-v3.js` | Bảng `MA_CUA_CAU`: câu chữ của `pageStatus` → mã. Cảnh báo giả thay bằng hai mã NHẮC thật (`BOTMOI_DIEN_TAP`, `BOTMOI_CHUA_DO_MAY_CHAY_BOT`). Câu chưa khai vẫn đi tiếp nguyên văn (hiện «mã lạ»), KHÔNG nuốt. |
| ③ | `bat-dau/kho-bat-dau.js` | Mỗi page mang `maChan`/`maNhac` của CHÍNH bản bot nó chạy; màn đếm «x/y» theo danh sách đó. |
| ④ | `chung/trang-thai.js` + `router-dieu-huong.js` + `vai-b.js` | `datDemTeam()`: dải trạng thái đếm page của TEAM bằng đúng `manSanSang().dem`. Nhớ tạm theo từng team. Đếm hỏng thì NÓI HỎNG, không tụt về mẫu số toàn hệ. Trả thêm `theoTeam` để màn khai đúng mẫu số. |
| ⑤ | 4 màn | Nhãn «bot cũ / bot mới» ở `/san-sang`, `/page-bot`, `/bat-dau`; `TEN_NGAN` cho 9 mã mới; bảng điều kiện `/san-sang` tách hai nhóm; bỏ các con số gõ cứng («Bảy điều kiện», «bốn điều kiện»). |

**Đổi tên giữa lượt:** mã đặt ban đầu là `V3_*`. Thước `bien-moi-truong-khai-du` đỏ ngay — nó
quét `\bV3_[A-Z0-9_]+` trong `src/` và `v3/src/` rồi đòi mỗi tên phải có dòng trong bảng biến
môi trường. Thước ĐỎ ĐÚNG: mã điều kiện và biến môi trường là hai loại khác nhau, không được
mang chung khuôn tên (và `V3_DIEN_TAP` còn là tên một biến thật). Đổi tiền tố thành `BOTMOI_`,
KHÔNG sửa thước và KHÔNG thêm dòng giả vào bảng biến.

## 3. Thước

Bộ ca mới: `v3/test/b/gd1-mot-nguon.test.mjs` — **11 ca, xanh**.
- ①a–①e đọc THẲNG `src/admin-v3/operations.js`, bóc mọi `blockers.push("…")` rồi đòi mỗi câu
  có một mã; và đòi ngược lại: không dịch câu bên kia không còn nói nữa. Bảng dịch là chép
  tay nên phải khoá vào nguồn (cùng cách ca `san-sang` khoá `LADDER`).
- ②a–②c: nhãn `banBot`, điều kiện không còn «lạ», và page bản mới được chấm bằng danh sách
  của bản mới.
- ③a–③c: dải = `manSanSang().dem`; chưa nối thì khai «toàn hệ»; hỏng thì `aiBat: null`.

**Đảo-vá (mỗi lượt một TIẾN TRÌNH MỚI, án lệ #15):**

| Đột biến | Ca đỏ |
|---|---|
| bỏ một dòng khỏi `MA_CUA_CAU` | ①b |
| `maChanCua()` luôn trả danh sách bản cũ | ②c |
| dải bỏ qua phép đếm theo team | ③a · ③c |

Trả lại bản vá → 11/11 xanh.

Cổng: `ops/bin/nghiem-thu/gd1.sh` — **8/8 phép đạt**, không cần CSDL (logic mô-đun + lời khai
trong mã nguồn), nên chạy được cả trên máy không có Postgres. Cổng canh HỒI QUY của đúng ba
lỗi đã đo 22/09, không chứng nhận «giao diện đã dễ dùng».

`npm test`: **1958 xanh / 6 đỏ** — đúng 6 ca đỏ đã có trước lượt này (I1 · D7 · N1b · N4 · A8 ·
R1-6, đều ở nhóm chat/đơn của phiên khác; D7 đỏ từ 16/09). Một lượt chạy giữa chừng thấy
`test/l2-m3-rap-prompt.test.js` đỏ cả tệp; chạy riêng thì 6/6 xanh — chập chờn do hai bộ ca
đụng cùng CSDL (án lệ #11), không phải hồi quy của lượt này.

**Đo trên giao diện thật** (cổng 3210, dựng từ repo, bản dev 4 page):
- dải: «Bot đang chạy **1/4** page · trong team đang mở» (trước: 1/1)
- `/san-sang`: dòng page ghi «bot mới»; cột Nhắc hiện «Đang chạy thử, không gửi cho khách» và
  «Chưa đo máy chạy bot» — không còn chữ «mã lạ»; bảng điều kiện tách «Page chạy bot cũ · 7»
  và «Page chạy bot mới · 9»
- `/bat-dau`: «7 điều kiện bắt buộc · 7/7 hoàn thành», mỗi dòng có tên người đọc được và nút
  đi sửa; phần «Đáng biết, không chặn» có 2 mục.

⚠️ Sau khi sửa mã nguồn phải KHỞI ĐỘNG LẠI tiến trình rồi mới chụp: lượt chụp đầu vẫn hiện tên
cũ vì mô-đun đã nạp nằm trong RAM tiến trình (án lệ #15, gặp lại đúng y như mô tả).

## 4. Ngoài phạm vi — đã ghi §9, KHÔNG tiện tay sửa

- `/cau-hinh-team` vẫn đếm cột bản sao (cố ý, có khai). Muốn đổi thì phải trả giá 10–13 giây
  mỗi lần mở màn — việc của một phiếu khác, không phải của lượt này.
- Chi phí AI đọc sổ của bản cũ nên page bản mới hiện 0 ₫ (K6 trong kế hoạch). Chưa làm ở
  lượt này: nó đụng `kho-chi-phi.js` và cách đọc `so_ai`, đủ lớn để thành phiếu riêng. Đã
  nằm trong §9 N-GIAODIEN từ lượt GD0.
- `DIEU_KIEN.MISSING_PRODUCT` vẫn còn câu cũ «màn Sản phẩm & kho của v3 chưa dựng» — màn đã
  có thật. Thuộc lượt chữ nghĩa GD4, không sửa lẻ ở đây để khỏi sửa hai lần.

## 5. Tự chấm

- Bốn câu nghiệp vụ: người dùng mở màn có biết page thiếu gì không → CÓ (mọi điều kiện có
  tên + nút sửa). Hai màn có ra hai con số không → KHÔNG còn (dải = danh sách page). Người
  đọc có biết page chạy bằng bản nào không → CÓ. Có chỗ nào màn nói chắc trong khi chưa đo
  không → đã nói ra bằng mã `BOTMOI_CHUA_DO_MAY_CHAY_BOT`.
- Chưa làm được: không có ca nào chạy trên CSDL thật cho đường `noiVanHanhV3` (nó cần pool +
  `pageStatus` thật). Bảng dịch được khoá bằng ca đọc mã nguồn, còn đường chạy thật thì chỉ
  được kiểm bằng lượt mở màn tay ở mục 3.
