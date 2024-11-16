const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Welcome to the Express.js server!');
});

app.get('/api', (req, res) => {
    res.json({ message: 'Hello from the API!' });
});

app.post('/api', (req, res) => {
    const { name } = req.body;
    res.json({ message: `Hello, ${name}!` });
});

// Start the server
app.listen(process.env.PORT, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT}`);
});
