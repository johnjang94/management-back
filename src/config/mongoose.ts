import mongoose, { Schema, Document, Model } from "mongoose";

export const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "");
    console.log("MONGO_URI:", process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

interface IPasswordReset extends Document {
  userId: string;
  token: string;
  expiresAt: Date;
}

// 스키마 정의
const PasswordResetSchema: Schema = new Schema({
  userId: { type: String, required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

// 모델 정의
export const PasswordReset: Model<IPasswordReset> =
  mongoose.model<IPasswordReset>("PasswordReset", PasswordResetSchema);
