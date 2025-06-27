import { CourseProgress } from "../models/CourseProgress.js";
import { Course } from "../models/course.model.js";
import mongoose from "mongoose"; // Import mongoose

export const getCourseProgress = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.id;

        // Use createFromHexString for explicit conversion of string IDs to ObjectId
        let courseProgress = await CourseProgress.findOne({
            courseId: mongoose.Types.ObjectId.createFromHexString(courseId),
            userId: mongoose.Types.ObjectId.createFromHexString(userId),
        });

        // Use createFromHexString for explicit conversion of string IDs to ObjectId
        const courseDetails = await Course.findById(mongoose.Types.ObjectId.createFromHexString(courseId))
            .populate({
                path: 'lectures', // Path to the lectures array/reference in the Course model
                model: 'Lecture', // Reference the Lecture model
                populate: {
                    path: 'quiz', // The 'quiz' field in your Lecture model
                    model: 'Quiz', // Reference the Quiz model
                    select: '_id title description' // Select minimal quiz fields needed by the frontend
                }
            })
            .exec(); // Execute the query

        if (!courseDetails) {
            return res.status(404).json({
                message: "Course not found",
            });
        }

        if (!courseProgress) {
            return res.status(200).json({
                data: {
                    courseDetails,
                    progress: [],
                    completed: false,
                },
            });
        }

        return res.status(200).json({
            data: {
                courseDetails,
                progress: courseProgress.lectureProgress,
                completed: courseProgress.completed,
            },
        });
    } catch (error) {
        console.error("Error in getCourseProgress:", error); // Log error for debugging
        res.status(500).json({ message: "Server error fetching course progress." });
    }
};

export const updateLectureProgress = async (req, res) => {
    try {
        const { courseId, lectureId } = req.params;
        const userId = req.id;

        // Use createFromHexString for explicit conversion of string IDs to ObjectId
        let courseProgress = await CourseProgress.findOne({
            courseId: mongoose.Types.ObjectId.createFromHexString(courseId),
            userId: mongoose.Types.ObjectId.createFromHexString(userId),
        });

        if (!courseProgress) {
            // If no progress exists, create a new record
            courseProgress = new CourseProgress({
                userId: mongoose.Types.ObjectId.createFromHexString(userId),
                courseId: mongoose.Types.ObjectId.createFromHexString(courseId),
                completed: false,
                lectureProgress: [],
            });
        }

        // Find the lecture progress in the course progress
        const lectureIndex = courseProgress.lectureProgress.findIndex(
            (lecture) => lecture.lectureId.toString() === lectureId // toString() is still correct here for comparison
        );

        if (lectureIndex !== -1) {
            // If lecture already exists, update its status
            courseProgress.lectureProgress[lectureIndex].viewed = true;
        } else {
            // Add new lecture progress
            courseProgress.lectureProgress.push({
                lectureId: mongoose.Types.ObjectId.createFromHexString(lectureId),
                viewed: true,
                quizAttempts: []
            });
        }

        // Use createFromHexString for explicit conversion of string IDs to ObjectId
        const course = await Course.findById(mongoose.Types.ObjectId.createFromHexString(courseId));
        if (!course) {
            return res.status(404).json({ message: "Course not found for progress check." });
        }

        const allCourseLecturesViewed = course.lectures.every(courseLectureId =>
            courseProgress.lectureProgress.some(lp =>
                lp.lectureId.equals(courseLectureId) && lp.viewed
            )
        );
        
        courseProgress.completed = allCourseLecturesViewed;

        await courseProgress.save();

        return res.status(200).json({
            message: "Lecture progress updated successfully.",
        });
    } catch (error) {
        console.error("Error in updateLectureProgress:", error);
        res.status(500).json({ message: "Server error updating lecture progress." });
    }
};

export const markAsCompleted = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.id;

        // Use createFromHexString for explicit conversion of string IDs to ObjectId
        const courseProgress = await CourseProgress.findOne({
            courseId: mongoose.Types.ObjectId.createFromHexString(courseId),
            userId: mongoose.Types.ObjectId.createFromHexString(userId),
        });

        if (!courseProgress) {
            return res.status(404).json({ message: "Course progress not found" });
        }

        courseProgress.lectureProgress.forEach(
            (lectureProgress) => (lectureProgress.viewed = true)
        );
        courseProgress.completed = true;
        await courseProgress.save();
        return res.status(200).json({ message: "Course marked as completed." });
    } catch (error) {
        console.error("Error in markAsCompleted:", error);
        res.status(500).json({ message: "Server error marking course as completed." });
    }
};

export const markAsInCompleted = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.id;

        // Use createFromHexString for explicit conversion of string IDs to ObjectId
        const courseProgress = await CourseProgress.findOne({
            courseId: mongoose.Types.ObjectId.createFromHexString(courseId),
            userId: mongoose.Types.ObjectId.createFromHexString(userId),
        });

        if (!courseProgress)
            return res.status(404).json({ message: "Course progress not found" });

        courseProgress.lectureProgress.forEach(
            (lectureProgress) => (lectureProgress.viewed = false)
        );
        courseProgress.completed = false;
        await courseProgress.save();
        return res.status(200).json({ message: "Course marked as incompleted." });
    } catch (error) {
        console.error("Error in markAsInCompleted:", error);
        res.status(500).json({ message: "Server error marking course as incompleted." });
    }
};
