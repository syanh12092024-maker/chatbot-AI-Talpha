-- ═══════════════════════════════════════════════════════════════════════════
-- 001_nen — NỀN DỮ LIỆU v3 · 19 bảng nghiệp vụ, team_id ở mọi bảng trừ 3 bảng dùng chung
-- Phiếu L0-M1 · spec: docs/v3/02-KE-HOACH-CODE.md §"Nền dữ liệu" · 01-QUYET-DINH §1·§8·§9
--
-- LUẬT CỨNG ĐƯỢC THI HÀNH Ở ĐÂY (không chỉ ở code):
--   · team kỹ thuật KHÔNG được nhận thành viên            → trigger tg_chan_tv_team_ky_thuat
--   · nhat_ky / so_ai chỉ INSERT, cấm UPDATE và DELETE     → trigger tg_chi_insert_*
--   · khoá API của cau_hinh_model phải là bản MÃ HOÁ       → CHECK khoa_api_ma LIKE 'v1.%'
--   · don_hang mang cột nguồn + trạng thái hệ TÁCH POS     → CHECK + 2 cột riêng
--   · bo_luat_chung.team_id NULLABLE (NULL = toàn hệ); MỌI bảng nghiệp vụ khác NOT NULL
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── BA BẢNG DÙNG CHUNG — KHÔNG mang team_id (02 §"Nền dữ liệu") ────────────

CREATE TABLE team (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        text        NOT NULL UNIQUE,
  ten         text        NOT NULL,
  -- true = team KỸ THUẬT (chỗ đậu của dữ liệu chưa chốt chủ). Cấm gán người vào,
  -- cấm hiện trên màn chọn team. Xem hợp đồng đọc trong ban-giao/luoc-do-v1.md.
  la_ky_thuat boolean     NOT NULL DEFAULT false,
  tao_luc     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE nguoi_dung (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         text        NOT NULL UNIQUE,
  ten           text        NOT NULL DEFAULT '',
  -- Cách băm do người B chốt ở L0-M3; cột để sẵn, NULL = chưa đặt mật khẩu.
  mat_khau_hash text,
  hoat_dong     boolean     NOT NULL DEFAULT true,
  tao_luc       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vai (
  id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ma  text NOT NULL UNIQUE,
  ten text NOT NULL
);

-- ─── BẢNG NGHIỆP VỤ — team_id NOT NULL (trừ bo_luat_chung) ──────────────────

CREATE TABLE thanh_vien_team (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id       bigint      NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  nguoi_dung_id bigint      NOT NULL REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  vai_id        bigint      NOT NULL REFERENCES vai(id),
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, nguoi_dung_id, vai_id)
);

CREATE TABLE cau_hinh_model (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id       bigint      NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  vai_tro       text        NOT NULL CHECK (vai_tro IN ('chinh', 'du_phong', 'nen')),
  nha_cung_cap  text        NOT NULL,
  ma_model      text        NOT NULL,
  -- ⛔ CẤM ghi khoá nguyên văn. Chỉ nhận bao thư của db/khoa.js (`v1.<iv>.<tag>.<ct>`).
  --    CHECK này là cái RÀO ở tầng DB — code có quên gọi bộ mã hoá thì INSERT vẫn đỏ.
  khoa_api_ma   text        CHECK (khoa_api_ma IS NULL OR khoa_api_ma LIKE 'v1.%'),
  -- 01 §12 «độ ngẫu nhiên chưa đặt» — cột để sẵn, NULL = dùng mặc định nhà cung cấp.
  do_ngau_nhien numeric(3,2) CHECK (do_ngau_nhien IS NULL OR do_ngau_nhien BETWEEN 0 AND 2),
  bat           boolean     NOT NULL DEFAULT true,
  tao_luc       timestamptz NOT NULL DEFAULT now(),
  sua_luc       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, vai_tro)
);

CREATE TABLE page (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id     bigint      NOT NULL REFERENCES team(id),
  page_id     text        NOT NULL UNIQUE,   -- id Facebook, khoá tự nhiên của di trú
  ten         text        NOT NULL DEFAULT '',
  thi_truong  text        NOT NULL DEFAULT '',
  nganh_hang  text        NOT NULL DEFAULT '',
  marketer    text        NOT NULL DEFAULT '',
  -- NGUỒN DUY NHẤT của cờ này là ai-enabled.json (TONG-QUAN §11.1 «công tắc thật»).
  -- Page ngoài danh sách đó = false. Cấm suy ra từ bất kỳ trường nào của pages.json.
  bot_ai_bat  boolean     NOT NULL DEFAULT false,
  botcake_tat boolean     NOT NULL DEFAULT false,
  trong_diem  boolean     NOT NULL DEFAULT false,
  pos_shop_id text,
  pos_via     text,
  token_idx   int,
  the_pancake jsonb       NOT NULL DEFAULT '{}'::jsonb,  -- pages.json .tags {ai,order,handoff}
  mat_dau     boolean     NOT NULL DEFAULT false,        -- pages.json .lost
  kiem_luc    timestamptz,                               -- pages.json .checkedAt
  tao_luc     timestamptz NOT NULL DEFAULT now(),
  sua_luc     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX page_team ON page (team_id);
CREATE INDEX page_bot_ai_bat ON page (bot_ai_bat) WHERE bot_ai_bat;

CREATE TABLE san_pham (
  id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id  bigint      NOT NULL REFERENCES team(id),
  page_id  bigint      REFERENCES page(id) ON DELETE SET NULL,
  ma       text        NOT NULL,
  ten      text        NOT NULL DEFAULT '',
  mo_ta    text        NOT NULL DEFAULT '',
  ton_kho  int,
  het_hang boolean     NOT NULL DEFAULT false,
  nguon    text        NOT NULL DEFAULT 'pos',
  tao_luc  timestamptz NOT NULL DEFAULT now(),
  sua_luc  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, ma)
);

CREATE TABLE goi_gia (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id     bigint       NOT NULL REFERENCES team(id),
  san_pham_id bigint       NOT NULL REFERENCES san_pham(id) ON DELETE CASCADE,
  so_luong    int          NOT NULL CHECK (so_luong > 0),
  gia         numeric(14,2) NOT NULL,
  tien_te     text         NOT NULL,
  UNIQUE (san_pham_id, so_luong)
);

CREATE TABLE khach (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id        bigint      NOT NULL REFERENCES team(id),
  -- Khoá nối ba kênh. NULL ĐƯỢC (N8): khách Messenger giữa chừng chưa đưa số.
  so_dien_thoai  text,
  ten            text        NOT NULL DEFAULT '',
  dia_chi        text        NOT NULL DEFAULT '',
  thanh_pho      text        NOT NULL DEFAULT '',
  ti_le_hoan     numeric(5,2),
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  sua_luc        timestamptz NOT NULL DEFAULT now()
);
-- UNIQUE «trong team, khi CÓ giá trị» — index bộ phận thay vì UNIQUE thường để
-- nhiều dòng NULL cùng tồn tại mà vẫn cấm hai khách cùng số trong một team.
CREATE UNIQUE INDEX khach_sdt_trong_team ON khach (team_id, so_dien_thoai)
  WHERE so_dien_thoai IS NOT NULL;

CREATE TABLE hoi_thoai (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id        bigint      NOT NULL REFERENCES team(id),
  page_id        bigint      NOT NULL REFERENCES page(id) ON DELETE CASCADE,
  psid           text        NOT NULL,
  khach_id       bigint      REFERENCES khach(id) ON DELETE SET NULL,  -- nullable (N8)
  -- Sáu trạng thái đo từ conv-state.json ngày 22/08/2026 (18.790 hội thoại).
  trang_thai     text        NOT NULL
                 CHECK (trang_thai IN ('GREET','QUALIFY','SELLING','CLOSING','HANDOFF','POST_SALE')),
  chu_so_huu     text        NOT NULL CHECK (chu_so_huu IN ('AI','SALE','BOTCAKE')),
  trang_thai_truoc text,
  ly_do_cuoi     text        NOT NULL DEFAULT '',
  bat_dau_luc    timestamptz,
  cham_luc       timestamptz,
  nguoi_that_luc timestamptz,
  chot_don_luc   timestamptz,
  ai_noi_luc     timestamptz,
  ai_noi_gi      text        NOT NULL DEFAULT '',
  -- SỐ lượt gọi model, và MỐC từng lượt. Cả hai đều cần: số để đọc nhanh, mốc để
  -- ngân sách lượt/24h (M11) sống sót qua cutover — bỏ mốc thì mọi khách được cấp
  -- lại ngân sách đầy ngay ngày chuyển nền.
  luot_llm       int         NOT NULL DEFAULT 0,
  moc_luot_llm   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  luot_ai        int         NOT NULL DEFAULT 0,
  luot_doi_thu   int         NOT NULL DEFAULT 0,   -- conv-state.oppTurns (bot khác nói)
  nhac_da_gui    int         NOT NULL DEFAULT 0,   -- conv-state.followupSent
  diem_nong      int         NOT NULL DEFAULT 0,   -- = diem_lead->>'score', tách ra để lọc
  diem_lead      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  ho_so          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  sua_luc        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, psid)
);
CREATE INDEX hoi_thoai_team ON hoi_thoai (team_id);

-- Sổ AI — CHỈ THÊM. page_id để dạng TEXT KHÔNG khoá ngoại: sổ là sử liệu, nó ghi cả
-- page đã rơi khỏi sổ cái (đo 22/08: 3 page có dữ liệu mà không có trong pages.json).
-- Khoá ngoại ở đây sẽ làm cutover mất dòng thật.
CREATE TABLE so_ai (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id       bigint      NOT NULL REFERENCES team(id),
  xay_ra_luc    timestamptz NOT NULL,
  page_id       text        NOT NULL DEFAULT '',
  psid          text        NOT NULL DEFAULT '',
  loai          text        NOT NULL
                CHECK (loai IN ('reply','order','handoff','image','other_bot','yielded','spent_no_send')),
  -- 02 §"Nền dữ liệu": ghi MÃ MODEL ngay từ đầu, «nếu không sau này không so được
  -- model nào rẻ hơn thật». NOT NULL — bộ nạp phải khai, cấm đoán im lặng.
  ma_model      text        NOT NULL,
  lane          text,
  trang_thai    text,
  ban_kich_ban  text,
  ly_do         text,
  token_vao     int,
  token_ra      int,
  cache_doc     int,
  cache_ghi     int,
  so_lan_goi    int,
  du_lieu       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Neo idempotent của bộ nạp: TỆ NGUỒN + SỐ DÒNG. Không băm nội dung và không
  -- dùng (giờ,page,psid,loại) làm vân tay — hai dòng thật giống hệt nhau trong một
  -- sổ append-only là chuyện bình thường, băm sẽ NUỐT dòng thật và làm phép
  -- «đối chiếu số dòng» của 02 §L0 sai theo chiều khó thấy nhất.
  nguon_tep     text        NOT NULL,
  nguon_dong    int         NOT NULL CHECK (nguon_dong > 0),
  ghi_luc       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nguon_tep, nguon_dong)
);
CREATE INDEX so_ai_team_luc ON so_ai (team_id, xay_ra_luc);

CREATE TABLE don_hang (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id        bigint      NOT NULL REFERENCES team(id),
  ma_pos         text,
  -- 01 §1 «quyết định quan trọng nhất về nghiệp vụ» — máy trạng thái L3 rẽ nhánh theo cột này.
  nguon          text        NOT NULL CHECK (nguon IN ('trang_ban_hang','messenger')),
  -- HAI cột trạng thái TÁCH HẲN nhau (02 §"Hai quyết định đáng nói"): đơn có thể
  -- «chờ khách trả lời» trong hệ mà trên POS vẫn «chờ xác nhận».
  trang_thai_he  text        NOT NULL,
  trang_thai_pos text,
  khach_id       bigint      REFERENCES khach(id) ON DELETE SET NULL,
  hoi_thoai_id   bigint      REFERENCES hoi_thoai(id) ON DELETE SET NULL,
  page_id        bigint      REFERENCES page(id) ON DELETE SET NULL,
  tong_tien      numeric(14,2),
  tien_te        text,
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  sua_luc        timestamptz NOT NULL DEFAULT now(),
  dong_luc       timestamptz,
  UNIQUE (team_id, ma_pos)
);
CREATE INDEX don_hang_nguon ON don_hang (team_id, nguon, trang_thai_he);

CREATE TABLE viec_can_xu_ly (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id       bigint      NOT NULL REFERENCES team(id),
  loai          text        NOT NULL CHECK (loai IN ('hoi_thoai','don_hang')),
  hoi_thoai_id  bigint      REFERENCES hoi_thoai(id) ON DELETE CASCADE,
  don_hang_id   bigint      REFERENCES don_hang(id) ON DELETE CASCADE,
  ly_do_day     text        NOT NULL,                  -- lý do BOT đẩy sang, hiện trên mỗi dòng
  day_luc       timestamptz NOT NULL DEFAULT now(),
  han_luc       timestamptz NOT NULL,                  -- mốc 10 phút, quá là báo động
  nguoi_nhan_id bigint      REFERENCES nguoi_dung(id) ON DELETE SET NULL,
  nhan_luc      timestamptz,
  ket_qua       text,
  ly_do_dong    text,
  chi_phi       numeric(14,2),
  dong_luc      timestamptz,
  CHECK (loai <> 'hoi_thoai' OR hoi_thoai_id IS NOT NULL),
  CHECK (loai <> 'don_hang'  OR don_hang_id  IS NOT NULL)
);
CREATE INDEX viec_can_xu_ly_mo ON viec_can_xu_ly (team_id, han_luc) WHERE dong_luc IS NULL;

CREATE TABLE hang_cho_tao_don (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id       bigint      NOT NULL REFERENCES team(id),
  hoi_thoai_id  bigint      NOT NULL REFERENCES hoi_thoai(id) ON DELETE CASCADE,
  du_lieu_don   jsonb       NOT NULL,
  cua_kiem      jsonb       NOT NULL DEFAULT '{}'::jsonb,  -- kết quả BỐN cửa kiểm chống trùng
  trang_thai    text        NOT NULL DEFAULT 'cho_duyet'
                CHECK (trang_thai IN ('cho_duyet','da_duyet','tu_choi')),
  nguoi_duyet_id bigint     REFERENCES nguoi_dung(id) ON DELETE SET NULL,
  duyet_luc     timestamptz,
  don_hang_id   bigint      REFERENCES don_hang(id) ON DELETE SET NULL,
  tao_luc       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE kich_ban (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id        bigint      NOT NULL REFERENCES team(id),
  page_id        bigint      NOT NULL REFERENCES page(id) ON DELETE CASCADE,
  phien_ban      int         NOT NULL,
  trang_thai     text        NOT NULL CHECK (trang_thai IN ('DRAFT','REVIEW','LIVE','ARCHIVED')),
  -- BẢN CHO NGƯỜI: đúng 6 trường marketer viết và sửa (kb.js SCRIPT_FIELDS).
  noi_dung_nguoi jsonb       NOT NULL,
  -- BẢN CHO MÁY: khối chữ nạp vào prompt, dựng từ tone/greeting/salesPrompt theo
  -- prompts.js:99-101. Giữ riêng để đo token và A/B mà không phải dựng lại mỗi lượt.
  noi_dung_may   text        NOT NULL,
  nguoi_sua      text        NOT NULL DEFAULT '',
  ghi_chu        text        NOT NULL DEFAULT '',
  sua_luc        timestamptz,
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_id, phien_ban)
);
-- Mỗi page nhiều nhất MỘT bản LIVE — bất biến của kho phiên bản (kb.js recordVersion).
CREATE UNIQUE INDEX kich_ban_live_moi_page ON kich_ban (page_id) WHERE trang_thai = 'LIVE';

-- team_id NULLABLE ở ĐÚNG bảng này: NULL = bộ luật của TOÀN HỆ (01 §6, dùng chung mọi page).
-- HỢP ĐỒNG ĐỌC: mọi truy vấn bảng này dùng (team_id = $ctx OR team_id IS NULL).
-- Mọi bảng khác dùng luật đồng nhất team_id = $ctx.
CREATE TABLE bo_luat_chung (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id   bigint      REFERENCES team(id) ON DELETE CASCADE,
  phien_ban int         NOT NULL DEFAULT 1,
  noi_dung  text        NOT NULL,
  dang_dung boolean     NOT NULL DEFAULT false,
  nguoi_sua text        NOT NULL DEFAULT '',
  sua_luc   timestamptz,
  tao_luc   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ky_nang (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id        bigint      NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  ma             text        NOT NULL,
  ten            text        NOT NULL,
  noi_dung       text        NOT NULL,
  bat_cho_nhom_sp text[]     NOT NULL DEFAULT '{}',   -- «bật cho nhóm sản phẩm nào»
  bat            boolean     NOT NULL DEFAULT false,
  phien_ban      int         NOT NULL DEFAULT 1,
  tao_luc        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, ma)
);

CREATE TABLE lich_nhac (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id      bigint      NOT NULL REFERENCES team(id),
  don_hang_id  bigint      REFERENCES don_hang(id) ON DELETE CASCADE,
  hoi_thoai_id bigint      REFERENCES hoi_thoai(id) ON DELETE CASCADE,
  loai         text        NOT NULL,
  hen_luc      timestamptz NOT NULL,
  lan_thu      int         NOT NULL DEFAULT 1 CHECK (lan_thu BETWEEN 1 AND 5),  -- tối đa 5 lần
  trang_thai   text        NOT NULL DEFAULT 'cho'
               CHECK (trang_thai IN ('cho','da_gui','da_huy')),
  huy_ly_do    text,
  tao_luc      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lich_nhac_cho ON lich_nhac (hen_luc) WHERE trang_thai = 'cho';

-- Nhật ký thao tác — CHỈ THÊM, ghi cả việc MÁY làm (01 §9).
CREATE TABLE nhat_ky (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id       bigint      NOT NULL REFERENCES team(id),
  xay_ra_luc    timestamptz NOT NULL DEFAULT now(),
  tac_nhan      text        NOT NULL,   -- 'nguoi:<email>' | 'may:<ten-job>'
  nguoi_dung_id bigint      REFERENCES nguoi_dung(id) ON DELETE SET NULL,
  hanh_dong     text        NOT NULL,
  doi_tuong     text        NOT NULL DEFAULT '',
  doi_tuong_id  text        NOT NULL DEFAULT '',
  truoc         jsonb,
  sau           jsonb,
  ghi_chu       text        NOT NULL DEFAULT ''
);
CREATE INDEX nhat_ky_team_luc ON nhat_ky (team_id, xay_ra_luc);

-- ─── RÀO Ở TẦNG DB ─────────────────────────────────────────────────────────

-- (1) Cấm gán thành viên vào team KỸ THUẬT. Chặn ở CẢ HAI cửa: thêm thành viên,
--     và lật cờ một team đang có người thành team kỹ thuật.
CREATE FUNCTION chan_tv_team_ky_thuat() RETURNS trigger AS $$
BEGIN
  IF (SELECT la_ky_thuat FROM team WHERE id = NEW.team_id) THEN
    RAISE EXCEPTION 'cam gan thanh vien vao team ky thuat (team_id=%)', NEW.team_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER tg_chan_tv_team_ky_thuat
  BEFORE INSERT OR UPDATE ON thanh_vien_team
  FOR EACH ROW EXECUTE FUNCTION chan_tv_team_ky_thuat();

CREATE FUNCTION chan_lat_co_ky_thuat() RETURNS trigger AS $$
BEGIN
  IF NEW.la_ky_thuat AND NOT OLD.la_ky_thuat
     AND EXISTS (SELECT 1 FROM thanh_vien_team WHERE team_id = NEW.id) THEN
    RAISE EXCEPTION 'team % dang co thanh vien, khong the doi thanh team ky thuat', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER tg_chan_lat_co_ky_thuat
  BEFORE UPDATE ON team
  FOR EACH ROW EXECUTE FUNCTION chan_lat_co_ky_thuat();

-- (2) CHỈ INSERT: nhat_ky và so_ai. Cấm UPDATE, cấm DELETE — kể cả của chủ CSDL.
CREATE FUNCTION chan_sua_xoa() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'bang % chi INSERT — cam % ', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'check_violation';
END $$ LANGUAGE plpgsql;

CREATE TRIGGER tg_chi_insert_nhat_ky
  BEFORE UPDATE OR DELETE ON nhat_ky
  FOR EACH ROW EXECUTE FUNCTION chan_sua_xoa();

CREATE TRIGGER tg_chi_insert_so_ai
  BEFORE UPDATE OR DELETE ON so_ai
  FOR EACH ROW EXECUTE FUNCTION chan_sua_xoa();

-- ─── SEED — 4 team + 5 vai (idempotent) ────────────────────────────────────
-- Ba team NGHIỆP VỤ (01 §8) + MỘT team KỸ THUẬT làm chỗ đậu cho dữ liệu di trú
-- chưa chốt chủ (chờ H7 §8 sổ điều hành). KHÔNG đoán team theo thị trường.
INSERT INTO team (slug, ten, la_ky_thuat) VALUES
  ('tieu-alpha', 'Tiểu Alpha', false),
  ('auus',       'Auus',       false),
  ('pialpha-eu', 'Pialpha EU', false),
  ('chua-phan',  'Chưa phân team (kỹ thuật)', true)
ON CONFLICT (slug) DO NOTHING;

-- Năm vai của 01 §9.
INSERT INTO vai (ma, ten) VALUES
  ('quan-tri',       'Quản trị'),
  ('marketer',       'Marketer'),
  ('sale',           'Sale'),
  ('quan-ly',        'Quản lý'),
  ('duyet-kich-ban', 'Người duyệt kịch bản')
ON CONFLICT (ma) DO NOTHING;
