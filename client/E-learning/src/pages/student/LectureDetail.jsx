// client/src/pages/LectureDetail.jsx
import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Assuming your quizApi is set up as 'quizApi'
import {
  useGetQuizByLectureQuery,
  useGetUserQuizAttemptsQuery // To check if student already attempted
} from '@/features/api/quizApi';

// Assuming you have a way to get the logged-in user's role (e.g., from authSlice)
// import { useSelector } from 'react-redux';
// import { selectCurrentUser } from '@/features/authSlice'; // Adjust path

const LectureDetail = () => {
  const { lectureId } = useParams(); // Get lectureId from URL
  // const user = useSelector(selectCurrentUser); // Get logged-in user (if available)
  // const userRole = user?.role; // 'student', 'instructor', 'admin'

  // Fetch quiz for this lecture
  const {
    data: quizData,
    isLoading: quizIsLoading,
    isError: quizIsError,
    error: quizError,
  } = useGetQuizByLectureQuery(lectureId);

  // Fetch user's attempts for this quiz (if quizData exists)
  const {
    data: userAttemptsData,
    isLoading: attemptsIsLoading,
    isError: attemptsIsError,
    error: attemptsError,
  } = useGetUserQuizAttemptsQuery(undefined, {
      skip: !quizData?.quiz?._id // Only fetch if quizId is available
  });

  const quiz = quizData?.quiz;
  const questions = quizData?.questions; // The quiz questions (without correct answers)

  const userAttempts = userAttemptsData?.attempts;
  const hasAttempted = userAttempts?.some(attempt => attempt.quiz._id === quiz?._id);
  const latestAttemptId = hasAttempted ? userAttempts.find(attempt => attempt.quiz._id === quiz?._id)?._id : null;


  useEffect(() => {
    if (quizIsError) {
      toast.error(quizError.data?.message || "Failed to load quiz details.");
    }
    if (attemptsIsError) {
      toast.error(attemptsError.data?.message || "Failed to load quiz attempts.");
    }
  }, [quizIsError, quizError, attemptsIsError, attemptsError]);

  if (quizIsLoading || attemptsIsLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" /> Loading Quiz...
      </div>
    );
  }

  // Placeholder for lecture content (replace with your actual lecture display)
  const lectureContent = {
    title: "Lecture Title Placeholder",
    description: "This is a placeholder for the lecture content. You'd load this from your lecture API.",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?si=C85k_XzB0kM2rC97", // Example YouTube embed
  };

  return (
    <div className="container mx-auto p-4 mt-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{lectureContent.title}</CardTitle>
          <CardDescription>{lectureContent.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {lectureContent.videoUrl && (
            <div className="relative w-full" style={{ paddingTop: '56.25%' /* 16:9 Aspect Ratio */ }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-md"
                src={lectureContent.videoUrl}
                title="Lecture Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              ></iframe>
            </div>
          )}
          {/* Add more lecture content here */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quiz for this Lecture</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Instructor/Admin View */}
          {/* {userRole === 'instructor' || userRole === 'admin' ? ( */}
            {/* <> */}
              {!quiz ? (
                <p>No quiz found for this lecture. Create one!</p>
              ) : (
                <p>Quiz "{quiz.title}" is available.</p>
              )}
              <Link to={`/dashboard/lectures/${lectureId}/quiz/create`}>
                <Button variant="outline" className="w-full">
                  {quiz ? 'Edit Quiz' : 'Create New Quiz'}
                </Button>
              </Link>
            {/* </> */}
          {/* ) : ( */}
            {/* Student View */}
            {quiz ? (
              hasAttempted ? (
                <>
                  <p className="text-muted-foreground">You have already completed this quiz.</p>
                  <Link to={`/quiz-attempts/${latestAttemptId}`}>
                    <Button className="w-full">
                      View Latest Attempt Results
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <p>A quiz "{quiz.title}" is available for this lecture.</p>
                  <Link to={`/quizzes/${quiz._id}/take`}>
                    <Button className="w-full">
                      Take Quiz
                    </Button>
                  </Link>
                </>
              )
            ) : (
              <p>No quiz available for this lecture yet.</p>
            )}
          {/* )} */}
        </CardContent>
      </Card>
    </div>
  );
};

export default LectureDetail;