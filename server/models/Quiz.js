// server/models/Quiz.js
import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
    lecture: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lecture',
        required: true,
        unique: true // A lecture should ideally have only one quiz
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    duration: { // Optional: in minutes, for a timed quiz
        type: Number,
        default: null
    },
    passPercentage: { // Optional: for passing criteria (e.g., 70 for 70%)
        type: Number,
        default: 0 // Default to 0, meaning no specific pass percentage needed
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming a user (e.g., instructor/admin) creates quizzes
        required: true
    }
}, { timestamps: true });

export const Quiz = mongoose.model('Quiz', quizSchema);