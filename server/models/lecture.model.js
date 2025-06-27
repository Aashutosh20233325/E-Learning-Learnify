    import mongoose from "mongoose";

    const lectureSchema = new mongoose.Schema({
        lectureTitle: {
            type: String,
            required: true,
        },
        videoUrl: { type: String },
        publicId: { type: String },
        isPreviewFree: { type: Boolean },
        // Reference to the Quiz model (already added)
        quiz: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Quiz',
            default: null,
        },
        // NEW FIELD: Reference to the Course model
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true // A lecture must belong to a course
        }
    }, { timestamps: true });

    export const Lecture = mongoose.model("Lecture", lectureSchema);