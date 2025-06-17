import express from 'express';
// Adjust path to your auth middleware if it's not directly in 'middlewares' folder
import isAuthenticated from "../middlewares/isAuthenticated.js"; 
import {
    createQuiz,
    getQuizByLecture,
    getQuizDetails,
    submitQuizAttempt,
    getUserQuizAttempts,
    getQuizAttemptDetails,
    deleteQuiz
} from '../controllers/quizController.js'; // Adjust path if needed

const router = express.Router();

// --- Admin/Instructor Routes (Require specific roles) ---
// POST /api/v1/quizzes
router.post('/',isAuthenticated, createQuiz);

// DELETE /api/v1/quizzes/:id
router.delete('/:id',isAuthenticated, deleteQuiz);

// --- Student/General Routes (Require login) ---
// GET /api/v1/quizzes/lectures/:lectureId - Get a quiz associated with a lecture
router.get('/lectures/:lectureId', isAuthenticated,getQuizByLecture);
// GET /api/v1/quizzes/:quizId - Get specific quiz details (questions and options)
router.get('/:quizId', isAuthenticated, getQuizDetails);
// POST /api/v1/quizzes/:quizId/submit - Submit a quiz attempt
router.post('/:quizId/submit',isAuthenticated, submitQuizAttempt);
// GET /api/v1/quizzes/me/attempts - Get all quiz attempts for the logged-in user
router.get('/me/attempts',isAuthenticated,getUserQuizAttempts);
// GET /api/v1/quizzes/attempts/:attemptId - Get details of a specific attempt (for review)
router.get('/attempts/:attemptId',isAuthenticated,getQuizAttemptDetails);

export default router;