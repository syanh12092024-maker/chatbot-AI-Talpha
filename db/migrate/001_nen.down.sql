-- Gỡ 001_nen. Thứ tự ngược chiều phụ thuộc. DROP TABLE gỡ luôn trigger của bảng đó,
-- nên không có dòng DROP TRIGGER riêng (nó sẽ chết nếu bảng chưa tồn tại).
-- Diễn tập `down` phải chạy trên DB ĐÃ SEED + ĐÃ DI TRÚ (luật kỹ thuật của dây chuyền).

DROP TABLE IF EXISTS nhat_ky;
DROP TABLE IF EXISTS lich_nhac;
DROP TABLE IF EXISTS ky_nang;
DROP TABLE IF EXISTS bo_luat_chung;
DROP TABLE IF EXISTS kich_ban;
DROP TABLE IF EXISTS hang_cho_tao_don;
DROP TABLE IF EXISTS viec_can_xu_ly;
DROP TABLE IF EXISTS don_hang;
DROP TABLE IF EXISTS so_ai;
DROP TABLE IF EXISTS hoi_thoai;
DROP TABLE IF EXISTS khach;
DROP TABLE IF EXISTS goi_gia;
DROP TABLE IF EXISTS san_pham;
DROP TABLE IF EXISTS page;
DROP TABLE IF EXISTS cau_hinh_model;
DROP TABLE IF EXISTS thanh_vien_team;
DROP TABLE IF EXISTS vai;
DROP TABLE IF EXISTS nguoi_dung;
DROP TABLE IF EXISTS team;

DROP FUNCTION IF EXISTS chan_sua_xoa();
DROP FUNCTION IF EXISTS chan_lat_co_ky_thuat();
DROP FUNCTION IF EXISTS chan_tv_team_ky_thuat();
