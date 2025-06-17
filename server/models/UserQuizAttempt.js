// server/models/UserQuizAttempt.js
import mongoose from 'mongoose';

const userQuizAttemptSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to your User model
        required: true
    },
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    score: { // Total score obtained by the user for this attempt
        type: Number,
        default: 0
    },
    totalPoints: { // Maximum possible score for the quiz (sum of all question points)
        type: Number,
        required: true
    },
    isCompleted: { // True if the user finished and submitted the quiz
        type: Boolean,
        default: false
    },
    passed: { // True if the user's score meets the quiz's passPercentage
        type: Boolean,
        default: false
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

// Optional: You might want an index on user and quiz for quick lookups
userQuizAttemptSchema.index({ user: 1, quiz: 1 });

export const UserQuizAttempt = mongoose.model('UserQuizAttempt', userQuizAttemptSchema);