import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const QUIZ_API = "https://devskill-hub.onrender.com/api/v1/quizzes/";

export const quizApi = createApi({
    reducerPath: "quizApi",
    baseQuery: fetchBaseQuery({
        baseUrl: QUIZ_API,
        credentials: "include",
    }),
    tagTypes: ['Quiz', 'QuizAttempt', 'QuizSession'],

    endpoints: (builder) => ({
        createQuiz: builder.mutation({
            query: (quizData) => ({
                url: "/",
                method: "POST",
                body: quizData,
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Quiz', id: `LECTURE-${arg.lectureId}` },
                'Quiz'
            ],
        }),

        getQuizByLecture: builder.query({
            query: (lectureId) => `lectures/${lectureId}`,
            providesTags: (result, error, lectureId) => [{ type: 'Quiz', id: `LECTURE-${lectureId}` }],
        }),

        getQuizDetails: builder.query({
            query: (quizId) => `/${quizId}`,
            providesTags: (result, error, quizId) => [{ type: 'Quiz', id: `ADMIN-QUIZ-${quizId}` }],
        }),

        getQuizDetailsForStudent: builder.query({
            query: (quizId) => `student/${quizId}`,
            providesTags: (result, error, quizId) => [{ type: 'Quiz', id: `STUDENT-QUIZ-${quizId}` }],
        }),

   
        startQuizAttempt: builder.mutation({
            query: (quizId) => ({
                url: `${quizId}/start`,
                method: "POST",
            }),
            // Only invalidate the QuizSession tag, as it's the only one directly affected by starting a session.
            // The 'Quiz' data itself (questions, description) does not change when a session starts.
            invalidatesTags: (result, error, quizId) => [
                { type: 'QuizSession', id: `QUIZ-${quizId}` } // Invalidate specific quiz session tag
            ],
        }),

      
        submitQuizAttempt: builder.mutation({
            query: ({ quizId, quizSessionId, answers }) => ({
                url: `${quizId}/submit`,
                method: "POST",
                body: { answers, quizSessionId },
            }),
            invalidatesTags: (result, error, arg) => [
                'QuizAttempt', // Invalidate any list of quiz attempts
                { type: 'QuizAttempt', id: 'LIST' }, // A general tag for lists of attempts
                // The quiz content itself does not change upon submission, so no need to invalidate 'STUDENT-QUIZ-${arg.quizId}'
                { type: 'QuizSession', id: `QUIZ-${arg.quizId}` } // Invalidate the quiz session after submission
            ],
        }),

        getQuizAttemptDetails: builder.query({
            query: (attemptId) => `attempts/${attemptId}`,
            providesTags: (result, error, attemptId) => [{ type: 'QuizAttempt', id: attemptId }],
        }),

        getUserQuizAttempts: builder.query({
            query: () => `me/attempts`,
            providesTags: (result) =>
                result
                    ? [...result.attempts.map(({ _id }) => ({ type: 'QuizAttempt', id: _id })), { type: 'QuizAttempt', id: 'LIST' }]
                    : [{ type: 'QuizAttempt', id: 'LIST' }],
        }),


        editQuiz: builder.mutation({
            query: ({ quizId, ...patch }) => ({
                url: `/${quizId}`,
                method: 'PUT',
                body: patch,
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Quiz', id: `ADMIN-QUIZ-${arg.quizId}` },
                // If editing a quiz changes its content (e.g., questions, duration), then it's appropriate to invalidate student view here:
                { type: 'Quiz', id: `STUDENT-QUIZ-${arg.quizId}` }, // Keep this here as editing *does* change quiz content
                { type: 'Quiz', id: `LECTURE-${result.quiz?.lecture}` },
                'Quiz'
            ],
        }),

        deleteQuiz: builder.mutation({
            query: (quizId) => ({
                url: `/${quizId}`,
                method: "DELETE",
            }),
            invalidatesTags: (result, error, quizId) => ['Quiz', 'QuizAttempt', 'QuizSession'],
        }),
    }),
});

export const {
    useCreateQuizMutation,
    useGetQuizByLectureQuery,
    useGetQuizDetailsQuery,
    useGetQuizDetailsForStudentQuery,
    useStartQuizAttemptMutation,
    useSubmitQuizAttemptMutation,
    useGetQuizAttemptDetailsQuery,
    useGetUserQuizAttemptsQuery,
    useEditQuizMutation,
    useDeleteQuizMutation,
} = quizApi;

export default quizApi;