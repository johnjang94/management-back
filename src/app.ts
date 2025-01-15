import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import {
  registerUser,
  loginUser,
  validateRegister,
  validateLogin,
} from "./controllers/auth-controller";
import {
  generateAndSendCode,
  verifyCode,
} from "./controllers/verification-controller";
import { authenticateToken } from "./middleware/authenticate-token";
import {
  sendPasswordResetLink,
  resetPassword,
} from "./controllers/password-reset-controller";
import { ErrorRequestHandler } from "express";

dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 5173;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is not defined in the environment variables.");
}

app.use(cors());
app.use(bodyParser.json());

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Successfully connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  });

app.post("/api/sign-up-detail", validateRegister, registerUser);
app.post("/api/login", validateLogin, loginUser);
app.post("/api/verification", generateAndSendCode);
app.post("/api/verify-code", verifyCode);
app.get("/api/dashboard", authenticateToken, (req, res) => {
  res.json({ message: "Welcome to your dashboard!", user: req.user });
});
app.post("/api/logout", authenticateToken, (req, res) => {
  res.status(200).json({ message: "Logout successful." });
});

app.post("/api/password-reset/request-reset", sendPasswordResetLink);
app.post("/api/password-reset/reset-password", resetPassword);

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: "Something went wrong!" });
};
app.use(errorHandler);
