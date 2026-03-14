import type { User } from "@underfit/types";

declare global {
  namespace Express {
    interface Request {
      user: User;
    }
  }
}

export {};
