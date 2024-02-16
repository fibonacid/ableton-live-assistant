import { config } from "dotenv";
import OpenAI from "openai";
import OSC from "osc-js";

const osc = new OSC({ plugin: new OSC.DatagramPlugin() });

// Listen for OSC messages on the specified port and host
osc.open({
  port: 11001, // the port used by AbletonOSC
  host: "0.0.0.0", // accept messages from any host
});

// Send an OSC message to the specified address
function sendMessage(address, ...args) {
  return osc.send(new OSC.Message(address, ...args), {
    port: 11000, // the port used by AbletonOSC
    host: "127.0.0.1", // the host where AbletonOSC is running
  });
}

// Wait for an OSC message on the specified address
function waitForMessage(address) {
  return new Promise((resolve) => {
    osc.on(address, (message) => {
      resolve(message);
    });
  });
}

async function getTempo() {
  const address = "/live/song/get/tempo";
  await sendMessage(address);
  const message = await waitForMessage(address);
  return message;
}

async function setTempo(bmp) {
  const address = "/live/song/set/tempo";
  await sendMessage(address, bmp);
  const message = await waitForMessage(address);
  return message;
}

// Load environment variables
config();

// Create an instance of the OpenAI client
const openai = new OpenAI(process.env.OPENAI_API_KEY);

async function main() {
  const messages = [
    {
      role: "system",
      content:
        "You are a smart Ableton Live controller. You receive commands in natural language and use tools to interact with the Live set.",
    },
    { role: "user", content: "Hello, what's the song tempo?" },
  ];

  // Send a message to the chat model
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages,
    tools: [
      {
        type: "function",
        function: {
          name: "get_song_tempo",
          description: "Get the tempo of the current song",
        },
      },
      {
        type: "function",
        function: {
          name: "set_song_tempo",
          description: "Set the tempo of the current song",
          parameters: {
            type: "object",
            properties: {
              bpm: {
                type: "number",
                description: "The new tempo in beats per minute",
              },
            },
            required: ["bpm"],
          },
        },
      },
    ],
  });
  // Unpack the response and grabs the first tool call
  const responseMessage = completion.choices[0]?.message;
  const toolCalls = responseMessage?.tool_calls;

  // Check if the response contains a tool call
  if (toolCalls) {
    // List available functions
    const availableFunctions = {
      get_song_tempo: getTempo,
      set_song_tempo: setTempo,
    };
    // Extend conversation with the tool call
    messages.push(responseMessage);

    // Iterate over the tool calls and execute the corresponding function
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const functionToCall = availableFunctions[functionName];
      const functionArgs = JSON.parse(toolCall.function.arguments);
      const functionResponse = await functionToCall(functionArgs);

      messages.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: functionName,
        content: functionResponse.toString(),
      }); // extend conversation with function response
    }

    // get a new response from the model where it can see the function response
    const secondResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
    });

    // Print out the natural language response
    console.log(secondResponse.choices[0].message.content);
  }
}

main();
