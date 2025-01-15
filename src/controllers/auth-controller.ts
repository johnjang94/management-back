import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import User from "../models/user";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

export const validateRegister = [
  body("email").isEmail().withMessage("Please enter a valid email address."),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters."),
];

export const validateLogin = [
  body("email").isEmail().withMessage("Please enter a valid email address."),
  body("password").notEmpty().withMessage("Password is required."),
];

export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("Validation errors:", errors.array());
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { email, password } = req.body;
  const name = req.body.name || email.split("@")[0];

  try {
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      res.status(400).send({
        message:
          "It seems like you already have an account with us. Please proceed to login.",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ email, password: hashedPassword, name });
    await newUser.save();

    if (!JWT_SECRET || !JWT_EXPIRES_IN) {
      throw new Error("JWT_SECRET or JWT_EXPIRES_IN is not defined");
    }

    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.status(201).send({ message: "Thank you for joining us!", token });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).lean();
    if (!user) {
      console.log("User not found:", email);
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
      return;
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "",
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 720);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
