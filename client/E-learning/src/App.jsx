import "./App.css";
import MainLayout from "./layout/MainLayout";

import { RouterProvider, createBrowserRouter } from "react-router-dom";

import HeroSection from "./pages/student/HeroSection.jsx";

import Login from "./pages/Login.jsx";
import Courses from "./pages/student/Courses";
import MyLearning from "./pages/student/MyLearning";

import Profile from "./pages/student/Profile";
import Sidebar from "./pages/admin/lecture/Sidebar";
import Dashboard from "./pages/admin/lecture/Dashboard";
import CourseTable from "./pages/admin/course/CourseTable";
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
        path: "admin",
        element: <Sidebar />,
        children: [
          {
            path: "dashboard",
            element: <Dashboard />
          },
          {
            path: "courses",
            element: <CourseTable />
          }
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
