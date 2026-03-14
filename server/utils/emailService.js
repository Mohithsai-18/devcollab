const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send task assigned email
const sendTaskAssignedEmail = async (toEmail, toName, taskTitle, projectName, assignedBy) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: `📋 New Task Assigned — ${taskTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2E75B6; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">DevCollab</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333;">Hi ${toName}! 👋</h2>
            <p style="color: #666;">You have been assigned a new task:</p>
            <div style="background: white; border-left: 4px solid #2E75B6; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin: 0; color: #333;">📋 ${taskTitle}</h3>
              <p style="margin: 8px 0 0; color: #666;">Project: <strong>${projectName}</strong></p>
              <p style="margin: 4px 0 0; color: #666;">Assigned by: <strong>${assignedBy}</strong></p>
            </div>
            <a href="http://localhost:3000/dashboard"
               style="background: #2E75B6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 10px;">
              View Task →
            </a>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              This email was sent by DevCollab. You are receiving this because you are a member of ${projectName}.
            </p>
          </div>
        </div>
      `
    });
    console.log(`Email sent to ${toEmail}`);
  } catch (error) {
    console.error('Email error:', error.message);
  }
};

// Send sprint started email
const sendSprintStartedEmail = async (toEmail, toName, sprintName, projectName) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: `🏃 Sprint Started — ${sprintName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #198754; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">DevCollab</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333;">Hi ${toName}! 🏃</h2>
            <p style="color: #666;">A new sprint has started in your project:</p>
            <div style="background: white; border-left: 4px solid #198754; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin: 0; color: #333;">🏃 ${sprintName}</h3>
              <p style="margin: 8px 0 0; color: #666;">Project: <strong>${projectName}</strong></p>
            </div>
            <a href="http://localhost:3000/dashboard"
               style="background: #198754; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
              View Sprint →
            </a>
          </div>
        </div>
      `
    });
  } catch (error) {
    console.error('Email error:', error.message);
  }
};

// Send welcome email on register
const sendWelcomeEmail = async (toEmail, toName) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: `Welcome to DevCollab! 🎉`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #2E75B6; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">DevCollab</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333;">Welcome, ${toName}! 🎉</h2>
            <p style="color: #666;">Your DevCollab account has been created successfully.</p>
            <p style="color: #666;">You can now:</p>
            <ul style="color: #666;">
              <li>Create and manage projects</li>
              <li>Build Kanban boards with your team</li>
              <li>Review code with inline comments</li>
              <li>Track sprints and velocity</li>
              <li>View analytics and charts</li>
            </ul>
            <a href="http://localhost:3000/dashboard"
               style="background: #2E75B6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 10px;">
              Go to Dashboard →
            </a>
          </div>
        </div>
      `
    });
  } catch (error) {
    console.error('Email error:', error.message);
  }
};

module.exports = {
  sendTaskAssignedEmail,
  sendSprintStartedEmail,
  sendWelcomeEmail
};