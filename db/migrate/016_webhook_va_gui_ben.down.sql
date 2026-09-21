-- Export lan_gui để đối chiếu trước khi rollback migration đang có dữ liệu.
DROP TABLE lan_gui;
DROP INDEX tin_cho_hoi_thoai;
DROP INDEX tin_webhook_mid;
ALTER TABLE tin_cho_xu_ly DROP COLUMN thu_lai_luc;
ALTER TABLE tin_cho_xu_ly DROP COLUMN nguon;
ALTER TABLE page DROP COLUMN nguon_tin;
