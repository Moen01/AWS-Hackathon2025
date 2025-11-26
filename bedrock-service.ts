import {
  BedrockClient,
  ListFoundationModelsCommand,
} from "@aws-sdk/client-bedrock";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import "dotenv/config";

const bedrockClient = new BedrockClient({
  region: process.env.AWS_REGION || "us-west-2",
});

const runtimeClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-west-2",
});

export interface BankTransaction {
  id: number;
  transactionCode: string;
  description: string;
  bookingDate: string;
  amount: number;
  [key: string]: any;
}

export interface TransactionAnalysisResult {
  subscriptions: number[];
  physical: number[];
}

export async function analyzeCardTransactions(
  transactions: BankTransaction[]
): Promise<TransactionAnalysisResult> {
  // List available models (just for demonstration/debug)
  try {
    const listCommand = new ListFoundationModelsCommand({});
    const listResponse = await bedrockClient.send(listCommand);
    console.log(
      "Available Bedrock Models (first 5):",
      listResponse.modelSummaries?.slice(0, 5).map((m) => m.modelId)
    );
  } catch (err) {
    console.warn("Failed to list models:", err);
  }

  // Filter relevant fields to reduce token usage
  const simplifiedTransactions = transactions.map((t) => ({
    id: t.id,
    description: t.description,
    amount: t.amount,
    transactionCode: t.transactionCode,
    bookingDate: t.bookingDate,
  }));

  const prompt = `
You are a financial assistant. Analyze the following bank transactions.
1. Identify which transactions are card payments (look for 'card' in transactionCode or typical card descriptions).
2. Categorize these card transactions into two groups:
   - "subscriptions": Recurring payments, online services, software (e.g., GitHub, Netflix, Adobe, ZTL Payment).
   - "physical": In-store purchases, restaurants, travel, physical goods bought in person.

Return ONLY a valid JSON object with this structure:
{
  "subscriptions": [list of transaction IDs],
  "physical": [list of transaction IDs]
}

Transactions:
${JSON.stringify(simplifiedTransactions, null, 2)}
`;

  const input = {
    modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    }),
  };

  try {
    const command = new InvokeModelCommand(input);
    const response = await runtimeClient.send(command);

    const responseBody = new TextDecoder().decode(response.body);
    const result = JSON.parse(responseBody);

    // Extract the JSON from the content text (Claude returns it in content[0].text)
    const contentText = result.content[0].text;

    // Find the JSON block in case there's extra text
    const jsonMatch = contentText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found in response");
    }
  } catch (error) {
    console.error("Error invoking Bedrock:", error);
    throw error;
  }
}

export interface EnrichedTransactionAnalysisResult {
  subscriptions: BankTransaction[];
  physical: BankTransaction[];
}

export function mapAnalysisToTransactions(
  analysis: TransactionAnalysisResult,
  transactions: BankTransaction[]
): EnrichedTransactionAnalysisResult {
  const findTransactions = (ids: number[]) =>
    transactions.filter((t) => ids.includes(t.id));

  return {
    subscriptions: findTransactions(analysis.subscriptions),
    physical: findTransactions(analysis.physical),
  };
}

export async function generateMissingReceiptsEmail(
  data: EnrichedTransactionAnalysisResult
): Promise<{ subject: string; body: string }> {
  const prompt = `
Du er en regnskapsførerassistent. Skriv en e-post til en kunde for å etterspørre manglende kvitteringer for følgende transaksjoner.

Kategoriser dem tydelig i e-posten som "Abonnementer/Tjenester" og "Fysiske kjøp/Reise".

Abonnementer som mangler bilag:
${JSON.stringify(
  data.subscriptions.map((t) => ({
    dato: t.bookingDate,
    beskrivelse: t.description,
    beløp: t.amount,
  })),
  null,
  2
)}

Fysiske kjøp som mangler bilag:
${JSON.stringify(
  data.physical.map((t) => ({
    dato: t.bookingDate,
    beskrivelse: t.description,
    beløp: t.amount,
  })),
  null,
  2
)}

Returner svaret som et JSON-objekt med feltene "subject" og "body".
"body" skal være selve e-postteksten (i HTML-format, bruk <br> for linjeskift).
Språk: Norsk.
`;

  const input = {
    modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    }),
  };

  try {
    const command = new InvokeModelCommand(input);
    const response = await runtimeClient.send(command);

    const responseBody = new TextDecoder().decode(response.body);
    const result = JSON.parse(responseBody);
    const contentText = result.content[0].text;

    const jsonMatch = contentText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found in response");
    }
  } catch (error) {
    console.error("Error generating email:", error);
    throw error;
  }
}
