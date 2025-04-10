node -e "
const fs = require('fs');
fs.writeFileSync('test-server.js', `
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Basic route for testing
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Start server
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
`);
console.log('Created test-server.js');
"
