require("dotenv").config({ path: ".env.local" });
const nodemailer = require("nodemailer");

export async function sendVerificationEmail(
  email: string,
  code: string
): Promise<void> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: `"OperateEase" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "OperateEase - Verification Code",
      text: `Your verification code is ${code}. It is valid for 5 minutes.`,
      html: `<p>Your verification code is <strong>${code}</strong>. It is valid for 5 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Verification email sent to:", email);
  } catch (error) {
    console.error("Error sending verification email:", error);
  }
}
