import { Quiz } from '../models/Quiz.js';
import { Question } from '../models/Question.js';
import { Option } from '../models/Option.js';
import { UserQuizAttempt } from '../models/UserQuizAttempt.js';
import { UserAnswer } from '../models/UserAnswer.js';
import { Lecture } from '../models/lecture.model.js'; 

const calculateScore = async (quizId, submittedAnswers) => {
    let score = 0;
    let totalPossiblePoints = 0;
    const questions = await Question.find({ quiz: quizId }).populate('options');

    const detailedAnswers = []; // To store correctness and points for each question

    for (const question of questions) {
        totalPossiblePoints += question.points;
        const userAnswer = submittedAnswers.find(ua => ua.questionId.toString() === question._id.toString());

        let isCorrect = false;
        let pointsAwarded = 0;

        if (userAnswer) {
            if (question.type === 'multiple_choice' || question.type === 'true_false') {
                const correctOption = question.options.find(opt => opt.isCorrect);
                if (correctOption && userAnswer.selectedOptionId && correctOption._id.toString() === userAnswer.selectedOptionId.toString()) {
                    isCorrect = true;
                    pointsAwarded = question.points;
                }
            } else if (question.type === 'short_answer') {
                // For simple auto-grading of short answers: exact match (case-insensitive, trimmed)
                // For real apps, this often requires manual grading or more sophisticated NLP.
                if (question.correctAnswerText && userAnswer.responseText &&
                    userAnswer.responseText.toLowerCase().trim() === question.correctAnswerText.toLowerCase().trim()) {
                    isCorrect = true;
                    pointsAwarded = question.points;
                }
            }
        }

        detailedAnswers.push({
            questionId: question._id,
            selectedOptionId: userAnswer ? userAnswer.selectedOptionId : null,
            responseText: userAnswer ? userAnswer.responseText : null,
            isCorrect: isCorrect,
            pointsAwarded: pointsAwarded
        });
        score += pointsAwarded;
    }

    return { score, totalPossiblePoints, detailedAnswers };
};


// --- Core Controller Functions ---

// 1. Admin/Instructor: Create a new Quiz
export const createQuiz = async (req, res) => {
    try {
        const { lectureId, title, description, duration, passPercentage, questions } = req.body;

        // Basic validation
        if (!lectureId || !title || !questions || questions.length === 0) {
            return res.status(400).json({ message: 'Missing required quiz fields or questions.' });
        }

        const lectureExists = await Lecture.findById(lectureId);
        if (!lectureExists) {
            return res.status(404).json({ message: 'Lecture not found.' });
        }

        const existingQuiz = await Quiz.findOne({ lecture: lectureId });
        if (existingQuiz) {
            return res.status(400).json({ message: 'A quiz already exists for this lecture. Please update it instead.' });
        }

        const quiz = await Quiz.create({
            lecture: lectureId,
            title,
            description,
            duration,
            passPercentage,
            createdBy: req.user._id // Assuming req.user is populated by protect middleware
        });

        for (let q of questions) {
            // Basic question validation
            if (!q.text || !q.type || !q.points) {
                return res.status(400).json({ message: 'Each question must have text, type, and points.' });
            }

            const question = await Question.create({
                quiz: quiz._id,
                text: q.text,
                type: q.type,
                points: q.points,
                correctAnswerText: q.correctAnswerText || null // For short_answer
            });

            if (q.type === 'multiple_choice' || q.type === 'true_false') {
                if (!q.options || q.options.length === 0) {
                     return res.status(400).json({ message: `Question "${q.text}" of type ${q.type} must have options.` });
                }
                const hasCorrectOption = q.options.some(opt => opt.isCorrect);
                if (!hasCorrectOption) {
                     return res.status(400).json({ message: `Multiple choice/True-False question "${q.text}" must have at least one correct option.` });
                }

                for (let opt of q.options) {
                    await Option.create({
                        question: question._id,
                        text: opt.text,
                        isCorrect: opt.isCorrect
                    });
                }
            }
        }

        res.status(201).json({ message: 'Quiz created successfully', quizId: quiz._id });
    } catch (error) {
        console.error('Error creating quiz:', error);
         return res.status(500).json({
            success:false,
            message:"failed to create"
        })
    }
};

// 2. Student/General: Get Quiz and Questions for a specific Lecture
export const getQuizByLecture = async (req, res) => {
    try {
        const { lectureId } = req.params;
        const quiz = await Quiz.findOne({ lecture: lectureId });

        if (!quiz) {
            return res.status(404).json({ message: 'No quiz found for this lecture.' });
        }

        // Fetch questions and options for the quiz
        // IMPORTANT: '-isCorrect' excludes the correct answer flag when sending to the client!
        const questions = await Question.find({ quiz: quiz._id }).populate('options', '-isCorrect -createdAt -updatedAt -__v');

        res.status(200).json({ quiz, questions });
    } catch (error) {
        console.error('Error fetching quiz by lecture:', error);
         return res.status(500).json({
            success:false,
            message:"Failed to get quiz"
        })
    }
};

// 3. Student/General: Get Quiz Details by Quiz ID (similar to getQuizByLecture, but direct)
export const getQuizDetails = async (req, res) => {
    try {
        const { quizId } = req.params;
        const quiz = await Quiz.findById(quizId);

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }

        const questions = await Question.find({ quiz: quiz._id }).populate('options', '-isCorrect -createdAt -updatedAt -__v');

        res.status(200).json({ quiz, questions });
    } catch (error) {
        console.error('Error fetching quiz details:', error);
         return res.status(500).json({
            success:false,
            message:"Failed to get details"
        })
    }
};

// 4. Student: Submit a Quiz Attempt
export const submitQuizAttempt = async (req, res) => {
    try {
        const { quizId } = req.params;
        // submittedAnswers is an array of objects like:
        // { questionId: '...', selectedOptionId: '...' } OR
        // { questionId: '...', responseText: '...' }
        const { submittedAnswers } = req.body;

        if (!submittedAnswers || !Array.isArray(submittedAnswers)) {
            return res.status(400).json({ message: 'Invalid submitted answers format.' });
        }

        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }

        // Check if user already has a completed attempt (optional: disallow multiple attempts)
        const existingAttempt = await UserQuizAttempt.findOne({
            user: req.user._id,
            quiz: quizId,
            isCompleted: true
        });
        // If you allow multiple attempts, you'd skip this or add logic for attempt limits.
        // For simplicity, let's allow multiple attempts for now.

        // Calculate score and get detailed results
        const { score, totalPossiblePoints, detailedAnswers } = await calculateScore(quizId, submittedAnswers);

        const passed = (score / totalPossiblePoints) * 100 >= quiz.passPercentage;

        // Create Quiz Attempt
        const userAttempt = await UserQuizAttempt.create({
            user: req.user._id, // Assuming user is authenticated by protect middleware
            quiz: quizId,
            score: score,
            totalPoints: totalPossiblePoints,
            isCompleted: true,
            passed: passed,
            completedAt: Date.now()
        });

        // Save individual answers
        for (const ans of detailedAnswers) {
            await UserAnswer.create({
                attempt: userAttempt._id,
                question: ans.questionId,
                selectedOption: ans.selectedOptionId,
                responseText: ans.responseText,
                isCorrect: ans.isCorrect,
                pointsAwarded: ans.pointsAwarded
            });
        }

        res.status(200).json({
            message: 'Quiz submitted successfully!',
            score,
            totalPossiblePoints,
            passed,
            attemptId: userAttempt._id // Send attempt ID for direct navigation to results
        });

    } catch (error) {
        console.error('Error submitting quiz attempt:', error);
         return res.status(500).json({
            success:false,
            message:"failed to submit"
        })
    }
};


// 5. Student: Get all Quiz Attempts for the logged-in user
export const getUserQuizAttempts = async (req, res) => {
    try {
        const attempts = await UserQuizAttempt.find({ user: req.user._id })
            .populate('quiz', 'title description') // Populate quiz details
            .sort({ completedAt: -1 }); // Latest attempts first

        res.status(200).json({ attempts });
    } catch (error) {
        console.error('Error fetching user quiz attempts:', error);
         return res.status(500).json({
            success:false,
            message:"Failed to access"
        })
    }
};

// 6. Student/Admin/Instructor: Get details of a specific Quiz Attempt (for review)
export const getQuizAttemptDetails = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const attempt = await UserQuizAttempt.findById(attemptId)
            .populate('user', 'name email')
            .populate('quiz', 'title description');

        if (!attempt) {
            return res.status(404).json({ message: 'Quiz attempt not found.' });
        }

        // Authorization: Ensure user is authorized to view this attempt
        // (either their own attempt, or if they are an admin/instructor)
        if (attempt.user._id.toString() !== req.user._id.toString() &&
            req.user.role !== 'admin' && req.user.role !== 'instructor') {
            return res.status(403).json({ message: 'Not authorized to view this quiz attempt.' });
        }

        // Populate question details and selected option text for review
        const userAnswers = await UserAnswer.find({ attempt: attempt._id })
            .populate({
                path: 'question',
                select: 'text type points correctAnswerText', // Include correct answer for review
                populate: {
                    path: 'options',
                    select: 'text isCorrect' // Include correct option text and its correctness for review
                }
            })
            .populate('selectedOption', 'text'); // Populate the user's selected option's text

        res.status(200).json({ attempt, userAnswers });
    } catch (error) {
        console.error('Error fetching quiz attempt details:', error);
         return res.status(500).json({
            success:false,
            message:"failed to access"
        })
    }
};


export const deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await Quiz.findById(id);
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }

        // Ensure only creator or admin can delete
        if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this quiz.' });
        }

        // Delete associated questions, options, and user attempts/answers
        const questions = await Question.find({ quiz: quiz._id });
        for (const question of questions) {
            await Option.deleteMany({ question: question._id });
        }
        await Question.deleteMany({ quiz: quiz._id });
        const attempts = await UserQuizAttempt.find({ quiz: quiz._id });
        for (const attempt of attempts) {
            await UserAnswer.deleteMany({ attempt: attempt._id });
        }
        await UserQuizAttempt.deleteMany({ quiz: quiz._id });

        await Quiz.deleteOne({ _id: id }); // Mongoose 6+ prefers deleteOne/deleteMany over remove()
        res.status(200).json({ message: 'Quiz deleted successfully.' });

    } catch (error) {
        console.error('Error deleting quiz:', error);
         return res.status(500).json({
            success:false,
            message:"Failed to delete"
        })
    }
};