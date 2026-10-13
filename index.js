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
let patientCounterCollection;
let doctorCollection;
let assistantCollection;
let departmentCollection;
let appointmentCollection;
let scheduleCollection;
let medicalRecordCollection;
let prescriptionCollection;
let notificationCollection;
const patientCounterInitialization = new Map();

async function initializePatientCounter(year) {
  if (patientCounterInitialization.has(year)) {
    return patientCounterInitialization.get(year);
  }

  const initialization = (async () => {
    const idPrefix = `PAT-${year}-`;
    const existingPatients = await patientCollection
      .find(
        { patientID: { $regex: `^PAT-${year}-[0-9]+$` } },
        { projection: { _id: 0, patientID: 1 } }
      )
      .toArray();
    const highestExistingSequence = existingPatients.reduce(
      (highest, patient) =>
        Math.max(highest, Number(patient.patientID.slice(idPrefix.length))),
      0
    );
    const filter = { _id: `patientID-${year}` };

    try {
      await patientCounterCollection.updateOne(
        filter,
        { $max: { sequence: highestExistingSequence } },
        { upsert: true }
      );
    } catch (error) {
      if (error.code !== 11000) throw error;

      await patientCounterCollection.updateOne(filter, {
        $max: { sequence: highestExistingSequence },
      });
    }
  })();

  patientCounterInitialization.set(year, initialization);
  try {
    await initialization;
  } catch (error) {
    patientCounterInitialization.delete(year);
    throw error;
  }
}

export async function connectToMongoDB() {
  try {
    await client.connect();

    db = client.db("doc_sheba_db");

    // Collection Initializations
    userCollection = db.collection("user");
    patientCollection = db.collection("patients");
    patientCounterCollection = db.collection("counters");
    doctorCollection = db.collection("doctors");
    assistantCollection = db.collection("assistants");
    departmentCollection = db.collection("departments");
    appointmentCollection = db.collection("appointments");
    scheduleCollection = db.collection("schedules");
    medicalRecordCollection = db.collection("medicalRecords");
    prescriptionCollection = db.collection("prescriptions");
    notificationCollection = db.collection("notifications");

    try {
      await patientCollection.createIndex(
        { patientID: 1 },
        {
          unique: true,
          partialFilterExpression: {
            patientID: { $type: "string", $gt: "" },
          },
          name: "unique_nonempty_patient_id",
        }
      );
    } catch (error) {
      console.error(
        "Could not create a unique patientID index. Resolve duplicate existing patient IDs before restarting.",
        error
      );
      throw error;
    }

    await initializePatientCounter(new Date().getFullYear());

    const patientsWithoutID = await patientCollection.countDocuments({
      $or: [
        { patientID: { $exists: false } },
        { patientID: null },
        { patientID: "" },
      ],
    });
    if (patientsWithoutID > 0) {
      console.warn(
        `${patientsWithoutID} existing patient record(s) have no patientID. Backfill only after confirming their account mapping.`
      );
    }

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

app.get("/api/my/doctors", async (req, res) => {
  const query = {};
  if (req.query.doctorID) {
    query.doctorID = req.query.doctorID;
  }
  const result = await doctorCollection.findOne(query);
  res.send(result);
});

app.post("/api/doctors", async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).send({
      success: false,
      message: "Doctor details must be provided as an object",
    });
  }

  const doctor = { ...req.body };
  delete doctor._id;

  try {
    const result = await doctorCollection.insertOne(doctor);
    res.status(201).send({ ...doctor, _id: result.insertedId });
  } catch (error) {
    console.error("Failed to create doctor:", error);
    res.status(500).send({
      success: false,
      message: "Failed to create doctor profile",
    });
  }
});

app.get("/api/doctors", async (req, res) => {
  const result = await doctorCollection.find().toArray();
  res.send(result);
});

app.get("/api/my/patients", async (req, res) => {
  const { patientID, userID } = req.query;
  const query = userID
    ? { $or: [{ userID }, { patientID: userID }] }
    : patientID
      ? { patientID }
      : {};

  try {
    const result = await patientCollection.findOne(query);
    res.send(result);
  } catch (error) {
    console.error("Failed to fetch patient profile:", error);
    res.status(500).send({
      success: false,
      message: "Failed to fetch patient profile",
    });
  }
});

app.post("/api/patients", async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).send({
      success: false,
      message: "Patient details must be provided as an object",
    });
  }

  const patient = { ...req.body };
  delete patient.patientID;
  delete patient._id;

  try {
    const year = new Date().getFullYear();
    await initializePatientCounter(year);
    let result;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const counter = await patientCounterCollection.findOneAndUpdate(
        { _id: `patientID-${year}` },
        { $inc: { sequence: 1 } },
        {
          upsert: true,
          returnDocument: "after",
          includeResultMetadata: false,
        }
      );

      if (!counter || !Number.isSafeInteger(counter.sequence)) {
        throw new Error("The patient ID counter returned an invalid sequence");
      }

      patient.patientID = `PAT-${year}-${String(counter.sequence).padStart(5, "0")}`;

      try {
        result = await patientCollection.insertOne(patient);
        break;
      } catch (error) {
        const isDuplicatePatientID =
          error.code === 11000 && error.keyPattern?.patientID;
        if (!isDuplicatePatientID || attempt === 2) throw error;
      }
    }

    if (!result) throw new Error("Patient document insertion returned no result");
    res.status(201).send({ ...patient, _id: result.insertedId });
  } catch (error) {
    console.error("Failed to create patient:", error);
    const isDuplicatePatientID =
      error.code === 11000 && error.keyPattern?.patientID;

    if (isDuplicatePatientID) {
      return res.status(409).send({
        success: false,
        message: "The generated patient ID already exists. Please retry.",
      });
    }

    res.status(500).send({
      success: false,
      message: "Failed to create patient",
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
