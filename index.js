import express from "express";
import session from "express-session";
import nodemailer from "nodemailer";

const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "secretkey",
    resave: false,
    saveUninitialized: true,
  })
);

const bats = [
  { id: 1, name: "Srilankan MRI Bat", price: 1000 },
  { id: 2, name: "Kashmiri Bat", price: 1050 },
  { id: 3, name: "YS Bat", price: 1100 },
  { id: 4, name: "Scoop Bat", price: 1100 },
];

// === ROUTES ===

app.get("/", (req, res) => {
  res.render("index", { bats });
});

app.post("/add-to-cart", (req, res) => {
  const { id } = req.body;
  const bat = bats.find((b) => b.id == id);

  if (!req.session.cart) req.session.cart = [];
  req.session.cart.push(bat);

  res.redirect("/cart");
});

app.get("/cart", (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  res.render("cart", { cart, total });
});

app.post("/remove-from-cart", (req, res) => {
  const { index } = req.body;
  if (req.session.cart) {
    req.session.cart.splice(index, 1);
  }
  res.redirect("/cart");
});

// ✅ Checkout form
app.get("/checkout", (req, res) => {
  res.render("checkout");
});

// ✅ Checkout submit
app.post("/checkout", async (req, res) => {
  const { name, email, address, city, postal } = req.body;
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + item.price, 0);

  req.session.shipping = { name, email, address, city, postal };

  // --- Nodemailer setup ---
  const transporter = nodemailer.createTransport({
    service: "gmail", // Or SMTP config for your provider
    auth: {
      user: "sthvraja@gmail.com", // replace with your email
      pass: "xllz yvia wcut nepf", // use Gmail App Password, not your real password
    },
  });

  // --- Email content ---
  const orderDetails = cart
    .map((item) => `- ${item.name}: $${item.price}`)
    .join("\n");

  const mailOptions = {
    from: "dinesh.k.dhanasekaran@gmail.com",
    to: email, // customer email
    subject: "Order Confirmation - Cricket Store",
    text: `
Hi ${name},

Thank you for your order! 🏏

Your items:
${orderDetails}

Total: $${total}

Shipping to:
${address}, ${city} - ${postal}

We’ll notify you once your order is shipped.

Cricket Store Team
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.send(`
      <h1>Order Placed ✅</h1>
      <p>Thank you, ${name}. A confirmation email has been sent to <b>${email}</b>.</p>
      <a href="/">Go back to store</a>
    `);
    req.session.cart = [];
  } catch (err) {
    console.error("Email error:", err);
    res.send("<h1>Order Placed, but email could not be sent ❌</h1>");
  }
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server running on http://localhost:3000");
});
