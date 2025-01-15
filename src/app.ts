import express, {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";
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

dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 5173;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is not defined in the environment variables.");
}

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.set("strictQuery", false);
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

// Routes
app.post("/api/sign-up-detail", validateRegister, registerUser);
app.post("/api/login", validateLogin, loginUser);
app.post("/api/verification", generateAndSendCode);
app.post("/api/verify-code", verifyCode);

// Extend Request for authenticated routes
interface AuthenticatedRequest extends Request {
  user?: any;
}

app.get(
  "/api/dashboard",
  authenticateToken,
  (req: AuthenticatedRequest, res: Response) => {
    res.json({ message: "Welcome to your dashboard!", user: req.user });
  }
);

app.post(
  "/api/logout",
  authenticateToken,
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({ message: "Logout successful." });
  }
);

app.post("/api/password-reset/request-reset", sendPasswordResetLink);
app.post("/api/password-reset/reset-password", resetPassword);

// Error Handling Middleware
const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err.stack);
  res.status(500).send({ message: "Something went wrong!" });
};
app.use(errorHandler);
