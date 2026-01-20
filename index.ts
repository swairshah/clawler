import { query, type SDKMessage, type SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import { browserToolsServer, closeBrowser, browserConfig } from "./tools";
import { printUsage } from "./utils";

// Parse CLI arguments for --no-headless or --show-browser
const args = process.argv.slice(2);
if (args.includes("--no-headless") || args.includes("--show-browser")) {
  browserConfig.headless = false;
}

async function runCrawler(prompt: string) {
  async function* messageGenerator() {
    yield {
      type: "user" as const,
      message: {
        role: "user" as const,
        content: prompt
      }
    };
  }

  let resultMessage: SDKResultMessage | null = null;

  for await (const message of query({
    prompt: messageGenerator(),
    options: {
      model: "claude-haiku-4-5", 
      permissionMode: "acceptEdits",  
      mcpServers: {
        "browser-tools": browserToolsServer
      },
      allowedTools: ["mcp__browser-tools__*"],
      maxTurns: 100
    }
  })) {
    if (message.type === "assistant") {
      const content = (message as any).message?.content;
      if (content) {
        for (const block of content) {
          if (block.type === "text") {
            console.log("Assistant:", block.text);
          } else if (block.type === "tool_use") {
            console.log(`Tool: ${block.name}`, JSON.stringify(block.input, null, 2));
          }
        }
      }
    }

    if (message.type === "result") {
      resultMessage = message as SDKResultMessage;
      if (resultMessage.subtype === "success") {
        console.log("\n=== Result ===");
        console.log(resultMessage.result);
      }
    }
  }

  // Print usage summary at the end
  if (resultMessage) {
    printUsage(resultMessage);
  }

  // Clean up browser when done
  await closeBrowser();
}


/*
  go to https://elevenlabs.io/pricing
  get all the information about different APIs, tiers, for different users.
  make sure to toggle all the buttons to extract all the information.
  create markdown tables with all that information. 
*/

await runCrawler(`
go to https://news.ycombinator.com and create a markdown of first 10 stories.
and write it in report.md.
`);
