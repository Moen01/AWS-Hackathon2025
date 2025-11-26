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
    modelId: "global.anthropic.claude-sonnet-4-20250514-v1:0",
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

export interface ReceiptGuideItem {
  transactionId: number;
  service: string;
  description: string;
  howToGetReceipt: string;
  directLink?: string;
}

export interface ReceiptGuideResult {
  guides: ReceiptGuideItem[];
  generalInstructions: string;
}

export async function generateReceiptGuide(
  subscriptions: BankTransaction[]
): Promise<ReceiptGuideResult> {
  const prompt = `
Du er en regnskapsførerassistent. En kunde trenger hjelp med å finne kvitteringer for følgende abonnementstransaksjoner.

For hver transaksjon, analyser beskrivelsen og identifiser tjenesten, og gi DETALJERTE instruksjoner om hvordan kunden kan finne/laste ned kvitteringen.

Inkluder:
1. Navnet på tjenesten/selskapet
2. Steg-for-steg instruksjoner for å finne kvitteringen
3. Direktelenke til fakturaside hvis mulig (for vanlige tjenester som GitHub, AWS, Adobe, etc.)

Transaksjoner:
${JSON.stringify(
  subscriptions.map((t) => ({
    id: t.id,
    dato: t.bookingDate,
    beskrivelse: t.description,
    beløp: t.amount,
  })),
  null,
  2
)}

Returner et JSON-objekt med denne strukturen:
{
  "guides": [
    {
      "transactionId": number,
      "service": "Navn på tjenesten",
      "description": "Kort beskrivelse av hva dette er",
      "howToGetReceipt": "Detaljerte steg-for-steg instruksjoner",
      "directLink": "URL hvis tilgjengelig (valgfritt)"
    }
  ],
  "generalInstructions": "Generelle tips for å finne kvitteringer"
}

Språk: Norsk. Vær spesifikk og hjelpsom.
`;

  const input = {
    modelId: "global.anthropic.claude-sonnet-4-20250514-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 3000,
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
    console.error("Error generating receipt guide:", error);
    throw error;
  }
}

export async function generateMissingReceiptsEmail(
  data: EnrichedTransactionAnalysisResult
): Promise<{ subject: string; body: string }> {
  // First, generate receipt guide for subscriptions
  let receiptGuideHtml = "";
  if (data.subscriptions.length > 0) {
    const receiptGuide = await generateReceiptGuide(data.subscriptions);

    // Build HTML for receipt guides
    receiptGuideHtml = `
<h3 style="color: #2c3e50; margin-top: 30px;">📋 Guide: Slik finner du kvitteringer for abonnementer</h3>
<p>Her er instruksjoner for hvordan du finner kvitteringer for hver tjeneste:</p>
`;

    receiptGuide.guides.forEach((guide) => {
      receiptGuideHtml += `
<div style="background: #f8f9fa; border-left: 4px solid #3498db; padding: 15px; margin: 15px 0; border-radius: 4px;">
  <h4 style="color: #2980b9; margin-top: 0;">${guide.service}</h4>
  <p><strong>Beskrivelse:</strong> ${guide.description}</p>
  <p style="color: #7f8c8d; font-size: 0.9em;">Transaksjon ID: ${
    guide.transactionId
  }</p>
  <div style="line-height: 1.6; white-space: pre-wrap;">
    <strong>Slik finner du kvitteringen:</strong><br>
    ${guide.howToGetReceipt}
  </div>
  ${
    guide.directLink
      ? `<a href="${guide.directLink}" style="display: inline-block; margin-top: 10px; padding: 10px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 4px;">🔗 Gå til fakturaside</a>`
      : ""
  }
</div>
`;
    });

    receiptGuideHtml += `
<div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
  <h4 style="color: #2e7d32; margin-top: 0;">💡 Generelle tips</h4>
  <p>${receiptGuide.generalInstructions}</p>
</div>
`;
  }

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

VIKTIG: Jeg har allerede generert en detaljert guide for abonnementene som vil bli inkludert i e-posten. 
Du trenger IKKE å lage instruksjoner for hvordan man finner kvitteringer for abonnementer - dette er allerede håndtert.

Fokuser på:
1. En vennlig introduksjon
2. List opp de fysiske kjøpene som trenger kvitteringer
3. Be kunden om å laste opp kvitteringene
4. En avslutning

Returner svaret som et JSON-objekt med feltene "subject" og "body".
"body" skal være selve e-postteksten (i HTML-format, bruk <br> for linjeskift).
Språk: Norsk.
`;

  const input = {
    modelId: "global.anthropic.claude-sonnet-4-20250514-v1:0",
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
      const emailData = JSON.parse(jsonMatch[0]);

      // Inject the receipt guide HTML into the email body after the main content
      if (receiptGuideHtml) {
        emailData.body = emailData.body + receiptGuideHtml;
      }

      return emailData;
    } else {
      throw new Error("No JSON found in response");
    }
  } catch (error) {
    console.error("Error generating email:", error);
    throw error;
  }
}
