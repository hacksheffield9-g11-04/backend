const ENV = {
  PORT: process.env.PORT,
  MONGO_URL: process.env.MONGO_URL,
};

const categories = [
  {
    id: 1,
    name: "Fitness",
  },
  {
    id: 2,
    name: "Knowledge",
  },
  {
    id: 3,
    name: "Mind",
  },
];

module.exports = { ENV, categories };
