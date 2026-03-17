const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();

// midlwares
app.use(cors());
app.use(express.json());

// ---------------------------

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

// ---------------------------

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y1sglpm.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    client.connect();

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// ---------------------------

app.get("/", (req, res) => {
  res.send("web server is running");
});

const usersCollection = client.db("matWebDb").collection("users");
const biodataCollection = client.db("matWebDb").collection("biodatas");

// JWT TOKEN

app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });

  res.send({ token });
});

// ------------------------------------
// admin api-------

app.get("/users/admin/:email", verifyJWT, async (req, res) => {
  const email = req.params.email;

  if (req.decoded.email !== email) {
    res.send({ admin: false });
  }

  const query = { email: email };
  const user = await usersCollection.findOne(query);
  const result = { admin: user?.role === "admin" };
  res.send(result);
});

// // ------------------------------------
// // male api-------

// app.get("/users/male/:email", verifyJWT, async (req, res) => {
//   const email = req.params.email;

//   if (req.decoded.email !== email) {
//     res.send({ male: false });
//   }

//   const query = { email: email };
//   const biodata = await biodataCollection.findOne(query);
//   const result = { male: biodata?.biodata_type === "male" };
//   res.send(result);
// });

// users apis

app.get("/users", async (req, res) => {
  const result = await usersCollection.find().toArray();
  res.send(result);
});

app.post("/users", async (req, res) => {
  const user = req.body;
  const query = { email: user.email };
  const existingUser = await usersCollection.findOne(query);

  if (existingUser) {
    return res.send({ message: "user already exists" });
  }

  const result = await usersCollection.insertOne(user);
  res.send(result);
});

// ----------------------------------
// biodata api

app.get("/biodata", async (req, res) => {
  const result = await biodataCollection.find().toArray();
  res.send(result);
});

app.post("/biodata", async (req, res) => {
  const updatedData = req.body;
  const result = await biodataCollection.insertOne(updatedData);
  res.send(result);
});

app.delete("/biodata/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await biodataCollection.deleteOne(query);
  res.send(result);
});

app.get("/biodata/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await biodataCollection.findOne(query);
  res.send(result);
});

// backend biodata approve api
app.patch("/biodata/approve/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      status: "approved", // <-- Fix the typo here
    },
  };

  const result = await biodataCollection.updateOne(filter, updateDoc);
  res.send(result);
});

// ----------------------------------
// admin api

app.patch("/users/admin/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      role: "admin",
    },
  };
  const result = await usersCollection.updateOne(filter, updateDoc);
  res.send(result);
});
