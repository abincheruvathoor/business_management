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

  const resendKey = (process.env.RESEND_API_KEY || "").trim();

  // 1. If Resend API Key is available, send via HTTPS Port 443 (100% immune to cloud SMTP blocks)
  if (resendKey) {
    const fromAddress = process.env.RESEND_FROM || "Cashew Business Management <onboarding@resend.dev>";
    const base64Content = buffer ? Buffer.from(buffer).toString("base64") : "";

    const payload = {
      from: fromAddress,
      to: [recipient],
      subject,
      html: html || `<p>Please find the attached workbook: <strong>${filename}</strong></p><p>Regards,<br>Cashew Business Management</p>`,
      text: text || "Please find the attached company workbook.",
      attachments: filename && base64Content ? [
        {
          filename,
          content: base64Content
        }
      ] : []
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("Resend API delivery error:", data);
      throw new Error(data.message || `Resend delivery failed (${res.status})`);
    }

    return {
      success: true,
      provider: "resend",
      recipient,
      messageId: data.id,
      message: `Email sent successfully to ${recipient} via Resend!`
    };
  }

  // 2. If credentials are configured, send via nodemailer
  if (user && pass) {
    const transportConfig = isGmail && !process.env.SMTP_HOST
      ? {
          service: "gmail",
          auth: { user, pass },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000
        }
      : {
          host: host || "smtp.gmail.com",
          port,
          secure: port === 465,
          auth: { user, pass },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000
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
