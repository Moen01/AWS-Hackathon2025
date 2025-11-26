import express, { Request, Response } from "express";

const app = express();

app.use(express.json());

app.get("/:token", (req: Request, res: Response) => {
  res.json({ email: "Hello from Express on AWS Lambda!" });
});

export default app;
