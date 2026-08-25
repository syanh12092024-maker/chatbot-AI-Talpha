// TẦNG ĐỌC CỦA MÀN «SỨC KHOẺ HỆ THỐNG» (G2-E4, sóng 3).
//
// ═══ MÀN NÀY SINH RA TỪ HAI SỰ CỐ THẬT ══════════════════════════════════════════════════
//   06/08/2026 — tài khoản nhà chính hết tiền, bot đứng im **ba tiếng** mà không ai biết.
//   23/08/2026 — lặp lại, **731 phút**.
// Tiêu chí nghiệm thu sóng 3 ghi thẳng: *«Sức khỏe hệ thống phải bắt được ĐÚNG sự cố 23/08:
// tài khoản AI hết tiền → đèn đỏ `llm_account` + số phút đang dừng.»*
//
// ═══ LUẬT CỦA MỘT CÁI ĐÈN ═══════════════════════════════════════════════════════════════
// Một cái đèn chỉ đáng có nếu nó trả lời được ba câu:
//   ① đang ĐỎ hay XANH — và ĐỎ nghĩa là gì (hỏng rồi, hay sắp hỏng?)
//   ② VÌ SAO — bằng số, không bằng tính từ
//   ③ ĐI ĐÂU để sửa
// Đèn thiếu ③ là đèn báo động rồi bỏ mặc người ta. Đèn thiếu ② là đèn không ai tin.
//
// ⛔ VÀ MỘT CÁI ĐÈN KHÔNG ĐO ĐƯỢC THÌ PHẢI MÀU XÁM, KHÔNG PHẢI XANH.
//    Đây là chỗ dễ sai nhất của mọi bảng sức khoẻ: không đo được mà tô xanh thì người ta
//    yên tâm về đúng thứ mình đang mù. Xám = «chưa đo được», và nói rõ vì sao chưa đo được.

import { batBuocBoiCanh } from '../../auth/boi-canh.js';

export const MUC = Object.freeze({
  XANH: 'xanh',   // đo được, và đang ổn
  VANG: 'vang',   // đo được, sắp hỏng
  DO: 'do',       // đo được, đang hỏng
  XAM: 'xam',     // KHÔNG đo được — khác hẳn «đang ổn»
});

export const CHU_MUC = Object.freeze({
  xanh: 'Ổn', vang: 'Cần để ý', do: 'Đang hỏng', xam: 'Chưa đo được',
});

export class LoiSucKhoe extends Error {
  constructor(thongDiep, ma = 'suc_khoe', status = 400) {
    super(thongDiep);
    this.name = 'LoiSucKhoe';
    this.ma = ma;
    this.status = status;
  }
}

/* ─────────────────────────── cổng tiêm ─────────────────────────── */

let _taoTruyVan = null;
let _docKhoToken = null;
let _trangThaiCauBot = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiSucKhoe('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}

/** Kho token Pancake — tiêm để không import chéo sang module `ket-noi`. */
export function datDocKhoToken(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiSucKhoe('datDocKhoToken cần một hàm');
  _docKhoToken = fn || null;
  return _docKhoToken;
}

/** Trạng thái cầu sang tiến trình bot. */
export function datTrangThaiCauBot(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiSucKhoe('datTrangThaiCauBot cần một hàm');
  _trangThaiCauBot = fn || null;
  return _trangThaiCauBot;
}

function congTruyVan(bc) {
  if (!_taoTruyVan) throw new LoiSucKhoe('chưa nối cổng truy vấn', 'chua_noi', 500);
  return _taoTruyVan(bc);
}

/* ─────────────────────────── dựng một đèn ─────────────────────────── */

/**
 * Dựng một đèn, và BẮT BUỘC đủ ba câu trả lời. Thiếu là ném ngay tại chỗ dựng — một cái đèn
 * thiếu lý do hoặc thiếu đường đi tiếp thì thà đừng có, vì nó dạy người ta bỏ qua đèn.
 */
export function den({ ma, ten, muc, vi, diTiep = null, so = null }) {
  if (!ma || !ten) throw new LoiSucKhoe('đèn phải có mã và tên');
  if (!Object.values(MUC).includes(muc)) throw new LoiSucKhoe(`mức đèn lạ: ${muc}`);
  if (!vi) throw new LoiSucKhoe(`đèn "${ma}" thiếu câu VÌ SAO — đèn không nói lý do là đèn không ai tin`);
  if ((muc === MUC.DO || muc === MUC.VANG) && !diTiep) {
    throw new LoiSucKhoe(
      `đèn "${ma}" đang ${muc} mà không chỉ đường đi tiếp — báo động rồi bỏ mặc người ta.`,
    );
  }
  return { ma, ten, muc, vi, diTiep, so };
}

/* ─────────────────────────── chín đèn ─────────────────────────── */

/** Ngưỡng đo được, khai một chỗ. */
export const NGUONG = Object.freeze({
  tokenSapHetNgay: 7,
  hoiThoaiIm: 24 * 3600 * 1000,   // 24 giờ không có hội thoại mới = đáng ngờ
});

export async function bangDen(boiCanh, { bay = Date.now() } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);

  const [pages, cauHinh, kichBan, soAi, viec] = await Promise.all([
    db.chon('page', {}),
    db.chon('cau_hinh_model', {}),
    db.chon('kich_ban', { trang_thai: 'LIVE' }),
    db.dem('so_ai', {}),
    db.chon('viec_can_xu_ly', {}),
  ]);

  const botBat = pages.filter((p) => p.bot_ai_bat === true);
  const coKichBan = new Set(kichBan.map((k) => String(k.page_id)));
  const ds = [];

  /* ① MODEL AI — đèn của sự cố 06/08 và 23/08 */
  if (!cauHinh.length) {
    ds.push(den({
      ma: 'llm_cau_hinh', ten: 'Model AI', muc: MUC.DO,
      vi: 'Team chưa cấu hình model nào — bảng `cau_hinh_model` trống. Bot đang chạy bằng bộ '
        + 'mặc định của hệ, và không ai chọn được model rẻ hơn hay đặt dự phòng.',
      diTiep: { chu: 'Sang màn Model AI & khoá', duong: '/model-ai' },
      so: '0 dòng cấu hình',
    }));
  } else {
    const vaiTro = new Set(cauHinh.map((c) => c.vai_tro));
    const thieu = ['chinh', 'du_phong', 'nen'].filter((v) => !vaiTro.has(v));
    ds.push(thieu.length
      ? den({
        ma: 'llm_cau_hinh', ten: 'Model AI', muc: MUC.VANG,
        vi: `Thiếu cấu hình cho vai trò: ${thieu.join(', ')}. Thiếu \`du_phong\` là nhà chính `
          + 'hết tiền thì bot đứng im — đúng cảnh 06/08 (3 tiếng) và 23/08 (731 phút).',
        diTiep: { chu: 'Sang màn Model AI & khoá', duong: '/model-ai' },
        so: `${cauHinh.length}/3 vai trò`,
      })
      : den({
        ma: 'llm_cau_hinh', ten: 'Model AI', muc: MUC.XANH,
        vi: 'Đủ ba vai trò: chính, dự phòng, nền.', so: '3/3 vai trò',
      }));
  }

  /* ② KHOÁ MODEL — đo được hay không tuỳ kho khoá có nối chưa */
  ds.push(await denKhoaModel(bc, cauHinh));

  /* ③ TIẾN TRÌNH BOT */
  ds.push(denCauBot());

  /* ④ TOKEN PANCAKE */
  ds.push(await denToken(bay));

  /* ⑤ CÔNG TẮC BOT */
  ds.push(botBat.length
    ? den({
      ma: 'bot_bat', ten: 'Page đang bật bot', muc: MUC.XANH,
      vi: `${botBat.length}/${pages.length} page đang để bot tự trả lời khách.`,
      so: `${botBat.length} page`,
    })
    : den({
      ma: 'bot_bat', ten: 'Page đang bật bot', muc: MUC.VANG,
      vi: `Không page nào đang bật bot — hệ thống có ${pages.length} page nhưng không page nào `
        + 'để bot trả lời. Nếu đó là chủ ý thì bỏ qua; nếu không thì đây là lý do không có lượt chat nào.',
      diTiep: { chu: 'Sang màn Page & Bot', duong: '/page-bot' },
      so: `0/${pages.length} page`,
    }));

  /* ⑥ KỊCH BẢN CHO PAGE ĐANG BẬT BOT — chỗ nguy nhất, và dễ bị bỏ qua nhất */
  const batMaKhongKichBan = botBat.filter((p) => !coKichBan.has(String(p.id)));
  ds.push(batMaKhongKichBan.length
    ? den({
      ma: 'kich_ban_thieu', ten: 'Kịch bản của page bật bot', muc: MUC.DO,
      vi: `${batMaKhongKichBan.length}/${botBat.length} page ĐANG BẬT BOT mà không có kịch bản `
        + 'riêng — bot nói chuyện với khách thật mà không có hướng dẫn nào về giọng điệu, câu '
        + 'chào hay cách bán.',
      diTiep: { chu: 'Sang màn Kịch bản', duong: '/kich-ban' },
      so: `${batMaKhongKichBan.length} page`,
    })
    : den({
      ma: 'kich_ban_thieu', ten: 'Kịch bản của page bật bot', muc: MUC.XANH,
      vi: 'Mọi page đang bật bot đều có kịch bản riêng.', so: `${botBat.length}/${botBat.length}`,
    }));

  /* ⑦ MARKETER */
  const thieuMkt = pages.filter((p) => !String(p.marketer || '').trim());
  ds.push(thieuMkt.length
    ? den({
      ma: 'marketer', ten: 'Marketer phụ trách', muc: thieuMkt.length === pages.length ? MUC.DO : MUC.VANG,
      vi: `${thieuMkt.length}/${pages.length} page chưa có marketer — mọi báo cáo cắt theo `
        + 'marketer sẽ trống với những page đó.',
      diTiep: { chu: 'Sang màn Page & Bot', duong: '/page-bot' },
      so: `${thieuMkt.length} page`,
    })
    : den({
      ma: 'marketer', ten: 'Marketer phụ trách', muc: MUC.XANH,
      vi: 'Mọi page đều có marketer.', so: `${pages.length}/${pages.length}` }));

  /* ⑧ SỔ AI — nguồn của MỌI con số báo cáo */
  ds.push(soAi
    ? den({ ma: 'so_ai', ten: 'Sổ AI', muc: MUC.XANH, vi: `${soAi} dòng.`, so: `${soAi} dòng` })
    : den({
      ma: 'so_ai', ten: 'Sổ AI', muc: MUC.DO,
      vi: 'Bảng `so_ai` TRỐNG. Đây là nguồn của MỌI con số ở màn Báo cáo, Chi phí AI và Hiệu '
        + 'quả kịch bản — trống thì cả ba màn đó không có gì để tính, và cũng không tra ngược '
        + 'được con số nào.',
      diTiep: { chu: 'Cần chạy bộ nạp Sổ AI (việc của người A)', duong: null },
      so: '0 dòng',
    }));

  /* ⑨ VIỆC ĐANG CHỜ SALE — «page bị chặn thì đếm số khách đang chờ» */
  const dangMo = viec.filter((v) => v.dong_luc == null);
  const quaHan = dangMo.filter((v) => v.han_luc && Number(new Date(v.han_luc)) < bay);
  ds.push(quaHan.length
    ? den({
      ma: 'viec_qua_han', ten: 'Khách đang chờ', muc: MUC.DO,
      vi: `${quaHan.length}/${dangMo.length} việc đã QUÁ HẠN 10 phút mà chưa ai nhận — đó là `
        + 'khách thật đang chờ người trả lời.',
      diTiep: { chu: 'Sang bảng điều phối', duong: '/dieu-phoi' },
      so: `${quaHan.length} quá hạn`,
    })
    : den({
      ma: 'viec_qua_han', ten: 'Khách đang chờ', muc: dangMo.length ? MUC.VANG : MUC.XANH,
      vi: dangMo.length
        ? `${dangMo.length} việc đang chờ sale, chưa việc nào quá hạn.`
        : 'Không việc nào đang chờ.',
      diTiep: dangMo.length ? { chu: 'Sang bảng điều phối', duong: '/dieu-phoi' } : null,
      so: `${dangMo.length} đang chờ`,
    }));

  const dem = { xanh: 0, vang: 0, do: 0, xam: 0 };
  for (const d of ds) dem[d.muc]++;
  return {
    teamId: bc.teamId,
    den: ds,
    dem,
    chuMuc: CHU_MUC,
    // Mức xấu nhất của cả bảng — để đầu trang nói một câu, không bắt người đọc tự quét.
    tongThe: dem.do ? MUC.DO : dem.vang ? MUC.VANG : dem.xam ? MUC.XAM : MUC.XANH,
  };
}

async function denKhoaModel(bc, cauHinh) {
  // Không có cách đọc khoá ở đây (cố ý — khoá là bí mật). Suy từ cấu hình: có dòng cấu hình
  // nhưng chưa ai dán khoá riêng thì màn Model AI mới biết. Nên đèn này CHỈ nói được phần
  // nó thật sự đo được, và khai rõ phần nó không đo được.
  if (!cauHinh.length) {
    return den({
      ma: 'llm_khoa', ten: 'Khoá API model', muc: MUC.XAM,
      vi: 'Chưa đo được: team chưa cấu hình model nào nên chưa biết cần khoá của nhà nào.',
      diTiep: { chu: 'Sang màn Model AI & khoá', duong: '/model-ai' },
    });
  }
  const nha = [...new Set(cauHinh.map((c) => c.nha_cung_cap).filter(Boolean))];
  return den({
    ma: 'llm_khoa', ten: 'Khoá API model', muc: MUC.XAM,
    vi: `Chưa đo được ở màn này: khoá nằm ở bảng riêng có mã hoá và cố ý không đọc từ đây. `
      + `Team đang dùng ${nha.length} nhà (${nha.join(', ')}) — mở màn Model AI để xem nhà nào đã có khoá.`,
    diTiep: { chu: 'Sang màn Model AI & khoá', duong: '/model-ai' },
  });
}

function denCauBot() {
  if (!_trangThaiCauBot) {
    return den({
      ma: 'tien_trinh_bot', ten: 'Tiến trình bot', muc: MUC.XAM,
      vi: 'Chưa đo được: máy chủ v3 chưa nối cầu sang tiến trình bot.',
      diTiep: { chu: 'Xem `datTrangThaiCauBot` trong v3/src/vai-b.js', duong: null },
    });
  }
  const t = _trangThaiCauBot();
  return t.mo
    ? den({ ma: 'tien_trinh_bot', ten: 'Tiến trình bot', muc: MUC.XANH,
      vi: `Cửa ghi sang tiến trình bot đang MỞ (${t.goc}).`, so: 'mở' })
    : den({
      ma: 'tien_trinh_bot', ten: 'Tiến trình bot', muc: MUC.VANG,
      vi: `Cửa ghi sang tiến trình bot đang ĐÓNG: ${t.thieu.join(' · ')}. Xem và đọc thì được, `
        + 'nhưng bật/tắt bot và thêm token thì không.',
      diTiep: { chu: 'Đặt biến môi trường rồi khởi động lại dịch vụ v3', duong: null },
      so: 'đóng',
    });
}

async function denToken(bay) {
  if (!_docKhoToken) {
    return den({
      ma: 'token_pancake', ten: 'Token Pancake', muc: MUC.XAM,
      vi: 'Chưa đo được: máy chủ chưa nối bộ đọc kho token.',
      diTiep: { chu: 'Sang màn Kết nối & token', duong: '/ket-noi' },
    });
  }
  let kho;
  try {
    kho = await _docKhoToken();
  } catch (e) {
    return den({
      ma: 'token_pancake', ten: 'Token Pancake', muc: MUC.XAM,
      vi: `Chưa đo được: ${e?.message || e}`,
      diTiep: { chu: 'Sang màn Kết nối & token', duong: '/ket-noi' },
    });
  }
  const ds = kho && Array.isArray(kho.token) ? kho.token : [];
  const song = ds.filter((t) => !t.daHet);
  if (!song.length) {
    return den({
      ma: 'token_pancake', ten: 'Token Pancake', muc: MUC.DO,
      vi: ds.length ? `Cả ${ds.length} token đều hết hạn — bot không gọi được Pancake.`
        : 'Không có token Pancake nào — bot không đọc và không gửi được tin nào.',
      diTiep: { chu: 'Sang màn Kết nối & token', duong: '/ket-noi' },
      so: `${song.length}/${ds.length} sống`,
    });
  }
  const NGAY = 86400000;
  const sapHet = song.filter((t) => t.het && (t.het - bay) / NGAY <= NGUONG.tokenSapHetNgay);
  if (sapHet.length || song.length === 1) {
    return den({
      ma: 'token_pancake', ten: 'Token Pancake', muc: MUC.VANG,
      vi: song.length === 1
        ? 'Chỉ còn MỘT token sống — token này chết là mất hẳn, không có gì đỡ.'
        : `${sapHet.length} token sắp hết hạn trong ${NGUONG.tokenSapHetNgay} ngày.`,
      diTiep: { chu: 'Sang màn Kết nối & token', duong: '/ket-noi' },
      so: `${song.length}/${ds.length} sống`,
    });
  }
  return den({
    ma: 'token_pancake', ten: 'Token Pancake', muc: MUC.XANH,
    vi: `${song.length} token còn sống, không token nào sắp hết hạn.`,
    so: `${song.length}/${ds.length} sống`,
  });
}
