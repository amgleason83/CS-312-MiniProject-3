const pg = require("pg");
const dotenv = require("dotenv");
const session = require("express-session");

dotenv.config();

const db = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

db.query("SELECT NOW()")
  .then(() => console.log("PostgreSQL connected successfully!"))
  .catch((err) => console.error("Database connection failed:", err));



const express = require("express");

const app = express();
const port = 3000;

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax"
  }
}));

app.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        blog_id AS id,
        creator_name AS author,
        creator_user_id,
        title,
        body AS content,
        date_created AS "createdAt"
      FROM blogs
      ORDER BY date_created DESC
    `);

    res.render("index", {
      posts: result.rows,
      currentUserId: req.session.userId || null,
      currentUserName: req.session.name || null
    });

  } catch (err) {
    console.error("Error loading posts:", err);
    res.status(500).send("Database error");
  }
});

app.post("/posts", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/signin");
  }

  const { title, content } = req.body;

  if (!title?.trim() || !content?.trim()) {
    return res.status(400).send("Title and content are required");
  }

  try {
    await db.query(
      `INSERT INTO blogs
       (creator_name, creator_user_id, title, body)
       VALUES ($1, $2, $3, $4)`,
      [
        req.session.name,
        req.session.userId,
        title.trim(),
        content.trim()
      ]
    );

    res.redirect("/");

  } catch (err) {
    console.error("Error creating post:", err);
    res.status(500).send("Database error");
  }
});

app.get("/posts/:id/edit", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/signin");
  }

  try {
    const result = await db.query(
      `SELECT
        blog_id AS id,
        creator_name AS author,
        title,
        body AS content
       FROM blogs
       WHERE blog_id = $1 AND creator_user_id = $2`,
      [req.params.id, req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Post not found or unauthorized");
    }

    res.render("edit", { post: result.rows[0] });

  } catch (err) {
    console.error("Error loading post:", err);
    res.status(500).send("Database error");
  }
});

app.post("/posts/:id/edit", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/signin");
  }

  const { title, content } = req.body;

  try {
    const result = await db.query(
      `UPDATE blogs
       SET title = $1, body = $2
       WHERE blog_id = $3 AND creator_user_id = $4`,
      [title, content, req.params.id, req.session.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Post not found or unauthorized");
    }

    res.redirect("/");

  } catch (err) {
    console.error("Error updating post:", err);
    res.status(500).send("Database error");
  }
});

app.post("/posts/:id/delete", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/signin");
  }

  try {
    const result = await db.query(
      `DELETE FROM blogs
       WHERE blog_id = $1 AND creator_user_id = $2`,
      [req.params.id, req.session.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Post not found or unauthorized");
    }

    res.redirect("/");

  } catch (err) {
    console.error("Error deleting post:", err);
    res.status(500).send("Database error");
  }
});

app.get("/signup", (req, res) => {
  res.render("signup", { error: null });
});

app.post("/signup", async (req, res) => {
  const { user_id, password, name } = req.body;

  try {
    // Check if username already exists
    const existing = await db.query(
      "SELECT user_id FROM users WHERE user_id = $1",
      [user_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).render("signup", {
        error: "Username already taken. Please choose another."
      });
    }

    // Create new user with hashed password
    await db.query(
      `INSERT INTO users (user_id, password, name)
       VALUES ($1, crypt($2, gen_salt('bf', 10)), $3)`,
      [user_id, password, name]
    );

    res.redirect("/signin");

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).send("Database error");
  }
});

app.get("/signin", (req, res) => {
  res.render("signin", { error: null });
});

app.post("/signin", async (req, res) => {
  const { user_id, password } = req.body;

  try {
    const result = await db.query(
      `SELECT user_id, name FROM users
       WHERE user_id = $1
       AND password = crypt($2, password)`,
      [user_id, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).render("signin", {
        error: "Incorrect username or password"
      });
    }

    req.session.userId = result.rows[0].user_id;
    req.session.name = result.rows[0].name;

    res.redirect("/");

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Database error");
  }
});

app.post("/signout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Signout error:", err);
      return res.status(500).send("Could not sign out");
    }

    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});