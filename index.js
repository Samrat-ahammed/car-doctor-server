const express = require("express");
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");
var jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());
app.use(cookieParser());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dkplpch.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const logger = async (req, res, next) => {
  console.log("called", req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("value of token of middleware", token);
  if (!token) {
    return res.status(401).send({ message: "forbidden" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized" });
    }
    console.log("value in token ", decode);
    req.user = decode;
    next();
  });
};
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const servicesCollection = client.db("carDoctor").collection("services");
    const checkOutCollection = client.db("carDoctor").collection("checking");

    // auth relate

    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log(user);

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
          // sameSite: "none",
        })

        .send({ success: true });
    });

    // checking

    app.get("/checking", logger, verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log("token:", req.cookies.token);
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await checkOutCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/checking", logger, async (req, res) => {
      const checking = req.body;
      console.log(checking);
      const result = await checkOutCollection.insertOne(checking);
      res.send(result);
    });

    app.delete("/checking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await checkOutCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/checking/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateChecking = req.body;
      // console.log(updateChecking);
      const updateDoc = {
        $set: {
          status: updateChecking.status,
        },
      };

      const result = await checkOutCollection.updateOne(filter, updateDoc);
      console.log(result);
      res.send(result);
    });
    // services

    app.get("/services", logger, async (req, res) => {
      const cursor = servicesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const options = {
        projection: { title: 1, service_id: 1, price: 1, img: 1 },
      };

      const result = await servicesCollection.findOne(query, options);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("doctor is running");
});

app.listen(port, () => {
  console.log(`doctor is running ${port}`);
});
