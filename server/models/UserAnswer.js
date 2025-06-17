// server/models/UserAnswer.js
import mongoose from 'mongoose';

const userAnswerSchema = new mongoose.Schema({
    attempt: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserQuizAttempt',
        required: true
    },
    question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    },
    selectedOption: { // For multiple_choice/true_false questions, reference to Option model
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Option',
        default: null
    },
    responseText: { // For short_answer questions
        type: String,
        trim: true,
        default: null
    },
    isCorrect: { // Whether the user's answer for this specific question was correct
        type: Boolean,
        default: false
    },
    pointsAwarded: { // Points awarded for this specific question
        type: Number,
        default: 0
    }
}, { timestamps: true });

export const UserAnswer = mongoose.model('UserAnswer', userAnswerSchema);