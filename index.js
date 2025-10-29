const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables from .env file
dotenv.config();

// --- Import Custom Components ---
const templateRoutes = require('./src/routes/template.routes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CORS Configuration (The Fix) ---
// Define allowed origins. This is crucial for local testing and production.
const allowedOrigins = [
  // Your frontend's local development origins (crucial for local testing)
  'http://localhost:3000', 
  'http://localhost:5173', 
  'http://localhost:5174', 
  
  // Add your Vercel deployment's primary domain (e.g., if you have a custom domain)
  // process.env.FRONTEND_URL, // Example: 'https://your-frontend.com' 
  
  // You might need to add the specific URL of your Vercel backend deployment here 
  // if you're hitting the API from another Vercel-hosted app.
];

const corsOptions = {
  // Check the request origin against the allowed list
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl requests) 
    // AND allow all listed origins.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS Blocked: Origin ${origin} not allowed.`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // Allow cookies/authorization headers
  optionsSuccessStatus: 204
};

// Apply the configured CORS middleware
app.use(cors(corsOptions)); 
app.use(express.json()); 

// --- Database Connection ---
let isConnected = false;
async function connectToMongoDB(){
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not defined in environment variables.");
    return;
  }
  
  try {
    // Note: useNewUrlParser and useUnifedTopology are deprecated in Mongoose 6+
    await mongoose.connect(uri);
    isConnected = true;
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
  }
}

// Middleware to handle serverless connection pooling
app.use(async (req,res,next)=>{
  if(!isConnected){
    // Wait for the connection attempt on a cold start
    await connectToMongoDB();
  }
  // Proceed regardless. If the connection failed, subsequent routes 
  // relying on the DB will handle the error (or fail gracefully).
  next();
});

// --- Routes Setup ---
app.get('/', (req, res) => {
  res.send('Template Service Backend is operational.');
});

// Load the Template CRUD routes under the base API path
app.use('/api/v1/templates', templateRoutes);

// --- Global Error Handler (MUST be the last piece of middleware) ---
app.use(errorHandler);

// do not use app.listen for vercel
module.exports = app
