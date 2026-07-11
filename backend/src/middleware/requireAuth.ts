// Express middleware that checks for a valid Supabase login token
// on incoming requests. Attach this to any route that should only
// work for a logged-in user (e.g. viewing your own portfolio,
// placing a trade).
//
// How a request is expected to look, once frontend sends one:
//   GET /api/portfolio
//   Authorization: Bearer <the user's JWT from Supabase Auth>

import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

// Extend Express's Request type so TypeScript knows req.user can exist.
// Without this, TypeScript would complain every time a route tries to
// read req.user, since it's not part of Express's built-in Request type.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
      };
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization; // e.g. "Bearer eyJhbGciOi..."

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);

  // Ask Supabase's Auth service: is this token real, and whose is it?
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  // Attach the verified user onto the request, so route handlers
  // downstream can read req.user.id
  req.user = {
    id: data.user.id,
    email: data.user.email,
  };

  next(); // hand off to whatever route handler comes next
}