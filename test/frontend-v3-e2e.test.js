import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { pathToFileURL } from "node:url";
import { dungSandbox } from "../db/sandbox.js";
import { dungPhanB } from "../v3/src/vai-b.js";
import { taoTruyVanThat } from "../v3/src/noi-day/cong-du-lieu-that.js";
import { taoCongDanhTinh } from "../v3/src/noi-day/cong-danh-tinh.js";
import { taoRouterVanHanh } from "../v3/src/ui/van-hanh/router.js";
import { bam } from "../v3/src/auth/index.js";
import { maHoa } from "../db/khoa.js";
import { xepTin, docTinTheoId, nhipMayBot } from "../src/queue/kho.js";
import { xoaNhoNhip } from "../v3/src/ui/chung/nhip-may-bot.js";
import { xuLyMotTin } from "../src/chat/handler-v3.js";
import { noiVanHanhV3 } from "../v3/src/noi-day/van-hanh-v3.js";
import { docDanhMuc } from "../src/pos/doc-danh-muc.js";
import { vaoHangCho } from "../src/orders/hang-cho.js";

// No real LLM/channel/POS: PostgreSQL + real Express/auth/UI + injected external transport.
// BROWSER_DRIVER points to puppeteer-core when running the browser acceptance suite.
test("V3 UI → authenticated HTTP → PostgreSQL → chat/order services", async (t) => {
  process.env.V3_KHOA_VE = "e2e-only-signing-key-".repeat(3);
  process.env.V3_KHOA_MA_HOA = "c".repeat(64);
  const sb = await dungSandbox("frontend_v3");
  const pool = sb.pool;
  let server, browser;
  const one = async (sql, args = []) => (await pool.query(sql, args)).rows[0];
  try {
    const team = (await one("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
    const other = (
      await one(
        "INSERT INTO team(slug,ten) VALUES('e2e-other','Other') RETURNING id",
      )
    ).id;
    const password = "E2e-password-only-123";
    for (const [email, role, teamId] of [
      ["admin@e2e.test", "quan-tri", team],
      ["sale@e2e.test", "sale", team],
      ["manager@e2e.test", "quan-ly", team],
      ["other@e2e.test", "quan-tri", other],
    ]) {
      const user = await one(
        "INSERT INTO nguoi_dung(email,ten,mat_khau_hash) VALUES($1,$1,$2) RETURNING id",
        [email, await bam(password)],
      );
      await pool.query(
        "INSERT INTO thanh_vien_team(team_id,nguoi_dung_id,vai_id) SELECT $1,$2,id FROM vai WHERE ma=$3",
        [teamId, user.id, role],
      );
    }
    const page = await one(
      "INSERT INTO page(team_id,page_id,ten,pos_shop_id,v3_ai_bat) VALUES($1,'e2e-page','Page thử UI','9995001',false) RETURNING *",
      [team],
    );
    const ma = "9995001:3e272c3b-ea70-4d10-981e-e9049090322b";
    const product = await one(
      "INSERT INTO san_pham(team_id,page_id,ma,ten,mo_ta) VALUES($1,$2,$3,'Sản phẩm thử','Thông tin chuẩn') RETURNING *",
      [team, page.id, ma],
    );
    await pool.query(
      "INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,2,19900,'AED')",
      [team, product.id],
    );
    await pool.query(
      "INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma) VALUES($1,'E2E','9995001',$2)",
      [team, maHoa("fake-pos-key")],
    );
    const env = {
      V3_PAGE_XU_LY: "e2e-page",
      V3_PANCAKE_GUI: "1",
      V3_RAP_PROMPT_BAT: "1",
      ANTHROPIC_API_KEY: "fake-only",
      V3_POS_GHI: "1",
      V3_KHOA_MA_HOA: process.env.V3_KHOA_MA_HOA,
    };
    let posPosts = 0;
    const nap = async (_url, opts = {}) => {
      if (opts.method === "POST") posPosts++;
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify(
            opts.method === "POST"
              ? { data: { id: 777777 + posPosts } }
              : { data: [], total_entries: 0 },
          ),
      };
    };
    const app = express();
    dungPhanB(app, {
      express,
      vanHanh: { pool, env, orderDeps: { env, nap } },
      taoTruyVan: (bc) => taoTruyVanThat(pool, bc),
      taoTruyVanHeThong: () => taoCongDanhTinh(pool),
      docSanSang: noiVanHanhV3(pool, env, {
        docLegacy: async () => ({ pages: [] }),
      }),
      docNhipMayBot: (bc) => nhipMayBot(pool, { teamId: bc?.teamId ?? null }),
    });

    server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    async function login(email) {
      const r = await fetch(base + "/api/dang-nhap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, matKhau: password }),
      });
      assert.equal(r.status, 200, await r.text());
      return r.headers.get("set-cookie").split(";")[0];
    }
    const managerCookie = await login("manager@e2e.test");
    const cookie = await login("admin@e2e.test"),
      otherCookie = await login("other@e2e.test"),
      saleCookie = await login("sale@e2e.test");
    /** Bấm công tắc bot qua CỬA DUY NHẤT (màn «Tất cả page»). */
    async function batBot(id, bat, c = cookie) {
      const r = await fetch(base + `/api/page-bot/${encodeURIComponent(id)}/bot`, {
        method: "POST",
        headers: { Cookie: c, "Content-Type": "application/json", "X-V3-Action": "1" },
        body: JSON.stringify({ bat }),
      });
      const d = await r.json().catch(() => ({}));
      return { status: r.status, ...d };
    }

    async function req(path, body, c = cookie, headers = {}) {
      const r = await fetch(base + "/api/van-hanh/" + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Cookie: c,
          "Content-Type": "application/json",
          "X-V3-Action": "1",
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: r.status, ...(await r.json()) };
    }
    await t.test("Auth, roles, team isolation, CSRF and SQL ids", async () => {
      assert.equal((await req("orders", undefined, saleCookie)).status, 403);
      assert.equal((await req("orders", undefined, managerCookie)).status, 200);
      assert.equal(
        (await req(`conversations/1/handoff`, {}, managerCookie)).status,
        403,
      );
      const guestPage = await fetch(base + "/van-hanh-v3", { redirect: "manual" });
      assert.equal(guestPage.status, 302);
      assert.equal(guestPage.headers.get("location"), "/dang-nhap?tiep=%2Fvan-hanh-v3");
      assert.equal((await req("orders", undefined, "")).status, 401);
      assert.equal((await req("products", undefined, saleCookie)).status, 403);
      assert.equal(
        (await req("products", undefined, otherCookie)).items.length,
        0,
      );
      assert.equal(
        (await req(`pages/${page.id}`, { source: "poll" }, otherCookie)).status,
        404,
      );
      assert.equal(
        (
          await req(`pages/${page.id}`, { source: "poll" }, cookie, {
            "X-V3-Action": "",
          })
        ).status,
        403,
      );
      assert.equal((await req("conversations/1%20OR%201=1")).status, 400);
    });
    await t.test(
      "Product price edit, stale write rejection, backend authoritative price",
      async () => {
        const p = (await req("products")).items[0];
        const data = {
          version: p.version,
          ten: p.ten,
          mo_ta: p.mo_ta,
          het_hang: false,
          offers: [{ so_luong: 2, price: 199, tien_te: "AED" }],
        };
        assert.equal(
          (
            await req(`products/${p.id}`, {
              ...data,
              offers: [{ so_luong: 2, price: 0.001, tien_te: "AED" }],
            })
          ).status,
          400,
        );
        assert.equal((await req(`products/${p.id}`, data)).ok, true);
        // GD5 · 25/09: nhật ký sửa giá phải dựng lại được GIÁ CŨ. Trước lượt này nó chỉ ghi
        // tên cột («goi_gia»), nên sau một lượt sửa không ai biết giá trước là bao nhiêu —
        // mà đó đúng là con số khách trả.
        {
          const nk = await one(
            `SELECT truoc, sau FROM nhat_ky WHERE doi_tuong='san_pham' AND doi_tuong_id=$1
               AND hanh_dong='v3_sua_san_pham' ORDER BY id DESC LIMIT 1`,
            [String(p.id)],
          );
          assert.ok(nk, "sửa giá phải để lại một dòng nhật ký");
          assert.ok(Array.isArray(nk.sau.goi_gia) && nk.sau.goi_gia.length === 1,
            "nhật ký phải ghi gói giá MỚI, không chỉ tên cột");
          assert.equal(Number(nk.sau.goi_gia[0].gia), 19900, "giá mới ghi bằng đơn vị nhỏ");
          assert.ok(Array.isArray(nk.truoc.goi_gia), "và phải ghi cả gói giá CŨ");
        }
        assert.equal((await req(`products/${p.id}`, data)).status, 409);
        assert.equal(
          Number(
            (await one("SELECT gia FROM goi_gia WHERE san_pham_id=$1", [p.id]))
              .gia,
          ),
          19900,
        );
      },
    );
    await t.test(
      "Existing Page UI switch is routed to V3; POS sync preserves manual configuration",
      async () => {
        const r = await fetch(base + `/api/page-bot/${page.id}/bot`, {
          method: "POST",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: JSON.stringify({ bat: false }),
        });
        assert.equal(r.status, 200, await r.text());
        assert.equal(
          (await one("SELECT v3_ai_bat FROM page WHERE id=$1", [page.id]))
            .v3_ai_bat,
          false,
        );
        await docDanhMuc(
          pool,
          { teamId: team },
          { shop: "E2E", tienTe: "AED" },
          {
            env,
            nap: async () => ({
              ok: true,
              status: 200,
              text: async () =>
                JSON.stringify({
                  data: [
                    {
                      id: ma.split(":")[1],
                      product: { name: "Name from POS" },
                      remain_quantity: 0,
                      retail_price: 100,
                    },
                  ],
                  total_entries: 1,
                }),
            }),
          },
        );
        const saved = await one(
          "SELECT ten,het_hang FROM san_pham WHERE id=$1",
          [product.id],
        );
        assert.equal(saved.ten, product.ten);
        assert.equal(saved.het_hang, false);
        assert.equal(
          (
            await one(
              "SELECT count(*)::int AS n FROM goi_gia WHERE san_pham_id=$1",
              [product.id],
            )
          ).n,
          1,
        );
      },
    );
    const h = await one(
      "INSERT INTO hoi_thoai(team_id,page_id,psid,chu_so_huu,trang_thai) VALUES($1,$2,'chat-test','AI','SELLING') RETURNING *",
      [team, page.id],
    );
    const queued = await xepTin(pool, {
      teamId: team,
      pageId: "e2e-page",
      psid: "chat-test",
      convId: "conv-chat",
      msgId: "e2e-message",
      noiDung: "Hello",
    });
    const tin = await docTinTheoId(pool, queued.id, team);
    let sent = 0;
    const chatDeps = {
      layKb: () => ({ text: "Known product", config: {}, products: [] }),
      layModel: () => ({ maModel: "fake" }),
      lanNhanh: () => ({ handled: true, reply: "Hello", lane: "test" }),
      kiemTinRa: () => ({ ok: true }),
      cua: {
        guiTin: async () => {
          sent++;
          return { ok: true };
        },
      },
    };
    await t.test(
      "UI switch stops real handler; enable permits reply; handoff/resume persists",
      async () => {
        await xuLyMotTin(pool, tin, chatDeps);
        assert.equal(sent, 0);
        // GD2 · 25/09: công tắc có ĐÚNG MỘT cửa — `/api/page-bot/:id/bot`. Cửa cũ
        // `/api/van-hanh/pages/:id` nay TỪ CHỐI `enabled` (ca riêng ở dưới canh điều đó).
        assert.equal((await batBot(page.id, true)).ok, true);
        await xuLyMotTin(pool, tin, chatDeps);
        assert.equal(sent, 1);
        assert.equal(
          (await req(`conversations/${h.id}/handoff`, { lyDo: "khách hỏi giá sỉ" })).ok,
          true,
        );
        // GD5 · 25/09: bàn giao PHẢI đẻ ra một dòng ở «Việc đang chờ» — màn duy nhất vai sale
        // thấy. Trước lượt này bàn giao chỉ đổi chủ sở hữu, nên sale không bao giờ biết có
        // khách đang chờ mình (đo 22/09: 0 dòng việc / 56 hội thoại HANDOFF).
        const viec = await pool.query(
          "SELECT ly_do_day, dong_luc FROM viec_can_xu_ly WHERE loai='hoi_thoai' AND hoi_thoai_id=$1",
          [h.id],
        );
        assert.equal(viec.rowCount, 1, "bàn giao phải đẻ đúng MỘT dòng việc");
        assert.match(viec.rows[0].ly_do_day, /giá sỉ/, "dòng việc phải mang lý do");
        // Bấm bàn giao lần nữa KHÔNG được đẻ dòng thứ hai: sale sẽ thấy một khách hai lần và
        // không biết cái nào là thật.
        assert.equal((await req(`conversations/${h.id}/handoff`, {})).ok, true);
        assert.equal(
          (await pool.query(
            "SELECT count(*)::int AS n FROM viec_can_xu_ly WHERE loai='hoi_thoai' AND hoi_thoai_id=$1",
            [h.id],
          )).rows[0].n,
          1,
          "bàn giao lần hai không được đẻ thêm dòng",
        );
        await xuLyMotTin(pool, tin, chatDeps);
        assert.equal(sent, 1);
        assert.equal(
          (
            await req(`conversations/${h.id}/resume`, {
              reason: "Đã xử lý xong",
            })
          ).status,
          400,
        );
        await pool.query(
          "UPDATE tin_cho_xu_ly SET trang_thai='xong' WHERE id=$1",
          [tin.id],
        );
        assert.equal(
          (
            await req(`conversations/${h.id}/resume`, {
              reason: "Đã xử lý xong",
            })
          ).ok,
          true,
        );
        assert.equal(
          (await req(`conversations/${h.id}`)).item.chu_so_huu,
          "AI",
        );
        assert.equal(
          (await req(`conversations/${h.id}`, undefined, otherCookie)).status,
          404,
        );
        assert.equal(
          (await req(`pages/${page.id}`, { source: "webhook" })).status,
          409,
        );
        assert.equal((await batBot(page.id, false)).ok, true);
        assert.equal(
          (await req(`pages/${page.id}`, { source: "webhook" })).ok,
          true,
        );
        assert.equal(
          (await req(`pages/${page.id}`, { source: "poll" })).ok,
          true,
        );
      },
    );
    // GD5 · 25/09 — «MÁY CHẠY BOT CÒN SỐNG KHÔNG». Đo bằng CHÍNH hàng đợi tin, vì
    // 08–10/08/2026 tiến trình vẫn `active` suốt hai ngày trong khi không khách nào được
    // trả lời. Ca này chạy trên PostgreSQL thật, nên nó canh luôn câu SQL (FILTER +
    // EXTRACT) chứ không chỉ canh luật xét.
    await t.test(
      "Worker liveness is measured from the real queue and reaches both the strip and the health light",
      async () => {
        const nhip = await nhipMayBot(pool, { teamId: team });
        assert.equal(nhip.dangCho, 0);
        assert.ok(nhip.daXu >= 1, "tin vừa chốt `xong` phải được đếm là đã xử");
        assert.ok(
          Number.isInteger(nhip.xongGanNhatGiay),
          "phải đo được khoảng cách tới lượt xử gần nhất",
        );
        assert.equal(
          nhip.choLauNhatGiay,
          null,
          "không có tin chờ thì không có tuổi chờ — null, KHÔNG phải 0",
        );

        xoaNhoNhip();
        const suc = await (
          await fetch(base + "/api/suc-khoe", { headers: { cookie } })
        ).json();
        const den = suc.den.find((d) => d.ma === "may_chay_bot");
        assert.ok(den, "màn «Hệ còn sống không» phải có đèn Máy chạy bot");
        assert.equal(den.muc, "xanh", "vừa xử xong một tin thì đèn xanh");
        const dai = await (
          await fetch(base + "/api/trang-thai-bot", { headers: { cookie } })
        ).json();
        assert.equal(
          dai.may.muc,
          "xanh",
          "dải trạng thái và màn sức khoẻ phải đọc CÙNG một nguồn",
        );

        // Máy chạy bot đứng: một tin của khách nằm chờ, và không tin nào được xử.
        const treo = await xepTin(pool, {
          teamId: team,
          pageId: "e2e-page",
          psid: "chat-test",
          convId: "conv-chat",
          msgId: "e2e-message-treo",
          noiDung: "Còn hàng không shop?",
        });
        await pool.query(
          "UPDATE tin_cho_xu_ly SET thoi_diem = now() - interval '20 minutes' WHERE id=$1",
          [treo.id],
        );
        await pool.query(
          "UPDATE tin_cho_xu_ly SET sua_luc = now() - interval '20 minutes' WHERE team_id=$1 AND trang_thai IN ('xong','loi','chan_guard')",
          [team],
        );
        xoaNhoNhip();
        const suc2 = await (
          await fetch(base + "/api/suc-khoe", { headers: { cookie } })
        ).json();
        const den2 = suc2.den.find((d) => d.ma === "may_chay_bot");
        assert.equal(den2.muc, "do");
        assert.match(
          den2.vi,
          /KHÔNG ai trả lời/,
          "đèn đỏ phải nói hậu quả bằng lời người vận hành đọc được",
        );
        assert.ok(den2.diTiep && den2.diTiep.chu, "đèn đỏ phải chỉ việc phải làm");
        xoaNhoNhip();
        const dai2 = await (
          await fetch(base + "/api/trang-thai-bot", { headers: { cookie } })
        ).json();
        assert.equal(dai2.may.muc, "do", "dải trạng thái phải đỏ theo");

        // Dọn lại để những ca sau không thừa hưởng một hàng đợi đang kẹt.
        await pool.query("UPDATE tin_cho_xu_ly SET trang_thai='xong', sua_luc=now() WHERE id=$1", [treo.id]);
        xoaNhoNhip();
      },
    );
    await t.test(
      "Uncertain delivery can be reconciled without sending again, with operator audit",
      async () => {
        await pool.query(
          "UPDATE tin_cho_xu_ly SET trang_thai='loi' WHERE id=$1",
          [tin.id],
        );
        await pool.query(
          "INSERT INTO lan_gui(team_id,tin_id,buoc,loai,noi_dung,trang_thai) VALUES($1,$2,1,'guiTin','{\"text\":\"Test reply\"}','khong_ro')",
          [team, tin.id],
        );
        const detail = await req(`conversations/${h.id}`);
        assert.equal(detail.outgoing[0].trang_thai, "khong_ro");
        const result = await req(`messages/${tin.id}/reconcile`, {
          reason: "Đã kiểm tra kênh, sale xử lý tiếp",
        });
        assert.equal(result.ok, true);
        assert.equal(result.resent, false);
        assert.equal(sent, 1);
        assert.equal(
          (await req(`conversations/${h.id}`)).item.chu_so_huu,
          "SALE",
        );
        assert.ok(
          (
            await one(
              "SELECT nguoi_dung_id FROM nhat_ky WHERE hanh_dong='chat_doi_chieu_nguoi' ORDER BY id DESC LIMIT 1",
            )
          ).nguoi_dung_id,
        );
      },
    );
    const orderH = await one(
      "INSERT INTO hoi_thoai(team_id,page_id,psid,chu_so_huu,trang_thai) VALUES($1,$2,'buyer','AI','CLOSING') RETURNING *",
      [team, page.id],
    );
    await pool.query(
      "INSERT INTO tin_cho_xu_ly(team_id,page_id,psid,conv_id,msg_id,noi_dung,trang_thai) VALUES($1,'e2e-page','buyer','conv-buyer','buyer-1','yes confirm','xong')",
      [team],
    );
    const draft = await vaoHangCho(
      pool,
      { teamId: team },
      {
        hoiThoaiId: orderH.id,
        hoSo: {
          ten: "Sara",
          sdt: "+971500000777",
          dia_chi: "Dubai 1",
          thanh_pho: "Dubai",
          so_luong: 2,
          tong_tien: 19900,
          tien_te: "AED",
          san_pham_ma: ma,
          kho_hang: "warehouse-test",
        },
        convId: "conv-buyer",
      },
      { env, nap },
    );
    await t.test(
      "New V3 queue visible; approval validates and creates once",
      async () => {
        assert.ok((await req("orders")).items.some((o) => o.id === draft.id));
        assert.equal(
          (await req(`orders/${draft.id}`, undefined, otherCookie)).status,
          404,
        );
        const o = (await req(`orders/${draft.id}`)).item;
        const results = await Promise.all([
          req(`orders/${draft.id}/approve`, { version: o.version }),
          req(`orders/${draft.id}/approve`, { version: o.version }),
        ]);
        assert.equal(
          results.filter((r) => r.result?.tao).length,
          1,
          JSON.stringify(results),
        );
        assert.equal(posPosts, 1);
      },
    );
    const browserH = await one(
      "INSERT INTO hoi_thoai(team_id,page_id,psid,chu_so_huu,trang_thai) VALUES($1,$2,'browser-buyer','AI','CLOSING') RETURNING *",
      [team, page.id],
    );
    await pool.query(
      "INSERT INTO tin_cho_xu_ly(team_id,page_id,psid,conv_id,msg_id,noi_dung,trang_thai) VALUES($1,'e2e-page','browser-buyer','conv-browser-buyer','browser-buyer-1','yes confirm','xong')",
      [team],
    );
    const browserDraft = await vaoHangCho(
      pool,
      { teamId: team },
      {
        hoiThoaiId: browserH.id,
        hoSo: {
          ...draft.dong?.du_lieu_don,
          ten: "Browser Customer",
          sdt: "+971500000778",
          dia_chi: "Dubai 2",
          thanh_pho: "Dubai",
          so_luong: 2,
          tong_tien: 19900,
          tien_te: "AED",
          san_pham_ma: ma,
          kho_hang: "warehouse-test",
        },
        convId: "conv-browser-buyer",
      },
      { env, nap },
    );
    if (process.env.BROWSER_DRIVER) {
      await t.test(
        "Browser: login, navigation, edit price, page switch, conversation and order views",
        async () => {
          const { default: puppeteer } = await import(
            pathToFileURL(process.env.BROWSER_DRIVER)
          );
          browser = await puppeteer.launch({
            executablePath:
              process.env.BROWSER_BINARY ||
              "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
            headless: true,
            args: ["--no-sandbox", "--disable-gpu"],
          });
          const pageBrowser = await browser.newPage();
          const errors = [];
          pageBrowser.on("pageerror", (e) => errors.push(e.message));
          await pageBrowser.setRequestInterception(true);
          pageBrowser.on("request", (r) =>
            r.url().startsWith(base) || r.url().startsWith("data:")
              ? r.continue()
              : r.abort(),
          );
          await pageBrowser.goto(base + "/dang-nhap");
          await pageBrowser.type("#email", "admin@e2e.test");
          await pageBrowser.type("#mk", password);
          await Promise.all([
            pageBrowser.waitForNavigation(),
            pageBrowser.click("#nut"),
          ]);
          await pageBrowser.goto(base + "/van-hanh-v3");
          const click = async (text) => {
            await pageBrowser.waitForFunction(
              (text) =>
                Array.from(document.querySelectorAll("button")).some(
                  (b) => b.textContent === text && !b.disabled,
                ),
              {},
              text,
            );
            await pageBrowser.evaluate(
              (text) =>
                Array.from(document.querySelectorAll("button"))
                  .find((b) => b.textContent === text)
                  .click(),
              text,
            );
          };
          await pageBrowser.waitForFunction(() =>
            document.querySelector("#list").textContent.includes("Đơn #"),
          );
          await click("Xem / xử lý đơn");
          await pageBrowser.waitForFunction(
            () =>
              document.querySelector("dialog").open &&
              document
                .querySelector("#content")
                .textContent.includes("cho_duyet"),
          );
          // Edit and save through visible controls, then approve through the real business service.
          await pageBrowser.evaluate(() => {
            document.querySelector("dialog input").value =
              "Browser Customer Updated";
          });
          await click("Lưu thông tin đơn");
          await pageBrowser.waitForFunction(() =>
            document
              .querySelector("#detail-status")
              .textContent.includes("Đã lưu"),
          );
          await click("Duyệt tạo đơn POS");
          await pageBrowser.waitForFunction(() =>
            document
              .querySelector("#detail-status")
              .textContent.includes("Cần xác nhận"),
          );
          await pageBrowser.click("dialog input[type=checkbox]");
          await click("Duyệt tạo đơn POS");
          await pageBrowser.waitForFunction(() =>
            document.querySelector("#content").textContent.includes("da_duyet"),
          );
          assert.equal(
            (
              await one("SELECT trang_thai FROM hang_cho_tao_don WHERE id=$1", [
                browserDraft.id,
              ])
            ).trang_thai,
            "da_duyet",
          );
          assert.equal(posPosts, 2);
          await click("Đóng");
          await click("Sản phẩm & giá");
          await click("Chỉnh sản phẩm và giá");
          await pageBrowser.waitForSelector("dialog[open] textarea");
          await pageBrowser.evaluate(() => {
            document.querySelector("dialog textarea").value =
              "Mô tả đã cập nhật từ trình duyệt";
          });
          await click("Lưu sản phẩm");
          await pageBrowser.waitForFunction(
            () => !document.querySelector("dialog").open,
          );
          assert.equal(
            (await one("SELECT mo_ta FROM san_pham WHERE id=$1", [product.id]))
              .mo_ta,
            "Mô tả đã cập nhật từ trình duyệt",
          );
          await click("Page & trạng thái");
          await click("Bật AI");
          await pageBrowser.waitForFunction(() =>
            document.querySelector("#list").textContent.includes("AI bật"),
          );
          await click("Tắt AI");
          await pageBrowser.waitForFunction(() =>
            document.querySelector("#list").textContent.includes("AI tắt"),
          );
          await click("Hội thoại");
          await click("Mở hội thoại");
          await pageBrowser.waitForFunction(() =>
            document
              .querySelector("#content")
              .textContent.includes("Thông tin khách đã thu thập"),
          );
          assert.deepEqual(errors, []);
          await pageBrowser.screenshot({
            path: "/tmp/chatbot-frontend-v3-e2e.png",
            fullPage: true,
          });
        },
      );
    }
  } finally {
    await browser?.close();
    if (server) await new Promise((r) => server.close(r));
    await sb.don();
  }
});
