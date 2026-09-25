import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import { xuLyMotTin, guiDaXacNhan } from '../src/chat/handler-v3.js';
import { xepTin, docTinTheoId } from '../src/queue/kho.js';
import { chayMotVong } from '../src/queue/worker.js';
import { rapKb, goiGiaChoChat } from '../src/chat/rap-prompt.js';
import { guiTaoDon } from '../src/pos/tao-don.js';
import { config, assertConfig } from '../src/config.js';
import { verifySignature } from '../src/messenger.js';
import { recordClosedOrder } from '../src/order-bridge.js';
import { suaHoiThoai } from '../src/chat/kho.js';

let sb, team, page;
let sequence = 0;
before(async () => {
  sb = await dungSandbox('phase0safety');
  team = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  page = (await sb.pool.query("INSERT INTO page(team_id,page_id,ten,pos_shop_id) VALUES($1,'phase0','Test','shop1') RETURNING id", [team])).rows[0].id;
});
after(async () => { await sb?.don(); });

async function incoming(owner = 'AI', stage = 'SELLING', text = 'hello') {
  const psid = `customer-${++sequence}`;
  await sb.pool.query('INSERT INTO hoi_thoai(team_id,page_id,psid,chu_so_huu,trang_thai) VALUES($1,$2,$3,$4,$5)', [team, page, psid, owner, stage]);
  const item = await xepTin(sb.pool, { teamId: team, pageId: 'phase0', psid, convId: psid, msgId: psid, noiDung: text });
  return docTinTheoId(sb.pool, item.id, team);
}
function deps(extra = {}) {
  return { layKb: () => ({ products: [], text: 'test' }), layModel: () => ({ maModel: 'test' }),
    lanNhanh: () => ({ handled: true, reply: 'Hello', lane: 'test' }),
    kiemTinRa: () => ({ ok: true }), cua: { guiTin: async () => ({ ok: true }) }, ...extra };
}
async function conversation(tin) {
  return (await sb.pool.query('SELECT * FROM hoi_thoai WHERE team_id=$1 AND page_id=$2 AND psid=$3', [team, page, tin.psid])).rows[0];
}

test('sale, Botcake, handoff và đơn đã chốt: không đọc KB, gọi model hay gửi tin', async () => {
  for (const [owner, stage] of [['SALE','SELLING'], ['BOTCAKE','GREET'], ['AI','HANDOFF'], ['AI','CLOSING'], ['AI','POST_SALE']]) {
    const tin = await incoming(owner, stage);
    const before = await conversation(tin);
    const result = await xuLyMotTin(sb.pool, tin, deps({ layKb: () => { throw Error('không được đọc KB'); } }));
    assert.equal(result.ketQua, 'chan_guard');
    assert.deepEqual(await conversation(tin), before);
    await sb.pool.query("UPDATE tin_cho_xu_ly SET trang_thai='chan_guard' WHERE id=$1", [tin.id]);
  }
});

test('template vẫn lưu SĐT; gửi thất bại không tăng lượt hoặc ghi reply thành công', async () => {
  const tin = await incoming('AI', 'SELLING', '0536064249');
  await xuLyMotTin(sb.pool, tin, deps());
  const row = await conversation(tin);
  assert.equal(row.ho_so.phone, '0536064249');
  assert.equal(row.luot_ai, 1);
  await sb.pool.query("UPDATE tin_cho_xu_ly SET trang_thai='xong' WHERE id=$1", [tin.id]);
  const failed = await incoming();
  const result = await chayMotVong(sb.pool, deps({ docLichSu: false, cua: { guiTin: async () => ({ ok: false }) } }));
  assert.equal(result.tinId, failed.id);
  assert.equal(result.ketQua, 'loi');
  assert.equal(result.soLanThu, 1);
  assert.equal((await conversation(failed)).luot_ai, 0);
  assert.equal((await sb.pool.query("SELECT count(*)::int n FROM so_ai WHERE nguon_dong=$1 AND nguon_tep='tin_cho_xu_ly:reply'", [failed.id])).rows[0].n, 0);
  assert.equal(await chayMotVong(sb.pool, deps({ docLichSu: false })), null);
});

test('sale tiếp quản trong lúc chuẩn bị câu trả lời: không gửi và không ghi đè owner', async () => {
  const tin = await incoming();
  const result = await xuLyMotTin(sb.pool, tin, deps({
    layKb: async () => {
      await sb.pool.query("UPDATE hoi_thoai SET chu_so_huu='SALE' WHERE page_id=$1 AND psid=$2", [page, tin.psid]);
      return { products: [], text: 'test' };
    },
    cua: { guiTin: () => { throw Error('không được gửi'); } },
  }));
  assert.equal(result.ketQua, 'chan_guard');
  assert.equal((await conversation(tin)).chu_so_huu, 'SALE');
});

test('mất ACK hoặc kết quả không hợp lệ đều không tự thử lại', async () => {
  for (const send of [async () => undefined, async () => ({ ok: false }), async () => { throw Error('timeout'); }]) {
    await assert.rejects(guiDaXacNhan(send), e => e.khongThuLai === true);
  }
});

test('snapshot AI cũ không ghi đè quyền SALE trong câu UPDATE', async () => {
  const tin = await incoming('SALE');
  const row = await conversation(tin);
  const saved = await suaHoiThoai(sb.pool, { teamId: team, id: row.id,
    giaTri: { chu_so_huu: 'AI', ho_so: { phone: 'stale' } },
    neu: { chu_so_huu: 'AI', trang_thai: 'SELLING' } });
  assert.equal(saved, null);
  assert.deepEqual(await conversation(tin), row);
});

test('production thiếu secret/auth không khởi động và không chấp nhận webhook không ký', () => {
  const env = process.env.NODE_ENV;
  const old = { appSecret: config.appSecret, adminUser: config.adminUser, adminPass: config.adminPass };
  try {
    process.env.NODE_ENV = 'production';
    Object.assign(config, { appSecret: '', adminUser: '', adminPass: '' });
    assert.throws(assertConfig, /APP_SECRET.*ADMIN_USER.*ADMIN_PASS/);
    assert.equal(verifySignature(Buffer.from('{}'), undefined), false);
  } finally {
    Object.assign(config, old);
    if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env;
  }
});

test('không báo đã ghi nhận đơn khi lưu hàng chờ thất bại', async () => {
  const old = process.env.ORDER_QUEUE_FILE;
  // Đường dẫn bên dưới một tệp source không thể là thư mục ghi hàng chờ.
  process.env.ORDER_QUEUE_FILE = `${import.meta.filename}/queue.json`;
  try {
    await assert.rejects(recordClosedOrder('test', 'test', {}, 'test', {
      kb: { products: [] }, skipNote: true,
    }), /Không lưu được/);
  } finally {
    if (old === undefined) delete process.env.ORDER_QUEUE_FILE; else process.env.ORDER_QUEUE_FILE = old;
  }
});

test('POS 5xx/2xx thiếu id/408 là chưa rõ kết quả, 400 là từ chối rõ ràng', async () => {
  for (const [status, body, known] of [[503,'{}',false], [200,'invalid',false], [200,'{}',false], [408,'{}',false], [400,'{}',true]]) {
    await assert.rejects(guiTaoDon({ shopId: 'fake', apiKey: 'fake' }, {}, {
      nap: async () => ({ ok: status === 200, status, text: async () => body }),
    }), e => e.coPhanHoi === known);
  }
});

test('Page thay thế dùng sản phẩm gốc, chỉ lấy giá đúng shop và quy đổi minor → major', async () => {
  await sb.pool.query("INSERT INTO san_pham_goc(team_id,ma_goc,ten) VALUES($1,'watch','Watch')", [team]);
  await sb.pool.query("UPDATE page SET san_pham_goc_ma='watch' WHERE id=$1", [page]);
  for (const [shop, price] of [['shop1',10900], ['shop2',99900]]) {
    const sp = (await sb.pool.query("INSERT INTO san_pham(team_id,ma,ten,ma_goc) VALUES($1,$2,'Watch','watch') RETURNING id", [team, `${shop}:variant`])).rows[0].id;
    await sb.pool.query("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,2,$3,'AED')", [team, sp, price]);
  }
  const old = process.env.V3_RAP_PROMPT_BAT;
  process.env.V3_RAP_PROMPT_BAT = '1';
  try {
    const kb = await rapKb(sb.pool, { teamId: team, pageIdText: 'phase0' });
    assert.equal(kb.products.length, 1);
    assert.equal(kb.products[0].id, 'shop1:variant');
    assert.equal(kb.products[0].currency, 'AED');
    assert.equal(kb.products[0].tiers[0].price, 109);
    assert.match(kb.text, /109 AED/);
    assert.doesNotMatch(kb.text, /10900 AED|999 AED/);
    assert.throws(() => goiGiaChoChat({ gia: 100, tien_te: 'UNKNOWN', so_luong: 1 }));
  } finally {
    if (old === undefined) delete process.env.V3_RAP_PROMPT_BAT; else process.env.V3_RAP_PROMPT_BAT = old;
  }
});
