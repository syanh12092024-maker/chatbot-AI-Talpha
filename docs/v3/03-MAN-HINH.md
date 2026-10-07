# MÀN HÌNH — NĂM ĐÍCH

> **Đổi 29/09/2026 — CR-28-09c** (`docs/thi-cong/doi-y-do/CR-28-09c-lam-lai-bon-man.md`, `01-QUYET-DINH.md` §9).
> Bản vẽ được duyệt: <https://claude.ai/artifact/A6D68jyQRuqqu3TBRLrceb> — bảng 0 là bản đồ phủ màn.
> Thứ tự chuyển: **thêm nhà mới trước, gỡ màn cũ sau cùng** (phiếu LL8 cuối). Tới khi LL8 xong, màn cũ vẫn mở
> theo đường cũ; bảng «bản cũ» cuối tệp là hợp đồng của các màn đó.

## Năm đích

| Đích | Ai dùng | Gồm |
|---|---|---|
| **Hộp thư** | Sale (thấy cả ba team — LL15) | Cần người · Bot đang xử (nhận thay bot) · Tất cả · Đơn chờ (Messenger chờ duyệt, đơn không gắn hội thoại, Ladi chờ xác nhận WhatsApp) · xem/sửa/duyệt/loại đơn Messenger cạnh khung chat · gõ số điện thoại vào ô tìm ⇒ hồ sơ khách mọi kênh. **Không ô soạn tin** — trả lời ở Pancake. Đã làm ở LL2 (spec L4-M1 §7b). **VE5 (29/09): theo bản vẽ 1a** — ba tab Cần bạn (việc mở + đơn chờ thành hàng của hàng đợi) · Đơn chờ · Bot đang xử; «Tất cả» thành lối «Mọi hội thoại gần đây»; thẻ đơn ở cột giữa dưới tin nhắn (Hàng · Tiền · Giao tới · cảnh báo hoàn theo tầng · nghi trùng · van tạo đơn POS đóng thì nói trước và khoá nút duyệt; ba nút mở đúng form duyệt cũ); nhận/đóng việc ở thanh cuối (menu mở lên); cột phải Khách · Bot đã làm gì · Page này bán gì (sale chưa có đường đọc sản phẩm & giá — nói ra). Chưa có: đẩy báo quản trị khi quá 10′ · «Trả lại bot» cho sale · đơn Ladi/nghi trùng có nút xử lý. **VE5b (30/09): Tìm khách theo bản vẽ 1b** — `/ho-so-khach` (đường giữ), vào từ Hộp thư: tra theo số ⇒ hồ sơ gộp kênh (ba thẻ Messenger · Trang bán hàng (Ladi) · WhatsApp «chưa nối») + mọi đơn cả hai luồng (cột Hàng: dữ liệu đơn chưa lưu món — đo prod 0/123.629); sale mở được (§10 bổ sung), cửa danh sách cũ giữ quản trị · quản lý; ô tìm trống ⇒ tổng quan cũ cho quản trị · quản lý; tên / mã đơn POS: nói rõ vai nào chưa có đường |
| **Sản phẩm** | Marketer · Quản trị | Chung (kiến thức · hỏi size · ảnh · kịch bản tầng sản phẩm) · Theo thị trường (1 shop POS = 1 thị trường · đúng một món POS · giá bậc theo tiền tệ · marketer từ HRM · kịch bản tầng nước) · Page đang bán · Lịch sử · Gộp món POS nhiều shop thành một sản phẩm. Đã làm ở LL13: màn «Sản phẩm & kho» đặt khối Sản phẩm lên đầu — mỗi sản phẩm: số thị trường (shop POS) · page đang bán · món; «Xem» ⇒ thị trường theo shop (món · tồn · page), «Thêm thị trường» gắn món POS chưa thuộc sản phẩm nào, «Gỡ»; gộp nhiều shop tự động theo SỐ HIỆU (lượt kéo danh mục). Chưa: marketer HRM (LL15), kéo danh mục 6 shop còn lại (LL16). **VE1 (29/09): dựng lại theo bản vẽ 2a** — hai cột: danh sách sản phẩm của team (tìm · «+ Thêm» · ô lưu ý «dữ liệu còn nằm theo page» dẫn tới Bản sao theo page và số hiệu chờ đặt tên) · một sản phẩm: dải bốn tầng bot ghép (① luật chung ② sản phẩm chung ③ theo shop POS ④ page) · tab Chung (kiến thức, «hỏi size») · Theo thị trường (viên thị trường · thẻ shop/món/tồn · «Giá ở …» gom từ bậc giá của các page bán món, lệch giá nói ra · khung Thêm thị trường ba bước) · Page đang bán · Lịch sử (nhật ký). Chưa có nguồn nói rõ: marketer (LL15) · ảnh chung · kịch bản tầng nước theo sản phẩm **VE8a (30/09): gộp món POS thành sản phẩm THEO SKU** (mã sản phẩm POS chung giữa các shop — người quyết 30/09; migration 028 thêm `sku` + `marketer`): khung «Gộp món POS» ngay trong màn (?xem=gop) — máy gợi ý nhóm, người xác nhận; gộp = một giao dịch tạo sản phẩm (SKU + marketer) + gắn đúng món chọn; lượt kéo danh mục lưu SKU và tự nối món shop mới cùng SKU. **VE8b (30/09): vòng khép kín trong màn** — «Theo thị trường» sửa bậc giá của CHÍNH món POS shop đó (bot báo giá + cửa tiền cùng một nguồn; lưu chỉ-giá `gia_tay`: POS không đè giá, tên + hết hàng vẫn theo POS) · marketer của sản phẩm ở tab Chung (đổi ⇒ page đang bán đổi theo) · «Page đang bán» gắn/gỡ page (ghi sản phẩm · shop · thị trường · marketer); Vận hành bỏ tab «Sản phẩm & giá» — một nơi nhập giá **LL15d (02/10): marketer phụ trách CHỌN từ hồ sơ HRM** — ô chọn tài khoản marketer có mã NV của team (tab Chung + hộp gộp món), lưu mã NV (`san_pham_goc.marketer_ma_nv`, 031) + tên; gợi ý «ai bán nhiều nhất» từ đơn POS 60 ngày (BigQuery, chỉ đọc, đệm một ngày; đơn huỷ không tính) + «Dùng gợi ý»; **marketer chỉ thấy sản phẩm mình phụ trách** — danh sách lọc + câu «Chỉ hiện x/y sản phẩm bạn phụ trách · z chưa gán»; mở / sửa kiến thức / xem lịch sử sản phẩm người khác ⇒ 403; tài khoản marketer không mã NV ⇒ không sản phẩm nào + nói vì sao **GSP1 (02/10):** «+ Thêm» = Gộp món POS theo SKU; bỏ lối tạo gốc theo số hiệu (CR-02-10b) **GSP2 (02/10):** danh sách việc chuyển page sang sản phẩm tạm, quyết định theo page × bản sao × gốc × shop (CR-02-10b); gỡ ở GSP5. **GP1 (07/10): «Điền giá từ đơn POS (60 ngày)»** (quản trị; `?xem=gia-tu-don`) — món POS CHƯA có giá (0 dòng `goi_gia`, kể cả bậc tắt) đã gộp vào sản phẩm ← COD đơn POS chỉ một món theo số lượng (BigQuery chỉ đọc, đệm 1 giờ; team của marketer vào ngày đơn; tệ đơn ≡ tệ thị trường shop): mức ≥80% trong 10 đơn gần nhất (≥3 đơn) và trùng mức cả cửa sổ — giá vừa đổi không đề xuất; bậc = COD trọn gói (ship để trống). Bảng xem trước SKU · tên · shop · bậc · số đơn · tỷ lệ · giá đơn gần nhất · ngày + đếm món bỏ theo lý do + shop không có đơn; bỏ chọn từng món; «Áp dụng N món» mang dấu xem trước (lệch ⇒ 409 kèm bảng mới) → ghi qua cửa lưu giá chỉ-giá (đẩy bản chép mọi page bán món), chốt «0 dòng giá» trong giao dịch ghi; nhật ký `dien_gia_tu_don_pos` ở sản phẩm (bậc · số đơn · tỷ lệ · khoảng ngày). Giá sau đó sửa ở Theo thị trường; page còn bản sao giá khác hiện LỆCH ở bước đối soát (GSP3). |
| **Page** | Marketer | Danh sách (thị trường suy từ shop, marketer kế thừa, cột «Còn thiếu», bật bot có trần) · một page: SP & giá (kế thừa từ sản phẩm × thị trường; page đã gắn chỉ xem, sửa ở Sản phẩm › Theo thị trường — GSP3b, CR-02-10b) · Lời bot · Ảnh · Trả lời sẵn · Kỹ thuật · Lịch sử · «Bật được chưa» · **Thử hỏi bot** · Luật chung: Luật · Chính sách/FAQ/Phản đối · Trả lời sẵn (một kho) · Đề xuất chờ duyệt. Đã làm ở LL3: thanh bên hai dòng (cụm «Tất cả page» — tab Kịch bản; cụm «Luật chung» — tab Luật · Trả lời sẵn); Chính sách/FAQ/Phản đối vẫn ở khối ④ trang một page. **VE2 (29/09): một page dựng lại theo bản vẽ 2c** — ba cột: page của team (bot bật hỏi tiến trình bot, khai khi đứng ở bản sao) · một page: công tắc ở đầu, «Bật được chưa», bảy tab Sản phẩm & giá · Lời bot (kịch bản lưu-là-chạy + khối chung) · Ảnh · Trả lời sẵn · Kỹ thuật (bot phụ trách, thiết lập, nguồn nhận tin) · Gợi ý cải thiện (để sau, BH5) · Lịch sử (các bản kịch bản) · cột «Thử hỏi bot» (chưa có đường — LL14) + «AI đang đọc gì» (ký tự thật). Đường `?tab=` cũ vẫn mở đúng chỗ. **VE3 (29/09): danh sách theo bản vẽ 2b** — viên «Lọc nhanh» có số đếm · nút Quét ở đầu trang · chọn nhiều page + thanh hàng loạt (gắn sản phẩm · bật bot tối đa 10 page, hộp xác nhận liệt kê tên, dừng ở lỗi đầu tiên) đi qua đúng cửa ghi từng page — không cửa ghi hàng loạt ở máy chủ. **VE4 (29/09): Luật chung theo bản vẽ 2d** — bốn tab Luật · Chính sách/FAQ/Phản đối (màn mới `/khoi-chung`: MỘT chỗ sửa ba khối cả team, đọc/ghi qua cửa MN7, lưu chờ xác nhận + phiên bản chống đè, team không giữ bộ khối của bot thì khoá ô và nói lý do) · Trả lời sẵn · Đề xuất chờ duyệt (thôi thử nghiệm; rỗng thì nói rỗng); tab Lời bot của trang một page chỉ còn tóm tắt + lối sang. **VE2b (30/09): gộp nốt theo lời người quyết** — «Tất cả page» vào thẳng danh sách (đầu trang ẩn, không thanh tab, cửa ghi đóng thành một dòng ở hàng tìm, nút Quét xuống hàng tìm, viên mới «Chưa có lời bot riêng»; bấm tên page mang bộ lọc sang) · trang một page: «← Tất cả page» về đúng chỗ, cột trái lọc bằng ĐÚNG bộ lọc danh sách (cùng hàm, cùng số), tab Lời bot + «Nhập từ file Pancake», tab Lịch sử xem / chép vào ô soạn / chạy lại từng bản · màn Kịch bản gộp hẳn (`/kich-ban` chuyển theo vai) · marketer vào mục Page bằng «Các page» (`/page` trần: danh sách + lọc; chưa có nguồn page ↔ người nên thấy mọi page của team) **LL15d (02/10):** marketer chỉ thấy page KẾ THỪA sản phẩm mình phụ trách (`page.san_pham_goc_ma`) — cột page · trang page · bản sao theo page; page ngoài phạm vi ⇒ 403 nói vì sao; các màn con của Page (kịch bản · ảnh · prompt…) chưa lọc (nợ N-MK-LOC-PAGE-CON) |
| **Số liệu** | Chủ team | Tổng quan (hai luồng tách) · Chi phí AI (page · model · từng tin) · Khách (nguồn · chỗ rơi · rủi ro hoàn bốn tầng). Đã làm ở LL5: một dòng thanh bên, bốn tab Tổng quan · Chi phí AI · Nguồn khách · Rủi ro hoàn; hai màn sau thôi ẩn và in «tính trên đơn tới ngày…» (prod: lát 28/08 tới khi có LL17) **VE-VA1 (30/09):** Tổng quan hỏng từ 25/09 (`T` chưa khai — mọi lượt tải rơi vào ô lỗi) đã vá, lên prod. **VE6a (30/09): Tổng quan theo bản vẽ 3a** — bốn ô số (chi phí AI/đơn · tin AI/đơn · đơn hai luồng KHÔNG gộp · BUY NOW: chưa đo được, 37,4% là số cũ) · hai phễu (chặng không nguồn nói «chưa có nguồn», không tỉ lệ rơi) · ba thước Messenger giữ dọc · bảng theo page ghép AI/đơn, xếp đắt nhất lên đầu, Chốt · Hoàn «chưa có nguồn theo page» · rủi ro hoàn bốn tầng cho quản trị · quản lý. Không chip khoảng / lọc page · marketer (chưa cửa nào nhận) **VE6b (30/09): Chi phí AI theo bản vẽ 3b** — bốn ô mỗi đơn · mỗi tin (đích BH8 ≤ 50 ₫) · token mỗi lượt · trúng cache (hai ô sau TOÀN HỆ: cầu không tách token đọc lại theo page; trúng cache = đọc lại ÷ (vào + đọc lại)) · ba tab Từng tin (sổ v3, quản trị · quản lý, 100 lượt mới nhất xếp đắt nhất) · Theo page (+ tổng của team; «chặn bằng trả lời sẵn» chưa có nguồn) · Theo model (nhà model · theo model chưa có nguồn · dự phòng chưa chạy) **VE6c (30/09): Khách theo bản vẽ 3c** — cụm còn BA tab Tổng quan · Chi phí AI · Khách; tab Khách: hội thoại CỦA TEAM theo giai đoạn × người giữ (CSDL v3, chữ Hộp thư, tô theo người giữ, tuổi dữ liệu; chưa có thì lùi về số toàn hệ của bot và nói vì sao) · rủi ro hoàn bốn tầng (quản trị · quản lý) + «Tra một khách» · hai khối rơi ở đâu (không tỉ lệ rơi) · hai luồng. «Rủi ro hoàn hàng» rời thanh tab, mở bằng «Xem đủ →» **LL17a (02/10): Tổng quan có khối «Đơn POS của team — theo marketer»** — số TỔNG HỢP từ BigQuery (`vw_sale_order_team`, đồng bộ hằng ngày; chỉ đọc, không chép dữ liệu khách): 7 · 30 ngày đơn · giao thành công · hoàn · huỷ · đang xử lý · tỉ lệ giao (trên đơn đã kết thúc) · COD đã giao theo TỪNG tiền tệ; đơn thuộc team HRM của marketer VÀO NGÀY ĐƠN (lịch sử team HRM — LL17d 05/10; thiếu lịch sử phủ ngày thì team hiện tại và câu cả công ty nói ra số đơn đó); bảng theo marketer (marketer chỉ thấy dòng mình); câu cả công ty: chờ gán team · ngoài hệ · đơn ngày tương lai bị loại; thước KHÁC ba thước Messenger, không cộng **LL17b (02/10): số đơn của màn đọc BigQuery** — ô «Đơn theo luồng — không gộp», luồng trang bán hàng, bước «Bấm BUY NOW» (Tổng quan · tab Khách) và «Hai luồng chạy song song» (tab Khách, 30 ngày, ba luồng: Messenger · trang bán hàng · không suy được khi có) đọc đơn của team từ BigQuery, luồng suy đúng luật bộ nạp đơn (mã hội thoại `<page>_<psid>` ⇒ Messenger, trống ⇒ trang bán hàng, sai khuôn ⇒ không suy được); bảng Theo page có «Chốt» (đơn 30 ngày trừ huỷ) · «Hoàn» (hoàn ÷ đơn đã kết thúc giao) theo `page_id` của đơn, page chỉ có đơn cũng thành hàng. Chưa nối BigQuery ⇒ về số chụp; số chụp cũ hơn khoảng đo ⇒ «chưa biết», không «0 · 0». Ba thước Messenger · chi phí AI/đơn · rủi ro hoàn vẫn đọc ảnh chụp 28/08 |
| **Cài đặt** | Quản trị | Bắt đầu · Kết nối (Pancake · POS · WhatsApp · HRM) · Model · Hệ còn sống (đối chiếu tin lỗi · tin bị lọc · diễn tập) · Người và team (người từ HRM; ghép marketer POS chỉ đọc) · Nhật ký. Đã làm ở LL6: một dòng thanh bên, sáu tab theo thứ tự này; màn Model gắn trạng thái THẬT từng vai (chính «Đang dùng» · dự phòng «Chưa nối» · nền «Chưa việc nào dùng»). **VE7a (30/09): theo bản vẽ 4** — thứ tự Bắt đầu · Hệ còn sống · Kết nối · Model · Người và team · Nhật ký; «Hệ còn sống không» nhận khối «Việc vận hành» (tin cần đối chiếu · tin bị lọc 24 giờ · diễn tập — số thật từ một cửa đọc, chỉ quản trị · quản lý) với lối sang đúng tab; «Vận hành» rời thanh tab, mở từ nút của từng việc. **VE7b (30/09): Kết nối theo bản vẽ 4** — năm phần Pancake · POS · WhatsApp · HRM · Kéo dữ liệu; POS mỗi shop kèm tiền tệ + số món suy từ danh mục đã kéo (không đo được ⇒ «chưa đo» + vì sao); «Không quyền» của token chưa đo; WhatsApp «Chưa nối»; HRM «Chưa nối vào máy chủ» (nguồn sẽ đọc, không số đo tay); «Kéo dữ liệu» gom thêm kho POS · kéo danh mục · quét Pancake (cùng cửa «Tất cả page») · nạp lại. **VE7c (30/09): Model theo bản vẽ 4 — «Màn chỉ hiện thứ bot THẬT SỰ dùng»** — hai thẻ theo vai (Trả lời khách · Dự phòng; Việc nền ẩn tới khi có việc nối vào); thẻ Trả lời khách đọc ĐƯỜNG CHỌN CỦA BOT (`src/chat/model.js#chonModel`, chính hàm `layModel` gọi): team chưa lưu cấu hình ⇒ «bot gọi model máy chủ (MODEL_CLOSER) bằng KIMI_API_KEY, không gửi độ ngẫu nhiên», không còn «chưa có khoá» giả; nhãn khoá mỗi thẻ theo đúng luật của đường dùng nó (bot · lớp v3 `V3_KHOA_<NHÀ>`); «Thay khoá và thử một lượt» gọi đúng model + khoá MỘT lần (lỗi nhà model về câu đọc được, HTTP 200; chặn bấm dồn 10 giây; ghi nhật ký `thu_model`); dải đầu trang đếm page bot mới đang xử bằng luật worker. **VE7d (01/10): Người và team theo bản vẽ 4** — ba nút đầu trang (Lấy người từ HRM: tắt + nói vì sao · Tạo người dùng · Chuyển page sang team khác: mở khung chuyển); ba thẻ vai Quản trị · Marketer · Sale, «mở được» đo bằng CHÍNH hàm dựng thanh điều hướng (`menuCua`); phụ trách theo sự thật — marketer «Chưa có nguồn» (§9 «chỉ thấy sản phẩm mình phụ trách» chưa làm, đếm page có tên marketer); «Marketer trên POS ↔ hồ sơ HRM» «Chưa nối vào máy chủ» (nguồn sẽ đọc, chờ H11 · LL15, không số đo tay); bảng người Người · Hồ sơ HRM («chưa nối») · Vai · Phụ trách · Tài khoản; bỏ hàng chỉ số + tab POS (POS ở Kết nối); câu «bot chạy bằng bộ mặc định» rời cảnh báo team và bước Model của Bắt đầu. **VE7e (01/10): Nhật ký theo bản vẽ 4** — «Nhật ký · Ghi cả việc người làm lẫn việc máy làm. Không ai sửa hay xoá được.» (tên màn trong sổ đổi theo — HK10); mỗi dòng một câu: lúc «28/09 15:04» · ai · việc · đối tượng bằng TÊN (bảng sống của team → tên chụp trong chính dòng nếu đã xoá → «Loại #id», không đoán, không mượn tên team khác), ghi chú ngay dưới; dòng máy nói việc gì («máy · cửa POS»; việc lạ hiện nguyên mã); mã tầng A ghi thẳng (`sua` · `them` · `doc` · lượt kéo POS…) ra chữ mà không thành mã v3 được ghi; giữ hai làn (mặc định việc người — prod 01/10: 472/500 dòng mới nhất là máy). **LL15a (02/10): HRM lên màn, CHỈ ĐỌC** — máy chủ đọc BigQuery `levelup-465304` (khoá ở `/etc/aicloser/bq-levelup.json`, biến `V3_BQ_KHOA`; token phạm vi `bigquery.readonly`; đệm một ngày + «Đọc lại HRM»): Kết nối › HRM hiện số đọc từ nguồn (hồ sơ · bảng ghép · tài khoản marketer); Người và team: cột «Hồ sơ HRM» khớp theo email công ty (mã NV · trạng thái · team) và bảng «Marketer trên POS ↔ hồ sơ HRM» của ĐÚNG team đang mở (đang làm + chờ gán; đã nghỉ / không vào hệ chỉ đếm). Tạo tài khoản từ HRM, khoá người nghỉ: LL15b (chưa làm). Số đơn 14 ngày + shop mỗi tài khoản: chưa đo (cần kéo đơn POS). **LL15b (02/10): người + vai THEO HRM** — «Lấy người từ HRM (BigQuery)» mở KẾ HOẠCH (tạo tài khoản · gắn tài khoản có sẵn theo email · cấp vai · rút vai · khoá · mở khoá · đổi tên team, kèm chỗ HRM và hệ lệch) rồi «Áp dụng» đúng bản đã xem (vân tay; chỉ Quản trị của MỌI team); luật: Marketer/Sale đang làm của team Pialpha có email ⇒ tài khoản; MKT → Marketer ở team mình, SALE → Sale ở cả ba team; nghỉ ⇒ rút vai HRM + khoá (không khoá quản trị duy nhất, không đụng tài khoản/vai tạo tay); tên team theo HRM. Vai do HRM cấp mang chữ «HRM», không rút tay (máy chủ từ chối `vai_cua_hrm`). Tài khoản HRM tạo ra «Chưa đặt mật khẩu» + nút «Đặt mật khẩu» (một lần). Câu cạnh nút: nhịp (tự động mỗi 24 giờ khi `V3_HRM_TU_DONG=1`, vắng = chỉ khi bấm) + lần cuối. Lượt tự động vượt rào (HRM rỗng · rút > 30% · khoá > 5) thì hoãn, ghi nhật ký, chờ người |

**Khung** (LL18 · 29/09, theo bản vẽ «AI Closer — làm lại từ đầu»): thanh NGANG trên cùng — logo · team · năm đích ·
dải trạng thái bot · tài khoản — và dải «Trong mục X» ngay dưới cho mục con của đích (Hộp thư: Việc của tôi · Hộp thư ·
Việc đang chờ; Page: Tất cả page · Luật chung; Số liệu và Cài đặt: các tab của cụm). Thay thanh bên tối — mọi chữ «thanh
bên» ở bảng trên đọc là «dải Trong mục». MÁY CHỦ vẽ khung vào HTML (không chờ JS), tệp chung cache theo mã phiên bản,
nén gzip. Liên kết trong trang tới màn vai đó không mở được thì tắt kèm lời «nhờ quản trị»; `/` đưa mỗi vai về màn đầu của mình.

## Màn cũ đi đâu — không chức năng nào bị bỏ sót

**Cụm** (LL3, `man-hinh.js#CUM`): nhiều màn một việc = MỘT dòng thanh bên + tab ngay dưới đầu trang (khung vẽ). Màn đầu cụm mang tên cụm; vai không mở được màn đầu cụm thấy đúng tên màn của mình.

«Gộp» = chức năng giữ, chuyển nhà. «Chuyển nội dung» = khái niệm bỏ, dữ liệu sang chỗ khác. «Để sau» = chưa làm ở sóng này.

| Màn cũ | Mã | Nhà mới | Cách | Phiếu |
|---|---|---|---|---|
| Việc của tôi | `trang-chu` | Hộp thư (sale) · Page › cột «Còn thiếu» (marketer) | Gộp | LL2 · LL3 · gỡ LL8 |
| Bàn hội thoại | `ban-hoi-thoai` | Hộp thư › Cần bạn | Giữ | LL2 |
| Việc đang chờ · Chi tiết việc | `dispatch` | Hộp thư › Cần bạn + Đơn chờ (giữ API nhận/đóng việc) | Gộp | LL2 · gỡ giao diện LL8 |
| Hội thoại và đơn | `van-hanh` | Duyệt/sửa/từ chối đơn · nhận thay bot → Hộp thư (LL2). Màn còn lại = **Cài đặt › Vận hành** (LL10) | Gộp | LL2 · LL10 |
|   ↳ đổi nguồn nhận tin page | `van-hanh` | Cài đặt › Vận hành (tab Page & trạng thái); trang một page › Thiết lập trỏ thẳng tới | Gộp | LL10 ✓ |
|   ↳ đối chiếu tin lỗi · tin bị lọc · diễn tập | `van-hanh` | Cài đặt › Vận hành (ba tab); Hệ còn sống trỏ thẳng tới | Gộp | LL10 ✓ |
|   ↳ chi phí từng tin | `van-hanh` | Cài đặt › Vận hành (tab Chi phí theo tin); Số liệu › Chi phí AI trỏ thẳng tới | Gộp | LL10 ✓ |
| Tất cả page | `page-bot` | Page › Danh sách (thị trường suy từ shop POS, marketer kế thừa từ Sản phẩm) | Giữ | LL3 · LL16 |
| Trang một page | `mot-page` | Page › một page | Giữ | LL3 |
| Sản phẩm & kho | `san-pham` | **Sản phẩm** › Chung · Theo thị trường (1 shop POS, 1 món POS, marketer HRM) · Page đang bán | Giữ | LL13 |
|   ↳ nối món POS (MN8) | `san-pham` | Sản phẩm › thêm thị trường · Gộp món POS nhiều shop | Gộp | LL13 |
| Đưa sản phẩm lên chạy | `len-chay` | Page › «Bật được chưa» | Gộp | LL3 · gỡ LL8 |
| Page còn thiếu gì | `san-sang` | Page › Danh sách, cột «Còn thiếu» | Gộp | LL3 |
| Kịch bản của page | `kich-ban` | Page › tab Lời bot + Lịch sử | Gộp | LL3 · gộp hẳn VE2b (`/kich-ban` chuyển hướng theo vai) |
|   ↳ kịch bản tầng sản phẩm · tầng nước | `kich-ban` | Sản phẩm › Chung · Theo thị trường | Giữ | LL13 |
| Quy tắc chung mọi page | `bo-luat` | Page › Luật chung › Luật | Giữ | LL3 |
| Chính sách · FAQ · Phản đối | `khoi-chung` | Page › Luật chung › Chính sách · FAQ · Phản đối | Mới (tách khỏi trang một page) | VE4 |
| Câu trả lời sẵn | `lop-0-dong` | Page › Luật chung › Trả lời sẵn (một kho) | Giữ | LL12 |
| Kỹ năng theo sản phẩm | `ky-nang` | Sản phẩm › «Chung — kiến thức bot đọc» › ô «Hỏi size trước khi chốt» (LL11 ✓; màn ra khỏi menu) | Chuyển nội dung | LL11 ✓ · gỡ giao diện LL8 |
| Đoạn chữ gửi cho AI | `prompt-page` | Page › «AI đọc gì» | Gộp | LL3 · gỡ LL8 |
| Ảnh gửi khách | `thu-vien-anh` | Page › tab Ảnh | Gộp | LL3 |
| Gợi ý từ AI | `ai-de-xuat` | Page › Luật chung › Đề xuất chờ duyệt | Gộp | LL3 · gỡ LL8 · lên tab VE4 |
|   ↳ soi hội thoại → sửa lời bot, giảm tiền | (chưa có) | Page › tab Gợi ý cải thiện | Để sau | BH5 |
| So hai bản kịch bản | `hieu-qua` | Page › Lịch sử › So hai bản | Để sau | gỡ LL8 |
| Đơn và tỉ lệ chốt | `bao-cao` | Số liệu › Tổng quan (hai luồng tách) | Giữ | LL5 |
| Chi phí AI | `chi-phi` | Số liệu › Chi phí | Giữ | LL5 |
| Khách vào từ đâu | `nguon-khach` | Số liệu › Khách | Gộp | LL5 |
| Rủi ro hoàn hàng | `rui-ro-hoan` | Số liệu › Khách + huy hiệu ở Hộp thư | Gộp | LL5 |
| Tìm khách (trước: Khách hàng) | `ho-so-khach` | Hộp thư › Tìm khách | Gộp | LL2 · dựng lại VE5b |
| Cài đặt team · Bắt đầu | `cai-dat-team · bat-dau` | Cài đặt › Bắt đầu | Gộp | LL6 |
| Người và team | `team` | Cài đặt › Người và team (người từ HRM) | Giữ | LL6 · LL15 · VE7d |
| Kết nối | `ket-noi` | Cài đặt › Kết nối (Pancake · POS · WhatsApp · HRM) | Giữ | LL6 |
| Model AI & khoá | `model` | Cài đặt › Model (chính + dự phòng, chỉ hiện thứ đã nối) | Giữ | LL6 · LL14 · VE7c |
| Hệ còn sống không | `suc-khoe` | Cài đặt › Hệ còn sống | Giữ | LL6 |
| Nhật ký (tên cũ «Ai đã sửa gì») | `nhat-ky` | Cài đặt › Nhật ký | Giữ | LL6 · VE7e |
| Đăng nhập · Chọn team | `auth` | LL15c (02/10): màn chọn team CHỈ cho quản trị nhiều team; người khác vào thẳng team mặc định (team dùng lần trước, chưa có thì team đầu theo tên), đổi bằng menu nhỏ ở chip team trên thanh trên; một team ⇒ chip chỉ là chữ | Giữ | LL15c |
| Nhắn cho khách (nhóm 3) · Kho ưu đãi · Hậu bán (nhóm 8) | (chưa có) | chưa có màn | Để sau | — |

---

## Bản cũ — 37 màn, 8 nhóm (hiệu lực tới khi LL8 gỡ màn cũ)

> Bản vẽ tương tác: <https://claude.ai/code/artifact/34dbfd0d-50cd-4e95-b07e-6adf202c7632>
> Dùng menu trang ở thanh công cụ để chuyển giữa 8 nhóm.

Mockup dùng đúng hệ thiết kế của dashboard đang chạy — xanh `#0e7c86`, sidebar `#0b2125`,
bo góc 12px, SF Pro 13.5px, cùng các thành phần `.pill` `.mc` `.tablecard` `.seg`. Dữ liệu
trong mockup lấy từ production thật; tên khách là tên đặt mới.

---

### Nhóm 1 · Vào hệ thống và điều phối

| Màn | Việc của nó |
|---|---|
| Chọn team | Ba thẻ team: Tiểu Alpha · Auus · Pialpha EU. Dữ liệu tách ở tầng dữ liệu. **LL15c (02/10):** chỉ QUẢN TRỊ thuộc nhiều team đi qua màn này; sale (thành viên cả ba team theo HRM) vào thẳng team mặc định và đổi bằng menu nhỏ «Đổi sang team» ở chip tên team (cũng mở từ «Đổi team» trong menu tài khoản) |
| Trang chủ | Marketer vào thấy đúng việc của mình: đề xuất chờ duyệt, sản phẩm hết hàng, page kịch bản mỏng |
| Bàn hội thoại | Sale vào thẳng đây (CR-28-09). Ba cột: danh sách hội thoại (Cần người · Bot đang xử · Tất cả, đồng hồ 10 phút; chưa có hồ sơ khách thì hiện tên Messenger) · khung chat đọc thẳng Pancake, tin page gắn nhãn **Bot AI · Tự động · Page** (chỉ theo dữ liệu đối chiếu được — «Page» là sale gõ tay hoặc chưa đối chiếu, không đoán là sale) · bối cảnh: khách + rủi ro hoàn · đơn đang bàn · giai đoạn/người giữ/lý do cuối · kịch bản page đang chạy · lượt bot (v3 và bot cũ). KHÔNG ô soạn tin — trả lời ở Pancake |
| Chi tiết việc cần xử | Lý do bot dừng + thông tin đơn + đánh dấu đã xử; đoạn chat nằm ở bàn hội thoại, đọc thẳng Pancake |

### Nhóm 2 · Khách và đơn hàng

| Màn | Việc của nó |
|---|---|
| Nguồn khách vào | Sơ đồ hai luồng đơn chạy song song, chỉ gặp nhau ở đích. Chỗ rơi 37,4% |
| Trả lời bình luận | Sáu luật theo loại bình luận. Điều kiện để tắt Botcake diện rộng |
| Xác nhận đơn qua WhatsApp | **Chỉ đơn trang bán hàng.** Bộ lọc ngày, sản phẩm, marketer, thị trường, page |
| Hồ sơ khách hàng | Gộp ba kênh theo số điện thoại. Không gộp thì đếm nhầm đơn trùng |
| Rủi ro hoàn hàng | Bốn tầng chính sách thay vì một ngưỡng cứng |
| Hàng chờ tạo đơn | Đích của luồng Messenger. Sale duyệt là tạo đơn thẳng ở Chờ in |

### Nhóm 3 · Nhắn tin hàng loạt

| Màn | Việc của nó |
|---|---|
| Soạn tin hàng loạt | Chọn page, chọn sản phẩm, tự viết nội dung. **Bảng phân đường nằm cạnh nút gửi** |
| Xin phép nhận tin | Nút thắt của mọi việc nhắn ngoài 24 giờ. Năm chỗ xin, chỗ nào ăn nhất |
| Chiến dịch đã gửi | Danh sách chiến dịch, kho tin đã Meta duyệt, trần tần suất tự bảo vệ |
| Đuổi theo trong 24 giờ | Bậc thang theo mốc giờ: +2h nhắc nhẹ, +12h freeship, +20h tặng quà |

### Nhóm 4 · Bộ não AI

| Màn | Việc của nó |
|---|---|
| Bộ luật chung | 10 mục quy tắc cứng, 2.256 token, dùng chung 51 page. Có phiên bản, duyệt, phân tích ảnh hưởng |
| Thư viện kỹ năng | Tầng còn thiếu giữa bộ luật và kịch bản. Bật theo nhóm sản phẩm |
| Prompt của page | Xem prompt **thật** gửi cho model: bốn khối, số token từng khối, soi mâu thuẫn |
| AI đề xuất | Đề xuất sửa ở **cả ba tầng**, không chỉ kịch bản |

### Nhóm 5 · Kịch bản và nội dung

| Màn | Việc của nó |
|---|---|
| Kịch bản | Cây ba tầng: sản phẩm → nước → page. Tầng dưới ghi rõ "Kế thừa" khi không có bản riêng |
| Soạn kịch bản | **Hai bước không được đảo**: bản tiếng Việt cho team đọc → máy dịch thành lời bot nói |
| Nhập kịch bản từ Pancake | Thả file `quick_replies`, hệ thống bóc bảng giá và gắn nhãn ảnh |
| Lớp trả lời 0 đồng | Các mẫu miễn phí + đối chiếu bộ từ khoá Botcake |
| Thư viện ảnh | Ảnh gắn nhãn theo chủ đề để bot chọn đúng lúc |

### Nhóm 6 · Page và sản phẩm

| Màn | Việc của nó |
|---|---|
| Page & Bot | **Nút bật/tắt BOT AI.** Tắt Botcake bên kia trước, rồi mới gạt công tắc |
| Cửa kiểm sẵn sàng | Sáu điều kiện, bấm ô đỏ nhảy thẳng tới chỗ sửa |
| Sản phẩm & kho | Đồng bộ từ POS. Hết hàng thì tự tắt bot cho sản phẩm đó |
| Đưa sản phẩm mới lên chạy | Sáu chặng, mỗi chặng một cửa kiểm. Chặng 2 bắt buộc có động cơ |

### Nhóm 7 · Số liệu và quản trị

| Màn | Việc của nó |
|---|---|
| Báo cáo | **Tách hai luồng** vì đo bằng hai thước khác nhau |
| Chi phí AI | 127 đ/tin, 6.696 đ/đơn. Bảng theo page tìm chỗ đốt tiền mà không ra đơn |
| Hiệu quả kịch bản | A/B hai bản cạnh nhau theo phễu. Chưa đủ mẫu thì nói rõ chưa kết luận |
| Sức khỏe hệ thống | Đèn 9 chỉ số. Page bị chặn thì đếm số khách đang chờ |
| Model AI & khoá | Bốn nhà, khoá riêng từng team, quy giá công bố ra tiền thật |
| Cấu hình team | Kết nối POS, Pancake, WhatsApp, Botcake, Telegram · thành viên và vai |
| Kết nối & token | Kho token Pancake theo thứ tự failover, khoá Botcake, mẫu tin WhatsApp |
| Nhật ký thao tác | Ghi cả việc máy làm. Không sửa không xoá |

### Nhóm 8 · Giai đoạn sau

| Màn | Việc của nó |
|---|---|
| Kho ưu đãi | Giảm giá, freeship, tặng quà kèm điều kiện áp dụng và đo lãi ròng |
| Hậu bán & mua lại | Vòng đời sau khi nhận hàng, tính chu kỳ dùng hết để nhắc đúng lúc |

Hai màn này **đã thiết kế xong nhưng chưa làm** — để lại đợt sau theo yêu cầu.
