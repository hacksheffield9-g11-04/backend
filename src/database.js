const mongoose = require("mongoose");
const { ENV } = require("./constants");

async function connect() {
  mongoose.connection.once("connected", () => {
    console.log(`Mongoose connected`);
  });
  mongoose.connection.on("error", (error) => {
    console.error(error);
  });
  return mongoose.connect(ENV.MONGO_URL, {});
}

module.exports = { connect };
