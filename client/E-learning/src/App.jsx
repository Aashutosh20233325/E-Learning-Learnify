import "./App.css";
import MainLayout from "./layout/MainLayout";

import { RouterProvider, createBrowserRouter } from "react-router-dom";

import HeroSection from "./pages/student/HeroSection.jsx";

import Login from "./pages/Login.jsx";
import Courses from "./pages/student/Courses";
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
