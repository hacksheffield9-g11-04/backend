const express = require("express");
const { ENV } = require("./constants");
const { connect } = require("./database");
const CategoryModel = require("./models/category.model");
const { callChatGPT } = require("./chatgpt");
const app = express();

app.use(express.json());

app.get("/api/home", async (req, res) => {
  const categories = await CategoryModel.find().lean();
  return res.status(200).send(categories);
});

app.get("/api/generate", async (req, res) => {
  const { category, difficulty, length, durationPerDay } = req.query;

  const prompt = `Please give me a concise task plan for personal growth with the following properties
- ${category}
- ${length} weeks duration
- ${durationPerDay} minutes per day
- ${difficulty} difficulty
- one line per day`;
  const result = await callChatGPT(prompt);
  return res.status(200).send(result);
});

app.post("/api", (req, res) => {
  const { name } = req.body;
  res.json({ message: `Hello, ${name}!` });
});

(async function main() {
  await connect();
  app.listen(ENV.PORT, () => {
    console.log(`Server is running on http://localhost:${ENV.PORT}`);
  });
})();
