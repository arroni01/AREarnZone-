import express from "express";
import { createServer as createViteServer } from "vite";
import { OAuth2Client } from "google-auth-library";
import cookieParser from "cookie-parser";
import path from "path";
import nodemailer from "nodemailer";
import fs from "fs";

// Storage and Local DB File Constants
const STORAGE_FILE = path.join(process.cwd(), "telegram-bot-storage.json");
const CONFIG_FILE = path.join(process.cwd(), "telegram-bot-config.json");

interface BotStorage {
  registeredCodes?: { [code: string]: { expectedPhone: string; timestamp: number } };
  pendingCodes?: { [telegramId: string]: string };
  [code: string]: any; // for code to mapping
}

// Helpers for Bot configuration and local storage persistence
function loadBotStorage(): BotStorage {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      return JSON.parse(fs.readFileSync(STORAGE_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("[Telegram Bot] Error reading storage:", err);
  }
  return {};
}

function saveBotStorage(storage: BotStorage) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2), "utf-8");
  } catch (err) {
    console.error("[Telegram Bot] Error writing storage:", err);
  }
}

function getTelegramConfig() {
  let config: any = {
    token: "",
    username: "@AREarnZone_bot",
    channel: "https://t.me/arearnzone",
    smtpList: []
  };
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch (e) {}

  // Prioritize environment variables to prevent secure credential leaks
  const envToken = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
  if (envToken) {
    config.token = envToken;
  }
  return config;
}

async function startServer() {
  // Load environment variables from .env file if available
  try {
    const dotenvPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(dotenvPath)) {
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(dotenvPath);
      } else {
        const envContent = fs.readFileSync(dotenvPath, 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const parts = trimmed.split('=');
            if (parts.length >= 2) {
              const key = parts[0].trim();
              const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
              process.env[key] = val;
            }
          }
        });
      }
    }
  } catch (e) {
    console.warn("[Server] Could not load .env file:", e);
  }

  const app = express();
  const PORT = 3000;

  // CORS Middleware to allow cross-origin requests from the custom Firebase Hosting domain
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());
  app.use(cookieParser());

  // 301 Permanent Redirect from arearnzone.ai.studio to arearnzone-asia-no1-freelance.web.app (excluding API requests)
  app.use((req, res, next) => {
    const host = req.headers.host || "";
    const xForwardedHost = req.headers['x-forwarded-host'];
    const actualHost = (Array.isArray(xForwardedHost) ? xForwardedHost[0] : xForwardedHost) || host;

    // Skip redirecting API routes so that proxies on Custom Domain continue to work
    if (actualHost.includes("arearnzone.ai.studio") && !req.path.startsWith("/api/")) {
      const targetUrl = `https://arearnzone-asia-no1-freelance.web.app${req.originalUrl}`;
      console.log(`[Domain Redirect] Redirecting ${actualHost}${req.originalUrl} -> ${targetUrl}`);
      return res.redirect(301, targetUrl);
    }
    next();
  });

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  
  // Use the provided App URL as default if env var is missing
  const DEFAULT_APP_URL = "https://ais-dev-h4thh2b6cws4brqp63elrb-90229307226.asia-southeast1.run.app";
  const APP_URL = (process.env.APP_URL || DEFAULT_APP_URL).replace(/\/$/, "");

  const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

  const getRequestOrigin = (req: express.Request): string => {
    const xForwardedHost = req.headers['x-forwarded-host'];
    const rawHost = (Array.isArray(xForwardedHost) ? xForwardedHost[0] : xForwardedHost) || req.headers.host || "";
    
    // Determine the protocol. We must use HTTPS for anything deployed (such as *.run.app)
    let protocol = "https";
    if (rawHost.includes("localhost") || rawHost.includes("127.0.0.1")) {
      protocol = "http";
    }
    
    let origin = `${protocol}://${rawHost}`.replace(/\/$/, "");
    
    // If the detected origin is empty, fallback to APP_URL
    if (!rawHost) {
      origin = APP_URL;
    }
    
    // Force HTTPS for any deployed context (e.g. *.run.app)
    if (origin.includes("run.app") && origin.startsWith("http://")) {
      origin = origin.replace("http://", "https://");
    }
    
    return origin;
  };

  // Tiered Email Verification State Tracking
  const emailStats = {
    date: new Date().toISOString().split('T')[0],
    gmailCount: 0,
    smtpCounts: {} as { [email: string]: number }
  };

  const otpStorage: { [email: string]: { code: string; expires: number; createdAt: number } } = {};

  const checkAndResetDailyStats = () => {
    const today = new Date().toISOString().split('T')[0];
    if (emailStats.date !== today) {
      emailStats.date = today;
      emailStats.gmailCount = 0;
      emailStats.smtpCounts = {};
      console.log(`[Email system] Reset daily email tracker for new day: ${today}`);
    }
  };

  interface SMTPConfig {
    user: string;
    pass: string;
    limit: number;
  }

  const getSMTPList = (): SMTPConfig[] => {
    const config = getTelegramConfig();
    const list: SMTPConfig[] = [];

    // Check if env fallback is present and not explicitly disabled/deleted
    const envUser = process.env.GMAIL_USER;
    const envPass = process.env.GMAIL_APP_PASSWORD;

    const disabledSmtps: string[] = Array.isArray(config.disabledSmtps) ? config.disabledSmtps : [];
    const isEnvDisabled = envUser && disabledSmtps.includes(envUser.trim().toLowerCase());

    if (envUser && envPass && !isEnvDisabled) {
      list.push({
        user: envUser.trim(),
        pass: envPass.trim(),
        limit: 500
      });
    }

    if (config.smtpList && config.smtpList.length > 0) {
      for (const item of config.smtpList) {
        // Avoid duplicate of envUser if it's already in the list or added with same user
        const alreadyExists = list.some(existing => existing.user.toLowerCase() === item.user.toLowerCase());
        if (!alreadyExists) {
          list.push(item);
        }
      }
    }

    return list;
  };

  const getActiveSMTP = (): { smtp: SMTPConfig | null; index: number } => {
    const list = getSMTPList();
    if (list.length === 0) return { smtp: null, index: -1 };
    
    checkAndResetDailyStats();
    
    for (let i = 0; i < list.length; i++) {
      const smtp = list[i];
      const count = emailStats.smtpCounts[smtp.user] || 0;
      if (count < smtp.limit) {
        return { smtp, index: i };
      }
    }
    
    // All SMTPs are depleted
    return { smtp: null, index: -1 };
  };

  const getTransporter = (user: string, pass: string) => {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: user,
        pass: pass.replace(/\s+/g, "") // Strip any spaces (classic Gmail App Password paste issue)
      }
    });
  };

  // API 1: Tiered Send OTP
  app.post("/api/auth/send-otp", async (req, res) => {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    checkAndResetDailyStats();

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStorage[email] = {
      code,
      expires: Date.now() + 10 * 60 * 1000,
      createdAt: Date.now()
    };

    if (email.toLowerCase().endsWith("@example.com") || email.toLowerCase().includes("example.com") || email.toLowerCase() === "sandbox-user@example.com") {
      console.log(`[SMTP] Skipping OTP email for sandbox/demo user: ${email}, OTP is ${code}`);
      return res.json({ 
        success: true, 
        message: "Demo Mode OTP Bypass: " + code,
        demoCode: code
      });
    }

    const list = getSMTPList();
    let failedSmtpUsersThisRequest: string[] = [];

    while (true) {
      let smtp = null;
      let index = -1;

      // Find next active SMTP, skipping those that failed in this request
      for (let i = 0; i < list.length; i++) {
        const candidate = list[i];
        if (failedSmtpUsersThisRequest.includes(candidate.user.toLowerCase())) {
          continue;
        }
        const count = emailStats.smtpCounts[candidate.user] || 0;
        if (count < candidate.limit) {
          smtp = candidate;
          index = i;
          break;
        }
      }

      // No active SMTP server is working or available
      if (!smtp) {
        console.log(`[SMTP Error] Cannot send OTP for ${email}. No active or working SMTP servers configured or all SMTP limits reached.`);
        return res.status(503).json({
          error: "আমাদের ওটিপি প্রেরক সার্ভারটি বর্তমানে ওভারলোডেড অথবা বন্ধ আছে। দয়া করে এডমিন-এর সাথে যোগাযোগ করুন অথবা কিছুক্ষণ পর পুনরায় চেষ্টা করুন।"
        });
      }

      try {
        console.log(`[SMTP] Attempting to send OTP via ${smtp.user}...`);
        const transporter = getTransporter(smtp.user, smtp.pass);
        const mailOptions = {
          from: `"AR Earn Zone" <${smtp.user}>`,
          to: email,
          subject: `Your Verification Code: ${code} - AR Earn Zone`,
          text: `Hello ${name || "User"},\n\nYour AR Earn Zone verification OTP code is: ${code}\n\nThis code will expire in 10 minutes.\n\nBest regards,\nAR Earn Zone Team`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>AR Earn Zone Verification Code</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <!-- Hidden preheader text to control Gmail preview snippet -->
              <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; color: #fff; line-height: 1px;">
                আপনার ভেরিফিকেশন কোডটি হলো ${code}। Your AR Earn Zone verification code is ${code}. Please enter this code to complete verification.
              </div>
              
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f6f9fc; padding: 40px 10px;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02); border: 1px solid #eef2f6;">
                      <!-- Header Accent -->
                      <tr>
                        <td height="6" style="background-color: #10b981;"></td>
                      </tr>
                      
                      <!-- Brand / Logo Area -->
                      <tr>
                        <td align="center" style="padding: 30px 30px 10px 30px;">
                          <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #10b981; letter-spacing: -0.5px; font-family: 'Space Grotesk', -apple-system, sans-serif;">
                            AR Earn Zone
                          </h1>
                          <p style="margin: 5px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
                            Secure Verification
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Main Content -->
                      <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                          <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; font-weight: 500; line-height: 1.5;">
                            প্রিয় <strong>${name || "ব্যবহারকারী"}</strong> (Hello <strong>${name || "User"}</strong>),
                          </p>
                          <p style="margin: 0 0 24px 0; font-size: 13.5px; color: #475569; line-height: 1.6; font-weight: 400;">
                            আপনার একাউন্টের নিরাপত্তা নিশ্চিত করতে একটি ওটিপি (OTP) ভেরিফিকেশন কোড প্রয়োজন। নিচের কোডটি ব্যবহার করে ভেরিফিকেশন সম্পন্ন করুন:
                            <br>
                            <span style="display: block; margin-top: 6px; font-size: 12px; color: #64748b; font-style: italic;">
                              (To ensure your account security, a verification OTP code is required. Please use the following code to complete your verification:)
                            </span>
                          </p>
                          
                          <!-- OTP Box -->
                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                            <tr>
                              <td align="center" style="background-color: #f0fdf4; border: 2px dashed #10b981; border-radius: 16px; padding: 20px;">
                                <div style="font-size: 36px; font-weight: 900; color: #059669; letter-spacing: 6px; font-family: 'JetBrains Mono', Courier, monospace; margin-left: 6px;">
                                  ${code}
                                </div>
                              </td>
                            </tr>
                          </table>
                          
                          <!-- Expiry & Warning -->
                          <p style="margin: 0 0 10px 0; font-size: 12.5px; color: #ef4444; font-weight: 700; line-height: 1.5; text-align: center;">
                            ⚠️ এই কোডটি পরবর্তী ১০ মিনিটের জন্য কার্যকর থাকবে।
                          </p>
                          <p style="margin: 0 0 24px 0; font-size: 11px; color: #ef4444; font-weight: 500; line-height: 1.5; text-align: center; font-style: italic;">
                            This code is valid for 10 minutes. Please do not share this OTP with anyone for your own security.
                          </p>
                          
                          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
                          
                          <!-- Support Info -->
                          <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.6; text-align: center;">
                            যদি আপনি এই অনুরোধটি না করে থাকেন, তবে দয়া করে এই ইমেইলটি উপেক্ষা করুন। 
                            <br>
                            <span style="font-style: italic; display: block; margin-top: 2px;">
                              If you did not request this code, please ignore this email.
                            </span>
                          </p>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
                          <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            © ${new Date().getFullYear()} AR Earn Zone. All rights reserved.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `
        };

        await transporter.sendMail(mailOptions);
        emailStats.gmailCount++;
        emailStats.smtpCounts[smtp.user] = (emailStats.smtpCounts[smtp.user] || 0) + 1;
        console.log(`[SMTP] OTP successfully sent via ${smtp.user}`);
        return res.json({ success: true, message: `OTP sent successfully via SMTP (${smtp.user}).` });
      } catch (error: any) {
        console.error(`[SMTP Failure] Sending failed via ${smtp.user}:`, error);
        // Add to failed lists for this request to avoid infinite loops
        failedSmtpUsersThisRequest.push(smtp.user.toLowerCase());
        // To prevent retrying this broken SMTP on subsequent requests, set its count to limit
        emailStats.smtpCounts[smtp.user] = smtp.limit;
      }
    }
  });

  // API 2: Verify OTP
  app.post("/api/auth/verify-otp", (req, res) => {
    const { email } = req.body;
    const otp = req.body.otp || req.body.code;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required." });
    }

    const record = otpStorage[email];
    if (record) {
      if (record.expires < Date.now()) {
        delete otpStorage[email];
        return res.status(400).json({ error: "OTP expired. Please request a new one." });
      }
      if (record.code === otp.trim()) {
        delete otpStorage[email];
        return res.json({ success: true, message: "OTP verified successfully." });
      }
    }
    return res.status(400).json({ error: "The OTP you entered is incorrect. Please try again." });
  });

  // API 2B: Send Automated Notifications
  app.post("/api/email/notify", async (req, res) => {
    const { email, name, type, amount, method } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    if (email.toLowerCase().endsWith("@example.com") || email.toLowerCase().includes("example.com") || email.toLowerCase() === "sandbox-user@example.com") {
      console.log(`[SMTP] Skipping notification email for sandbox/demo user: ${email}`);
      return res.json({ success: true, message: "Skipped sending email to sandbox/demo address to prevent bouncing." });
    }

    const list = getSMTPList();
    if (list.length === 0) {
      console.warn(`[SMTP Warning] Notification email not sent to ${email} (no SMTP credentials configured).`);
      return res.json({ success: false, message: "No SMTP configuration available to send emails." });
    }

    let subject = "Account Notification - AR Earn Zone";
    let htmlContent = "";
    const cleanName = name || "User";

    if (type === "withdrawal_processed") {
      subject = "Your Withdrawal Request is Processed! - AR Earn Zone";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #10b981; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">AR EARN ZONE</h2>
            <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin: 5px 0 0 0; letter-spacing: 2px;">Payout Successful</p>
          </div>
          
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hello <strong>${cleanName}</strong>,</p>
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 1px;">Amount Disbursed</p>
            <h1 style="margin: 5px 0; color: #15803d; font-size: 36px; font-weight: 900;">৳${amount || "0.00"}</h1>
            <p style="margin: 5px 0 0 0; font-size: 13px; font-weight: 700; color: #166534;">via ${method || "Bkash/Nagad"}</p>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 12px;">
            আপনার উইথড্রয়াল আবেদনটি সফলভাবে প্রসেস করা হয়েছে এবং টাকা আপনার উল্লেখিত অ্যাকাউন্টে পাঠিয়ে দেওয়া হয়েছে। আমাদের সাথে কাজ করার জন্য আপনাকে ধন্যবাদ!
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 25px;">
            Your withdrawal request has been processed successfully, and the funds have been sent to your designated account. Thank you for being a valued member of AR Earn Zone!
          </p>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification. Please do not reply to this email.</p>
        </div>
      `;
    } else if (type === "account_verified") {
      subject = "Congratulations! Your Account is Verified - AR Earn Zone";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #3b82f6; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">AR EARN ZONE</h2>
            <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin: 5px 0 0 0; letter-spacing: 2px;">Account Status: Verified</p>
          </div>
          
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hello <strong>${cleanName}</strong>,</p>
          
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <span style="font-size: 32px; display: block; margin-bottom: 5px;">✅</span>
            <p style="margin: 0; font-size: 16px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 1px;">Account Verified</p>
            <p style="margin: 5px 0 0 0; font-size: 13px; font-weight: 700; color: #1e40af;">You now have premium access!</p>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 12px;">
            অভিনন্দন! আপনার AR Earn Zone অ্যাকাউন্টটি সফলভাবে ভেরিফাই করা হয়েছে। আপনি এখন সমস্ত প্রিমিয়াম ফিচার, বেশি আয়ের টাস্ক এবং উইথড্র অপশন ব্যবহার করতে পারবেন।
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 25px;">
            Congratulations! Your AR Earn Zone account is now fully verified. You can now access all premium tasks, features, and withdrawal options to maximize your earnings.
          </p>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification. Please do not reply to this email.</p>
        </div>
      `;
    } else if (type === "account_suspended") {
      subject = "Alert: Your Account Access has been Suspended - AR Earn Zone";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #ef4444; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">AR EARN ZONE</h2>
            <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin: 5px 0 0 0; letter-spacing: 2px;">Account Status: Suspended</p>
          </div>
          
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hello <strong>${cleanName}</strong>,</p>
          
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <span style="font-size: 32px; display: block; margin-bottom: 5px;">❌</span>
            <p style="margin: 0; font-size: 16px; font-weight: 800; color: #991b1b; text-transform: uppercase; letter-spacing: 1px;">Access Revoked</p>
            <p style="margin: 5px 0 0 0; font-size: 13px; font-weight: 700; color: #991b1b;">Your account has been suspended</p>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 12px;">
            প্রিয় গ্রাহক, নিয়মের চরম লংঘন অথবা সন্দেহজনক কার্যক্রমের কারণে আপনার AR Earn Zone অ্যাকাউন্টটি সাময়িকভাবে স্থগিত (Suspended) করা হয়েছে। এ বিষয়ে জানতে বা সমাধান করতে এডমিনের সাথে যোগাযোগ করুন।
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 25px;">
            Dear user, your AR Earn Zone account has been suspended due to violations of our terms of service or suspicious activities. If you believe this was a mistake, please reach out to our support channel/admin for review.
          </p>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification. Please do not reply to this email.</p>
        </div>
      `;
    } else if (type === "account_unsuspended") {
      subject = "Good News: Your Account Access is Restored! - AR Earn Zone";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #10b981; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">AR EARN ZONE</h2>
            <p style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin: 5px 0 0 0; letter-spacing: 2px;">Account Status: Restored</p>
          </div>
          
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hello <strong>${cleanName}</strong>,</p>
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <span style="font-size: 32px; display: block; margin-bottom: 5px;">🎉</span>
            <p style="margin: 0; font-size: 16px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 1px;">Access Restored</p>
            <p style="margin: 5px 0 0 0; font-size: 13px; font-weight: 700; color: #166534;">Welcome back to AR Earn Zone!</p>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 12px;">
            আপনার AR Earn Zone অ্যাকাউন্টটি পুনরায় সক্রিয় (Activated) করা হয়েছে। আপনি এখন পূর্বের ন্যায় পুনরায় কাজ এবং উইথড্র করতে পারবেন।
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 25px;">
            Your AR Earn Zone account has been successfully restored. You can now log back in, continue performing tasks, and request withdrawals as usual.
          </p>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification. Please do not reply to this email.</p>
        </div>
      `;
    } else {
      return res.status(400).json({ error: "Invalid notification type." });
    }

    let failedSmtpUsersThisRequest: string[] = [];

    while (true) {
      let smtp = null;
      for (let i = 0; i < list.length; i++) {
        const candidate = list[i];
        if (failedSmtpUsersThisRequest.includes(candidate.user.toLowerCase())) {
          continue;
        }
        const count = emailStats.smtpCounts[candidate.user] || 0;
        if (count < candidate.limit) {
          smtp = candidate;
          break;
        }
      }

      if (!smtp) {
        console.error(`[SMTP Error] Cannot send notification email to ${email}. All SMTP limits reached or servers failing.`);
        return res.status(503).json({ error: "Failed to send notification email. No working SMTP server available." });
      }

      try {
        console.log(`[SMTP] Sending notification email (${type}) to ${email} via ${smtp.user}...`);
        const transporter = getTransporter(smtp.user, smtp.pass);
        const mailOptions = {
          from: `"AR Earn Zone" <${smtp.user}>`,
          to: email,
          subject: subject,
          text: `Hello ${cleanName},\n\nYour account has been updated.\n\nBest regards,\nAR Earn Zone Team`,
          html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        emailStats.gmailCount++;
        emailStats.smtpCounts[smtp.user] = (emailStats.smtpCounts[smtp.user] || 0) + 1;
        console.log(`[SMTP] Notification email successfully sent via ${smtp.user}`);
        return res.json({ success: true, message: `Notification email sent successfully via SMTP (${smtp.user}).` });
      } catch (error: any) {
        console.error(`[SMTP Failure] Sending failed via ${smtp.user}:`, error);
        failedSmtpUsersThisRequest.push(smtp.user.toLowerCase());
        emailStats.smtpCounts[smtp.user] = smtp.limit;
      }
    }
  });

  // API 3: Get Google OAuth URL
  app.get("/api/auth/google/url", (req, res) => {
    const client_id = process.env.GOOGLE_CLIENT_ID;
    const client_secret = process.env.GOOGLE_CLIENT_SECRET;
    
    // Retrieve origin from query parameter (sent from window.location.origin) or fallback
    let origin = req.query.origin as string;
    if (!origin || typeof origin !== "string") {
      origin = getRequestOrigin(req);
    }
    origin = origin.replace(/\/$/, "");

    if (!client_id || !client_secret) {
      // Return a demo sandbox mode link if not configured yet
      const backendOrigin = getRequestOrigin(req);
      const sandboxUrl = `${backendOrigin}/api/auth/callback/google?code=sandbox_demo`;
      const expectedRedirect = `${origin}/api/auth/callback/google`;
      return res.json({ 
        url: sandboxUrl, 
        redirectUri: expectedRedirect,
        isSandbox: true
      });
    }

    const expectedRedirect = `${origin}/api/auth/callback/google`;
    const oauth2Client = new OAuth2Client(client_id, client_secret, expectedRedirect);
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email"
      ],
      prompt: "consent",
      state: origin // pass the origin in state parameter so callback can reconstruct redirectUri
    });

    res.json({ 
      url: authUrl, 
      redirectUri: expectedRedirect,
      isSandbox: false
    });
  });

  // API 4: Google OAuth Callback Handler (Popup Receiver)
  app.get(["/auth/google/callback", "/api/auth/callback/google"], async (req, res) => {
    const { code, state } = req.query;

    let profile = {
      email: "sandbox-user@example.com",
      name: "Demo User",
      id: "102930293019302"
    };

    // Retrieve the origin at the top level
    let origin = state as string;
    if (!origin || typeof origin !== "string") {
      origin = getRequestOrigin(req);
    }
    origin = origin.replace(/\/$/, "");

    if (code && code !== "sandbox_demo" && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      try {
        // Dynamically match the callback path that was actually triggered to prevent code exchange mismatches
        const currentPath = req.path;
        const redirectUri = `${origin}${currentPath}`;

        console.log("[Google OAuth Callback] Exchanging code using redirectUri:", redirectUri);

        const oauth2Client = new OAuth2Client(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          redirectUri
        );
        const { tokens } = await oauth2Client.getToken(code as string);
        oauth2Client.setCredentials(tokens);

        const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        const data = await response.json();
        if (data && data.email) {
          profile = {
            email: data.email,
            name: data.name || data.given_name || "Google User",
            id: data.id || "unknown"
          };
        }
      } catch (err: any) {
        console.error("[Google OAuth Callback Error]:", err);
        return res.send(`
          <html>
            <body>
              <script>
                alert("Google authentication failed: ${err.message || "Unknown error"}");
                window.close();
              </script>
            </body>
          </html>
        `);
      }
    }

    return res.send(`
      <html>
        <body>
          <script>
            const profileData = ${JSON.stringify(profile)};
            if (window.opener) {
              try {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', user: profileData }, '*');
                window.close();
              } catch (e) {
                console.error("postMessage to opener failed, redirecting window:", e);
                window.location.href = "${origin}/#/auth/google/success?user=" + encodeURIComponent(JSON.stringify(profileData));
              }
            } else {
              console.log("No opener window, redirecting directly...");
              window.location.href = "${origin}/#/auth/google/success?user=" + encodeURIComponent(JSON.stringify(profileData));
            }
          </script>
        </body>
      </html>
    `);
  });

  // API 5: Get Email Counters (AdminPanel)
  app.get("/api/admin/email-counters", (req, res) => {
    checkAndResetDailyStats();
    const list = getSMTPList();
    const smtpStatus = list.map((smtp) => ({
      user: smtp.user,
      limit: smtp.limit,
      count: emailStats.smtpCounts[smtp.user] || 0
    }));
    const activeInfo = getActiveSMTP();
    res.json({
      date: emailStats.date,
      gmailCount: emailStats.gmailCount,
      smtpStatus,
      activeSmtp: activeInfo.smtp ? activeInfo.smtp.user : null,
      activeSmtpIndex: activeInfo.index
    });
  });

  // API 6: Reset Email Counters (AdminPanel)
  app.post("/api/admin/email-counters/reset", (req, res) => {
    emailStats.gmailCount = 0;
    emailStats.smtpCounts = {};
    res.json({ success: true, message: "Counters reset successful." });
  });

  // API 6.5: Save SMTP list (AdminPanel)
  app.post("/api/admin/save-smtp-list", (req, res) => {
    const { smtpList } = req.body;
    if (!Array.isArray(smtpList)) {
      return res.status(400).json({ error: "smtpList must be an array" });
    }

    // Validate each SMTP config
    for (const item of smtpList) {
      if (!item.user || !item.pass) {
        return res.status(400).json({ error: "Each SMTP item must have a 'user' and 'pass' field." });
      }
      if (typeof item.limit !== 'number' || item.limit <= 0) {
        item.limit = 500; // default limit
      }
      item.user = item.user.trim();
      item.pass = item.pass.trim().replace(/\s+/g, ""); // Strip spaces!
    }

    try {
      const config = getTelegramConfig();
      config.smtpList = smtpList;
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
      return res.json({ success: true, message: "SMTP server list saved successfully." });
    } catch (err: any) {
      console.error("[SMTP Save Error]:", err);
      return res.status(500).json({ error: "Failed to save SMTP list: " + err.message });
    }
  });

  // API 6.6: Add or Update SMTP configuration (AdminPanel)
  app.post("/api/admin/add-smtp", (req, res) => {
    let { user, pass, limit } = req.body;
    if (!user || !pass) {
      return res.status(400).json({ error: "Gmail address and App Password are required." });
    }
    user = user.trim();
    pass = pass.trim().replace(/\s+/g, ""); // Strip spaces!
    const cleanLimit = typeof limit === 'number' && limit > 0 ? limit : 500;

    try {
      const config = getTelegramConfig();
      if (!config.smtpList) {
        config.smtpList = [];
      }
      
      // If already exists, update the password and limit
      const existingIdx = config.smtpList.findIndex((item: any) => item.user.toLowerCase() === user.toLowerCase());
      if (existingIdx > -1) {
        config.smtpList[existingIdx].pass = pass;
        config.smtpList[existingIdx].limit = cleanLimit;
      } else {
        config.smtpList.push({ user, pass, limit: cleanLimit });
      }

      // If this user was in disabledSmtps, remove it so it's active again
      if (config.disabledSmtps) {
        config.disabledSmtps = config.disabledSmtps.filter((email: string) => email.toLowerCase() !== user.toLowerCase());
      }

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
      return res.json({ success: true, message: `SMTP config added/updated for ${user} successfully.` });
    } catch (err: any) {
      console.error("[SMTP Add Error]:", err);
      return res.status(500).json({ error: "Failed to add SMTP: " + err.message });
    }
  });

  // API 6.7: Delete SMTP configuration (AdminPanel)
  app.post("/api/admin/delete-smtp", (req, res) => {
    let { user } = req.body;
    if (!user) {
      return res.status(400).json({ error: "User email is required." });
    }
    user = user.trim().toLowerCase();

    try {
      const config = getTelegramConfig();
      if (config.smtpList) {
        config.smtpList = config.smtpList.filter((item: any) => item.user.toLowerCase() !== user);
      }

      // Also handle disabling environment variables if the deleted user is the GMAIL_USER
      const envUser = process.env.GMAIL_USER;
      if (envUser && user === envUser.trim().toLowerCase()) {
        if (!config.disabledSmtps) {
          config.disabledSmtps = [];
        }
        if (!config.disabledSmtps.includes(user)) {
          config.disabledSmtps.push(user);
        }
      }

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
      return res.json({ success: true, message: `SMTP config for ${user} deleted successfully.` });
    } catch (err: any) {
      console.error("[SMTP Delete Error]:", err);
      return res.status(500).json({ error: "Failed to delete SMTP: " + err.message });
    }
  });

  // API 7: Test SMTP (AdminPanel)
  app.post("/api/admin/test-smtp", async (req, res) => {
    const { user, pass } = req.body;

    let testUser = user;
    let testPass = pass;

    if (!testUser || !testPass) {
      const activeInfo = getActiveSMTP();
      if (activeInfo.smtp) {
        testUser = activeInfo.smtp.user;
        testPass = activeInfo.smtp.pass;
      }
    }

    if (!testUser || !testPass) {
      return res.status(400).json({ error: "No active SMTP configurations available to test. Please add at least one SMTP configuration." });
    }

    testUser = testUser.trim();
    testPass = testPass.trim().replace(/\s+/g, ""); // Strip spaces!

    try {
      const transporter = getTransporter(testUser, testPass);
      const mailOptions = {
        from: `"AR Earn Zone" <${testUser}>`,
        to: testUser,
        subject: "AR Earn Zone SMTP Connection Test",
        text: "Congratulations! Your AR Earn Zone SMTP server is successfully configured and sending emails.",
        html: "<h3>AR Earn Zone SMTP Test Success</h3><p>Your Gmail SMTP connection is up and running perfectly!</p>"
      };

      await transporter.sendMail(mailOptions);
      return res.json({ success: true, message: `SMTP server test successful for ${testUser}! Test email sent.` });
    } catch (error: any) {
      console.error("[SMTP Test Error]:", error);
      return res.status(500).json({ error: `SMTP validation failed for ${testUser}: ` + error.message });
    }
  });

  // 🌐 HIGH-PERFORMANCE SECURITY HEADER BYPASS PROXY
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send("Missing target url parameter");
    }

    try {
      const parsedUrl = new URL(targetUrl.trim());
      
      // Perform server-side fetch to retrieve the webpage
      const response = await fetch(targetUrl.trim(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch webpage: status ${response.status}`);
      }

      let contentType = response.headers.get("content-type") || "text/html";
      
      // Only rewrite and inject base tag for HTML responses
      if (contentType.includes("text/html")) {
        let body = await response.text();
        
        // Remove framing blocks by replacing target/relative checks or frame busters
        body = body.replace(/window\.top\s*!==\s*window\.self/gi, "false");
        body = body.replace(/window\.self\s*!==\s*window\.top/gi, "false");
        body = body.replace(/top\.location\s*=/gi, "dummyLocation=");
        body = body.replace(/parent\.location\s*=/gi, "dummyLocation=");
        
        // Inject <base href="..."> into <head> to fix all relative images, styles, scripts
        const baseHref = `<base href="${parsedUrl.origin}${parsedUrl.pathname.endsWith('/') ? parsedUrl.pathname : parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf('/') + 1)}">`;
        
        if (body.includes("<head>")) {
          body = body.replace("<head>", `<head>\n${baseHref}`);
        } else if (body.includes("<head ")) {
          body = body.replace(/<head\s*([^>]*)>/i, `<head $1>\n${baseHref}`);
        } else if (body.includes("<html>")) {
          body = body.replace("<html>", `<html>\n<head>\n${baseHref}\n</head>`);
        } else {
          // Fallback prepending
          body = `<head>\n${baseHref}\n</head>\n${body}`;
        }

        // Strip headers that block iframe framing
        res.setHeader("X-Frame-Options", "ALLOWALL");
        res.setHeader("Content-Security-Policy", "frame-ancestors *");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(body);
      } else {
        // Pipe binary or other files directly
        const buffer = await response.arrayBuffer();
        res.setHeader("Content-Type", contentType);
        res.setHeader("X-Frame-Options", "ALLOWALL");
        res.setHeader("Content-Security-Policy", "frame-ancestors *");
        return res.send(Buffer.from(buffer));
      }
    } catch (error: any) {
      console.error("[Web Proxy Error]:", error);
      return res.status(500).send(`Proxy connection error: ${error.message}`);
    }
  });

  // API 7.5: Verify Admin App Login Password for sensitive operations (e.g., Test Users Cleanup Manager)
  app.post("/api/admin/verify-app-password", (req, res) => {
    const { appPassword } = req.body;
    if (!appPassword) {
      return res.status(400).json({ error: "অ্যাডমিন পাসওয়ার্ড প্রয়োজন।" });
    }
    const cleanInput = appPassword.trim();
    const ADMIN_PASSWORD = 'AREranZone@71';
    
    if (cleanInput === ADMIN_PASSWORD) {
      return res.json({ success: true, message: "অ্যাডমিন অ্যাপ লগইন পাসওয়ার্ড সফলভাবে যাচাই করা হয়েছে!" });
    } else {
      return res.status(401).json({ error: "ভুল অ্যাডমিন পাসওয়ার্ড (Invalid Admin App Login Password)! দয়া করে সঠিক অ্যাডমিন লগইন পাসওয়ার্ড প্রদান করুন।" });
    }
  });

  // Telegram Bot Long Polling Variables & Mechanics
  const serverBootTime = Math.floor(Date.now() / 1000);
  let pollingActive = false;
  let lastUpdateId = 0;
  let pollingTimeoutId: NodeJS.Timeout | null = null;
  let lastPollingError: string | null = null;
  let consecutivePollingErrors = 0;

  async function deleteTelegramWebhook(token: string) {
    try {
      console.log(`[Telegram Bot] Deleting webhook to enable reliable long-polling...`);
      const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`);
      const data = await res.json();
      if (!data.ok) {
        if (data.error_code === 401) {
          console.warn("[Telegram Bot] Unable to delete webhook: Bot Token is Unauthorized/Invalid.");
        } else {
          console.warn("[Telegram Bot] deleteWebhook failed:", data.description || data);
        }
      } else {
        console.log("[Telegram Bot] deleteWebhook response succeeded.");
      }
      return data.ok;
    } catch (err: any) {
      console.warn("[Telegram Bot] Network issue deleting webhook (likely offline or invalid token):", err.message);
      return false;
    }
  }

  async function startTelegramBot() {
    const config = getTelegramConfig();
    if (!config.token) return;

    // ALWAYS use long-polling in the preview container environment.
    // Inbound webhooks from Telegram will be blocked by AI Studio workspace auth/reverse proxy.
    // Outbound long polling (getUpdates) is 100% reliable.
    await deleteTelegramWebhook(config.token);

    console.log("[Telegram Bot] Starting long polling...");
    await startLongPolling();
  }

  async function stopLongPolling() {
    pollingActive = false;
    if (pollingTimeoutId) {
      clearTimeout(pollingTimeoutId);
      pollingTimeoutId = null;
    }
    console.log("[Telegram Bot] Long-polling stopped.");
  }

  async function startLongPolling() {
    const config = getTelegramConfig();
    if (!config.token) return;
    if (pollingActive) return;
    pollingActive = true;
    consecutivePollingErrors = 0;
    console.log("[Telegram Bot] Starting long polling...");
    pollUpdates(config.token);
  }

  async function pollUpdates(token: string) {
    if (!pollingActive) return;
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=15`);
      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 409) {
          console.warn("[Telegram Bot] Polling Conflict (409): Another instance is currently active or polling has not timed out. Retrying in 15s...");
          lastPollingError = "Conflict: active polling in another instance";
          await new Promise(resolve => setTimeout(resolve, 15000));
          if (pollingActive) {
            pollingTimeoutId = setTimeout(() => pollUpdates(token), 100);
          }
          return;
        }
        if (res.status === 401 || res.status === 404) {
          console.warn(`[Telegram Bot] Polling stopped due to unauthorized or invalid token (status ${res.status}). Please configure a valid Bot Token in Admin Panel.`);
          pollingActive = false;
          return;
        }
        console.warn(`[Telegram Bot] getUpdates failed: Status ${res.status} - Response: ${errText}`);
        throw new Error(`getUpdates status ${res.status}: ${errText}`);
      }
      const data = await res.json();
      lastPollingError = null;
      consecutivePollingErrors = 0; // Reset on successful fetch
      if (data.ok && data.result && data.result.length > 0) {
        for (const update of data.result) {
          lastUpdateId = Math.max(lastUpdateId, update.update_id);
          if (update.message) {
            try {
              await handleTelegramMessage(update.message);
            } catch (msgErr: any) {
              console.warn("[Telegram Bot] Error handling individual message:", msgErr.message);
            }
          }
        }
      }
    } catch (err: any) {
      consecutivePollingErrors++;
      const errMsg = err.message || String(err);
      const isNetworkError = errMsg.toLowerCase().includes("fetch failed") || 
                             errMsg.includes("ENOTFOUND") || 
                             errMsg.includes("EAI_AGAIN") || 
                             errMsg.includes("ECONNRESET") || 
                             errMsg.includes("ETIMEDOUT") ||
                             errMsg.includes("ECONNREFUSED");
      
      let backoffDelay = 10000; // Default backoff for other errors
      if (isNetworkError) {
        // Progressive backoff: 2s -> 5s -> 15s -> 30s
        if (consecutivePollingErrors === 1) backoffDelay = 2000;
        else if (consecutivePollingErrors === 2) backoffDelay = 5000;
        else if (consecutivePollingErrors === 3) backoffDelay = 15000;
        else backoffDelay = 30000;

        if (consecutivePollingErrors >= 5) {
          console.debug(`[Telegram Bot] Connection issue (will retry in ${backoffDelay / 1000}s): ${errMsg} (Consecutive: ${consecutivePollingErrors})`);
        }
      } else {
        console.warn("[Telegram Bot Polling Issue]:", errMsg);
      }
      lastPollingError = errMsg;
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
    if (pollingActive) {
      pollingTimeoutId = setTimeout(() => pollUpdates(token), 100);
    }
  }

  async function checkChannelMember(token: string, channelLink: string, telegramId: string): Promise<boolean> {
    try {
      let chatId = channelLink.trim();
      if (chatId.includes("t.me/")) {
        const parts = chatId.split("t.me/");
        const pathPart = parts[1].replace(/\/$/, "");
        if (pathPart.startsWith("+") || pathPart.startsWith("joinchat/")) {
          console.warn("[Telegram Bot] Cannot verify channel join for private invite links. Defaulting to true.");
          return true;
        }
        chatId = "@" + pathPart;
      }
      const res = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${chatId}&user_id=${telegramId}`);
      const data = await res.json();
      if (data.ok && data.result) {
        const status = data.result.status;
        return ["creator", "administrator", "member"].includes(status);
      } else {
        console.error("[Telegram getChatMember Error response]:", data);
        if (data.error_code === 401 || (data.description && (
          data.description.toLowerCase().includes("unauthorized") ||
          data.description.includes("chat not found") || 
          data.description.includes("bot is not a member") || 
          data.description.includes("not admin") || 
          data.description.includes("not found") || 
          data.description.includes("member list is inaccessible")
        ))) {
          console.warn("[Telegram Bot] Bot is unauthorized, lacks access, or channel is private/public without admin rights. Defaulting to true to prevent blocking user.");
          return true;
        }
      }
    } catch (err) {
      console.error("[Telegram Check Channel Join Error]:", err);
    }
    return false;
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: any) {
    const config = getTelegramConfig();
    if (!config.token) return;
    try {
      const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: replyMarkup
        })
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[Telegram Bot SendMessage Error Response]:", data);
      }
    } catch (err) {
      console.error("[Telegram Send Message Error]:", err);
    }
  }

  async function handleTelegramMessage(message: any) {
    const chatId = message.chat.id;
    const sender = message.from;
    if (!sender) return;

    const senderId = String(sender.id);
    const senderFirstName = sender.first_name || "";
    const senderUsername = sender.username ? "@" + sender.username : "No Username";

    const botStorage = loadBotStorage();
    const config = getTelegramConfig();

    // Contact sharing handling
    if (message.contact) {
      const contactPhone = message.contact.phone_number.replace(/[+ \-]/g, "");
      console.log(`[Telegram Bot] Contact shared. Phone: ${contactPhone}, SenderId: ${senderId}`);

      const pendingCode = botStorage.pendingCodes ? botStorage.pendingCodes[senderId] : null;

      if (pendingCode) {
        // Validate shared phone number against registered code expectedPhone
        const registered = botStorage.registeredCodes ? botStorage.registeredCodes[pendingCode] : null;
        if (registered && registered.expectedPhone) {
          const expectedPhoneNorm = registered.expectedPhone.replace(/[+ \-]/g, "").trim().replace(/^880/, "0").replace(/^0/, "");
          const contactPhoneNorm = contactPhone.replace(/^880/, "0").replace(/^0/, "");
          
          if (expectedPhoneNorm !== contactPhoneNorm) {
            const mismatchMsg = `❌ <b>ভেরিফিকেশন ব্যর্থ হয়েছে!</b> ❌\n\n` +
              `আপনার শেয়ার করা ফোন নম্বরটি (+${contactPhone}) অ্যাপে রেজিস্ট্রেশনকৃত ফোন নম্বরের (+${registered.expectedPhone}) সাথে মেলেনি।\n\n` +
              `অনুগ্রহ করে অ্যাপে যে নম্বরটি দিয়েছিলেন, সেই একই নম্বর সম্বলিত টেলিগ্রাম অ্যাকাউন্ট ব্যবহার করুন এবং বটের সাথে পুনরায় যোগাযোগ করুন।`;
            await sendTelegramMessage(chatId, mismatchMsg);
            return;
          }
        }

        botStorage[pendingCode] = {
          telegramId: senderId,
          telegramUsername: senderUsername,
          telegramFirstName: senderFirstName,
          telegramPhone: contactPhone,
          timestamp: Date.now()
        };
        if (botStorage.pendingCodes) {
          delete botStorage.pendingCodes[senderId];
        }
        if (botStorage.registeredCodes && botStorage.registeredCodes[pendingCode]) {
          delete botStorage.registeredCodes[pendingCode];
        }
        saveBotStorage(botStorage);

        const successMsg = `🎉 <b>ভেরিফিকেশন সফল হয়েছে!</b> 🎉\n\n` +
          `আপনার টেলিগ্রাম অ্যাকাউন্টটি সফলভাবে লিংক এবং ভেরিফাই করা হয়েছে।\n\n` +
          `👤 <b>টেলিগ্রাম নাম:</b> ${escapeHtml(senderFirstName)}\n` +
          `👤 <b>টেলিগ্রাম ইউজারনেম:</b> ${escapeHtml(senderUsername)}\n` +
          `🆔 <b>টেলিগ্রাম ইউজার আইডি:</b> <code>${senderId}</code>\n` +
          `📞 <b>মোবাইল নম্বর:</b> +${contactPhone}\n` +
          `🔑 <b>সিকিউরিটি কোড:</b> <code>${pendingCode}</code>\n\n` +
          `👉 <b>২য় ধাপ (Step 2):</b> নিচে থাকা লিংকে ক্লিক করে আমাদের অফিশিয়াল টেলিগ্রাম চ্যানেলে যুক্ত হোন:\n` +
          `<a href="${config.channel || "https://t.me/arearnzone"}">${config.channel || "https://t.me/arearnzone"}</a>\n\n` +
          `চ্যানেলে জয়েন করা সম্পূর্ণ হয়ে গেলে ওয়েবসাইটে ফিরে গিয়ে <b>Verify Channel Join</b> বাটনে ক্লিক করে ভেরিফিকেশন সম্পন্ন করুন।`;

        await sendTelegramMessage(chatId, successMsg, { remove_keyboard: true });
      } else {
        let codeMatched = false;
        if (botStorage.registeredCodes) {
          for (const code of Object.keys(botStorage.registeredCodes)) {
            const regRecord = botStorage.registeredCodes[code];
            if (regRecord && regRecord.expectedPhone) {
              const expectedPhoneNorm = regRecord.expectedPhone.replace(/[+ \-]/g, "").trim().replace(/^880/, "0").replace(/^0/, "");
              const contactPhoneNorm = contactPhone.replace(/^880/, "0").replace(/^0/, "");
              
              if (expectedPhoneNorm === contactPhoneNorm) {
                botStorage[code] = {
                  telegramId: senderId,
                  telegramUsername: senderUsername,
                  telegramFirstName: senderFirstName,
                  telegramPhone: contactPhone,
                  timestamp: Date.now()
                };
                delete botStorage.registeredCodes[code];
                codeMatched = true;

                const successMsg = `🎉 <b>ভেরিফিকেশন সফল হয়েছে!</b> 🎉\n\n` +
                  `আপনার টেলিগ্রাম অ্যাকাউন্টটি সফলভাবে লিংক এবং ভেরিফাই করা হয়েছে।\n\n` +
                  `👤 <b>টেলিগ্রাম নাম:</b> ${escapeHtml(senderFirstName)}\n` +
                  `👤 <b>টেলিগ্রাম ইউজারনেম:</b> ${escapeHtml(senderUsername)}\n` +
                  `🆔 <b>টেলিগ্রাম ইউজার আইডি:</b> <code>${senderId}</code>\n` +
                  `📞 <b>মোবাইল নম্বর:</b> +${contactPhone}\n` +
                  `🔑 <b>সিকিউরিটি কোড:</b> <code>${code}</code>\n\n` +
                  `👉 <b>২য় ধাপ (Step 2):</b> নিচে থাকা লিংকে ক্লিক করে আমাদের অফিশিয়াল টেলিগ্রাম চ্যানেলে যুক্ত হোন:\n` +
                  `<a href="${config.channel || "https://t.me/arearnzone"}">${config.channel || "https://t.me/arearnzone"}</a>\n\n` +
                  `চ্যানেলে জয়েন করা সম্পূর্ণ হয়ে গেলে ওয়েবসাইটে ফিরে গিয়ে <b>Verify Channel Join</b> বাটনে ক্লিক করে ভেরিফিকেশন সম্পন্ন করুন।`;

                await sendTelegramMessage(chatId, successMsg, { remove_keyboard: true });
                break;
              }
            }
          }
        }

        if (!codeMatched) {
          const contactAckMsg = `📱 <b>মোবাইল নম্বর সফলভাবে গৃহীত হয়েছে!</b> 📱\n\n` +
            `টেলিগ্রাম ভেরিফিকেশন সম্পূর্ণ করতে অনুগ্রহ করে আপনার সিকিউরিটি কোডটি (যেমন: <code>AREZ-123456</code>) মেসেজ করুন।`;
          await sendTelegramMessage(chatId, contactAckMsg, { remove_keyboard: true });
        }
      }
      return;
    }

    // Text message handling
    const text = (message.text || "").trim();
    if (!text) return;

    if (text.startsWith("/start")) {
      const helpMessage = `👋 <b>আসসালামু আলাইকুম, ${escapeHtml(senderFirstName)}!</b> AR Earn Zone ভেরিফিকেশন বটে আপনাকে স্বাগতম।\n\n` +
        `আপনার অ্যাকাউন্ট ভেরিফাই করতে নিচের বাটনটি ব্যবহার করে প্রথমে আপনার ফোন নাম্বার শেয়ার করুন, তারপর সিকিউরিটি কোডটি পাঠান:\n\n` +
        `১. নিচে থাকা <b>📱 নাম্বার শেয়ার করুন</b> বাটনে ক্লিক করুন।\n` +
        `২. ওয়েবসাইট থেকে জেনারেট করা সিকিউরিটি টোকেনটি (যেমন: <code>AREZ-123456</code>) এখানে মেসেজ করুন।\n\n` +
        `🤖 <b>আপনার টেলিগ্রাম প্রোফাইল ইনফো:</b>\n` +
        `• ইউজার আইডি: <code>${senderId}</code>\n` +
        `• ইউজারনেম: ${escapeHtml(senderUsername)}`;

      const replyMarkup = {
        keyboard: [
          [{ text: "📱 নাম্বার শেয়ার করুন (Share Contact)", request_contact: true }]
        ],
        one_time_keyboard: true,
        resize_keyboard: true
      };

      await sendTelegramMessage(chatId, helpMessage, replyMarkup);
      return;
    }

    // Support flexible code formatting: with/without dashes, spaces, case-insensitive (e.g., AREZ-123456, arez123456, AREZ 123456)
    const codePattern = /AREZ\s*[-–—]?\s*(\d{6})/i;
    const match = text.match(codePattern);

    if (match) {
      // Reconstruct standard normalized code: AREZ-XXXXXX
      const matchedCode = `AREZ-${match[1]}`.toUpperCase();
      console.log(`[Telegram Bot] Code received: ${matchedCode} from sender: ${senderId}`);

      const registered = botStorage.registeredCodes ? botStorage.registeredCodes[matchedCode] : null;

      let verifiedInfo = null;
      for (const key of Object.keys(botStorage)) {
        if (botStorage[key] && botStorage[key].telegramId === senderId) {
          verifiedInfo = botStorage[key];
          break;
        }
      }

      if (verifiedInfo) {
        botStorage[matchedCode] = {
          telegramId: senderId,
          telegramUsername: senderUsername,
          telegramFirstName: senderFirstName,
          telegramPhone: verifiedInfo.telegramPhone,
          timestamp: Date.now()
        };
        if (botStorage.registeredCodes) {
          delete botStorage.registeredCodes[matchedCode];
        }
        saveBotStorage(botStorage);

        const successMsg = `🎉 <b>ভেরিফিকেশন সফল হয়েছে!</b> 🎉\n\n` +
          `আপনার টেলিগ্রাম অ্যাকাউন্টটি সফলভাবে লিংক এবং ভেরিফাই করা হয়েছে।\n\n` +
          `👤 <b>টেলিগ্রাম নাম:</b> ${escapeHtml(senderFirstName)}\n` +
          `👤 <b>টেলিগ্রাম ইউজারনেম:</b> ${escapeHtml(senderUsername)}\n` +
          `🆔 <b>টেলিগ্রাম ইউজার আইডি:</b> <code>${senderId}</code>\n` +
          `📞 <b>মোবাইল নম্বর:</b> +${verifiedInfo.telegramPhone}\n` +
          `🔑 <b>সিকিউরিটি কোড:</b> <code>${matchedCode}</code>\n\n` +
          `👉 <b>২য় ধাপ (Step 2):</b> নিচে থাকা লিংকে ক্লিক করে আমাদের অফিশিয়াল টেলিগ্রাম চ্যানেলে যুক্ত হোন:\n` +
          `<a href="${config.channel || "https://t.me/arearnzone"}">${config.channel || "https://t.me/arearnzone"}</a>\n\n` +
          `চ্যানেলে জয়েন করা সম্পূর্ণ হয়ে গেলে ওয়েবসাইটে ফিরে গিয়ে <b>Verify Channel Join</b> বাটনে ক্লিক করে ভেরিফিকেশন সম্পন্ন করুন।`;

        await sendTelegramMessage(chatId, successMsg, { remove_keyboard: true });
      } else if (registered) {
        if (!botStorage.pendingCodes) {
          botStorage.pendingCodes = {};
        }
        botStorage.pendingCodes[senderId] = matchedCode;
        saveBotStorage(botStorage);

        const requestPhoneMsg = `🔑 <b>সিকিউরিটি কোডটি সাময়িক গ্রহণ করা হয়েছে!</b> 🔑\n\n` +
          `ভেরিফিকেশনটি সম্পূর্ণ করতে অনুগ্রহ করে নিচের <b>📱 নাম্বার শেয়ার করুন (Share Contact)</b> বাটনে ক্লিক করে আপনার মোবাইল নম্বরটি ভেরিফাই করুন।`;

        const replyMarkup = {
          keyboard: [
            [{ text: "📱 নাম্বার শেয়ার করুন (Share Contact)", request_contact: true }]
          ],
          one_time_keyboard: true,
          resize_keyboard: true
        };

        await sendTelegramMessage(chatId, requestPhoneMsg, replyMarkup);
      } else {
        if (!botStorage.pendingCodes) {
          botStorage.pendingCodes = {};
        }
        botStorage.pendingCodes[senderId] = matchedCode;
        saveBotStorage(botStorage);

        const requestPhoneMsg = `🔑 <b>সিকিউরিটি কোডটি সাময়িক গ্রহণ করা হয়েছে!</b> 🔑\n\n` +
          `ভেরিফিকেশনটি সম্পূর্ণ করতে অনুগ্রহ করে নিচের <b>📱 নাম্বার শেয়ার করুন (Share Contact)</b> বাটনে ক্লিক করে আপনার মোবাইল নম্বরটি ভেরিফাই করুন।`;

        const replyMarkup = {
          keyboard: [
            [{ text: "📱 নাম্বার শেয়ার করুন (Share Contact)", request_contact: true }]
          ],
          one_time_keyboard: true,
          resize_keyboard: true
        };

        await sendTelegramMessage(chatId, requestPhoneMsg, replyMarkup);
      }
    } else {
      const helpMessage = `👋 <b>আসসালামু আলাইকুম, ${escapeHtml(senderFirstName)}!</b> AR Earn Zone ভেরিফিকেশন বটে আপনাকে স্বাগতম।\n\n` +
        `আপনার অ্যাকাউন্ট ভেরিফাই করতে নিচের বাটনটি ব্যবহার করে প্রথমে আপনার ফোন নাম্বার শেয়ার করুন, তারপর সিকিউরিটি কোডটি পাঠান:\n\n` +
        `১. নিচে থাকা <b>📱 নাম্বার শেয়ার করুন</b> বাটনে ক্লিক করুন।\n` +
        `২. ওয়েবসাইট থেকে জেনারেট করা সিকিউরিটি টোকেনটি (যেমন: <code>AREZ-123456</code>) এখানে মেসেজ করুন।`;

      const replyMarkup = {
        keyboard: [
          [{ text: "📱 নাম্বার শেয়ার করুন (Share Contact)", request_contact: true }]
        ],
        one_time_keyboard: true,
        resize_keyboard: true
      };

      await sendTelegramMessage(chatId, helpMessage, replyMarkup);
    }
  }

  // Telegram Configuration Endpoints
  app.get("/api/telegram/config", (req, res) => {
    const config = getTelegramConfig();
    res.json({
      isConfigured: !!config.token,
      botUsername: config.username,
      channelLink: config.channel,
      isBotOnline: pollingActive
    });
  });

  app.post("/api/telegram/save-config", async (req, res) => {
    const { token, username, channel, forceSave } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token is required." });
    }

    try {
      let cleanToken = token.trim();
      
      // Remove wrapping quotes if any
      if ((cleanToken.startsWith('"') && cleanToken.endsWith('"')) || (cleanToken.startsWith("'") && cleanToken.endsWith("'"))) {
        cleanToken = cleanToken.slice(1, -1).trim();
      }
      
      // Remove trailing/leading colons, periods, ellipsis, spaces
      cleanToken = cleanToken.replace(/[:.\s]+$/, "").trim();
      cleanToken = cleanToken.replace(/^[:.\s]+/, "").trim();

      const cleanUsername = (username || "@AREarnZone_bot").trim();
      const cleanChannel = (channel || "https://t.me/arearnzone").trim();

      // Check if it looks truncated (contains ellipsis or is too short)
      if (token.includes("...") || cleanToken.length < 20) {
        return res.status(400).json({
          error: "আপনার কপি করা টোকেনটি অসম্পূর্ণ বা ট্রাঙ্কেট করা (Truncated) মনে হচ্ছে (শেষে '...' রয়েছে)। অনুগ্রহ করে Telegram BotFather থেকে সম্পূর্ণ টোকেনটি কপি করে আনুন।"
        });
      }

      if (!forceSave) {
        // Validate token with Telegram servers
        try {
          const testRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
          const testData = await testRes.json();
          if (!testData.ok) {
            return res.status(400).json({ 
              error: `আপনার বট টোকেনটি সঠিক নয় অথবা টেলিগ্রাম সার্ভার কানেক্ট হতে পারেনি। বিস্তারিত: ${testData.description || "Invalid Token"}`,
              canForce: true
            });
          }
        } catch (fetchErr: any) {
          console.error("[Telegram Bot Save Config Validate Fetch Error]:", fetchErr);
          return res.status(400).json({
            error: `টেলিগ্রাম সার্ভারে রিকোয়েস্ট পাঠানো যায়নি (${fetchErr.message || "Network Error"})। আপনি চাইলে 'Force Save' করে সরাসরি সেভ করতে পারেন।`,
            canForce: true
          });
        }
      }

      const config = getTelegramConfig();
      config.token = cleanToken;
      config.username = cleanUsername;
      config.channel = cleanChannel;

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");

      console.log("[Telegram Bot] Local configuration updated successfully.");

      // Restart Telegram bot (webhook or long-polling)
      await stopLongPolling();
      lastUpdateId = 0;
      await startTelegramBot();

      return res.json({
        success: true,
        message: "অভিনন্দন! আপনার টেলিগ্রাম বট সফলভাবে ওয়েবসাইটে সক্রিয় এবং কানেক্ট করা হয়েছে।",
        config: {
          token: cleanToken,
          username: cleanUsername,
          channel: cleanChannel
        }
      });
    } catch (err: any) {
      console.error("[Telegram Bot Save Config Exception]:", err);
      return res.status(500).json({ error: "টোকেন সেভ করতে অভ্যন্তরীণ ত্রুটি হয়েছে: " + err.message });
    }
  });

  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      const { message } = req.body;
      if (message) {
        await handleTelegramMessage(message);
      }
    } catch (error) {
      console.error("[Telegram Webhook Exception]:", error);
    }
    return res.sendStatus(200);
  });

  app.get("/api/telegram/check-code", async (req, res) => {
    const { code, isBypassingSync } = req.query;
    if (!code) {
      return res.status(400).json({ error: "Code parameter is required." });
    }

    const cleanCode = (code as string).trim().toUpperCase();
    const botStorage = loadBotStorage();
    let mapping = botStorage[cleanCode];

    if (mapping) {
      return res.json({
        success: true,
        telegramId: mapping.telegramId,
        telegramUsername: mapping.telegramUsername,
        telegramFirstName: mapping.telegramFirstName,
        telegramPhone: mapping.telegramPhone,
        timestamp: mapping.timestamp
      });
    }

    // Peer Container Sync Fallback
    // If we have multi-container Cloud Run (e.g. dev vs pre/production), the telegram webhook/getUpdates
    // might have delivered the verification to the other container. Let's query our peer container to see
    // if it received the verification!
    if (isBypassingSync !== "true") {
      const currentHost = req.headers.host || "";
      let otherHost = "";
      if (currentHost.includes("-dev-")) {
        otherHost = currentHost.replace("-dev-", "-pre-");
      } else if (currentHost.includes("-pre-")) {
        otherHost = currentHost.replace("-pre-", "-dev-");
      }

      if (otherHost && otherHost !== currentHost) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const peerUrl = `https://${otherHost}/api/telegram/check-code?code=${encodeURIComponent(cleanCode)}&isBypassingSync=true`;
          console.log(`[Telegram Bot] Code ${cleanCode} not found locally. Querying peer container: ${peerUrl}`);
          
          const peerRes = await fetch(peerUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (peerRes.ok) {
            const peerData = await peerRes.json();
            if (peerData && peerData.success) {
              console.log(`[Telegram Bot] Successfully retrieved verification for code ${cleanCode} from peer container!`);
              
              // Cache it locally so we have it persistent on this container too
              botStorage[cleanCode] = {
                telegramId: peerData.telegramId,
                telegramUsername: peerData.telegramUsername,
                telegramFirstName: peerData.telegramFirstName,
                telegramPhone: peerData.telegramPhone,
                timestamp: peerData.timestamp || Date.now()
              };
              if (botStorage.registeredCodes) {
                delete botStorage.registeredCodes[cleanCode];
              }
              saveBotStorage(botStorage);

              return res.json({
                success: true,
                telegramId: peerData.telegramId,
                telegramUsername: peerData.telegramUsername,
                telegramFirstName: peerData.telegramFirstName,
                telegramPhone: peerData.telegramPhone,
                timestamp: peerData.timestamp
              });
            }
          }
        } catch (err) {
          console.warn("[Telegram Bot] Failed to sync with peer container:", err);
        }
      }
    }

    return res.json({
      success: false,
      message: "এখনো বটে কোডটি পাঠানো হয়নি। অনুগ্রহ করে প্রথমে বটে আপনার ফোন নাম্বার শেয়ার করুন এবং কোডটি পাঠান।"
    });
  });

  app.post("/api/telegram/register-code", (req, res) => {
    const { code, expectedPhone } = req.body;
    if (!code || !expectedPhone) {
      return res.status(400).json({ error: "Code and expectedPhone are required." });
    }

    const cleanCode = (code as string).trim().toUpperCase();
    const cleanPhone = (expectedPhone as string).replace(/[+ \-]/g, "").trim();

    const botStorage = loadBotStorage();
    if (!botStorage.registeredCodes) {
      botStorage.registeredCodes = {};
    }
    botStorage.registeredCodes[cleanCode] = {
      expectedPhone: cleanPhone,
      timestamp: Date.now()
    };
    saveBotStorage(botStorage);

    console.log(`[Telegram Bot] Code ${cleanCode} registered with expected phone ${cleanPhone}`);
    return res.json({ success: true });
  });

  app.get("/api/telegram/debug-storage", (req, res) => {
    try {
      const botStorage = loadBotStorage();
      return res.json({
        success: true,
        storage: botStorage
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/telegram/debug-status", (req, res) => {
    try {
      const config = getTelegramConfig();
      const hasConfigJson = fs.existsSync(CONFIG_FILE);
      const token = config.token || "";
      const maskedToken = token.length > 8 
        ? `${token.slice(0, 4)}...${token.slice(-4)}`
        : token ? "Invalid/Short Token" : "No Token";

      return res.json({
        success: true,
        pollingActive,
        lastUpdateId,
        lastPollingError,
        hasConfigJson,
        configUsername: config.username,
        configChannel: config.channel,
        tokenLength: token.length,
        tokenMasked: maskedToken,
        envTokenPresent: !!process.env.TELEGRAM_BOT_TOKEN
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/telegram/check-join", async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId parameter is required." });
    }

    const config = getTelegramConfig();
    if (!config.token) {
      return res.json({ success: true, message: "বট কনফিগার করা নেই। ডেমো মোডে চ্যানেল জয়েন পাস করা হয়েছে।" });
    }

    const joined = await checkChannelMember(config.token, config.channel, userId as string);
    if (joined) {
      return res.json({ success: true, message: "অভিনন্দন! আপনি আমাদের টেলিগ্রাম চ্যানেলে জয়েন করেছেন। ✅" });
    } else {
      return res.status(400).json({ 
        error: "আপনি এখনও আমাদের টেলিগ্রাম চ্যানেলে জয়েন করেননি! ❌\n\nঅনুগ্রহ করে প্রথমে আমাদের চ্যানেলে জয়েন করুন, তারপর আবার এই বাটনটি চাপুন।" 
      });
    }
  });

  // Automatic Telegram Bot setup on server launch
  const initialConfig = getTelegramConfig();
  if (initialConfig.token) {
    startTelegramBot().catch(err => {
      console.error("[Telegram Bot] Automatic bot start failed:", err);
    });
  } else {
    console.log("[Telegram Bot] Bot is currently inactive. Set TELEGRAM_BOT_TOKEN to activate.");
  }

  app.get("/api/tiktok-id", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).json({ error: "URL parameter is required" });
      }

      console.log("[TikTok Resolver] Resolving URL:", targetUrl);
      
      // Parse direct ID if already formatted
      const directMatch = targetUrl.match(/\/video\/(\d+)/) || targetUrl.match(/\/v\/(\d+)/) || targetUrl.match(/\/embed\/(\d+)/);
      if (directMatch && directMatch[1]) {
        return res.json({ videoId: directMatch[1] });
      }

      // Try TikTok oEmbed API first since it is official and handles short URLs perfectly!
      try {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(targetUrl.trim())}`;
        console.log("[TikTok Resolver] Trying oEmbed API:", oembedUrl);
        const oembedRes = await fetch(oembedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
          }
        });
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json() as any;
          if (oembedData && oembedData.html) {
            const idMatch = oembedData.html.match(/data-video-id="(\d+)"/) || oembedData.html.match(/\/video\/(\d+)/);
            if (idMatch && idMatch[1]) {
              console.log("[TikTok Resolver] oEmbed resolution success ID:", idMatch[1]);
              return res.json({ videoId: idMatch[1] });
            }
          }
        } else {
          console.warn("[TikTok Resolver] oEmbed failed with status:", oembedRes.status);
        }
      } catch (oembedErr) {
        console.warn("[TikTok Resolver] oEmbed fetch error:", oembedErr);
      }

      // Resolve redirects by following them
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        },
        redirect: "follow"
      });

      const finalUrl = response.url;
      console.log("[TikTok Resolver] Final resolved URL:", finalUrl);

      const resolvedMatch = finalUrl.match(/\/video\/(\d+)/) || finalUrl.match(/\/v\/(\d+)/) || finalUrl.match(/\/embed\/(\d+)/);
      if (resolvedMatch && resolvedMatch[1]) {
        return res.json({ videoId: resolvedMatch[1] });
      }

      // Try looking at body as fallback
      const body = await response.text();
      const bodyMatch = body.match(/"videoId":"(\d+)"/) || body.match(/\/video\/(\d+)/) || body.match(/webapp-video-(\d+)/);
      if (bodyMatch && bodyMatch[1]) {
        return res.json({ videoId: bodyMatch[1] });
      }

      return res.status(404).json({ error: "Could not extract TikTok video ID" });
    } catch (err: any) {
      console.error("[TikTok Resolver Error]:", err);
      return res.status(500).json({ error: "Error resolving TikTok URL" });
    }
  });

  app.get("/api/proxy", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).send("URL parameter is required");
      }

      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }
      });

      if (!response.ok) {
        return res.redirect(targetUrl);
      }

      const contentType = response.headers.get("content-type") || "text/html";
      res.setHeader("Content-Type", contentType);

      if (contentType.includes("text/html")) {
        let body = await response.text();
        const urlObj = new URL(targetUrl);
        const baseTag = `<head><base href="${urlObj.origin}${urlObj.pathname}">`;
        body = body.replace(/<head>/i, baseTag);
        return res.send(body);
      } else {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return res.send(buffer);
      }
    } catch (err: any) {
      console.error("[Proxy Error]:", err);
      if (req.query.url) {
        return res.redirect(req.query.url as string);
      }
      return res.status(500).send("Could not load page");
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
