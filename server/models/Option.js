// server/models/Option.js
import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
    question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    isCorrect: { // True if this is the correct answer for the question
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export const Option = mongoose.model('Option', optionSchema);