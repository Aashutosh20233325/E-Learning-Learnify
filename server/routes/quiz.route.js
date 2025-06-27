import express from 'express';

import isAuthenticated from "../middlewares/isAuthenticated.js";

import {
    createQuiz,
    getQuizByLecture, 
    getQuizDetails,  
    deleteQuiz,       
    updateQuiz       
} from '../controllers/quiz.controller.js'; 

import {
    getQuizDetailsForStudent,       
    submitQuizAttempt as studentSubmitQuizAttempt, 
    startQuizAttempt,              
    getUserQuizAttempts,          
    getQuizAttemptDetails         
} from '../controllers/studentQuiz.controller.js'; 


const router = express.Router();

router.post('/', isAuthenticated, createQuiz);


router.put('/:quizId', isAuthenticated, updateQuiz);

router.delete('/:quizId', isAuthenticated, deleteQuiz); 

router.get('/lectures/:lectureId', isAuthenticated, getQuizByLecture);
router.get('/:quizId', isAuthenticated, getQuizDetails);


router.get('/student/:quizId', isAuthenticated, getQuizDetailsForStudent);

router.post('/:quizId/start', isAuthenticated, startQuizAttempt); 

router.post('/:quizId/submit', isAuthenticated, studentSubmitQuizAttempt); 

router.get('/attempts/:attemptId', isAuthenticated, getQuizAttemptDetails);

router.get('/me/attempts', isAuthenticated, getUserQuizAttempts);


export default router;
