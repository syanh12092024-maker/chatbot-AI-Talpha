-- ═══════════════════════════════════════════════════════════════════════════
-- 003_tin_cho_xu_ly — HÀNG ĐỢI TIN (phiếu L2-M1 ②.1)
--
-- VÌ SAO CÓ BẢNG NÀY: bản đang chạy xử lý tin NGAY TRONG vòng poll
-- (`src/pancake-poll.js` → `handleIncoming` → gửi), nên «đọc tin» và «trả lời»
-- dính làm một. Hệ quả đo được ở bản cũ: một lượt model chậm giữ luôn slot của
-- vòng poll; một tiến trình chết giữa lượt là tin biến mất không dấu vết; và
-- không có chỗ nào ghi «tin này đã xử chưa» ngoài RAM.
-- 02-KE-HOACH-CODE.md §L2 đòi tách hai việc: POLL chỉ NẠP, WORKER mới xử lý.
-- Bảng này là chỗ nối giữa hai việc đó — và là chỗ DUY NHẤT nhớ được trạng thái
-- của một tin qua restart.
--
-- BA RÀO Ở TẦNG CSDL (không chỉ ở code):
--   · UNIQUE (page_id, conv_id, msg_id) — vòng poll chạy lại 6 giây một lần và
--     Pancake trả lại y nguyên các tin cũ. Không có rào này thì mỗi vòng poll đẻ
--     thêm một bản sao của CÙNG MỘT tin ⇒ khách nhận n câu trả lời. Bộ nạp dùng
--     `ON CONFLICT DO NOTHING` trên đúng bộ ba này.
--   · CHECK trang_thai — năm giá trị, KHÔNG phải bốn:
--       cho        · chờ tới lượt
--       dang_xu    · một worker đang giữ (khoá dòng + khoá hội thoại)
--       xong       · đã trả lời khách
--       loi        · hỏng, còn được thử lại tới trần `so_lan_thu`
--       chan_guard · CỬA GỬI ĐÓNG (V3_PANCAKE_GUI/PANCAKE_READONLY) — ⛔ KHÔNG
--                    retry. Tách khỏi `loi` vì hai thứ này khác nhau về TIỀN:
--                    `loi` là mạng chập chờn, thử lại thì lần sau có thể qua;
--                    cửa đóng là một QUYẾT ĐỊNH của môi trường, thử lại chỉ đốt
--                    thêm một lượt model nữa cho một tin chắc chắn không gửi được.
--   · team_id NOT NULL REFERENCES team(id) — như mọi bảng nghiệp vụ khác.
--
-- ⛔ Bảng này KHÔNG nằm trong `BANG_NGHIEP_VU_CHUAN` của tầng truy vấn L0-M2
--    (src/db/truy-van.js — vẫn 15 tên, phiếu này không đụng thư mục đó). Cố ý:
--    worker phải rút việc bằng `FOR UPDATE SKIP LOCKED` CỘNG
--    `pg_try_advisory_xact_lock(hashtext(conv_id))`, hai thứ mà một hàm
--    `layNhieu` chung không có cách nào diễn đạt. Bộ đọc/ghi riêng nằm ở
--    `src/queue/kho.js` — cùng tiền lệ `ket_noi_pos` (002) và `ghiCauHinhModel`
--    (001), và `kho.js` LUÔN kẹp `team_id` vào mọi câu.
--
-- ⚠️ `page_id` ở bảng này là id Facebook dạng TEXT (khoá tự nhiên), KHÔNG phải
--    `page.id` bigint — đúng khoá mà cửa Messenger v3 nhận vào
--    (`docs/v3/ban-giao/cua-messenger-v1.md` §1) nên worker không phải dịch khoá.
--    Cũng vì vậy KHÔNG có FK tới `page`: tin của một page chưa kịp vào sổ cái vẫn
--    phải nằm được trong hàng đợi để người ta còn nhìn thấy nó (3 page LẠC của
--    §9 sổ điều hành là ca thật).
-- ⚠️ `conv_id` (id hội thoại của Pancake) ≠ `psid` (Page-Scoped ID của khách).
--    Giữ CẢ HAI: `conv_id` để gọi API, `psid` để tra `hoi_thoai` UNIQUE(page,psid).
--    Xem `docs/v3/ban-giao/cua-messenger-v1.md` §2.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE tin_cho_xu_ly (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id     bigint      NOT NULL REFERENCES team(id),
  page_id     text        NOT NULL,
  psid        text        NOT NULL,
  conv_id     text        NOT NULL,
  cust_id     text        NOT NULL DEFAULT '',
  msg_id      text        NOT NULL,
  noi_dung    text        NOT NULL,
  trang_thai  text        NOT NULL DEFAULT 'cho'
              CHECK (trang_thai IN ('cho', 'dang_xu', 'xong', 'loi', 'chan_guard')),
  so_lan_thu  int         NOT NULL DEFAULT 0 CHECK (so_lan_thu >= 0),
  khoa_worker text,
  -- Vì sao tin đứng ở trạng thái hiện tại. Trạng thái nói CÁI GÌ, cột này nói TẠI SAO —
  -- thiếu nó thì một hàng đợi đầy 'loi' không đọc ra được điều gì.
  ly_do       text        NOT NULL DEFAULT '',
  thoi_diem   timestamptz NOT NULL DEFAULT now(),
  sua_luc     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, conv_id, msg_id)
);

-- Câu rút việc của worker quét đúng `trang_thai='cho'` theo thứ tự id. Index bộ phận
-- vì 99% dòng của bảng sẽ ở 'xong' sau vài phút — quét cả bảng để tìm vài dòng 'cho'
-- là cách chắc chắn làm vòng worker chậm dần theo tuổi hệ thống.
CREATE INDEX tin_cho_xu_ly_cho ON tin_cho_xu_ly (id) WHERE trang_thai = 'cho';
CREATE INDEX tin_cho_xu_ly_team ON tin_cho_xu_ly (team_id);
CREATE INDEX tin_cho_xu_ly_conv ON tin_cho_xu_ly (page_id, conv_id);

COMMENT ON TABLE  tin_cho_xu_ly             IS 'Hàng đợi tin Messenger chờ worker xử lý (02 §L2). Poll chỉ NẠP, worker mới xử.';
COMMENT ON COLUMN tin_cho_xu_ly.page_id     IS 'id Facebook dạng text — khoá cửa Messenger v3 nhận, KHÔNG phải page.id bigint.';
COMMENT ON COLUMN tin_cho_xu_ly.conv_id     IS 'id hội thoại của Pancake (≠ psid). Khoá của advisory lock theo hội thoại.';
COMMENT ON COLUMN tin_cho_xu_ly.trang_thai  IS 'cho|dang_xu|xong|loi|chan_guard. chan_guard = cửa gửi ĐÓNG, KHÔNG retry.';
COMMENT ON COLUMN tin_cho_xu_ly.so_lan_thu  IS 'Tăng 1 mỗi lượt worker RÚT được tin. Trần ở src/queue/worker.js.';
