import "dotenv/config";
import mockBankTransactions from "./mock/bank-transaction";
import {
  analyzeCardTransactions,
  mapAnalysisToTransactions,
} from "./bedrock-service";

async function run() {
  console.log("Analyzing transactions...");
  try {
    // Take a subset to avoid hitting token limits if the list is huge
    const subset = mockBankTransactions.slice(0, 20);
    const result = await analyzeCardTransactions(subset);
    console.log("Analysis Result (IDs):", JSON.stringify(result, null, 2));

    const enrichedResult = mapAnalysisToTransactions(result, subset);
    console.log(
      "Enriched Result (Objects):",
      JSON.stringify(enrichedResult, null, 2)
    );
  } catch (error: any) {
    console.error("Failed to analyze:", error.message);
    if (
      error.name === "UnrecognizedClientException" ||
      error.name === "ExpiredTokenException"
    ) {
      console.error("\n⚠️  AWS Credentials Error:");
      console.error("Your AWS credentials seem to be invalid or expired.");
      console.error(
        "1. If you use a specific profile, try: export AWS_PROFILE=utvikling"
      );
      console.error(
        "2. Refresh your credentials: aws sso login --profile utvikling"
      );
    }
  }
}

run();
