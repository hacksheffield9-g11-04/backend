const express = require("express");
const jwt = require("jsonwebtoken");
const { ENV } = require("./constants");
const { connect } = require("./database");
const CategoryModel = require("./models/category.model");
const { callChatGPT, processResponse, formatPrompt } = require("./chatgpt");
const Joi = require("joi");
const { ValidationError } = require("joi");
const { hashPassword, comparePassword } = require("./utils");
const UserModel = require("./models/user.model");
const { checkAuth } = require("./middleware");
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

app.get("/api/generate", checkAuth, async (req, res, next) => {
  const { value, error } = Joi.object({
    category: Joi.string().valid("fitness", "mind", "knowledge").required(),
    difficulty: Joi.string().valid("easy", "medium", "hard").required(),
    durationPerDay: Joi.number().integer().min(1).max(180).required(),
  }).validate(req.query);
  if (error) return next(error);

  try {
    const prompt = formatPrompt(value);
    const result = await callChatGPT(prompt);
    return res
      .status(200)
      .send({ activities: processResponse(result), original: result });
  } catch (err) {
    return next(err);
  }
});

app.post("/api/register", async (req, res, next) => {
  const { value, error } = Joi.object({
    name: Joi.string().min(4).required(),
    username: Joi.string().min(4).required(),
    password: Joi.string().min(8).required(),
  }).validate(req.body);
  if (error) return next(error);

  const { name, username, password } = value;

  try {
    const user = new UserModel({
      username,
      password: hashPassword(password),
      name,
    });
    await user.save();
    const token = jwt.sign({ name, username, _id: user._id }, ENV.JWT_SECRET, {
      expiresIn: "30d",
    });
    const response = { name, username, token };
    return res.status(201).send(response);
  } catch (err) {
    return next(err);
  }
});

app.post("/api/login", async (req, res, next) => {
  const { value, error } = Joi.object({
    username: Joi.string().min(4).required(),
    password: Joi.string().min(8).required(),
  }).validate(req.body);
  if (error) return next(error);

  const { username, password } = value;
  try {
    const user = await UserModel.findOne({ username }).lean().exec();
    if (!user || !comparePassword(password, user.password))
      return res.status(401).send("Incorrect credentials");

    const token = jwt.sign(
      { username, name: user.name, _id: user._id },
      ENV.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );
    const response = { name: user.name, username, token };
    return res.status(200).send(response);
  } catch (err) {
    return next(err);
  }
});

app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    const message = err.details[0].message;
    return res.status(400).send(message);
  }

  if (err && err.code === 11000) {
    return res.status(400).send(err.errorResponse.errmsg);
  }

  return res.status(500).send(err || "Something went wrong");
});
app.use((req, res, next) => res.status(400).send("Page not found"));

(async function main() {
  await connect();
  app.listen(ENV.PORT, () => {
    console.log(`Server is running on http://localhost:${ENV.PORT}`);
  });
})();
