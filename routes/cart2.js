import express from "express";
import db from "./../utils/connect-mysql.js";

const router = express.Router();

/*
購物車 (會員要先登入)
  C: 加到購物車
  R: 查看購物車內容
  U: 變更某一項的數量
  D: 刪除某一項, 清空購物車
  */

// 登入後再可以使用
router.use((req, res, next) => {
  if (!req.session.admin) {
    return res.status(403).json({ success: false, info: "需要登入會員" });
  }
  next();
});

/*
router.get("/", async (req, res) => {
  res.json({ method: "GET" });
});
router.post("/", async (req, res) => {
  res.json({ method: "POST" });
});
*/
// **************** 加入商品
router.post("/add/:pid/:qty?", async (req, res) => {
  const pid = +req.params.pid || 0; // 編號
  const qty = +req.params.qty || 1;
  if (!pid) {
    return res.json({ success: false, info: "沒有商品編號" });
  }
  // 查看商品資料
  const sql = "SELECT sid FROM products WHERE sid=?";
  const [rows] = await db.query(sql, [pid]);
  if (!rows.length) {
    return res.json({ success: false, info: "沒有這項商品" });
  }
  // 寫入 cart2 表
  const sql2 = `INSERT INTO cart2 (member_id, product_id, quantity) 
    VALUES (${req.session.admin.id}, ${pid}, ${qty})`;

  const [result] = await db.query(sql2);
  res.json({
    success: !!result.affectedRows,
  });
});
// **************** 取得內容
router.get("/", async (req, res) => {
  const sql = `
  SELECT 
    c.product_id, c.quantity, p.author, p.bookname, 
    p.book_id, p.publish_date, p.price
  FROM cart2 c
    JOIN products p ON c.product_id=p.sid
    WHERE c.member_id=${req.session.admin.id}
    ORDER BY c.created_at
  `;

  const [rows] = await db.query(sql);
  res.json(rows);
});

// **************** 變更某項的數量
router.put("/update/:pid/:qty", async (req, res) => {
  const pid = +req.params.pid || 0; // 編號
  const qty = +req.params.qty || 0;
  if (!pid || !qty) {
    return res.json({ success: false, info: "沒有商品編號或沒有數量" });
  }
  const sql = `UPDATE cart2 SET quantity=? WHERE member_id=? AND product_id=?`;
  const [result] = await db.query(sql, [qty, req.session.admin.id, pid]);

  res.json({
    success: !!(result.affectedRows && result.changedRows),
    pid,
    qty,
  });
});

// **************** 移除某項
router.delete("/remove/:pid", async (req, res) => {
  const pid = +req.params.pid || 0; // 編號
  const sql = `DELETE FROM cart2 WHERE member_id=? AND product_id=?`;
  const [result] = await db.query(sql, [req.session.admin.id, pid]);
  res.json({
    success: !!result.affectedRows,
    pid,
  });
});

// **************** 清空購物車
router.delete("/clear", async (req, res) => {
  const sql = `DELETE FROM cart2 WHERE member_id=?`;
  const [result] = await db.query(sql, [req.session.admin.id]);
  res.json({
    success: !!result.affectedRows,
    affectedRows: result.affectedRows,
  });
});
export default router;
