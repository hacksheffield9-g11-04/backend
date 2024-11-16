const express = require("express");
const { categories } = require("./constants");
const app = express();

app.use(express.json());

app.get("/api/home", (req, res) => {
  return res.status(200).send(categories);
});

app.post("/api", (req, res) => {
  const { name } = req.body;
  res.json({ message: `Hello, ${name}!` });
});

// Start the server
app.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});
