// console.log(process.env.DB_USER);
// console.log(process.env.DB_PASS);

import express from "express";
import multer from "multer";
import sales from "./data/sales.js";

// const upload = multer({ dest: "tmp_uploads/" });
import upload from "./utils/upload-imgs.js";
import admin2Router from "./routes/admin2.js";
import session from "express-session";

const app = express();

app.set("view engine", "ejs");

// Top-level middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    saveUninitialized: false,
    resave: false,
    // name: 'super.mario', // cookie (session id) 的名稱
    secret: "dgdjk398475UGJKGlkskjhfskjf",
    // cookie: {
    //  maxAge: 1200_000
    // }
  })
);

// 路由設定, routes
// 1. get(): 只接受 HTTP GET 方法的拜訪
// 2. 只接受 路徑為 / 的 request
app.get("/", (req, res) => {
  // res.send("<h2>Hello World</h2>");
  res.render("home", { name: "Shinder" });
});

app.get("/json-sales", (req, res) => {
  // 輸出 application/json 的格式
  // res.json(salesArray);

  res.render("json-sales", { sales });
});

// 測試 query string 參數
app.get("/try-qs", (req, res) => {
  res.json(req.query);
});

app.get("/try-post-form", (req, res) => {
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

app.get("/try-sess", (req, res) => {
  // req.session.my_num = req.session.my_num || 0;
  req.session.my_num ||= 0;
  req.session.my_num++;
  res.json(req.session);
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
