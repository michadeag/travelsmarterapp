const sgMail = require('@sendgrid/mail');

// Only set API key if it exists
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Send contact form email
 */
exports.sendContactEmail = async (req, res) => {
  try {
    const { name, email, topic, message } = req.body;

    // Validation
    if (!name || !email || !topic || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email, topic, message'
      });
    }

    // Map topic to display name
    const topicLabels = {
      billing: 'Billing/Subscription Issue',
      refund: 'Money-Back Guarantee Refund',
      technical: 'Technical Issue/Bug',
      account: 'Account Issue',
      feature: 'Feature Request',
      hack: 'Hack Verification Question',
      other: 'Other'
    };

    const topicLabel = topicLabels[topic] || topic;

    // Create email content
    const emailContent = `
New Contact Form Submission

Name: ${name}
Email: ${email}
Topic: ${topicLabel}

Message:
${message}

---
This message was sent from the TravelSmarter contact form.
Reply to: ${email}
    `;

    // Send email to support (if SendGrid is configured)
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('⚠️  SendGrid API key not configured. Skipping email send.');
      // Don't fail - just log it
    } else {
      await sgMail.send({
        to: 'michael@reesin.com',
        from: process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com',
        subject: `TravelSmarter Contact: ${topicLabel} - ${name}`,
        text: emailContent,
        html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Topic:</strong> ${topicLabel}</p>
        <hr>
        <h3>Message:</h3>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p style="color: #999; font-size: 0.9em;">
          This message was sent from the TravelSmarter contact form.<br>
          Reply to: <a href="mailto:${email}">${email}</a>
        </p>
      `
    });

    // Optionally send confirmation email to user
    try {
      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com',
        subject: 'We received your message - TravelSmarter Support',
        text: `Hi ${name},

Thank you for contacting TravelSmarter! We received your message and will get back to you within 2-4 hours during business hours (Monday-Friday, 9am-5pm CET).

Topic: ${topicLabel}

We appreciate your patience and will respond as soon as possible.

Best regards,
The TravelSmarter Team`,
        html: `
          <h2>We received your message!</h2>
          <p>Hi ${name},</p>
          <p>Thank you for contacting TravelSmarter! We received your message and will get back to you within 2-4 hours during business hours (Monday-Friday, 9am-5pm CET).</p>
          <p><strong>Your inquiry topic:</strong> ${topicLabel}</p>
          <p>We appreciate your patience and will respond as soon as possible.</p>
          <p>Best regards,<br>The TravelSmarter Team</p>
        `
      });
    } catch (confirmError) {
      console.error('Error sending confirmation email:', confirmError);
      // Don't fail the request if confirmation email fails
    }
    }

    res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully. We will respond within 2-4 hours.'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
