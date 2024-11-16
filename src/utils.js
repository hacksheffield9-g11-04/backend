const { ENV } = require("./constants");
const crypto = require("crypto");
const moment = require("moment");

function hashPassword(password) {
  const hash = crypto
    .createHash("sha256", ENV.JWT_SECRET)
    .update(password)
    .digest("hex");
  return hash;
}

function comparePassword(plainPassword, hashedPassword) {
  return hashPassword(plainPassword) === hashedPassword;
}

function hasADateWithinRange(dateList = [], momentRangeStart, momentRangeEnd) {
  const rangeStart = momentRangeStart || moment().utc().startOf("day");
  const rangeEnd = momentRangeEnd || moment().utc().endOf("day");
  return dateList.find((isoDate) => {
    const date = moment(isoDate);
    return date.isSameOrAfter(rangeStart) && date.isBefore(rangeEnd);
  });
}

function reshapeActivity(activity) {
  const todayCompletionTimestamp = hasADateWithinRange(activity.datesCompleted);
  return {
    ...activity,
    isCompletedToday: !!todayCompletionTimestamp,
  };
}

module.exports = {
  hashPassword,
  comparePassword,
  hasADateWithinRange,
  reshapeActivity,
};
