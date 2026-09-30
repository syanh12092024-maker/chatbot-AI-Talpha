// PHIẾU VE6a · «SỐ LIỆU › TỔNG QUAN» THEO BẢN VẼ 3a — CHẠY THẬT script trang (vm + DOM giả) với dữ liệu theo từng cửa:
//   `/api/bao-cao` dựng bằng `manBaoCao` THẬT · `/api/chi-phi` · `/api/nguon-khach` · `/api/dieu-huong` · `/api/rui-ro-hoan` theo đúng
//   dạng máy chủ trả (đã đọc `kho-chi-phi.js` · `kho-nguon.js#choRoiWhatsApp` · `kho-rui-ro.js#dungTuPhanBo` · `router-dieu-huong.js`).
// Luật của màn giữ nguyên: ba thước Messenger đứng DỌC, không cộng (bao-cao ①c) · không tỉ lệ rơi giữa chặng (nguon-khach ②a) ·
// 37,4% luôn kèm «số cũ» · ô không có nguồn nói «chưa có nguồn», không bịa.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const bcao = await import('../../src/ui/bao-cao/kho-bao-cao.js');

const html = fs.readFileSync(new URL('../../src/ui/bao-cao/trang/bao-cao.html', import.meta.url), 'utf8');
const SCRIPT = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]).find((x) => x.includes('window.UI'));

async function baoCaoThat(khoang = { tu: '2026-09-23T00:00:00Z', den: '2026-09-30T00:00:00Z' }) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false }],
    page: [{ id: 'p1', team_id: 't1', page_id: '111', ten: 'Page A', marketer: 'lan' },
           { id: 'p2', team_id: 't1', page_id: '222', ten: 'Page B', marketer: '' },
           { id: 'p3', team_id: 't1', page_id: '333', ten: 'Page C', marketer: 'mai' }], don_hang: [],
  });
  bcao.datTaoTruyVan(taoTruyVan);
  bcao.datDocDon(async () => ({ bat: true, thieu: false, soPageQuetLoi: 0, quetLuc: '2026-09-29T10:00:00.000Z',
    page: [{ pageId: '111', hoiThoaiCoDon: 8, posQuyChoAi: 9, soCu: false }, { pageId: '222', hoiThoaiCoDon: 2, posQuyChoAi: 3, soCu: false }] }));
  bcao.datDocChiPhi(async () => ({ page: [{ pageId: '111', soDon: 5 }, { pageId: '222', soDon: 1 }] }));
  bcao.datDocHaiLuong(async () => ({ khoang,
    messenger: { soDon: 12 }, trangBanHang: { soDon: 34, soDonCoTien: 30 } }));
  const kq = await bcao.manBaoCao(taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an@t.vn', teamId: 't1', vai: [VAI.QUAN_TRI] }));
  assert.ok(kq.messenger && kq.haiLuong && kq.haiLuong.co, 'payload phải đủ luồng Messenger + hai luồng');
  return { ok: true, ...kq };
}

const CHI_PHI = { ok: true, khoang: { chu: 'toàn thời gian' },
  tong: { vndMoiDon: 6696, tinMoiDon: 52.7, vndMoiTin: 127, soLuot: 13010, soDon: 247 },
  page: [{ pageId: '222', ten: 'Page B', marketer: '', soLuot: 40, soDon: 1, vndMoiDon: 9000, dotTienKhongRaDon: false },
         { pageId: '111', ten: 'Page A', marketer: 'lan', soLuot: 100, soDon: 5, vndMoiDon: 5000, dotTienKhongRaDon: false },
         { pageId: '333', ten: 'Page C', marketer: 'mai', soLuot: 50, soDon: 0, vndMoiDon: null, dotTienKhongRaDon: true }] };
const NGUON = { ok: true, choRoi: { doDuoc: false, taiLieuNoi: 0.374, soDonTrang: 34, noi: '…', diTiep: '…' } };
const RUI_RO = { ok: true, tuoi: { chamLuc: '2026-08-28T03:00:00.000Z', donMoiNhat: null },
  theoTang: [{ ma: 'chua_du_don', soKhach: 50000 }, { ma: 'tot', soKhach: 20000 }, { ma: 'binh_thuong', soKhach: 3000 },
             { ma: 'canh_bao', soKhach: 5000 }, { ma: 'rui_ro_cao', soKhach: 11439 }] };
const menu = (duong) => ({ ok: true, nhom: [{ ma: 'so-lieu', man: duong.map((d) => ({ duong: d })) }] });

async function chay(cua) {
  const o = { '#khoiRuiRo': { innerHTML: '', textContent: '', dataset: {}, hidden: true } };   // trang để khối rủi ro `hidden`
  const document = { querySelector: (s) => (o[s] ||= { innerHTML: '', textContent: '', dataset: {}, hidden: false }) };
  const goi = [];
  const UI = {
    esc: (s) => String(s ?? ''), text: (s) => String(s ?? ''), formatNumber: (n) => String(n), button: (t) => `<button>${t}</button>`,
    statusBadge: (_m, x = {}) => `<b>${x.label || ''}</b>`, alert: (x) => `<div class="alert">${x.title || ''} · ${x.body || ''}</div>`,
    emptyState: (x) => `<div class="empty">${x.title}</div>`, nguonSo: () => '<div class="nguon"></div>',
    metricRow: (ds) => `<div class="metric-row">${ds.map((m) => `[${m.label}: ${m.value} | ${m.hint || ''}]`).join('')}</div>`,
  };
  const ctx = vm.createContext({ window: { UI }, document, location: { pathname: '/bao-cao', href: '' }, console,
    fetch: async (u) => { goi.push(String(u)); const tra = cua[String(u)];
      return tra ? { status: 200, ok: true, json: async () => tra } : { status: 503, ok: false, json: async () => ({ ok: false, thongDiep: 'cửa hỏng trong ca' }) }; } });
  vm.runInContext(SCRIPT, ctx);
  await new Promise((r) => setTimeout(r, 40));
  return { o, goi };
}

const DU = async (vai = 'qt') => ({ '/api/bao-cao': await baoCaoThat(), '/api/chi-phi': CHI_PHI, '/api/nguon-khach': NGUON,
  '/api/dieu-huong': vai === 'qt' ? menu(['/bao-cao', '/rui-ro-hoan']) : menu(['/bao-cao']), '/api/rui-ro-hoan': RUI_RO });

test('V1 · bốn ô số của bản vẽ: chi phí/đơn · tin/đơn · đơn theo luồng KHÔNG gộp · BUY NOW «chưa đo được» + 37,4% là SỐ CŨ', async () => {
  const { o } = await chay(await DU());
  const h = o['#chiSo'].innerHTML;
  assert.match(h, /\[Chi phí AI mỗi đơn: 6696 đ \| toàn thời gian · sổ bot cũ · % doanh thu: chưa có nguồn\]/);
  assert.match(h, /\[Tin AI để ra một đơn: 52\.7 \| 127 đ mỗi tin · 13010 tin → 247 đơn\]/);
  assert.match(h, /\[Đơn theo luồng — không gộp: 12 · 34 \| Messenger · trang bán hàng · /, 'hai luồng phải ĐỨNG RIÊNG, không một tổng');
  assert.doesNotMatch(h, /46/, 'hai luồng bị cộng (12 + 34)');
  assert.match(h, /\[BUY NOW mà không gửi WhatsApp: — \| chưa đo được · 37,4% là số cũ trong tài liệu/);
  assert.doesNotMatch(o['#bang-tin'].innerHTML, /Không đọc được báo cáo/);
});

test('V2 · hai phễu: chặng có nguồn mang số, chặng không có nói «chưa có nguồn»; KHÔNG tỉ lệ rơi', async () => {
  const { o } = await chay(await DU());
  const mess = o['#pheuMess'].innerHTML, trang = o['#pheuTrang'].innerHTML;
  const chang = (h) => [...h.matchAll(/<span class="pheu-ten">([^<]+)<\/span>\s*<span class="pheu-so">([^<]+)<\/span>\s*<span class="pheu-ghi">([^<]*)<\/span>/g)]
    .map((m) => [m[1], m[2], m[3]]);
  assert.deepEqual(chang(mess), [['Hội thoại mới', '—', 'chưa có nguồn'], ['Bot tư vấn', '—', 'chưa có nguồn'],
    ['Bot chốt đơn', '6', 'sổ đếm của bot'], ['Sale duyệt', '—', 'chưa có nguồn'], ['Giao thành công', '—', 'chưa có nguồn']]);
  assert.deepEqual(chang(trang).map((x) => x.slice(0, 2)), [['Bấm BUY NOW', '34'], ['Gửi WhatsApp', '—'], ['Khách xác nhận', '—'],
    ['Sang Chờ in', '—'], ['Sale gọi lại cứu được', '—']]);
  assert.equal(chang(trang)[1][2], 'luồng gửi WhatsApp chưa chạy');
  assert.doesNotMatch(mess + trang, /%/, 'phễu mọc tỉ lệ rơi — số khác nguồn, khác khoảng');
  assert.match(o['#thuoc'].innerHTML, /\S/, 'ba thước (dọc) phải còn');
});

test('V3 · bảng theo page ghép «AI / đơn», xếp ĐẮT NHẤT lên đầu; page tốn tiền 0 đơn được nêu; Chốt · Hoàn nói chưa có nguồn', async () => {
  const { o } = await chay(await DU());
  const b = o['#bang'].innerHTML;
  const thuTu = [...b.matchAll(/<div class="page-identity-name">([^<]+)<\/div>/g)].map((m) => m[1]);
  assert.deepEqual(thuTu, ['Page B', 'Page A', 'Page C'], 'AI/đơn giảm dần, page chưa ra đơn (null) xuống cuối');
  assert.match(b, /9000 đ[\s\S]*5000 đ[\s\S]*Tốn tiền, 0 đơn/);
  assert.match(b, /«Chốt» và «Hoàn» theo page: chưa có nguồn/);
  assert.match(o['#hSo'].textContent, /xếp theo chi phí AI mỗi đơn, đắt nhất lên đầu/);
});

test('V4 · rủi ro hoàn theo VAI: quản trị thấy bốn tầng (tốt + bình thường gộp đúng tầng bản vẽ); marketer KHÔNG gọi cửa, KHÔNG thấy khối', async () => {
  const qt = await chay(await DU('qt'));
  assert.equal(qt.o['#khoiRuiRo'].hidden, false);
  const so = [...qt.o['#ruiRo'].innerHTML.matchAll(/<span class="pheu-so">([^<]+)<\/span>/g)].map((m) => m[1]);
  assert.deepEqual(so, ['11439', '5000', '23000', '50000']);
  assert.match(qt.o['#ruiRo'].innerHTML, /chấm lúc/, 'phải nói tuổi lát chấm');
  const mk = await chay(await DU('mk'));
  assert.equal(mk.o['#khoiRuiRo'].hidden, true, 'marketer thấy khối rủi ro');
  assert.ok(!mk.goi.includes('/api/rui-ro-hoan'), 'marketer vẫn gọi cửa rủi ro rồi ăn 403');
});

test('V5 · sổ chi phí HỎNG ⇒ ô số và cột AI/đơn nói «chưa đọc được», khối chính (ba thước · phễu · bảng) vẫn đứng', async () => {
  const cua = await DU();
  delete cua['/api/chi-phi'];
  const { o } = await chay(cua);
  assert.match(o['#chiSo'].innerHTML, /\[Chi phí AI mỗi đơn: — \| chưa đọc được sổ chi phí\]/);
  assert.match(o['#bang'].innerHTML, /«AI \/ đơn»: chưa đọc được sổ chi phí/);
  assert.match(o['#hSo'].textContent, /xếp theo đơn POS quy cho AI/);
  assert.doesNotMatch(o['#bang-tin'].innerHTML, /Không đọc được báo cáo/);
  assert.match(o['#pheuMess'].innerHTML, /Bot chốt đơn/);
});

test('V6 · khoảng MỞ của cửa hai luồng (`den: null` — dạng THẬT của `so-lieu.js#khoang`) ⇒ in «… – nay», không «trong khoảng đo»', async () => {
  const cua = await DU();
  cua['/api/bao-cao'] = await baoCaoThat({ tu: '2026-09-23T00:00:00Z', den: null });
  const { o } = await chay(cua);
  assert.match(o['#chiSo'].innerHTML, /Messenger · trang bán hàng · [0-9/]+ – nay\]/);
  assert.doesNotMatch(o['#chiSo'].innerHTML + o['#pheuTrang'].innerHTML, /trong khoảng đo/);
});
