import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Import your RTK Query hooks
import {
    useGetQuizDetailsQuery,
    useEditQuizMutation,
} from "@/features/api/quizApi";

const EditQuizPage = () => {
    // Get all relevant parameters from the URL
    const { courseId, lectureId, quizId } = useParams();
    const navigate = useNavigate();

    // Debugging: Log useParams values immediately on component render
    // console.log("EditQuizPage (render): courseId from useParams:", courseId);
    // console.log("EditQuizPage (render): lectureId from useParams:", lectureId);
    // console.log("EditQuizPage (render): quizId from useParams:", quizId);

    // State to track if all necessary URL parameters are properly hydrated by React Router
    const [areParamsReady, setAreParamsReady] = useState(false);

    // This effect runs whenever courseId, lectureId, or quizId changes.
    useEffect(() => {
        console.log("EditQuizPage (useEffect - params change):");
        console.log("  courseId:", courseId);
        console.log("  lectureId:", lectureId);
        console.log("  quizId:", quizId);

        // Check if all parameters are defined and are non-empty strings
        const allPresent =
            typeof courseId === 'string' && courseId.length > 0 &&
            typeof lectureId === 'string' && lectureId.length > 0 &&
            typeof quizId === 'string' && quizId.length > 0;

        if (allPresent) {
            console.log("EditQuizPage: All parameters are ready.");
            setAreParamsReady(true);
        } else {
            console.log("EditQuizPage: Parameters are NOT yet ready or are invalid.");
            setAreParamsReady(false);
        }
    }, [courseId, lectureId, quizId]);

    // Fetch quiz details using the quizId ONLY when params are ready
    const {
        data: quizData,
        isLoading: quizIsLoading,
        isError: quizIsError,
        error: quizError,
    } = useGetQuizDetailsQuery(quizId, { skip: !areParamsReady });

    // Mutation hook for editing the quiz
    const [editQuiz, { isLoading: editLoading, isSuccess: editSuccess, isError: editMutationError, error: editErrorData }] =
        useEditQuizMutation();

    // State for form fields
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [duration, setDuration] = useState("");
    const [passPercentage, setPassPercentage] = useState("");

    // Populate form fields when quiz data is loaded
    useEffect(() => {
        if (quizData?.quiz) {
            console.log("EditQuizPage: quizData received and populating form.");
            const { title, description, duration, passPercentage } = quizData.quiz;
            setTitle(title || "");
            setDescription(description || "");
            setDuration(duration || "");
            setPassPercentage(passPercentage || "");
        }
    }, [quizData]);

    // Handle initial load errors or invalid quizId from the URL
    useEffect(() => {
        if (!areParamsReady) {
            return;
        }

        if (quizIsError) {
            console.error("EditQuizPage: Error fetching quiz from API:", quizError);
            if (quizError.status === 404) {
                 toast.error("Quiz not found. It may have been deleted.");
                 if (courseId && lectureId) {
                    navigate(`/admin/course/${courseId}/lecture/${lectureId}`); // Consistent singular path
                 } else {
                    navigate(-1);
                 }
            } else {
                 toast.error(quizError?.data?.message || "Failed to load quiz details due to a server error.");
            }
        }
    }, [quizId, quizIsError, quizError, navigate, courseId, lectureId, areParamsReady]);


   
    useEffect(() => {
        if (editSuccess) {
            toast.success("Quiz updated successfully!");
            if (courseId && lectureId) {
                navigate(`/admin/course/${courseId}/lecture/${lectureId}`); 
            }
        }
        if (editMutationError) {
            toast.error(editErrorData?.data?.message || "Failed to update quiz.");
            console.error("EditQuizPage: Error updating quiz:", editErrorData);
        }
    }, [editSuccess, editMutationError, editErrorData, navigate, courseId, lectureId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !duration || !passPercentage) {
            toast.error("Please fill in all required fields.");
            return;
        }

        const quizUpdateData = {
            quizId,
            title,
            description,
            duration: Number(duration),
            passPercentage: Number(passPercentage),
        };

        await editQuiz(quizUpdateData);
    };


    if (!areParamsReady) {
        console.log("EditQuizPage: Rendering 'Initializing...' state.");
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                <p className="ml-2 text-lg text-gray-700">Initializing page...</p>
            </div>
        );
    }

    if (quizIsLoading) {
        console.log("EditQuizPage: Rendering 'Loading quiz details...' state.");
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="ml-2 text-lg text-gray-700">Loading quiz details...</p>
            </div>
        );
    }

    if (!quizData?.quiz && quizIsError && quizError.status === 404) {
         console.log("EditQuizPage: Rendering 'Quiz not found' state.");
         return (
             <div className="flex justify-center items-center h-screen">
                 <p className="text-xl text-red-600">Quiz not found or it may have been deleted.</p>
             </div>
         );
    }

    if (quizIsError && quizError.status !== 404) {
        console.log("EditQuizPage: Rendering 'Unexpected error' state.");
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-xl text-red-600">An unexpected error occurred while loading the quiz. Please try again.</p>
            </div>
        );
    }

    //console.log("EditQuizPage: Rendering main content.");
    return (
        <Card className="rounded-lg shadow-lg max-w-2xl mx-auto my-10">
            <CardHeader className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-6 rounded-t-lg">
                <CardTitle className="text-2xl font-bold">Edit Quiz: {quizData?.quiz?.title}</CardTitle>
                <CardDescription className="text-green-100 mt-1">
                    Update the details of your quiz.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <Label htmlFor="quiz-title">Quiz Title</Label>
                        <Input
                            id="quiz-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., JavaScript Fundamentals Quiz"
                            className="border-gray-300 focus:border-green-500 rounded-md"
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="quiz-description">Description</Label>
                        <Textarea
                            id="quiz-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of the quiz content."
                            className="border-gray-300 focus:border-green-500 rounded-md"
                            rows={4}
                        />
                    </div>
                    <div>
                        <Label htmlFor="quiz-duration">Duration (minutes)</Label>
                        <Input
                            id="quiz-duration"
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            placeholder="e.g., 30"
                            className="border-gray-300 focus:border-green-500 rounded-md"
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="quiz-pass-percentage">Pass Percentage (%)</Label>
                        <Input
                            id="quiz-pass-percentage"
                            type="number"
                            value={passPercentage}
                            onChange={(e) => setPassPercentage(e.target.value)}
                            placeholder="e.g., 70"
                            className="border-gray-300 focus:border-green-500 rounded-md"
                            required
                        />
                    </div>

                    
                    <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-lg font-semibold mb-3 text-gray-700">Questions Management</h4>
                        <p className="text-sm text-gray-600 mb-4">
                            To add, edit, or delete questions for this quiz, click the button below.
                        </p>
                        <Link to={`/admin/quizzes/${quizId}/questions`}> {/* This link needs to be updated to be consistent with singular if that route exists */}
                            <Button type="button" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition-all duration-200 ease-in-out">
                                Working on
                            </Button>
                        </Link>
                    </div> 
                    
                    <Button
                        type="submit"
                        disabled={editLoading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 rounded-md py-2"
                    >
                        {editLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Updating Quiz...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default EditQuizPage;
