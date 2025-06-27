import "./App.css";
import MainLayout from "./layout/MainLayout";

import { RouterProvider, createBrowserRouter } from "react-router-dom";

import HeroSection from "./pages/student/HeroSection.jsx";
import AddCourse from "./pages/admin/course/AddCourse";

import Login from "./pages/Login.jsx";
import Courses from "./pages/student/Courses";
import MyLearning from "./pages/student/MyLearning";

import Profile from "./pages/student/Profile";
import Sidebar from "./pages/admin/lecture/Sidebar";
import Dashboard from "./pages/admin/Dashboard";
import CourseTable from "./pages/admin/course/CourseTable";
import EditCourse from "./pages/admin/course/EditCourse";
import CreateLecture from "./pages/admin/lecture/CreateLecture";
import EditLecture from "./pages/admin/lecture/EditLecture";
import CourseDetail from "./pages/student/CourseDetail";
import CourseProgress from "./pages/student/CourseProgress";
import SearchPage from "./pages/student/SearchPage";
import {
  AdminRoute,
  AuthenticatedUser,
  ProtectedRoute,
  ProtectedVerifyRoute,
} from "./components/ProtectedRoutes";
import PurchaseCourseProtectedRoute from "./components/PurchaseCourseProtectedRoute";
import { ThemeProvider } from "./components/ThemeProvider";
import EmailVerification from "./pages/EmailVerification.jsx";
import ResetPasswordRequest from "./pages/ResetPasswordRequest";
import QuizTakingPage from "./pages/student/QuizTakingPage";
import QuizResultsPage from "./pages/student/QuizResultsPage";
import QuizCreationForm from "./pages/admin/lecture/QuizCreationForm";
import EditQuizPage from "./pages/admin/lecture/EditQuizPage";
import MyQuizAttemptsPage from "./pages/student/MyQuizAttemptsPage";

const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: (
          <>
            <HeroSection />
            <Courses />
            {/*Course*/}
          </>
        ),
      },
      // NEW ROUTE FOR STUDENT QUIZ TAKING PAGE
      {
          path: "quiz/:quizId", // This route expects a quizId parameter
          element: (
              <ProtectedRoute> {/* Ensure only authenticated users can take quizzes */}
                  <QuizTakingPage />
              </ProtectedRoute>
          ),
      },
      // NEW ROUTE FOR QUIZ RESULTS PAGE
      {
          path:"/quiz/results/:attemptId",
          element: (
              <ProtectedRoute> {/* Ensure only authenticated users can view their results */}
                  <QuizResultsPage />
              </ProtectedRoute>
          ),
      },       
      {
        path:"/my-learning/quizzes",
          element :(
            <ProtectedRoute>
                <MyQuizAttemptsPage />
            </ProtectedRoute>
          )
      },
      {
        path: "/reset-password",
        element: (
          <ResetPasswordRequest />
        )
      },
      {
        path: "login",
        element: (
          <AuthenticatedUser>
            <Login />
          </AuthenticatedUser>
        ),
      },
      {
        path: "/verify-email",
        element: (
          //<ProtectedVerifyRoute>
            <EmailVerification />
          //</ProtectedVerifyRoute>
        )
      },
      
      {
        path: "my-learning",
        element: (
          <ProtectedRoute>
            <MyLearning />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "course-detail/:courseId",
        element:(
          <ProtectedRoute>
            <CourseDetail />
          </ProtectedRoute>
        )
      },
      {
        path: "course-progress/:courseId",
        element: <CourseProgress />,
      },
      {
        path: "course/search",
        element: (
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "course-detail/:courseId",
        element: (
          <ProtectedRoute>
            <CourseDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "course-progress/:courseId",
        element: (
          <ProtectedRoute>
            <PurchaseCourseProtectedRoute>
              <CourseProgress />
            </PurchaseCourseProtectedRoute>
          </ProtectedRoute>
        ),
      },
      {
        path: "admin",
        element: (
          <AdminRoute>
            <Sidebar />
          </AdminRoute>
        ),
        children: [
          {
              path: "dashboard",
              element: <Dashboard />,
          },
          {
              path: "course", // All paths under admin/course are now singular "course"
              element: <CourseTable />,
          },
          {
              path: "course/create",
              element: <AddCourse />,
          },
          {
              path: "course/:courseId",
              element: <EditCourse />,
          },
          {
              path: "course/:courseId/lecture", // All paths under admin/course/:courseId/lecture are now singular "lecture"
              element: <CreateLecture />,
          },
          {
              path: "course/:courseId/lecture/:lectureId",
              element: <EditLecture />,
          },
          {
              path: "course/:courseId/lecture/:lectureId/quiz/create", // Singular "course" and "lecture"
              element: <QuizCreationForm />,
          },
          {
              path: "course/:courseId/lecture/:lectureId/quiz/:quizId/edit", // Singular "course", "lecture", and parameter name is explicitly :quizId
              element: <EditQuizPage />,
          },
      ],
      },
    ],
  },
]);

function App() {
  return (
    <main>
      <ThemeProvider>
      <RouterProvider router={appRouter}></RouterProvider>
      </ThemeProvider>
    </main>
  );
}

export default App;
