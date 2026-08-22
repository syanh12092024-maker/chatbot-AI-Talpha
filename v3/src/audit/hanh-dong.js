// DANH MỤC MÃ HÀNH ĐỘNG của nhật ký thao tác.
//
// Vì sao có file này thay vì viết chuỗi trần ở chỗ gọi: cột `hanh_dong` là thứ người ta
// lọc trên màn "Nhật ký thao tác" và là thứ dùng để đếm sự cố an ninh. Một chỗ gõ
// 'dang_nhap_that_bai' còn chỗ kia gõ 'dangNhapThatBai' thì bộ lọc trống mà không ai biết
// vì sao — nhật ký vẫn có dòng, chỉ là không tìm ra.
//
// Thêm mã mới: thêm vào HANH_DONG **và** MO_TA. Thiếu mô tả thì `moTa()` kêu lên ở
// console chứ không trả về chuỗi rỗng — màn hình hiện mã trần còn hơn hiện ô trống.

/** Mười bốn mã của giai đoạn 1, nhóm theo việc. Giá trị = đúng chuỗi lưu xuống cột `hanh_dong`. */
export const HANH_DONG = Object.freeze({
  // đăng nhập
  DANG_NHAP: 'dang_nhap',
  DANG_XUAT: 'dang_xuat',
  DANG_NHAP_THAT_BAI: 'dang_nhap_that_bai',
  DOI_TEAM: 'doi_team',
  // an ninh
  CHAN_XUYEN_TEAM: 'chan_xuyen_team',
  THIEU_VAI: 'thieu_vai',
  // model
  DOI_MODEL: 'doi_model',
  DOI_KHOA: 'doi_khoa',
  CHUYEN_DU_PHONG: 'chuyen_du_phong',
  LOP_MODEL_HONG: 'lop_model_hong',
  // điều phối
  NHAN_VIEC: 'nhan_viec',
  DONG_VIEC: 'dong_viec',
  MO_LAI_VIEC: 'mo_lai_viec',
  // máy làm
  VIEC_TU_DONG: 'viec_tu_dong',
});

/** Nhóm để màn hình xếp bộ lọc thành từng cụm, không phải để module này dùng. */
export const NHOM = Object.freeze({
  dang_nhap: Object.freeze([
    HANH_DONG.DANG_NHAP, HANH_DONG.DANG_XUAT, HANH_DONG.DANG_NHAP_THAT_BAI, HANH_DONG.DOI_TEAM,
  ]),
  an_ninh: Object.freeze([HANH_DONG.CHAN_XUYEN_TEAM, HANH_DONG.THIEU_VAI]),
  model: Object.freeze([
    HANH_DONG.DOI_MODEL, HANH_DONG.DOI_KHOA, HANH_DONG.CHUYEN_DU_PHONG, HANH_DONG.LOP_MODEL_HONG,
  ]),
  dieu_phoi: Object.freeze([HANH_DONG.NHAN_VIEC, HANH_DONG.DONG_VIEC, HANH_DONG.MO_LAI_VIEC]),
  may_lam: Object.freeze([HANH_DONG.VIEC_TU_DONG]),
});

/**
 * NHÓM BẮT BUỘC — luật 4 của module.
 *
 * Ghi nhật ký hỏng thì bình thường nuốt lỗi và trả `null`, để việc chính đi tiếp. Bốn mã
 * này thì KHÔNG: chúng là dấu vết của sự cố an ninh và của việc đổi cấu hình tốn tiền.
 * Mất một dòng `chan_xuyen_team` nghĩa là có người dò dữ liệu team khác mà không ai hay;
 * mất một dòng `doi_khoa` nghĩa là không truy được ai thay khoá API. Hỏng việc còn sửa
 * được, mất dấu vết thì không.
 */
export const nhomBatBuoc = Object.freeze(new Set([
  HANH_DONG.CHAN_XUYEN_TEAM,
  HANH_DONG.DANG_NHAP_THAT_BAI,
  HANH_DONG.DOI_MODEL,
  HANH_DONG.DOI_KHOA,
]));

/** Ghi hỏng mã này thì phải ném lỗi chứ không được nuốt. */
export function laBatBuoc(ma) {
  return nhomBatBuoc.has(String(ma || ''));
}

const DS_HOP_LE = new Set(Object.values(HANH_DONG));

/** Mã có nằm trong danh mục không. Chuỗi trần lọt vào là chặn ngay lúc ghi. */
export function hopLeHanhDong(ma) {
  return DS_HOP_LE.has(String(ma || ''));
}

const MO_TA = Object.freeze({
  [HANH_DONG.DANG_NHAP]: 'Đăng nhập',
  [HANH_DONG.DANG_XUAT]: 'Đăng xuất',
  [HANH_DONG.DANG_NHAP_THAT_BAI]: 'Đăng nhập thất bại',
  [HANH_DONG.DOI_TEAM]: 'Đổi team đang làm việc',
  [HANH_DONG.CHAN_XUYEN_TEAM]: 'Chặn truy cập xuyên team',
  [HANH_DONG.THIEU_VAI]: 'Chặn vì không đủ vai',
  [HANH_DONG.DOI_MODEL]: 'Đổi cấu hình model',
  [HANH_DONG.DOI_KHOA]: 'Đổi khoá API',
  [HANH_DONG.CHUYEN_DU_PHONG]: 'Chuyển sang model dự phòng',
  [HANH_DONG.LOP_MODEL_HONG]: 'Lớp model gặp lỗi',
  [HANH_DONG.NHAN_VIEC]: 'Nhận việc',
  [HANH_DONG.DONG_VIEC]: 'Đóng việc',
  [HANH_DONG.MO_LAI_VIEC]: 'Mở lại việc',
  [HANH_DONG.VIEC_TU_DONG]: 'Việc máy tự làm',
});

/** Chữ tiếng Việt cho màn hình. Mã lạ → trả lại chính mã, kèm một tiếng kêu ở console. */
export function moTa(ma) {
  const k = String(ma || '');
  if (MO_TA[k]) return MO_TA[k];
  if (k) console.warn(`[nhat-ky] mã hành động chưa có mô tả: ${k}`);
  return k;
}

/** Cho màn hình dựng ô chọn: [{ ma, ten, nhom }] */
export function danhSachHanhDong() {
  const ra = [];
  for (const [nhom, ds] of Object.entries(NHOM)) {
    for (const ma of ds) ra.push({ ma, ten: moTa(ma), nhom });
  }
  return ra;
}
