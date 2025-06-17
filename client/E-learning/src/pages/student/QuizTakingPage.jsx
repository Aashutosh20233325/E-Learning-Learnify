// client/src/pages/QuizTakingPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { useGetQuizDetailsQuery, useSubmitQuizAttemptMutation } from '@/features/api/quizApi';

const QuizTakingPage = () => {
  const { quizId } = useParams(); // Get quizId from URL
  const navigate = useNavigate();

  // Fetch quiz details and questions
  const {
    data: quizData,
    isLoading: quizIsLoading,
    isError: quizIsError,
    error: quizError,
  } = useGetQuizDetailsQuery(quizId);

  // Mutation for submitting quiz attempt
  const [
    submitQuizAttempt,
    { data: submitData, error: submitError, isLoading: submitIsLoading, isSuccess: submitIsSuccess }
  ] = useSubmitQuizAttemptMutation();

  const quiz = quizData?.quiz;
  const questions = quizData?.questions;

  // State to store user's answers
  // Structure: { [questionId]: { selectedOptionId: '...', responseText: '...' } }
  const [userAnswers, setUserAnswers] = useState({});

  useEffect(() => {
    if (quizIsError) {
      toast.error(quizError.data?.message || "Failed to load quiz.");
      navigate(-1); // Go back if quiz not found or error
    }
    if (submitIsSuccess && submitData) {
      toast.success(submitData.message || "Quiz submitted successfully!");
      // Redirect to results page
      navigate(`/quiz-attempts/${submitData.attemptId}`);
    }
    if (submitIsError && submitError) {
      toast.error(submitError.data?.message || "Failed to submit quiz.");
    }
  }, [quizIsError, quizError, submitIsSuccess, submitData, submitIsError, submitError, navigate]);

  // Handle user's answer changes
  const handleAnswerChange = (questionId, value, type) => {
    setUserAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionId]: type === 'multiple_choice' || type === 'true_false'
        ? { selectedOptionId: value }
        : { responseText: value },
    }));
  };

  const handleSubmitQuiz = async () => {
    const formattedAnswers = Object.keys(userAnswers).map(questionId => ({
      questionId,
      ...userAnswers[questionId]
    }));
    await submitQuizAttempt({ quizId, answers: formattedAnswers });
  };

  if (quizIsLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" /> Loading Quiz...
      </div>
    );
  }

  if (!quiz) {
    return <div className="text-center mt-20">Quiz not found or not available.</div>;
  }

  return (
    <div className="container mx-auto p-4 mt-8">
      <Card>
        <CardHeader>
          <CardTitle>{quiz.title}</CardTitle>
          <CardDescription>
            {quiz.description}
            {quiz.duration && ` | Duration: ${quiz.duration} minutes`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions?.length > 0 ? (
            questions.map((question, qIndex) => (
              <Card key={question._id} className="p-4">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-lg">
                    {qIndex + 1}. {question.text} ({question.points} points)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {question.type === 'multiple_choice' || question.type === 'true_false' ? (
                    <RadioGroup
                      onValueChange={(value) => handleAnswerChange(question._id, value, question.type)}
                      value={userAnswers[question._id]?.selectedOptionId || ''}
                      className="space-y-2"
                    >
                      {question.options.map((option) => (
                        <div key={option._id} className="flex items-center space-x-2">
                          <RadioGroupItem value={option._id} id={`option-${option._id}`} />
                          <Label htmlFor={`option-${option._id}`}>{option.text}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : question.type === 'short_answer' ? (
                    <Textarea
                      value={userAnswers[question._id]?.responseText || ''}
                      onChange={(e) => handleAnswerChange(question._id, e.target.value, question.type)}
                      placeholder="Your answer here..."
                      className="mt-2"
                    />
                  ) : (
                    <p>Unsupported question type.</p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <p>No questions found for this quiz.</p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSubmitQuiz}
            disabled={submitIsLoading}
            className="w-full"
          >
            {submitIsLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
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