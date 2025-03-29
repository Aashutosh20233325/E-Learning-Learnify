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
import Dashboard from "./pages/admin/lecture/Dashboard";
import CourseTable from "./pages/admin/course/CourseTable";
import EditCourse from "./pages/admin/course/EditCourse";
import CreateLecture from "./pages/admin/lecture/CreateLecture";
import EditLecture from "./pages/admin/lecture/EditLecture";
import CourseDetail from "./pages/student/CourseDetail";
import CourseProgress from "./pages/student/CourseProgress";
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
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "my-learning",
        element: <MyLearning />
      },
      {
        path: "profile",
        element: <Profile />
      },
      {
        path: "course-detail/:courseId",
        element: <CourseDetail/>
      },
      {
        path: "course-progress/:courseId",
        element: <CourseProgress/>
      },
      {
        path: "admin",
        element: <Sidebar />,
        children: [
          {
            path: "dashboard",
            element: <Dashboard />
          },
          {
            path: "course",
            element: <CourseTable />
          },
         {
          path: "course/create",
          element: <AddCourse/>

         },
         {
          path: "course/:courseId",
          element: <EditCourse/>

         },
         {
          path: "course/:courseId/lecture",
          element: <CreateLecture/>

         },
         {
          path: "course/:courseId/lecture/:lectureId",
          element: <EditLecture/>

         },
        ]
      }
    ],

  },
]);

function App() {
  return (
    <main>
      <RouterProvider router={appRouter}></RouterProvider>
    </main>
  );
}

export default App;
