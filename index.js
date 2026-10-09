import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// MongoDB connection URI
const uri = process.env.MONGO_DB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;
let userCollection;
let patientCollection;
let doctorCollection;
let assistantCollection;
let departmentCollection;
let appointmentCollection;
let scheduleCollection;
let medicalRecordCollection;
let prescriptionCollection;
let notificationCollection;

export async function connectToMongoDB() {
  try {
    await client.connect(); 

    db = client.db("doc_sheba_db"); 

    // Collection Initializations
    userCollection = db.collection("user"); 
    patientCollection = db.collection("patients");
    doctorCollection = db.collection("doctors");
    assistantCollection = db.collection("assistants");
    departmentCollection = db.collection("departments");
    appointmentCollection = db.collection("appointments");
    scheduleCollection = db.collection("schedules");
    medicalRecordCollection = db.collection("medicalRecords");
    prescriptionCollection = db.collection("prescriptions");
    notificationCollection = db.collection("notifications");

    console.log("Successfully connected to MongoDB!");

    // Ping admin DB to confirm connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged deployment. All database collections are ready!");

    return db;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}

export async function disconnectFromMongoDB() {
  await client.close();
  console.log("MongoDB connection closed.");
}

// Base Routes
app.get("/", (req, res) => {
  res.send("DocSheba Server Running!");
});



// User API Routes
app.post("/user", async (req, res) => {
  try {
    const user = req.body;
    const userExists = await userCollection.findOne({ email: user.email });
    if (userExists) {
      return res
        .status(409)
        .send({ success: false, message: "User already exists" });
    }

    user.role = user.role || "patient";
    user.createdAt = new Date();

    const result = await userCollection.insertOne(user);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
});

app.get("/user", async (req, res) => {
  try {
    const result = await userCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

app.get("/user/role/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const user = await userCollection.findOne({ email });

    if (user) {
      res.send({ role: user.role });
    } else {
      res.status(404).send({ role: "patient" });
    }
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch role",
      error: error.message,
    });
  }
});

app.patch("/user/:id/role", async (req, res) => {
  try {
    const filter = { _id: new ObjectId(req.params.id) };
    const updatedUserData = { ...req.body };
    delete updatedUserData._id;

    const existingUser = await userCollection.findOne(filter);
    if (!existingUser) {
      return res
        .status(404)
        .send({ success: false, message: "User not found" });
    }

    const updateDoc = {
      $set: { ...updatedUserData, updatedAt: new Date() },
    };
    const result = await userCollection.updateOne(filter, updateDoc);

    res.send({
      success: true,
      message: "User role updated successfully",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
});

app.delete("/users/:id", async (req, res) => {
  try {
    const result = await userCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .send({ success: false, message: "User not found" });
    }

    res.send({
      success: true,
      message: "User deleted successfully",
      result,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Invalid ID or Server Error",
      error: error.message,
    });
  }
});

// Start Server
async function startServer() {
  try {
    await connectToMongoDB();

    app.listen(port, () => {
      console.log(`DocSheba server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();