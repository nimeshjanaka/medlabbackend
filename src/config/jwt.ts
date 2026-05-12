import jwt from "jsonwebtoken";

const SECRET = process.env["JWT_SECRET"] ?? "fallback_secret_change_me";
const EXPIRES_IN = process.env["JWT_EXPIRES_IN"] ?? "7d";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, SECRET) as JwtPayload;
};

export const signResetToken = (userId: string): string => {
  return jwt.sign({ userId }, SECRET, { expiresIn: "1h" });
};
