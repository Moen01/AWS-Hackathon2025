import express, { Request, Response } from "express";

const app = express();

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from Express on AWS Lambda!" });
});

app.get("/hello", (req: Request, res: Response) => {
  res.json({ message: "Hello World!" });
});

export default app;
