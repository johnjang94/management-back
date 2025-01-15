import { Request, Response, NextFunction } from "express";
import { sendVerificationEmail } from "../services/email-service";

const codes = new Map<string, { code: string; expiresAt: number }>();

export const generateAndSendCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    const existingCode = codes.get(email);
    if (existingCode && Date.now() < existingCode.expiresAt) {
      console.log("Valid code already exists. Reusing it.");
      res.status(200).json({ message: "please check your mailbox" });
      return;
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    codes.set(email, { code, expiresAt });

    try {
      await sendVerificationEmail(email, code);
      res.status(200).json({ message: "Verification code sent successfully" });
    } catch (error) {
      console.error("Error sending verification email:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  } catch (error) {
    next(error);
  }
};

export const verifyCode = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ message: "Email and code are required" });
      return;
    }

    const record = codes.get(email);
    if (!record) {
      res
        .status(404)
        .json({ message: "No verification code found for this email" });
      return;
    }

    if (Date.now() > record.expiresAt) {
      res.status(400).json({ message: "Verification code expired" });
      codes.delete(email);
      return;
    }

    if (record.code !== code) {
      res.status(400).json({ message: "Invalid verification code" });
      return;
    }

    codes.delete(email);
    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    next(error);
  }
};
