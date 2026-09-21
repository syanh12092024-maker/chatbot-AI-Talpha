-- ═══════════════════════════════════════════════════════════════════════════
-- 023_nap_bo_qua — TIN BỊ LỌC PHẢI ĐỂ LẠI DẤU VẾT
--
-- ─── VÌ SAO ───────────────────────────────────────────────────────────────────────────
-- Bộ nạp có NĂM cửa lọc. Một vòng thật trên page 1220547807799752 (21/09):
--
--     nạp: 0 mới · 1 page · lọc: 11 thẻ-chặn · 46 page-nói-cuối
--
-- 57/57 hội thoại bị loại, 0 tin vào hàng đợi. Con số đó CHỈ có trong stdout của worker.
-- Bảng `tin_cho_xu_ly` chỉ chứa tin ĐÃ LỌT — tin bị lọc không để lại một dòng nào.
--
-- Hệ quả: một cửa bắt oan (thẻ "Đã gửi" gắn nhầm, `last_sent_by` sai, mốc kẹt) thì khách
-- im lặng không được trả lời, và KHÔNG MÀN NÀO nói cho ai biết. Muốn kiểm phải SSH đọc
-- log — tức là không ai kiểm. Đó đúng là họ lỗi im lặng mà sổ điều hành gọi tên nhiều lần.
--
-- ─── VÌ SAO MỘT DÒNG MỖI HỘI THOẠI, KHÔNG PHẢI MỖI VÒNG ───────────────────────────────
-- Ghi mỗi vòng một dòng thì 57 hội thoại × 10 vòng/phút = 34.000 dòng/giờ cho MỘT page,
-- và 99,9% trong đó lặp lại y nguyên. Bảng này là ẢNH CHỤP HIỆN TẠI: mỗi hội thoại đúng
-- một dòng, `so_lan` cộng dồn, `lan_dau`/`lan_cuoi` cho biết nó bị bỏ từ bao giờ tới bao
-- giờ. Số dòng vì thế bị chặn bởi SỐ HỘI THOẠI, không phải số vòng quay.
--
-- ─── DÒNG BỊ XOÁ KHI NÀO ──────────────────────────────────────────────────────────────
-- Khi chính hội thoại đó được nạp vào hàng đợi. Còn dòng ở đây = "đang bị bỏ qua", hết
-- dòng = "đã được xử lý". Bảng luôn trả lời đúng một câu hỏi: **ngay bây giờ, những
-- hội thoại nào đang không được trả lời, và vì sao.**
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE nap_bo_qua (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id   bigint      NOT NULL REFERENCES team(id),
  page_id   text        NOT NULL,
  conv_id   text        NOT NULL,
  psid      text        NOT NULL DEFAULT '',
  -- MÃ cửa đã chặn. Mã chứ không phải câu chữ: màn dịch sang tiếng người, và đổi câu chữ
  -- không được làm hỏng phép đếm theo nhóm.
  ly_do     text        NOT NULL
            CHECK (ly_do IN ('the_chan','page_noi_cuoi','da_doc','moc_cu','cho_go_xong','khong_co_psid')),
  chu_thich text        NOT NULL DEFAULT '',
  so_lan    int         NOT NULL DEFAULT 1 CHECK (so_lan > 0),
  lan_dau   timestamptz NOT NULL DEFAULT now(),
  lan_cuoi  timestamptz NOT NULL DEFAULT now(),
  -- Một hội thoại một dòng — đó là điều làm bảng này không phình theo vòng quay.
  UNIQUE (team_id, page_id, conv_id)
);

-- Màn hỏi "page này đang bỏ qua những gì", sắp theo lần bỏ gần nhất.
CREATE INDEX nap_bo_qua_page_luc ON nap_bo_qua (team_id, page_id, lan_cuoi DESC);
