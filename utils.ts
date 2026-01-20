import type { SDKResultMessage, ModelUsage } from "@anthropic-ai/claude-agent-sdk";

/**
 * Format a number with commas for readability
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format USD amount with appropriate precision
 */
function formatUSD(amount: number): string {
  if (amount < 0.01) {
    return `$${amount.toFixed(6)}`;
  }
  return `$${amount.toFixed(4)}`;
}

/**
 * Print usage summary from SDK result message
 */
export function printUsage(result: SDKResultMessage): void {
  console.log("\n" + "=".repeat(60));
  console.log("USAGE SUMMARY");
  console.log("=".repeat(60));

  // Overall usage from the result
  const usage = result.usage;
  console.log("\nToken Usage:");
  console.log(`  Input tokens:           ${formatNumber(usage.input_tokens)}`);
  console.log(`  Output tokens:          ${formatNumber(usage.output_tokens)}`);
  
  if (usage.cache_read_input_tokens) {
    console.log(`  Cache read tokens:      ${formatNumber(usage.cache_read_input_tokens)}`);
  }
  if (usage.cache_creation_input_tokens) {
    console.log(`  Cache creation tokens:  ${formatNumber(usage.cache_creation_input_tokens)}`);
  }
  
  const totalTokens = usage.input_tokens + usage.output_tokens;
  console.log(`  ---------------------------------`);
  console.log(`  Total tokens:           ${formatNumber(totalTokens)}`);

  // Per-model breakdown if available
  if (result.modelUsage && Object.keys(result.modelUsage).length > 0) {
    console.log("\nPer-Model Breakdown:");
    for (const [model, modelUsage] of Object.entries(result.modelUsage)) {
      console.log(`\n  Model: ${model}`);
      console.log(`    Input:  ${formatNumber(modelUsage.inputTokens)} tokens`);
      console.log(`    Output: ${formatNumber(modelUsage.outputTokens)} tokens`);
      if (modelUsage.cacheReadInputTokens) {
        console.log(`    Cache read:     ${formatNumber(modelUsage.cacheReadInputTokens)} tokens`);
      }
      if (modelUsage.cacheCreationInputTokens) {
        console.log(`    Cache creation: ${formatNumber(modelUsage.cacheCreationInputTokens)} tokens`);
      }
      console.log(`    Cost:   ${formatUSD(modelUsage.costUSD)}`);
    }
  }

  // Cost summary
  console.log("\nCost Summary:");
  console.log(`  Total cost: ${formatUSD(result.total_cost_usd)}`);

  // Execution stats
  console.log("\nExecution Stats:");
  console.log(`  Duration:     ${(result.duration_ms / 1000).toFixed(2)}s`);
  console.log(`  API time:     ${(result.duration_api_ms / 1000).toFixed(2)}s`);
  console.log(`  Turns:        ${result.num_turns}`);

  // Result status
  console.log("\nResult:");
  if (result.subtype === "success") {
    console.log(`  Status: Success`);
  } else {
    console.log(`  Status: ${result.subtype}`);
    if ("errors" in result && result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.join(", ")}`);
    }
  }

  // Permission denials if any
  if (result.permission_denials.length > 0) {
    console.log("\nPermission Denials:");
    for (const denial of result.permission_denials) {
      console.log(`  - ${denial.tool_name} (${denial.tool_use_id})`);
    }
  }

  console.log("\n" + "=".repeat(60));
}

/**
 * Create a compact usage string for inline logging
 */
export function getUsageString(result: SDKResultMessage): string {
  const usage = result.usage;
  const totalTokens = usage.input_tokens + usage.output_tokens;
  return `[${formatNumber(totalTokens)} tokens | ${formatUSD(result.total_cost_usd)} | ${result.num_turns} turns | ${(result.duration_ms / 1000).toFixed(1)}s]`;
}
