const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    tag: {
      type: String, // to group activities into cards
    },
    savedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    datesCompleted: {
      type: [Date],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const ActivityModel = mongoose.model("Activity", activitySchema, "activities");
module.exports = ActivityModel;
