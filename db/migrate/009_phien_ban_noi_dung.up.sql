-- 009 · PHIÊN BẢN + DUYỆT cho bộ luật chung và kỹ năng (G2-A4).
--
-- ═══ VÌ SAO ═══════════════════════════════════════════════════════════════════
-- Bộ luật chung là 2.256 token DÙNG CHUNG cho mọi page đang bật bot. Sửa sai một dòng là
-- 51 page đổi cách nói với khách trong MỘT lượt. Sổ giao việc ghi thẳng: không có phiên
-- bản và không lùi được thì đừng cho sửa.
--
-- ═══ RÀNG BUỘC THIẾT KẾ: KHÔNG ĐƯỢC ĐẬP MÀN NGƯỜI B VỪA DỰNG ══════════════════
-- `v3/src/ui/bo-luat/` và `v3/src/ui/ky-nang/` đã chạy trên lược đồ hiện tại. Nên bản này
-- CỘNG THÊM, không đổi hình cái đang có:
--
--   · `bo_luat_chung` VỐN ĐÃ nhiều dòng một team (đó là cách B làm phiên bản) ⇒ chỉ thêm
--     cột duyệt + chỉ mục. `dang_dung` GIỮ NGUYÊN là cờ LIVE duy nhất — thêm một cột
--     `trang_thai` song song là đẻ bản khai thứ hai cho cùng một sự thật (án lệ đã có).
--   · `ky_nang` thì KHÔNG: màn của B đọc `db.chon('ky_nang', {})` và hiện mỗi dòng là một
--     kỹ năng. Nhét phiên bản vào chính bảng đó là màn của họ hiện một kỹ năng thành N
--     dòng. Nên lịch sử đi ra bảng RIÊNG `ky_nang_lich_su`, và `UNIQUE (team_id, ma)`
--     của bảng gốc GIỮ NGUYÊN.
--
-- ═══ RF-17 ĐÓNG Ở ĐÂY ═════════════════════════════════════════════════════════
-- §9 sổ điều hành, 23/08: «`bo_luat_chung` thiếu UNIQUE + `seedBoLuatChung` SELECT-rồi-
-- INSERT không atomic ⇒ dup luật toàn hệ khi chạy song song». Và `apPhienBan()` của B hạ
-- bản cũ rồi dựng bản mới bằng HAI lời gọi rời — hai lượt áp đồng thời có thể để lại hai
-- bản `dang_dung=true`, mà `docBoLuatChung` thì che đi bằng cách lấy `phien_ban` cao nhất.
-- Chỉ mục dưới đây làm trạng thái đó KHÔNG TỒN TẠI ĐƯỢC nữa.

-- ── bộ luật chung ────────────────────────────────────────────────────────────
ALTER TABLE bo_luat_chung
  -- 01-QUYET-DINH §9: «Kịch bản do NGƯỜI viết thì áp thẳng. Đề xuất của AI thì PHẢI có
  -- người duyệt mới áp.» Hai đường khác nhau ⇒ phải phân biệt được nguồn.
  ADD COLUMN nguon     text NOT NULL DEFAULT 'nguoi' CHECK (nguon IN ('nguoi', 'ai')),
  ADD COLUMN duyet_boi text,
  ADD COLUMN duyet_luc timestamptz,
  ADD COLUMN ghi_chu   text NOT NULL DEFAULT '';

COMMENT ON COLUMN bo_luat_chung.duyet_luc IS
  'NULL = chưa duyệt. Cửa `apBoLuat()` từ chối áp bản chưa duyệt khi nguon=ai. Chưa đặt '
  'CHECK ở tầng CSDL vì màn của người B còn ghi thẳng qua db.sua() — siết sau khi B đổi '
  'sang gọi apBoLuat() (cutover hai bước, ghi §9).';

-- ⚠️ `team_id` NULLABLE (NULL = luật toàn hệ) và trong Postgres hai NULL là KHÁC nhau, nên
--    `UNIQUE (team_id) WHERE dang_dung` KHÔNG ràng được dòng toàn hệ. Phải COALESCE.
CREATE UNIQUE INDEX bo_luat_chung_mot_ban_dang_ap
  ON bo_luat_chung (COALESCE(team_id, 0)) WHERE dang_dung;

CREATE UNIQUE INDEX bo_luat_chung_phien_ban_duy_nhat
  ON bo_luat_chung (COALESCE(team_id, 0), phien_ban);

-- ── kỹ năng: lịch sử ra bảng RIÊNG ───────────────────────────────────────────
-- Bảng gốc `ky_nang` giữ đúng MỘT dòng mỗi (team, ma) = bản ĐANG DÙNG. Mỗi lượt sửa đẩy
-- ảnh của bản cũ vào đây trước khi ghi đè, nên lùi được mà màn hình của B không đổi hình.
CREATE TABLE ky_nang_lich_su (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id         bigint      NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  ma              text        NOT NULL,
  phien_ban       int         NOT NULL,
  ten             text        NOT NULL,
  noi_dung        text        NOT NULL,
  bat_cho_nhom_sp text[]      NOT NULL DEFAULT '{}',
  bat             boolean     NOT NULL,
  nguon           text        NOT NULL DEFAULT 'nguoi' CHECK (nguon IN ('nguoi', 'ai')),
  nguoi_sua       text        NOT NULL DEFAULT '',
  ghi_chu         text        NOT NULL DEFAULT '',
  duyet_boi       text,
  duyet_luc       timestamptz,
  tao_luc         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, ma, phien_ban)
);

CREATE INDEX ky_nang_lich_su_tra ON ky_nang_lich_su (team_id, ma, phien_ban DESC);

COMMENT ON TABLE ky_nang_lich_su IS
  'Ảnh các bản CŨ của ky_nang. Bản ĐANG DÙNG nằm ở chính bảng ky_nang (một dòng mỗi '
  'team×ma) — cố ý, để màn «Thư viện kỹ năng» của người B không phải đổi hình.';

ALTER TABLE ky_nang
  ADD COLUMN nguon     text NOT NULL DEFAULT 'nguoi' CHECK (nguon IN ('nguoi', 'ai')),
  ADD COLUMN nguoi_sua text NOT NULL DEFAULT '',
  ADD COLUMN sua_luc   timestamptz,
  ADD COLUMN ghi_chu   text NOT NULL DEFAULT '',
  ADD COLUMN duyet_boi text,
  ADD COLUMN duyet_luc timestamptz;
