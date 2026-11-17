  const nodemailer = require('nodemailer');

  const sendEmail = async ({ to, subject, text, html }) => {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail', // Or use host, port, secure for SMTP providers
        auth: {
          user: process.env.EMAIL_USER, // Your email address in .env
          pass: process.env.EMAIL_PASS, // Your App Password from Gmail
        },
      });

      const mailOptions = {
        from: `"ZestHire Support" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html,
      };

      await transporter.sendMail(mailOptions);
      console.log(`📧 Email sent successfully to ${to}`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  module.exports = sendEmail;