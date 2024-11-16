const express = require("express");
const mongoose = require("mongoose");
const R = require("ramda");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const { ENV } = require("./constants");
const { v4: uuid } = require("uuid");
const { connect } = require("./database");
const CategoryModel = require("./models/category.model");
const {
  callChatGPT,
  processResponse,
  formatPrompt,
  dummyResponse,
} = require("./chatgpt");
const Joi = require("joi");
Joi.objectId = require("joi-objectid")(Joi);
const { ValidationError } = require("joi");
const {
  hashPassword,
  comparePassword,
  hasADateWithinRange,
  reshapeActivity,
} = require("./utils");
const UserModel = require("./models/user.model");
const { checkAuth } = require("./middleware");
const ActivityModel = require("./models/activity.model");
const app = express();
const cors = require("cors");

app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
    return res.status(200).send(dummyResponse);
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
    limit: Joi.number().integer().default(100),
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
      result = { data: R.map(reshapeActivity, data), count };
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
        data: data.map(({ _id, activities }) => ({
          activities: activities.map(reshapeActivity),
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

app.patch(
  "/api/activities/:_id/toggle-complete",
  checkAuth,
  async (req, res, next) => {
    const { value, error } = Joi.object({
      _id: Joi.objectId().required(),
      complete: Joi.boolean().required(),
    }).validate({ ...req.params, ...req.body });
    if (error) return next(error);

    const userId = req.user._id;
    try {
      const activity = await ActivityModel.findOne({
        _id: value._id,
        savedBy: userId,
      });
      if (!activity) throw new Error("Activity not found");

      const timestampCompletedToday = hasADateWithinRange(
        activity.datesCompleted
      );

      if (!!timestampCompletedToday && value.complete)
        throw new Error("Already completed");

      if (value.complete) {
        // Complete the activity by adding today to the list of completed dates
        activity.datesCompleted.push(moment().utc().toISOString());
        await activity.save();
      } else {
        // Un-complete the activity
        activity.datesCompleted = activity.datesCompleted.filter(
          (date) => date !== timestampCompletedToday
        );
        await activity.save();
      }

      return res.status(200).send(activity);
    } catch (err) {
      return next(err);
    }
  }
);

app.get("/api/activities/tree", checkAuth, async (req, res, next) => {
  const { value, error } = Joi.object({
    tag: Joi.string(),
  }).validate({ ...req.query });
  if (error) return next(error);
  const userId = req.user._id;
  const { tag } = value;

  try {
    const activitiesByTag = await ActivityModel.aggregate([
      {
        $match: {
          savedBy: new mongoose.Types.ObjectId(userId),
          ...(tag ? { tag } : {}),
        },
      },
      {
        $group: {
          _id: "$tag",
          activities: { $push: "$$ROOT" },
        },
      },
    ]);

    if (activitiesByTag.length === 0) throw new Error("No activity tags found");
    const { activities, tag: tagId } = activitiesByTag[0];
    const createdAt = activities[0].createdAt; // all createdAt in same tag are the identical

    // generate date range
    const startDate = moment(createdAt);
    const numberOfDays = 21;
    const dateRange = Array.from({ length: numberOfDays }, (_, i) => {
      return startDate.clone().add(i, "days").startOf("day");
    });

    const graph = dateRange.map((startDate) => {
      const endDate = startDate.clone().add(1, "days");
      const activitiesToday = [];

      activities.forEach((activity) => {
        const datesCompleted = activity.datesCompleted;
        if (hasADateWithinRange(datesCompleted, startDate, endDate)) {
          activitiesToday.push(R.pick(["_id", "name"])(activity));
        }
      });

      return { startDate, activities: activitiesToday };
    });

    return res.status(200).send({ tag: tagId, graph });
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

  return res.status(500).send(err.message || "Something went wrong");
});

app.use((req, res, next) => res.status(400).send("Resource not found"));

(async function main() {
  await connect();
  app.listen(ENV.PORT, () => {
    console.log(`Server is running on http://localhost:${ENV.PORT}`);
  });
})();
