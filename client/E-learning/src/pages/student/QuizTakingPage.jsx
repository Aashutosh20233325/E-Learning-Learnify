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

 
    const { data: userData, isLoading: userLoading, isError: userError } = useLoadUserQuery();
    const userId = userData?.user?._id;

    const [studentAnswers, setStudentAnswers] = useState({});

    const [quizSession, setQuizSession] = useState(null); 
    const [timeLeft, setTimeLeft] = useState(null); 
    const timerIntervalRef = useRef(null); 

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

    const handleSubmitQuiz = useCallback(async (isAutoSubmit = false) => {
        if (!quizId) {
            toast.error("Cannot submit quiz: Quiz ID is missing.");
            return;
        }
        if (!quizSession || !quizSession._id) {
            toast.error("Quiz session not active. Cannot submit.");
            return;
        }
        if (timeLeft === 0 && !isAutoSubmit) {
            toast.error("Time is up! Your quiz was automatically submitted.");
            return;
        }

        const answersToSubmit = {};
        questions.forEach(q => {
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
    
        setStudentAnswers(answersToSubmit);


        if (!isAutoSubmit) {
            if (questions.length > 0 && Object.keys(answersToSubmit).length !== questions.length) { 
                toast.error("Please answer all questions before submitting.");
                return;
            }
            for (const q of questions) {
                const answer = answersToSubmit[q._id]; 
                if (!answer) { 
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

        console.log("QuizTakingPage: Current studentAnswers state before submission:", JSON.stringify(answersToSubmit, null, 2));

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

        console.log("QuizTakingPage: Submitting answers payload to backend:", JSON.stringify(submissionPayload, null, 2));
        try {
            await submitQuiz(submissionPayload).unwrap();
        } catch (err) {
            console.error("QuizTakingPage: Error during submitQuiz mutation:", err);
            toast.error(err?.data?.message || "Failed to submit quiz.");
        }
    }, [quizId, quizSession, studentAnswers, questions, submitQuiz, timeLeft]); 

    const sessionLogicRef = useRef(null);

    sessionLogicRef.current = async () => {
        const isFreshStartFromNav = location.state?.newSession; 
        const storedSessionKey = `quizSession_${quizId}_${userId}`;
        let storedSession = null;


        if (quiz.duration === null || quiz.duration === undefined || quiz.duration <= 0) {
            console.log("Quiz is untimed. No timer needed.");
            setQuizSession({ _id: 'untimed', startTime: new Date().toISOString(), durationMinutes: Infinity, quizId, userId });
            setTimeLeft(Infinity); 
            
            localStorage.removeItem(storedSessionKey);
            return;
        }

        
        if (!isFreshStartFromNav) {
            try {
                const stored = localStorage.getItem(storedSessionKey);
                if (stored) {
                    storedSession = JSON.parse(stored);
                    
                    if (storedSession.quizId !== quizId || storedSession.userId !== userId || !storedSession.startTime || storedSession.durationMinutes === undefined) {
                        console.warn("Stored session found but mismatched or incomplete. Discarding.");
                        localStorage.removeItem(storedSessionKey);
                        storedSession = null;
                    }
                }
            } catch (e) {
                console.error("Failed to parse stored quiz session from localStorage, clearing data:", e);
                localStorage.removeItem(storedSessionKey); 
                storedSession = null;
            }
        } else {
       
            localStorage.removeItem(storedSessionKey);
            console.log(`Fresh start detected (from navigation): Cleared local storage for quiz session: ${storedSessionKey}`);
        }

        if (storedSession) { 
            const startTimestamp = new Date(storedSession.startTime).getTime();
            const durationMs = storedSession.durationMinutes * 60 * 1000;
            const elapsedMs = Date.now() - startTimestamp;
            const remainingMs = durationMs - elapsedMs;

            if (remainingMs <= 0) {
                console.log("Local storage quiz session has already timed out. Auto-submitting (if not already).");
                setTimeLeft(0);
               
                if (!submitLoading && !submitSuccess) {
                    await handleSubmitQuiz(true); 
                }
                localStorage.removeItem(storedSessionKey); 
                toast.error("Your previous quiz session timed out. Please start a new one.");
            } else {
                setQuizSession(storedSession);
                setTimeLeft(Math.ceil(remainingMs / 1000));
                toast.info("Quiz session resumed from previous attempt.");
            }
        } else { 
            console.log("No valid stored session found or fresh start initiated. Attempting to start a new quiz session via backend.");
            try {
                const result = await startQuiz(quizId).unwrap();
                const newSession = result.quizSession;

                localStorage.setItem(storedSessionKey, JSON.stringify(newSession));
                setQuizSession(newSession);// Initialize with full duration
                
                toast.success("New quiz session started!");
            } catch (err) {
                console.error("Failed to start new quiz session from backend:", err);
                toast.error(err?.data?.message || "Failed to start quiz. Please try again.");
            }
        }
    };

    // Main useEffect for managing session initiation
    useEffect(() => {
     
        if (hasInitiatedSessionRef.current || !quizId || !userId || quizIsLoading || userLoading || !quizData || !quizData.quiz) {
            if (!hasInitiatedSessionRef.current) {
                console.log("QuizTakingPage: Main Effect waiting for data or already initiated.", {
                    quizId, userId, userLoading, quizIsLoading, quizData: !!quizData, quizDataQuiz: !!quizData?.quiz, hasInitiatedSessionRef: hasInitiatedSessionRef.current
                });
            }
            return;
        }

        // Mark that session initiation has started for this component instance
        hasInitiatedSessionRef.current = true; // Set this flag here

        // Execute the session logic defined in the ref
        sessionLogicRef.current();

        // Cleanup function for this useEffect
        return () => {
            // Clear timer interval on component unmount
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            // Do NOT reset hasInitiatedSessionRef.current here. It should persist for the component's lifespan.
        };
    }, [quizId, userId, userLoading, quizIsLoading, quizData, location.state?.newSession]); // Dependencies for this main effect

    // Effect for the countdown timer itself (isolated)
    useEffect(() => {
        if (timeLeft === null || timeLeft === Infinity || !quizSession) {
            return;
        }

        // Clear any existing interval before setting a new one
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }

        if (timeLeft > 0) {
            const interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerIntervalRef.current);
                        timerIntervalRef.current = null; // Ensure ref is cleared
                        toast.error("Time's up! Submitting your quiz...");
                        handleSubmitQuiz(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            timerIntervalRef.current = interval;
        } else if (timeLeft === 0) {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        }

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [timeLeft, handleSubmitQuiz, quizSession]); 


    useEffect(() => {
        if (!quizId) {
            toast.error("No Quiz ID provided in the URL.");
            navigate(-1);
            return;
        }

        if (quizIsError) {
            console.error("QuizTakingPage: Error fetching quiz for student:", quizError);
            toast.error(quizError?.data?.message || "Failed to load quiz. Please try again later.");
            setTimeout(() => navigate(-1), 2000);
        }
    }, [quizId, quizIsError, quizError, navigate]);


    useEffect(() => {
        if (submitSuccess && submitResultData) {
            toast.success(submitResultData.message || "Quiz submitted successfully!");
            
            localStorage.removeItem(`quizSession_${quizId}_${userId}`);

           
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }

            if (submitResultData.attemptId) {
                console.log("QuizTakingPage: Navigating to quiz results page with attemptId:", submitResultData.attemptId);
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
        setStudentAnswers(prevAnswers => {
            const currentAnswer = prevAnswers[questionId] || { type, submittedAnswerText: '', selectedOptionIds: [] };
            let updatedAnswer = {};

            switch (type) {
                case 'multiple_choice':
                case 'true_false':
                    updatedAnswer = {
                        ...currentAnswer,
                        selectedOptionIds: [selectedOptionId].filter(Boolean), 
                        submittedAnswerText: newTextValue // Store the text value of the selected option
                    };
                    break;
                case 'multi_select':
                    const currentSelected = currentAnswer.selectedOptionIds || [];
                    const newSelectedOptions = currentSelected.includes(selectedOptionId)
                        ? currentSelected.filter(id => id !== selectedOptionId)
                        : [...currentSelected, selectedOptionId];
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
            console.log(`QuizTakingPage: Updating question ${questionId}:`, updatedAnswer);
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


    if (quizIsLoading || userLoading || (quiz?.duration > 0 && (timeLeft === null || !quizSession))) {
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
                        disabled={submitLoading || timeLeft === 0}
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
