require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 9000;
const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s7kzw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Send a ping to confirm a successful connection
    const db = client.db("soloworkDB");
    const jobs = db.collection("jobs");

    app.post("/jwt", async (req, res) => {
      const data = req.body;
      const token = jwt.sign(data, process.env.JWT_SECRET, {
        expiresIn: "365d",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
          sameSite: "strict",
        })
        .send({ success: true });
    });

    // middelware to check if the user is authenticated
    function authenticateToken(req, res, next) {
      const token = req?.cookies?.token;
      console.log(token);

      if (!token) return res.status(401).send({ message: "Unauthorized" });
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).send({ message: "Forbidden" });
        console.log(decoded);
        next();
      });
    }
    app.get("/", async (req, res) => {
      res.send({ connected: true });
    });
    app.get("/jobs", authenticateToken, async (req, res) => {
      if (req?.query?.skip) {
        const limit = parseInt(req.query.limit);
        const skip = parseInt(req.query.skip) * limit || 0;
        console.log(skip);
        const result = await jobs.find({}).limit(limit).skip(skip).toArray();
        res.send(result);
        return;
      }

      const result = await jobs.find({}).toArray();
      console.log(req.query);
      res.send(result);
    });
    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const result = await jobs.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });
    app.post("/jobs", async (req, res) => {
      const job = req.body;
      const result = await jobs.insertOne(job);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Hello from SoloSphere Server....");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
