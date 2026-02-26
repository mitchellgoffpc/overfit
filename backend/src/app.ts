import cors from "cors";
import express, { type Request, type Response } from "express";

import { API_VERSION, type HelloRequest, type HelloResponse, makeHelloMessage } from "@app/shared";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", version: API_VERSION });
  });

  app.post("/api/hello", (req: Request<unknown, HelloResponse, HelloRequest>, res: Response<HelloResponse>) => {
    const message = makeHelloMessage(req.body.name);
    res.json({ message });
  });

  return app;
}
