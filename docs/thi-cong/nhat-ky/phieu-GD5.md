# PHIẾU GD5 — KIỂM SOÁT

> Làm 25/09/2026 · làn 🟨 (một hàm ĐỌC trên đất A) · đất B (`v3/src/ui/*`, `v3/chay-that.js`,
> `v3/src/vai-b.js`, `v3/src/audit/hanh-dong.js`) + đất A (`src/admin-v3/operations.js`,
> `src/queue/kho.js` — thêm một hàm CHỈ ĐỌC).
> Đo trên bản dev `aicloser_dev_1789621023909`, giao diện dựng TỪ REPO ở cổng 3210.
> Đề bài: `docs/v3/09-KE-HOACH-GIAO-DIEN.md` mục 5, dòng GD5.

## 1. Làm được gì

| Mã | Việc | Xong? |
|---|---|---|
| K5 | Bàn giao hội thoại **đẻ ra một dòng việc** ở «Việc đang chờ», mang lý do | ✅ |
| K7 | Nhật ký ghi **giá trước / giá sau** khi sửa gói giá | ✅ |
| K4 | «Máy chạy bot còn sống không» — đo được, hiện ở dải trạng thái và màn Hệ còn sống không | ✅ (không cần bảng mới — xem mục 3) |
| K8 | Truyền `canhBao` vào lúc khởi động | ✅ (và phát hiện một nợ — xem mục 5) |
| — | «Hội thoại» và «Đơn chờ duyệt» **tự làm mới** | ✅ |
| — | TÁCH hai màn ấy ra khỏi Vận hành V3 | ❌ — cùng một lượt gộp đường dẫn với GD2, đang chờ Q1 |
| K1 | Nút tạm dừng cả team | ❌ — cần quy trình `mo-van`, chờ người quyết |

## 2. K5 và K7 — hai lỗ im lặng

**K5.** Trước lượt này bàn giao CHỈ đổi chủ sở hữu hội thoại. Không dòng nào vào
`viec_can_xu_ly`, nên màn «Việc đang chờ» — màn DUY NHẤT vai sale thấy — vẫn trống trong khi
khách đã bị giao lại. Đo 22/09 trên bản dev: hàng đợi 0 dòng / hội thoại HANDOFF 56 dòng.

Nay `handoffConversation` chèn một dòng việc **có rào chống trùng**: đã có việc chưa đóng cho
hội thoại ấy thì không đẻ thêm. Bấm hai lần, hoặc bot giao lại sau khi sale trả về, sale vẫn
chỉ thấy MỘT khách. Ô «lý do» chuyển lên TRƯỚC nút bàn giao vì nút nay đọc nó — sale mở việc
lên phải biết vì sao khách này được giao lại, không chỉ thấy một cái tên.

**K7.** Nhật ký cũ chỉ ghi TÊN CỘT (`goi_gia`), nên sau một lượt sửa giá không ai dựng lại
được giá cũ là bao nhiêu — mà đây đúng là con số khách trả. Gói giá được XOÁ rồi CHÈN LẠI,
nên phải chụp trước khi xoá. Nay `truoc.goi_gia` và `sau.goi_gia` mang đủ bậc giá.

## 3. K4 — nhịp tim mà KHÔNG cần bảng mới

Kế hoạch ghi «worker phát nhịp tim». Nhịp tim thật cần một bảng, bảng cần một số migration,
mà án lệ #25 bắt xin người quyết khi có phiên khác chạy song song. Nên tôi đi đường khác và
**đo bằng chính hàng đợi tin** (`src/queue/kho.js#nhipMayBot`, một câu SELECT, chỉ đọc):

| Số đo | Trả lời câu gì |
|---|---|
| `dangCho` · `choLauNhatGiay` | có tin của khách nào đang nằm chờ, và chờ bao lâu |
| `dangXu` · `dangXuLauNhatGiay` | có tin nào bị giữ giữa chừng (máy chết khi đang cầm tin) |
| `daXu` · `xongGanNhatGiay` | lần cuối máy xử xong một tin là bao giờ |

Luật xét viết MỘT LẦN ở `v3/src/ui/chung/nhip-may-bot.js`, hai màn cùng đọc (dải trạng thái ở
mọi trang + đèn ⑩ «Máy chạy bot» ở màn Hệ còn sống không). Viết luật hai lần là hẹn ngày hai
chỗ nói hai điều khác nhau về cùng một máy — đúng bệnh đã đo được với mẫu số của dải hôm 22/09.

**Ba chỗ dễ nói sai, và ba chỗ ấy là lý do đèn này tồn tại:**

1. **Hàng đợi rỗng KHÔNG phải «máy sống».** Đêm vắng khách thì rỗng dù máy chết từ tối ⇒ XÁM
   («chưa đo được»), không XANH. Đây đúng là cảnh 08–10/08/2026: `systemctl` báo `active` hai
   ngày liền trong khi không khách nào được trả lời.
2. **Tin dồn KHÔNG phải «máy chết».** Năm mươi khách nhắn cùng lúc thì tin thứ năm mươi chờ vài
   phút là bình thường ⇒ chỉ ĐỎ khi tin cũ nhất quá hạn **và** không tin nào vừa xử xong.
   Thiếu vế sau là đẻ báo động giả mỗi đợt cao điểm, mà báo động giả thì người ta tắt chuông.
3. **Tin kẹt ở `dang_xu`** là dấu vết máy chết GIỮA CHỪNG, không tự hết, và không ai thấy nếu
   chỉ nhìn số tin đang chờ.

**Đồng hồ là đồng hồ CSDL** — mọi khoảng cách tính bằng `now()` trong cùng câu lệnh. Cùng bài
học với «cửa sổ tới bây giờ» của l0-m2 hôm 24/09.

**Ngân sách 2 phút** (tiêu chí của phiếu: tắt máy chạy bot thì trong 2 phút dải chuyển đỏ):
ngưỡng chờ 45 giây · nhớ tạm 15 giây · dải tự đọc lại mỗi 45 giây ⇒ xấu nhất ~105 giây.
Phép đếm page vẫn nhớ tạm 60 giây như cũ — hai phép đo, hai nhịp, cố ý.

## 4. Thước

- `v3/test/b/suc-khoe.test.mjs`: **25/25** (thêm 7 ca cho đèn mới). Ba lượt đảo-vá đều bắt
  được: tô XANH chỗ rỗng-và-nguội → ca ① đỏ · bỏ vế «vẫn có tin vừa xử xong» → ca ② đỏ · bỏ
  dấu vết tin kẹt → ca ③ đỏ.
- `v3/test/b/vai-b-noi-day.test.mjs`: thiếu `docNhipMayBot` phải BÁO RA, không im lặng.
- `test/frontend-v3-e2e.test.js`: một ca mới chạy trên **PostgreSQL thật** — canh luôn câu SQL
  (`FILTER` + `EXTRACT`) chứ không chỉ canh luật xét: xếp một tin, đẩy lùi đồng hồ, rồi khẳng
  định **cả** đèn **và** dải cùng chuyển đỏ. Đảo-vá: bỏ lời gọi `datDocNhip` ở `vai-b.js` →
  ca này đỏ.
- Trình duyệt thật (Brave headless) trên bản dev, hàng đợi đặt vào cảnh kẹt:
  dải đọc «**Máy chạy bot đang đứng** 1 tin chờ 23 phút · Nhờ người quản trị hệ thống khởi
  động lại máy chạy bot.» Dọn tin kiểm ngay sau khi đo.
- `ops/bin/do-giao-dien.mjs`: 26 màn · **0 màn vỡ** · 0 mã kỹ thuật trên mặt màn · 17 hộp
  cảnh báo · chữ diễn giải 4.357 → **4.401** (toàn bộ phần tăng nằm ở màn Hệ còn sống không:
  283 → 327, tiền của một cái đèn mới).
- `npm test`: **1.980 xanh / 1 đỏ** — ca I1 đỏ sẵn (xem N-CADUNGCHUNG).

## 4b. Tự làm mới hai tab hàng chờ

«Đơn chờ duyệt» và «Hội thoại» là hàng chờ: người ta mở sẵn màn này để BIẾT có việc mới. Bắt
bấm «Tải lại» thì cái biết ấy đến muộn đúng bằng khoảng cách giữa hai lần họ nhớ bấm. Nay tự
đọc lại mỗi 45 giây, và bỏ lượt nếu thiếu một trong ba điều kiện: ① đang ở tab hàng chờ ·
② hộp chi tiết ĐANG ĐÓNG (vẽ lại trong lúc người ta sửa một đơn là cướp việc họ gõ) · ③ thẻ
trình duyệt đang hiện. Lượt ngầm KHÔNG hiện chữ «Đang tải…» — nhấp nháy mỗi 45 giây là cách
nhanh nhất để người ta thôi nhìn màn này.

Đo bằng trình duyệt thật: mở tab «Hội thoại», chờ 50 giây ⇒ đúng **1** lượt gọi thêm, **0**
lỗi JS, danh sách vẫn còn.

**Chưa làm: TÁCH hai màn ấy ra khỏi Vận hành V3.** Việc đó gộp đường dẫn, và đường dẫn của
màn page do GD2 quyết (đang chờ Q1) — tách trước rồi GD2 lại đổi lần nữa là bắt người dùng
học đường đi hai lần.

## 5. K8 — nối được, và chỗ nối lộ ra một nợ

`canhBao` nay đổ về `nhat_ky` (mã `canh_bao_model`, tác nhân `may:`), kèm một dòng console có
gắn mức nặng nhẹ. Trước hôm nay phễu ấy chưa nối, nên lời báo «nhà chính hết tiền, đã chuyển
dự phòng» sống đúng bằng tuổi của một vòng log.

Có chỗ giao với nhật ký sẵn có và tôi nói ra: lớp model đã tự ghi `chuyen_du_phong` /
`lop_model_hong` cho hai lượt đổi trạng thái. Dòng mới khác ở chỗ nó mang MỨC và CÂU NGƯỜI ĐỌC
ĐƯỢC, và nó có mặt cả ở lượt «nhà đã sống lại» — lượt mà lớp model KHÔNG ghi nhật ký.

⚠️ **Và đây là điều đáng nói nhất của K8: hôm nay phễu ấy chưa có nguồn.** Đường chat thật
(`src/chat/model.js`) gọi thẳng `goiMotLan`, **không đi qua lớp dự phòng** `v3/src/model/du-phong.js`
— tức hệ đang chạy KHÔNG có chuyển dự phòng khi nhà chính hỏng, chứ không phải «có mà không ai
được báo». Ghi vào §9 (`N-DUPHONGCHATTHAT`), không tự sửa: đó là đường chạm khách thật.

## 6. Chưa làm: nút tạm dừng cả team (K1)

Nút ấy DỪNG bot cho mọi page của một team — đường chạm khách thật, nên nó thuộc quy trình
`mo-van` chứ không thuộc một lượt sửa giao diện. Cần người quyết mở van và định bậc phơi.

## 7. Việc để lại

- Màn «Hệ còn sống không» nay 327 chữ diễn giải, vượt mốc «không màn nào quá 250» mà phiếu GD4
  đề nghị. Mười cái đèn thì trung bình 33 chữ mỗi đèn — không cắt được nữa mà không mất câu
  VÌ SAO. Nếu người quyết muốn về dưới 250 thì phải bớt ĐÈN, không bớt chữ.
- Đèn «Máy chạy bot» đếm theo TEAM đang mở. Máy chạy bot là một tiến trình dùng chung cho mọi
  team; team không có tin nào thì đèn xám dù máy đang chạy tốt cho team khác. Đúng theo phép
  đo, nhưng người quản trị hệ thống cần một cái nhìn toàn hệ — phiếu sau.
