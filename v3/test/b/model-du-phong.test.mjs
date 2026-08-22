// CHUYỂN DỰ PHÒNG + THEO DÕI SỨC KHOẺ — L1-M4c
//
// Đây là file canh cái lỗ đắt nhất của bản đang chạy:
//   · 06/08/2026 — tài khoản nhà chính hết tiền, bot đứng im BA TIẾNG, không ai biết.
//   · 08–10/08/2026 — chết hai ngày, `systemctl` vẫn `active`, dashboard vẫn xanh,
//     log ghi 28.469 lần cùng một lỗi.
//
// Tiêu chí nghiệm thu đo ở đây:
//   ③ 402 ở nhà chính → kết quả về từ DỰ PHÒNG, `daChuyenDuPhong === true`, phễu cảnh báo
//     được gọi ĐÚNG MỘT LẦN.
//   ④ Với đồng hồ giả: từ lúc nhà chính lỗi tới lúc lời gọi kế tiếp chạy bằng dự phòng,
//     thời gian trôi DƯỚI 30.000 ms (thực tế phải là 0).
//   ⑤ Nhà chính đã đánh dấu hỏng → `fetchFn` giả KHÔNG nhận thêm lời gọi nào tới nhà đó.
//   ⑥ Lỗi 400 sai yêu cầu → KHÔNG chuyển dự phòng, ném thẳng.
//   ⑦ Cả hai nhà hỏng → ném `LoiCaHaiNhaHong`, ghi nhật ký `lop_model_hong`.
//
// KHÔNG lời gọi nào ra Internet: mọi thứ đi qua `fetchFn` giả.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

import {
  goiCoDuPhong, chonModel, datNgu, xoaSachDuPhong,
  LoiCaHaiNhaHong, MS_NGHI_TRUOC_KHI_THU_LAI, VIEC,
} from '../../src/model/du-phong.js';
import {
  datDongHo, xoaSucKhoe, dangHongThuan, tinhTrang, ghiNhanLoi,
  MS_THU_LAI, NGUONG_LOI,
} from '../../src/model/suc-khoe.js';
import {
  cauHinhMacDinh, datPheuNhatKy, datPheuCanhBao, xoaSachCauHinh, HANH_DONG, MUC,
} from '../../src/model/cau-hinh.js';
import { TEN_BIEN_KHOA_CHU } from '../../src/model/kho-khoa.js';
import { LoiNhaCungCap, LoiThamSo } from '../../src/model/loi.js';
import { taoBoiCanh } from '../../src/auth/boi-canh.js';

process.env[TEN_BIEN_KHOA_CHU] = randomBytes(32).toString('base64');

const KHOA = {
  kimi: 'sk-kimi-gia-000000000000',
  claude: 'sk-claude-gia-0000000000',
  openai: 'sk-openai-gia-0000000000',
  deepseek: 'sk-deepseek-gia-00000000',
};

const bcCua = (teamId) => taoBoiCanh({
  nguoiDungId: `u-${teamId}`, tenDangNhap: `nguoi-${teamId}`, teamId, vai: ['quan_tri'],
});

const yeuCau = () => ({ messages: [{ role: 'user', content: 'giá bao nhiêu' }], max_tokens: 400 });

const THAN_ANTHROPIC = JSON.stringify({
  id: 'msg_01', role: 'assistant',
  content: [{ type: 'text', text: 'Dạ 99 SAR ạ' }],
  stop_reason: 'end_turn',
  usage: { input_tokens: 3053, output_tokens: 167, cache_read_input_tokens: 8390 },
});
const THAN_OPENAI = JSON.stringify({
  id: 'chatcmpl_01',
  choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 'Dạ 99 SAR ạ' } }],
  usage: { prompt_tokens: 11443, completion_tokens: 167, prompt_tokens_details: { cached_tokens: 8390 } },
});

function nhaTuUrl(url) {
  const u = String(url);
  if (u.includes('moonshot')) return 'kimi';
  if (u.includes('anthropic')) return 'claude';
  if (u.includes('openai')) return 'openai';
  if (u.includes('deepseek')) return 'deepseek';
  return '?';
}

let gio = 1_000_000;

/**
 * Nền sạch cho mỗi bài. Đồng hồ và hàm nghỉ đều GIẢ — không bài nào chờ thật một mili giây,
 * và tiêu chí ④ đo được bằng số chứ không phải bằng cảm giác.
 */
function dungNen() {
  xoaSucKhoe();
  xoaSachDuPhong();
  xoaSachCauHinh();
  gio = 1_000_000;
  datDongHo(() => gio);
  datNgu(async (ms) => { gio += ms; });          // "nghỉ" = nhích đồng hồ giả
  const nhatKy = [];
  datPheuNhatKy((bc, ban) => { nhatKy.push({ teamId: bc.teamId, ...ban }); });
  const canhBao = [];
  datPheuCanhBao((c) => { canhBao.push(c); });
  return { nhatKy, canhBao };
}

const cauHinh = (teamId, them = {}) => ({ ...cauHinhMacDinh(teamId), khoa: { ...KHOA }, ...them });

/**
 * `fetchFn` giả. `luat` là `{ kimi: 'ok' | 402 | 'mang', … }` hoặc một hàm
 * `(nha, soLanDaGoiNhaDo) => …` để đổi cách trả lời giữa chừng.
 */
function dungFetch(luat) {
  const goi = [];
  const demTheoNha = {};
  const fn = async (url, tuyChon) => {
    const nha = nhaTuUrl(url);
    demTheoNha[nha] = (demTheoNha[nha] || 0) + 1;
    goi.push({ nha, luc: gio, than: JSON.parse(tuyChon.body) });
    const d = typeof luat === 'function' ? luat(nha, demTheoNha[nha]) : luat[nha];

    if (d === 'mang') throw new TypeError('fetch failed');           // đứt mạng, không có status
    if (d === 'ok' || d === undefined) {
      return {
        ok: true, status: 200,
        text: async () => (nha === 'kimi' || nha === 'claude' ? THAN_ANTHROPIC : THAN_OPENAI),
      };
    }
    const status = typeof d === 'number' ? d : d.status;
    const thongDiep = (typeof d === 'object' && d.thongDiep) || (
      status === 402 ? 'insufficient balance, please recharge your account'
        : status === 400 ? 'max_tokens: must be greater than 0'
          : `lỗi ${status}`);
    return { ok: false, status, text: async () => JSON.stringify({ error: { message: thongDiep } }) };
  };
  return { fn, goi, nha: () => goi.map((g) => g.nha) };
}

async function batLoi(fn) {
  try { await fn(); } catch (e) { return e; }
  return assert.fail('mong đợi một lỗi, nhưng không có lỗi nào');
}

const goi = (o) => goiCoDuPhong({ boiCanh: bcCua('t1'), yeuCau: yeuCau(), cauHinh: cauHinh('t1'), ...o });

// ---- ĐƯỜNG THẲNG ------------------------------------------------------------------

test('bình thường · nhà chính chạy được thì KHÔNG đụng tới dự phòng', async () => {
  const { canhBao, nhatKy } = dungNen();
  const f = dungFetch({ kimi: 'ok' });
  const kq = await goi({ fetchFn: f.fn });
  assert.equal(kq.maModel, 'kimi-k2.6');
  assert.equal(kq.nhaCungCap, 'kimi');
  assert.equal(kq.daChuyenDuPhong, false);
  assert.deepEqual(f.nha(), ['kimi']);
  assert.equal(canhBao.length, 0);
  assert.equal(nhatKy.length, 0, 'chạy bình thường mà vẫn ghi nhật ký là làm ngập nhật ký');
});

test('chọn model · viec chot lấy ô chính, viec nen lấy ô nền, viec lạ thì ném', () => {
  const c = cauHinh('t1');
  assert.equal(chonModel(c, VIEC.CHOT).dau.ma, c.chinh.ma);
  assert.equal(chonModel(c, VIEC.CHOT).sau.ma, c.duPhong.ma);
  assert.equal(chonModel(c, VIEC.NEN).dau.ma, c.nen.ma);
  // Ô nền không có dự phòng riêng: hỏng thì LÙI VỀ Ô CHÍNH.
  assert.equal(chonModel(c, VIEC.NEN).sau.ma, c.chinh.ma);
  assert.throws(() => chonModel(c, 'viec-la'), LoiThamSo);
  assert.throws(() => chonModel(null), LoiThamSo);
});

test('bối cảnh · gọi không có bối cảnh thì NÉM, không chạy chui', async () => {
  dungNen();
  const f = dungFetch({ kimi: 'ok' });
  const e = await batLoi(() => goiCoDuPhong({ yeuCau: yeuCau(), cauHinh: cauHinh('t1'), fetchFn: f.fn }));
  assert.equal(e.name, 'LoiThieuBoiCanh');
  assert.equal(f.goi.length, 0);
});

// ---- TIÊU CHÍ ③ ---------------------------------------------------------------------

test('tiêu chí ③ · 402 hết tiền ở nhà chính → kết quả về từ DỰ PHÒNG, cảnh báo ĐÚNG MỘT LẦN', async () => {
  const { canhBao, nhatKy } = dungNen();
  const f = dungFetch({ kimi: 402, claude: 'ok' });

  const kq = await goi({ fetchFn: f.fn });
  assert.equal(kq.daChuyenDuPhong, true);
  assert.equal(kq.maModel, 'claude-haiku-4.5');
  assert.equal(kq.nhaCungCap, 'claude');
  assert.ok(kq.traLoi.content[0].text.includes('99 SAR'), 'phải là câu trả lời thật của dự phòng');
  assert.deepEqual(f.nha(), ['kimi', 'claude'], '402 là lỗi tài khoản — KHÔNG được thử lại kimi');

  assert.equal(canhBao.length, 1, 'phễu cảnh báo phải được gọi đúng một lần');
  assert.equal(canhBao[0].muc, MUC.CANH_BAO);
  assert.equal(canhBao[0].nha, 'kimi');
  assert.equal(canhBao[0].teamId, 't1');
  assert.match(canhBao[0].thongDiep, /TẦNG TÀI KHOẢN/);

  const dp = nhatKy.filter((x) => x.hanhDong === HANH_DONG.CHUYEN_DU_PHONG);
  assert.equal(dp.length, 1);
  assert.equal(dp[0].truoc.ma_model, 'kimi-k2.6');
  assert.equal(dp[0].sau.ma_model, 'claude-haiku-4.5');
  assert.equal(dp[0].sau.loi_tai_khoan, true);
});

test('tiêu chí ③ · lượt sau vẫn chạy dự phòng nhưng KHÔNG báo lại — 28.469 dòng log là bài học', async () => {
  const { canhBao, nhatKy } = dungNen();
  const f = dungFetch({ kimi: 402, claude: 'ok' });
  for (let i = 0; i < 20; i++) {
    const kq = await goi({ fetchFn: f.fn });
    assert.equal(kq.daChuyenDuPhong, true);
  }
  assert.equal(canhBao.length, 1, `báo ${canhBao.length} lần cho MỘT sự việc`);
  assert.equal(nhatKy.filter((x) => x.hanhDong === HANH_DONG.CHUYEN_DU_PHONG).length, 1);
});

// ---- TIÊU CHÍ ⑤ ---------------------------------------------------------------------

test('tiêu chí ⑤ · nhà chính đã hỏng thì fetchFn giả KHÔNG nhận thêm lời gọi nào tới nhà đó', async () => {
  dungNen();
  const f = dungFetch({ kimi: 402, claude: 'ok' });
  await goi({ fetchFn: f.fn });
  assert.equal(dangHongThuan('t1', 'kimi'), true);

  const truoc = f.goi.filter((g) => g.nha === 'kimi').length;
  for (let i = 0; i < 5; i++) await goi({ fetchFn: f.fn });
  const sau = f.goi.filter((g) => g.nha === 'kimi').length;
  assert.equal(sau, truoc, 'vẫn còn gọi tới nhà đang hỏng = đốt tiền và đốt thời gian chờ');
  assert.equal(f.goi.filter((g) => g.nha === 'claude').length, 6);
});

// ---- TIÊU CHÍ ④ ---------------------------------------------------------------------

test('tiêu chí ④ · từ lúc nhà chính lỗi tới lúc chạy bằng dự phòng: DƯỚI 30.000 ms (đo bằng số)', async () => {
  dungNen();
  const f = dungFetch({ kimi: 402, claude: 'ok' });

  await goi({ fetchFn: f.fn });
  const lucKimiLoi = f.goi.find((g) => g.nha === 'kimi').luc;
  const lucDuPhong = f.goi.find((g) => g.nha === 'claude').luc;
  const troi = lucDuPhong - lucKimiLoi;
  assert.ok(troi < 30000, `trôi ${troi} ms, quá 30 giây`);
  assert.equal(troi, 0, 'chuyển NGAY lời gọi tiếp theo thì phải là 0 — không đo bằng đồng hồ hẹn giờ');

  // Và lượt kế tiếp cũng không tốn một mili giây nào để "phát hiện lại".
  gio += 1234;
  await goi({ fetchFn: f.fn });
  const dsClaude = f.goi.filter((g) => g.nha === 'claude');
  assert.equal(dsClaude[1].luc - gio, 0);
  assert.ok(dsClaude[1].luc - lucKimiLoi < 30000);
});

// ---- TIÊU CHÍ ⑥ ---------------------------------------------------------------------

test('tiêu chí ⑥ · 400 sai yêu cầu thì NÉM THẲNG, không chuyển dự phòng', async () => {
  const { canhBao, nhatKy } = dungNen();
  const f = dungFetch({ kimi: 400, claude: 'ok' });

  const e = await batLoi(() => goi({ fetchFn: f.fn }));
  assert.ok(e instanceof LoiNhaCungCap);
  assert.equal(e.status, 400);
  assert.equal(e.maNha, 'kimi');
  // Yêu cầu sai thì nhà nào cũng sai; chuyển dự phòng chỉ tốn tiền và GIẤU MẤT lỗi thật.
  assert.deepEqual(f.nha(), ['kimi'], 'đã gọi sang dự phòng cho một lỗi 400');
  assert.equal(canhBao.length, 0);
  assert.equal(nhatKy.length, 0);
});

test('tiêu chí ⑥ · 400 KHÔNG được tính vào sức khoẻ của nhà — lỗi của mình, không phải của nhà', async () => {
  dungNen();
  const f = dungFetch({ kimi: 400, claude: 'ok' });
  for (let i = 0; i < NGUONG_LOI + 5; i++) await batLoi(() => goi({ fetchFn: f.fn }));
  assert.equal(dangHongThuan('t1', 'kimi'), false, 'gọi sai 15 lần mà lại đá cả team sang nhà khác');
  assert.equal(tinhTrang('t1').nha.kimi.loiTrong5p, 0);
});

// ---- TIÊU CHÍ ⑦ ---------------------------------------------------------------------

test('tiêu chí ⑦ · cả hai nhà hỏng → LoiCaHaiNhaHong + nhật ký `lop_model_hong` + cảnh báo NẶNG', async () => {
  const { canhBao, nhatKy } = dungNen();
  const f = dungFetch({ kimi: 402, claude: 402 });

  const e = await batLoi(() => goi({ fetchFn: f.fn }));
  assert.ok(e instanceof LoiCaHaiNhaHong);
  assert.equal(e.ma, 'ca_hai_nha_hong');
  assert.equal(e.status, 503);
  assert.equal(e.maModel, 'claude-haiku-4.5', 'lượt lỗi vẫn phải nói được model nào đã thử cuối');
  assert.deepEqual(f.nha(), ['kimi', 'claude']);

  const h = nhatKy.filter((x) => x.hanhDong === HANH_DONG.LOP_MODEL_HONG);
  assert.equal(h.length, 1);
  const nang = canhBao.filter((c) => c.muc === MUC.NANG);
  assert.equal(nang.length, 1);
  assert.match(nang[0].thongDiep, /KHÔNG trả lời được khách/);
});

test('tiêu chí ⑦ · cả hai hỏng mà gọi thêm 20 lượt thì vẫn chỉ báo MỘT lần', async () => {
  const { canhBao, nhatKy } = dungNen();
  const f = dungFetch({ kimi: 402, claude: 402 });
  for (let i = 0; i < 20; i++) assert.ok(await batLoi(() => goi({ fetchFn: f.fn })) instanceof LoiCaHaiNhaHong);
  assert.equal(canhBao.filter((c) => c.muc === MUC.NANG).length, 1);
  assert.equal(nhatKy.filter((x) => x.hanhDong === HANH_DONG.LOP_MODEL_HONG).length, 1);
  // Và sau lượt đầu thì không còn gọi mạng tới nhà nào nữa — cả hai đều đã đánh dấu hỏng.
  assert.equal(f.goi.length, 2);
});

test('tiêu chí ⑦ · dự phòng CÙNG NHÀ với ô đang hỏng thì không gọi cho có, ném luôn', async () => {
  dungNen();
  const c = {
    ...cauHinhMacDinh('t1'),
    khoa: { ...KHOA },
    chinh: { ma: 'claude-haiku-4.5', nha: 'claude' },
    duPhong: { ma: 'claude-sonnet-5', nha: 'claude' },   // bản ghi cũ, trước khi có luật khác nhà
  };
  const f = dungFetch({ claude: 402 });
  const e = await batLoi(() => goiCoDuPhong({ boiCanh: bcCua('t1'), yeuCau: yeuCau(), cauHinh: c, fetchFn: f.fn }));
  assert.ok(e instanceof LoiCaHaiNhaHong);
  assert.equal(f.goi.length, 1, 'gọi sang model cùng nhà chỉ tốn thêm một vòng chờ rồi vẫn hỏng');
});

// ---- LỖI THOÁNG QUA: THỬ LẠI ĐÚNG MỘT LẦN ------------------------------------------

test('lỗi mạng · thử lại ĐÚNG MỘT LẦN sau 800 ms, lần hai chạy được thì không cần dự phòng', async () => {
  const { canhBao } = dungNen();
  const f = dungFetch((nha, lan) => (nha === 'kimi' && lan === 1 ? 'mang' : 'ok'));

  const kq = await goi({ fetchFn: f.fn });
  assert.equal(kq.daChuyenDuPhong, false);
  assert.equal(kq.nhaCungCap, 'kimi');
  assert.deepEqual(f.nha(), ['kimi', 'kimi']);
  assert.equal(f.goi[1].luc - f.goi[0].luc, MS_NGHI_TRUOC_KHI_THU_LAI, 'phải nghỉ đúng 800 ms rồi mới thử lại');
  assert.equal(canhBao.length, 0);
  assert.equal(dangHongThuan('t1', 'kimi'), false, 'một lời gọi thành công phải xoá sạch bộ đếm lỗi');
});

test('lỗi 5xx · thử lại một lần, vẫn lỗi thì chuyển dự phòng (KHÔNG thử lần ba)', async () => {
  dungNen();
  const f = dungFetch({ kimi: 503, claude: 'ok' });
  const kq = await goi({ fetchFn: f.fn });
  assert.equal(kq.daChuyenDuPhong, true);
  assert.deepEqual(f.nha(), ['kimi', 'kimi', 'claude']);
});

test('lỗi 402 · KHÔNG thử lại — hết tiền thì lần thứ hai vẫn hết tiền', async () => {
  dungNen();
  const f = dungFetch({ kimi: 402, claude: 'ok' });
  await goi({ fetchFn: f.fn });
  assert.equal(f.goi.filter((g) => g.nha === 'kimi').length, 1);
});

test('lỗi thoáng qua · chưa đủ ngưỡng thì nhà chính CHƯA bị đánh dấu hỏng', async () => {
  dungNen();
  // Mỗi lượt hỏng đếm 2 lỗi (gọi lần đầu + thử lại). Bốn lượt = 8 lỗi, chưa tới 10.
  const f = dungFetch({ kimi: 503, claude: 'ok' });
  for (let i = 0; i < 4; i++) await goi({ fetchFn: f.fn });
  assert.equal(dangHongThuan('t1', 'kimi'), false);
  assert.equal(tinhTrang('t1').nha.kimi.loiTrong5p, 8);

  await goi({ fetchFn: f.fn });                        // lượt thứ năm → 10 lỗi
  assert.equal(dangHongThuan('t1', 'kimi'), true, `${NGUONG_LOI} lỗi trong 5 phút phải là hỏng`);
});

// ---- SỐNG LẠI ----------------------------------------------------------------------

test('sống lại · sau 5 phút cho lọt ĐÚNG MỘT lời gọi để dò, chạy được thì quay về nhà chính', async () => {
  const { canhBao } = dungNen();
  let kimiHong = true;
  const f = dungFetch((nha) => (nha === 'kimi' && kimiHong ? 402 : 'ok'));

  await goi({ fetchFn: f.fn });                        // hỏng, chuyển dự phòng
  assert.equal(dangHongThuan('t1', 'kimi'), true);

  gio += MS_THU_LAI - 1;
  await goi({ fetchFn: f.fn });
  assert.equal(f.goi.filter((g) => g.nha === 'kimi').length, 1, 'chưa tới 5 phút thì chưa dò');

  gio += 2;                                             // đã quá 5 phút
  kimiHong = false;                                     // người ta vừa nạp tiền
  const kq = await goi({ fetchFn: f.fn });
  assert.equal(kq.daChuyenDuPhong, false);
  assert.equal(kq.nhaCungCap, 'kimi');
  assert.equal(dangHongThuan('t1', 'kimi'), false);

  const tin = canhBao.filter((c) => c.muc === MUC.TIN);
  assert.equal(tin.length, 1, 'sống lại cũng là một tin đáng báo, và chỉ báo một lần');
  assert.match(tin[0].thongDiep, /sống lại/);
});

test('sống lại · hỏng lần nữa sau khi đã sống lại thì được báo lại — sự việc mới', async () => {
  const { canhBao } = dungNen();
  let kimiHong = true;
  const f = dungFetch((nha) => (nha === 'kimi' && kimiHong ? 402 : 'ok'));

  await goi({ fetchFn: f.fn });
  gio += MS_THU_LAI + 1;
  kimiHong = false;
  await goi({ fetchFn: f.fn });                        // sống lại
  kimiHong = true;
  await goi({ fetchFn: f.fn });                        // hỏng lần hai
  assert.equal(canhBao.filter((c) => c.muc === MUC.CANH_BAO).length, 2);
});

// ---- Ô NỀN -------------------------------------------------------------------------

test('ô nền · viec `nen` đi model rẻ; nhà nền hỏng thì LÙI VỀ Ô CHÍNH', async () => {
  dungNen();
  const f = dungFetch({ deepseek: 'ok', kimi: 'ok' });
  let kq = await goi({ fetchFn: f.fn, viec: VIEC.NEN });
  assert.equal(kq.maModel, 'deepseek-v4-flash');
  assert.equal(kq.daChuyenDuPhong, false);

  const f2 = dungFetch({ deepseek: 402, kimi: 'ok' });
  kq = await goi({ fetchFn: f2.fn, viec: VIEC.NEN });
  assert.equal(kq.maModel, 'kimi-k2.6', 'việc nền chậm và đắt vẫn hơn việc nền không chạy');
  assert.equal(kq.daChuyenDuPhong, true);
});

test('ô nền · nhà nền hỏng KHÔNG kéo theo ô chính', async () => {
  dungNen();
  const f = dungFetch({ deepseek: 402, kimi: 'ok' });
  await goi({ fetchFn: f.fn, viec: VIEC.NEN });
  assert.equal(dangHongThuan('t1', 'deepseek'), true);
  assert.equal(dangHongThuan('t1', 'kimi'), false);
  const kq = await goi({ fetchFn: f.fn });
  assert.equal(kq.daChuyenDuPhong, false);
  assert.equal(kq.nhaCungCap, 'kimi');
});

// ---- SỨC KHOẺ THEO TEAM ------------------------------------------------------------

test('sức khoẻ · team A hết tiền Kimi thì team B VẪN chạy Kimi bình thường', async () => {
  dungNen();
  // Team A dùng khoá Kimi đã hết tiền; team B dùng khoá Kimi khác, vẫn còn tiền.
  const fA = dungFetch({ kimi: 402, claude: 'ok' });
  await goiCoDuPhong({ boiCanh: bcCua('tA'), yeuCau: yeuCau(), cauHinh: cauHinh('tA'), fetchFn: fA.fn });
  assert.equal(dangHongThuan('tA', 'kimi'), true);
  assert.equal(dangHongThuan('tB', 'kimi'), false, 'một cờ toàn cục là hỏng đúng chỗ v3 sinh ra để sửa');

  const fB = dungFetch({ kimi: 'ok' });
  const kq = await goiCoDuPhong({ boiCanh: bcCua('tB'), yeuCau: yeuCau(), cauHinh: cauHinh('tB'), fetchFn: fB.fn });
  assert.equal(kq.nhaCungCap, 'kimi');
  assert.equal(kq.daChuyenDuPhong, false);
  assert.deepEqual(fB.nha(), ['kimi'], 'team B không được đi vòng qua dự phòng vì team A hết tiền');

  assert.equal(tinhTrang('tA').coNhaHong, true);
  assert.deepEqual(tinhTrang('tA').nhaHong, ['kimi']);
  assert.equal(tinhTrang('tB').coNhaHong, false);
});

test('sức khoẻ · màn hình thấy đủ BỐN nhà, kể cả nhà chưa gọi lần nào', () => {
  dungNen();
  const t = tinhTrang('t1');
  assert.deepEqual(Object.keys(t.nha).sort(), ['claude', 'deepseek', 'kimi', 'openai']);
  for (const n of Object.values(t.nha)) assert.equal(n.hong, false);
  // Không hiện nhà chưa gọi thì màn hình trông y hệt "mọi thứ đều tốt" — đúng cái dashboard
  // xanh trong lúc bot chết hai ngày.
});

test('sức khoẻ · lỗi tầng tài khoản là hỏng NGAY, không đợi đủ ngưỡng', () => {
  dungNen();
  const e = new LoiNhaCungCap({ maNha: 'kimi', status: 402, thongDiep: 'insufficient balance', laLoiTaiKhoan: true });
  assert.equal(ghiNhanLoi('t1', 'kimi', e), true);
  assert.equal(dangHongThuan('t1', 'kimi'), true);
  assert.equal(tinhTrang('t1').nha.kimi.loiTaiKhoan, true);
});

// ---- KHOÁ --------------------------------------------------------------------------

test('thiếu khoá nhà chính · chuyển dự phòng mà KHÔNG tốn lời gọi mạng nào tới nhà đó', async () => {
  dungNen();
  const f = dungFetch({ claude: 'ok' });
  const kq = await goiCoDuPhong({
    boiCanh: bcCua('t1'), yeuCau: yeuCau(), fetchFn: f.fn,
    cauHinh: { ...cauHinhMacDinh('t1'), khoa: { claude: KHOA.claude } },   // không có khoá kimi
  });
  assert.equal(kq.daChuyenDuPhong, true);
  assert.equal(kq.nhaCungCap, 'claude');
  assert.deepEqual(f.nha(), ['claude'], 'thiếu khoá phải chặn TRƯỚC KHI gọi mạng');
});

test('khoá không lọt vào lỗi ném ra ngoài', async () => {
  dungNen();
  const f = dungFetch({ kimi: 402, claude: 402 });
  const e = await batLoi(() => goi({ fetchFn: f.fn }));
  const chuoi = `${e.message}${JSON.stringify(e.loiDau || {})}${JSON.stringify(e.loiSau || {})}`;
  for (const k of Object.values(KHOA)) assert.ok(!chuoi.includes(k), `khoá ${k} lọt ra lỗi`);
});
