const express = require('express');
const app = express();

// Define a port
const PORT = 3000;

// Middleware for parsing JSON requests
app.use(express.json());

// Route for the root URL
app.get('/', (req, res) => {
    res.send('Welcome to the Express.js server!');
});

// A sample GET route
app.get('/api', (req, res) => {
    res.json({ message: 'Hello from the API!' });
});

// A sample POST route
app.post('/api', (req, res) => {
    const { name } = req.body;
    res.json({ message: `Hello, ${name}!` });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
