import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useEditLectureMutation, useGetLectureByIdQuery, useRemoveLectureMutation } from "@/features/api/courseApi";
import { useGetQuizByLectureQuery, useDeleteQuizMutation } from "@/features/api/quizApi";
import axios from "axios";
import { Loader2, Trash2 } from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const MEDIA_API = "http://localhost:8080/api/v1/media";

const LectureTab = () => {
    const navigate = useNavigate();
    const [lectureTitle, setLectureTitle] = useState("");
    const [uploadVideInfo, setUploadVideoInfo] = useState(null);
    const [isFree, setIsFree] = useState(false);
    const [mediaProgress, setMediaProgress] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const { courseId, lectureId } = useParams();

    console.log("LectureTab: courseId from useParams:", courseId);
    console.log("LectureTab: lectureId from useParams:", lectureId);

    const { data: lectureData } = useGetLectureByIdQuery(lectureId);
    const lecture = lectureData?.lecture;

    const {
        data: quizData,
        isLoading: quizIsLoading,
        isError: quizIsError,
        error: quizError,
        refetch: refetchQuiz,
    } = useGetQuizByLectureQuery(lectureId);

    const hasQuiz = useMemo(() => {
        if (quizIsLoading) return false;
        if (quizIsError && quizError.status === 404 && quizError.data?.message === 'No quiz found for this lecture.') {
            return false;
        }
        console.log("LectureTab (inside hasQuiz useMemo): quizData:", quizData);
        return !!quizData?.quiz;
    }, [quizData, quizIsLoading, quizIsError, quizError]);

    const quiz = hasQuiz ? quizData.quiz : null;
    console.log("LectureTab: quiz object (after useMemo):", quiz);
    console.log("LectureTab: hasQuiz boolean (after useMemo):", hasQuiz);

    useEffect(() => {
        if (lecture) {
            setLectureTitle(lecture.lectureTitle);
            setIsFree(lecture.isPreviewFree);
            setUploadVideoInfo(lecture.videoInfo);
        }
    }, [lecture]);

    const [editLecture, { data: editData, isLoading: editLoading, error: editError, isSuccess: editSuccess }] =
        useEditLectureMutation();
    const [removeLecture, { data: removeData, isLoading: removeLoading, error: removeError, isSuccess: removeSuccess }] = useRemoveLectureMutation();
    const [deleteQuiz, { isLoading: deleteQuizLoading, isSuccess: deleteQuizSuccess, isError: deleteQuizIsError, error: deleteQuizError }] = useDeleteQuizMutation();


    const fileChangeHandler = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append("file", file);
            setMediaProgress(true);
            setUploadProgress(0);
            const toastId = toast.loading("Uploading video...", { id: 'video-upload-progress' });
            try {
                const res = await axios.post(`${MEDIA_API}/upload-video`, formData, {
                    onUploadProgress: ({ loaded, total }) => {
                        setUploadProgress(Math.round((loaded * 100) / total));
                        toast.loading(`Uploading video: ${Math.round((loaded * 100) / total)}%`, { id: toastId });
                    },
                });

                if (res.data.success) {
                    setUploadVideoInfo({
                        videoUrl: res.data.data.url,
                        publicId: res.data.data.public_id,
                    });
                    toast.success(res.data.message, { id: toastId });
                }
            } catch (error) {
                console.error("Video upload failed:", error);
                toast.error(error.response?.data?.message || "Video upload failed", { id: toastId });
            } finally {
                setMediaProgress(false);
            }
        }
    };

    const editLectureHandler = async () => {
        const toastId = toast.loading("Updating lecture...", { id: 'edit-lecture-status' });
        await editLecture({
            lectureTitle,
            videoInfo: uploadVideInfo,
            isPreviewFree: isFree,
            courseId,
            lectureId,
        });
    };

    const removeLectureHandler = async () => {
        console.log("Showing custom confirmation modal for lecture removal.");
        const toastId = toast.loading("Removing lecture...", { id: 'remove-lecture-status' });
        await removeLecture(lectureId);
    };

    const handleDeleteQuiz = async () => {
        if (!quiz) return;
        console.log(`Showing custom confirmation modal for deleting quiz "${quiz.title}".`);
        const toastId = toast.loading("Deleting quiz...", { id: 'delete-quiz-status' });
        await deleteQuiz(quiz._id);
    };

    useEffect(() => {
        if (editSuccess) {
            toast.success(editData?.message || "Lecture updated successfully!", { id: 'edit-lecture-status' });
        }
        if (editError) {
            toast.error(editError.data?.message || "Failed to update lecture.", { id: 'edit-lecture-status' });
        }
    }, [editSuccess, editError, editData]);

    useEffect(() => {
        if (removeSuccess) {
            toast.success(removeData?.message || "Lecture removed successfully!", { id: 'remove-lecture-status' });
        }
        if (removeError) {
            toast.error(removeError.data?.message || "Failed to remove lecture.", { id: 'remove-lecture-status' });
        }
    }, [removeSuccess, removeError, removeData, navigate, courseId]);

    useEffect(() => {
        if (quizIsError) {
            if (quizError.status === 404 && quizError.data?.message === 'No quiz found for this lecture.') {
                console.log('No quiz found for this lecture (expected 404 response).');
            } else {
                toast.error(quizError.data?.message || "Failed to load quiz details.");
                console.error('Error loading quiz:', quizError);
            }
        }
    }, [quizIsError, quizError]);

    useEffect(() => {
        if (deleteQuizSuccess) {
            toast.success("Quiz deleted successfully!", { id: 'delete-quiz-status' });
            refetchQuiz();
        }
        if (deleteQuizIsError) {
            toast.error(deleteQuizError.data?.message || "Failed to delete quiz.", { id: 'delete-quiz-status' });
            console.error("Error deleting quiz:", deleteQuizError);
        }
    }, [deleteQuizSuccess, deleteQuizIsError, deleteQuizError, refetchQuiz]);

    return (
        <Card className="rounded-lg shadow-lg">
            <CardHeader className="flex flex-col md:flex-row md:justify-between md:items-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-lg">
                <div>
                    <CardTitle className="text-2xl font-bold">Edit Lecture</CardTitle>
                    <CardDescription className="text-blue-100 mt-1">
                        Make changes and click save when done.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                    <Button disabled={removeLoading} variant="destructive" onClick={removeLectureHandler} className="flex items-center gap-2">
                        {
                            removeLoading ? <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Please wait
                            </> : "Remove Lecture"
                        }
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div>
                    <Label htmlFor="lecture-title">Title</Label>
                    <Input
                        id="lecture-title"
                        value={lectureTitle}
                        onChange={(e) => setLectureTitle(e.target.value)}
                        type="text"
                        placeholder="Ex. Introduction to Javascript"
                        className="border-gray-300 focus:border-blue-500 rounded-md"
                    />
                </div>
                <div className="my-5">
                    <Label htmlFor="lecture-video">
                        Video <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="lecture-video"
                        type="file"
                        accept="video/*"
                        onChange={fileChangeHandler}
                        placeholder="Ex. Introduction to Javascript"
                        className="w-full md:w-fit border-gray-300 focus:border-blue-500 rounded-md"
                    />
                </div>
                <div className="flex items-center space-x-2 my-5">
                    <Switch checked={isFree} onCheckedChange={setIsFree} id="is-free-switch" />
                    <Label htmlFor="is-free-switch">Is this video FREE preview?</Label>
                </div>

                {mediaProgress && (
                    <div className="my-4">
                        <Progress value={uploadProgress} className="h-2 bg-blue-200" indicatorClassName="bg-blue-600" />
                        <p className="text-sm text-gray-600 mt-1">{uploadProgress}% uploaded</p>
                    </div>
                )}

                <div className="mt-4">
                    <Button disabled={editLoading} onClick={editLectureHandler} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 rounded-md">
                        {
                            editLoading ? <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Please wait
                            </> : "Update Lecture"
                        }
                    </Button>
                </div>

                {/* Quiz Management Section */}
                <div className="mt-8 border-t pt-6 border-gray-200">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Quiz Management</h3>
                    {quizIsLoading ? (
                        <div className="flex items-center gap-2 text-gray-600">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading Quiz Info...
                        </div>
                    ) : (
                        <>
                            {!hasQuiz ? (
                                <p className="text-muted-foreground mb-4 text-gray-500">No quiz found for this lecture. Create one!</p>
                            ) : (
                                <p className="mb-4 text-gray-700">Quiz: "<span className="font-medium text-blue-700">{quiz.title}</span>" is available for this lecture.</p>
                            )}
                            {/* Link to Quiz Creation/Edit - NOW USING CONSISTENT SINGULAR PATHS */}
                            <Link to={hasQuiz ? `/admin/course/${courseId}/lecture/${lectureId}/quiz/${quiz._id}/edit` : `/admin/course/${courseId}/lecture/${lectureId}/quiz/create`}>
                                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition-all duration-200 ease-in-out">
                                    {hasQuiz ? 'Edit Quiz' : 'Create New Quiz'}
                                </Button>
                            </Link>

                            {hasQuiz && (
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteQuiz}
                                    disabled={deleteQuizLoading}
                                    className="w-full mt-2 flex items-center gap-2"
                                >
                                    {deleteQuizLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" /> Deleting Quiz...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="h-4 w-4" /> Delete Quiz
                                        </>
                                    )}
                                </Button>
                            )}
                        </>
                    )}
                </div>

            </CardContent>
        </Card>
    );
};

export default LectureTab;
