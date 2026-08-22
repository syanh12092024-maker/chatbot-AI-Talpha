// LỚP EXPRESS TỰ GHI NHẬT KÝ.
//
// Vì sao có lớp này thay vì bắt mỗi đường HTTP tự gọi `ghiNhatKy`: có 40 đường thì sớm
// muộn vài đường quên gọi, mà "quên ghi" trong nhật ký nhìn y hệt "không ai làm gì". Lớp
// này ghi mặc định cho MỌI yêu cầu làm thay đổi dữ liệu; đường nào muốn nói rõ mình làm
// gì thì đặt `res.locals.hanhDong` — không đặt thì vẫn có dòng `viec_tu_dong`, không mất dấu.
//
// Nó KHÔNG nằm trên đường trả về của khách:
//   · ghi sau `res.on('finish')` → không cộng thêm mili giây nào vào thời gian phản hồi
//   · chưa đăng nhập thì bỏ qua, không ném → không có chuyện nhật ký làm hỏng một yêu cầu
//     vốn đã trả về 200
// Đổi lại, ở đây KHÔNG ném lại được lỗi ghi (kể cả mã bắt buộc): phản hồi đã gửi xong,
// ném ra chỉ thành `unhandledRejection` làm chết tiến trình. Nên lỗi được kêu ở console và
// gắn vào `res.locals.nhatKyLoi`.
//
// GẮN Ở ĐÂU (người A dựng ứng dụng đọc chỗ này):
//   app.use(express.json());        // trước — để có `req.body` mà ghi vào cột `sau`
//   app.use(lopDangNhap);           // trước — để có `req.boiCanh`
//   app.use(lopNhatKy({ ... }));    // rồi mới tới lớp này
//   app.use('/api', cacDuong);

import { ghiNhatKy, cheNhayCam, HANH_DONG } from './index.js';

/** Chỉ những phương thức làm thay đổi dữ liệu. GET/HEAD/OPTIONS không ghi — xem ghi chú dưới. */
const PHUONG_THUC_GHI = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const BO_QUA_MAC_DINH = [/^\/api\/suc-khoe/];

function trung(duong, mau) {
  if (mau instanceof RegExp) return mau.test(duong);
  const s = String(mau);
  return duong === s || duong.startsWith(s);
}

function duongCua(req) {
  if (req.path) return req.path;
  const u = String(req.originalUrl || req.url || '');
  const i = u.indexOf('?');
  return i === -1 ? u : u.slice(0, i);
}

/**
 * @param {object} [tuyChon]
 * @param {(RegExp|string)[]} [tuyChon.boQua]  đường không cần ghi (mặc định: kiểm tra sức khoẻ)
 * @param {(req:object, res:object) => ({loai?:string, id?:string|number}|null)} [tuyChon.layDoiTuong]
 *        nói cho nhật ký biết yêu cầu này đụng vào cái gì. Trả `{ loai, id }`.
 * @returns middleware Express
 */
export function lopNhatKy({ boQua = BO_QUA_MAC_DINH, layDoiTuong } = {}) {
  const mau = Array.isArray(boQua) ? boQua : [boQua];

  return function lopNhatKyThaoTac(req, res, next) {
    try {
      if (!PHUONG_THUC_GHI.has(String(req.method || '').toUpperCase())) return next();
      const duong = duongCua(req);
      if (mau.some((m) => trung(duong, m))) return next();
      // Chưa đăng nhập → không có bối cảnh → không ghi được (và không được ném: yêu cầu này
      // có thể là chính đường đăng nhập, tự nó sẽ ghi `dang_nhap` / `dang_nhap_that_bai`).
      if (!req.boiCanh) return next();

      // Chụp thân yêu cầu NGAY BÂY GIỜ: nơi xử lý có thể đổi `req.body` trước khi phản hồi
      // xong, mà cái nhật ký cần là thứ khách GỬI LÊN. Chưa có thì đọc lại lúc finish —
      // để lớp này gắn nhầm trước bộ đọc JSON vẫn không mất thân yêu cầu.
      const than = req.body;

      res.on('finish', () => {
        try {
          const ma = Number(res.statusCode);
          if (!(ma >= 200 && ma < 300)) return;                 // chỉ ghi khi việc thật sự xong
          const bc = req.boiCanh;
          if (!bc) return;

          const loc = res.locals || {};
          let doiTuong = null;
          if (typeof layDoiTuong === 'function') {
            try { doiTuong = layDoiTuong(req, res) || null; } catch (e) {
              console.error('[nhat-ky/express] layDoiTuong lỗi:', e && e.message);
            }
          }
          const doiTuongLoai = doiTuong?.loai ?? doiTuong?.doiTuongLoai ?? loc.doiTuongLoai ?? null;
          const doiTuongId = doiTuong?.id ?? doiTuong?.doiTuongId ?? loc.doiTuongId ?? null;

          // `sau` = thân yêu cầu đã lọc chỗ nhạy cảm. `ghiNhatKy` cũng lọc lần nữa —
          // lọc hai lần cho ra đúng một kết quả, và ai đọc file này thấy ngay là đã lọc.
          const thanThat = than === undefined ? req.body : than;
          const sau = thanThat === undefined ? undefined : cheNhayCam(thanThat);

          res.locals = loc;
          loc.nhatKyDaGhi = ghiNhatKy(bc, {
            hanhDong: loc.hanhDong || HANH_DONG.VIEC_TU_DONG,
            doiTuongLoai, doiTuongId,
            truoc: loc.truoc,
            sau,
            ip: req.ip || null,
            ghiChu: loc.ghiChu || `${req.method} ${duong} → ${ma}`,
          }).catch((e) => {
            // Phản hồi đã gửi xong; ném ra đây chỉ thành unhandledRejection.
            loc.nhatKyLoi = e;
            console.error(`[nhat-ky/express] ghi hỏng ${req.method} ${duong}:`, e && e.message);
            return null;
          });
        } catch (e) {
          console.error('[nhat-ky/express] lỗi trong lúc ghi:', e && e.message);
        }
      });
    } catch (e) {
      console.error('[nhat-ky/express] lỗi lúc gắn lớp:', e && e.message);
    }
    return next();
  };
}

// VÌ SAO KHÔNG GHI `GET`: nhật ký này trả lời câu "ai đổi gì lúc nào" (02-KE-HOACH-CODE
// dòng `nhat_ky`). Ghi cả lượt xem thì mỗi lần mở bảng điều phối đẻ ra hàng chục dòng và
// dòng `doi_khoa` chìm nghỉm giữa chúng. Cần nhật ký TRUY CẬP (ai đã xem dữ liệu của khách
// nào) thì đó là bảng khác, việc khác — ghi vào giai đoạn 2, đừng nhét chung vào đây.
