const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

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

// const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y1sglpm.mongodb.net/?retryWrites=true&w=majority`;
const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-sxrczlw-shard-00-00.y1sglpm.mongodb.net:27017,ac-sxrczlw-shard-00-01.y1sglpm.mongodb.net:27017,ac-sxrczlw-shard-00-02.y1sglpm.mongodb.net:27017/?ssl=true&replicaSet=atlas-o2tvq8-shard-0&authSource=admin&appName=Cluster0`;
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
    await client.connect();

    const usersCollection = client.db("easyMartDB").collection("users");
    const productsCollection = client.db("easyMartDB").collection("products");

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

    // admin api-------

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

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

    //================ product api ==================
    app.get("/products", async (req, res) => {
      const result = await productsCollection.find().toArray();
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } catch (error) {
    console.error(error);
  }
}
run().catch(console.dir);
// ---------------------------
app.get("/", (req, res) => {
  res.send("web server is running");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});

// JWT TOKEN

app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });

  res.send({ token });
});
