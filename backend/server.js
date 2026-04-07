const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const DB_NAME = "skull_store";
const JWT_SECRET = "skull-secret-key-2026";
const MONGODB_URI = "mongodb://joelv24:joel8001@ac-n1gklk0-shard-00-00.h0g5ir2.mongodb.net:27017,ac-n1gklk0-shard-00-01.h0g5ir2.mongodb.net:27017,ac-n1gklk0-shard-00-02.h0g5ir2.mongodb.net:27017/?ssl=true&replicaSet=atlas-iq1f97-shard-0&authSource=admin&retryWrites=true&w=majority";

app.use(cors());
app.use(express.json());

let client;
let db;

async function connectDB() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed", err.message);
    process.exit(1);
  }
}

function getDb() {
  return db;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeUser(user) {
  if (!user) return null;

  return {
    _id: String(user._id),
    id: String(user._id),
    email: user.email,
    name: user.name || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    phone: user.phone || "",
    role: user.role || "customer",
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeOrderItems(items) {
  return Array.isArray(items)
    ? items.map((item) => ({
        id: numberValue(item?.id || item?.productId, 0),
        productId: numberValue(item?.id || item?.productId, 0),
        sku: String(item?.sku || ""),
        name: String(item?.name || "Item"),
        category: String(item?.category || item?.cat || ""),
        price: numberValue(item?.price, 0),
        quantity: Math.max(1, numberValue(item?.quantity, 1)),
        image: String(item?.image || item?.img || ""),
      }))
    : [];
}

function serializeOrder(order) {
  if (!order) return null;

  return {
    _id: String(order._id),
    id: String(order._id),
    orderNumber: order.orderNumber || `SKULL-${String(order._id).slice(-6).toUpperCase()}`,
    userId: String(order.userId || ""),
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          id: numberValue(item.id || item.productId, 0),
          productId: numberValue(item.productId || item.id, 0),
          sku: String(item.sku || ""),
          name: String(item.name || ""),
          category: String(item.category || ""),
          price: numberValue(item.price, 0),
          quantity: Math.max(1, numberValue(item.quantity, 1)),
          image: String(item.image || item.img || ""),
          img: String(item.image || item.img || ""),
        }))
      : [],
    subtotal: numberValue(order.subtotal, 0),
    shipping: numberValue(order.shipping, 0),
    shippingCost: numberValue(order.shipping, 0),
    tax: numberValue(order.tax, 0),
    total: numberValue(order.total, 0),
    status: order.status || "processing",
    notes: order.notes || "",
    shippingAddress: {
      fullName: String(order.shippingAddress?.fullName || ""),
      firstName: String(order.shippingAddress?.firstName || ""),
      lastName: String(order.shippingAddress?.lastName || ""),
      phone: String(order.shippingAddress?.phone || ""),
      email: String(order.shippingAddress?.email || ""),
      line1: String(order.shippingAddress?.line1 || ""),
      line2: String(order.shippingAddress?.line2 || ""),
      address: String(order.shippingAddress?.address || order.shippingAddress?.line1 || ""),
      city: String(order.shippingAddress?.city || ""),
      state: String(order.shippingAddress?.state || ""),
      pincode: String(order.shippingAddress?.pincode || ""),
      country: String(order.shippingAddress?.country || "India"),
    },
    payment: {
      method: String(order.payment?.method || "cod").toLowerCase(),
      label: String(order.payment?.method || "COD").toUpperCase() === "UPI" ? "UPI Payment" : "Cash on Delivery",
      status: String(order.payment?.status || "pending"),
      upiId: order.payment?.upiId || null,
      transactionId: order.payment?.transactionId || null,
      paidAt: order.payment?.paidAt || null,
      type: order.payment?.type || null,
    },
    tracking: Array.isArray(order.tracking) ? order.tracking : [],
    date: order.createdAt || new Date().toISOString(),
    createdAt: order.createdAt || null,
    updatedAt: order.updatedAt || null,
  };
}

function calculateTotals(items) {
  const subtotal = items.reduce(
    (sum, item) => sum + numberValue(item.price, 0) * Math.max(1, numberValue(item.quantity, 1)),
    0
  );
  const shipping = subtotal >= 999 ? 0 : 99;
  const tax = Math.round(subtotal * 0.18);
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}

function createToken(user) {
  return jwt.sign({ userId: String(user._id) }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

app.get("/", (req, res) => {
  res.send("SKULL Backend Running");
});

app.get("/health", async (req, res) => {
  try {
    await client.db().admin().ping();
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

async function registerHandler(req, res) {
  const database = getDb();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const name = String(req.body?.name || "").trim();
  const phone = String(req.body?.phone || "").trim();

  if (!email || !password || !name) {
    return res.status(400).json({ error: "All fields required" });
  }

  const existing = await database.collection("users").findOne({
    email: { $regex: `^${escapeRegex(email)}$`, $options: "i" },
  });
  if (existing) {
    return res.status(400).json({ error: "User exists" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const now = new Date();

  const result = await database.collection("users").insertOne({
    email,
    password: hashed,
    name,
    phone,
    role: "customer",
    createdAt: now,
    updatedAt: now,
  });

  const user = await database.collection("users").findOne({
    _id: result.insertedId,
  });

  res.json({
    message: "User created",
    token: createToken({ _id: result.insertedId }),
    user: serializeUser(user),
  });
}

app.post("/api/register", registerHandler);
app.post("/api/auth/register", registerHandler);

async function loginHandler(req, res) {
  const database = getDb();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const user = await database.collection("users").findOne({
    email: { $regex: `^${escapeRegex(email)}$`, $options: "i" },
  });
  if (!user) {
    return res.status(400).json({ error: "Invalid email" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(400).json({ error: "Wrong password" });
  }

  res.json({
    message: "Login success",
    token: createToken(user),
    user: serializeUser(user),
  });
}

app.post("/api/login", loginHandler);
app.post("/api/auth/login", loginHandler);

app.get("/api/profile", authMiddleware, async (req, res) => {
  const database = getDb();
  const user = await database.collection("users").findOne({
    _id: new ObjectId(req.user.userId),
  });

  res.json({ user: serializeUser(user) });
});

app.patch("/api/profile", authMiddleware, async (req, res) => {
  const database = getDb();
  const userId = new ObjectId(req.user.userId);
  const currentUser = await database.collection("users").findOne({ _id: userId });

  if (!currentUser) {
    return res.status(404).json({ error: "User not found" });
  }

  const nextEmail = req.body?.email ? normalizeEmail(req.body.email) : currentUser.email;
  const nextFirstName = String(req.body?.firstName ?? currentUser.firstName ?? "").trim();
  const nextLastName = String(req.body?.lastName ?? currentUser.lastName ?? "").trim();
  const nextPhone = String(req.body?.phone ?? currentUser.phone ?? "").trim();
  const nextName = String(
    req.body?.name ||
    `${nextFirstName} ${nextLastName}`.trim() ||
    currentUser.name ||
    ""
  ).trim();

  if (!nextEmail) {
    return res.status(400).json({ error: "Email is required" });
  }

  const existingUser = await database.collection("users").findOne({
    _id: { $ne: userId },
    email: { $regex: `^${escapeRegex(nextEmail)}$`, $options: "i" },
  });

  if (existingUser) {
    return res.status(400).json({ error: "Email already in use" });
  }

  await database.collection("users").updateOne(
    { _id: userId },
    {
      $set: {
        email: nextEmail,
        firstName: nextFirstName,
        lastName: nextLastName,
        name: nextName,
        phone: nextPhone,
        updatedAt: new Date(),
      },
    }
  );

  const updatedUser = await database.collection("users").findOne({ _id: userId });
  res.json({ user: serializeUser(updatedUser) });
});

app.post("/api/orders", authMiddleware, async (req, res) => {
  const database = getDb();
  const userId = String(req.user.userId);
  const user = await database.collection("users").findOne({
    _id: new ObjectId(userId),
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const items = normalizeOrderItems(req.body?.items);
  if (!items.length) {
    return res.status(400).json({ error: "Your cart is empty" });
  }

  const paymentMethod = String(req.body?.paymentMethod || "COD").trim().toUpperCase();
  const totals = calculateTotals(items);
  const shippingInput = req.body?.shippingAddress || {};
  const fullName = String(
    shippingInput.fullName ||
    `${shippingInput.firstName || ""} ${shippingInput.lastName || ""}`.trim() ||
    user.name ||
    ""
  ).trim();

  const now = new Date();
  const orderDoc = {
    userId,
    orderNumber: `SKULL-${Date.now()}`,
    items,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    tax: totals.tax,
    total: totals.total,
    status: paymentMethod === "UPI" ? "pending_payment" : "processing",
    shippingAddress: {
      fullName,
      firstName: String(shippingInput.firstName || user.firstName || ""),
      lastName: String(shippingInput.lastName || user.lastName || ""),
      phone: String(shippingInput.phone || user.phone || ""),
      email: normalizeEmail(shippingInput.email || user.email),
      line1: String(shippingInput.line1 || shippingInput.address || ""),
      line2: String(shippingInput.line2 || ""),
      address: String(shippingInput.address || shippingInput.line1 || ""),
      city: String(shippingInput.city || ""),
      state: String(shippingInput.state || ""),
      pincode: String(shippingInput.pincode || ""),
      country: String(shippingInput.country || "India"),
    },
    payment: {
      method: paymentMethod === "UPI" ? "upi" : "cod",
      status: paymentMethod === "UPI" ? "pending" : "pending",
      upiId: paymentMethod === "UPI" ? String(req.body?.upiId || "") : null,
      transactionId: null,
      paidAt: null,
      type: paymentMethod === "UPI" ? "upi" : "cod",
    },
    tracking: [
      {
        status: paymentMethod === "UPI" ? "Awaiting payment" : "Order placed",
        note: paymentMethod === "UPI" ? "Waiting for payment confirmation." : "Cash on delivery order created.",
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const result = await database.collection("orders").insertOne(orderDoc);
  const savedOrder = await database.collection("orders").findOne({
    _id: result.insertedId,
  });

  res.status(201).json({
    order: serializeOrder(savedOrder),
    payment: savedOrder.payment,
  });
});

app.get("/api/orders", authMiddleware, async (req, res) => {
  const database = getDb();
  const orders = await database
    .collection("orders")
    .find({ userId: String(req.user.userId) })
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ orders: orders.map(serializeOrder) });
});

app.get("/api/orders/:orderId", authMiddleware, async (req, res) => {
  const database = getDb();
  const { orderId } = req.params;
  const selectors = [{ userId: String(req.user.userId) }];

  if (ObjectId.isValid(orderId)) {
    selectors.push({ _id: new ObjectId(orderId) });
  } else {
    selectors.push({ orderNumber: orderId });
  }

  const order = await database.collection("orders").findOne({
    $and: [
      { userId: String(req.user.userId) },
      { $or: selectors.slice(1) },
    ],
  });

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  res.json({ order: serializeOrder(order) });
});

app.post("/api/orders/:orderId/cancel", authMiddleware, async (req, res) => {
  const database = getDb();
  const { orderId } = req.params;

  if (!ObjectId.isValid(orderId)) {
    return res.status(400).json({ error: "Invalid order id" });
  }

  const existingOrder = await database.collection("orders").findOne({
    _id: new ObjectId(orderId),
    userId: String(req.user.userId),
  });

  if (!existingOrder) {
    return res.status(404).json({ error: "Order not found" });
  }

  const tracking = Array.isArray(existingOrder.tracking) ? existingOrder.tracking.slice() : [];
  tracking.push({
    status: "Cancelled",
    note: "Order cancelled by customer.",
    createdAt: new Date(),
  });

  await database.collection("orders").updateOne(
    { _id: existingOrder._id },
    {
      $set: {
        status: "cancelled",
        tracking,
        updatedAt: new Date(),
      },
    }
  );

  const updatedOrder = await database.collection("orders").findOne({
    _id: existingOrder._id,
  });

  res.json({ order: serializeOrder(updatedOrder) });
});

app.post("/api/payment/confirm", authMiddleware, async (req, res) => {
  const database = getDb();
  const orderId = String(req.body?.orderId || "");
  const transactionId = String(req.body?.transactionId || "").trim();

  if (!ObjectId.isValid(orderId)) {
    return res.status(400).json({ error: "Invalid order id" });
  }

  if (!transactionId) {
    return res.status(400).json({ error: "Transaction id is required" });
  }

  const existingOrder = await database.collection("orders").findOne({
    _id: new ObjectId(orderId),
    userId: String(req.user.userId),
  });

  if (!existingOrder) {
    return res.status(404).json({ error: "Order not found" });
  }

  const tracking = Array.isArray(existingOrder.tracking) ? existingOrder.tracking.slice() : [];
  tracking.push({
    status: "Payment confirmed",
    note: `Transaction ${transactionId} recorded.`,
    createdAt: new Date(),
  });

  await database.collection("orders").updateOne(
    { _id: existingOrder._id },
    {
      $set: {
        status: "processing",
        payment: {
          ...existingOrder.payment,
          method: "upi",
          status: "completed",
          transactionId,
          paidAt: new Date(),
          type: "upi",
        },
        tracking,
        updatedAt: new Date(),
      },
    }
  );

  const updatedOrder = await database.collection("orders").findOne({
    _id: existingOrder._id,
  });

  res.json({ order: serializeOrder(updatedOrder) });
});

// ================= ORDER ENDPOINTS =================

// Create Order
app.post("/api/order", authMiddleware, async (req, res) => {
  try {
    const database = getDb();

    const { items, totalAmount } = req.body;

    if (!items || !totalAmount) {
      return res.status(400).json({ error: "Missing order data" });
    }

    const order = {
      userId: req.user.userId,
      items,
      totalAmount,
      status: "confirmed",
      createdAt: new Date(),
    };

    const result = await database.collection("orders").insertOne(order);

    res.json({
      message: "Order confirmed  MongoDB connected successfully! ",
      orderId: result.insertedId,
    });
  } catch (error) {
    if (error.message === "Database not connected") {
      // Fallback to in-memory storage
      const { items, totalAmount } = req.body;

      if (!items || !totalAmount) {
        return res.status(400).json({ error: "Missing order data" });
      }

      const order = {
        _id: Date.now().toString(),
        userId: req.user.userId,
        items,
        totalAmount,
        status: "confirmed",
        createdAt: new Date(),
      };

      // Store in fallback storage (in a real implementation, this would be more sophisticated)
      if (!fallbackStorage.orders) fallbackStorage.orders = [];
      fallbackStorage.orders.push(order);

      res.json({
        message: "Order confirmed (Fallback mode)  MongoDB connection failed:",
        orderId: order._id,
        fallback: true
      });
    } else {
      res.status(500).json({ error: "Server error" });
    }
  }
});

// Get Orders
app.get("/api/orders", authMiddleware, async (req, res) => {
  try {
    const database = getDb();

    const orders = await database
      .collection("orders")
      .find({ userId: req.user.userId })
      .toArray();

    res.json({ orders });
  } catch (error) {
    if (error.message === "Database not connected") {
      // Fallback to in-memory storage
      const userOrders = fallbackStorage.orders ? fallbackStorage.orders.filter(order => order.userId === req.user.userId) : [];
      res.json({ orders: userOrders });
    } else {
      res.status(500).json({ error: "Server error" });
    }
  }
});

function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use.`);
      console.error(`Stop the other server using port ${PORT}, or start this one with a different port.`);
      console.error(`Example: $env:PORT=5001; node server.js`);
      return;
    }

    console.error("Server startup failed:", error.message);
  });
}

connectDB().then(startServer);
