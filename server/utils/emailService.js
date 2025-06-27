import nodemailer from 'nodemailer';

// Configure your Nodemailer transporter
// IMPORTANT: Use environment variables for sensitive data in production
const transporter = nodemailer.createTransport({
    // --- THIS SECTION IS NOW ACTIVE FOR GMAIL ---
    service: 'gmail', // Use 'gmail' service to connect to Google's SMTP
    auth: {
        // Your Gmail address (e.g., your.actual.email@gmail.com)
        user: process.env.EMAIL_USER,
        // Your Gmail App Password (NOT your regular password)
        pass: process.env.EMAIL_PASS,
    },
    // --- END GMAIL CONFIGURATION ---

    // --- THIS SECTION IS NOW COMMENTED OUT (was for generic SMTP/Ethereal) ---
    // host: process.env.EMAIL_HOST, // e.g., smtp.sendgrid.net
    // port: process.env.EMAIL_PORT, // e.g., 587
    // secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    // auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASS,
    // },
    // --- END COMMENTED SECTION ---
});

export const sendEmail = async (to, subject, htmlContent) => {
    try {
        const mailOptions = {
            // This will be the 'From' address that recipients see.
            // It should be your Gmail address configured in EMAIL_USER.
            from: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER, 
            
            // This 'to' is the recipient's email address, where the OTP will actually go.
            to,
            subject,
            html: htmlContent,
        };
        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${to}`);
        return true;
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
        throw new Error('Email sending failed. Please check server logs.');
    }
};