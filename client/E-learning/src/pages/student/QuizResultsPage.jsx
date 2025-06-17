// client/src/pages/QuizResultsPage.jsx
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle } from 'lucide-react'; // Icons for correct/incorrect
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { useGetQuizAttemptDetailsQuery } from '@/features/api/quizApi';

const QuizResultsPage = () => {
  const { attemptId } = useParams(); // Get attemptId from URL
  const navigate = useNavigate();

  // Fetch quiz attempt details
  const {
    data: resultsData,
    isLoading: resultsIsLoading,
    isError: resultsIsError,
    error: resultsError,
  } = useGetQuizAttemptDetailsQuery(attemptId);

  const attempt = resultsData?.attempt;
  const userAnswers = resultsData?.userAnswers;

  useEffect(() => {
    if (resultsIsError) {
      toast.error(resultsError.data?.message || "Failed to load quiz results.");
      navigate(-1); // Go back if attempt not found or error
    }
  }, [resultsIsError, resultsError, navigate]);

  if (resultsIsLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" /> Loading Results...
      </div>
    );
  }

  if (!attempt) {
    return <div className="text-center mt-20">Quiz attempt not found or unauthorized.</div>;
  }

  return (
    <div className="container mx-auto p-4 mt-8">
      <Card>
        <CardHeader>
          <CardTitle>Quiz Results: {attempt.quiz?.title}</CardTitle>
          <CardDescription>
            Attempted by: {attempt.user?.name} ({attempt.user?.email}) on{" "}
            {new Date(attempt.completedAt).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between items-center text-xl font-bold">
            <span>Your Score: {attempt.score} / {attempt.totalPoints}</span>
            <span className={attempt.passed ? "text-green-500" : "text-red-500"}>
              {attempt.passed ? "PASSED" : "FAILED"}
            </span>
          </div>

          <h3 className="text-lg font-semibold border-b pb-2 mb-4">Detailed Answers</h3>
          {userAnswers?.length > 0 ? (
            userAnswers.map((userAnswer, uaIndex) => (
              <Card key={userAnswer._id} className="p-4 relative">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">
                        {uaIndex + 1}. {userAnswer.question?.text} ({userAnswer.question?.points} points)
                    </h4>
                    {userAnswer.isCorrect ? (
                        <CheckCircle className="text-green-500 h-6 w-6" />
                    ) : (
                        <XCircle className="text-red-500 h-6 w-6" />
                    )}
                </div>
                
                {userAnswer.question?.type === 'multiple_choice' || userAnswer.question?.type === 'true_false' ? (
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Your Answer:</p>
                        <ul className="list-disc list-inside ml-4">
                            {userAnswer.question.options.map(option => (
                                <li 
                                    key={option._id} 
                                    className={`
                                        ${option._id === userAnswer.selectedOption?._id ? (option.isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium') : ''}
                                        ${option.isCorrect && option._id !== userAnswer.selectedOption?._id ? 'text-green-600 font-medium' : ''}
                                        ${option._id !== userAnswer.selectedOption?._id && !option.isCorrect ? 'text-muted-foreground' : ''}
                                    `}
                                >
                                    {option.text}
                                    {option._id === userAnswer.selectedOption?._id && (
                                        <span className="ml-2"> (Your choice)</span>
                                    )}
                                    {option.isCorrect && (option._id !== userAnswer.selectedOption?._id) && (
                                        <span className="ml-2"> (Correct)</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                        {!userAnswer.isCorrect && (
                            <p className="text-red-600 text-sm mt-2">
                                Correct Answer: {userAnswer.question.options.find(opt => opt.isCorrect)?.text}
                            </p>
                        )}
                    </div>
                ) : userAnswer.question?.type === 'short_answer' ? (
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Your Response:</p>
                        <p className="border p-2 rounded-md bg-gray-50">{userAnswer.responseText || "No response"}</p>
                        {!userAnswer.isCorrect && (
                            <p className="text-red-600 text-sm mt-2">
                                Correct Answer: {userAnswer.question?.correctAnswerText || "Not provided"}
                            </p>
                        )}
                    </div>
                ) : (
                    <p>Unsupported question type for review.</p>
                )}
              </Card>
            ))
          ) : (
            <p>No answers found for this attempt.</p>
          )}
        </CardContent>
        <CardFooter>
            <Button onClick={() => navigate(-1)} className="w-full">
                Back to Lectures
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default QuizResultsPage;