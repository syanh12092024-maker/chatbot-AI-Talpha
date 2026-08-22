// Bài test đầu tiên của vai B — chứng minh `npm test` có chạy tới thư mục v3/test/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { batBuocBoiCanh, taoBoiCanh, LoiThieuBoiCanh, VAI } from '../../src/auth/boi-canh.js';
import { dungCongGia, LoiXuyenTeam } from '../../testkit/db-gia.js';

test('nền vai B · thiếu bối cảnh team thì NÉM LỖI, không trả rỗng', () => {
  assert.throws(() => batBuocBoiCanh(undefined), LoiThieuBoiCanh);
  assert.throws(() => batBuocBoiCanh({ vai: ['sale'] }), LoiThieuBoiCanh);
});

test('nền vai B · cổng giả chèn điều kiện team và chặn xuyên team', async () => {
  const { taoTruyVan, kho } = dungCongGia({
    khach: [{ team_id: 't1', ten: 'A' }, { team_id: 't2', ten: 'B' }],
  });
  const bc = taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.SALE] });
  const db = taoTruyVan(bc);
  assert.deepEqual((await db.chon('khach')).map((r) => r.ten), ['A']);
  await assert.rejects(() => db.chon('khach', { team_id: 't2' }), LoiXuyenTeam);
  assert.equal(kho.nhatKy.filter((n) => n.hanh_dong === 'chan_xuyen_team').length, 1);
});
