const express = require('express');
const router = express.Router();
const sendEmail = require('../routes/utils/sendEmail');

router.post('/schedule', async (req, res) => {
  try {
    const {
      candidateEmail,
      candidateName,
      jobTitle,
      companyName,
      interviewDate,
      interviewTime,
      meetingLink,
      notes,
    } = req.body;

    if (!candidateEmail || !interviewDate || !interviewTime) {
      return res.status(400).json({
        success: false,
        message: 'Candidate email, interview date, and time are required.',
      });
    }

    const jobPosition = jobTitle || 'Open Position';
    const employerName = companyName || 'ZestHire Partner Company';

    const subject = `Interview Invitation: ${jobPosition} at ${employerName}`;
    const text = `Hello ${candidateName || 'Candidate'},\n\nYou have been invited for an interview for ${jobPosition} at ${employerName}.\n\nDate: ${interviewDate}\nTime: ${interviewTime}\nMeeting Link: ${meetingLink || 'To be provided'}\n\nNotes: ${notes || 'Please join on time.'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #334155; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-top: 0;">Interview Invitation</h2>
        <p>Hello <strong>${candidateName || 'Candidate'}</strong>,</p>
        <p>You have been invited for an interview for <strong>${jobPosition}</strong> at <strong>${employerName}</strong>.</p>
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #06b6d4;">
          <p style="margin: 4px 0;"><strong>Date:</strong> ${interviewDate}</p>
          <p style="margin: 4px 0;"><strong>Time:</strong> ${interviewTime}</p>
          <p style="margin: 4px 0;"><strong>Meeting Link:</strong> ${meetingLink ? `<a href="${meetingLink}" target="_blank" style="color: #06b6d4;">Join Meeting</a>` : 'To be provided'}</p>
        </div>
        <p><strong>Employer Notes:</strong></p>
        <p style="background: #f8fafc; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">${notes || 'Please be prepared and join on time.'}</p>
      </div>
    `;

    await sendEmail({
      to: candidateEmail,
      subject,
      text,
      html,
    });

    return res.status(200).json({
      success: true,
      message: 'Interview scheduled and email sent successfully!',
    });
  } catch (error) {
    console.error('Error scheduling interview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to schedule interview and send email.',
    });
  }
});

module.exports = router;