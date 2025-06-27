import mongoose from 'mongoose';

const quizSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to your User model
        required: true
    },
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz', // Reference to your Quiz model
        required: true
    },
    startTime: {
        type: Date,
        required: true,
        default: Date.now // When the quiz attempt officially started
    },
    status: {
        type: String,
        enum: ['in_progress', 'completed', 'timed_out', 'abandoned'], // Added 'abandoned'
        default: 'in_progress'
    }
}, { timestamps: true });


quizSessionSchema.index(
    { userId: 1, quizId: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: 'in_progress' } }
);

export const QuizSession = mongoose.model('QuizSession', quizSessionSchema);

