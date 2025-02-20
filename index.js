require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require("firebase-admin"); 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json()); 

// Initialize Firebase Admin SDK
const serviceAccount = require("./firebase_credentials.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xd8qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Keep database connection active
let db, tasksCollection, usersCollection;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("task_management"); 
    tasksCollection = db.collection("tasks");
    usersCollection = db.collection("users");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
  }
}

// Middleware: Verify Firebase Token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized' });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; 
    next();
  } catch (error) {
    return res.status(401).send({ message: 'Unauthorized' });
  }
};

// API: Create a Task
app.post('/tasks', verifyToken, async (req, res) => {
  try {
    const task = req.body;

    // Add a valid timestamp to the task
    task.timestamp = new Date().toISOString(); // ISO string format for date

    // Ensure the task is associated with the user
    task.uid = req.user.uid; 

    const result = await tasksCollection.insertOne(task);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Error adding task", error });
  }
});

// API: Update a Task
app.put('/tasks/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, category } = req.body; // Only allow valid fields

    const filter = { _id: new ObjectId(id), uid: req.user.uid };
    const updateDoc = {
      $set: {
        ...(title && { title }),
        ...(description && { description }),
        ...(category && { category }),
      },
    };

    const result = await tasksCollection.updateOne(filter, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Task not found or unauthorized" });
    }

    res.json({ message: "Task updated successfully", id });
  } catch (error) {
    res.status(500).json({ message: "Error updating task", error });
  }
});

// API: Delete a Task
app.delete('/tasks/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id), uid: req.user.uid };

    const result = await tasksCollection.deleteOne(filter);

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Task not found or unauthorized" });
    }

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Error deleting task", error });
  }
});

// API: Store User Info (On First Login)
app.put('/users', async (req, res) => {
  try {
    const user = req.body;
    const filter = { uid: user.uid };
    const options = { upsert: true };
    const updateDoc = { $set: user };

    const result = await usersCollection.updateOne(filter, updateDoc, options);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Error storing user data", error });
  }
});

// API: Get User Tasks
app.get('/tasks', verifyToken, async (req, res) => {
  try {
    const tasks = await tasksCollection.find({ uid: req.user.uid }).toArray();
    res.send(tasks);
  } catch (error) {
    res.status(500).send({ message: "Error retrieving tasks", error });
  }
});

// Default Route
app.get('/', (req, res) => {
  res.send('Task Management Server is running');
});

// Start Server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  connectDB();
});
