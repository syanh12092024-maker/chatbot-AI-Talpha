# Nhật ký phiếu VE6c — Số liệu › Khách theo bản vẽ 3c (30/09/2026)

> CR-28-09c · làn 🟩 (màn ĐỌC; một hàm gom ĐỌC mới ở tầng dữ liệu; sổ màn đổi thanh tab) · base `49d46dc` · commit `0405e8b` ·
> Đụng bộ não: không.

## Đo trước khi code

- Bản vẽ 3c: tab «Khách» (cụm Số liệu còn Tổng quan · Chi phí AI · Khách) — «Hội thoại đang đứng ở đâu» (thanh ngang theo cặp giai
  đoạn × người giữ, tô theo người giữ, tổng 29.563, «70% ở Chào · Botcake giữ») · rủi ro hoàn bốn tầng + «Tra một khách cụ thể» ·
  Messenger rơi ở đâu · trang bán hàng rơi ở đâu. Bản đồ phủ màn: «Khách vào từ đâu → Số liệu › Khách · Gộp», «Rủi ro hoàn → Số liệu
  › Khách + huy hiệu ở Hộp thư · Gộp».
- 29.563 của bản vẽ = số `hoi_thoai` của v3 trên prod ⇒ bản vẽ đếm từ CSDL v3 (có `trang_thai` + `chu_so_huu` theo team), KHÔNG từ
  bot cũ. Màn hiện có vẽ khối này từ cầu `/ops/conv-state` của bot cũ: TOÀN HỆ, giai đoạn và người giữ TÁCH RỜI (không có cặp) —
  thước ②a/②b ghim đúng điều đó. Không hàm nào gom `hoi_thoai` theo team.
- Hai bộ nhãn giai đoạn: `kho-nguon.js#BAC` («Vừa chào · Đang bán…») vs Hộp thư `GIAI_DOAN` («Chào · Tư vấn…» = bản vẽ).

## Làm gì — chọn gì thay gì

1. Tầng dữ liệu: `so-lieu.js#phanBoHoiThoai` — MỘT câu GROUP BY `trang_thai × chu_so_huu` của team, kiểm vai `VAI_XEM_SO_LIEU` (quản trị ·
   quản lý · marketer = vai tab Khách), tuổi = `max(cham_luc)` (v3 chưa đồng bộ hội thoại liên tục ⇒ in tuổi cạnh số). Nối qua
   `dungPhanB({ docPhanBoHoiThoai })` + `chay-that.js` như `docPhanBoHoan`.
2. `/api/nguon-khach` trả thêm `phanBo` (nhãn chữ Hộp thư; hỏng/chưa nối ⇒ `docDuoc:false` + lý do). Khối toàn hệ `pheu` GIỮ nguyên
   (②a/②b không đổi) — trang dùng khi `phanBo` không có, và NÓI vì sao đang hiện số toàn hệ.
3. Trang (thứ tự bản vẽ): phân bố theo team (thanh tô theo người giữ — `data-chu` + CSS, «dữ liệu tới …», «X% đang ở …» khi ≥ 50%) ·
   rủi ro hoàn bốn tầng (hỏi menu trước — marketer không gọi cửa) + «Xem đủ →» + «Tra một khách cụ thể →» (chỉ khi menu có Tìm khách)
   · Messenger rơi ở đâu (bốn chặng «chưa có nguồn» — ảnh chụp không phải dòng chảy) · trang bán hàng rơi ở đâu (BUY NOW = số đơn ·
   WhatsApp «chưa chạy · 37,4% là số cũ») · hai luồng (giữ, xuống cuối). Câu «ảnh chụp, không phải tỉ lệ rơi» giữ MỘT lần (đầu trang).
4. Sổ màn: tab «Nguồn khách» → «Khách»; «Rủi ro hoàn hàng» rời thanh tab ⇒ `moTuManKhac` (lối vào: tab Khách + Tổng quan — ca ④g
   canh) + `nhaCum: 'so-lieu'`. Đứng ở `/rui-ro-hoan`: «Số liệu» sáng ở thanh trên, hàng hai không tab nào sáng (Rủi ro hoàn không còn là
   tab) — muốn «Khách» sáng cần khái niệm «tab nhà» ở khung; KHÔNG làm ở phiếu này.

## Thước (án lệ #27 — khai căn cứ VE6c + bản đồ phủ màn)

`ll5-so-lieu` S1/S2 · `ll18-khung` K2 (ba tab) · `dieu-huong` ④c (mở-từ-màn-khác + Rủi ro hoàn) · `ll1-nam-dich` N5 (`BO_CO_CHU_Y` +
`/rui-ro-hoan`). Mới: `test/ve6c-phan-bo-hoi-thoai.test.mjs` H1–H3 (Postgres thật: đúng team · đúng cặp · tuổi · sale bị từ chối · cửa
HTTP) · `v3/test/b/ve6c-khach.test.mjs` K1–K5 (CHẠY THẬT script trang).

## Đảo-vá — 10/10 đỏ (lượt đầu 9/10)

M1 luôn lùi toàn hệ · M2 nhãn khác Hộp thư · M3 bỏ tuổi · M4 % trên cặp sai · M5 marketer gọi cửa rủi ro · **M6 lối «Tra một khách» cho
mọi vai — lượt đầu SỐNG** (hôm nay chưa vai nào xem được rủi ro hoàn mà thiếu Tìm khách ⇒ nhánh không ca nào chạm) ⇒ thêm K5 dựng đúng
menu đó ⇒ đỏ · M7 gom lẫn team khác (Postgres) · M8 Rủi ro hoàn quay lại thanh tab · M9 lùi toàn hệ không nói vì sao · M10 chặng Messenger
bịa số.

## Đo

- Cổng `ops/bin/nghiem-thu/ve6c.sh`: ĐỎ 0 / XANH 11 (kèm ve6b → ve6a → va1).
- `npm test` (dev, sandbox): **2.350 ca · 2.346 đạt · 0 đỏ · 4 bỏ qua** · lượt từ chối mới của Postgres.app: 0.
- Bấm thật (dev · app trong tiến trình · sandbox · 57 hội thoại gieo đủ năm cặp; phân bố đọc CSDL THẬT qua `phanBoHoiThoai`): quản trị —
  «57 hội thoại của team · dữ liệu tới 30/9/2026», thanh 40 · 10 · 4 · 2 · 1 tô đúng người giữ, «70% đang ở «Chào · Botcake giữ»», bốn tầng
  rủi ro + hai lối, hai khối rơi ở đâu · `/rui-ro-hoan` mở từ «Xem đủ →» 0 lỗi · marketer — cùng phân bố, không khối rủi ro, không gọi cửa ·
  hàng hai «Tổng quan | Chi phí AI | Khách» · lỗi JS 0 · request hỏng 0 · 390px tràn ngang 0.
- Bò toàn bộ (ba vai, 51 màn): lỗi JS 0 · khung lệch 0 · HTML thô 0 · request hỏng 6 = cùng 6 của VE6a/6b (502 sandbox của cầu bot cũ).

## Chưa làm

- Chặng Messenger «nhắn inbox · bot tư vấn · sale duyệt» và lý do rơi (không trả lời tin đầu · hỏi giá rồi im): cần đếm theo lượt ở tầng
  dữ liệu — phân bố hôm nay là ảnh chụp. «Tab nhà» cho màn mở-từ-màn-khác (Rủi ro hoàn sáng tab Khách): việc của khung.
