import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
import mongoose from "mongoose"; // Import mongoose to use ObjectId conversion methods

import {deleteMediaFromCloudinary, deleteVideoFromCloudinary, uploadMedia} from "../utils/cloudinary.js";

export const createCourse = async (req,res) => {
    try {
        const {courseTitle, category} = req.body;
        if(!courseTitle || !category) {
            return res.status(400).json({
                message:"Course title and category is required."
            })
        }
        const course = await Course.create({
            courseTitle,
            category,
            creator:mongoose.Types.ObjectId.createFromHexString(req.id) // Use createFromHexString for req.id
        });

        return res.status(201).json({
            course,
            message:"Course created."
        })
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to create course"
        })
    }
}

export const getCreatorCourses = async (req,res) => {
    try {
        const userId = req.id;
        // Use createFromHexString for userId
        const courses = await Course.find({creator:mongoose.Types.ObjectId.createFromHexString(userId)});
        if(!courses){
            return res.status(404).json({
                courses:[],
                message:"Course not found"
            })
        };
        return res.status(200).json({
            courses,
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to create course"
        })
    }
}

export const createLecture = async (req,res) => {
    try {
        const {lectureTitle, videoUrl, publicId, isPreviewFree} = req.body; // Added fields from frontend
        const {courseId} = req.params;

        // UPDATED: Basic validation - Only lectureTitle is required here
        if (!lectureTitle) {
            return res.status(400).json({ message: "Lecture title is required." });
        }
        
        // Verify if the course exists and use createFromHexString
        const course = await Course.findById(mongoose.Types.ObjectId.createFromHexString(courseId));
        if (!course) {
            return res.status(404).json({ message: "Course not found." });
        }

        // Create the new lecture document
        const newLecture = new Lecture({
            lectureTitle,
            videoUrl: videoUrl || null, // Make optional: use provided value or null
            publicId: publicId || null, // Make optional: use provided value or null
            isPreviewFree: isPreviewFree !== undefined ? isPreviewFree : false, // Make optional: use provided value or default to false
            course: mongoose.Types.ObjectId.createFromHexString(courseId) // CRUCIAL FIX: Assign the courseId here
        });

        await newLecture.save();

        // Add the new lecture's ID to the course's lectures array
        course.lectures.push(newLecture._id);
        await course.save();

        res.status(201).json({
            success: true,
            message: "Lecture created successfully!",
            lecture: newLecture,
        });

    } catch (error) {
        console.error("Error in createLecture:", error);
        // Mongoose validation errors will have an 'errors' property
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: errors.join(', ') });
        }
        res.status(500).json({ success: false, message: "Server error creating lecture." });
    }
}

export const getCourseLecture = async (req,res) => {
    try {
        const {courseId} = req.params;
        // Use createFromHexString for courseId and populate lectures
        const course = await Course.findById(mongoose.Types.ObjectId.createFromHexString(courseId)).populate("lectures");
        if(!course){
            return res.status(404).json({
                message:"Course not found"
            })
        }
        return res.status(200).json({
            lectures: course.lectures
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to get lectures"
        })
    }
}

export const getCourseById = async (req,res) => {
    try {
        const {courseId} = req.params;
        // Use createFromHexString for courseId
        const course = await Course.findById(mongoose.Types.ObjectId.createFromHexString(courseId));

        if(!course){
            return res.status(404).json({
                message:"Course not found!"
            })
        }
        return res.status(200).json({
            course
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to get course by id"
        })
    }
}

export const editCourse = async (req,res) => {
    try {
        const courseId = req.params.courseId;
        const {courseTitle, subTitle, description, category, courseLevel, coursePrice} = req.body;
        const thumbnail = req.file;

        // Use createFromHexString for courseId
        let course = await Course.findById(mongoose.Types.ObjectId.createFromHexString(courseId));
        if(!course){
            return res.status(404).json({
                message:"Course not found!"
            })
        }
        let courseThumbnail;
        if(thumbnail){
            if(course.courseThumbnail){
                const publicId = course.courseThumbnail.split("/").pop().split(".")[0];
                await deleteMediaFromCloudinary(publicId); // delete old image
            }
            // upload a thumbnail on clourdinary
            courseThumbnail = await uploadMedia(thumbnail.path);
        }

        const updateData = {courseTitle, subTitle, description, category, courseLevel, coursePrice, courseThumbnail:courseThumbnail?.secure_url};

        // Use createFromHexString for courseId
        course = await Course.findByIdAndUpdate(mongoose.Types.ObjectId.createFromHexString(courseId), updateData, {new:true});

        return res.status(200).json({
            course,
            message:"Course updated successfully."
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to create course"
        })
    }
}

export const editLecture = async (req,res) => {
    try {
        const {lectureTitle, videoInfo, isPreviewFree} = req.body;
        
        const {courseId, lectureId} = req.params;
        // Use createFromHexString for lectureId
        const lecture = await Lecture.findById(mongoose.Types.ObjectId.createFromHexString(lectureId));
        if(!lecture){
            return res.status(404).json({
                message:"Lecture not found!"
            })
        }

        // update lecture
        if(lectureTitle) lecture.lectureTitle = lectureTitle;
        if(videoInfo?.videoUrl) lecture.videoUrl = videoInfo.videoUrl;
        if(videoInfo?.publicId) lecture.publicId = videoInfo.publicId;
        lecture.isPreviewFree = isPreviewFree;

        await lecture.save();

        // Ensure the course still has the lecture id if it was not already added;
        // Use createFromHexString for courseId
        const course = await Course.findById(mongoose.Types.ObjectId.createFromHexString(courseId));
        if(course && !course.lectures.includes(lecture._id)){
            course.lectures.push(lecture._id);
            await course.save();
        };
        return res.status(200).json({
            lecture,
            message:"Lecture updated successfully."
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to edit lectures"
        })
    }

}

export const removeLecture = async (req,res) => {
    try {
        const {lectureId} = req.params;
        // Use createFromHexString for lectureId
        const lecture = await Lecture.findByIdAndDelete(mongoose.Types.ObjectId.createFromHexString(lectureId));
        if(!lecture){
            return res.status(404).json({
                message:"Lecture not found!"
            });
        }
        // delete the lecture from cloudinary as well
        if(lecture.publicId){
            await deleteVideoFromCloudinary(lecture.publicId);
        }

        // Remove the lecture reference from the associated course
        // Use createFromHexString for lectureId
        await Course.updateOne(
            {lectures: mongoose.Types.ObjectId.createFromHexString(lectureId)}, // find the course that contains the lecture
            {$pull:{lectures: mongoose.Types.ObjectId.createFromHexString(lectureId)}} // Remove the lectures id from the lectures array
        );

        return res.status(200).json({
            message:"Lecture removed successfully."
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to remove lecture"
        })
    }
}

export const getLectureById = async (req,res) => {
    try {
        const {lectureId} = req.params;
        // Use createFromHexString for lectureId
        const lecture = await Lecture.findById(mongoose.Types.ObjectId.createFromHexString(lectureId));
        if(!lecture){
            return res.status(404).json({
                message:"Lecture not found!"
            });
        }
        return res.status(200).json({
            lecture
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to get lecture by id"
        })
    }
}

export const togglePublishCourse = async (req,res) => {
    try {
        const {courseId} = req.params;
        const {publish} = req.query; // true, false
        // Use createFromHexString for courseId
        const course = await Course.findById(mongoose.Types.ObjectId.createFromHexString(courseId));
        if(!course){
            return res.status(404).json({
                message:"Course not found!"
            });
        }
        // publish status based on the query paramter
        course.isPublished = publish === "true";
        await course.save();

        const statusMessage = course.isPublished ? "Published" : "Unpublished";
        return res.status(200).json({
            message:`Course is ${statusMessage}`
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to update status"
        })
    }
}

export const searchCourse = async (req,res) => {
    try {
        const {query = "", categories = [], sortByPrice =""} = req.query;
        console.log(categories);
        
        // create search query
        const searchCriteria = {
            isPublished:true,
            $or:[
                {courseTitle: {$regex:query, $options:"i"}},
                {subTitle: {$regex:query, $options:"i"}},
                {category: {$regex:query, $options:"i"}},
            ]
        }

        // if categories selected
        if(categories.length > 0) {
            searchCriteria.category = {$in: categories};
        }

        // define sorting order
        const sortOptions = {};
        if(sortByPrice === "low"){
            sortOptions.coursePrice = 1;//sort by price in ascending
        }else if(sortByPrice === "high"){
            sortOptions.coursePrice = -1; // descending
        }

        // No direct ObjectId conversion needed for string/array query parameters if Mongoose handles casting
        let courses = await Course.find(searchCriteria).populate({path:"creator", select:"name photoUrl"}).sort(sortOptions);

        return res.status(200).json({
            success:true,
            courses: courses || []
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ // Added status for consistency
            message: "Failed to search courses"
        });
    }
}

export const getPublishedCourse = async (_,res) => {
    try {
        // No direct ObjectId conversion needed for this query
        const courses = await Course.find({isPublished:true}).populate({path:"creator", select:"name photoUrl"});
        if(!courses){
            return res.status(404).json({
                message:"Course not found"
            })
        }
        return res.status(200).json({
            courses,
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to get published courses"
        })
    }
}
