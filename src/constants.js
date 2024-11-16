const ENV = {
  PORT: process.env.PORT,
  MONGO_URL: process.env.MONGO_URL,
  CHAT_GPT_API_KEY: process.env.CHAT_GPT_API_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
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
