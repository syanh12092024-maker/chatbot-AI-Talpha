# PHIẾU VE2b — «Page» gộp nốt: Kịch bản vào trang một page · cột trái lọc như «Tất cả page» · danh sách vào thẳng

> Làn 🟩 giao diện · CR-28-09c · 30/09/2026 · KHÔNG đụng bộ não · 0 migration · 0 biến · 0 gói.
> Commit mã `4455431` · cổng `ops/bin/nghiem-thu/ve2b.sh` · ca `v3/test/b/ve2b-page-gop.test.mjs`.

## 1 · Đề bài (người quyết, 30/09, hai ảnh)

- Ảnh `/page/:id`: «phần /page-bot và /kichban cũng cho vào màn này theo từng page luôn chứ nhỉ? phần page-bot mình hiểu là thông
  tin cài đặt cơ bản của từng page. nên vào màn page sẽ có bộ lọc như page-bot. Còn kichban cũng tương ứng như Sản phẩm và giá phải k?»
- Ảnh `/page-bot` khoanh đỏ khối đầu trang (tiêu đề + mô tả + dải tab «Tất cả page | Kịch bản» + hộp «Chưa bật tắt bot được» + dòng
  «514/514 page chưa có người phụ trách»): «vậy màn tất cả page bỏ phần khoanh đỏ này phải k. Vào danh sách page luôn. ấn vào chi
  tiết chuyển sang id tương ứng. có phần trở lại. K còn màn kichban nữa vì cài vào page rồi.»
- Bản vẽ (BanDo): `kich-ban` → «Page › tab Lời bot + Lịch sử» **Gộp** · `page-bot` → «Page › Danh sách» **Giữ** · `mot-page` →
  «Page › một page» **Giữ** · 2c cột trái chỉ ô tìm (vẽ cho marketer 4 page) — người quyết muốn thêm bộ lọc: làm theo người quyết.

## 2 · Đo lại nguyên liệu TRƯỚC khi code

- Prod 30/09 (chỉ đọc): thành viên team **3, cả 3 quản trị** — 0 marketer · 0 quản lý · 0 «Người duyệt kịch bản» ⇒ bỏ màn Kịch bản
  không làm ai hôm nay mất lối vào. `kich_ban` 75 bản · **74/581** page có bản đang chạy.
- Cài đặt cơ bản của MỘT page (công tắc · bot phụ trách · thị trường · ngành hàng · sản phẩm gốc · trọng điểm · Botcake) ĐÃ ở trang
  một page từ VE2 (công tắc góc phải + tab «Kỹ thuật»). Cái «Tất cả page» còn giữ là việc NHIỀU page: lọc có số · chọn nhiều + gắn
  sản phẩm / bật bot ≤ 10 · quét Pancake — bản vẽ giữ màn này.
- Tab «Lời bot» ĐÃ soạn + lưu-là-chạy qua đúng cửa `/api/kich-ban/page/:id/luu-chay` (VE2). Việc CHỈ màn Kịch bản làm được: «Nhập từ
  file Pancake» (`/api/kich-ban/nhap-pancake`, chỉ bóc) · bảng «Các bản»: Xem · Chép vào ô soạn · «Chạy lại bản này» (vai soạn, qua
  lưu-là-chạy) · «Đưa lên chạy» (vai duyệt, `/live`) · đếm «N/M page chưa có kịch bản riêng» · cây theo thị trường · ghi chú tầng trống.
- `/api/page-bot/danh-sach` chỉ quản trị + quản lý ⇒ cột trái trang một page (marketer vào được) KHÔNG gọi được cửa ấy ⇒ dùng chung HÀM.
- Hai bộ đọc trạng thái bot: cột trái dùng `docBotBatThat` (`chung/bot-bat-that.js`), «Tất cả page» dùng `docCuaKiem` — `vai-b.js`
  dòng 333/335 nối CẢ HAI vào cùng `docCuaKiem` (grep) ⇒ chuyển cột trái sang bộ gắn của «Tất cả page» không đổi nguồn số ở prod.
- `/page` trần hôm nay chuyển về `/page-bot` — marketer không mở được `/page-bot` (403) ⇒ marketer vào mục Page qua màn Kịch bản
  (ca C3 `ll3-cum`: thanh bên marketer = «Kịch bản của page» · «Chính sách · FAQ · Phản đối»). Bỏ màn Kịch bản mà không mở lối khác
  là marketer mất mục Page.
- `kich_ban` có bản tầng nước / tầng sản phẩm: `page_id` NULL theo ràng buộc `kich_ban_khoa_dung_cap` ⇒ không bao giờ tính là lời
  bot RIÊNG của page (đúng cách màn cũ đếm).
- Liên kết tới `/kich-ban` ở chỗ khác: `trang-chu` · `san-sang` · `len-chay` · `suc-khoe` (mã máy chủ, `di: '/kich-ban'` trần) ·
  `hieu-qua` (màn thử nghiệm) · `mot-page` (hai câu chữ + khối «Bật được chưa» qua cửa kiểm: MISSING_SCRIPT/THIN_SCRIPT/SCRIPT_STALE).

## 3 · Đã làm

**Máy chủ**
- `page-bot/kho-page.js`: mã lọc mới `chua_loi_bot` «Chưa có lời bot riêng» (= không có bản kịch bản LIVE; bản nháp không tính) ·
  `ganTrangThaiPage` — MỘT chỗ gắn `bot_ai_bat`/`runtime`/`_mucKiem`/`_coLoiBot` cho cả «Tất cả page» lẫn cột trái · `kiemLoc` (một câu
  lỗi cho mã lọc lạ) · xuất `hopLoc`/`hopTim` · bảng kịch bản đọc hỏng ⇒ `_coLoiBot` null, `dem.chua_loi_bot` null + `loiBotViSao`.
- `mot-page/kho-mot-page.js#dsPageGon(bc, {loc, tim})`: lọc + tìm bằng đúng hàm trên; trả `dem` · `chuLoc` · `loc` · `soTong` ·
  `coLoiBot`. Bỏ nhập `bot-bat-that.js` (hết dùng ở tệp này).
- `mot-page/router.js`: `/api/page-ds?loc=&tim=` + `moDanhSach` (vai mở được «Tất cả page» không — máy chủ quyết); `/page` TRẦN theo
  vai: mở được danh sách ⇒ về `/page-bot` GIỮ query; marketer ⇒ phục vụ trang (danh sách + lọc, giữa mời chọn); thiếu vai ⇒ 403.
- `kich-ban/router.js`: `/kich-ban` thôi phục vụ trang — chuyển THEO VAI: `?page=X` ⇒ `/page/X?tab=loi`; trần ⇒ `/page-bot?loc=chua_loi_bot`
  (quản trị/quản lý) hoặc `/page?loc=chua_loi_bot` (marketer); vai không mở được trang page ⇒ `/`; chưa đăng nhập ⇒ đăng nhập.
  Mọi cửa `/api/kich-ban/*` GIỮ NGUYÊN. Tệp `kich-ban.html` còn nằm đó, không đường nào phục vụ — gỡ ở LL8 (quy ước LL1).

**Sổ màn (`chung/man-hinh.js`)**
- «Kịch bản của page» RỜI sổ; `CHUYEN_HUONG['/kich-ban'] = '/page'` (quyền theo đích — cửa kiểm liên kết đọc bảng này).
- Trang một page: thành viên cụm «Tất cả page», tên «Các page», cờ mới `moTuDauCum` — tới bằng một dòng ở đầu cụm nên KHÔNG lên
  tab (cụm còn một tab ⇒ khung không vẽ thanh tab «Tất cả page | …»); vai không mở được đầu cụm (marketer) ⇒ nó là đầu cụm của họ,
  đứng thanh bên. Thôi `canId` + `nhaCum` (đứng ở một page vẫn sáng «Tất cả page» vì cùng cụm). `menuCua`: `trongCum: !m.moTuDauCum`.

**Trang «Tất cả page»**: đầu trang ẩn (`header.an-tieu-de`, giữ `<h1>` cho HK10 + trình đọc màn hình) · hộp «Chưa bật tắt bot được»
thành MỘT dòng «Công tắc bot đang khoá» ở hàng ô tìm, lý do đủ trong `title` (cùng câu trên `title` từng công tắc khoá) · bỏ dòng
«N page chưa có người phụ trách» (số đã ở viên «Chưa có marketer») · nút «Quét Pancake» xuống hàng ô tìm · viên «Chưa có lời bot
riêng» — số không đo được hiện «—» · bảng kịch bản đọc hỏng ⇒ cảnh báo đo thật (giữ) · bấm tên page mang `?loc&tim&trang`.

**Trang một page**: «← Tất cả page» (chỉ khi `moDanhSach`) về đúng lọc · tìm · trang · cột trái: ô chọn «Lọc» (cùng mã, có số —
một dòng vì cột hẹp) + ô tìm gọi máy chủ; liên kết mang lọc · tìm · trang · TAB đang đứng (đi qua từng page không phải chọn lại
tab); «chưa có lời bot» trong tóm tắt dòng · `/page` trần: giữa «Chọn một page ở cột trái», cột phải nói chọn page để xem · tab
«Lời bot»: «Nhập từ file Pancake» (bóc, điền 3 ô, nói CHƯA LƯU; ô chọn tệp nằm ngoài vùng vẽ lại) + lối sang tab «Lịch sử» · tab
«Lịch sử»: mỗi bản «Xem nội dung» ngay tại chỗ · «Chép vào ô soạn» (sang tab Lời bot, không ghi) · «Chạy lại bản này» (bản không
đang chạy; hỏi trước; qua đúng cửa lưu-là-chạy) — vai chỉ xem thấy chỉ phần xem · khối «Bật được chưa»: việc cửa kiểm chỉ sang
`/kich-ban` (soạn/bổ sung/xem lại kịch bản) thành nút SANG TAB «Lời bot» ngay trong trang (`TAB_CUA_DI`).

**CSS** (`kieu.css`, không `style=`): `.chi-tiet-khoi { display: contents }` (gói phần một page để `/page` trần giấu một lần mà các
khối con vẫn là con flex của cột) · `a.lien-ve` (lối «← Tất cả page», chữ phụ).
**Màn thử nghiệm «So hai bản kịch bản»**: nhãn nút «Soạn lời bot cho page» (vẫn `/kich-ban` — chuyển hướng theo vai).

## 4 · Chọn A thay B (và giá phải trả)

- **Giữ nút «Quét Pancake»** dù nằm trong vùng khoanh đỏ — nó là đường DUY NHẤT đưa page mới vào hệ; chuyển xuống hàng ô tìm.
- **Hộp cửa ghi → một dòng + title**, không bỏ hẳn: bỏ hẳn thì công tắc xám mà không ai nói vì sao. Lỗi ĐO THẬT (cửa kiểm / bảng kịch
  bản đọc hỏng) vẫn là hộp cảnh báo — chỉ hiện khi xảy ra.
- **Ô chọn ở cột trái, không dải viên**: cột ~300px, mười viên sẽ xuống 4–5 dòng. Cùng mã lọc, cùng số.
- **Cờ mới `moTuDauCum`** thay vì: (a) cho trang một page lên TAB — quản trị lại có thanh «Tất cả page | Các page», đúng thứ người quyết
  khoanh đỏ; (b) sửa `moTuManKhac` thành «ẩn khi mở được màn thay» cho mọi màn — đổi menu của vai duyệt kịch bản với «Đoạn chữ gửi
  cho AI» (lan ngoài phiếu). Giá: thêm một cờ; ca C4 `ll3-cum` học cờ đó.
- **Cột trái đọc trạng thái bot qua bộ gắn của «Tất cả page»** (thay `docBotBatThat`): một phép gắn cho hai màn. Prod nối cả hai vào
  cùng `docCuaKiem` ⇒ không đổi số; giá: ca P1/P2 `ve2-mot-page` tiêm vào bộ đọc của page-bot.
- **«Đưa lên chạy» (vai duyệt) KHÔNG sang tab Lịch sử**: vai duyệt kịch bản (LL7 thôi cấp; prod 0 người) không mở được trang page;
  quản trị/marketer đã có «Chạy lại» (cùng kết quả qua cửa lưu-là-chạy).
- **Marketer thấy MỌI page của team** ở «Các page», không «Page của tôi» như bản vẽ — chưa có nguồn page ↔ người (0/581 page có
  marketer; hồ sơ HRM ở LL15). Không bịa.
- **Không mở «Tất cả page» cho marketer** dù bản vẽ 2b vẽ vai đó: là nới quyền — để người quyết quyết.
- **Các `di: '/kich-ban'` ở Việc của tôi / Cửa kiểm / Đưa sản phẩm lên chạy / Sức khoẻ** để nguyên: chuyển hướng theo vai đưa tới
  danh sách lọc sẵn «chưa có lời bot riêng» — đúng việc các ô đó nhắc.

## 5 · Thước sửa (có căn cứ — VE2b đổi hợp đồng điều hướng)

- `ll3-cum` C2 (cụm Tất cả page còn MỘT tab) · C3 (marketer: «Các page»; vai duyệt: còn «Luật chung») · C4 (thêm luật `moTuDauCum`:
  tới được khi đầu cụm hiện với vai đó) · C5 (đo ở `/page/p1` — `/kich-ban` thôi là màn).
- `ll1-nam-dich` N3 (đường RỜI sổ có khai phiếu, `DUONG_BO`) + ca mới N3b (đường rời sổ phải có ở `CHUYEN_HUONG`) · N4 (bỏ `/kich-ban`
  khỏi đích Page) · N5 (`/kich-ban` rời mọi vai; `/page` THÊM cho riêng marketer — `THEM_THEO_VAI`).
- `dieu-huong` ④c (ẩn 20 → 19; `canId` 1 → 0; `moTuDauCum` khai ra đúng `/page`).
- `ll18-khung` K16 (đường chỉ-còn-chuyển-hướng đọc từ `CHUYEN_HUONG` thay vì gõ tay `/san-sang`).
- `ve2-mot-page` P1/P2 (tiêm bộ đọc mà mã đang đọc) · P4 (cột trái gọi kèm lọc + tìm).
- `ve3-page-ds` D1 (nút Quét ở hàng ô tìm; viên hiện «—» khi không đo được).
- `ops/bin/nghiem-thu/ll3.sh` ④ (menu thật: marketer «Các page» thay «Kịch bản của page») — **sót ở lượt phiếu**, lộ ra ở lượt cửa
  vào deploy (một cổng gốc, 12 cổng đỏ dây chuyền qua «cổng trước»). Bài học: đổi điều hướng thì chạy ĐỦ `phat-hanh.sh`, không chỉ
  cổng của phiếu + bộ ca — cổng cũ có thước riêng không nằm trong bộ ca.

## 6 · Kiểm (máy dev, 30/09)

- **Ca chạy thật** `v3/test/b/ve2b-page-gop.test.mjs` **17/17**: G1 mọi mã lọc — cột trái và «Tất cả page» ra CÙNG tập page, CÙNG số
  (so qua HTTP thật, từng mã) · G2 marketer lọc được, cửa danh sách của họ vẫn 403, ô tìm theo ngành hàng/marketer · G3 bảng kịch bản
  đọc hỏng ⇒ null + lý do (không 0, không «mọi page») · R1/R2 `/page` trần và `/kich-ban` chuyển theo vai (kể cả vai duyệt ⇒ `/`) ·
  N1/N2 điều hướng (không thanh tab; đứng ở một page sáng «Tất cả page»; marketer có «Các page»; `CHUYEN_HUONG`) · M1–M7 script THẬT
  trang một page trong vm gọi máy chủ thật (vai-b + CSDL giả): `/page` trần · lọc mang theo + lối trở lại + đổi lọc gọi lại + F5 giữ
  lọc · Lịch sử xem / chạy lại (hỏi, đúng chữ bản cũ, bản MỚI LIVE, bot được đẩy) / chép (sang tab, không ghi) · quản lý chỉ xem ·
  nhập file Pancake (điền 3 ô, nói chưa lưu, không gọi lưu) · «Bổ sung kịch bản» sang tab · P1–P3 script THẬT «Tất cả page»: không
  đầu trang / hộp cố định / dòng marketer, Quét ở hàng tìm, dòng khoá + title, viên «—» khi không đo được, liên kết mang lọc.
  DOM giả trong tệp ca (bộ chọn `#id`/`.lop`/`[thuoc]`/hậu duệ; nút do script vẽ ra bấm được thật); `ui.js` THẬT, chỉ thay `toast` +
  `confirmDialog`.
- **Đảo-vá 20/20 ĐỎ** (mỗi đột biến một tiến trình, khôi phục khớp băm) — lọc/đếm (M1–M4) · chuyển hướng (M5, M7, M8) · lối trở lại
  (M6, M11, M12) · điều hướng (M9, M10) · Lịch sử (M13–M15) · nhập file tự lưu (M16) · «Bổ sung kịch bản» ra màn cũ (M17) · công tắc
  khoá im lặng (M18) · liên kết mất lọc (M19) · viên 0 thay «—» (M20). Không đột biến nào sống.
- **Cổng** `ops/bin/nghiem-thu/ve2b.sh` **14/14** (ca VE2b · 11 tệp thước · không trang nào trỏ `/kich-ban` ngoài màn thử nghiệm ·
  cổng trước ve6c). Cổng đọc tài liệu màn: `ui-ht4.sh` 17/17 · `ll1.sh` 10/10.
- **`npm test`** trên cây cuối: **2.368 ca · 2.364 đạt · 0 đỏ · 4 bỏ qua** (lượt đầu 13 đỏ = đúng các thước ghim bố cục cũ, sửa ở §5).
- **Bò e2e** (sandbox + `v3/chay-that.js` thật, ba vai) so VE6c: 0 lỗi JS · request hỏng 3 → 3 mỗi vai (cùng hai cửa 502 cầu bot cũ
  trong sandbox, 0 MỚI) · 0 tràn ngang · 0 chữ hỏng. `/kich-ban` rời lượt bò cả hai vai; marketer nay tới `/page` · `/page/:id`.
- **Chụp** (sandbox, cửa ghi đóng): «Tất cả page» vào thẳng danh sách · lọc «Chưa có lời bot riêng» ⇒ bấm page ⇒ trang mang lọc,
  «← Tất cả page» `/page-bot?loc=chua_loi_bot` · Lịch sử (xem · chép · chạy lại) · Lời bot (Lưu · Nhập từ file Pancake) · marketer
  `/kich-ban` ⇒ `/page?loc=chua_loi_bot` «Chọn một page ở cột trái» · 390 px không tràn. 0 lỗi JS, 0 request hỏng.

## 7 · Nợ phát sinh → §9

- **N-VE2B-LUAT** thẻ «Luật chung · trả lời sẵn» đầu cột trái trang page trỏ `/bo-luat` — marketer không mở được `/bo-luat` (403).
  Có từ VE2; VE2b mở `/page` cho marketer nên lối này nay thấy được. Sửa: trỏ theo vai (marketer ⇒ `/khoi-chung`, như menu).
- **N-VE2B-444** `kich-ban/kho-kich-ban.js#banCuaPage` câu `trong.noi` gõ cứng «Hôm nay 444/514 page» (prod 30/09: 507/581) — không
  màn nào còn hiện câu này nhưng cửa API vẫn trả. Xoá câu hoặc tính số.
- **N-VE2B-DEM** viên «Còn điều kiện chặn» / «Đủ điều kiện» khi cửa kiểm đọc hỏng đếm **0** thay vì «không đo được» (viên mới «Chưa
  có lời bot riêng» đã theo luật null/«—»). Có hộp cảnh báo ở đầu danh sách nên không im lặng, nhưng số 0 trên viên vẫn là lời khai sai.
- (quy ước LL8, không phải nợ mới) `kich-ban/trang/kich-ban.html` không đường nào phục vụ · cờ `canId` không còn màn nào mang — gỡ
  cùng lô màn thừa ở LL8.
