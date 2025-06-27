import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Calendar, Award, Trophy, XCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

// Import the RTK Query hook for fetching user's quiz attempts
import { useGetUserQuizAttemptsQuery } from '@/features/api/quizApi';

const MyQuizAttemptsPage = () => {
    const navigate = useNavigate();

    // Fetch all quiz attempts for the logged-in user
    const {
        data: attemptsResponse,
        isLoading,
        isError,
        error,
        refetch // Allows manually refetching the data if needed (e.g., after a new submission)
    } = useGetUserQuizAttemptsQuery(); // No arguments needed, as backend gets userId from req.id

    // Effect hook to handle errors during data fetching
    useEffect(() => {
        if (isError) {
            console.error("MyQuizAttemptsPage: Error fetching quiz attempts:", error);
            toast.error(error?.data?.message || "Failed to load your quiz attempts. Please try again later.");
        }
    }, [isError, error]);

    // Render a loading spinner while data is being fetched
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="ml-2 text-lg text-gray-700 dark:text-gray-300">Loading your quiz history...</p>
            </div>
        );
    }

    const attempts = attemptsResponse?.attempts || [];

    return (
        <div className="max-w-4xl mx-auto my-10 p-4">
            <Card className="rounded-lg shadow-xl bg-white dark:bg-gray-800">
                <CardHeader className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100">
                        My Quiz Attempts
                    </CardTitle>
                    <CardDescription className="text-center text-lg text-gray-600 dark:text-gray-400 mt-2">
                        Review your past quiz performances.
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                    {attempts.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-xl text-gray-500 dark:text-gray-400">You haven't attempted any quizzes yet.</p>
                            <Button
                                onClick={() => navigate('/my-learning')} // Adjust to a relevant page where quizzes can be found
                                className="mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
                            >
                                Browse Courses
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {attempts.map((attempt) => (
                                <Card
                                    key={attempt._id}
                                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer bg-gray-50 dark:bg-gray-700"
                                    onClick={() => navigate(`/quiz/results/${attempt._id}`)} // Navigate to detailed results
                                >
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <div className="flex-grow">
                                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                                {attempt.quizId?.title || 'Unknown Quiz'}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center">
                                                <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                                                Attempted on: {new Date(attempt.submittedAt).toLocaleDateString()}
                                                {' at '}
                                                {new Date(attempt.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 flex-shrink-0">
                                            {/* Score */}
                                            <div className="flex items-center text-lg font-medium text-blue-600">
                                                <Award className="h-5 w-5 mr-1" />
                                                Score: {attempt.score} / {attempt.totalPoints}
                                            </div>
                                            {/* Pass/Fail Status */}
                                            <Badge
                                                className={`px-3 py-1 text-base font-semibold ${attempt.passed ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'}`}
                                            >
                                                {attempt.passed ? (
                                                    <Trophy className="h-4 w-4 mr-1" />
                                                ) : (
                                                    <XCircle className="h-4 w-4 mr-1" />
                                                )}
                                                {attempt.passed ? 'Passed' : 'Failed'}
                                            </Badge>
                                            <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
                <CardContent className="p-6 pt-0 flex justify-end">
                    <Button onClick={() => navigate(-1)} className="bg-gray-600 hover:bg-gray-700 text-white rounded-md">
                        Back to Previous Page
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default MyQuizAttemptsPage;
