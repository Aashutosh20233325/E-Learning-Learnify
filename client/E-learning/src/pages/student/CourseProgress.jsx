import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
    useCompleteCourseMutation,
    useGetCourseProgressQuery,
    useInCompleteCourseMutation,
    useUpdateLectureProgressMutation,
} from "@/features/api/courseProgressApi";
import { CheckCircle, CheckCircle2, CirclePlay, PencilRuler } from "lucide-react"; // Added PencilRuler icon
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Import useNavigate
import { toast } from "sonner";

const CourseProgress = () => {
    const params = useParams();
    const courseId = params.courseId;
    const navigate = useNavigate(); // Initialize useNavigate

    const { data, isLoading, isError, refetch } =
        useGetCourseProgressQuery(courseId);

    const [updateLectureProgress] = useUpdateLectureProgressMutation();
    const [
        completeCourse,
        { data: markCompleteData, isSuccess: completedSuccess },
    ] = useCompleteCourseMutation();
    const [
        inCompleteCourse,
        { data: markInCompleteData, isSuccess: inCompletedSuccess },
    ] = useInCompleteCourseMutation();

    useEffect(() => {
        console.log(markCompleteData);

        if (completedSuccess) {
            refetch();
            toast.success(markCompleteData.message);
        }
        if (inCompletedSuccess) {
            refetch();
            toast.success(markInCompleteData.message);
        }
    }, [completedSuccess, inCompletedSuccess, markCompleteData, markInCompleteData, refetch]); // Added refetch to dependencies

    const [currentLecture, setCurrentLecture] = useState(null);

    // Set initial lecture only once after data loads
    useEffect(() => {
        if (data && data.data && data.data.courseDetails && data.data.courseDetails.lectures.length > 0) {
            if (!currentLecture) { // Only set if currentLecture is not already set
                setCurrentLecture(data.data.courseDetails.lectures[0]);
            }
        }
    }, [data, currentLecture]); // Add currentLecture to deps to prevent infinite loop

    if (isLoading) return <p className="text-center text-lg mt-10">Loading course progress...</p>;
    if (isError) return <p className="text-center text-lg mt-10 text-red-500">Failed to load course details. Please try again.</p>;

    //console.log("Course Progress Data:", data); // More descriptive log

    const { courseDetails, progress, completed } = data.data;
    const { courseTitle } = courseDetails;

    // Ensure initialLecture is always defined if lectures exist
    const initialLecture = courseDetails.lectures && courseDetails.lectures[0];
    if (!initialLecture) return <p className="text-center text-lg mt-10">No lectures found for this course.</p>;


    const isLectureCompleted = (lectureId) => {
        return progress.some((prog) => prog.lectureId === lectureId && prog.viewed);
    };

    const handleLectureProgress = async (lectureId) => {
        // Only update if the lecture is not already viewed to avoid unnecessary API calls
        if (!isLectureCompleted(lectureId)) {
            await updateLectureProgress({ courseId, lectureId });
            refetch(); // Refetch to update UI with new progress
        }
    };

    // Handle select a specific lecture to watch
    const handleSelectLecture = (lecture) => {
        setCurrentLecture(lecture);
        // Mark lecture as viewed when selected to watch it
        handleLectureProgress(lecture._id);
    };

    const handleCompleteCourse = async () => {
        await completeCourse(courseId);
    };
    const handleInCompleteCourse = async () => {
        await inCompleteCourse(courseId);
    };

    // New handler for taking a quiz - UPDATED to pass state for new session
    const handleTakeQuiz = (quizId) => {
        if (quizId) {
            console.log(`Navigating to quiz taking page for quizId: ${quizId}, requesting new session.`);
            // IMPORTANT: Pass { state: { newSession: true } } to indicate a fresh start
            // Also corrected the path to /quiz/take/${quizId} as per App.jsx route
            navigate(`/quiz/${quizId}`, { state: { newSession: true } });
        } else {
            toast.error("Quiz ID not found for this lecture.");
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4">
            {/* Display course name */}
            <div className="flex justify-between items-center mb-4 border-b pb-4">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                    {courseTitle}
                </h1>
                <Button
                    onClick={completed ? handleInCompleteCourse : handleCompleteCourse}
                    variant={completed ? "outline" : "default"}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ease-in-out
                                ${completed ? 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'}`}
                >
                    {completed ? (
                        <div className="flex items-center">
                            <CheckCircle className="h-5 w-5 mr-2" /> <span>Completed</span>{" "}
                        </div>
                    ) : (
                        "Mark as completed"
                    )}
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Video section */}
                <div className="flex-1 md:w-3/5 h-fit rounded-lg shadow-lg p-4 bg-white dark:bg-gray-800">
                    <div>
                        {currentLecture?.videoUrl || initialLecture?.videoUrl ? (
                            <video
                                src={currentLecture?.videoUrl || initialLecture.videoUrl}
                                controls
                                className="w-full h-auto md:rounded-lg border border-gray-200 dark:border-gray-700"
                                onPlay={() =>
                                    handleLectureProgress(currentLecture?._id || initialLecture._id)
                                }
                            />
                        ) : (
                            <div className="w-full h-96 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400">
                                No video available for this lecture.
                            </div>
                        )}
                    </div>
                    {/* Display current watching lecture title */}
                    <div className="mt-4 ">
                        <h3 className="font-medium text-xl text-gray-800 dark:text-gray-100">
                            {`Lecture ${
                                courseDetails.lectures.findIndex(
                                    (lec) =>
                                        lec._id === (currentLecture?._id || initialLecture._id)
                                ) + 1
                            } : ${
                                currentLecture?.lectureTitle || initialLecture.lectureTitle
                            }`}
                        </h3>
                    </div>
                </div>
                {/* Lecture Sidebar */}
                <div className="flex flex-col w-full md:w-2/5 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 md:pl-4 pt-4 md:pt-0">
                    <h2 className="font-semibold text-2xl mb-4 text-gray-800 dark:text-white">Course Lectures</h2>
                    <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]"> {/* Added max-height for scrollability */}
                        {courseDetails?.lectures.map((lecture, index) => (
                            <Card
                                key={lecture._id}
                                className={`mb-3 hover:shadow-md transition-all duration-200 ease-in-out
                                        ${lecture._id === (currentLecture?._id || initialLecture?._id)
                                            ? "bg-blue-100 dark:bg-blue-900/30 border-blue-400"
                                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                        } `}
                                onClick={() => handleSelectLecture(lecture)}
                            >
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="flex items-center flex-1 min-w-0">
                                        {isLectureCompleted(lecture._id) ? (
                                            <CheckCircle2 size={24} className="text-green-500 mr-3 flex-shrink-0" />
                                        ) : (
                                            <CirclePlay size={24} className="text-gray-500 mr-3 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-lg font-medium text-gray-800 dark:text-gray-100 truncate">
                                                {`Lecture ${index + 1}: ${lecture.lectureTitle}`}
                                            </CardTitle>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                        {lecture.quiz && ( // Conditionally render quiz button if quiz exists for lecture
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent card's onClick from firing
                                                    handleTakeQuiz(lecture.quiz._id);
                                                }}
                                            >
                                                <PencilRuler className="h-4 w-4 mr-1" /> Quiz
                                            </Button>
                                        )}
                                        {isLectureCompleted(lecture._id) && (
                                            <Badge
                                                variant="outline"
                                                className="bg-green-200 text-green-600 dark:bg-green-900/30 dark:text-green-300"
                                            >
                                                Completed
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseProgress;
