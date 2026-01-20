import { z } from "zod";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { BrowserManager } from "agent-browser/dist/browser.js";

// Singleton browser instance shared across all tool calls
let browser: BrowserManager | null = null;

async function getBrowser(): Promise<BrowserManager> {
  if (!browser) {
    browser = new BrowserManager();
    await browser.launch({
      id: 'default',
      action: 'launch',
      headless: true,
      // Uncomment if you need to specify a custom Chrome/Chromium path:
      // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    });
  }
  return browser;
}

// Browser Navigation Tools

const browserLaunch = tool(
  "browser_launch",
  "Launch or ensure the browser is running. Call this before other browser operations.",
  {
    headless: z.boolean().optional().describe("Run in headless mode (default: true)"),
    viewport: z.object({
      width: z.number(),
      height: z.number()
    }).optional().describe("Viewport size")
  },
  async (args) => {
    try {
      if (browser?.isLaunched()) {
        return { content: [{ type: "text", text: "Browser already running" }] };
      }
      browser = new BrowserManager();
      await browser.launch({
        headless: args.headless ?? true,
        viewport: args.viewport
      });
      return { content: [{ type: "text", text: "Browser launched successfully" }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Launch failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserNavigate = tool(
  "browser_navigate",
  "Navigate to a URL",
  {
    url: z.string().url().describe("The URL to navigate to"),
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const page = b.getPage();
      await page.goto(args.url, { waitUntil: "domcontentloaded" });
      const title = await page.title();
      return {
        content: [{ type: "text", text: `Navigated to ${args.url}\nTitle: ${title}` }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Navigation failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserBack = tool(
  "browser_back",
  "Go back in browser history",
  {},
  async () => {
    try {
      const b = await getBrowser();
      await b.getPage().goBack();
      return { content: [{ type: "text", text: "Navigated back" }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Back failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserForward = tool(
  "browser_forward",
  "Go forward in browser history",
  {},
  async () => {
    try {
      const b = await getBrowser();
      await b.getPage().goForward();
      return { content: [{ type: "text", text: "Navigated forward" }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Forward failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserReload = tool(
  "browser_reload",
  "Reload the current page",
  {},
  async () => {
    try {
      const b = await getBrowser();
      await b.getPage().reload();
      return { content: [{ type: "text", text: "Page reloaded" }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Reload failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

// Element Interaction Tools

const browserClick = tool(
  "browser_click",
  "Click on an element. Supports CSS selectors or refs from snapshot (e.g., 'e1', '@e1')",
  {
    selector: z.string().describe("CSS selector or ref from snapshot"),
    button: z.enum(["left", "right", "middle"]).optional().describe("Mouse button"),
    clickCount: z.number().optional().describe("Number of clicks (2 for double-click)")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const locator = b.getLocator(args.selector);
      await locator.click({
        button: args.button,
        clickCount: args.clickCount
      });
      return { content: [{ type: "text", text: `Clicked "${args.selector}"` }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Click failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserHover = tool(
  "browser_hover",
  "Hover over an element (useful for dropdowns, tooltips)",
  {
    selector: z.string().describe("CSS selector or ref from snapshot")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const locator = b.getLocator(args.selector);
      await locator.hover();
      return { content: [{ type: "text", text: `Hovering over "${args.selector}"` }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Hover failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserFill = tool(
  "browser_fill",
  "Clear an input and fill it with text",
  {
    selector: z.string().describe("CSS selector or ref for input field"),
    text: z.string().describe("Text to fill")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const locator = b.getLocator(args.selector);
      await locator.fill(args.text);
      return { content: [{ type: "text", text: `Filled "${args.selector}"` }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Fill failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserType = tool(
  "browser_type",
  "Type text into an element (appends to existing content)",
  {
    selector: z.string().describe("CSS selector or ref for input field"),
    text: z.string().describe("Text to type"),
    delay: z.number().optional().describe("Delay between keystrokes in ms")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const locator = b.getLocator(args.selector);
      await locator.pressSequentially(args.text, { delay: args.delay });
      return { content: [{ type: "text", text: `Typed into "${args.selector}"` }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Type failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserSelect = tool(
  "browser_select",
  "Select option(s) from a dropdown",
  {
    selector: z.string().describe("CSS selector for select element"),
    values: z.union([z.string(), z.array(z.string())]).describe("Value(s) to select")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const locator = b.getLocator(args.selector);
      await locator.selectOption(args.values);
      return { content: [{ type: "text", text: `Selected in "${args.selector}"` }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Select failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserCheck = tool(
  "browser_check",
  "Check a checkbox or radio button",
  {
    selector: z.string().describe("CSS selector for checkbox/radio")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const locator = b.getLocator(args.selector);
      await locator.check();
      return { content: [{ type: "text", text: `Checked "${args.selector}"` }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Check failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserUncheck = tool(
  "browser_uncheck",
  "Uncheck a checkbox",
  {
    selector: z.string().describe("CSS selector for checkbox")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const locator = b.getLocator(args.selector);
      await locator.uncheck();
      return { content: [{ type: "text", text: `Unchecked "${args.selector}"` }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Uncheck failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserPress = tool(
  "browser_press",
  "Press a keyboard key (Enter, Tab, Escape, etc.)",
  {
    key: z.string().describe("Key to press (e.g., 'Enter', 'Tab', 'Escape', 'ArrowDown')"),
    selector: z.string().optional().describe("Optional selector to focus first")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      if (args.selector) {
        const locator = b.getLocator(args.selector);
        await locator.press(args.key);
      } else {
        await b.getPage().keyboard.press(args.key);
      }
      return { content: [{ type: "text", text: `Pressed "${args.key}"` }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Press failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserScroll = tool(
  "browser_scroll",
  "Scroll the page or an element",
  {
    selector: z.string().optional().describe("Element to scroll (scrolls page if omitted)"),
    x: z.number().optional().describe("Horizontal scroll amount"),
    y: z.number().optional().describe("Vertical scroll amount (positive = down)")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const page = b.getPage();

      if (args.selector) {
        const locator = b.getLocator(args.selector);
        await locator.scrollIntoViewIfNeeded();
      } else {
        await page.mouse.wheel(args.x || 0, args.y || 300);
      }
      return { content: [{ type: "text", text: "Scrolled" }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Scroll failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

// Screenshot & Page Info Tools

const browserScreenshot = tool(
  "browser_screenshot",
  "Take a screenshot and return it as an image for visual analysis",
  {
    fullPage: z.boolean().optional().describe("Capture full scrollable page"),
    selector: z.string().optional().describe("Capture only this element")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const page = b.getPage();

      let buffer: Buffer;
      if (args.selector) {
        const locator = b.getLocator(args.selector);
        buffer = await locator.screenshot({ type: "png" });
      } else {
        buffer = await page.screenshot({
          type: "png",
          fullPage: args.fullPage
        });
      }

      const base64 = buffer.toString("base64");

      return {
        content: [
          {
            type: "image",
            data: base64,
            mimeType: "image/png"
          } as any,
          {
            type: "text",
            text: "Screenshot captured. Analyze the image to understand page content and layout."
          }
        ]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Screenshot failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserSnapshot = tool(
  "browser_snapshot",
  "Get the accessibility tree with element refs for interaction. Use refs like 'e1' with other tools.",
  {
    interactive: z.boolean().optional().describe("Only show interactive elements"),
    compact: z.boolean().optional().describe("Compact output"),
    maxDepth: z.number().optional().describe("Limit tree depth")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const snapshot = await b.getSnapshot({
        interactive: args.interactive,
        compact: args.compact,
        maxDepth: args.maxDepth
      });

      return {
        content: [{
          type: "text",
          text: `Accessibility tree:\n${snapshot.text}\n\nUse element refs (e.g., 'e1', 'e2') with browser_click, browser_fill, etc.`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Snapshot failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserGetText = tool(
  "browser_get_text",
  "Get text content of an element",
  {
    selector: z.string().describe("CSS selector or ref")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const locator = b.getLocator(args.selector);
      const text = await locator.textContent();
      return { content: [{ type: "text", text: text || "(empty)" }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Get text failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserGetAttribute = tool(
  "browser_get_attribute",
  "Get an attribute value from an element",
  {
    selector: z.string().describe("CSS selector or ref"),
    attribute: z.string().describe("Attribute name (e.g., 'href', 'src', 'value')")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const locator = b.getLocator(args.selector);
      const value = await locator.getAttribute(args.attribute);
      return { content: [{ type: "text", text: value || "(null)" }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Get attribute failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserGetUrl = tool(
  "browser_get_url",
  "Get the current page URL",
  {},
  async () => {
    try {
      const b = await getBrowser();
      const url = b.getPage().url();
      return { content: [{ type: "text", text: url }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Get URL failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserGetTitle = tool(
  "browser_get_title",
  "Get the current page title",
  {},
  async () => {
    try {
      const b = await getBrowser();
      const title = await b.getPage().title();
      return { content: [{ type: "text", text: title }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Get title failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserEvaluate = tool(
  "browser_evaluate",
  "Execute JavaScript in the page context and return the result",
  {
    script: z.string().describe("JavaScript code to execute")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const result = await b.getPage().evaluate(args.script);
      return {
        content: [{
          type: "text",
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Evaluate failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

// Wait Tools

const browserWaitForSelector = tool(
  "browser_wait_for_selector",
  "Wait for an element to appear",
  {
    selector: z.string().describe("CSS selector to wait for"),
    state: z.enum(["attached", "detached", "visible", "hidden"]).optional()
      .describe("State to wait for (default: visible)"),
    timeout: z.number().optional().describe("Timeout in ms (default: 30000)")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      await b.getPage().waitForSelector(args.selector, {
        state: args.state || "visible",
        timeout: args.timeout || 30000
      });
      return { content: [{ type: "text", text: `Element "${args.selector}" found` }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Wait failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserWaitForUrl = tool(
  "browser_wait_for_url",
  "Wait for the URL to match a pattern",
  {
    url: z.string().describe("URL string or pattern to match"),
    timeout: z.number().optional().describe("Timeout in ms")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      await b.getPage().waitForURL(args.url, { timeout: args.timeout || 30000 });
      return { content: [{ type: "text", text: `URL matched: ${args.url}` }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Wait for URL failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserWait = tool(
  "browser_wait",
  "Wait for a specified duration",
  {
    ms: z.number().describe("Milliseconds to wait")
  },
  async (args) => {
    try {
      await new Promise(resolve => setTimeout(resolve, args.ms));
      return { content: [{ type: "text", text: `Waited ${args.ms}ms` }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Wait failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

// Tab Management

const browserNewTab = tool(
  "browser_new_tab",
  "Open a new browser tab",
  {
    url: z.string().url().optional().describe("URL to open in new tab")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const result = await b.newTab();
      if (args.url) {
        await b.getPage().goto(args.url);
      }
      return {
        content: [{
          type: "text",
          text: `Opened tab ${result.index} of ${result.total}${args.url ? ` at ${args.url}` : ""}`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `New tab failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserSwitchTab = tool(
  "browser_switch_tab",
  "Switch to a specific tab by index",
  {
    index: z.number().describe("Tab index (0-based)")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const result = await b.switchTo(args.index);
      return {
        content: [{
          type: "text",
          text: `Switched to tab ${result.index}: ${result.title}\nURL: ${result.url}`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Switch tab failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserListTabs = tool(
  "browser_list_tabs",
  "List all open tabs",
  {},
  async () => {
    try {
      const b = await getBrowser();
      const tabs = await b.listTabs();
      const tabList = tabs.map(t =>
        `${t.active ? "→ " : "  "}[${t.index}] ${t.title}\n     ${t.url}`
      ).join("\n");
      return { content: [{ type: "text", text: tabList }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `List tabs failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserCloseTab = tool(
  "browser_close_tab",
  "Close a tab",
  {
    index: z.number().optional().describe("Tab index to close (closes current if omitted)")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      const result = await b.closeTab(args.index);
      return {
        content: [{
          type: "text",
          text: `Closed tab ${result.closed}, ${result.remaining} tabs remaining`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Close tab failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

// Low-level Input (for precise control)

const browserMouseEvent = tool(
  "browser_mouse_event",
  "Inject a low-level mouse event at specific coordinates",
  {
    type: z.enum(["mousePressed", "mouseReleased", "mouseMoved", "mouseWheel"])
      .describe("Event type"),
    x: z.number().describe("X coordinate"),
    y: z.number().describe("Y coordinate"),
    button: z.enum(["left", "right", "middle", "none"]).optional(),
    clickCount: z.number().optional(),
    deltaX: z.number().optional().describe("Wheel delta X"),
    deltaY: z.number().optional().describe("Wheel delta Y")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      await b.injectMouseEvent({
        type: args.type,
        x: args.x,
        y: args.y,
        button: args.button,
        clickCount: args.clickCount,
        deltaX: args.deltaX,
        deltaY: args.deltaY
      });
      return { content: [{ type: "text", text: `Mouse ${args.type} at (${args.x}, ${args.y})` }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Mouse event failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

const browserKeyboardEvent = tool(
  "browser_keyboard_event",
  "Inject a low-level keyboard event",
  {
    type: z.enum(["keyDown", "keyUp", "char"]).describe("Event type"),
    key: z.string().optional().describe("Key value"),
    code: z.string().optional().describe("Key code"),
    text: z.string().optional().describe("Text to input (for char events)")
  },
  async (args) => {
    try {
      const b = await getBrowser();
      await b.injectKeyboardEvent({
        type: args.type,
        key: args.key,
        code: args.code,
        text: args.text
      });
      return { content: [{ type: "text", text: `Keyboard ${args.type}: ${args.key || args.text}` }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Keyboard event failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

// Browser Close

const browserClose = tool(
  "browser_close",
  "Close the browser completely",
  {},
  async () => {
    try {
      if (browser) {
        await browser.close();
        browser = null;
      }
      return { content: [{ type: "text", text: "Browser closed" }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Close failed: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

// Create MCP Server

export const browserToolsServer = createSdkMcpServer({
  name: "browser-tools",
  version: "1.0.0",
  tools: [
    // Launch & Navigation
    browserLaunch,
    browserNavigate,
    browserBack,
    browserForward,
    browserReload,
    // Element Interaction
    browserClick,
    browserHover,
    browserFill,
    browserType,
    browserSelect,
    browserCheck,
    browserUncheck,
    browserPress,
    browserScroll,
    // Screenshots & Info
    browserScreenshot,
    browserSnapshot,
    browserGetText,
    browserGetAttribute,
    browserGetUrl,
    browserGetTitle,
    browserEvaluate,
    // Waiting
    browserWaitForSelector,
    browserWaitForUrl,
    browserWait,
    // Tab Management
    browserNewTab,
    browserSwitchTab,
    browserListTabs,
    browserCloseTab,
    // Low-level Input
    browserMouseEvent,
    browserKeyboardEvent,
    // Cleanup
    browserClose
  ]
});

// Export function to close browser (for cleanup)
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
