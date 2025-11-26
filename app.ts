import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";

const app = express();

app.use(express.json());

app.get("/:token", (req: Request, res: Response) => {
  res.json({ email: "Hello from Express on AWS Lambda!" });
});

app.get("/", (req: Request, res: Response) => {
  const htmlPath = path.join(__dirname, "views", "index.html");
  const html = fs.readFileSync(htmlPath, "utf-8");
  res.send(html);
});

app.get("/check", (req: Request, res: Response) => {
  const token = req.query.token as string;
  
  // Validate token (basic check for now)
  if (!token) {
    return res.status(400).send("Token is required");
  }
  
  const htmlPath = path.join(__dirname, "views", "email.html");
  let html = fs.readFileSync(htmlPath, "utf-8");
  
  // Replace placeholders with dynamic data
  html = html.replace("{{DATE}}", new Date().toLocaleDateString());
  html = html.replace("{{TOKEN}}", token);
  
  res.send(html);
});


export default app;
