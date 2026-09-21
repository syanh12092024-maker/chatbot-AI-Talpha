-- Một nguồn nhận tin cho mỗi Page. Gửi vẫn đi qua Pancake hiện có.
ALTER TABLE page ADD COLUMN nguon_tin text NOT NULL DEFAULT 'poll'
  CHECK (nguon_tin IN ('poll', 'webhook'));
ALTER TABLE tin_cho_xu_ly ADD COLUMN nguon text NOT NULL DEFAULT 'poll'
  CHECK (nguon IN ('poll', 'webhook'));
ALTER TABLE tin_cho_xu_ly ADD COLUMN thu_lai_luc timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX tin_webhook_mid ON tin_cho_xu_ly(page_id,msg_id) WHERE nguon='webhook';
CREATE INDEX tin_cho_hoi_thoai ON tin_cho_xu_ly(team_id,page_id,psid,id)
  WHERE trang_thai IN ('cho','dang_xu');

-- Ghi trên kết nối độc lập TRƯỚC HTTP, sống qua rollback của lượt xử lý.
-- Không hứa exactly-once khi provider không có idempotency key: dang_gui/khong_ro
-- cần đối chiếu thủ công, không tự phát lại.
CREATE TABLE lan_gui (
  id bigserial PRIMARY KEY,
  team_id bigint NOT NULL REFERENCES team(id),
  -- Không FK tới queue: worker đang FOR UPDATE dòng tin; FK trên kết nối sổ gửi
  -- độc lập sẽ chờ chính worker đó. Caller truyền id tin đã lưu bền.
  tin_id bigint NOT NULL,
  buoc integer NOT NULL CHECK (buoc > 0),
  loai text NOT NULL CHECK (loai IN ('guiTin','guiAnh','ghiNote','gatThe')),
  noi_dung jsonb NOT NULL,
  trang_thai text NOT NULL CHECK (trang_thai IN ('dang_gui','da_gui','khong_ro')),
  provider_id text,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  sua_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id,tin_id,buoc)
);
CREATE INDEX lan_gui_can_doi_chieu ON lan_gui(team_id,tao_luc)
  WHERE trang_thai <> 'da_gui';
