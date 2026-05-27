const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log(`[email] SMTP not configured — skipping email to ${to}`);
    return;
  }
  const t = getTransporter();
  await t.sendMail({
    from: `"Project Tracker" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
  console.log(`[email] Sent "${subject}" to ${to}`);
}

module.exports = { sendMail };
