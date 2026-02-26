import cors from "cors";
import express, { type Request, type Response } from "express";

import { API_VERSION, type HelloRequest, type HelloResponse, type NameResponse, makeHelloMessage } from "@app/shared";

const defaultName = "Ada";

export function createApp() {
  const app = express();
  let storedName = defaultName;

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", version: API_VERSION });
  });

  app.post("/api/hello", (req: Request<unknown, HelloResponse, HelloRequest>, res: Response<HelloResponse>) => {
    const trimmed = req.body.name?.trim();
    storedName = trimmed ? trimmed : defaultName;
    const message = makeHelloMessage(storedName);
    res.json({ message });
  });

  app.get("/api/name", (_req: Request, res: Response<NameResponse>) => {
    res.json({ name: storedName });
  });

  return app;
}
