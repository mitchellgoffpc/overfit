import type { User } from "@overfit/types";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
