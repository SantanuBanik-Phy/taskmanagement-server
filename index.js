require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require("firebase-admin"); 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const WebSocket = require("ws");

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

    // Start WebSocket Server for real-time updates
    startWebSocketServer();
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

// Default Route
app.get('/', (req, res) => {
  res.send('Task Management Server is running');
});

// Start Server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  connectDB();
});
