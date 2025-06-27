import React from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import Course from "./Course";
import { useLoadUserQuery } from "@/features/api/authApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"; // Import Card components
import { Button } from "@/components/ui/button"; // Import Button
import { History } from "lucide-react"; // Import a relevant icon

const MyLearning = () => {
  const { data, isLoading } = useLoadUserQuery();
  const navigate = useNavigate(); // Initialize navigate hook

  const myLearning = data?.user.enrolledCourses || [];

  return (
    <div className="max-w-4xl mx-auto my-10 px-4 md:px-0">
      <h1 className="font-bold text-3xl text-gray-900 dark:text-gray-100 mb-6">MY LEARNING</h1>
      
      {/* New section for Quiz Attempt History */}
      <Card className="mb-8 rounded-lg shadow-md bg-white dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Quiz Attempt History
          </CardTitle>
          <Button 
            onClick={() => navigate('/my-learning/quizzes')}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2"
          >
            <History className="h-5 w-5" /> View All Attempts
          </Button>
        </CardHeader>
        <CardContent className="p-6 text-gray-700 dark:text-gray-300">
          <p>Explore your past quiz performances, scores, and detailed answers.</p>
        </CardContent>
      </Card>

      {/* Existing section for Enrolled Courses */}
      <h2 className="font-bold text-2xl text-gray-900 dark:text-gray-100 mb-4">Enrolled Courses</h2>
      <div className="my-5">
        {isLoading ? (
          <MyLearningSkeleton />
        ) : myLearning.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xl text-gray-500 dark:text-gray-400">You are not enrolled in any course yet.</p>
            <Button
              onClick={() => navigate('/')} 
              className="mt-6 bg-green-600 hover:bg-green-700 text-white rounded-md"
            >
              Browse Courses
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"> {/* Adjusted gap and columns for better spacing */}
            {myLearning.map((course, index) => (
              <Course key={index} course={course}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyLearning;

// Skeleton component for loading state
const MyLearningSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"> {/* Adjusted gap and columns */}
    {[...Array(3)].map((_, index) => (
      <div
        key={index}
        className="bg-gray-200 dark:bg-gray-700 rounded-lg h-48 animate-pulse shadow-md" // Increased height and added shadow
      ></div>
    ))}
  </div>
);
