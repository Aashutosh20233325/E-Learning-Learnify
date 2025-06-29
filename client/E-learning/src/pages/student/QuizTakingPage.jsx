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

    // console.log("QuizTakingPage: Component Rendered", { quizId, locationState: location.state });

    const { data: userData, isLoading: userLoading, isError: userError } = useLoadUserQuery();
    const userId = userData?.user?._id;
    // console.log("QuizTakingPage: User data status", { userData, userId, userLoading, userError });

    const [studentAnswers, setStudentAnswers] = useState({});
    const [quizSession, setQuizSession] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null); // Null means uninitialized, Infinity for untimed, number for timed
    const timerIntervalRef = useRef(null);

    // This ref helps ensure session initiation only happens once per component lifecycle
    const hasInitiatedSessionRef = useRef(false);

    const {
        data: quizData,
        isLoading: quizIsLoading,
        isError: quizIsError,
        error: quizError,
    } = useGetQuizDetailsForStudentQuery(quizId, { skip: !quizId });

    const [startQuiz, { isLoading: startQuizLoading, isError: startQuizError, error: startQuizErrorData }] = useStartQuizAttemptMutation();
    const [submitQuiz, { isLoading: submitLoading, isSuccess: submitSuccess, isError: submitMutationError, error: submitErrorData, data: submitResultData }] = useSubmitQuizAttemptMutation();

    const quiz = quizData?.quiz;
    const questions = quizData?.questions || [];

    // console.log("QuizTakingPage: Query Data Status", {
    //     quizIsLoading, quizIsError, quiz, questionsLength: questions.length,
    //     quizSession: !!quizSession, timeLeft
    // });

    // Handles quiz submission, including auto-submission when time runs out
    const handleSubmitQuiz = useCallback(async (isAutoSubmit = false) => {
        // console.log(`QuizTakingPage: handleSubmitQuiz called (isAutoSubmit: ${isAutoSubmit})`, { quizId, quizSession, timeLeft });

        if (!quizId) {
            toast.error("Cannot submit quiz: Quiz ID is missing.");
            return;
        }
        if (!quizSession || !quizSession._id) {
            // This case might happen if session hasn't been set up yet, or cleared due to timeout.
            // If it's an auto-submit, it implies session existed but timed out.
            // If it's a manual submit and no session, something is wrong.
            if (!isAutoSubmit) {
                toast.error("Quiz session not active. Cannot submit.");
            }
            return;
        }

        // Prevent submission if time is explicitly 0 and it's not an auto-submit
        if (timeLeft === 0 && !isAutoSubmit) {
            toast.error("Time is up! Your quiz was automatically submitted.");
            return;
        }

        const answersToSubmit = {};
        questions.forEach(q => {
            // Ensure every question has an entry, even if no answer was provided
            if (studentAnswers[q._id]) {
                answersToSubmit[q._id] = studentAnswers[q._id];
            } else {
                answersToSubmit[q._id] = {
                    type: q.type,
                    submittedAnswerText: '',
                    selectedOptionIds: []
                };
            }
        });

        // Manual submission validation (skip for auto-submit to allow partial submission on timeout)
        if (!isAutoSubmit) {
            for (const q of questions) {
                const answer = answersToSubmit[q._id];

                // If no answer object exists for a question
                if (!answer) {
                    toast.error(`Please answer all questions. Question ${questions.indexOf(q) + 1} is unanswered.`);
                    return;
                }

                // Validate based on question type
                if ((q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'multi_select')) {
                    if (!answer.selectedOptionIds || answer.selectedOptionIds.length === 0) {
                        toast.error(`Please select an option for Question ${questions.indexOf(q) + 1}.`);
                        return;
                    }
                } else if (q.type === 'short_answer') {
                    if (!answer.submittedAnswerText || answer.submittedAnswerText.trim() === '') {
                        toast.error(`Please provide an answer for Question ${questions.indexOf(q) + 1}.`);
                        return;
                    }
                }
            }
        }

        // console.log("QuizTakingPage: Current studentAnswers state before submission:", JSON.stringify(answersToSubmit, null, 2));

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

        // console.log("QuizTakingPage: Submitting answers payload to backend:", JSON.stringify(submissionPayload, null, 2));
        try {
            await submitQuiz(submissionPayload).unwrap();
            // On successful submission, clear local storage session as it's no longer needed
            localStorage.removeItem(`quizSession_${quizId}_${userId}`);
        } catch (err) {
            console.error("QuizTakingPage: Error during submitQuiz mutation:", err);
            toast.error(err?.data?.message || "Failed to submit quiz.");
        }
    }, [quizId, quizSession, studentAnswers, questions, submitQuiz, timeLeft, userId, submitLoading, submitSuccess]); // Added userId, submitLoading, submitSuccess to dependencies

    // This ref holds the logic for initiating or resuming a quiz session.
    // It's a ref so it doesn't cause re-renders when it changes, but the
    // useEffect calling it still reacts to its dependencies.
    const sessionLogicRef = useRef(null);

    sessionLogicRef.current = async () => {
        // console.log("QuizTakingPage: sessionLogicRef.current called.");
        const isFreshStartFromNav = location.state?.newSession;
        const storedSessionKey = `quizSession_${quizId}_${userId}`;
        let storedSession = null;

        // Important: If quiz is not defined yet, wait.
        if (!quiz) {
            console.log("QuizTakingPage: Quiz details not yet loaded for session logic.");
            return;
        }

        // Handle untimed quizzes first to bypass timer logic entirely
        if (!quiz.duration || quiz.duration <= 0) {
            // console.log("QuizTakingPage: Quiz is untimed. Setting up untimed session.");
            setQuizSession({ _id: 'untimed', startTime: new Date().toISOString(), durationMinutes: Infinity, quizId, userId });
            setTimeLeft(Infinity); // Indicate no time limit
            localStorage.removeItem(storedSessionKey); // Clear any old timed session data for this quiz
            return;
        }

        // Logic for timed quizzes
        if (!isFreshStartFromNav) {
            try {
                const stored = localStorage.getItem(storedSessionKey);
                if (stored) {
                    storedSession = JSON.parse(stored);
                    // console.log("QuizTakingPage: Found stored session in localStorage:", storedSession);

                    // Validate stored session
                    if (storedSession.quizId !== quizId || storedSession.userId !== userId || !storedSession.startTime || storedSession.durationMinutes === undefined) {
                        console.warn("QuizTakingPage: Stored session found but mismatched or incomplete. Discarding.");
                        localStorage.removeItem(storedSessionKey);
                        storedSession = null;
                    }
                } else {
                    // console.log("QuizTakingPage: No stored session found in localStorage.");
                }
            } catch (e) {
                console.error("QuizTakingPage: Failed to parse stored quiz session from localStorage, clearing data:", e);
                localStorage.removeItem(storedSessionKey);
                storedSession = null;
            }
        } else {
            localStorage.removeItem(storedSessionKey);
            // console.log(`QuizTakingPage: Fresh start detected (from navigation): Cleared local storage for quiz session: ${storedSessionKey}`);
        }

        if (storedSession) {
            const startTimestamp = new Date(storedSession.startTime).getTime();
            const durationMs = storedSession.durationMinutes * 60 * 1000;
            const elapsedMs = Date.now() - startTimestamp;
            const remainingMs = durationMs - elapsedMs;
            // console.log("QuizTakingPage: Processing stored session.", { storedSession, elapsedMs, remainingMs });

            if (remainingMs <= 0) {
                // Stored session has already timed out
                // console.log("QuizTakingPage: Local storage quiz session has already timed out. Auto-submitting (if not already).");
                setTimeLeft(0);
                if (!submitLoading && !submitSuccess) {
                    // console.log("QuizTakingPage: Triggering auto-submit due to timed out stored session.");
                    await handleSubmitQuiz(true); // Auto-submit
                }
                localStorage.removeItem(storedSessionKey); // Clear expired session
                toast.error("Your previous quiz session timed out. Please start a new one.");
                // Optionally navigate away or reset quiz state to prevent user from interacting
                // navigate('/my-learning/quizzes'); // Example: navigate back
            } else {
                // Resume active session
                // console.log("QuizTakingPage: Resuming quiz session from localStorage.");
                setQuizSession(storedSession);
                setTimeLeft(Math.ceil(remainingMs / 1000));
                toast.info("Quiz session resumed from previous attempt.");
            }
        } else {
            // No valid stored session or fresh start, initiate a new one
            // console.log("QuizTakingPage: No valid stored session found or fresh start initiated. Attempting to start a new quiz session via backend.");
            try {
                const result = await startQuiz(quizId).unwrap();
                const newSession = result.quizSession;
                // console.log("QuizTakingPage: Backend responded with new session:", newSession);

                // Store the new session
                localStorage.setItem(storedSessionKey, JSON.stringify(newSession));
                setQuizSession(newSession);

                // Calculate and set timeLeft for the new session
                if (newSession.durationMinutes && newSession.durationMinutes > 0) {
                    const durationMs = newSession.durationMinutes * 60 * 1000;
                    const startTimestamp = new Date(newSession.startTime).getTime();
                    const elapsedMs = Date.now() - startTimestamp;
                    let remainingMs = durationMs - elapsedMs;

                    // Ensure remaining time is not negative
                    if (remainingMs < 0) remainingMs = 0;

                    // console.log("QuizTakingPage: Calculating timeLeft for new session from backend.", { durationMs, startTimestamp, elapsedMs, remainingMs });
                    setTimeLeft(Math.ceil(remainingMs / 1000));

                    if (remainingMs <= 0) {
                        toast.error("New quiz session already timed out. Auto-submitting.");
                        if (!submitLoading && !submitSuccess) {
                            // console.log("QuizTakingPage: Triggering auto-submit due to new session already timed out.");
                            await handleSubmitQuiz(true);
                        }
                    }
                } else {
                    setTimeLeft(Infinity); // Untimed, but this path should ideally be caught by the earlier untimed check
                }
                toast.success("New quiz session started!");
            } catch (err) {
                console.error("QuizTakingPage: Failed to start new quiz session from backend:", err);
                toast.error(err?.data?.message || "Failed to start quiz. Please try again.");
                // Potentially navigate away if quiz cannot be started
                navigate(-1);
            }
        }
    };

    // Main useEffect for managing session initiation
    useEffect(() => {
        // console.log("QuizTakingPage: Main useEffect dependencies changed.", {
        //     quizId, userId, userLoading, quizIsLoading, quizData: !!quizData, quizDataQuiz: !!quizData?.quiz, hasInitiatedSessionRef: hasInitiatedSessionRef.current
        // });

        // Wait until all necessary data is loaded and a session hasn't been initiated yet
        if (!quizId || !userId || userLoading || quizIsLoading || !quizData || !quizData.quiz) {
            // if (!hasInitiatedSessionRef.current) {
            //     console.log("QuizTakingPage: Main Effect waiting for data or already initiated.");
            // }
            return;
        }

        // Only run session logic once per component mount (or if quizId/userId/fresh start changes)
        // This ensures `sessionLogicRef.current()` isn't called multiple times for the same session.
        if (!hasInitiatedSessionRef.current) {
            hasInitiatedSessionRef.current = true; // Mark as initiated
            // console.log("QuizTakingPage: All initial data available. Calling sessionLogicRef.current()");
            sessionLogicRef.current(); // Execute the session logic defined in the ref
        }

        // Cleanup function for this useEffect
        return () => {
            // console.log("QuizTakingPage: Main useEffect cleanup.");
            // Clear timer interval on component unmount to prevent memory leaks
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            // Do NOT reset hasInitiatedSessionRef.current here. It should persist for the component's lifespan.
            // If the component unmounts and remounts, a new session might be needed.
            // However, this ref is for *this instance* of the component.
            // If you want a truly fresh start on navigation back to the page,
            // ensure location.state?.newSession is properly set.
        };
    }, [quizId, userId, userLoading, quizIsLoading, quizData, location.state?.newSession]);

    // Effect for the countdown timer itself (isolated from session initiation)
    useEffect(() => {
        // console.log("QuizTakingPage: Timer useEffect dependencies changed.", { timeLeft, quizSession: !!quizSession, timerIntervalRefCurrent: timerIntervalRef.current });

        // If no time limit, or time is uninitialized/negative, ensure no timer runs.
        if (timeLeft === null || timeLeft === Infinity || !quizSession) {
            // console.log("QuizTakingPage: Timer useEffect: Skipping timer setup (timeLeft null/Infinity or no session).");
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            return;
        }

        // Clear any existing interval to prevent multiple timers running
        if (timerIntervalRef.current) {
            // console.log("QuizTakingPage: Timer useEffect: Clearing existing interval.");
            clearInterval(timerIntervalRef.current);
        }

        if (timeLeft > 0) {
            // console.log(`QuizTakingPage: Timer useEffect: Starting timer with ${timeLeft} seconds.`);
            const interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev === null || prev === Infinity) { // Defensive check
                        clearInterval(timerIntervalRef.current);
                        timerIntervalRef.current = null;
                        return prev;
                    }
                    if (prev <= 1) {
                        // Time is up or less than 1 second remaining
                        // console.log("QuizTakingPage: Timer countdown reached 0 or less. Clearing interval and auto-submitting.");
                        clearInterval(timerIntervalRef.current);
                        timerIntervalRef.current = null; // Ensure ref is cleared
                        toast.error("Time's up! Submitting your quiz...");
                        handleSubmitQuiz(true); // Trigger auto-submission
                        return 0; // Set timeLeft to 0
                    }
                    // console.log(`QuizTakingPage: Timer: ${prev - 1} seconds left.`);
                    return prev - 1; // Decrement time
                });
            }, 1000); // Update every second
            timerIntervalRef.current = interval; // Store the interval ID
        } else if (timeLeft === 0) {
            // Time is exactly 0, ensure no timer is running and trigger submit if needed
            // console.log("QuizTakingPage: Timer useEffect: timeLeft is 0. Ensuring interval is cleared.");
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            // If the quiz hasn't been submitted yet, trigger it.
            // This case handles situations where timeLeft might become 0 from initial load.
            if (!submitLoading && !submitSuccess && quizSession && quizSession._id !== 'untimed') {
                 // console.log("QuizTakingPage: Triggering auto-submit due to timeLeft being 0.");
                 handleSubmitQuiz(true);
            }
        }

        // Cleanup function for the timer effect
        return () => {
            // console.log("QuizTakingPage: Timer useEffect cleanup.");
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [timeLeft, handleSubmitQuiz, quizSession, submitLoading, submitSuccess]); // Added submitLoading, submitSuccess for auto-submit checks

    // Effect for initial error handling and navigation
    useEffect(() => {
        // console.log("QuizTakingPage: URL parameter and initial error handling useEffect.");
        if (!quizId) {
            toast.error("No Quiz ID provided in the URL.");
            navigate(-1);
            return;
        }

        if (quizIsError) {
            console.error("QuizTakingPage: Error fetching quiz for student:", quizError);
            toast.error(quizError?.data?.message || "Failed to load quiz. Please try again later.");
            setTimeout(() => navigate(-1), 2000);
        } else if (userError) {
            console.error("QuizTakingPage: Error loading user data:", userError);
            toast.error(userError?.data?.message || "Failed to load user data. Please log in.");
            setTimeout(() => navigate('/login'), 2000); // Redirect to login if user data fails
        } else if (startQuizError) {
            console.error("QuizTakingPage: Error starting quiz session:", startQuizErrorData);
            toast.error(startQuizErrorData?.data?.message || "Failed to start quiz session. It might have already ended or is not available.");
            setTimeout(() => navigate(-1), 2000); // Go back if session can't start
        }
    }, [quizId, quizIsError, quizError, userError, startQuizError, startQuizErrorData, navigate]);

    // Effect for handling quiz submission success/error and navigation post-submission
    useEffect(() => {
        // console.log("QuizTakingPage: Submit success/error useEffect.", { submitSuccess, submitMutationError });
        if (submitSuccess && submitResultData) {
            toast.success(submitResultData.message || "Quiz submitted successfully!");

            // Local storage session cleared within handleSubmitQuiz now for better atomicity with submission
            // localStorage.removeItem(`quizSession_${quizId}_${userId}`);
            // console.log(`QuizTakingPage: Cleared quiz session from localStorage: quizSession_${quizId}_${userId}`);

            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
                // console.log("QuizTakingPage: Cleared timer interval after submission.");
            }

            if (submitResultData.attemptId) {
                // console.log("QuizTakingPage: Navigating to quiz results page with attemptId:", submitResultData.attemptId);
                navigate(`/quiz/results/${submitResultData.attemptId}`);
            } else {
                toast.info("Quiz submitted. Results might be available on your quiz attempts page.");
                navigate('/my-learning/quizzes');
            }
        }
        if (submitMutationError && submitErrorData) {
            console.error("QuizTakingPage: Error submitting quiz:", submitErrorData);
            toast.error(submitErrorData.data?.message || "Failed to submit quiz.");
        }
    }, [submitSuccess, submitResultData, submitMutationError, submitErrorData, navigate, quizId, userId]);


    const handleAnswerChange = (questionId, type, newTextValue, selectedOptionId = null) => {
        // console.log(`QuizTakingPage: handleAnswerChange for QID: ${questionId}, Type: ${type}, NewText: ${newTextValue}, SelectedOptionId: ${selectedOptionId}`);
        setStudentAnswers(prevAnswers => {
            const currentAnswer = prevAnswers[questionId] || { type, submittedAnswerText: '', selectedOptionIds: [] };
            let updatedAnswer = {};

            switch (type) {
                case 'multiple_choice':
                case 'true_false':
                    updatedAnswer = {
                        ...currentAnswer,
                        selectedOptionIds: [selectedOptionId].filter(Boolean), // Ensure it's always an array with one ID or empty
                        submittedAnswerText: newTextValue || '' // Store the text value of the selected option
                    };
                    break;
                case 'multi_select':
                    const currentSelected = currentAnswer.selectedOptionIds || [];
                    const newSelectedOptions = selectedOptionId
                        ? (currentSelected.includes(selectedOptionId)
                            ? currentSelected.filter(id => id !== selectedOptionId)
                            : [...currentSelected, selectedOptionId])
                        : currentSelected; // Handle case where selectedOptionId might be null/undefined initially
                    updatedAnswer = {
                        ...currentAnswer,
                        selectedOptionIds: newSelectedOptions.filter(Boolean), // Filter out any null/undefined
                    };
                    // For multi-select, submittedAnswerText isn't directly from an option,
                    // so we might want to keep it empty or reconstruct it from selected options if needed.
                    // For now, let's keep it empty for multi-select unless there's a specific requirement.
                    updatedAnswer.submittedAnswerText = '';
                    break;
                case 'short_answer':
                    updatedAnswer = {
                        ...currentAnswer,
                        submittedAnswerText: newTextValue || '' // Ensure it's a string, not null/undefined
                    };
                    // Clear selectedOptionIds for short answer type
                    updatedAnswer.selectedOptionIds = [];
                    break;
                default:
                    // Fallback for unknown types, just store as text
                    updatedAnswer = { ...currentAnswer, submittedAnswerText: newTextValue || '' };
                    updatedAnswer.selectedOptionIds = [];
            }
            // console.log(`QuizTakingPage: Updating question ${questionId}:`, updatedAnswer);
            return {
                ...prevAnswers,
                [questionId]: updatedAnswer
            };
        });
    };

    // Format time for display (MM:SS)
    const formatTime = (seconds) => {
        if (seconds === Infinity) return "No Time Limit";
        if (seconds < 0 || isNaN(seconds)) return "00:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Consolidated loading states
    // console.log("QuizTakingPage: Checking loading conditions before render.", {
    //     quizIsLoading, userLoading, quizDuration: quiz?.duration, timeLeft, quizSession: !!quizSession, startQuizLoading, submitLoading
    // });

    const showLoadingSpinner = quizIsLoading || userLoading || startQuizLoading || submitLoading || (quiz?.duration > 0 && (timeLeft === null || !quizSession));

    if (showLoadingSpinner) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                <p className="ml-3 text-xl text-gray-700 dark:text-gray-300">Loading Quiz...</p>
            </div>
        );
    }

    if (quizIsError || userError || startQuizError || !quiz || questions.length === 0) {
        let errorMessage = "Failed to load quiz.";
        if (quizIsError) errorMessage = quizError?.data?.message || "Failed to load quiz.";
        else if (userError) errorMessage = "Failed to load user data. Please log in.";
        else if (startQuizError) errorMessage = startQuizErrorData?.data?.message || "Failed to start quiz session.";
        else if (!quiz || questions.length === 0) errorMessage = "Quiz not found or no questions available.";

        return (
            <div className="flex flex-col justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
                <p className="text-xl text-red-600 dark:text-red-400">
                    {errorMessage}
                </p>
                <Button onClick={() => navigate(-1)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">Go Back</Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto my-10 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <Card className="rounded-lg border-none shadow-none">
                <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white p-6 rounded-t-lg flex justify-between items-center">
                    <div>
                        <CardTitle className="text-3xl font-bold">{quiz.title}</CardTitle>
                        <CardDescription className="text-teal-100 mt-2 text-lg">
                            {quiz.description || 'Attempt this quiz to test your knowledge!'}
                        </CardDescription>
                    </div>
                    {quiz.duration && quiz.duration > 0 ? (
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
                    {questions.map((question, qIndex) => (
                        <Card key={question._id} className="p-5 border-2 border-gray-200 dark:border-gray-700 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700">
                            <CardTitle className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                                Question {qIndex + 1}: {question.text}
                                <span className="float-right text-base text-gray-600 dark:text-gray-300">{question.points} Points</span>
                            </CardTitle>
                            <div className="mt-4">
                                {question.type === 'multiple_choice' || question.type === 'true_false' ? (
                                    <RadioGroup
                                        onValueChange={(selectedOptionId) => {
                                            const selectedOption = question.options.find(opt => opt._id === selectedOptionId);
                                            handleAnswerChange(question._id, question.type, selectedOption?.text || '', selectedOptionId);
                                        }}
                                        // The 'value' prop for RadioGroup should be the ID of the currently selected option
                                        value={studentAnswers[question._id]?.selectedOptionIds?.[0] || ''}
                                        className="space-y-3"
                                    >
                                        {question.options.map((option) => (
                                            <div key={option._id} className="flex items-center space-x-3 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150">
                                                <RadioGroupItem
                                                    value={option._id}
                                                    id={`option-${question._id}-${option._id}`}
                                                    className="w-5 h-5 text-blue-500 dark:text-blue-400"
                                                    disabled={timeLeft === 0 || submitLoading} // Disable if time is up or submitting
                                                />
                                                <Label htmlFor={`option-${question._id}-${option._id}`} className="text-lg font-normal text-gray-800 dark:text-gray-200 flex-grow cursor-pointer">
                                                    {option.text}
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                ) : question.type === 'multi_select' ? (
                                    // For multi-select, use checkboxes (or a custom component mimicking checkboxes)
                                    // as RadioGroup is for single selection.
                                    // You'll need to use Checkbox components from your UI library if available,
                                    // or create a custom list of checkboxes.
                                    // For demonstration, I'll show a simple checkbox structure.
                                    <div className="space-y-3">
                                        {question.options.map((option) => (
                                            <div key={option._id} className="flex items-center space-x-3 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150">
                                                <input
                                                    type="checkbox"
                                                    id={`option-${question._id}-${option._id}`}
                                                    value={option._id}
                                                    checked={studentAnswers[question._id]?.selectedOptionIds?.includes(option._id) || false}
                                                    onChange={() => handleAnswerChange(question._id, question.type, null, option._id)}
                                                    className="w-5 h-5 text-blue-500 dark:text-blue-400 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                                                    disabled={timeLeft === 0 || submitLoading} // Disable if time is up or submitting
                                                />
                                                <Label htmlFor={`option-${question._id}-${option._id}`} className="text-lg font-normal text-gray-800 dark:text-gray-200 flex-grow cursor-pointer">
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
                                        disabled={timeLeft === 0 || submitLoading} // Disable if time is up or submitting
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
                        disabled={submitLoading || timeLeft === 0 || !quizSession} // Also disable if no quiz session is active
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
