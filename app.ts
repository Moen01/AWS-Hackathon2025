import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { generateEmail } from "./genrate-email";
import mockBankTransactions from "./mock/bank-transaction";
import {
  analyzeCardTransactions,
  generateMissingReceiptsEmail,
  mapAnalysisToTransactions,
} from "./bedrock-service";

const app = express();

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  const htmlPath = path.join(__dirname, "views", "index.html");
  const html = fs.readFileSync(htmlPath, "utf-8");
  res.send(html);
});

app.get("/check", async (req: Request, res: Response) => {
  const token = req.query.token as string;

  // Validate token (basic check for now)
  if (!token) {
    return res.status(400).send("Token is required");
  }

  const subset = mockBankTransactions.slice(0, 20);
  const result = await analyzeCardTransactions(subset);
  console.log("Analysis Result (IDs):", JSON.stringify(result, null, 2));

  // const enrichedResult = mapAnalysisToTransactions(result, subset);

  // const email = await generateMissingReceiptsEmail(enrichedResult);
  // console.log(email);
  const htmlPath = path.join(__dirname, "views", "email.html");
  let html = fs.readFileSync(htmlPath, "utf-8");

  // Replace placeholders with dynamic data
  html = html.replace("{{DATE}}", new Date().toLocaleDateString());
  // html = html.replace("{{BODY}}", email.body);
  // html = html.replace("{{SUBJECT}}", email.subject);
  html = html.replace("{{TOKEN}}", token);

  res.send(html);
});

export default app;
