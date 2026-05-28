import jwt from "jsonwebtoken";

export function getAppleClientSecret(): string {
  const privateKey = process.env.AUTH_APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!privateKey || !process.env.AUTH_APPLE_TEAM_ID || !process.env.AUTH_APPLE_KEY_ID || !process.env.AUTH_APPLE_ID) {
    throw new Error("Apple Sign In environment variables are not configured.");
  }

  return jwt.sign({}, privateKey, {
    algorithm: "ES256",
    expiresIn: "180d",
    issuer: process.env.AUTH_APPLE_TEAM_ID,
    audience: "https://appleid.apple.com",
    subject: process.env.AUTH_APPLE_ID,
    keyid: process.env.AUTH_APPLE_KEY_ID,
  });
}