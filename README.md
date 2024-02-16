## How to control Ableton Live with GPT-4 🎼

In this blog post i'll show you how to create an agent that receives instructions in natural language and performs actions on your Ableton Live instance. To keep it simple i'll  just show you how to get and set the song tempo, but the same concepts can be applied to obtain more complex behaviours.

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
import { config } from 'dotenv'

// Load the environment variables
config()

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
        messages: [{ role: "user", content: "Hello, how are you?"}]
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
