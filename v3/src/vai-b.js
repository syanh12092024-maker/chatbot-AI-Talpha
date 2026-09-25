// NỐI DÂY PHẦN RÌA (vai B) — một lời gọi thay cho mười hai.
//
// Bốn module của vai B cố ý KHÔNG import lẫn nhau: nhật ký, chặn đăng nhập, chặn vai, phễu
// Sổ AI đều đi qua hàm tiêm. Nhờ vậy chúng code song song được mà không đụng nhau. Cái giá
// là ai dựng ứng dụng cũng phải nhớ nối mười hai chỗ, đúng thứ tự. File này trả cái giá đó
// một lần, ở một chỗ.
//
// HAI CÁI BẪY FILE NÀY SINH RA ĐỂ BỊT — cả hai đều đã dính thật khi chạy thử 22/08/2026:
//
//   ① THỨ TỰ. `lopBoiCanh()` phải đứng TRƯỚC router đăng nhập. Đặt sau thì `/api/toi` không
//      đọc được vé, màn chọn team bị đá ngược về đăng nhập — người thuộc nhiều team không
//      bao giờ vào được, mà không có một dòng lỗi nào.
//
//   ② HÌNH DẠNG CHẮN. Bảng điều phối nhận HÀM DỰNG cái chắn, không phải cái chắn đã dựng.
//      Truyền nhầm thì nổ `Cannot read properties of undefined (reading 'boiCanh')` giữa
//      lúc có khách bấm, kèm nguyên stack trace phun ra trình duyệt.
//
// Người A chỉ cần giao ba thứ và gọi một hàm — xem `v3/docs/hop-dong-b-voi-a.md` mục 8.

import { taoRouterVanHanh } from './ui/van-hanh/router.js';
import {
  datCongDanhTinh, datPheuNhatKy as datPheuNhatKyAuth, taoRouterAuth,
  lopBoiCanh, batBuocDangNhap, batBuocVaiHTTP, chanTeamTrenUrl,
} from './auth/index.js';
import { datTaoTruyVan as datTruyVanNhatKy, datPheuNhatKy as datPheuRaNgoai, ghiNhatKy, docNhatKy } from './audit/index.js';
import { moTa as moTaHanhDong, NHOM as NHOM_HANH_DONG } from './audit/hanh-dong.js';
import {
  datTaoTruyVan as datTruyVanModel, datPheuSoAi, datPheuNhatKy as datPheuNhatKyModel,
  datPheuCanhBao, datKhoKhoa,
} from './model/index.js';
import {
  datTaoTruyVan as datTruyVanDieuPhoi, datPheuNhatKy as datPheuNhatKyDieuPhoi,
  datChanDangNhap, datChanVai, taoRouterDieuPhoi,
} from './ui/dispatch/index.js';
import {
  datTaoTruyVan as datTruyVanTeam, datCongDanhTinh as datDanhTinhTeam,
  datCongDanhTinhGhi as datDanhTinhTeamGhi, datPheuNhatKy as datPheuNhatKyTeam,
  datDocKetNoiPos, datChanDangNhap as datChanDangNhapTeam, datChanVai as datChanVaiTeam,
  taoRouterCauHinhTeam, datChuyenPage, datDocKhoTam,
} from './ui/team/index.js';
import {
  datTaoTruyVan as datTruyVanPageBot, datPheuNhatKy as datPheuNhatKyPageBot,
  datChanDangNhap as datChanDangNhapPageBot, datChanVai as datChanVaiPageBot,
  datDocSanSang as datDocSanSangPageBot,
  taoRouterPageBot,
  datQuetPage,
} from './ui/page-bot/index.js';
import { khoToken } from './ui/ket-noi/index.js';
import { trangThaiCau as trangThaiCauBot } from './noi-day/cau-bot-v1.js';
import {
  datDocKetNoiPos as datDocKetNoiPosKN, datPheuNhatKy as datPheuNhatKyKetNoi, datChayNapLai,
  datGhiKetNoiPos,
  datKhoTokenV3,
  datKeoDanhMuc,
  datChanDangNhap as datChanDangNhapKetNoi, datChanVai as datChanVaiKetNoi,
  taoRouterKetNoi,
} from './ui/ket-noi/index.js';
import {
  datChanDangNhap as datChanDangNhapModel, datChanVai as datChanVaiModel, taoRouterModel,
} from './ui/model/index.js';
import {
  datTaoTruyVan as datTruyVanBoLuat, datPheuNhatKy as datPheuNhatKyBoLuat,
  datChanDangNhap as datChanDangNhapBoLuat, datChanVai as datChanVaiBoLuat, taoRouterBoLuat,
  datCuaBoLuat, manBoLuat,
} from './ui/bo-luat/index.js';
import { taoRouterDieuHuong } from './ui/chung/router-dieu-huong.js';
import { menuCua } from './ui/chung/man-hinh.js';
import { datDocSanSang as datDocSanSangDai, datDemTeam } from './ui/chung/trang-thai.js';
import { datDocNhip } from './ui/chung/nhip-may-bot.js';
import {
  taoRouterMotPage, datChanDangNhap as datChanDangNhapMotPage,
  datChanVai as datChanVaiMotPage, datDocKhoi as datDocKhoiMotPage,
} from './ui/mot-page/index.js';
import {
  taoRouterCaiDat, datTaoTruyVan as datTruyVanCaiDat,
  datDocKhoToken as datDocKhoTokenCaiDat, datDocKetNoiPos as datDocKetNoiPosCaiDat,
  datChanDangNhap as datChanDangNhapCaiDat, datChanVai as datChanVaiCaiDat,
} from './ui/cai-dat-team/index.js';
import { sanSangToanHe, danhSachPageKemSanPham, sanPhamCuaPage, chiPhiToanHe, donHangToanHe, pheuHoiThoai } from './noi-day/cau-bot-v1.js';
import {
  datTaoTruyVan as datTruyVanHieuQua, datDocHieuQua,
  datChanDangNhap as datChanDangNhapHieuQua, datChanVai as datChanVaiHieuQua, taoRouterHieuQua,
} from './ui/hieu-qua/index.js';
import {
  datTaoTruyVan as datTruyVanLop0, datPheuNhatKy as datPheuNhatKyLop0,
  datChanDangNhap as datChanDangNhapLop0, datChanVai as datChanVaiLop0, taoRouterLop0,
} from './ui/lop-0-dong/index.js';
import {
  datTaoTruyVan as datTruyVanNguon, datDocPheu,
  datChanDangNhap as datChanDangNhapNguon, datChanVai as datChanVaiNguon, taoRouterNguon,
} from './ui/nguon-khach/index.js';
import {
  datTaoTruyVan as datTruyVanKhach,
  datChanDangNhap as datChanDangNhapKhach, datChanVai as datChanVaiKhach, taoRouterKhach,
} from './ui/ho-so-khach/index.js';
import {
  datTaoTruyVan as datTruyVanRuiRo, datDocPhanBo as datDocPhanBoRuiRo,
  datChanDangNhap as datChanDangNhapRuiRo, datChanVai as datChanVaiRuiRo, taoRouterRuiRo,
} from './ui/rui-ro-hoan/index.js';
import {
  datTaoTruyVan as datTruyVanBaoCao, datDocDon, datDocChiPhi as datDocChiPhiChoBaoCao,
  datDocHaiLuong,
  datChanDangNhap as datChanDangNhapBaoCao, datChanVai as datChanVaiBaoCao, taoRouterBaoCao,
} from './ui/bao-cao/index.js';
import {
  datTaoTruyVan as datTruyVanChiPhi, datDocChiPhiBot, datDocSoAi,
  datChanDangNhap as datChanDangNhapChiPhi, datChanVai as datChanVaiChiPhi, taoRouterChiPhi,
} from './ui/chi-phi/index.js';
import {
  datTaoTruyVan as datTruyVanLenChay, datDocSanSang as datDocSanSangLenChay,
  datDocMotPage as datDocMotPageLenChay,
  datChanDangNhap as datChanDangNhapLenChay, datChanVai as datChanVaiLenChay, taoRouterLenChay,
} from './ui/len-chay/index.js';
import {
  datTaoTruyVan as datTruyVanAnh, datDocKhoSanPham as datDocKhoAnh,
  datChanDangNhap as datChanDangNhapAnh, datChanVai as datChanVaiAnh, taoRouterAnh,
} from './ui/thu-vien-anh/index.js';
import {
  datTaoTruyVan as datTruyVanSanPham, datDocKhoSanPham,
  datChanDangNhap as datChanDangNhapSanPham, datChanVai as datChanVaiSanPham, taoRouterSanPham,
  datKhoGoc, datPheuNhatKyGoc,
} from './ui/san-pham/index.js';
import {
  datTaoTruyVan as datTruyVanTrangChu, datDocSanSang as datDocSanSangTrangChu,
  datChanDangNhap as datChanDangNhapTrangChu, datChanVai as datChanVaiTrangChu, taoRouterTrangChu,
} from './ui/trang-chu/index.js';
import {
  datTaoTruyVan as datTruyVanSanSang, datDocSanSang,
  datChanDangNhap as datChanDangNhapSanSang, datChanVai as datChanVaiSanSang, taoRouterSanSang,
} from './ui/san-sang/index.js';
import { manSanSang } from './ui/san-sang/kho-san-sang.js';
// Màn «Bắt đầu» KHÔNG có cầu riêng và KHÔNG có cửa ghi riêng: nó gọi `manSanSang()` của
// màn Cửa kiểm (nên tự ăn theo `datTruyVanSanSang` + `datDocSanSang`), và nút bật bot của
// nó gọi `POST /api/page-bot/:id/bot` đã có. Ở đây chỉ cần nối HAI cái chắn.
import {
  datChanDangNhap as datChanDangNhapBatDau, datChanVai as datChanVaiBatDau, taoRouterBatDau,
} from './ui/bat-dau/index.js';
import {
  datDocBoLuat as datDocBoLuatChoDeXuat, datCuaBoLuat as datCuaBoLuatChoDeXuat,
  datChanDangNhap as datChanDangNhapDeXuat, datChanVai as datChanVaiDeXuat, taoRouterDeXuat,
} from './ui/ai-de-xuat/index.js';
import {
  datTaoTruyVan as datTruyVanKyNang, datPheuNhatKy as datPheuNhatKyKyNang,
  datChanDangNhap as datChanDangNhapKyNang, datChanVai as datChanVaiKyNang, taoRouterKyNang,
} from './ui/ky-nang/index.js';
import {
  datTaoTruyVan as datTruyVanPrompt, datDocKhoi, datDocHieuLuc,
  datChanDangNhap as datChanDangNhapPrompt, datChanVai as datChanVaiPrompt, taoRouterPromptPage,
} from './ui/prompt-page/index.js';
import {
  datDocNhatKy, datDanhMuc,
  datChanDangNhap as datChanDangNhapNhatKy, datChanVai as datChanVaiNhatKy, taoRouterNhatKy,
} from './ui/nhat-ky/index.js';
import {
  datTaoTruyVan as datTruyVanSucKhoe, datDocKhoToken, datTrangThaiCauBot, datDocSanSang as datDocSanSangSucKhoe,
  datChanDangNhap as datChanDangNhapSucKhoe, datChanVai as datChanVaiSucKhoe, taoRouterSucKhoe,
} from './ui/suc-khoe/index.js';
import {
  datTaoTruyVan as datTruyVanKichBan, datPheuNhatKy as datPheuNhatKyKichBan,
  datDungBanMay, datDayLenBot, datBocPancake,
  datChanDangNhap as datChanDangNhapKichBan, datChanVai as datChanVaiKichBan, taoRouterKichBan,
} from './ui/kich-ban/index.js';

/**
 * Nối toàn bộ phần rìa vào một ứng dụng Express.
 *
 * @param {import('express').Express} app
 * @param {object} phuThuoc
 * @param {(boiCanh:object)=>object} phuThuoc.taoTruyVan        BẮT BUỘC · người A giao. Cổng có chèn điều kiện team.
 * @param {()=>object}               phuThuoc.taoTruyVanHeThong BẮT BUỘC · người A giao. Cổng KHÔNG gắn team,
 *                                                              chỉ cho bốn bảng dùng chung — xem `auth/kho-nguoi-dung.js`.
 * @param {{taoBan:Function,ap:Function,duyet:Function,xemAnhHuong?:Function}} [phuThuoc.cuaBoLuat]
 *                                                              cửa GHI có giao dịch cho bộ luật chung (người A
 *                                                              giao: `src/db/noi-dung.js`). `xemAnhHuong` là
 *                                                              phép đếm page-bị-ảnh-hưởng hỏi NGUỒN THẬT.
 * @param {()=>Promise<{pages:Array}>} [phuThuoc.docSanSang]    bộ đọc cửa kiểm sẵn sàng. Bỏ trống → dùng cầu
 *                                                              THẬT sang tiến trình bot. Máy chủ dữ liệu giả
 *                                                              PHẢI truyền bản giả, nếu không trang demo sẽ
 *                                                              hiện tình trạng page thật của khách.
 *                                                              Thiếu thì màn Bộ luật TỪ CHỐI ghi — ghi bằng
 *                                                              hai lời gọi rời là bỏ mất giao dịch và luật §9.
 * @param {(cfg:object)=>string}    [phuThuoc.dungBanMay]      dựng BẢN CHO MÁY từ bản người
 *                                                              (người A giao: `db/di-tru/nguon.js#dungBanChoMay`).
 *                                                              Thiếu thì màn soạn kịch bản TỪ CHỐI lưu.
 * @param {(pageId:string,cfg:object)=>Promise} [phuThuoc.dayKichBanLenBot] đưa một bản lên LIVE ở tiến trình bot.
 * @param {(b64:string)=>Promise<object>} [phuThuoc.bocPancake]  bóc file kịch bản Pancake thành bản nháp.
 * @param {{boLuat:Function,kyNang:Function,kichBan:Function,sanPham:Function}} [phuThuoc.docKhoi]
 *                                                              bốn bộ đọc khối prompt (người A giao:
 *                                                              `src/chat/rap-prompt.js`). Thiếu thì màn
 *                                                              «Prompt của page» nói rõ là lỗi cấu hình.
 * @param {{coKhoa:Function,docKhoa:Function,ghiKhoa:Function}} [phuThuoc.khoKhoa] kho khoá API theo (team × nhà)
 *                                                              (người A giao: `db/khoa.js`, bảng `khoa_nha`).
 *                                                              Thiếu thì lớp model chỉ đọc được khoá từ biến môi trường.
 * @param {(bc:object,t:object)=>Promise<object>} [phuThuoc.chuyenPage] chuyển một page sang team khác, kèm toàn bộ con
 *                                                              (người A giao: `src/db/chuyen-team.js#chuyenPageSangTeam`).
 *                                                              Thiếu thì lát «gán page ↔ team» hiện MỜ kèm lý do.
 * @param {(bc:object)=>Promise<Array>} [phuThuoc.docKetNoiPos]   đọc kết nối POS của một team, KHÔNG giải mã khoá
 *                                                              (người A giao: `src/pos/ket-noi.js#lietKeThiTruong`).
 *                                                              Thiếu thì màn cấu hình team nói «chưa nối bộ đọc»,
 *                                                              KHÔNG nói «không có kết nối nào».
 * @param {{them:Function,sua:Function,batTat:Function,bo:Function}} [phuThuoc.ghiKetNoiPos]
 *                                                              bốn cửa GHI kết nối POS (người A giao:
 *                                                              `src/pos/ket-noi.js#themKetNoi|suaKetNoi|batTatKetNoi|boKetNoi`).
 *                                                              Thiếu thì màn Kết nối chỉ ĐỌC, và nó nói rằng
 *                                                              thêm/sửa kết nối vẫn phải chạy `npm run di-tru`.
 * @param {(ban:object)=>void}      [phuThuoc.ghiSoAi]          người A giao. Thiếu thì lớp model kêu mỗi 100 lượt.
 * @param {(canh:object)=>void}     [phuThuoc.canhBao]          nơi nhận cảnh báo chuyển dự phòng (Telegram, log…).
 * @param {(bc:object)=>Promise<object>} [phuThuoc.docNhipMayBot] số đo hàng đợi tin của team
 *                                                              (`src/queue/kho.js#nhipMayBot`). Thiếu thì đèn «Máy
 *                                                              chạy bot» XÁM — nói chưa đo được, KHÔNG nói đang ổn.
 * @param {express}                 [phuThuoc.express]          để tự gắn `express.json()` nếu app chưa có.
 * @returns {{daNoi:string[], thieu:string[]}}
 */
export function dungPhanB(app, { taoTruyVan, taoTruyVanHeThong, docKetNoiPos, ghiKetNoiPos, khoTokenV3, quetPagePancake, keoDanhMucPos, khoSanPhamGoc, chuyenPage, docKhoTamPage, khoKhoa,
  docKhoi, dungBanMay, dayKichBanLenBot, bocPancake, cuaBoLuat, docSanSang, khoSanPham,
  docChiPhi, docSoAiV3, docDonHang, docHaiLuong, docPheu, docHieuQua, docHieuLucPrompt,
  docPhanBoHoan,
  chayNapLai, vanHanh,
  ghiSoAi, canhBao, docNhipMayBot, docSanPhamSua, express } = {}) {
  if (!app || typeof app.use !== 'function') {
    throw new TypeError('dungPhanB: tham số đầu phải là một ứng dụng Express.');
  }
  // Ném ngay tại đây, không để trôi xuống lúc có khách bấm. Cổng dữ liệu thiếu thì mọi thứ
  // phía sau đều hỏng, mà hỏng lúc chạy thì thông điệp không nói được là thiếu cái gì.
  if (typeof taoTruyVan !== 'function') {
    throw new TypeError('dungPhanB: thiếu `taoTruyVan(boiCanh)` — cổng truy vấn của người A (hợp đồng mục 3).');
  }
  if (typeof taoTruyVanHeThong !== 'function') {
    throw new TypeError('dungPhanB: thiếu `taoTruyVanHeThong()` — cổng KHÔNG gắn team cho bốn bảng dùng chung (hợp đồng mục 4).');
  }

  const daNoi = [];
  const thieu = [];

  // ── ① Cổng dữ liệu cho ba module chạm cơ sở dữ liệu ──
  datTruyVanNhatKy(taoTruyVan);
  datTruyVanModel(taoTruyVan);
  datTruyVanDieuPhoi(taoTruyVan);
  datCongDanhTinh(taoTruyVanHeThong);
  // Màn cấu hình team dùng CẢ HAI cổng: cổng có team cho `page`/`hoi_thoai`/`cau_hinh_model`,
  // cổng danh tính cho bốn bảng dùng chung (`thanh_vien_team` không nằm trong tầng truy vấn
  // của A). Tầng ĐỌC và tầng GHI nhận riêng — hai file, hai phễu, cùng một cổng.
  datTruyVanTeam(taoTruyVan);
  datDanhTinhTeam(taoTruyVanHeThong);
  datDanhTinhTeamGhi(taoTruyVanHeThong);
  datTruyVanPageBot(taoTruyVan);
  datTruyVanBoLuat(taoTruyVan);
  datTruyVanKyNang(taoTruyVan);
  datTruyVanPrompt(taoTruyVan);
  datTruyVanKichBan(taoTruyVan);
  datTruyVanSanSang(taoTruyVan);
  // Cửa kiểm đọc thẳng từ tiến trình bot — `src/readiness.js` là cái CHẶN việc bật AI ở v1,
  // nên nó cũng phải là cái v3 hiện ra. Tính lại ở v3 là dựng cái thang thứ hai.
  //
  // NHẬN TỪ NGOÀI được, và đó là chủ ý: máy chủ xem thử (`v3/xem-thu.js`, dữ liệu giả) PHẢI
  // truyền bản giả vào. Nếu nó dùng cầu thật thì một trang demo sẽ hiện tình trạng page THẬT
  // của khách — cùng một máy, cổng 3100 vẫn gọi được.
  const docCuaKiem = typeof docSanSang === 'function' ? docSanSang : sanSangToanHe;
  datDocSanSang(docCuaKiem);
  datTruyVanTrangChu(taoTruyVan);
  datTruyVanSanPham(taoTruyVan);
  // Kho sản phẩm đọc NGUỒN THẬT (Sheet của tiến trình bot), không đọc bảng `san_pham` của v3
  // — bảng đó 0 dòng vì chưa ai chạy nạp từ POS. Nhận từ ngoài để bản xem thử tiêm bản giả.
  const kho = khoSanPham && typeof khoSanPham.danhSach === 'function'
    ? khoSanPham
    : { danhSach: danhSachPageKemSanPham, motPage: sanPhamCuaPage };
  datDocKhoSanPham(kho);
  // Thư viện ảnh dùng CHUNG bộ đọc — ảnh nằm trong chính dữ liệu sản phẩm, không có kho riêng.
  datTruyVanAnh(taoTruyVan);
  datDocKhoAnh(kho);
  // Màn sáu chặng dùng LẠI cả hai bộ đọc — cửa kiểm và cấu hình kịch bản. Không bộ nào riêng.
  const docTien = typeof docChiPhi === 'function' ? docChiPhi : chiPhiToanHe;
  datTruyVanHieuQua(taoTruyVan);
  if (typeof docHieuQua === 'function') datDocHieuQua(docHieuQua);
  datTruyVanLop0(taoTruyVan);
  datTruyVanNguon(taoTruyVan);
  datDocPheu(typeof docPheu === 'function' ? docPheu : pheuHoiThoai);
  datTruyVanKhach(taoTruyVan);
  datTruyVanRuiRo(taoTruyVan);
  // Phân bố rủi ro hoàn gom SẴN trong CSDL (phiếu B-Y8). Không nối thì màn lùi về đọc cột
  // tại chỗ — cùng bốn cột, nên hai đường không ra hai con số.
  if (typeof docPhanBoHoan === 'function') {
    datDocPhanBoRuiRo(docPhanBoHoan);
    daNoi.push('phân bố rủi ro hoàn (gom trong CSDL) → màn Rủi ro hoàn hàng');
  }
  datTruyVanBaoCao(taoTruyVan);
  datDocDon(typeof docDonHang === 'function' ? docDonHang : donHangToanHe);
  datDocChiPhiChoBaoCao(docTien);   // CÙNG bộ đọc với màn Chi phí — không hai con số
  if (typeof docHaiLuong === 'function') datDocHaiLuong(docHaiLuong);
  datTruyVanChiPhi(taoTruyVan);
  // Tiền đọc từ nơi ĐO THẬT. Sổ `so_ai` của v3 chỉ dùng để ĐỐI CHIẾU — nó 0 dòng, và hiện
  // số 0 ở màn chi phí là nói với chủ dự án rằng bot không tốn tiền.
  datDocChiPhiBot(docTien);
  if (typeof docSoAiV3 === 'function') datDocSoAi(docSoAiV3);
  datTruyVanLenChay(taoTruyVan);
  datDocSanSangLenChay(docCuaKiem);
  datDocMotPageLenChay(kho.motPage);
  datDocSanSangTrangChu(docCuaKiem);   // CÙNG bộ đọc — hai màn không được ra hai con số
  datDocSanSangPageBot(docCuaKiem);    // cột «Còn thiếu gì» của bảng Page — cùng nguồn nốt
  datDocSanSangDai(docCuaKiem);        // đường lui: đếm toàn hệ khi chưa có bối cảnh team
  // DẢI TRẠNG THÁI ĐẾM THEO TEAM, bằng ĐÚNG phép đếm của màn «Page còn thiếu gì» — không
  // phải một phép đếm thứ hai viết lại. Trước 23/09 dải đếm mọi page cầu trả về (toàn hệ)
  // nên hiện «1/1 page» trong khi team có 4 page, và nó hiện ở MỌI trang.
  datDemTeam(async (bc) => {
    const d = await manSanSang(bc);
    return { aiBat: d.dem.dangChay, tong: d.dem.tong };
  });
  // MÁY CHẠY BOT — một bộ đọc, hai chỗ hiện (dải trạng thái ở mọi trang + đèn ở màn «Hệ còn
  // sống không»). Đo bằng hàng đợi tin chứ không bằng «tiến trình có `active` không»: ngày
  // 08–10/08/2026 tiến trình `active` suốt hai ngày trong khi không khách nào được trả lời.
  if (typeof docNhipMayBot === 'function') {
    datDocNhip(docNhipMayBot);
    daNoi.push('nhịp máy chạy bot ← hàng đợi tin (dải trạng thái + đèn Máy chạy bot)');
  } else {
    datDocNhip(null);
    thieu.push('docNhipMayBot — không biết máy chạy bot của bot mới còn sống hay đã tắt; đèn «Máy chạy bot» đành để XÁM');
  }
  if (typeof docSanSang === 'function') daNoi.push('bộ đọc cửa kiểm GIẢ → màn Cửa kiểm sẵn sàng');
  datTruyVanSucKhoe(taoTruyVan);
  // Màn «Cài đặt team»: CÙNG ba bộ đọc với các màn khác — kho token của màn Kết nối, kết nối
  // POS của màn Người và team, cổng truy vấn chung. Không bộ đọc nào dựng riêng cho nó.
  datTruyVanCaiDat(taoTruyVan);
  datDocKhoTokenCaiDat(khoToken);
  if (typeof docKetNoiPos === 'function') datDocKetNoiPosCaiDat(docKetNoiPos);
  // CÙNG bộ đọc cửa kiểm với ba màn kia — hai đèn công tắc bot của màn Sức khỏe phải đọc
  // nguồn THẬT (`ai-enabled.json`), không đếm cột `page.bot_ai_bat` đã lệch 50 vs 0.
  datDocSanSangSucKhoe(docCuaKiem);
  daNoi.push('cổng dữ liệu → nhật ký · lớp model · bảng điều phối · kho người dùng · cấu hình team · page & bot');

  // ── ② Nhật ký: ba module ghi, một chỗ nhận ──
  // Ghi thẳng bằng `ghiNhatKy` của L0-M4 chứ không qua module trung gian: ba module kia
  // không được import `../audit/…`, nhưng ở đây thì được — đây chính là chỗ nối dây.
  for (const dat of [datPheuNhatKyAuth, datPheuNhatKyModel, datPheuNhatKyDieuPhoi, datPheuNhatKyTeam,
    datPheuNhatKyPageBot, datPheuNhatKyKetNoi, datPheuNhatKyBoLuat, datPheuNhatKyKyNang, datPheuNhatKyKichBan,
    // Mẫu 0 đồng là LỜI BOT NÓI VỚI KHÁCH — sửa phải để lại dấu vết (01 §9).
    datPheuNhatKyLop0,
    // Sản phẩm GỐC — danh mục do người định nghĩa, và là khoá của tầng kịch bản.
    datPheuNhatKyGoc]) {
    dat((boiCanh, ban) => {
      // Đăng nhập hỏng và chọn team không thuộc xảy ra TRƯỚC khi có bối cảnh — vai B cố ý
      // không dựng bối cảnh giả để lách (bối cảnh giả là thứ nguy hiểm nhất trong hệ này).
      // Không có bối cảnh thì không ghi vào bảng được; ghi ra log để không mất dấu hẳn.
      if (!boiCanh) {
        console.warn('[vai-b] việc xảy ra trước khi có bối cảnh team, chỉ ghi log:', ban?.hanh_dong || ban?.hanhDong, ban?.ghi_chu || '');
        return null;
      }
      return ghiNhatKy(boiCanh, ban);
    });
  }
  daNoi.push('nhật ký ← đăng nhập · lớp model · bảng điều phối · cấu hình team · page & bot · kết nối');

  // ── ③ Sổ AI và cảnh báo ──
  if (typeof ghiSoAi === 'function') { datPheuSoAi(ghiSoAi); daNoi.push('Sổ AI ← lớp model (mọi lượt ghi được mã model)'); }
  else thieu.push('ghiSoAi — lớp model chạy được nhưng KHÔNG ghi mã model vào Sổ AI, nên sau này không so được model nào rẻ hơn thật');

  if (typeof canhBao === 'function') { datPheuCanhBao(canhBao); daNoi.push('cảnh báo ← chuyển model dự phòng'); }
  else thieu.push('canhBao — nhà chính hết tiền thì tự chuyển dự phòng nhưng KHÔNG ai được báo. Đúng cảnh 06/08/2026');

  // Hai đèn của màn Sức khoẻ cần nguồn ngoài. Nối THẲNG từ hai module đã có, không bắt
  // người dựng ứng dụng truyền thêm — chúng vốn đã ở trong cùng gói này.
  datDocKhoToken(khoToken);
  datTrangThaiCauBot(trangThaiCauBot);
  daNoi.push('kho token + cầu bot → màn Sức khoẻ hệ thống');

  // Màn Nhật ký đọc qua chính bộ đọc của L0-M4 — không dựng đường đọc thứ hai.
  datDocNhatKy(docNhatKy);
  datDanhMuc({ moTa: moTaHanhDong, nhom: NHOM_HANH_DONG });
  daNoi.push('bộ đọc nhật ký + danh mục mã → màn Nhật ký thao tác');

  // Màn «AI đề xuất» dùng LẠI bộ đọc và CÙNG cửa ghi của màn Bộ luật — nó chỉ khác ở chỗ
  // ghi cứng `nguon='ai'`. Dựng bộ đọc thứ hai là mở đường cho hai màn đếm ra hai con số.
  datDocBoLuatChoDeXuat(manBoLuat);

  if (cuaBoLuat && typeof cuaBoLuat.ap === 'function') {
    datCuaBoLuat(cuaBoLuat);
    datCuaBoLuatChoDeXuat(cuaBoLuat);
    daNoi.push('cửa ghi có giao dịch → màn Bộ luật chung + màn AI đề xuất');
  }
  else thieu.push('cuaBoLuat — màn Bộ luật chung và màn AI đề xuất TỪ CHỐI ghi. Ghi bằng hai lời gọi rời là bỏ mất giao dịch, khoá chống bấm-cùng-lúc, và luật «đề xuất của AI phải có người duyệt»');

  if (typeof dungBanMay === 'function') { datDungBanMay(dungBanMay); daNoi.push('bộ dựng bản-cho-máy → màn soạn kịch bản'); }
  else thieu.push('dungBanMay — màn soạn kịch bản TỪ CHỐI lưu, vì tự dựng bản thứ hai là hứa một prompt khác cái bot nhận');

  if (typeof dayKichBanLenBot === 'function') { datDayLenBot(dayKichBanLenBot); daNoi.push('cửa đưa kịch bản lên LIVE → tiến trình bot'); }
  else thieu.push('dayKichBanLenBot — soạn được kịch bản nhưng KHÔNG đưa lên LIVE được; sửa cột mà không gọi sang bot thì bot vẫn nói y như cũ');

  if (typeof bocPancake === 'function') { datBocPancake(bocPancake); daNoi.push('bộ bóc file kịch bản Pancake'); }
  else thieu.push('bocPancake — không nhập được kịch bản từ file Pancake');

  if (typeof chayNapLai === 'function') { datChayNapLai(chayNapLai); daNoi.push('bộ nạp dữ liệu → nút «Kéo dữ liệu về» ở màn Kết nối'); }
  else thieu.push('chayNapLai — màn Kết nối KHÔNG kéo dữ liệu về được; việc ấy vẫn phải gõ `npm run di-tru` trên máy chủ');

  if (docKhoi && typeof docKhoi.boLuat === 'function') {
    datDocKhoi(docKhoi);
    // CÙNG bộ đọc cho trang của một page — hai màn không được ra hai bản kịch bản.
    datDocKhoiMotPage({ sanPham: docKhoi.sanPham, kichBan: docKhoi.kichBan, sua: docSanPhamSua || null });
    daNoi.push('bốn bộ đọc khối prompt → màn Prompt của page + trang một page');
  }
  else thieu.push('docKhoi — màn «Prompt của page» không dựng được bốn khối, và nó nói rõ đó là lỗi cấu hình chứ không phải "page này không có prompt"');

  // Hiệu lực THẬT của prompt: cờ `V3_RAP_PROMPT_BAT` + hằng `CORE`. Không nối thì màn nói
  // «chưa biết», KHÔNG được đoán là đang bật — xem `kho-prompt.js#datDocHieuLuc`.
  if (typeof docHieuLucPrompt === 'function') {
    datDocHieuLuc(docHieuLucPrompt);
    daNoi.push('bộ đọc hiệu lực prompt (cờ + CORE) → màn Prompt của page');
  } else {
    thieu.push('docHieuLucPrompt — màn «Prompt của page» không biết đường chat đang dùng bốn khối CSDL hay `kb.js` cũ, nên nó nói «chưa biết» thay vì khoe một prompt bot chưa chắc gửi');
  }

  if (khoKhoa && typeof khoKhoa.docKhoa === 'function') { datKhoKhoa(khoKhoa); daNoi.push('kho khoá theo nhà → lớp model · màn Model AI'); }
  else thieu.push('khoKhoa — lớp model CHỈ đọc được khoá từ biến môi trường; khoá riêng của team trong bảng `khoa_nha` không tới được, và màn Model AI không dán khoá được');

  if (typeof docKhoTamPage === 'function') {
    datDocKhoTam(docKhoTamPage);
    daNoi.push('kho tạm page (team kỹ thuật) → lát gán page ↔ team: page quét về/di trú kéo được về team thật');
  }
  else thieu.push('docKhoTamPage — page mới rơi vào team «chưa phân» sẽ nằm đó vĩnh viễn: lược đồ cấm gán thành viên vào team kỹ thuật nên không ai đứng vào để chuyển chúng ra');

  if (typeof chuyenPage === 'function') { datChuyenPage(chuyenPage); daNoi.push('chuyển page ↔ team → màn cấu hình team (lát 4)'); }
  else thieu.push('chuyenPage — lát «gán page ↔ team» hiện MỜ. Không có nó thì gán page vẫn phải chạy psql tay, đúng thứ sóng 0 sinh ra để xoá');

  if (typeof docKetNoiPos === 'function') {
    datDocKetNoiPos(docKetNoiPos);
    datDocKetNoiPosKN(docKetNoiPos);
    daNoi.push('kết nối POS → màn cấu hình team · màn kết nối & token');
  }
  else thieu.push('docKetNoiPos — màn cấu hình team hiện «chưa nối bộ đọc kết nối POS». KHÔNG hiện «không có kết nối», vì hai câu đó dẫn người đọc đi hai hướng khác nhau');

  // Cửa GHI kết nối POS tách khỏi cửa ĐỌC: đọc được mà không ghi được là một trạng thái
  // HỢP LỆ (bản xem thử, máy chưa có khoá mã hoá), và màn phải nói đúng trạng thái đó chứ
  // không ẩn nút một cách câm lặng.
  if (ghiKetNoiPos && typeof ghiKetNoiPos.them === 'function') {
    datGhiKetNoiPos(ghiKetNoiPos);
    daNoi.push('cửa ghi kết nối POS → màn kết nối & token (thêm · sửa · bật/tắt · bỏ)');
  }
  else thieu.push('ghiKetNoiPos — màn Kết nối chỉ ĐỌC kết nối POS; thêm một thị trường hay đổi khoá API vẫn phải gõ SQL trên máy chủ, đúng thứ lượt 15/09 sinh ra để xoá');

  // Kho token Pancake trong CSDL (migration 019). Không nối thì màn Kết nối nói thẳng
  // «máy chủ v3 chưa nối kho token» — lỗi dựng ứng dụng, chứ không hiện một màn rỗng rồi
  // để người ta tưởng hệ thống chưa có token nào.
  if (khoTokenV3 && typeof khoTokenV3.ds === 'function') {
    datKhoTokenV3(khoTokenV3);
    daNoi.push('kho token Pancake (CSDL) → màn kết nối & token (xem · thêm · bỏ, không qua tiến trình bot)');
  }
  else thieu.push('khoTokenV3 — màn Kết nối không xem và không thêm được token; kho token chỉ còn đường sửa tay `.env` trên máy chủ');

  // Kho sản phẩm GỐC. Không nối thì màn Sản phẩm chỉ xem được — mà danh mục gốc là thứ
  // `doc-danh-muc.js` cần để tự nối biến thể của shop mới, nên thiếu nó là mỗi lượt kéo
  // danh mục lại đếm ra một đống «số hiệu chưa có sản phẩm gốc» mà không ai đóng được.
  if (khoSanPhamGoc && typeof khoSanPhamGoc.ds === 'function') {
    datKhoGoc(khoSanPhamGoc);
    daNoi.push('kho sản phẩm gốc → màn Sản phẩm & kho (xem · tạo · sửa · bỏ)');
  }
  else thieu.push('khoSanPhamGoc — không tạo được sản phẩm gốc bằng giao diện; danh mục ấy chỉ vào hệ được bằng SQL tay trên máy chủ');

  // Kéo danh mục POS → `san_pham`/`goi_gia`. Không nối thì bảng sản phẩm của v3 chỉ đầy
  // được bằng bộ di trú, và tồn kho thật của POS không có đường nào vào hệ.
  if (typeof keoDanhMucPos === 'function') {
    datKeoDanhMuc(keoDanhMucPos);
    daNoi.push('kéo danh mục POS → bảng san_pham/goi_gia (màn Kết nối có nút kéo danh mục)');
  }
  else thieu.push('keoDanhMucPos — danh mục và tồn kho POS không có đường vào `san_pham`; bảng sản phẩm v3 chỉ đầy bằng bộ di trú');

  // Quét Pancake → bảng `page`. Không nối thì màn «Page & bot» chỉ có page do bộ di trú
  // đọc `pages.json` của tiến trình bot v1 mang về — tức một máy chỉ chạy v3 không có
  // đường nào đưa page vào hệ.
  if (typeof quetPagePancake === 'function') {
    datQuetPage(quetPagePancake);
    daNoi.push('quét Pancake → bảng page (màn Page & bot có nút kéo danh mục page về)');
  }
  else thieu.push('quetPagePancake — page chỉ vào hệ được bằng bộ di trú đọc `pages.json` của tiến trình bot v1');

  // ── ④ Chắn đăng nhập và chắn vai cho bảng điều phối ──
  // Truyền HÀM DỰNG, không phải cái chắn đã dựng. Bảng điều phối nhận được cả hai kiểu,
  // nhưng truyền hàm dựng mới đúng ý — nó tự chọn vai nào vào được.
  datChanDangNhap(batBuocDangNhap);
  datChanVai(batBuocVaiHTTP);
  // Màn cấu hình team có DANH SÁCH VAI RIÊNG (`quan-tri` + `quan-ly`), nên nó nhận HÀM DỰNG
  // rồi tự gọi với danh sách của mình — truyền cái chắn đã dựng của bảng điều phối vào đây
  // là cho `sale` vào màn cấu hình.
  datChanDangNhapTeam(batBuocDangNhap);
  datChanVaiTeam(batBuocVaiHTTP);
  // Ba màn quản trị, BA danh sách vai KHÁC NHAU — mỗi màn tự gọi hàm dựng với danh sách của
  // mình. `ket-noi` chỉ cho `quan-tri` vì kho token là hạ tầng dùng chung cho cả ba team.
  datChanDangNhapPageBot(batBuocDangNhap);
  datChanVaiPageBot(batBuocVaiHTTP);
  datChanDangNhapKetNoi(batBuocDangNhap);
  datChanVaiKetNoi(batBuocVaiHTTP);
  datChanDangNhapModel(batBuocDangNhap);
  datChanVaiModel(batBuocVaiHTTP);
  datChanDangNhapBoLuat(batBuocDangNhap);
  datChanVaiBoLuat(batBuocVaiHTTP);
  datChanDangNhapKyNang(batBuocDangNhap);
  datChanVaiKyNang(batBuocVaiHTTP);
  datChanDangNhapPrompt(batBuocDangNhap);
  datChanVaiPrompt(batBuocVaiHTTP);
  datChanDangNhapKichBan(batBuocDangNhap);
  datChanVaiKichBan(batBuocVaiHTTP);
  datChanDangNhapSucKhoe(batBuocDangNhap);
  datChanVaiSucKhoe(batBuocVaiHTTP);
  datChanDangNhapNhatKy(batBuocDangNhap);
  datChanVaiNhatKy(batBuocVaiHTTP);
  datChanDangNhapDeXuat(batBuocDangNhap);
  datChanVaiDeXuat(batBuocVaiHTTP);
  datChanDangNhapSanSang(batBuocDangNhap);
  datChanVaiSanSang(batBuocVaiHTTP);
  datChanDangNhapBatDau(batBuocDangNhap);
  datChanVaiBatDau(batBuocVaiHTTP);
  datChanDangNhapTrangChu(batBuocDangNhap);
  datChanVaiTrangChu(batBuocVaiHTTP);
  datChanDangNhapSanPham(batBuocDangNhap);
  datChanVaiSanPham(batBuocVaiHTTP);
  datChanDangNhapAnh(batBuocDangNhap);
  datChanVaiAnh(batBuocVaiHTTP);
  datChanDangNhapLenChay(batBuocDangNhap);
  datChanVaiLenChay(batBuocVaiHTTP);
  datChanDangNhapChiPhi(batBuocDangNhap);
  datChanVaiChiPhi(batBuocVaiHTTP);
  datChanDangNhapBaoCao(batBuocDangNhap);
  datChanVaiBaoCao(batBuocVaiHTTP);
  datChanDangNhapRuiRo(batBuocDangNhap);
  datChanVaiRuiRo(batBuocVaiHTTP);
  datChanDangNhapKhach(batBuocDangNhap);
  datChanVaiKhach(batBuocVaiHTTP);
  datChanDangNhapNguon(batBuocDangNhap);
  datChanVaiNguon(batBuocVaiHTTP);
  datChanDangNhapHieuQua(batBuocDangNhap);
  datChanVaiHieuQua(batBuocVaiHTTP);
  datChanDangNhapLop0(batBuocDangNhap);
  datChanVaiLop0(batBuocVaiHTTP);
  // Trang MỘT page (GD2) — chỉ đọc; hai nút ghi trên đó bấm vào cửa của màn danh sách.
  datChanDangNhapMotPage(batBuocDangNhap);
  datChanVaiMotPage(batBuocVaiHTTP);
  // Màn «Cài đặt team» (GD3) — cũng chỉ đọc; mỗi bước dẫn sang màn có cửa ghi của nó.
  datChanDangNhapCaiDat(batBuocDangNhap);
  datChanVaiCaiDat(batBuocVaiHTTP);
  daNoi.push('chắn đăng nhập + chắn vai → bảng điều phối · cấu hình team · page & bot · kết nối');

  // ── ⑤ Mắc vào Express, ĐÚNG THỨ TỰ ──
  if (express && typeof express.json === 'function') app.use(express.json());
  app.use(lopBoiCanh());          // ① đọc cookie vé → req.boiCanh. PHẢI đứng trước router auth.
  // MÀN ĐẦU TIÊN SAU KHI ĐĂNG NHẬP = màn đầu tiên trên menu CỦA CHÍNH VAI ẤY.
  // Trước 22/09 chỗ này để mặc định `/dieu-phoi` cho mọi vai, mà màn đó chỉ mở cho vai sale
  // và quản trị: vai quản lý và marketer đăng nhập xong là gặp ngay một màn bị từ chối. Lấy
  // thẳng từ `menuCua` thì đích đi theo quyền, và thêm/bớt màn về sau không làm nó lệch lại.
  app.use(taoRouterAuth({
    duongSauKhiVao: (vai) => menuCua(vai)?.[0]?.man?.[0]?.duong || '/dieu-phoi',
  }));                            //   /dang-nhap · /api/dang-nhap · /api/chon-team · /api/toi
  app.use(chanTeamTrenUrl());     //   ?team_id=<team khác> → 403 + ghi nhật ký
  app.use(taoRouterDieuHuong());  //   /chung/dieu-huong.js · /api/dieu-huong (menu chung)
  app.use(taoRouterVanHanh(vanHanh));
  app.use(taoRouterDieuPhoi());   //   /dieu-phoi · /viec/:id · /api/dieu-phoi/*
  app.use(taoRouterCauHinhTeam()); //  /cau-hinh-team · /api/team/*
  app.use(taoRouterPageBot());    //   /page-bot · /api/page-bot/*
  app.use(taoRouterMotPage());    //   /page/:id · /api/page/:id (CHỈ ĐỌC)
  app.use(taoRouterCaiDat());     //   /cai-dat-team · /api/cai-dat-team (CHỈ ĐỌC)
  app.use(taoRouterKetNoi());     //   /ket-noi · /api/ket-noi/*
  app.use(taoRouterModel());      //   /model-ai · /api/model/*
  app.use(taoRouterBoLuat());     //   /bo-luat · /api/bo-luat/*
  app.use(taoRouterKyNang());     //   /ky-nang · /api/ky-nang/*
  app.use(taoRouterPromptPage()); //   /prompt-page · /api/prompt-page/*
  app.use(taoRouterKichBan());    //   /kich-ban · /api/kich-ban/*
  app.use(taoRouterSucKhoe());    //   /suc-khoe · /api/suc-khoe
  app.use(taoRouterNhatKy());     //   /nhat-ky · /api/nhat-ky
  app.use(taoRouterDeXuat());     //   /ai-de-xuat · /api/ai-de-xuat/*
  app.use(taoRouterSanSang());    //   /san-sang · /api/san-sang
  app.use(taoRouterBatDau());     //   /bat-dau · /api/bat-dau
  app.use(taoRouterTrangChu());   //   /trang-chu · /api/trang-chu
  app.use(taoRouterSanPham());    //   /san-pham · /api/san-pham/*
  app.use(taoRouterAnh());        //   /thu-vien-anh · /api/thu-vien-anh
  app.use(taoRouterLenChay());    //   /len-chay · /api/len-chay/*
  app.use(taoRouterChiPhi());     //   /chi-phi · /api/chi-phi
  app.use(taoRouterBaoCao());     //   /bao-cao · /api/bao-cao
  app.use(taoRouterRuiRo());      //   /rui-ro-hoan · /api/rui-ro-hoan
  app.use(taoRouterKhach());      //   /ho-so-khach · /api/ho-so-khach
  app.use(taoRouterNguon());      //   /nguon-khach · /api/nguon-khach
  app.use(taoRouterHieuQua());    //   /hieu-qua · /api/hieu-qua
  app.use(taoRouterLop0());       //   /lop-0-dong · /api/lop-0-dong
  daNoi.push('router: bối cảnh → đăng nhập → chặn xuyên team → điều phối → cấu hình team → page & bot → kết nối → model AI → bộ luật chung → kỹ năng → prompt của page → kịch bản → sức khoẻ → nhật ký → AI đề xuất → cửa kiểm sẵn sàng → trang chủ → sản phẩm & kho → thư viện ảnh → đưa lên chạy → chi phí AI → báo cáo → rủi ro hoàn → hồ sơ khách → nguồn khách → hiệu quả kịch bản → lớp 0 đồng');

  for (const t of thieu) console.warn(`[vai-b] chưa nối: ${t}`);
  return { daNoi, thieu };
}

export default dungPhanB;
