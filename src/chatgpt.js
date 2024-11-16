const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: "your-api-key-here",
});
const openai = new OpenAIApi(configuration);

async function callChatGPT(prompt) {
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
  }
}

module.exports = { callChatGPT };
