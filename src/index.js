const express = require("express");
const { ENV } = require("./constants");
const { connect } = require("./database");
const CategoryModel = require("./models/category.model");
const { callChatGPT, processResponse, formatPrompt } = require("./chatgpt");
const Joi = require("joi");
const app = express();

app.use(express.json());

app.get("/", (req, res) =>
  res.status(200).send({
    message: "Hello, this is your server xD",
  })
);

app.get("/api/home", async (req, res) => {
  const categories = await CategoryModel.find().lean();
  return res.status(200).send(categories);
});

app.get("/api/generate", async (req, res) => {
  const { value, error } = Joi.object({
    category: Joi.string().valid("fitness", "mind", "knowledge").required(),
    difficulty: Joi.string().valid("easy", "medium", "hard").required(),
    durationPerDay: Joi.number().integer().min(1).max(180).required(),
  }).validate(req.query);
  if (error) return res.status(400).send(error.details[0].message);

  const prompt = formatPrompt(value);
  const result = await callChatGPT(prompt);
  return res
    .status(200)
    .send({ activities: processResponse(result), original: result });
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
