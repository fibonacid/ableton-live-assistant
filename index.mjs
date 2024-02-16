import { config } from "dotenv";
import OpenAI from "openai";

// Load environment variables
config();

// Create an instance of the OpenAI client
const openai = new OpenAI(process.env.OPENAI_API_KEY);

async function main() {
    // Send a message to the chat model
    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hello, how are you?"}]
    });
    // Unpack the response and print it
    const response = completion.choices[0]?.message?.content;
    console.log(response);
}

main();