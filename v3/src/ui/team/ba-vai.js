// VE7d · 01/10 (bản vẽ 4 › Người và team) — BA VAI và «ai phụ trách gì», nói THỨ MÁY LÀM, không nói thứ bản vẽ hứa:
//   · «mở được» của mỗi vai đo bằng CHÍNH hàm dựng thanh điều hướng (`chung/man-hinh.js#menuCua`) — không gõ tay danh sách;
//   · «phụ trách» của marketer: CHƯA CÓ NGUỒN. `01-QUYET-DINH.md` §9 ký «marketer chỉ thấy sản phẩm mình phụ trách» nhưng hệ
//     chưa biết sản phẩm/page nào của ai (không cột nào nối người dùng ↔ marketer; prod 01/10: `page.marketer` trống 582/582,
//     sản phẩm gốc chưa có marketer) — nối ở LL15 (HRM). Thẻ đếm page có tên marketer để người đọc thấy SỐ ĐO, không đoán;
//   · HRM chưa nối vào máy chủ (chờ việc người H11 + phiếu LL15) ⇒ cột «Hồ sơ HRM» nói «chưa nối», không số đo tay.
import { batBuocBoiCanh, VAI, VAI_GAN_DUOC } from '../../auth/boi-canh.js';
import { congTruyVan, TEN_VAI, BANG_PAGE } from './kho-team.js';

export const HRM = Object.freeze({
  noi: false,
  chu: 'Chưa nối vào máy chủ',
  cho: 'việc người H11 (tài khoản BigQuery chỉ đọc) · phiếu LL15',
  nguon: Object.freeze(['HRM_Core.dim_employee', 'PIALPHA_ALL_Dataset.dim_person_map']),
});

/** Phụ trách theo vai — `coNguon:false` là hệ CHƯA biết, màn phải nói vậy chứ không để trống. */
export const PHU_TRACH = Object.freeze({
  [VAI.QUAN_TRI]: Object.freeze({ chu: 'Tất cả', coNguon: true, tatCa: true }),   // `tatCa`: vai này phủ mọi vai khác
  [VAI.MARKETER]: Object.freeze({ chu: 'Chưa có nguồn', coNguon: false,
    viSao: 'hệ chưa biết sản phẩm, page nào của ai — cần nối HRM (LL15)' }),
  [VAI.SALE]: Object.freeze({ chu: 'Hộp thư của team', coNguon: true }),
});

// `man-hinh.js` nạp mọi màn (có `team/index.js`) ⇒ nạp TĨNH ở đây là vòng import. Nạp lúc gọi: khi đó sổ màn đã dựng xong.
let _menuCua = null;
async function menuCuaVai(ma) {
  _menuCua ||= (await import('../chung/man-hinh.js')).menuCua;
  return _menuCua([ma]);
}

/**
 * Ba thẻ vai của màn + số đo đi kèm.
 * @param {object} boiCanh
 * @param {{ nguoi?: Array<{vai:Array<{ma:string}>}> }} [bo] thành viên đã đọc sẵn (`thanhVienCua`) — để đếm người mỗi vai
 */
export async function baVaiCua(boiCanh, { nguoi = [] } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  const vai = [];
  for (const ma of VAI_GAN_DUOC) {
    const menu = await menuCuaVai(ma);
    vai.push({
      ma, ten: TEN_VAI[ma] || ma,
      // Mỗi mục: tên + các màn vai này mở được trong mục (kể cả màn đứng thành tab trong cụm; bỏ màn thử nghiệm) — tên
      // màn theo nhãn người dùng thấy (`nhanCum` là chữ trên tab của cụm).
      moDuoc: menu.map((n) => ({ ten: n.ten, man: n.man.filter((m) => !m.thuNghiem).map((m) => m.nhanCum || m.ten) })),
      soNguoi: nguoi.filter((n) => (n.vai || []).some((v) => v.ma === ma)).length,
      phuTrach: PHU_TRACH[ma],
    });
  }
  let pageMarketer;
  try {
    const ds = (await congTruyVan(bc).chon(BANG_PAGE, {})) || [];
    pageMarketer = { co: ds.filter((p) => String(p.marketer || '').trim() !== '').length, tong: ds.length, viSao: null };
  } catch (e) {
    pageMarketer = { co: null, tong: null, viSao: `không đọc được bảng page (${String(e?.message || e).slice(0, 120)})` };
  }
  return { vai, pageMarketer, hrm: HRM };
}
