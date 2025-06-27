import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    // Reference to the User who requested the OTP
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User' // This links it to your User model
    },
    // The actual OTP code (e.g., "123456")
    code: {
        type: String,
        required: true
    },
    // The purpose of the OTP (e.g., "email_verification", "password_reset")
    purpose: {
        type: String,
        required: true,
        enum: ['email_verification', 'password_reset', '2fa_login'] // Add more as needed
    },
    // When the OTP expires (e.g., 5-10 minutes from creation)
    expiresAt: {
        type: Date,
        required: true
    },
    // To prevent the same OTP from being used multiple times
    isUsed: {
        type: Boolean,
        default: false
    }
}, { timestamps: true }); // `timestamps: true` adds `createdAt` and `updatedAt`

// Create a 2-minute (120-second) TTL index on `expiresAt`
// This will automatically delete documents from the collection after the expiration time.
// This is highly recommended for OTPs to keep your database clean.
otpSchema.index({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

export const OTP = mongoose.model("OTP", otpSchema);