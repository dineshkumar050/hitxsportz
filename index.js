import express from "express";
import session from "express-session";
import Razorpay from "razorpay";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import crypto from "crypto";
import cors from "cors";
dotenv.config();
const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
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
    req.session.cart = [];
    res.json({ success: true, redirect: "/payment-success" });
  } catch (err) {
    console.error("Email error:", err);
    res.json({ success: true, redirect: "/payment-success" });
  }
});

app.get("/payment-success", (req, res) => {
  res.send(`<h1>Order Placed ✅</h1>
      <p>Thank you. A confirmation email has been sent</b>.</p>
      <a href="/">Go back to store</a>`);
});

app.get("/payment-failure", (req, res) => {
  res.send("<h1>Order Placed, but email could not be sent ❌</h1>");
});

app.post("/create-order", async (req, res) => {
  const { amount, currency } = req.body;

  try {
    const options = {
      amount: amount * 100, // amount in paise
      currency: currency || "INR",
      receipt: "receipt" + Date.now(),
      payment_capture: 1, // auto capture
    };
    console.log(1);
    const order = await razorpay.orders.create(options);
    console.log(order);
    console.log(2);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payment verification
app.post("/verify-payment", (req, res) => {
  //const crypto = require("crypto");
  console.log(req.body);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server running on http://localhost:3000");
});
