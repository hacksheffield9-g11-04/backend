const OpenAI = require("openai");
const R = require("ramda");
const { ENV } = require("./constants");

const openai = new OpenAI({
  apiKey: ENV.CHAT_GPT_API_KEY,
});

async function callChatGPT(prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0]?.message?.content;
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
  }
}

function formatPrompt(queries) {
  const { category, difficulty, durationPerDay } = queries;
  const prompt = `Please give me a concise daily routine for personal growth with the following properties
  - ${category}
  - ${durationPerDay} minutes per day
  - ${difficulty} difficulty
  - one line per activity
  - no title`;
  return prompt;
}

function processResponse(response) {
  return R.compose(R.map(R.trim), R.split("\n"))(response);
}

module.exports = { callChatGPT, processResponse, formatPrompt };
