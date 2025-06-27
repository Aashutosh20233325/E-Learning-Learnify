// server/models/Question.js
import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    quiz: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    type: { // e.g., 'multiple_choice', 'true_false', 'short_answer'
        type: String,
        enum: ['multiple_choice', 'true_false', 'short_answer'],
        required: true
    },
    points: { // How many points this question is worth
        type: Number,
        default: 1
    },
    // For 'short_answer' type, you might store the correct answer text here
    // For more complex grading (e.g., partial credit, multiple correct phrases), you'd need more logic
    correctAnswerText: { // For short_answer type
        type: String,
        trim: true,
        default: null
    }
}, { timestamps: true });

export const Question = mongoose.model('Question', questionSchema);