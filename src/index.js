const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { ENV } = require("./constants");
const { v4: uuid } = require("uuid");
const { connect } = require("./database");
const CategoryModel = require("./models/category.model");
const { callChatGPT, processResponse, formatPrompt } = require("./chatgpt");
const Joi = require("joi");
const { ValidationError } = require("joi");
const { hashPassword, comparePassword } = require("./utils");
const UserModel = require("./models/user.model");
const { checkAuth } = require("./middleware");
const ActivityModel = require("./models/tasks.model");
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

app.get("/api/activities", checkAuth, async (req, res, next) => {
  const { value, error } = Joi.object({
    groupByTag: Joi.boolean().default(true),
    limit: Joi.number().integer().default(10),
    skip: Joi.number().integer().default(0),
  }).validate(req.query);
  if (error) return next(error);
  const { groupByTag, skip, limit } = value;

  const userId = req.user._id;
  try {
    let result;
    if (!groupByTag) {
      const filter = { savedBy: userId };
      const [data, count] = await Promise.all([
        ActivityModel.find(filter).skip(skip).limit(limit).lean().exec(),
        ActivityModel.find(filter).countDocuments(),
      ]);
      result = { data, count };
    } else {
      const [{ data, count }] = await ActivityModel.aggregate([
        {
          $match: {
            savedBy: new mongoose.Types.ObjectId(userId),
          },
        },
        {
          $group: {
            _id: "$tag",
            activities: { $push: "$$ROOT" },
          },
        },
        {
          $facet: {
            data: [
              {
                $skip: skip,
              },
              {
                $limit: limit,
              },
            ],
            count: [
              {
                $count: "count",
              },
            ],
          },
        },
      ]);
      result = {
        data: data.map(({ _id, ...data }) => ({
          ...data,
          tag: _id,
        })),
        count: count[0]?.count,
      };
    }
    return res.status(200).send(result);
  } catch (err) {
    return next(err);
  }
});

app.post("/api/activities", checkAuth, async (req, res, next) => {
  const { value, error } = Joi.object({
    activities: Joi.array().items(Joi.string()).min(1).required(),
  }).validate(req.body);
  if (error) return next(error);

  const userId = req.user._id;
  const tag = uuid();
  try {
    const activities = value.activities.map((activity) => ({
      name: activity,
      tag,
      savedBy: userId,
    }));
    const result = await ActivityModel.insertMany(activities);
    return res.status(201).send(result);
  } catch (err) {
    return next(err);
  }
});

// Auth
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

  console.log(err);
  return res.status(500).send(err || "Something went wrong");
});

app.use((req, res, next) => res.status(400).send("Page not found"));

(async function main() {
  await connect();
  app.listen(ENV.PORT, () => {
    console.log(`Server is running on http://localhost:${ENV.PORT}`);
  });
})();
