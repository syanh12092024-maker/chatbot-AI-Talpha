// CẤU HÌNH MODEL THEO TEAM + NẠP NÓNG — L1-M4b
//
// Mỗi team đúng MỘT dòng `cau_hinh_model`: ba ô model (chính · dự phòng · nền), hai độ
// ngẫu nhiên, và bộ khoá bốn nhà đã mã hoá.
//
// NẠP NÓNG — tiêu chí nghiệm thu là *đổi model xong thì lượt chat KẾ TIẾP đã đi model mới,
// không khởi động lại*. Cách làm (hợp đồng B–A mục 7):
//   · bộ đệm theo team, hạn 5 giây
//   · `ghiCauHinh` XOÁ ĐỆM của đúng team đó ngay sau khi ghi
//   → cùng một tiến trình: đổi xong là lượt kế tiếp đúng ngay (0 giây)
//   → nhiều tiến trình: chậm nhất 5 giây, vẫn không phải khởi động lại
// Không dùng đệm thì mỗi lượt chat tốn một vòng đọc cơ sở dữ liệu; đệm vô hạn thì phải
// khởi động lại mới đổi được model — 5 giây là chỗ đứng giữa.
//
// KHÔNG `import '../audit/…'`. Nhật ký ghi qua phễu tiêm từ ngoài (spec "File CẤM đụng").
// Ba chỗ tiêm của cả lớp model gom hết vào file này cho dễ tìm — spec chỉ cho phép năm
// file, nên không tách ra file "cổng ra ngoài" riêng.

import {
  batBuocBoiCanh, doiChieuTeam, LoiXuyenTeam, LoiThieuBoiCanh,
} from '../auth/boi-canh.js';
import { layModel, MA_MODEL } from './bang-model.js';
import { MA_NHA } from './nha/index.js';
import { LoiModel, LoiThamSo } from './loi.js';
// CHỈ lấy hai hàm HIỂN THỊ (`tomTatKho`, `duoiKhoa`). Bộ mã hoá của B (`machHoaKho`/
// `giaiMaKho`) KHÔNG dùng nữa — xem khối «KHOÁ NẰM Ở ĐÂU» bên dưới.
import { duoiKhoa } from './kho-khoa.js';

export { LoiThieuBoiCanh, LoiXuyenTeam };

/** Tên bảng. Một chỗ duy nhất. */
export const BANG = 'cau_hinh_model';

/** Hạn bộ đệm cấu hình. Xem ghi chú "NẠP NÓNG" đầu file trước khi đổi số này. */
export const HAN_DEM_MS = 5000;

/**
 * Mã hành động nhật ký của lớp model — CHÉP chuỗi, không import `audit/hanh-dong.js`.
 * Chuỗi phải khớp đúng danh mục bên đó (`doi_model` `doi_khoa` `chuyen_du_phong`
 * `lop_model_hong` `chan_xuyen_team`), nếu không thì màn "Nhật ký thao tác" lọc ra trống.
 */
export const HANH_DONG = Object.freeze({
  DOI_MODEL: 'doi_model',
  DOI_KHOA: 'doi_khoa',
  CHUYEN_DU_PHONG: 'chuyen_du_phong',
  LOP_MODEL_HONG: 'lop_model_hong',
  CHAN_XUYEN_TEAM: 'chan_xuyen_team',
});

/** Mức nặng nhẹ của cảnh báo. */
export const MUC = Object.freeze({ TIN: 'tin', CANH_BAO: 'canh_bao', NANG: 'nang' });

/**
 * MẶC ĐỊNH khi team chưa có dòng cấu hình (spec L1-M4b mục 2).
 * `kimi-k2.6` vì đó là model đang chạy thật ở production.
 * `claude-haiku-4.5` làm dự phòng vì KHÁC NHÀ — hết tiền bên Moonshot không kéo theo bên
 * Anthropic. Dự phòng cùng nhà với chính là dự phòng giả.
 */
export const MAC_DINH = Object.freeze({
  chinh: 'kimi-k2.6',
  duPhong: 'claude-haiku-4.5',
  nen: 'deepseek-v4-flash',
  doNgauNhien: 0.3,
  doNgauNhienNen: 0.1,
});

/** Chưa nối cổng truy vấn, hoặc cấu hình ghi vào không hợp lệ. */
export class LoiCauHinh extends LoiModel {
  constructor(chiTiet) {
    super(`Cấu hình model: ${chiTiet}`);
    this.name = 'LoiCauHinh';
    this.ma = 'cau_hinh_model';
    this.status = 400;
  }
}

// ---- BA CHỖ TIÊM TỪ NGOÀI ----------------------------------------------------------

/** @type {null | ((boiCanh: any) => any)} */
let _taoTruyVan = null;
/** @type {null | ((boiCanh: any, ban: object) => any)} */
let _pheuNhatKy = null;
/** @type {null | ((canhBao: object) => any)} */
let _pheuCanhBao = null;
/** @type {() => number} */
let _dongHo = () => Date.now();

/** Nối cổng truy vấn của người A (hợp đồng mục 3 và mục 8). `fn(boiCanh)` → cổng đã gắn team. */
export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCauHinh('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}

/** Nối `ghiNhatKy` của L0-M4. `fn(boiCanh, ban)` — đúng hình dạng `audit/index.js`. */
export function datPheuNhatKy(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCauHinh('datPheuNhatKy cần một hàm');
  _pheuNhatKy = fn || null;
  return _pheuNhatKy;
}

/**
 * Nối chỗ báo động (Telegram, màn "Sức khoẻ hệ thống"…).
 * `fn({ muc, thongDiep, teamId, nha, maModel })`
 */
export function datPheuCanhBao(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCauHinh('datPheuCanhBao cần một hàm');
  _pheuCanhBao = fn || null;
  return _pheuCanhBao;
}

/** Đồng hồ của bộ đệm — tiêm để test kiểm được hạn 5 giây mà không phải chờ thật. */
/* ══════════════════════ KHOÁ NẰM Ở ĐÂU — đổi 25/08/2026 ══════════════════════
 *
 * TRƯỚC: `cau_hinh_model.khoa_ma_hoa` (jsonb, theo NHÀ) + bộ mã hoá riêng của B
 *        (`v3/src/model/kho-khoa.js`, bao thư `{v,iv,the,mat}`).
 *
 * NAY:   bảng `khoa_nha` của người A (migration 008, `PHIEU-B-Y2` xong), MỘT bản khoá cho
 *        mỗi (team × nhà), bao thư `v1.<iv>.<tag>.<ct>` của `db/khoa.js`.
 *
 * VÌ SAO BỎ BẢN CỦA B, KHÔNG PHẢI VÌ BẢN NÀO ĐẸP HƠN: cột `khoa_nha.khoa_api_ma` có
 * `CHECK (... LIKE 'v1.%')` ở TẦNG CSDL. Bao thư jsonb của B ghi xuống là Postgres từ chối
 * ngay. Hai bộ mã hoá cho cùng một cột thì bộ nào không khớp `CHECK` là bộ không tồn tại —
 * giữ lại chỉ để đẻ ra một đường ghi luôn đỏ.
 *
 * Cổng khoá TIÊM TỪ NGOÀI, không import thẳng `db/khoa.js`: lớp model phải chạy được trong
 * test mà không cần Postgres, và `khoa_nha` cố ý nằm NGOÀI tầng truy vấn chung (nó chứa bí
 * mật) nên nó không đi qua `congTruyVan` được.
 *
 * ⛔ `docKhoa` CHỈ gọi cho những nhà THẬT SỰ đang dùng (chính · dự phòng · nền) — tối đa ba,
 *    thường là hai. Kéo cả bốn nhà ra mỗi lượt đọc là mở rộng bề mặt rò rỉ mà chẳng được gì.
 */

let _khoKhoa = null;

/**
 * Nối kho khoá của người A.
 * @param {{coKhoa:(teamId,nha)=>Promise<boolean>, docKhoa:(teamId,nha)=>Promise<string|null>,
 *          ghiKhoa:(teamId,nha,khoaApi)=>Promise<any>}} bo
 */
export function datKhoKhoa(bo) {
  if (bo == null) { _khoKhoa = null; return null; }
  for (const ten of ['coKhoa', 'docKhoa', 'ghiKhoa']) {
    if (typeof bo[ten] !== 'function') {
      throw new LoiCauHinh(`datKhoKhoa: thiếu hàm \`${ten}\`. Cần đủ ba: coKhoa · docKhoa · ghiKhoa.`);
    }
  }
  _khoKhoa = bo;
  return _khoKhoa;
}

export const daNoiKhoKhoa = () => _khoKhoa != null;

export function datDongHoCauHinh(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCauHinh('datDongHoCauHinh cần một hàm');
  _dongHo = fn || (() => Date.now());
  return _dongHo;
}

/**
 * Ghi nhật ký qua phễu. Chưa tiêm → kêu ở console chứ không ném: mất một dòng nhật ký
 * không được làm chết lượt chat của khách. Phễu ném → nuốt, cũng vì lý do đó.
 */
export async function ghiNhatKyModel(boiCanh, ban) {
  if (!_pheuNhatKy) {
    console.warn(`[model] chưa nối nhật ký — bỏ dòng "${ban && ban.hanhDong}". Gọi datPheuNhatKy() lúc dựng ứng dụng.`);
    return null;
  }
  try {
    return await _pheuNhatKy(boiCanh, ban);
  } catch (e) {
    console.error('[model] ghi nhật ký hỏng:', e && e.message);
    return null;
  }
}

/** Báo động qua phễu. Chưa tiêm → in ra console, vì im lặng là đúng cái sự cố 06/08. */
export async function canhBao(ban) {
  const { muc = MUC.CANH_BAO, thongDiep = '' } = ban || {};
  if (!_pheuCanhBao) {
    const in_ = muc === MUC.TIN ? console.warn : console.error;
    in_(`[model] CẢNH BÁO (${muc}) — chưa nối phễu cảnh báo: ${thongDiep}`);
    return null;
  }
  try {
    return await _pheuCanhBao({ muc, ...ban });
  } catch (e) {
    console.error('[model] phễu cảnh báo hỏng:', e && e.message);
    return null;
  }
}

// ---- BỘ ĐỆM ------------------------------------------------------------------------

/** @type {Map<string, {luc:number, cauHinh:object}>} */
const _dem = new Map();

/**
 * Xoá đệm của một team (bỏ trống = xoá hết).
 * Xuất ra ngoài vì hai chỗ cần: test, và tiến trình khác muốn ép nạp lại ngay thay vì chờ
 * hết 5 giây.
 */
export function xoaDem(teamId) {
  if (teamId == null) { _dem.clear(); return; }
  _dem.delete(String(teamId));
}

/** Số team đang nằm trong đệm — cho màn "Sức khoẻ hệ thống" và cho test. */
export function coTrongDem(teamId) {
  const o = _dem.get(String(teamId));
  return !!o && _dongHo() - o.luc < HAN_DEM_MS;
}

// ---- ĐỌC ---------------------------------------------------------------------------

const tenBienKhoaNha = (nha) => `V3_KHOA_${String(nha).toUpperCase()}`;

/**
 * Khoá lấy từ biến môi trường khi team chưa dán khoá riêng: `V3_KHOA_KIMI`,
 * `V3_KHOA_CLAUDE`, `V3_KHOA_OPENAI`, `V3_KHOA_DEEPSEEK`.
 *
 * Vì sao có: giai đoạn 1 cả nhà dùng chung một tài khoản Moonshot, chưa ai dán khoá vào
 * màn hình. Không có đường này thì cấu hình mặc định không gọi được lời nào.
 * Khoá riêng của team LUÔN thắng khoá env.
 */
function khoaTuEnv() {
  const ra = {};
  for (const nha of MA_NHA) {
    const v = process.env[tenBienKhoaNha(nha)];
    if (v != null && String(v).trim() !== '') ra[nha] = String(v).trim();
  }
  return ra;
}

function oModel(ma) {
  const dong = layModel(ma);            // mã lạ → LoiModelLa
  return Object.freeze({ ma: dong.ma, nha: dong.nha });
}

/** Dựng cấu hình mặc định — dùng khi team chưa có dòng nào trong bảng. */
export function cauHinhMacDinh(teamId) {
  return {
    teamId: String(teamId),
    macDinh: true,
    chinh: oModel(MAC_DINH.chinh),
    duPhong: oModel(MAC_DINH.duPhong),
    nen: oModel(MAC_DINH.nen),
    doNgauNhien: MAC_DINH.doNgauNhien,
    doNgauNhienNen: MAC_DINH.doNgauNhienNen,
    khoa: khoaTuEnv(),
    khoaRieng: {},        // nhà nào có khoá RIÊNG của team (không kể khoá env)
    suaLuc: null,
  };
}

/** Ba vai trò của `cau_hinh_model` — `CHECK (vai_tro IN (...))` của lược đồ thật. */
export const VAI_TRO = Object.freeze({ CHINH: 'chinh', DU_PHONG: 'du_phong', NEN: 'nen' });

/** vai_tro trong CSDL ↔ tên trường của lớp này. Một chỗ duy nhất, hai chiều. */
const VAI_TRO_SANG_TRUONG = Object.freeze({ chinh: 'chinh', du_phong: 'duPhong', nen: 'nen' });
const TRUONG_SANG_VAI_TRO = Object.freeze({ chinh: 'chinh', duPhong: 'du_phong', nen: 'nen' });

/**
 * BA DÒNG trong bảng → MỘT cấu hình.
 *
 * Lược đồ thật là `UNIQUE (team_id, vai_tro)` với `vai_tro ∈ chinh|du_phong|nen` — tức là
 * mỗi team BA DÒNG, không phải một. Bản trước của file này viết theo hình một-dòng
 * (`chinh_ma_model`, `du_phong_ma_model`…) vì nó viết lúc chưa có lược đồ. Đây không phải
 * đổi tên cột mà là đổi hình dạng dữ liệu, nên phải gộp ở đây.
 *
 * Dòng thiếu → rơi về mặc định của ô đó, KHÔNG ném: một team mới cấu hình ô `chinh` mà chưa
 * đụng ô `nen` là chuyện bình thường, không phải dữ liệu hỏng.
 */
function tuBaDong(teamId, dong) {
  const theoVai = new Map();
  for (const r of dong || []) {
    if (r && r.vai_tro && VAI_TRO_SANG_TRUONG[r.vai_tro]) theoVai.set(r.vai_tro, r);
  }
  const so = (x, mac) => (Number.isFinite(Number(x)) ? Number(x) : mac);
  const oCua = (vaiTro, macDinhMa) => {
    const r = theoVai.get(vaiTro);
    return oModel((r && r.ma_model) || macDinhMa);
  };
  const rChinh = theoVai.get(VAI_TRO.CHINH);
  const rNen = theoVai.get(VAI_TRO.NEN);
  // `sua_luc` mới nhất trong ba dòng — màn hình hỏi "sửa lần cuối lúc nào", không hỏi
  // "dòng `chinh` sửa lúc nào".
  const suaLuc = (dong || []).map((r) => r && r.sua_luc).filter(Boolean).sort().pop() || null;

  return {
    teamId: String(teamId),
    macDinh: theoVai.size === 0,
    soDong: theoVai.size,
    id: rChinh ? rChinh.id ?? null : null,
    idTheoVai: Object.fromEntries([...theoVai].map(([v, r]) => [v, r.id ?? null])),
    chinh: oCua(VAI_TRO.CHINH, MAC_DINH.chinh),
    duPhong: oCua(VAI_TRO.DU_PHONG, MAC_DINH.duPhong),
    nen: oCua(VAI_TRO.NEN, MAC_DINH.nen),
    // `do_ngau_nhien` nằm TRÊN TỪNG DÒNG ở lược đồ thật, nên `doNgauNhienNen` của bản cũ
    // chính là `do_ngau_nhien` của dòng `vai_tro='nen'` — không còn cột thứ hai.
    doNgauNhien: so(rChinh && rChinh.do_ngau_nhien, MAC_DINH.doNgauNhien),
    doNgauNhienNen: so(rNen && rNen.do_ngau_nhien, MAC_DINH.doNgauNhienNen),
    bat: Object.fromEntries([...theoVai].map(([v, r]) => [v, r.bat !== false])),
    suaLuc,
  };
}

function congTruyVan(bc) {
  if (!_taoTruyVan) return null;
  return _taoTruyVan(bc);
}

const _daKeuChuaNoi = new Set();

/**
 * Đối chiếu team mà nơi gọi TỰ TRUYỀN TAY với team trên vé. Lệch → ghi nhật ký rồi ném.
 * Đây là lớp chặn thứ hai (hợp đồng mục 3 điều 2); lớp thứ nhất là cổng truy vấn của A.
 * Một lớp thì chỉ cần một chỗ quên là thủng.
 */
async function chanXuyenTeam(bc, teamXin) {
  if (teamXin == null || teamXin === '') return;
  try {
    doiChieuTeam(bc, teamXin);
  } catch (e) {
    if (e instanceof LoiXuyenTeam) {
      await ghiNhatKyModel(bc, {
        hanhDong: HANH_DONG.CHAN_XUYEN_TEAM,
        doiTuongLoai: BANG,
        sau: { team_xin: String(teamXin), team_cua: bc.teamId },
        ghiChu: e.message,
      });
    }
    throw e;
  }
}

/**
 * Đọc cấu hình model của team đang đăng nhập. Khoá ĐÃ GIẢI MÃ — đây là cấu hình để GỌI,
 * không phải cấu hình để hiện lên màn hình (màn hình dùng `tomTatCauHinh`).
 *
 * @param {object} boiCanh BẮT BUỘC — thiếu là ném `LoiThieuBoiCanh`, không trả rỗng
 * @param {{team_id?:string, boQuaDem?:boolean}} [bo]
 */
export async function docCauHinh(boiCanh, bo = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  await chanXuyenTeam(bc, bo.team_id ?? bo.teamId);

  const khoaDem = bc.teamId;
  if (!bo.boQuaDem) {
    const o = _dem.get(khoaDem);
    if (o && _dongHo() - o.luc < HAN_DEM_MS) return o.cauHinh;
  }

  const db = congTruyVan(bc);
  let cauHinh;
  if (!db) {
    // Hợp đồng mục 8: chưa nối thì vẫn chạy được, nhưng phải KÊU LÊN, không im lặng chạy sai.
    if (!_daKeuChuaNoi.has(bc.teamId)) {
      _daKeuChuaNoi.add(bc.teamId);
      console.warn(
        `[model] chưa nối cổng truy vấn — team ${bc.teamId} chạy bằng cấu hình MẶC ĐỊNH `
        + `(${MAC_DINH.chinh} → ${MAC_DINH.duPhong}). Gọi datTaoTruyVan() lúc dựng ứng dụng.`,
      );
    }
    cauHinh = cauHinhMacDinh(bc.teamId);
  } else {
    const dieuKien = {};
    // Đẩy tiếp xuống cổng để cổng của người A đối chiếu lần thứ hai.
    const teamXin = bo.team_id ?? bo.teamId;
    if (teamXin != null && teamXin !== '') dieuKien.team_id = teamXin;
    // Đọc hỏng thì PHẢI ném. Lặng lẽ lùi về mặc định là đổi model của cả team mà không ai
    // biết — đúng kiểu hỏng mà cả spec này sinh ra để bịt.
    // BA dòng, không phải một (`UNIQUE (team_id, vai_tro)`). Đọc hỏng thì PHẢI ném —
    // lặng lẽ lùi về mặc định là đổi model của cả team mà không ai biết.
    const dong = await db.chon(BANG, dieuKien);
    cauHinh = tuBaDong(bc.teamId, dong);
    if (cauHinh.macDinh) cauHinh = { ...cauHinhMacDinh(bc.teamId), soDong: 0, idTheoVai: {}, bat: {} };
    else cauHinh = await datKhoaVao(cauHinh);
  }

  _dem.set(khoaDem, { luc: _dongHo(), cauHinh });
  return cauHinh;
}

/**
 * Nạp khoá vào cấu hình — CHỈ những nhà thật sự đang dùng (chính · dự phòng · nền).
 * Chưa nối kho khoá → chạy bằng khoá env và KÊU MỘT LẦN, không im lặng chạy sai.
 */
async function datKhoaVao(c) {
  const env = khoaTuEnv();
  if (!_khoKhoa) {
    if (!_daKeuChuaKhoa.has(c.teamId)) {
      _daKeuChuaKhoa.add(c.teamId);
      console.warn(
        `[model] chưa nối kho khoá (datKhoKhoa) — team ${c.teamId} chạy bằng khoá từ biến `
        + 'môi trường. Khoá riêng của team trong bảng `khoa_nha` KHÔNG được đọc.',
      );
    }
    return { ...c, khoa: env, khoaRieng: {} };
  }
  const nhaDung = [...new Set([c.chinh.nha, c.duPhong.nha, c.nen.nha])];
  const khoa = { ...env };
  const khoaRieng = {};
  for (const nha of nhaDung) {
    const k = await _khoKhoa.docKhoa(c.teamId, nha);
    if (k) { khoa[nha] = k; khoaRieng[nha] = true; }   // khoá riêng của team LUÔN thắng env
  }
  return { ...c, khoa, khoaRieng };
}

const _daKeuChuaKhoa = new Set();

/**
 * Cấu hình CHO MÀN HÌNH: khoá chỉ còn `{ daCo, duoi }`, không có một ký tự khoá thật nào.
 */
export async function tomTatCauHinh(boiCanh, bo = {}) {
  const c = await docCauHinh(boiCanh, bo);
  const env = khoaTuEnv();

  // Hỏi ĐỦ BỐN NHÀ — kể cả nhà team chưa chọn model. Màn hình phải cho dán khoá TRƯỚC rồi
  // mới chọn model của nhà đó; chỉ hiện nhà đang dùng thì người ta không có đường vào.
  //
  // Dùng `coKhoa` chứ KHÔNG dùng `docKhoa`: câu hỏi «nhà này có khoá chưa» là câu hỏi định
  // tuyến, không phải câu hỏi bí mật. Kéo bản mã ra khỏi CSDL chỉ để đếm nó là mở rộng bề
  // mặt rò rỉ mà chẳng được gì (cùng lý lẽ với `db/khoa.js#coKhoaNha`).
  const khoa = {};
  for (const nha of MA_NHA) {
    const rieng = _khoKhoa ? await _khoKhoa.coKhoa(c.teamId, nha) : false;
    if (rieng) {
      // Khoá riêng: KHÔNG hiện đuôi. Muốn biết đuôi thì phải giải mã, mà giải mã chỉ để
      // trang trí một dòng chữ là đúng thứ `coKhoaNha` sinh ra để tránh.
      khoa[nha] = { daCo: true, duoi: null, tuEnv: false };
    } else if (env[nha]) {
      // Khoá env cũng phải hiện, nếu không màn hình báo "chưa có khoá" trong khi bot vẫn
      // đang gọi được — hai thứ ngược nhau là chỗ mất cả buổi để hiểu.
      khoa[nha] = { daCo: true, duoi: duoiKhoa(env[nha]) || null, tuEnv: true };
    } else {
      khoa[nha] = { daCo: false, duoi: null, tuEnv: false };
    }
  }
  return {
    teamId: c.teamId,
    macDinh: c.macDinh,
    chinh: c.chinh,
    duPhong: c.duPhong,
    nen: c.nen,
    doNgauNhien: c.doNgauNhien,
    doNgauNhienNen: c.doNgauNhienNen,
    khoa,
    suaLuc: c.suaLuc,
    soDong: c.soDong ?? 0,
    danhSachModel: MA_MODEL,
    // Cảnh báo suy từ cấu hình — suy Ở ĐÂY để có bài test khoá, không suy trong HTML.
    canhBao: canhBaoCauHinh({ ...c, khoa }),
  };
}

/**
 * Bốn cảnh báo của màn «Model AI & khoá».
 *
 * Cái thứ nhất là bài học đắt nhất: **06/08/2026 tài khoản nhà chính hết tiền, bot đứng im
 * ba tiếng mà không ai biết**; và 23/08 lặp lại — **731 phút**. Nên màn này phải nói được
 * «sắp hỏng» TRƯỚC khi hỏng, chứ không phải báo cáo sau khi đã hỏng.
 */
export function canhBaoCauHinh(c) {
  const ra = [];
  const k = c.khoa || {};
  const coKhoa = (nha) => !!(k[nha] && k[nha].daCo);

  if (c.macDinh) {
    ra.push({
      ma: 'chua_cau_hinh', muc: 'do',
      chu: 'Team này chưa cấu hình model — đang chạy bằng bộ mặc định '
        + `(${MAC_DINH.chinh} → ${MAC_DINH.duPhong}). Chọn model rồi lưu để chốt lại.`,
    });
  }
  if (!coKhoa(c.chinh.nha)) {
    ra.push({
      ma: 'chinh_khong_khoa', muc: 'do',
      chu: `Model chính "${c.chinh.ma}" là của nhà "${c.chinh.nha}" mà nhà đó CHƯA có khoá — `
        + 'mọi lượt chat sẽ rơi thẳng sang dự phòng, hoặc chết hẳn nếu dự phòng cũng thiếu.',
    });
  }
  if (!coKhoa(c.duPhong.nha)) {
    ra.push({
      ma: 'du_phong_khong_khoa', muc: 'do',
      chu: `Dự phòng "${c.duPhong.ma}" (nhà "${c.duPhong.nha}") chưa có khoá — nhà chính hết `
        + 'tiền là bot đứng im. Đúng cảnh 06/08/2026 (3 tiếng) và 23/08 (731 phút).',
    });
  }
  if (c.chinh.nha === c.duPhong.nha) {
    ra.push({
      ma: 'du_phong_cung_nha', muc: 'do',
      chu: `Dự phòng cùng nhà "${c.duPhong.nha}" với model chính — hết tiền một tài khoản là `
        + 'chết cả hai. Đây là dự phòng GIẢ.',
    });
  }
  const thieu = MA_NHA.filter((n) => !coKhoa(n));
  if (thieu.length && thieu.length < MA_NHA.length) {
    ra.push({
      ma: 'con_nha_chua_khoa', muc: 'tin',
      chu: `Chưa dán khoá cho ${thieu.length}/${MA_NHA.length} nhà (${thieu.join(', ')}) — `
        + 'chưa có khoá thì không chọn được model của nhà đó.',
    });
  }
  return ra;
}

// ---- GHI ---------------------------------------------------------------------------

function batBuocDoNgauNhien(ten, gia) {
  const n = Number(gia);
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    throw new LoiThamSo(`${ten} phải nằm trong [0,1] — nhận "${gia}".`);
  }
  return n;
}

const layMa = (x) => (x && typeof x === 'object' ? x.ma : x);

/**
 * TÊN TRƯỜNG `thayDoi` NHẬN ĐƯỢC → tên nội bộ.
 *
 * Nhận CẢ HAI lối gọi tên: kiểu nội bộ (`duPhong`) và kiểu CỘT trong hợp đồng mục 4
 * (`du_phong_ma_model`). Màn hình và người A đọc tên cột từ hợp đồng rồi gửi thẳng bản ghi
 * xuống — chỉ nhận một lối là mọi lời gọi kiểu kia rơi vào im lặng.
 */
const TEN_TRUONG = new Map([
  ['chinh', 'chinh'], ['chinh_ma_model', 'chinh'],
  ['duPhong', 'duPhong'], ['du_phong', 'duPhong'], ['du_phong_ma_model', 'duPhong'],
  ['nen', 'nen'], ['nen_ma_model', 'nen'],
  ['doNgauNhien', 'doNgauNhien'], ['do_ngau_nhien', 'doNgauNhien'],
  ['doNgauNhienNen', 'doNgauNhienNen'], ['do_ngau_nhien_nen', 'doNgauNhienNen'],
  ['khoa', 'khoa'],
]);

/** Năm trường quyết định "cấu hình chạy model" — đụng vào cái nào cũng là `doi_model`. */
const TRUONG_MODEL = Object.freeze(['chinh', 'duPhong', 'nen', 'doNgauNhien', 'doNgauNhienNen']);

/** Cột `nha` do BẢNG MODEL quyết định. Nơi gọi gửi kèm thì đối chiếu, lệch là chặn. */
const TEN_NHA = new Map([
  ['chinh_nha', 'chinh'], ['du_phong_nha', 'duPhong'], ['nen_nha', 'nen'],
]);

/** Máy chủ tự đặt. Nhận để màn hình gửi nguyên bản ghi về được, nhưng không lấy giá trị. */
const TEN_MAY_CHU_DAT = new Set(['id', 'team_id', 'teamId', 'sua_luc', 'macDinh', 'khoaGoc', 'khoaRieng', 'soDong', 'idTheoVai', 'bat', 'danhSachModel',
  'canhBao', 'suaLuc', 'vai_tro', 'nha_cung_cap', 'ma_model']);

/**
 * Bóc `thayDoi` ra tên nội bộ.
 *
 * TRƯỜNG LẠ THÌ NÉM, KHÔNG BỎ QUA LẶNG LẼ. Đây là bài học trả giá thật: gõ
 * `chinh_ma_model` trong khi hàm chỉ nhận `chinh` thì lời gọi vẫn "thành công", bản ghi
 * không đổi một chữ, và nhật ký không có dòng nào — màn hình báo đã lưu, tới tháng sau
 * nhìn hoá đơn mới biết là chưa lưu.
 */
function docThayDoi(thayDoi) {
  const xin = {};
  const nhaXin = {};
  for (const [k, v] of Object.entries(thayDoi || {})) {
    if (TEN_MAY_CHU_DAT.has(k)) continue;
    if (TEN_NHA.has(k)) { if (v != null) nhaXin[TEN_NHA.get(k)] = String(v); continue; }
    const ten = TEN_TRUONG.get(k);
    if (!ten) {
      throw new LoiCauHinh(
        `trường lạ "${k}" — không ghi gì cả để khỏi báo thành công một việc chưa làm. `
        + `Nhận: ${[...TEN_TRUONG.keys()].join(', ')}.`,
      );
    }
    if (v !== undefined) xin[ten] = v;
  }
  return { xin, nhaXin };
}

/**
 * Ghi cấu hình model của team.
 *
 * @param {object} boiCanh BẮT BUỘC
 * @param {{chinh?:string|{ma:string}, duPhong?:string|{ma:string}, nen?:string|{ma:string},
 *          doNgauNhien?:number, doNgauNhienNen?:number,
 *          khoa?:Record<string,string|null>, team_id?:string}} thayDoi
 *   Nhận CẢ tên cột của hợp đồng mục 4: `chinh_ma_model` `du_phong_ma_model`
 *   `nen_ma_model` `do_ngau_nhien` `do_ngau_nhien_nen`. Trường lạ → NÉM, không bỏ qua.
 * @returns {Promise<object>} cấu hình mới (đã giải mã khoá), đệm đã xoá
 *
 * @throws {LoiThieuBoiCanh} thiếu bối cảnh
 * @throws {LoiXuyenTeam}    truyền tay `team_id` của team khác
 * @throws {LoiModelLa}      mã model không có trong `bang-model.js`
 * @throws {LoiCauHinh}      dự phòng CÙNG NHÀ với model chính, trường lạ, cột `nha` gửi
 *                             kèm mà lệch, hoặc chưa nối cổng truy vấn
 */
export async function ghiCauHinh(boiCanh, thayDoi = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  await chanXuyenTeam(bc, thayDoi.team_id ?? thayDoi.teamId);

  const db = congTruyVan(bc);
  if (!db) throw new LoiCauHinh('chưa nối cổng truy vấn — gọi datTaoTruyVan() lúc dựng ứng dụng (hợp đồng mục 8)');

  // Đọc thẳng từ bảng, KHÔNG qua đệm: ghi đè lên một bản đệm cũ 4 giây là ghi đè mất thay
  // đổi mà tiến trình khác vừa lưu.
  const truoc = await docCauHinh(bc, { boQuaDem: true });

  const { xin, nhaXin } = docThayDoi(thayDoi);
  // Nơi gọi CÓ NÊU ô model nào không — khác hẳn "giá trị có đổi không". Tạo mới dòng cấu
  // hình mà đặt đúng bằng mặc định vẫn là một lần đặt cấu hình, vẫn phải để lại dấu vết.
  const coNeuModel = TRUONG_MODEL.some((k) => k in xin);

  const chinh = xin.chinh != null ? oModel(layMa(xin.chinh)) : truoc.chinh;
  const duPhong = xin.duPhong != null ? oModel(layMa(xin.duPhong)) : truoc.duPhong;
  const nen = xin.nen != null ? oModel(layMa(xin.nen)) : truoc.nen;

  // Cột `nha` suy từ bảng model. Gửi kèm mà lệch thì chặn, đừng lặng lẽ ghi đè:
  // gửi `chinh_ma_model:'kimi-k2.6'` kèm `chinh_nha:'claude'` là nơi gọi đang hiểu sai.
  for (const [ten, o] of [['chinh', chinh], ['duPhong', duPhong], ['nen', nen]]) {
    if (nhaXin[ten] != null && nhaXin[ten] !== o.nha) {
      throw new LoiCauHinh(
        `model "${o.ma}" là của nhà "${o.nha}", không phải "${nhaXin[ten]}". `
        + 'Cột `nha` suy từ bảng model, nơi gọi không đặt được.',
      );
    }
  }

  // QUY TẮC NGHIỆP VỤ, không phải sở thích: dự phòng cùng nhà với chính là dự phòng GIẢ.
  // Ngày 06/08/2026 tài khoản nhà chính hết tiền — đổi sang một model khác CÙNG NHÀ thì
  // vẫn hết tiền, bot vẫn đứng im, chỉ khác là hoá đơn có thêm một dòng.
  if (chinh.nha === duPhong.nha) {
    throw new LoiCauHinh(
      `dự phòng "${duPhong.ma}" cùng nhà "${duPhong.nha}" với model chính "${chinh.ma}". `
      + 'Hết tiền hoặc khoá hỏng là hỏng cả hai — chọn model của nhà khác.',
    );
  }

  const doNgauNhien = xin.doNgauNhien != null
    ? batBuocDoNgauNhien('do_ngau_nhien', xin.doNgauNhien) : truoc.doNgauNhien;
  const doNgauNhienNen = xin.doNgauNhienNen != null
    ? batBuocDoNgauNhien('do_ngau_nhien_nen', xin.doNgauNhienNen) : truoc.doNgauNhienNen;

  // ── KHOÁ: đi sang bảng `khoa_nha` của người A, KHÔNG vào `cau_hinh_model` nữa ──
  // Từ migration 008 `cau_hinh_model` không còn cột khoá. Ghi khoá MỘT LẦN cho mỗi nhà là
  // mọi ô dùng nhà đó đọc ra khoá mới — đúng cái `PHIEU-B-Y2` xin và A đã làm.
  const doiKhoa = [];
  if (xin.khoa && typeof xin.khoa === 'object') {
    if (!_khoKhoa) {
      throw new LoiCauHinh(
        'chưa nối kho khoá (`datKhoKhoa`) — từ chối ghi khoá. Ghi hụt khoá là cách rẻ nhất '
        + 'để làm một team câm mà không ai biết.',
      );
    }
    for (const [nha, giaTri] of Object.entries(xin.khoa)) {
      if (!MA_NHA.includes(nha)) throw new LoiCauHinh(`nhà lạ: "${nha}" (có: ${MA_NHA.join(', ')}).`);
      // ⛔ CHẶN HÌNH HIỂN THỊ. `tomTatCauHinh` trả `khoa[nha] = { daCo, duoi, tuEnv }` cho
      //    màn hình. Màn hình gửi nguyên tóm tắt đó lên là chuyện rất dễ xảy ra — và không
      //    chặn thì `String({daCo:true})` ra `"[object Object]"`, ghi thẳng vào kho khoá
      //    làm khoá API. Bot chết mà màn hình báo "đã lưu khoá". Ném to ở đây.
      if (giaTri != null && typeof giaTri === 'object') {
        throw new LoiCauHinh(
          `khoá của nhà "${nha}" phải là CHUỖI, nhận một đối tượng. Có phải nơi gọi gửi lại `
          + 'nguyên `khoa` của `tomTatCauHinh` không? Đó là hình HIỂN THỊ ({daCo, duoi}), '
          + 'không phải khoá — gửi chuỗi khoá thật, hoặc bỏ hẳn trường `khoa` để giữ nguyên.',
        );
      }
      const v = giaTri == null ? null : String(giaTri).trim();
      // Chuỗi RỖNG ≠ null. `null` là "giữ nguyên" (hợp đồng `ghiKhoaNha` của A); rỗng là
      // nơi gọi gửi một ô input trống — không phải ý định xoá khoá, nên bỏ qua chứ đừng ghi.
      if (v === '' || v == null) continue;
      await _khoKhoa.ghiKhoa(bc.teamId, nha, v);
      doiKhoa.push(nha);
    }
  }

  // ── BA DÒNG, nâng-hoặc-chèn TỪNG VAI TRÒ (`UNIQUE (team_id, vai_tro)`) ──
  // Không có `ON CONFLICT` ở tầng truy vấn của A, và `db.sua` đòi điều kiện `id`. Nên đọc
  // dòng đang có rồi chọn sửa hay chèn — ba lượt, mỗi lượt một vai trò.
  const suaLuc = new Date(_dongHo()).toISOString();
  const dangCoDs = await db.chon(BANG, {});
  const theoVai = new Map((dangCoDs || []).filter((r) => r && r.vai_tro).map((r) => [r.vai_tro, r]));
  const dangCo = theoVai.get(VAI_TRO.CHINH) || null;

  const bo = [
    [VAI_TRO.CHINH, chinh, doNgauNhien],
    [VAI_TRO.DU_PHONG, duPhong, null],
    [VAI_TRO.NEN, nen, doNgauNhienNen],
  ];
  for (const [vaiTro, o, dnn] of bo) {
    const banGhi = {
      // KHÔNG đặt team_id — cổng truy vấn tự chèn (hợp đồng mục 3 điều 1).
      vai_tro: vaiTro,
      nha_cung_cap: o.nha,
      ma_model: o.ma,
      do_ngau_nhien: dnn,
      sua_luc: suaLuc,
    };
    const cu = theoVai.get(vaiTro);
    if (cu) await db.sua(BANG, { id: cu.id }, banGhi);
    else await db.them(BANG, banGhi);
  }

  // NẠP NÓNG — xoá đệm NGAY sau khi ghi. Đây là cả bí quyết của tiêu chí "không khởi
  // động lại": lượt chat kế tiếp không thấy đệm nên đọc lại bảng và thấy model mới.
  xoaDem(bc.teamId);

  // GHI `doi_model` KHI NÀO — đổi model là ĐỔI TIỀN: từ `kimi-k2.6` sang `claude-opus-5`
  // là 4,81 lần chi phí mỗi đơn (01-QUYET-DINH.md mục 7). Không có dấu vết thì tháng sau
  // hoá đơn nhảy vọt mà không ai trả lời được ai đổi, lúc nào, từ gì sang gì.
  //   · đổi bất kỳ ô nào trong ba ô model               → ghi
  //   · đổi độ ngẫu nhiên (cùng nhóm "cấu hình chạy")   → ghi
  //   · TẠO MỚI dòng cấu hình mà có nêu ô model         → ghi, kể cả khi đặt đúng bằng mặc định
  //   · không có gì đổi thật                            → KHÔNG ghi, đừng đẻ nhật ký rác
  const doiModel = (!dangCo && coNeuModel)
    || chinh.ma !== truoc.chinh.ma
    || duPhong.ma !== truoc.duPhong.ma
    || nen.ma !== truoc.nen.ma
    || doNgauNhien !== truoc.doNgauNhien
    || doNgauNhienNen !== truoc.doNgauNhienNen;

  // Hai dòng nhật ký khi đổi cả hai thứ: đổi model và đổi khoá là hai sự việc khác nhau,
  // và màn "Nhật ký thao tác" lọc theo `hanh_dong` — gộp một dòng là mất một trong hai.
  if (doiModel) {
    await ghiNhatKyModel(bc, {
      hanhDong: HANH_DONG.DOI_MODEL,
      doiTuongLoai: BANG,
      doiTuongId: dangCo ? dangCo.id : null,
      truoc: tomTatDeGhi(truoc),
      sau: tomTatDeGhi({ ...truoc, chinh, duPhong, nen, doNgauNhien, doNgauNhienNen }),
    });
  }
  if (doiKhoa.length) {
    await ghiNhatKyModel(bc, {
      hanhDong: HANH_DONG.DOI_KHOA,
      doiTuongLoai: BANG,
      doiTuongId: dangCo ? dangCo.id : null,
      // CHỈ đuôi bốn ký tự. `nhat_ky` là bảng KHÔNG SỬA ĐƯỢC: lỡ ghi khoá thật vào là nằm
      // đó vĩnh viễn.
      // ⛔ CHỈ TÊN NHÀ. `nhat_ky` là bảng KHÔNG SỬA ĐƯỢC: lỡ ghi khoá thật vào là nằm đó
      //    vĩnh viễn, và cả bốn đuôi khoá gộp lại cũng đã là thông tin thừa.
      truoc: null,
      sau: { nha_da_doi: doiKhoa },
      ghiChu: `đổi khoá nhà: ${doiKhoa.join(', ')}`,
    });
  }

  return docCauHinh(bc);
}

/** Phần model của cấu hình, dạng gọn để ghi vào `truoc`/`sau`. Không kèm khoá. */
function tomTatDeGhi(c) {
  return {
    chinh: c.chinh.ma, chinh_nha: c.chinh.nha,
    du_phong: c.duPhong.ma, du_phong_nha: c.duPhong.nha,
    nen: c.nen.ma, nen_nha: c.nen.nha,
    do_ngau_nhien: c.doNgauNhien, do_ngau_nhien_nen: c.doNgauNhienNen,
  };
}

/** Chỉ dùng cho test: quên hết chỗ tiêm và bộ đệm để mỗi bài chạy trên nền sạch. */
export function xoaSachCauHinh() {
  _dem.clear();
  _daKeuChuaNoi.clear();
  _taoTruyVan = null;
  _pheuNhatKy = null;
  _pheuCanhBao = null;
  _dongHo = () => Date.now();
}
