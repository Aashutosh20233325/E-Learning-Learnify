import mongoose from "mongoose";

// Sub-schema for individual lecture progress
const lectureProgressSchema = new mongoose.Schema({
    lectureId: {
        type: mongoose.Schema.Types.ObjectId, // It's better to use ObjectId reference here
        ref: 'Lecture', // Referencing the Lecture model
        required: true
    },
    viewed: {
        type: Boolean,
        default: false
    },
    // NEW FIELD: Array to store summary of quiz attempts for this lecture's quiz
    quizAttempts: [
        {
            quizId: { // Reference to the Quiz for this attempt (useful if lecture could have multiple quizzes later)
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Quiz',
                required: true
            },
            score: { // The score achieved on this specific attempt
                type: Number,
                required: true,
                min: 0,
                max: 100 // Assuming score is a percentage
            },
            passed: { // Whether the student passed this attempt
                type: Boolean,
                required: true
            },
            attemptDate: { // When this attempt was made
                type: Date,
                default: Date.now
            },
            // You might want to store a reference to a detailed QuizAttempt document here
            // For example, if you have a separate collection for each quiz submission
            // detailedAttemptId: {
            //     type: mongoose.Schema.Types.ObjectId,
            //     ref: 'QuizAttemptDetail' // A new model for detailed submissions
            // }
        }
    ]
}, { _id: false }); // Disable _id for subdocuments if you don't need it, or remove this line if you do

const courseProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId, // Better to use ObjectId reference here
        ref: 'User', // Referencing the User model
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId, // Better to use ObjectId reference here
        ref: 'Course', // Referencing the Course model
        required: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    // Array of lecture progress documents, now including quiz attempts
    lectureProgress: [lectureProgressSchema]
}, { timestamps: true });

export const CourseProgress = mongoose.model("CourseProgress", courseProgressSchema);