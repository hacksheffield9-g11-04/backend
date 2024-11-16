const express = require("express");
const { ENV } = require("./constants");
const { connect } = require("./database");
const CategoryModel = require("./models/category.model");
const app = express();

app.use(express.json());

app.get("/api/home", async (req, res) => {
  const categories = await CategoryModel.find().lean();
  return res.status(200).send(categories);
});

app.post("/api", (req, res) => {
  const { name } = req.body;
  res.json({ message: `Hello, ${name}!` });
});

// Start the server

(async function main() {
  await connect();
  app.listen(ENV.PORT, () => {
    console.log(`Server is running on http://localhost:${ENV.PORT}`);
  });
})();
