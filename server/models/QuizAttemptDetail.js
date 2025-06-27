import mongoose from 'mongoose';


const submittedAnswerSchema = new mongoose.Schema({
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question', 
        required: true
    },
    questionType: {
        type: String,
        enum: ['multiple_choice', 'true_false', 'short_answer'], 
        required: true
    },
    selectedOptionIds: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question.options', 
        }
    ],
   
    submittedAnswerText: {
        type: String,
        trim: true
    },
  
    isCorrect: {
        type: Boolean,
        default: false
    },

    pointsAwarded: {
        type: Number,
        default: 0
    }
}, { _id: false }); 


const quizAttemptDetailSchema = new mongoose.Schema({
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    score: { 
        type: Number,
        required: true,
        min: 0
    },
    totalPoints: { 
        type: Number,
        required: true,
        min: 0
    },
    passed: { 
        type: Boolean,
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    answers: [submittedAnswerSchema] 
}, { timestamps: true });

export const QuizAttemptDetail = mongoose.model('QuizAttemptDetail', quizAttemptDetailSchema);
