import { config } from "dotenv";
import OpenAI from "openai";
import OSC from "osc-js";

const osc = new OSC({ plugin: new OSC.DatagramPlugin() });

// Listen for OSC messages on the specified port and host
osc.open({ 
    port: 11001, // the port used by AbletonOSC
    host: "0.0.0.0" // accept messages from any host
});

// Send an OSC message to the specified address
function sendMessage(address, ...args) {
    osc.send(new OSC.Message(address, ...args), {
        port: 11000, // the port used by AbletonOSC
        host: "127.0.0.1" // the host where AbletonOSC is running
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

// Load environment variables
config();

// Create an instance of the OpenAI client
const openai = new OpenAI(process.env.OPENAI_API_KEY);

async function main() {
    const messages = [{ role: "user", content: "Hello, what's the time?"}];

    // Send a message to the chat model
    const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages,
        tools: [{
            type: "function",
            function: {
                name: "get_current_time",
                description: "Returns the current time",
            }
        }]
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
            content: currentTime
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

