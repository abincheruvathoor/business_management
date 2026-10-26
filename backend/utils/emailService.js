const nodemailer = require("nodemailer");

// Simple cache to prevent duplicate sends within 15 seconds
const recentSends = new Map();

function isDuplicate(key) {
  const lastSent = recentSends.get(key);
  if (lastSent && Date.now() - lastSent < 15000) {
    return true;
  }
  recentSends.set(key, Date.now());
  return false;
}

async function sendExcelEmail({
  to,
  subject,
  html,
  text,
  filename,
  buffer
}) {
  require("dotenv").config();
  const recipient = (to || process.env.DEFAULT_RECIPIENT_EMAIL || "management@deliciouscashew.com").trim();
  const dedupKey = `${recipient}:${subject}:${filename}`;

  if (isDuplicate(dedupKey)) {
    throw new Error("A request to send this document to this recipient was already processed recently. Please wait a few seconds.");
  }

  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || "").trim();
  const rawPass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || "").trim();
  const pass = rawPass.replace(/\s+/g, ""); // Clean any spaces in Google 16-character App Password
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465);
  const isGmail = !host || host.includes("gmail") || user.toLowerCase().endsWith("@gmail.com");

  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || (user ? `"Cashew Business Management" <${user}>` : '"Cashew Business Management" <orders@deliciouscashew.com>');

  // If credentials are configured, send via nodemailer
  if (user && pass) {
    const transportConfig = isGmail && !process.env.SMTP_HOST
      ? {
          service: "gmail",
          auth: { user, pass }
        }
      : {
          host: host || "smtp.gmail.com",
          port,
          secure: port === 465,
          auth: { user, pass }
        };

    const transporter = nodemailer.createTransport(transportConfig);

    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject,
      text: text || "Please find the attached company workbook.",
      html: html || `<p>Please find the attached workbook: <strong>${filename}</strong></p><p>Regards,<br>Cashew Business Management</p>`,
      attachments: [
        {
          filename,
          content: buffer
        }
      ]
    });

    return {
      success: true,
      simulated: false,
      recipient,
      messageId: info.messageId,
      message: `Email sent successfully to ${recipient}`
    };
  }

  // Graceful simulation mode for development environment
  console.log(`[EMAIL SIMULATOR] Email would be sent to: ${recipient}`);
  console.log(`[EMAIL SIMULATOR] Subject: ${subject}`);
  console.log(`[EMAIL SIMULATOR] Attachment: ${filename} (${buffer ? buffer.length : 0} bytes)`);

  return {
    success: true,
    simulated: true,
    recipient,
    message: `Email dispatched in simulation mode to ${recipient}. (Configure SMTP credentials in backend/.env for live delivery)`
  };
}

module.exports = {
  sendExcelEmail
};
