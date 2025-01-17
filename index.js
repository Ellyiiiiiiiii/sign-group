// console.log(process.env.DB_USER);
// console.log(process.env.DB_PASS);

import express from "express";
import multer from "multer";
import sales from "./data/sales.js";
import { z } from "zod";
import cors from "cors";
import bcrypt from "bcrypt";
// const upload = multer({ dest: "tmp_uploads/" });
import upload from "./utils/upload-imgs.js";
import admin2Router from "./routes/admin2.js";
import abRouter from "./routes/address-book.js";
import cart2Router from "./routes/cart2.js";
import addRouter from "./routes/signup.js";
import session from "express-session";
import mysql_session from "express-mysql-session";
import moment from "moment-timezone";
// 資料庫使用
// import { Op } from 'sequelize'
import jwt from "jsonwebtoken";

import db from "./utils/connect-mysql.js";

const app = express();
const MysqlStore = mysql_session(session);
const sessionStore = new MysqlStore({}, db);

app.set("view engine", "ejs");

// Top-level middlewares
const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    // console.log({ origin });
    callback(null, true); // 允許所有網站取得資源
  },
};
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    saveUninitialized: false,
    resave: false,
    // name: 'super.mario', // cookie (session id) 的名稱
    secret: "dgdjk398475UGJKGlkskjhfskjf",
    store: sessionStore,
    // cookie: {
    //  maxAge: 1200_000
    // }
  })
);

// ******************* 自訂 top-level middleware
app.use((req, res, next) => {
  // res.send("<p>直接被中斷</p>"); // 不應該回應
  res.locals.session = req.session; // 是讓 template 可以使用(讀取) session
  res.locals.title = "小新的網站"; // 預設的頁面 title
  res.locals.pageName = "";

  // 解析 JWT token
  const auth = req.get("Authorization"); // 取得用戶端送過來的 Authorization 檔頭
  if (auth && auth.indexOf("Bearer ") === 0) {
    const token = auth.slice(7); // 只取得 token 的部份
    try {
      // 解密 token 並把資料掛在 req.my_jwt
      req.my_jwt = jwt.verify(token, process.env.JWT_KEY);
    } catch (ex) {}
  }

  next();
});

// 路由設定, routes
// 1. get(): 只接受 HTTP GET 方法的拜訪
// 2. 只接受 路徑為 / 的 request
app.get("/", (req, res) => {
  // res.send("<h2>Hello World</h2>");
  res.render("home", { name: "Shinder" });
});

app.get("/json-sales", (req, res) => {
  res.locals.title = "JSON-SALES | " + res.locals.title;
  res.locals.pageName = "json-sales";

  // 輸出 application/json 的格式
  // res.json(salesArray);

  res.render("json-sales", { sales });
});

// 測試 query string 參數
app.get("/try-qs", (req, res) => {
  res.json(req.query);
});

app.get("/try-post-form", (req, res) => {
  res.locals.title = "測試表單 | " + res.locals.title;
  res.locals.pageName = "tpf";
  // res.render("try-post-form", { account: "", password: "" });
  res.render("try-post-form");
});

// middleware: 中介軟體, 中介處理函式
// const urlencodedParser = express.urlencoded({extended: true});
app.post("/try-post-form", (req, res) => {
  res.render("try-post-form", req.body);
});

app.post("/try-post", (req, res) => {
  res.json(req.body);
});

// 測試上傳單一個欄位單一個檔案
app.post("/try-upload", upload.single("avatar"), (req, res) => {
  res.json({
    file: req.file,
    body: req.body,
  });
});
// 測試上傳單一個欄位多個檔案
app.post("/try-uploads", upload.array("photos", 10), (req, res) => {
  res.json(req.files);
});

// 特定的路徑放前面
app.get("/my-params1/abcd", (req, res) => {
  res.json({ path: "/my-params1/abcd" });
});
// 路徑參數
app.get("/my-params1/:action?/:id?", (req, res) => {
  res.json(req.params);
});

app.get(/^\/m\/09\d{2}-?\d{3}-?\d{3}$/i, (req, res) => {
  let u = req.url.split("?")[0]; // 只要 ? 前面那段
  u = u.slice(3); // 前面的三個字元不要
  u = u.split("-").join("");

  res.json({ 手機: u });
});

app.use("/admins", admin2Router);
app.use("/address-book", abRouter);
app.use("/cart2", cart2Router);
app.use("/signup", addRouter);

app.get("/try-sess", (req, res) => {
  // req.session.my_num = req.session.my_num || 0;
  req.session.my_num ||= 0;
  req.session.my_num++;
  res.json(req.session);
});

app.get("/try-moment", (req, res) => {
  const fm = "YYYY-MM-DD HH:mm:ss";
  const m1 = moment(); // 取得當下時間的 moment 物件
  const m2 = moment("2024-02-29");
  const m3 = moment("2023-02-29");

  res.json({
    m1: m1.format(fm),
    m2: m2.format(fm),
    m3: m3.format(fm),
    m1v: m1.isValid(), // 是不是有效的日期
    m2v: m2.isValid(),
    m3v: m3.isValid(),
    m1z: m1.tz("Europe/London").format(fm),
    m2z: m2.tz("Europe/London").format(fm),
  });
});

app.get("/try-db", async (req, res) => {
  const sql = "SELECT * FROM address_book LIMIT 3";
  //const [rows, fields] = await db.query(sql);
  const [rows] = await db.query(sql);
  res.json(rows);
});

// zod 套件測試
app.get("/zod-email/:email", async (req, res) => {
  const emailSchema = z.string().email({ message: "錯誤的 email 格式" });
  const result = emailSchema.safeParse(req.params.email);

  res.json(result);
});
app.get("/zod2/:index?", async (req, res) => {
  const index = +req.params.index || 0;
  const schema = z.object({
    account: z.string().email({ message: "錯誤的 email 格式" }),
    password: z.string().min(6, "最少 6 個字元").max(20, "最多 20 個字元"),
  });
  const ar = [
    {
      account: "shinder",
      password: "12345",
    },
    {
      account: "shinder@test.com",
      password: "12345398453984598sjhfsjfj3845",
    },
    {
      account: "shinder@test.com",
      password: "123fsjfj3845",
    },
  ];
  const result = schema.safeParse(ar[index]);
  res.json(result);
});

app.get("/login", async (req, res) => {
  res.render("login");
});
app.post("/login", async (req, res) => {
  const output = {
    success: false,
    code: 0,
  };

  const sql = "SELECT * FROM members WHERE email=?";
  const [rows] = await db.query(sql, [req.body.email]);

  if (!rows.length) {
    output.code = 400; // 帳號是錯的
    return res.json(output);
  }
  const row = rows[0];
  const result = await bcrypt.compare(req.body.password, row.password);
  if (result) {
    output.success = true;
    output.code = 200;

    // 登入成功, 狀態記錄在 session 裡
    req.session.admin = {
      id: row.id,
      email: row.email,
      nickname: row.nickname,
    };
  } else {
    output.code = 430; // 密碼是錯的
  }

  res.json(output);
});
// jwt 登入功能 的登出在前端做
app.post("/login-jwt", async (req, res) => {
  const output = {
    success: false,
    code: 0,
    data: {
      id: 0,
      account: "",
      nickname: "",
      token: "",
    },
  };

  // 取得登入的兩個欄位資料
  let { account, password } = req.body || {};

  if (!account || !password) {
    output.code = 400;
    return res.json(output);
  }

  const sql = "SELECT * FROM members WHERE email=?";
  const [rows] = await db.query(sql, [account]);

  if (!rows.length) {
    output.code = 410; // 帳號是錯的
    return res.json(output);
  }
  const row = rows[0];
  const result = await bcrypt.compare(password, row.password);
  if (result) {
    output.success = true;
    output.code = 200;

    const token = jwt.sign(
      { id: row.id, account: row.email },
      process.env.JWT_KEY
    );
    output.data = {
      id: row.id,
      account: row.email,
      nickname: row.nickname,
      token,
    };
  } else {
    output.code = 430; // 密碼是錯的
  }

  res.json(output);
});

// My jwt 登入功能
app.post("/login-jwt1", async (req, res) => {
  const output = {
    success: false,
    code: 0,
    data: {
      id: 0,
      name: "",
      email: "",
      token: "",
    },
  };

  // 取得登入的兩個欄位資料
  let { email, password } = req.body || {};

  if (!email || !password) {
    output.code = 400;
    return res.json(output);
  }

  const sql = "SELECT * FROM users WHERE email=?";
  const [rows] = await db.query(sql, [email]);

  if (!rows.length) {
    output.code = 410; // 帳號是錯的
    return res.json(output);
  }
  const row = rows[0];
  const result = await bcrypt.compare(password, row.password);
  if (result) {
    output.success = true;
    output.code = 200;

    const token = jwt.sign(
      { id: row.id, email: row.email },
      process.env.JWT_KEY
    );
    output.data = {
      id: row.id,
      name: row.name,
      email: row.email,
      token,
    };
  } else {
    output.code = 430; // 密碼是錯的
  }

  res.json(output);
});
// test token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJtYWlsMjk5MTlAdGVzdC5jb20iLCJpYXQiOjE3MjA5MzczMzl9.WtI50hSSOe-AAOR0iO23JIgu40kBUFA9lJyhwfTw7PQ

// 登出
app.get("/logout", async (req, res) => {
  delete req.session.admin;
  res.redirect("/");
});

app.get("/yahoo", async (req, res) => {
  const r = await fetch("https://tw.yahoo.com/");
  const txt = await r.text();
  res.send(txt);
});

// ***** 測試用: 快速登入
app.get("/q/:mid", async (req, res) => {
  const mid = +req.params.mid || 0;

  const sql = `SELECT id, email, nickname FROM members WHERE id=${mid}`;
  const [rows] = await db.query(sql);
  if (rows.length) {
    req.session.admin = rows[0];
    return res.json({ success: true, ...rows[0] });
  }
  res.json({ success: false });
});

// 測試 JWT
app.get("/jwt1", async (req, res) => {
  console.log(process.env.JWT_KEY); // 查看有沒有取得加密的 key
  const data = {
    id: 26,
    email: "shin@test.com",
  };

  const token = jwt.sign(data, process.env.JWT_KEY); // 加密
  res.send(token);
  // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjYsImVtYWlsIjoic2hpbkB0ZXN0LmNvbSIsImlhdCI6MTcxOTk3MDAxM30.4UV6nwNQkSnSYPFUdJmlqnGNU186Zv4tU0W5uJrB2B4
});
app.get("/jwt2", async (req, res) => {
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjYsImVtYWlsIjoic2hpbkB0ZXN0LmNvbSIsImlhdCI6MTcxOTk3MDAxM30.4UV6nwNQkSnSYPFUdJmlqnGNU186Zv4tU0W5uJrB2B4";
  const payload = jwt.verify(token, process.env.JWT_KEY); // 解密

  res.json(payload);
});
// 測試用戶端送過來的 JWT token
app.get("/jwt-data", (req, res) => {
  res.json(req.my_jwt);
});

// ************* 設定靜態內容資料夾 *************
app.use(express.static("public"));
app.use("/bootstrap", express.static("node_modules/bootstrap/dist"));

// ************* 放在所有路由的後面 *************
// 404 頁面
app.use((req, res) => {
  res.status(404).send("<h1>您走錯路了</h1>");
});

const port = process.env.WEB_PORT || 3002;
app.listen(port, () => {
  console.log(`伺服器啟動了, port: ${port}`);
});
