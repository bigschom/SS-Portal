// cors-test-server.js
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

// Configure CORS properly
app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  credentials: true, // Allow credentials (cookies, etc.)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
}));

// Make sure the body parser middleware is set up
app.use(express.json());

// Test route for GET
app.get('/api/test', (req, res) => {
  res.json({ message: 'GET request working!' });
});

// Test route for POST
app.post('/api/auth/login', (req, res) => {
  console.log('Received login request with body:', req.body);
  res.json({ message: 'Login endpoint reached successfully', body: req.body });
});

// Start server
console.log('Starting server with CORS enabled...');
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test with: http://localhost:3000 connecting to http://localhost:${PORT}`);
});