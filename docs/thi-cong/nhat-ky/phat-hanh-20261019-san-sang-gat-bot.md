# MỞ VAN — Sẵn sàng «gạt bot» cho pilot (mã + cấu hình + van gửi mở khi 0 page bật) · 19/10/2026

> Người quyết 15/10: «làm giúp tôi đi — miễn chưa gửi thật cho khách; cấu hình đầy đủ toàn bộ sẵn sàng, chỉ việc gạt bot là dùng được luôn».
> Điểm dừng: mọi thứ sẵn sàng, **0/582 page bật**. Thao tác chạm khách DUY NHẤT còn lại = quản trị gạt bot một page ở màn Page & Bot.

## 1 · Mở cái gì

Mã GL8 · GL9 · GL10 · BH9 (`fcb0c19 → HEAD vao-ui-v3-17-09`) + migration 035 · cờ cấu hình đọc (`V3_RAP_PROMPT_BAT=1` · `PK_TAG_HANDOFF=AI CHAT` ·
`V3_NAP_THE_CHAN=Đã gửi,AI CHAT` · `V3_AI_SALE_TEP_GAN` · `V3_AI_SALE_LOG`) · dữ liệu (khối chung team 1 theo chốt 15/10 · kịch bản LIVE 275/276) ·
van gửi (`V3_PANCAKE_GUI=1` + bỏ `PANCAKE_READONLY` ở unit) — vẫn 0 page.

## 2 · Bậc phơi

② prod, khách chưa thấy gì. Chứng minh van mở + 0 page ⇒ không đường gửi: agent soát 15/10 (`chay-worker.js:128-135,171` danh sách page = `bot_ai_bat`;
câu rút việc `ANY('{}')` = 0 dòng; màn không có route gửi; webhook 404; POS/WA đóng). Bậc ③ (1 page, người canh) = người quyết gạt.

## 3 · Cửa vào (máy dev, 19/10)

| # | Phép | Số |
|---|---|---|
| ① | cây | sạch (sau commit nhật ký này) |
| ② | so remote | `origin/vao-ui-v3-17-09` = `fcb0c19`, đi trước 0 · mình đi trước 51 (sau viết lại lịch sử bỏ tên khách — `sao-luu-truoc-viet-lai-20261019`) |
| ③ | bộ ca | `npm test` 2 lượt tuần tự 3048/0 (22 bỏ qua trên nhánh thử) · sau viết lại 3048 · 3044 đạt · 0 đỏ · 4 bỏ qua |
| ④ | cổng | gl8 32/0 · gl9 30/0 · gl10 93/0 · bh9 112/0 · rp1 73/0 · rp2 59/0 (các cổng cũ khác: đo đủ 92 cổng ở `fcb0c19` 08/10; chỉ 4 phiếu này đổi mã) |
| ⑤ | biến đã khai | `V3_AI_SALE_TEP_GAN` · `V3_AI_SALE_LOG` có dòng trong `bien-moi-truong-v3.md` (GL10); các cờ khác có sẵn |
| ⑥ | dev không bắn | `.env:48` `PANCAKE_READONLY=1` |
| ⑦ | prod trước | điền ở §7 «trước» |
| — | đo model | Kimi thật, van đóng, giả lập page 275 (109 lượt): bịa đơn 5→0 · bán lại 8→0 · tự hứa 1→0 · tên sai 5→0 · chảy máu ⇒ khuyên khám · sai giá 0 · +5,3% chi phí |

## 4 · Ngưỡng + mốc quan sát (viết trước)

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| +1′ / +5′ mỗi bước | còn sống, không vòng restart | `systemctl is-active` + đếm `Started` + `/dang-nhap` 200 | chết 1 lần = lùi bước đó |
| +5′ mỗi bước | lỗi mới | `journalctl -u aicloser-v3 -u aicloser-worker-v3 --since` · `grep -iE "error\|throw\|ECONN"` (trừ dòng đã biết) | lỗi mới lặp = lùi |
| sau bước van | KHÔNG gửi gì | `SELECT count(*) FROM lan_gui` = 0 · page bật 0/582 · khoá `_v3` trong `page_gan_them.json` = không có | `lan_gui` > 0 ⇒ ĐÓNG VAN NGAY |
| sau bước van | worker nạp đúng | log worker hết «nạp: ĐÓNG», «0 page được phép» | — |

## 5 · Đường lùi (viết trước)

- Van: `rm /etc/systemd/system/{aicloser-v3,aicloser-worker-v3}.service.d/zz-pilot-van-gui.conf && systemctl daemon-reload && systemctl restart aicloser-v3 aicloser-worker-v3` (< 1′).
- Cờ `.env`: xoá các dòng thêm (bản sao `/var/backups/aicloser/.env.bak-20261019-*`) + restart cả hai.
- Dữ liệu: khối chung — lưu lại bản cũ (bản 1 `may:nap-khoi-chung`, băm `2f511fd8…`, nội dung giữ ở nhật ký); kịch bản — đưa bản LIVE cũ lên lại (lịch sử bản giữ).
- Mã: `git checkout -f -B vao-ui-v3-17-09 fcb0c19` + restart cả hai — GIỮ lược đồ 035 (cột mới trên `page` + CHECK nới; mã cũ không đọc cột đó).
- Sau gạt bot (ngoài lượt này): gạt TẮT ⇒ v3 thôi, xoá khoá `_v3` ⇒ ai_sale trả lời lại (≤ 10′).

## 6 · Lệnh sẽ gõ (người quyết đã gật 15/10 «làm giúp tôi — cấu hình đầy đủ»)

1. push `fcb0c19..HEAD` (quét khoá/PII đoạn đẩy trước) · prod `git fetch && git checkout -f -B vao-ui-v3-17-09 origin/vao-ui-v3-17-09` · `node --env-file=.env db/migrate.js` (035) · restart cả hai · đo.
2. sao lưu `.env` · thêm 5 dòng cờ (không chú thích đuôi) · restart cả hai · đo.
3. dữ liệu khối chung + kịch bản (qua hàm lưu của màn, nhật ký `tong:19-10`) · đo bot đọc đúng (ráp prompt page 275 chỉ đọc).
4. drop-in van gửi cho CẢ HAI unit · `daemon-reload` · restart cả hai · đo «không gửi gì».
5. kiểm sẵn sàng: `pageStatus` 4 page pilot (chỉ đọc) — 275/276/340 hết điều kiện chặn; 335 `noData` (Fitgum hết hàng POS).

## 7 · Số đo tại từng mốc (prod, giờ CEST)

(điền khi chạy)

## 8 · Kết

(điền khi xong)

## 9 · Nợ phát sinh

(điền khi xong)

## 10 · Ai gật, lúc mấy giờ

Người quyết 15/10 (chat): «Bạn làm giúp tôi đi. Miễn chưa gửi thật cho khách là được. cấu hình đầy đủ toàn bộ sẵn sàng, chỉ việc gạt bot là có thể sử dụng được luôn ấy»; 19/10 «tiếp».
