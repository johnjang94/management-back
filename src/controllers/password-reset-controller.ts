import { RequestHandler } from "express";
import bcrypt from "bcrypt";
import PasswordReset from "../models/password-reset";
import User from "../models/user";
import nodemailer from "nodemailer";

export const sendPasswordResetLink: RequestHandler = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res
      .status(400)
      .json({ message: "We need your email address to help you reset." });
    return;
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({
        message:
          "Hmm... we do not seem to know this email address. Could you kindly check the email address again, please?",
      });
      return;
    }

    const rawToken = `${user._id}-${Date.now()}`;
    const hashedToken = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await PasswordReset.create({
      userId: user._id,
      token: hashedToken,
      expiresAt,
    });

    const resetLink = `http://localhost:5173/reset?token=${encodeURIComponent(
      rawToken
    )}`;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: `
        <p>Hello,</p>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    res.status(200).json({ message: "Password reset link sent." });
  } catch (error) {
    console.error("Error sending password reset email:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const resetPassword: RequestHandler = async (
  req,
  res
): Promise<void> => {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400).json({ message: "Token and password are required." });
    return;
  }

  try {
    const passwordReset = await PasswordReset.findOne({
      expiresAt: { $gte: new Date() },
    });

    if (!passwordReset) {
      res.status(400).json({ message: "Invalid or expired token." });
      return;
    }

    const isValidToken = await bcrypt.compare(token, passwordReset.token);
    if (!isValidToken) {
      res.status(400).json({ message: "Invalid token." });
      return;
    }

    const user = await User.findById(passwordReset.userId);
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    await PasswordReset.deleteOne({ _id: passwordReset._id });

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Changed Successfully",
      html: `
        <p>Hello ${user.name || "User"},</p>
        <p>Your password has been successfully changed.</p>
        <p>If you did not perform this action, please contact our support team immediately.</p>
        <p>Regards,<br/>The Support Team</p>
      `,
    });

    res
      .status(200)
      .json({
        message: "Password reset successful.",
        redirectTo: "/confirmation",
      });
  } catch (error) {
    console.error("Error during password reset:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
