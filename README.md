## How to control Ableton Live with GPT-4 🎼

In this blog post i'll show you how to create an agent that receives instructions in natural language and performs actions on your Ableton Live instance. To keep it simple i'll just show you how to get and set the song tempo, but the same concepts can be applied to obtain more complex behaviours.

## Requirements

- [Ableton Live 11 or above](https://www.ableton.com/en/trial/)
- [Node.js 18 or above](https://nodejs.org/en/download)

## Ableton Setup

To build our agent we first need to establish a communication between our Node.js app and Ableton Live.
We can use a program called [AbletonOSC](https://github.com/ideoforms/AbletonOSC) to register a control surface that listen for commands over the network.

To install AbletonOSC refer to the [Installation](https://github.com/ideoforms/AbletonOSC?tab=readme-ov-file#installation) section.

## Node Setup

Create a directory called `ableton-live-assistant`, then open a terminal inside it and run this command:

```bash
npm init -y
```

Now, let's install some dependencies:

```bash
npm i dotenv openai osc-js
```

- `dotenv`: To load the OpenAI API key from a `.env` file.
- `openai`: To call the GPT-4 API.
- `osc-js`: To send commands to Ableton Live.

## OpenAI Setup

If you are new to OpenAI, refer to the [Quick Start](https://platform.openai.com/docs/quickstart/account-setup) guide to create an account and get an API key.

Once you have your API key, create a file called `.env` in the root of your project and add the following line:

```env
OPENAI_API_KEY=your-api-key
```

:warning: If your are using git, make sure to add `.env` to your `.gitignore` file.
This will prevent your API key from being exposed in case you push your code to a public repository.

```bash
echo .env >> .gitignore
```

## Loading the API key

Create a file called `index.mjs` and add the following code:

```javascript
import { config } from "dotenv";

// Load the environment variables
config();

// Print the API key to make sure that it was loaded correctly
console.log(process.env.OPENAI_API_KEY);
```

> We use the `mjs` extension to enable ES6 module syntax.

Let's try to run our code:

```bash
node index.mjs
```

If everything is working, you should see your API key printed in the terminal.

## Testing the OpenAI API

Before going too deep, let's demonstrate basic usage of the OpenAI API.
We are going to call the api with the question "Hello, how are you" and print the response.

```javascript
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
    messages: [{ role: "user", content: "Hello, how are you?" }],
  });
  // Unpack the response and print it
  const response = completion.choices[0]?.message?.content;
  console.log(response);
}

main();
```

Run the code and you should see the response printed in the terminal.

```
As an artificial intelligence, I don't have feelings, but I'm here, ready to assist you. How can I help you today?
```

### Creating an Agent

An agent is roughly a program that listens for commands and performs actions based on them. To achieve this with GPT-4 we can use OpenAI's [Function Calling API](https://platform.openai.com/docs/guides/function-calling).

The idea is to provide some tools to our model that can be used to perform actions. The model will try to interprate the verbal commands and decide which tool to use.

Let's demonstrate by modifying our previous code to ask the model what time it is.
The model cannot know the answer to this question because it doesn't have access to the system clock, but we can provide a tool that returns the current time.

```javascript
import { config } from "dotenv";
import OpenAI from "openai";

// Load environment variables
config();

// Create an instance of the OpenAI client
const openai = new OpenAI(process.env.OPENAI_API_KEY);

async function main() {
  const messages = [{ role: "user", content: "Hello, what's the time?" }];

  // Send a message to the chat model
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages,
    tools: [
      {
        type: "function",
        function: {
          name: "get_current_time",
          description: "Returns the current time",
        },
      },
    ],
  });
  // Unpack the response and grabs the first tool call
  const response = completion.choices[0]?.message;
  const toolCall = response?.tool_calls[0];

  // Store reply in the messages array
  messages.push(response);

  // Check if the tool call is the get_current_time function
  // This is a simple example, but you could have multiple tools
  if (toolCall.function.name === "get_current_time") {
    // Get current time from the operating system
    const currentTime = new Date().toLocaleTimeString();

    // Store function call result in the messages array
    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      name: toolCall.function.name,
      content: currentTime,
    });
  }

  // Send new completion with the updated messages array
  const secondResponse = await openai.chat.completions.create({
    model: "gpt-4",
    messages,
  });

  // Print out the natural language response
  console.log(secondResponse.choices[0].message.content);
}

main();
```

Run the code and you should see the response printed in the terminal.

```
The current time is 11:20:02 AM.
```

### Controlling Ableton Live

Now it's time to put everything together and create an agent that can control Ableton Live.

We are going to create a tool that can set and get the song tempo.
First, let's create some helpers to send and receive OSC messages.

```javascript
// other imports...
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

// rest of the program...
```

Now let's define the functions to get and set the song tempo.

```javascript
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
```

## Redefining the Agent

Now that we have a method to control Ableton we can extend our agent to use it.
First, let's add a system prompt to make the agent aware of its responsibilities.

```javascript
const messages = [
  {
    role: "system",
    content:
      "You are a smart Ableton Live controller. You receive commands in natural language and use tools to interact with the Live set.",
  },
  { role: "user", content: "Hello, what's the song tempo?" },
];
```

Then, let's redefine the tools to include the get and set tempo functions.

```javascript
const tools = [
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
];
```

Then, let's modify the code to handle different types of tools calls:

```javascript

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

    // same as before...
```

Now, let's run the code and see if it works.

```bash
The current song tempo is 120 beats per minute.
```

## Conclusion

The possibility of fusing the expressivity of natural language with the precision of software is fascinating.
This post was a bit rushed, but i hope it gave you an idea of how easy it is to create a conversational agent that controls Ableton Live.
In the future I might get back to this topic and show you how we could expand on this to make the agent a good companion for music production.
