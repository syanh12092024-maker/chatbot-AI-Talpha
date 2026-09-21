import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import { nhanWebhook, taoWebhookHandler, docSuKien } from '../src/queue/webhook.js';
import { bocCuaGuiBen, daBatDauGui } from '../src/queue/lan-gui.js';
import { moPhienRut, xepTin } from '../src/queue/kho.js';
import { chayMotVong } from '../src/queue/worker.js';
import { napTuPoll } from '../src/queue/nap.js';
import { pageThuocV3 } from '../src/queue/page-routing.js';
import { collectCandidates } from '../src/scheduler-followup.js';

let sb, team, page;
before(async () => {
  sb = await dungSandbox('webhookdelivery');
  team = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  page = (await sb.pool.query("INSERT INTO page(team_id,page_id,ten,nguon_tin) VALUES($1,'webhook-test','Test','webhook') RETURNING id", [team])).rows[0].id;
});
after(async () => { await sb?.don(); });
const body = (id, text = 'Hello', psid = 'customer') => ({ object: 'page', entry: [{ id: 'webhook-test', messaging: [{ sender: { id: psid }, message: { mid: id, text } }] }] });
const permit = { choPhep: () => true };
const deps = extra => ({
  layKb: () => ({ products: [], text: 'test' }), layModel: () => ({ maModel: 'test' }),
  lanNhanh: () => ({ handled: true, reply: 'Hello', lane: 'test' }),
  kiemTinRa: () => ({ ok: true }), docLichSu: false,
  docHoiThoai: async () => [{ id: 'pancake-conv', from_psid: 'customer', customers: [{ id: 'pancake-customer' }] }],
  cua: { guiTin: async () => ({ ok: true, id: 'sent1' }) }, ...extra,
});

test('ACK chờ lưu bền; DB lỗi trả 503; chữ ký sai không chạm DB', async () => {
  let saved, release;
  const ready = new Promise(r => { release = r; });
  const handler = taoWebhookHandler({ layPool: () => ({}), xacThuc: () => true,
    luu: async () => { await ready; saved = true; } });
  const req = { body: body('ack'), get: () => 'signature' };
  const response = { status: null, sendStatus(n) { this.status = n; } };
  const running = handler(req, response);
  assert.equal(response.status, null);
  release(); await running;
  assert.equal(saved, true); assert.equal(response.status, 200);
  await taoWebhookHandler({ layPool: () => { throw Error('database down'); }, xacThuc: () => true })(req, response);
  assert.equal(response.status, 503);
  await taoWebhookHandler({ layPool: () => { assert.fail('DB must not be touched'); }, xacThuc: () => false })(req, response);
  assert.equal(response.status, 403);
  assert.throws(() => docSuKien(body(undefined)), /thiếu định danh/);
});

test('retry đồng thời cùng mid chỉ lưu một tin và một hội thoại', async () => {
  const results = await Promise.all([nhanWebhook(sb.pool, body('m1'), permit), nhanWebhook(sb.pool, body('m1'), permit)]);
  assert.equal(results.reduce((n, x) => n + x.them, 0), 1);
  assert.equal(results.reduce((n, x) => n + x.trung, 0), 1);
  assert.equal((await sb.pool.query("SELECT count(*)::int n FROM hoi_thoai WHERE page_id=$1", [page])).rows[0].n, 1);
  const r = await chayMotVong(sb.pool, deps({ cua: { guiTin: async (_pool, _ctx, address) => {
    assert.equal(address.convId, 'pancake-conv');
    assert.equal(address.custId, 'pancake-customer');
    return { ok: true, id: 'sent1' };
  } } }));
  assert.equal(r.ketQua, 'xong');
  assert.equal((await sb.pool.query('SELECT trang_thai FROM lan_gui WHERE tin_id=$1', [r.tinId])).rows[0].trang_thai, 'da_gui');
  assert.equal((await nhanWebhook(sb.pool, body('m1'), permit)).trung, 1);
  assert.equal(await chayMotVong(sb.pool, deps()), null);
});

test('một Page chỉ nhận nguồn đã chọn; poll không gọi API trên Page webhook', async () => {
  assert.equal(pageThuocV3('webhook-test', { V3_PAGE_XU_LY: 'other, webhook-test' }), true);
  const env = process.env.V3_NAP_DEV;
  process.env.V3_NAP_DEV = '1';
  try {
    const r = await napTuPoll(sb.pool, { pageId: 'webhook-test' }, {
      docHoiThoai: async () => { assert.fail('không được poll Page webhook'); },
    });
    assert.equal(r.them, 0);
    assert.match(r.lyDo, /webhook/);
  } finally { if (env === undefined) delete process.env.V3_NAP_DEV; else process.env.V3_NAP_DEV = env; }
  await sb.pool.query("UPDATE page SET nguon_tin='poll' WHERE id=$1", [page]);
  assert.equal((await nhanWebhook(sb.pool, body('poll-page'), permit)).boQua, 1);
  await sb.pool.query("UPDATE page SET nguon_tin='webhook' WHERE id=$1", [page]);
});

test('Pancake chưa đồng bộ: giữ tin để thử sau, không gọi model/gửi', async () => {
  await nhanWebhook(sb.pool, body('mapping-missing', 'hello', 'not-yet-visible'), permit);
  const r = await chayMotVong(sb.pool, deps({ layKb: () => assert.fail('không chạy AI khi chưa có mapping') }));
  assert.equal(r.ketQua, 'thu_lai');
  assert.equal(await chayMotVong(sb.pool, deps()), null, 'không retry nóng trong cùng vòng');
  await sb.pool.query("UPDATE tin_cho_xu_ly SET trang_thai='chan_guard' WHERE id=$1", [r.tinId]);
});

test('khóa theo Page + khách, không theo id hội thoại của từng nguồn', async () => {
  for (const [psid, conv] of [['same', 'poll-conv'], ['same','webhook:same'], ['other','different']]) {
    await xepTin(sb.pool, { teamId: team, pageId: 'webhook-test', psid, convId: conv, msgId: conv, noiDung: 'hello' });
  }
  const first = await moPhienRut(sb.pool, { khoaWorker: 'A' });
  const other = await moPhienRut(sb.pool, { khoaWorker: 'B' });
  assert.equal(first.tin.psid, 'same');
  assert.equal(other.tin.psid, 'other');
  await other.ketThuc('xong'); await first.ketThuc('xong');
  const second = await moPhienRut(sb.pool, { khoaWorker: 'B' });
  assert.equal(second.tin.psid, 'same');
  await second.ketThuc('xong');
});

test('HTTP thành công rồi rollback: dấu gửi còn, không gọi model/gửi lần nữa', async () => {
  await nhanWebhook(sb.pool, body('crash-after-send'), permit);
  const phase = await moPhienRut(sb.pool, { khoaWorker: 'crash-test' });
  let sent = 0;
  const cua = bocCuaGuiBen(sb.pool, phase.tin, { guiTin: async () => { sent++; return { ok: true, id: 'accepted' }; } });
  await cua.guiTin(phase.khach, {}, { text: 'already delivered' });
  await phase.huy();
  assert.equal(await daBatDauGui(sb.pool, phase.tin), true);
  const result = await chayMotVong(sb.pool, deps({ layKb: () => assert.fail('không được chạy lại model') }));
  assert.equal(result.ketQua, 'loi'); assert.equal(sent, 1);
  // Tin sau của khách cũng đợi đối chiếu, không tự tiếp tục trên state đã rollback.
  await nhanWebhook(sb.pool, body('after-uncertain'), permit);
  assert.equal(await chayMotVong(sb.pool, deps()), null);
});

test('ĐÁNH DẤU CHƯA ĐỌC sau khi gửi tin — để hội thoại không trôi khỏi hàng chờ sale', async () => {
  // Pancake coi hội thoại là ĐÃ ĐỌC ngay khi page gửi tin, kể cả tin của bot. Không gọi
  // `/unread` thì bot trả lời xong là không sale nào còn thấy khách đó.
  await nhanWebhook(sb.pool, body('unread-1', 'Hello', 'khach-unread-1'), permit);
  const phien = await moPhienRut(sb.pool, { khoaWorker: 'unread' });
  const goi = [];
  const cua = bocCuaGuiBen(sb.pool, phien.tin,
    { guiTin: async () => ({ ok: true, id: 'm1' }), ghiNote: async () => ({ ok: true, id: 'n1' }) },
    { danhDauChuaDoc: async (pageId, convId) => { goi.push([pageId, convId]); return { ok: true }; } });

  await cua.guiTin(phien.khach, {}, { text: 'xin chào' });
  assert.equal(goi.length, 1, 'gửi tin cho khách ⇒ PHẢI đánh dấu chưa đọc');
  assert.equal(goi[0][1], String(phien.tin.conv_id), 'đúng hội thoại vừa trả lời');

  await cua.ghiNote(phien.khach, {}, { text: 'ghi chú nội bộ' });
  assert.equal(goi.length, 1, 'ghi chú NỘI BỘ không làm hội thoại «đã đọc» ⇒ không gọi');
  await phien.ketThuc('xong');
});

test('ĐÁNH DẤU CHƯA ĐỌC: diễn tập KHÔNG gọi, và lỗi KHÔNG làm hỏng lượt', async () => {
  await nhanWebhook(sb.pool, body('unread-2', 'Hello', 'khach-unread-2'), permit);
  const p1 = await moPhienRut(sb.pool, { khoaWorker: 'unread-dt' });
  let goi = 0;
  const cuaDt = bocCuaGuiBen(sb.pool, p1.tin, { guiTin: async () => assert.fail('diễn tập KHÔNG được gửi') },
    { env: { V3_DIEN_TAP: '1' }, danhDauChuaDoc: async () => { goi += 1; return { ok: true }; } });
  const r = await cuaDt.guiTin(p1.khach, {}, { text: 'thử' });
  assert.equal(r.dienTap, true);
  assert.equal(goi, 0, 'chưa gửi gì cho khách thì không có gì để sale check');
  await p1.ketThuc('xong');

  // Cửa `/unread` hỏng: tin ĐÃ tới khách rồi, ném ra là worker tưởng gửi lỗi và gửi lại.
  await nhanWebhook(sb.pool, body('unread-3', 'Hello', 'khach-unread-3'), permit);
  const p2 = await moPhienRut(sb.pool, { khoaWorker: 'unread-loi' });
  const cuaLoi = bocCuaGuiBen(sb.pool, p2.tin, { guiTin: async () => ({ ok: true, id: 'm2' }) },
    { danhDauChuaDoc: async () => { throw new Error('Pancake 500'); } });
  const r2 = await cuaLoi.guiTin(p2.khach, {}, { text: 'xin chào' });
  assert.equal(r2.ok, true, 'lượt gửi vẫn THÀNH CÔNG dù đánh dấu chưa đọc hỏng');
  await p2.ketThuc('xong');
});

test('NHƯỜNG PAGE: không gọi model, và lượt nhường VÀO SỔ AI để đếm được tiền đã tiết kiệm', async () => {
  // Lượt nhường tốn 0 đồng — và đó chính là con số đáng biết. Không ghi sổ thì màn chi phí
  // chỉ thấy "đã tiêu bao nhiêu", không thấy "đã tránh được bao nhiêu lượt".
  await nhanWebhook(sb.pool, body('nhuong-1', 'magkano po', 'khach-nhuong'), permit);
  const truoc = (await sb.pool.query("SELECT count(*)::int n FROM so_ai WHERE loai='yielded'")).rows[0].n;
  const kq = await chayMotVong(sb.pool, deps({
    layKb: () => assert.fail('page đã trả lời trước ⇒ KHÔNG được chạm model'),
    docLichSu: undefined,
    docHoiThoai: async () => [{ id: 'conv-nhuong', from_psid: 'khach-nhuong', customers: [{ id: 'cust-nhuong' }] }],
    // lịch sử THẬT: tin cuối là của PAGE ⇒ cửa nhường phải bắt
    docTin: async () => [
      { id: 'a1', from: { id: 'khach-nhuong' }, message: 'magkano po' },
      { id: 'a2', from: { id: 'webhook-test' }, message: '109 SAR po' },
    ],
  }));
  assert.equal(kq.ketQua, 'nhuong_page');
  assert.match(kq.lyDo, /nhường/);
  const sau = (await sb.pool.query("SELECT count(*)::int n FROM so_ai WHERE loai='yielded'")).rows[0].n;
  assert.equal(sau, truoc + 1, 'phải đẻ ĐÚNG một dòng `yielded` trong sổ AI');
  const d = (await sb.pool.query("SELECT ma_model, token_vao FROM so_ai WHERE loai='yielded' ORDER BY id DESC LIMIT 1")).rows[0];
  assert.equal(d.ma_model, 'khong-goi-model', 'khai rõ là KHÔNG gọi model, cấm để rỗng');
  assert.equal(d.token_vao, null, 'không gọi model ⇒ token NULL, không phải 0');
});

test('sổ gửi không ghi được: không phát HTTP; mất ACK: giữ khong_ro', async () => {
  const failedDb = { query: async () => { throw Error('database unavailable'); } };
  await assert.rejects(bocCuaGuiBen(failedDb, { id: 1, team_id: team }, {
    guiTin: () => assert.fail('không được gửi trước khi lưu dấu'),
  }).guiTin({}, {}, { text: 'hello' }));
  const t = { id: 9999, team_id: team };
  await assert.rejects(bocCuaGuiBen(sb.pool, t, { guiTin: async () => { throw Error('lost ACK'); } })
    .guiTin({}, {}, { text: 'hello' }), e => e.khongThuLai === true);
  assert.equal((await sb.pool.query('SELECT trang_thai FROM lan_gui WHERE tin_id=9999')).rows[0].trang_thai, 'khong_ro');
});

test('SQL abort vẫn lưu số lần thử; chạm trần thì dừng, không release client hai lần', async () => {
  await nhanWebhook(sb.pool, body('sql-error', 'hello', 'sql-customer'), permit);
  const options = deps({
    docHoiThoai: async () => [{ id: 'sql-conv', from_psid: 'sql-customer', customers: [{ id: 'sql-cust' }] }],
    layKb: async client => { await client.query('SELECT 1/0'); },
  });
  let tinId;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await chayMotVong(sb.pool, options);
    assert.ok(result);
    tinId = result.tinId;
    const persisted = (await sb.pool.query('SELECT * FROM tin_cho_xu_ly WHERE id=$1', [tinId])).rows[0];
    assert.equal(persisted.so_lan_thu, attempt);
    assert.equal(persisted.trang_thai, attempt === 3 ? 'loi' : 'cho');
    await sb.pool.query('UPDATE tin_cho_xu_ly SET thu_lai_luc=now() WHERE id=$1', [tinId]);
  }
  assert.equal(await chayMotVong(sb.pool, options), null);
});

test('Page đổi từ poll sang webhook: tin poll còn tồn không được trả lời', async () => {
  await sb.pool.query("INSERT INTO hoi_thoai(team_id,page_id,psid,chu_so_huu,trang_thai) VALUES($1,$2,'old-poll','AI','GREET')", [team, page]);
  await xepTin(sb.pool, { teamId: team, pageId: 'webhook-test', psid: 'old-poll', convId: 'old-poll', msgId: 'old-poll', noiDung: 'hello' });
  const result = await chayMotVong(sb.pool, deps({ layKb: () => assert.fail('Page đã đổi nguồn') }));
  assert.equal(result.ketQua, 'chan_guard');
});

test('worker không rút backlog của Page ngoài allowlist', async () => {
  await xepTin(sb.pool, { teamId: team, pageId: 'outside', psid: 'outside', convId: 'outside', msgId: 'outside', noiDung: 'hello' });
  assert.equal(await moPhienRut(sb.pool, { khoaWorker: 'restricted', pageIds: [] }), null);
  assert.equal(await moPhienRut(sb.pool, { khoaWorker: 'restricted', pageIds: ['webhook-test'] }), null);
});

test('follow-up legacy bỏ qua Page đã chuyển V3 trước khi đọc hội thoại', async () => {
  const old = process.env.V3_PAGE_XU_LY;
  process.env.V3_PAGE_XU_LY = 'webhook-test';
  try {
    const r = await collectCandidates({ pages: ['webhook-test'], rows: [], registry: {},
      readinessRows: [{ pageId: 'webhook-test', aiEnabled: true, aiAllowed: true, readiness: 'READY' }],
      getConversations: async () => { assert.fail('legacy không được xử lý Page V3'); },
    });
    assert.deepEqual(r.candidates, []);
  } finally { if (old === undefined) delete process.env.V3_PAGE_XU_LY; else process.env.V3_PAGE_XU_LY = old; }
});

test('Webhook burst đã xếp hàng: gom ba tin, một lượt xử lý, giữ đủ raw events', async () => {
  const customer = 'burst-customer';
  for (const [id, text] of [['burst1','mình lấy 2'], ['burst2','ship về Vinh'], ['burst3','0987654321']]) {
    await nhanWebhook(sb.pool, body(id, text, customer), permit);
  }
  let seen, calls = 0, sends = 0;
  const r = await chayMotVong(sb.pool, deps({
    pageIds: ['webhook-test'],
    docHoiThoai: async () => [{ id: 'burst-conv', from_psid: customer, customers: [{ id: 'burst-cust' }] }],
    lanNhanh: ({ text }) => { seen = text; return { handled: false }; },
    chayCloser: async ({ state }) => { calls++; seen = state.customerText; return 'Thank you, please share your name.'; },
    cua: { guiTin: async () => { sends++; return { ok: true }; } },
  }));
  assert.equal(r.ketQua, 'xong', JSON.stringify(r));
  assert.match(seen, /mình lấy 2\nship về Vinh\n0987654321/);
  assert.equal(calls, 1); assert.equal(sends, 1);
  const rows = (await sb.pool.query('SELECT noi_dung,trang_thai FROM tin_cho_xu_ly WHERE psid=$1 ORDER BY id', [customer])).rows;
  assert.equal(rows.length, 3);
  assert.ok(rows.every(x => x.trang_thai === 'xong'));
  assert.equal(rows[0].noi_dung, 'mình lấy 2');
});
