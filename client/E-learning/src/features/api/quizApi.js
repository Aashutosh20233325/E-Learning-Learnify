import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Define the base URL for your quiz API endpoints
const QUIZ_API = "http://localhost:8080/api/v1/quizzes/"; // Matches your backend route setup

export const quizApi = createApi({
    // A unique string that identifies this API slice in the Redux store.
    reducerPath: "quizApi",

    // Defines the base URL and fetch method for all endpoints in this API.
    baseQuery: fetchBaseQuery({
        baseUrl: QUIZ_API, // All requests will start with "http://localhost:8080/api/v1/quizzes/"
        credentials: "include", // Essential for sending and receiving HTTP cookies (e.g., your authentication token)
    }),

    // Defines a set of operations (endpoints) for interacting with your API.
    endpoints: (builder) => ({

        // 1. createQuiz: For Admin/Instructor to create a new quiz.
        // This is a 'mutation' because it sends data to the server to change its state.
        createQuiz: builder.mutation({
            // The 'quizData' parameter will be an object containing all quiz details:
            // { lectureId, title, description, duration, passPercentage, questions: [{...}] }
            query: (quizData) => ({
                url: "/",          // Corresponds to POST /api/v1/quizzes/
                method: "POST",    // HTTP POST method to create a new resource
                body: quizData,    // The data to send in the request body (quiz details)
            }),
            // If you want to invalidate a tag or trigger another query after creation,
            // you'd add 'invalidatesTags' here. For now, we omit it for simplicity.
        }),

        // 2. getQuizByLecture: For students/general users to fetch a quiz for a specific lecture.
        // This is a 'query' because it fetches data without changing server state.
        getQuizByLecture: builder.query({
            // The 'lectureId' parameter is used to construct the URL.
            query: (lectureId) => `lectures/${lectureId}`, // Corresponds to GET /api/v1/quizzes/lectures/:lectureId
        }),

        // 3. getQuizDetails: For students/general users to fetch details of a specific quiz by its ID.
        // This is also a 'query'.
        getQuizDetails: builder.query({
            // The 'quizId' parameter is used to construct the URL.
            query: (quizId) => `/${quizId}`, // Corresponds to GET /api/v1/quizzes/:quizId
        }),

        // 4. submitQuizAttempt: For students to submit their answers for a quiz.
        // This is a 'mutation' as it saves new data (the attempt and answers) on the server.
        submitQuizAttempt: builder.mutation({
            // Takes an object with 'quizId' and 'answers' (the user's submitted answers array).
            query: ({ quizId, answers }) => ({
                url: `/${quizId}/submit`, // Corresponds to POST /api/v1/quizzes/:quizId/submit
                method: "POST",           // HTTP POST method to submit data
                body: { submittedAnswers: answers }, // The body should match backend's expected 'submittedAnswers' key
            }),
        }),

        // 5. getUserQuizAttempts: For a logged-in student to see all their past quiz attempts.
        // This is a 'query'. No parameters needed as the backend uses 'req.user._id'.
        getUserQuizAttempts: builder.query({
            query: () => `me/attempts`, // Corresponds to GET /api/v1/quizzes/me/attempts
        }),

        // 6. getQuizAttemptDetails: For students/instructors/admins to view the details of a specific quiz attempt.
        // This is a 'query'.
        getQuizAttemptDetails: builder.query({
            // The 'attemptId' parameter is used to construct the URL.
            query: (attemptId) => `attempts/${attemptId}`, // Corresponds to GET /api/v1/quizzes/attempts/:attemptId
        }),

        deleteQuiz: builder.mutation({
            // Takes 'quizId' of the quiz to be deleted.
            query: (quizId) => ({
                url: `/${quizId}`, // Corresponds to DELETE /api/v1/quizzes/:quizId
                method: "DELETE",  // HTTP DELETE method
            }),
        }),
    }),
});

// Export the generated hooks for each endpoint for use in React components.
// RTK Query automatically creates hooks like use[EndpointName][Query/Mutation]
export const {
    useCreateQuizMutation,
    useGetQuizByLectureQuery,
    useGetQuizDetailsQuery,
    useSubmitQuizAttemptMutation,
    useGetUserQuizAttemptsQuery,
    useGetQuizAttemptDetailsQuery,
    useDeleteQuizMutation,
} = quizApi;

// Export the API slice itself (optional, but common practice)
export default quizApi;