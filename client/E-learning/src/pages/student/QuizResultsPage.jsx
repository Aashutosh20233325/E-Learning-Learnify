import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, Trophy, Award, PencilRuler } from 'lucide-react'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';


import { useGetQuizAttemptDetailsQuery } from '@/features/api/quizApi';

const QuizResultsPage = () => {
    
    const { attemptId ,courseId} = useParams();
    //console.log("QuizResultsPage: Attempt ID from URL:", courseId); 
    
    const navigate = useNavigate();

    const {
        data: attemptResponse, 
        isLoading,
        isError,
        error,
    } = useGetQuizAttemptDetailsQuery(attemptId);

    useEffect(() => {
        if (isError) {
            console.error("QuizResultsPage: Error fetching quiz results:", error); 
  
            if (error.status === 404) {
                toast.error("Quiz attempt not found.");
            } else {
                toast.error(error?.data?.message || "Failed to load quiz results due to a server error.");
            }
            
        }
    }, [isError, error, navigate]); 

  
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="ml-2 text-lg text-gray-700">Loading quiz results...</p>
            </div>
        );
    }

    if (!attemptResponse || !attemptResponse.attempt) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-xl text-red-600">Quiz results not found. Please ensure the attempt ID is valid.</p>
            </div>
        );
    }

   
    const { score, totalPoints, passed, quizId: quizDetails, answers } = attemptResponse.attempt;
   
    const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;

    return (
        <div className="max-w-4xl mx-auto my-10 p-4">
            <Card className="rounded-lg shadow-xl border-t-8" style={{ borderColor: passed ? '#10B981' : '#EF4444' }}>
                <CardHeader className="p-6">
                    <CardTitle className="text-3xl font-bold text-center mb-2">
                        Quiz Results: {quizDetails?.title || 'Unknown Quiz'}
                    </CardTitle>
                    <CardDescription className="text-center text-lg text-gray-600">
                        Overview of your recent quiz attempt.
                    </CardDescription>
                    <Separator className="my-4 bg-gray-300" /> 
                    <div className="flex flex-col sm:flex-row justify-around items-center gap-4 text-center">
                        
                        <div className="flex flex-col items-center">
                            {passed ? (
                                <Trophy className="h-10 w-10 text-green-500 mb-2" />
                            ) : (
                                <XCircle className="h-10 w-10 text-red-500 mb-2" />
                            )}
                            <p className="text-xl font-semibold">
                                Status: <span className={passed ? "text-green-600" : "text-red-600"}>
                                    {passed ? "PASSED" : "FAILED"}
                                </span>
                            </p>
                        </div>
                        <div className="flex flex-col items-center">
                            <Award className="h-10 w-10 text-yellow-500 mb-2" />
                            <p className="text-xl font-semibold">
                                Your Score: <span className="text-blue-600">{score} / {totalPoints}</span>
                            </p>
                            <p className="text-lg text-gray-700">
                                ({percentage.toFixed(2)}%)
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-6 pt-0 space-y-8">
                    
                    {answers.length === 0 ? (
                        <p className="text-center text-gray-500 italic">No answers recorded for this attempt.</p>
                    ) : (
                       
                        answers.map((answer, index) => (
                            <div key={answer.questionId || index} className="border border-gray-200 rounded-lg p-4 shadow-sm bg-gray-50">
                                <p className="text-lg font-semibold mb-2">
                                    Question {index + 1}: {answer.questionText}
                                    
                                    <Badge
                                        className={`ml-3 px-2 py-1 rounded-full text-xs font-semibold ${answer.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                    >
                                        {answer.isCorrect ? 'Correct' : 'Incorrect'}
                                    </Badge>
                                    
                                    <span className="ml-2 text-sm text-gray-500">({answer.pointsAwarded} / {answer.questionPoints} points)</span>
                                </p>
                              
                                <p className="text-sm text-gray-500 mb-3">Type: {answer.questionType.replace('_', ' ')}</p>

                                {(answer.questionType === 'multiple_choice' || answer.questionType === 'true_false') ? (
                                    <div className="space-y-1">
                                        <p className="font-medium text-gray-700">Your Answer:</p>
                                        
                                        {answer.submittedOptions && answer.submittedOptions.length > 0 ? (
                                            <ul className="list-disc list-inside text-gray-600 ml-4">
                                                {answer.submittedOptions.map((opt, i) => (
                                                    <li key={i} className="flex items-center">
                                                        <CheckCircle2 className="h-4 w-4 text-blue-500 mr-2" /> {opt.text}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-red-500 italic ml-4">No option selected.</p>
                                        )}

                                        <p className="font-medium text-gray-700 mt-2">Correct Answer:</p>
                                       
                                        <ul className="list-disc list-inside text-gray-600 ml-4">
                                            {answer.correctOptions.map((opt, i) => (
                                                <li key={i} className="flex items-center">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" /> {opt.text}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : ( 
                                    <div className="space-y-1">
                                        <p className="font-medium text-gray-700">Your Answer:</p>
                                        <p className="bg-gray-100 p-2 rounded-md text-gray-600 italic">
                                            {answer.submittedAnswerText || 'No text submitted.'}
                                        </p>
                                        <p className="font-medium text-gray-700 mt-2">Correct Answer:</p>
                                        <p className="bg-green-50 p-2 rounded-md text-green-700">
                                            {answer.correctAnswerText || 'N/A'}
                                        </p>
                                    </div>
                                )}
                                
                                {index < answers.length - 1 && <Separator className="my-4 bg-gray-200" />}
                            </div>
                        ))
                    )}
                </CardContent>

      
                <div className="p-6 border-t border-gray-200 flex justify-end">
                    <Button onClick={() => navigate('/my-learning')} className="bg-gray-600 hover:bg-gray-700 text-white rounded-md">
                        Back to My Learning
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default QuizResultsPage;
