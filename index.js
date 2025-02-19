// server/index.js (Express.js and MongoDB - WITHOUT JWT)
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const cors = require('cors'); 

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json()); 




// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xd8qc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // await client.connect();
    const db = client.db("task_management"); // Database name
    const tasksCollection = db.collection("tasks"); // Collection name
    const usersCollection = db.collection("users"); // Collection for user data


  

    console.log("Connected to MongoDB");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();  // No need to close the client here, keep it open for the server
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Task Management Server is running');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});