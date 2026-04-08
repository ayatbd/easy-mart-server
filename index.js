const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Verify JWT Middleware
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-sxrczlw-shard-00-00.y1sglpm.mongodb.net:27017,ac-sxrczlw-shard-00-01.y1sglpm.mongodb.net:27017,ac-sxrczlw-shard-00-02.y1sglpm.mongodb.net:27017/?ssl=true&replicaSet=atlas-o2tvq8-shard-0&authSource=admin&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server
    // await client.connect(); // Optional in some environments, but good for local dev

    const usersCollection = client.db("easyMartDB").collection("users");
    const productsCollection = client.db("easyMartDB").collection("products");
    const cartCollection = client.db("easyMartDB").collection("carts");
    const wishlistCollection = client.db("easyMartDB").collection("wishlist");
    const ordersCollection = client.db("easyMartDB").collection("orders");

    app.post("/login", async (req, res) => {
      const { email, password } = req.body;

      // 1. Find the user in the database
      const user = await usersCollection.findOne({ email: email });

      if (!user) {
        return res.status(401).send({ error: true, message: "User not found" });
      }

      // 2. Check password (Note: In production, use bcrypt.compare)
      if (user.password !== password) {
        return res
          .status(401)
          .send({ error: true, message: "Invalid password" });
      }

      // 3. If everything is correct, sign the token
      const token = jwt.sign(
        { email: user.email, role: user.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "24h" },
      );

      // 4. Send back the token and user info
      res.send({
        token,
        user: { email: user.email, name: user.name, role: user.role },
      });
    });

    // Verify Admin Middleware (Must be used after verifyJWT)
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };

    // ================= USERS API =================
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) return res.send({ message: "user already exists" });
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Check if user is admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res.send({ admin: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ admin: user?.role === "admin" });
    });

    // Make Admin
    app.patch("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { role: "admin" } };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // ================= PRODUCTS API =================
    // Get all products (with optional category filtering)
    app.get("/products", async (req, res) => {
      const category = req.query.category;
      let query = {};
      if (category) {
        query = { category: category };
      }
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // Get single product details
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    app.post("/products", verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    // Delete Product
    app.delete("/products/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // ================= CART API =================
    app.get("/carts", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) return res.send([]);
      if (req.decoded.email !== email) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // ================= WISHLIST API =================
    app.get("/wishlist", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { userEmail: email };
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/wishlist", async (req, res) => {
      const item = req.body;
      const result = await wishlistCollection.insertOne(item);
      res.send(result);
    });

    app.delete("/wishlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });

    // ================= ORDERS API =================
    app.post("/orders", verifyJWT, async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);

      // Optional: Clean up cart after order
      const query = { email: order.email };
      await cartCollection.deleteMany(query);

      res.send(result);
    });

    app.get("/orders", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await ordersCollection.find().toArray();
      res.send(result);
    });

    console.log("Connected to MongoDB successfully!");
  } finally {
    // Keep connection open
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Exclusive Web Server is running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
