const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
app.use(cors());

const db = new sqlite3.Database("./database.db");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer TEXT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    archived INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    lessonId INTEGER
  )`);

  db.get("SELECT * FROM users WHERE username='admin'", async (err, row) => {
    if (!row) {
      const hash = await bcrypt.hash("1234", 10);
      db.run("INSERT INTO users (dealer, username, password, role) VALUES (?, ?, ?, ?)",
        ["Merkez", "admin", hash, "admin"]);
    }
  });
});

/* Giriş */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username=? AND archived=0", [username], async (err, user) => {
    if (!user) return res.status(401).json({ error: "Hatalı giriş" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Hatalı giriş" });

    res.json({ id: user.id, role: user.role, dealer: user.dealer });
  });
});

/* Kullanıcı ekleme */
app.post("/users", async (req, res) => {
  const { dealer, username, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  db.run("INSERT INTO users (dealer, username, password, role) VALUES (?, ?, ?, ?)",
    [dealer, username, hash, "user"],
    function(err) {
      if (err) return res.status(400).json({ error: "Kullanıcı mevcut" });
      res.json({ success: true });
    });
});

/* Kullanıcıları listele */
app.get("/users", (req, res) => {
  db.all("SELECT id, dealer, username, role, archived FROM users", [], (err, rows) => {
    res.json(rows);
  });
});

/* Sil */
app.delete("/users/:id", (req, res) => {
  db.run("DELETE FROM users WHERE id=?", [req.params.id]);
  db.run("DELETE FROM progress WHERE userId=?", [req.params.id]);
  res.json({ success: true });
});

/* Arşiv */
app.put("/archive/:id", (req, res) => {
  db.run("UPDATE users SET archived=1 WHERE id=?", [req.params.id]);
  res.json({ success: true });
});

/* Aktif et */
app.put("/activate/:id", (req, res) => {
  db.run("UPDATE users SET archived=0 WHERE id=?", [req.params.id]);
  res.json({ success: true });
});

/* Eğitim tamamla */
app.post("/progress", (req, res) => {
  const { userId, lessonId } = req.body;

  db.run("INSERT INTO progress (userId, lessonId) VALUES (?, ?)",
    [userId, lessonId]);
  res.json({ success: true });
});

/* Eğitim durumları */
app.get("/progress/:userId", (req, res) => {
  db.all("SELECT lessonId FROM progress WHERE userId=?",
    [req.params.userId],
    (err, rows) => {
      res.json(rows);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Sunucu çalışıyor..."));
