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
    duration: { 
        type: Number,
        default: null
    },
    passPercentage: { 
        type: Number,
        default: 0 
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

export const Quiz = mongoose.model('Quiz', quizSchema);