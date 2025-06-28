import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox'; // Assuming you have a Checkbox component for multi-select

import {
    useGetQuizDetailsForStudentQuery,
    useSubmitQuizAttemptMutation,
    useStartQuizAttemptMutation
} from '../../features/api/quizApi';

import { useLoadUserQuery } from '../../features/api/authApi';

const QuizTakingPage = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Fetch user data to get userId
    const { data: userData, isLoading: userLoading, isError: userError, error: authError } = useLoadUserQuery();
    const userId = userData?.user?._id;

    const [studentAnswers, setStudentAnswers] = useState({});
    const [quizSession, setQuizSession] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null); // Use null initially to distinguish from 0
    const timerIntervalRef = useRef(null);
    const hasInitiatedSessionRef = useRef(false); // To prevent multiple session starts

    // Fetch quiz details for the student
    const {
        data: quizData,
        isLoading: quizIsLoading,
        isError: quizIsError,
        error: quizError,
        refetch: refetchQuizDetails // Add refetch for convenience if needed later
    } = useGetQuizDetailsForStudentQuery(quizId, { skip: !quizId || !userId }); // Skip if no quizId or userId yet

    // Mutations for starting and submitting a quiz
    const [startQuiz, { isLoading: startQuizLoading, isError: startQuizError, error: startQuizErrorData }] = useStartQuizAttemptMutation();
    const [submitQuiz, { isLoading: submitLoading, isSuccess: submitSuccess, isError: submitMutationError, error: submitErrorData, data: submitResultData }] = useSubmitQuizAttemptMutation();

    const quiz = quizData?.quiz;
    const questions = quizData?.questions || [];

    // --- EFFECT: Handle Quiz Session Initialization and Timer Setup ---
    useEffect(() => {
        // Return early if initial data is still loading or quizId is missing
        if (userLoading || quizIsLoading || !quizId) {
            return;
        }

        // Handle authentication errors first
        if (userError) {
            toast.error(authError?.data?.message || "You must be logged in to take this quiz.");
            navigate('/login', { state: { from: location.pathname } });
            return;
        }
        
        // If userId is not available after userLoading, it means the user is not authenticated.
        // This case should ideally be caught by userError, but an explicit check can be helpful.
        if (!userId) {
            console.log("QuizTakingPage: userId not available after loading, likely unauthenticated.");
            // The userError check above should handle the not logged in case and redirect.
            // If it falls through here, it implies a transient state or an issue with useLoadUserQuery.
            // We can return and wait for user data or error to propagate.
            return;
        }

        // Handle quiz loading errors
        if (quizIsError) {
            toast.error(quizError?.data?.message || "Failed to load quiz details.");
            navigate('/dashboard'); // Or a more appropriate error page
            return;
        }

        // Proceed with session logic only if quiz data is available and session hasn't been initiated
        if (quiz && !hasInitiatedSessionRef.current) {
            if (quizData.quizSession) {
                // Resume existing session
                setQuizSession(quizData.quizSession);
                const timeRemaining = Math.floor((new Date(quizData.quizSession.endTime).getTime() - Date.now()) / 1000);
                setTimeLeft(Math.max(0, timeRemaining));
                hasInitiatedSessionRef.current = true;
                toast.info("Resuming quiz session.");
            } else if (quiz.duration && quiz.duration > 0) {
                // Start a new timed session if the quiz has a duration
                const initiateQuizSession = async () => {
                    try {
                        const newSession = await startQuiz({ quizId, userId }).unwrap();
                        setQuizSession(newSession.session);
                        // Calculate initial timeLeft from backend-provided endTime
                        const initialTimeRemaining = Math.floor((new Date(newSession.session.endTime).getTime() - Date.now()) / 1000);
                        setTimeLeft(Math.max(0, initialTimeRemaining));
                        hasInitiatedSessionRef.current = true;
                        toast.success("Quiz started! Good luck.");
                    } catch (err) {
                        toast.error(err?.data?.message || "Failed to start quiz session.");
                        navigate('/dashboard'); // Redirect if session can't be started
                    }
                };
                initiateQuizSession();
            } else {
                // Untimed quiz
                setTimeLeft(Infinity); // Set to Infinity for untimed quizzes
                hasInitiatedSessionRef.current = true;
                toast.info("Untimed quiz started.");
            }
        }
    }, [quizData, userId, userLoading, quizIsLoading, quizIsError, userError, quizError, quizId, startQuiz, navigate, location.pathname, quiz]);

    // --- EFFECT: Timer Countdown Logic ---
    useEffect(() => {
        // Clear any existing interval if timeLeft is null (not set), Infinity (untimed), or no session
        if (timeLeft === null || timeLeft === Infinity || !quizSession) {
            clearInterval(timerIntervalRef.current);
            return;
        }

        // If time runs out, clear interval and auto-submit (if not already submitting/submitted)
        if (timeLeft <= 0) {
            clearInterval(timerIntervalRef.current);
            if (quizSession && !submitLoading && !submitSuccess) {
                handleSubmitQuiz(true); // Auto-submit when time is 0
            }
            return;
        }

        // Set up the countdown interval
        timerIntervalRef.current = setInterval(() => {
            setTimeLeft(prevTime => {
                if (prevTime <= 1) { // Check for <= 1 to ensure it hits 0 before clearing
                    clearInterval(timerIntervalRef.current);
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);

        // Cleanup on component unmount or if timeLeft/quizSession dependencies change
        return () => clearInterval(timerIntervalRef.current);
    }, [timeLeft, quizSession, submitLoading, submitSuccess, handleSubmitQuiz]); // Added handleSubmitQuiz as a dependency

    // --- EFFECT: Handle Quiz Submission Success/Error ---
    useEffect(() => {
        if (submitSuccess && submitResultData) {
            toast.success("Quiz submitted successfully!");
            // Redirect to a results page or dashboard
            // Ensure quizSession exists before navigating, as its ID is used
            if (quizSession?._id) {
                navigate(`/quizzes/result/${quizSession._id}`);
            } else {
                navigate('/dashboard'); // Fallback if session ID is missing
            }
        }
        if (submitMutationError) {
            toast.error(submitErrorData?.data?.message || "Failed to submit quiz.");
        }
    }, [submitSuccess, submitMutationError, submitErrorData, navigate, quizSession]); // Added quizSession as dependency

    const handleSubmitQuiz = useCallback(async (isAutoSubmit = false) => {
        console.log(`QuizTakingPage: handleSubmitQuiz called (isAutoSubmit: ${isAutoSubmit})`, { quizId, quizSession, timeLeft });

        if (!quizId) {
            toast.error("Cannot submit quiz: Quiz ID is missing.");
            return;
        }
        if (!quizSession || !quizSession._id) {
            toast.error("Quiz session not active. Cannot submit.");
            return;
        }
        // Only show this specific message if manually submitting when time is already zero
        if (timeLeft === 0 && !isAutoSubmit) {
            toast.error("Time is up! Your quiz was automatically submitted.");
            return;
        }

        const answersToSubmit = {};
        questions.forEach(q => {
            // Ensure every question has an entry, even if no answer was provided
            answersToSubmit[q._id] = studentAnswers[q._id] || {
                type: q.type,
                submittedAnswerText: '',
                selectedOptionIds: []
            };
        });

        // Validation for manual submission (only if not auto-submitting)
        if (!isAutoSubmit) {
            for (const q of questions) {
                const answer = answersToSubmit[q._id];
                if (!answer) { // Should ideally not happen due to the forEach above, but good safeguard
                    toast.error(`Please answer all questions. Question ${questions.indexOf(q) + 1} is unanswered.`);
                    return;
                }
                if ((q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'multi_select') && (!answer.selectedOptionIds || answer.selectedOptionIds.length === 0)) {
                    toast.error(`Please select an option for Question ${questions.indexOf(q) + 1}.`);
                    return;
                } else if (q.type === 'short_answer' && (!answer.submittedAnswerText || answer.submittedAnswerText.trim() === '')) {
                    toast.error(`Please provide an answer for Question ${questions.indexOf(q) + 1}.`);
                    return;
                }
            }
        }

        const submissionPayload = {
            quizId,
            quizSessionId: quizSession._id,
            answers: Object.keys(answersToSubmit).map(questionId => {
                const answerData = answersToSubmit[questionId];
                return {
                    questionId,
                    questionType: answerData.type,
                    submittedAnswerText: answerData.submittedAnswerText || '',
                    selectedOptionIds: answerData.selectedOptionIds || []
                };
            })
        };

        try {
            await submitQuiz(submissionPayload).unwrap();
            // Success and error handled by useEffect
        } catch (err) {
            // Error handled by useEffect
        }
    }, [quizId, quizSession, studentAnswers, questions, submitQuiz, timeLeft]);

    const handleAnswerChange = (questionId, type, newTextValue, selectedOptionId = null) => {
        setStudentAnswers(prevAnswers => {
            const currentAnswer = prevAnswers[questionId] || { type, submittedAnswerText: '', selectedOptionIds: [] };
            let updatedAnswer = {};

            switch (type) {
                case 'multiple_choice':
                case 'true_false':
                    updatedAnswer = {
                        ...currentAnswer,
                        // For single-choice, selectedOptionIds should contain only one ID
                        selectedOptionIds: [selectedOptionId].filter(Boolean),
                        submittedAnswerText: newTextValue // Store text for potential display/review
                    };
                    break;
                case 'multi_select':
                    const currentSelected = currentAnswer.selectedOptionIds || [];
                    const newSelectedOptions = selectedOptionId
                        ? (currentSelected.includes(selectedOptionId)
                            ? currentSelected.filter(id => id !== selectedOptionId)
                            : [...currentSelected, selectedOptionId])
                        : currentSelected; // If no selectedOptionId (e.g., from an onChange that doesn't provide it), keep current selections

                    updatedAnswer = {
                        ...currentAnswer,
                        selectedOptionIds: newSelectedOptions.filter(Boolean),
                    };
                    break;
                case 'short_answer':
                    updatedAnswer = {
                        ...currentAnswer,
                        submittedAnswerText: newTextValue
                    };
                    break;
                default:
                    updatedAnswer = { ...currentAnswer, submittedAnswerText: newTextValue };
            }
            return {
                ...prevAnswers,
                [questionId]: updatedAnswer
            };
        });
    };

    const formatTime = (seconds) => {
        if (seconds === null) return "--:--"; // Or some other indicator for not yet loaded
        if (seconds === Infinity) return "No Time Limit";
        if (seconds < 0 || isNaN(seconds)) return "00:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // --- Loading and Error States ---
    if (userLoading || quizIsLoading || startQuizLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                <p className="ml-4 text-xl text-gray-700 dark:text-gray-300">Loading Quiz...</p>
            </div>
        );
    }

    if (userError) {
        return (
            <div className="flex flex-col justify-center items-center h-screen text-red-600 dark:text-red-400">
                <p className="text-2xl font-bold">Authentication Error</p>
                <p className="text-lg mt-2">{authError?.data?.message || "Please log in to access this page."}</p>
                <Button onClick={() => navigate('/login')} className="mt-4">Go to Login</Button>
            </div>
        );
    }

    if (quizIsError) {
        return (
            <div className="flex flex-col justify-center items-center h-screen text-red-600 dark:text-red-400">
                <p className="text-2xl font-bold">Error Loading Quiz</p>
                <p className="text-lg mt-2">{quizError?.data?.message || "Could not retrieve quiz details. Please try again."}</p>
                <Button onClick={() => navigate('/dashboard')} className="mt-4">Go to Dashboard</Button>
            </div>
        );
    }

    // This check ensures 'quiz' object is available before trying to render its properties
    if (!quiz) {
        return (
            <div className="flex flex-col justify-center items-center h-screen text-gray-600 dark:text-gray-400">
                <p className="text-2xl font-bold">Quiz Not Found</p>
                <p className="text-lg mt-2">The quiz you are looking for does not exist or you do not have access.</p>
                <Button onClick={() => navigate('/dashboard')} className="mt-4">Go to Dashboard</Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto my-10 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <Card className="rounded-lg border-none shadow-none">
                <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white p-6 rounded-t-lg flex justify-between items-center">
                    <div>
                        <CardTitle className="text-3xl font-bold">{quiz?.title}</CardTitle>
                        <CardDescription className="text-teal-100 mt-2 text-lg">
                            {quiz?.description || 'Attempt this quiz to test your knowledge!'}
                        </CardDescription>
                    </div>
                    {quiz?.duration && quiz.duration > 0 ? (
                        <div className="text-right flex flex-col items-end">
                            <p className="text-teal-100 text-md font-semibold">Time Left:</p>
                            <p className="text-4xl font-extrabold text-white">
                                {formatTime(timeLeft)}
                            </p>
                        </div>
                    ) : (
                        <p className="text-teal-100 text-md font-semibold">Untimed Quiz</p>
                    )}
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                    {questions.length === 0 && (
                        <p className="text-center text-gray-600 dark:text-gray-400 text-xl">No questions available for this quiz.</p>
                    )}
                    {questions.map((question, qIndex) => (
                        <Card key={question._id} className="p-5 border-2 border-gray-200 dark:border-gray-700 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700">
                            <CardTitle className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                                Question {qIndex + 1}: {question.text}
                                <span className="float-right text-base text-gray-600 dark:text-gray-300">{question.points} Points</span>
                            </CardTitle>
                            <div className="mt-4">
                                {(question.type === 'multiple_choice' || question.type === 'true_false') ? (
                                    <RadioGroup
                                        onValueChange={(selectedOptionId) => {
                                            const selectedOption = question.options.find(opt => opt._id === selectedOptionId);
                                            handleAnswerChange(question._id, question.type, selectedOption?.text || '', selectedOptionId);
                                        }}
                                        value={studentAnswers[question._id]?.selectedOptionIds[0] || ''}
                                        className="space-y-3"
                                    >
                                        {question.options.map((option) => (
                                            <div key={option._id} className="flex items-center space-x-3 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150">
                                                <RadioGroupItem
                                                    value={option._id}
                                                    id={`option-${question._id}-${option._id}`}
                                                    className="w-5 h-5 text-blue-500 dark:text-blue-400"
                                                    disabled={timeLeft === 0}
                                                />
                                                <Label htmlFor={`option-${question._id}-${option._id}`} className="text-lg font-normal text-gray-800 dark:text-gray-200 flex-grow cursor-pointer">
                                                    {option.text}
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                ) : question.type === 'multi_select' ? (
                                    <div className="space-y-3">
                                        {question.options.map((option) => (
                                            <div key={option._id} className="flex items-center space-x-3 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150">
                                                <Checkbox
                                                    id={`checkbox-option-${question._id}-${option._id}`}
                                                    checked={studentAnswers[question._id]?.selectedOptionIds?.includes(option._id) || false}
                                                    onCheckedChange={() => handleAnswerChange(question._id, question.type, '', option._id)}
                                                    disabled={timeLeft === 0}
                                                />
                                                <Label htmlFor={`checkbox-option-${question._id}-${option._id}`} className="text-lg font-normal text-gray-800 dark:text-gray-200 flex-grow cursor-pointer">
                                                    {option.text}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                ) : question.type === 'short_answer' ? (
                                    <Textarea
                                        placeholder="Type your answer here..."
                                        value={studentAnswers[question._id]?.submittedAnswerText || ''}
                                        onChange={(e) => handleAnswerChange(question._id, question.type, e.target.value)}
                                        className="min-h-[80px] border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                        disabled={timeLeft === 0}
                                    />
                                ) : (
                                    <p className="text-red-500">Unsupported question type: {question.type}</p>
                                )}
                            </div>
                        </Card>
                    ))}
                </CardContent>
                <CardFooter className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
                    <Button
                        onClick={() => handleSubmitQuiz(false)}
                        disabled={submitLoading || timeLeft === 0 || !quizSession} // Disable if no quizSession is active
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200 ease-in-out flex items-center gap-2"
                    >
                        {submitLoading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" /> Submitting Quiz...
                            </>
                        ) : (
                            "Submit Quiz"
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default QuizTakingPage;
