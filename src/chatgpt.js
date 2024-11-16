const OpenAI = require("openai");
const { ENV } = require("./constants");

// const configuration = new Configuration({
//   apiKey: ENV.CHAT_GPT_API_KEY,
// });
// const openai = new OpenAIApi(configuration);
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

module.exports = { callChatGPT };
