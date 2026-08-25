// DANH MỤC MÃ HÀNH ĐỘNG của nhật ký thao tác.
//
// Vì sao có file này thay vì viết chuỗi trần ở chỗ gọi: cột `hanh_dong` là thứ người ta
// lọc trên màn "Nhật ký thao tác" và là thứ dùng để đếm sự cố an ninh. Một chỗ gõ
// 'dang_nhap_that_bai' còn chỗ kia gõ 'dangNhapThatBai' thì bộ lọc trống mà không ai biết
// vì sao — nhật ký vẫn có dòng, chỉ là không tìm ra.
//
// Thêm mã mới: thêm vào HANH_DONG **và** MO_TA. Thiếu mô tả thì `moTa()` kêu lên ở
// console chứ không trả về chuỗi rỗng — màn hình hiện mã trần còn hơn hiện ô trống.

/**
 * Mã hành động, nhóm theo việc. Giá trị = đúng chuỗi lưu xuống cột `hanh_dong`.
 *
 * ⚠️ DANH MỤC NÀY LÀ DENY-BY-DEFAULT, và nó đã bắt được một lỗi thật (25/08): năm màn của
 * giai đoạn 2 dùng chín mã chưa khai ở đây, nên `ghiNhatKy` từ chối, `console.error` rồi
 * trả `null` — **mọi lượt ghi nhật ký của cả năm màn rơi vào hư không** trong khi màn hình
 * vẫn báo thành công. Đúng loại lỗi im lặng mà cả dự án này canh.
 * Thêm màn mới thì thêm mã Ở ĐÂY TRƯỚC, đừng đợi tới lúc chạy mới biết.
 */
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

  // ── giai đoạn 2 · sóng 0 ──
  // cấu hình team
  THEM_THANH_VIEN: 'them_thanh_vien',
  BOT_THANH_VIEN: 'bot_thanh_vien',
  CHUYEN_PAGE_TEAM: 'chuyen_page_team',
  // page & bot
  BAT_TAT_BOT_AI: 'bat_tat_bot_ai',
  GAN_MARKETER: 'gan_marketer',
  DAT_TRONG_DIEM: 'dat_trong_diem',
  // kết nối & token
  THEM_TOKEN_PANCAKE: 'them_token_pancake',
  BO_TOKEN_PANCAKE: 'bo_token_pancake',

  // ── giai đoạn 2 · sóng 1 ──
  LUU_BAN_NHAP_BO_LUAT: 'luu_ban_nhap_bo_luat',
  AP_BO_LUAT: 'ap_bo_luat',
  BAT_TAT_KY_NANG: 'bat_tat_ky_nang',
  DAT_NHOM_KY_NANG: 'dat_nhom_ky_nang',

  // ── giai đoạn 2 · sóng 2 ──
  LUU_BAN_NHAP_KICH_BAN: 'luu_ban_nhap_kich_ban',
  DUA_KICH_BAN_LEN_LIVE: 'dua_kich_ban_len_live',
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
  cau_hinh_team: Object.freeze([
    HANH_DONG.THEM_THANH_VIEN, HANH_DONG.BOT_THANH_VIEN, HANH_DONG.CHUYEN_PAGE_TEAM,
  ]),
  page_bot: Object.freeze([
    HANH_DONG.BAT_TAT_BOT_AI, HANH_DONG.GAN_MARKETER, HANH_DONG.DAT_TRONG_DIEM,
  ]),
  ket_noi: Object.freeze([HANH_DONG.THEM_TOKEN_PANCAKE, HANH_DONG.BO_TOKEN_PANCAKE]),
  bo_luat: Object.freeze([HANH_DONG.LUU_BAN_NHAP_BO_LUAT, HANH_DONG.AP_BO_LUAT]),
  ky_nang: Object.freeze([HANH_DONG.BAT_TAT_KY_NANG, HANH_DONG.DAT_NHOM_KY_NANG]),
  kich_ban: Object.freeze([HANH_DONG.LUU_BAN_NHAP_KICH_BAN, HANH_DONG.DUA_KICH_BAN_LEN_LIVE]),
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

  // ── thêm 25/08, giai đoạn 2 ──
  // Cấp quyền: ai cho ai vào team nào với vai gì. Mất dấu là mất luôn khả năng trả lời
  // «vì sao người này thấy được dữ liệu đó».
  HANH_DONG.THEM_THANH_VIEN,
  HANH_DONG.BOT_THANH_VIEN,
  // Đổi chủ dữ liệu: một lượt chuyển kéo theo hội thoại, kịch bản, sản phẩm sang team khác.
  HANH_DONG.CHUYEN_PAGE_TEAM,
  // Gạt công tắc bot là đổi cách hệ thống nói chuyện với KHÁCH THẬT.
  HANH_DONG.BAT_TAT_BOT_AI,
  // ⚠️ `AP_BO_LUAT` bắt buộc vì một lý do KHÁC HẲN mấy mã trên: nó vừa là dấu vết vừa là
  //    DỮ LIỆU. Màn bộ luật suy «bản cũ» hay «chờ duyệt» bằng cách hỏi bảng nhật ký xem
  //    phiên bản này đã từng áp chưa (`bo_luat_chung` không có cột `trang_thai`). Ghi hụt
  //    một dòng là một bản đã từng chạy bỗng trông như chưa duyệt, và người sau bấm áp lại
  //    nó tưởng là bản mới.
  HANH_DONG.AP_BO_LUAT,
  // Bật một kỹ năng là đổi cách bot tư vấn cho cả nhóm sản phẩm — §6 đo được nó đụng tới
  // tỉ lệ hoàn hàng (26,8% và 19,2% với sản phẩm có size chưa bật hỏi size).
  HANH_DONG.BAT_TAT_KY_NANG,
  // Đưa kịch bản lên LIVE là đổi cách bot nói với khách của page đó, có hiệu lực ≤60 giây.
  HANH_DONG.DUA_KICH_BAN_LEN_LIVE,
]));

/** Ghi hỏng mã này thì phải ném lỗi chứ không được nuốt. */
export function laBatBuoc(ma) {
  return nhomBatBuoc.has(String(ma || ''));
}

const DS_HOP_LE = new Set(Object.values(HANH_DONG));

/** Phơi ra CHỈ cho bài test đối chiếu danh mục — xem `audit-ghi.test.mjs`. */
export const DS_HOP_LE_DE_TEST = DS_HOP_LE;

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
  // giai đoạn 2 · sóng 0
  [HANH_DONG.THEM_THANH_VIEN]: 'Cấp vai cho người trong team',
  [HANH_DONG.BOT_THANH_VIEN]: 'Rút vai của người trong team',
  [HANH_DONG.CHUYEN_PAGE_TEAM]: 'Chuyển page sang team khác',
  [HANH_DONG.BAT_TAT_BOT_AI]: 'Bật/tắt bot AI cho page',
  [HANH_DONG.GAN_MARKETER]: 'Gán marketer cho page',
  [HANH_DONG.DAT_TRONG_DIEM]: 'Đánh dấu page trọng điểm',
  [HANH_DONG.THEM_TOKEN_PANCAKE]: 'Thêm token Pancake',
  [HANH_DONG.BO_TOKEN_PANCAKE]: 'Bỏ token Pancake',
  // giai đoạn 2 · sóng 1
  [HANH_DONG.LUU_BAN_NHAP_BO_LUAT]: 'Lưu bản nháp bộ luật chung',
  [HANH_DONG.AP_BO_LUAT]: 'Áp bộ luật chung',
  [HANH_DONG.BAT_TAT_KY_NANG]: 'Bật/tắt kỹ năng',
  [HANH_DONG.DAT_NHOM_KY_NANG]: 'Khoanh nhóm sản phẩm cho kỹ năng',
  [HANH_DONG.LUU_BAN_NHAP_KICH_BAN]: 'Lưu bản nháp kịch bản',
  [HANH_DONG.DUA_KICH_BAN_LEN_LIVE]: 'Đưa kịch bản lên LIVE',
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
