# PHIẾU VE7c — Cài đặt › Model theo bản vẽ 4: «Màn chỉ hiện thứ bot THẬT SỰ dùng»

> Làn 🟨 (chạm đường CHAT: tách phần quyết định của `src/chat/model.js#layModel` — hành vi bot y nguyên) · CR-28-09c ·
> 30/09/2026 · KHÔNG đụng năm tệp bộ não · 0 biến · 0 gói · 0 migration.
> Commit `4dd6b93` · cổng `ops/bin/nghiem-thu/ve7c.sh` · ca `v3/test/b/ve7c-model.test.mjs`.

## 1 · Đề bài

Bản vẽ 4 › Model AI (artifact «AI Closer — làm lại từ đầu»): ba thẻ theo vai (Trả lời khách · Dự phòng · Việc nền — việc nền
ẩn tới khi có việc nối vào), dải «Màn chỉ hiện thứ bot THẬT SỰ dùng», mỗi thẻ ô khoá theo nhà + nút «Thay khoá và thử một
lượt», bảng giá gập lại. Luật chung của chuỗi VE: chỗ chưa có nguồn nói «chưa có nguồn / chưa đo», không bịa.

**Phạm vi âm:** không nối dự phòng vào đường trả lời (LL14) · không đổi luật khoá của bot · không đổi `ghiCauHinh` (lưu khoá
vẫn ghi đủ ba dòng) · không đụng `src/closer.js` `src/prompts.js` `src/tools.js` `src/fast-lane.js` `src/outbound-guard.js`.

## 2 · Đo lại nguyên liệu — màn cũ nói sai về bot trên prod

Đọc prod 30/09 (chỉ đọc, chỉ tên biến + số đếm, không in khoá):
- `.env`: `AI_PROVIDER=kimi` · `MODEL_CLOSER=kimi-k2.6` · có `KIMI_API_KEY` + `ANTHROPIC_API_KEY` · **không** có `V3_KHOA_<NHÀ>`
  nào · không `KIMI_BASE_URL`. Ba dịch vụ nạp bằng `--env-file=/opt/aicloser/.env`.
- `cau_hinh_model`: CHỈ team 1 có ba dòng (kimi-k2.6 · 0,30 / claude-haiku-4.5 / deepseek-v4-flash · 0,10); `khoa_nha`: team 1 ×
  kimi = 1. 4 team; page: team 1 = 514, team 4 = 68; `giao_bot_moi` = 0.

Đo mã: bot mới (`handler-v3.js:721` → `src/chat/model.js#layModel`) chọn model + khoá bằng luật RIÊNG, không qua lớp v3
(`v3/src/model/cau-hinh.js#docCauHinh`) mà màn cũ đọc:
- team KHÔNG có dòng ⇒ bot gọi `MODEL_CLOSER` qua client cũ của `llm.js` bằng `KIMI_API_KEY`, KHÔNG gửi độ ngẫu nhiên; lớp v3
  trả «bộ mặc định» (kimi → haiku, 0,3) và đọc khoá env TÊN KHÁC (`V3_KHOA_<NHÀ>`).
- ⇒ với team 2–4 (team 4 có 68 page) màn cũ in «Chưa cấu hình — đang chạy bộ mặc định» + hộp đỏ «Model chính … CHƯA có khoá —
  mọi lượt chat sẽ rơi thẳng sang dự phòng»: **sai cả ba vế** (bot có khoá · không chạy bộ mặc định · dự phòng chưa nối). Và
  một nút «Thử» viết theo lớp v3 sẽ báo «Chưa có khoá» cho một bot đang chạy. Team 1: hai luật trùng kết quả.

## 3 · Đã làm

- `src/chat/model.js`: tách **`chonModel`** (phần quyết định của `layModel`: dòng cấu hình → model/nhà/khoá/nguồn khoá/độ ngẫu
  nhiên, không dựng client, không gọi nhà model, không chạm `llm-health`) + **`khoaCuaBot`** (luật khoá của bot một chỗ: khoá team
  thắng; chưa có thì CHỈ nhà trùng `AI_PROVIDER` mượn khoá máy chủ). `layModel` = `chonModel` + dựng client — hành vi y nguyên.
  `LoiChuaCoLopModel` thêm thuộc tính `lyDo` (`model_la` · `lech_nha` · `thieu_khoa`) — thuộc tính MỚI, không đụng `ma`
  (nơi khác chỉ đọc `name`/`khongThuLai`, grep 30/09).
- `kho-model.js`: `datDuongBot({chon, khoa})`; `manModel` trả `botDung` (bot THẬT đang gọi gì cho vai trả lời khách; lỗi chọn
  của bot ⇒ `loi`, lỗi đọc khác ⇒ `chuaDo`) + `khoaBot` theo nhà (chỉ nguồn, KHÔNG khoá) + `botMoi` (số page bot mới xử — luật
  worker `pageThuocBotMoi`) + `thuGanNhat`. `thuModel`: vai chính theo ĐƯỜNG BOT, dự phòng theo lớp v3; gọi `goiMotLan` MỘT lần
  (16 token, 20 giây); lỗi nhà model ⇒ `{ok:false, chu}` HTTP 200; chặn bấm dồn 10 giây theo team; nhật ký `thu_model`
  (`sau.nguon` · `sau.duong`). Chưa nối đường bot ⇒ «chưa đo» + KHÔNG thử vai chính bằng luật khác.
- Router `POST /api/model/thu` (quản trị) · vai-b nối `duongBot` (thiếu ⇒ báo trong «chưa nối») · `chay-that.js` nối
  `chonModel`/`khoaCuaBot` trên pool (nạp lười như `dichBanMay`) · mã nhật ký `thu_model` (nhóm model).
- Màn `model-ai.html` viết lại: dải sự thật (page bot mới xử + bot cũ không gửi độ ngẫu nhiên) · thẻ «Trả lời khách» có dòng
  «Bot đang gọi …» đo từ đường bot · nhãn khoá mỗi thẻ theo ĐÚNG luật đường dùng nó (bot: `KIMI_API_KEY`… · dự phòng:
  `V3_KHOA_<NHÀ>`) · đầu trang «Chưa lưu cấu hình riêng — bot dùng model của máy chủ» · «Thay khoá và thử một lượt» (lưu khoá
  vừa dán rồi thử; đổi model chưa lưu ⇒ từ chối) · việc nền ẩn + một dòng ghi chú · bảng giá gập.
- Hợp đồng `docs/v3/ban-giao/duong-tin-v1.md` §6 viết lại theo mã hôm nay (hai câu cũ đã trôi — xem §5) · `03-MAN-HINH.md`.

## 4 · Chọn A thay B

- **Tách luật trong `src/chat/model.js` thay vì chép luật sang `kho-model.js`** — hai luật song song chính là lỗi đang sửa.
  Giá: chạm tệp trên đường chat thật (không phải bộ não) ⇒ đo lại bằng ca `layModel` trên Postgres (l2-m1 N3/N3c, journey,
  handler, ngôn ngữ) + ca C9 đo `chonModel` ≡ `layModel` trên mọi nhánh.
- **Lượt thử gọi `goiMotLan` trực tiếp, không qua client của `layModel`/`llm.js`** — client đó đếm sức khoẻ, một lượt thử hỏng
  sẽ làm đèn bot đỏ. Giá: team đi model máy chủ thì bot gọi qua SDK cũ, lượt thử qua bộ nối v3 — CÙNG model, CÙNG khoá, CÙNG
  địa chỉ (prod không đặt `KIMI_BASE_URL` ⇒ cả hai `https://api.moonshot.ai/anthropic`), khác mã client; lượt thử có gửi độ
  ngẫu nhiên mặc định 0,3 (bot đường này không gửi) — không đổi phép đo khoá + model.
- **Dự phòng thử theo lớp v3** — lớp sẽ dùng nó khi nối (LL14). Prod chưa có `V3_KHOA_CLAUDE` ⇒ «Chưa có khoá của Anthropic
  Claude» là đúng cho lớp đó; màn ghi tên biến để không ai tưởng là `ANTHROPIC_API_KEY`.
- **Ẩn ba hộp của lớp model ở MÀN, giữ dữ liệu máy chủ** (thước `model-man-hinh` 14/14 không đổi): `chinh_khong_khoa` (thay
  bằng sự thật đường bot) · `du_phong_khong_khoa` khi dự phòng chưa nối (có khoá cũng không ai đỡ) · `con_nha_chua_khoa` (câu
  «không chọn được model» sai: chọn được, chỉ không gọi được — ô chọn mỗi thẻ đã ghi «(chưa có khoá)» theo đúng luật thẻ đó).
  Chỉ màn Model đọc `canhBao` (grep 30/09).
- **Trường nhật ký `nguon` thay `nguonKhoa`** — nhật ký che mọi trường tên có «khoa» (`audit/index.js#KHOA_NHAY_CAM`).

## 5 · Thước

- `vai-b-noi-day` «nối đủ thì không còn thiếu gì» ⇒ thêm `duongBot` vào khối nối đủ + đòi báo thiếu khi vắng (luật mới, sửa
  cả thước).
- `duong-tin-v1.md` §6 (hợp đồng, không ca nào đọc): bản cũ khai «có dòng mà khác nhà `AI_PROVIDER` ⇒ ném» và «`closer.js`
  KHÔNG đọc `ctx.model`» — đo lại: `src/closer.js:17` `const selected = ctx.model || {…}`, `handler-v3.js:778` truyền `model`.
- Lượt đầu ca C2/C3 dùng `V3_KHOA_KIMI` làm «khoá env» — thước tự dựng trên luật SAI (lớp v3); viết lại theo hình prod
  (`KIMI_API_KEY` + `ANTHROPIC_API_KEY`, không `V3_KHOA_*`).

## 6 · Kiểm (máy dev, 30/09)

- Chạy thật C1–C9 **9/9** (máy chủ vai-b + trang trong vm; `chonModel`/`khoaCuaBot`/`maHoa`/`goiMotLan` thật; pool giả trả lời
  ĐÚNG hai câu SQL của bot — câu lạ ⇒ ném; mạng nhà model giả).
- Đảo-vá **35/35 ĐỎ** trên bản cuối (mỗi đột biến một tiến trình, khôi phục khớp băm) — trong đó 8 đột biến trên đường bot/màn
  mới: mượn khoá máy chủ cho mọi nhà · khoá team không thắng · đường máy chủ khai gửi 0,3 · mất `lyDo` · bot gửi độ ngẫu nhiên
  khác thứ màn hiện · chưa nối mà vẫn thử vai chính · lỗi CSDL đổ cho bot · khoá lọt ra màn.
- Cổng `ve7c.sh` **17/17** (kèm `ve7b.sh` lồng · ca `layModel` trên Postgres). `npm test` **2.420 ca · 2.416 đạt · 0 đỏ · 4 bỏ
  qua** (+9). ĐỦ cổng: **46 xanh / 13 đỏ** = 12 nợ cũ (b-y3 bh1 bh7 g2-a3 l0-m1 l1-m2 l2-m1 l2-m2 l2-m3 l3-m4 va-r1 va-r2) + l1-m1 (N-L1M1-SONG); `l2-m2` (đường chat) đo lại trên `HEAD` ở worktree riêng: danh sách ✘ y hệt ⇒ không do tệp vừa tách.
- Chụp trên Postgres hộp cát, đường THẬT (`db/khoa.js` + `chonModel` trên pool; mạng nhà model giả): team chưa cấu hình ⇒
  «Bot đang gọi kimi-k2.6 — model của MÁY CHỦ (MODEL_CLOSER), khoá chung của máy chủ (KIMI_API_KEY), KHÔNG gửi độ ngẫu nhiên»,
  bảng tin trống; dán khoá + thử ⇒ 3 dòng cấu hình + 1 khoá team + 1 dòng `thu_model`, thẻ đổi «Bot đang gọi kimi-k2.6 · khoá
  riêng của team · độ ngẫu nhiên 0,3» · 390px tràn ngang 0 · lỗi console 0.

## 7 · Không đo · nợ

- **Không đo:** nhà model THẬT trả lời lượt thử thế nào — bấm «Thay khoá và thử một lượt» trên prod sau deploy (mỗi lượt 16
  token ≈ vài đồng).
- **N-KHOA-HAI-TEN** bot đọc `KIMI_API_KEY`/`ANTHROPIC_API_KEY`, lớp v3 (dự phòng khi nối) đọc `V3_KHOA_<NHÀ>` — prod chỉ đặt bộ
  thứ nhất. Nối dự phòng (LL14) phải chọn một bộ (hoặc đặt `V3_KHOA_*`), kẻo dự phòng nối xong vẫn «chưa có khoá».
- **N-DAN-KHOA-DOI-DUONG** dán khoá ở màn ghi đủ ba dòng (`ghiCauHinh`, có sẵn) ⇒ team đang đi model máy chủ CHUYỂN sang cấu
  hình riêng (client v3, gửi 0,3). Màn nói trước ở thẻ Trả lời khách; tách «lưu khoá» khỏi «lưu cấu hình» là CR riêng nếu cần.
- **N-CANHBAO-LOP-MODEL** `canhBaoCauHinh` (lớp v3) còn câu «đang chạy bằng bộ mặc định», «rơi thẳng sang dự phòng», «không
  chọn được model» — màn đã ẩn/thay; câu nguồn nên sửa khi lớp v3 được nối vào đường chat.
- Kết quả lượt thử gần nhất chỉ giữ trong bộ nhớ tiến trình (khởi động lại = «chưa thử», màn nói thẳng); lịch sử ở Nhật ký.

## 8 · Deploy (cho lô sau)

`src/chat/model.js` nạp bởi `aicloser-worker-v3` (handler-v3) và `aicloser-v3` (`dichBanMay`, `operations.js`, màn Model).
`layModel` hành vi y nguyên ⇒ **chỉ restart `aicloser-v3`**; worker giữ bản cũ trong bộ nhớ (cùng hành vi) tới lần restart
sau. 0 migration · 0 biến.
