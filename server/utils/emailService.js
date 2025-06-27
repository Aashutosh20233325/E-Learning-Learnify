import nodemailer from 'nodemailer';
// console.log("Nodemailer Config Check:");
// console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
// console.log("EMAIL_PORT:", process.env.EMAIL_PORT);
// console.log("EMAIL_SECURE:", process.env.EMAIL_SECURE); // Will be 'true' or 'false' string
// console.log("EMAIL_USER:", process.env.EMAIL_USER); // Log the user to ensure it's there
// console.log("EMAIL_PASS: ********"); // DO NOT log the actual password for security, just confirm its presence
// console.log("EMAIL_FROM_ADDRESS:", process.env.EMAIL_FROM_ADDRESS);
// Configure your Nodemailer transporter
// IMPORTANT: Use environment variables for sensitive data in production
const transporter = nodemailer.createTransport({
    // Example for Gmail (less secure, consider app passwords or dedicated email services)
    // service: 'gmail',
    // auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASS,
    // },

    // Example for an SMTP server (more common for dedicated email services like SendGrid, Mailgun, etc.)
    
    
    host: process.env.EMAIL_HOST, // e.g., smtp.sendgrid.net
    port: process.env.EMAIL_PORT, // e.g., 587
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});


export const sendEmail = async (to, subject, htmlContent) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER, 
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