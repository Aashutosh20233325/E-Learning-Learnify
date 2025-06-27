// controllers/quizController.js
import { Quiz } from '../models/Quiz.js'; // Your Quiz model
import { Question } from '../models/Question.js'; // Your Question model
import { Option } from '../models/Option.js'; // Your Option model
import { QuizSession } from '../models/quizSession.model.js'; // The NEW QuizSession model
import { QuizAttemptDetail } from '../models/QuizAttemptDetail.js'; // Your existing QuizAttemptDetail model
import { CourseProgress } from '../models/CourseProgress.js'; // Assuming this might be needed later
import mongoose from 'mongoose';

// Helper function to calculate score (User's provided logic)
const calculateScore = async (quizId, submittedAnswers) => {
    let score = 0;
    let totalPossiblePoints = 0;
    const detailedAnswers = []; // This will become 'processedAnswers' in the main function

    // Validate quizId before conversion
    if (!mongoose.isValidObjectId(quizId)) {
        console.error(`Invalid quizId provided to calculateScore: ${quizId}`);
        return { score: 0, totalPossiblePoints: 0, detailedAnswers: [] }; // Return early
    }
    const questions = await Question.find({ quiz: mongoose.Types.ObjectId.createFromHexString(quizId) }).lean();

    // Manually fetch options for each question
    const questionsWithPopulatedOptions = await Promise.all(questions.map(async (q) => {
        if (q.type === 'multiple_choice' || q.type === 'true_false') {
            const options = await Option.find({ question: q._id }).lean();
            return { ...q, options: options }; // Attach options to the question object
        }
        return { ...q, options: [] }; // Short answer questions have no options
    }));


    for (const question of questionsWithPopulatedOptions) { // Use questionsWithPopulatedOptions here
        totalPossiblePoints += question.points || 0; // Ensure points are numbers, default to 0
        // FIX: Removed the incorrect 'userAnswer &&' condition from the find predicate.
        // The find method will return undefined if no match, which is correctly handled by the subsequent 'if (userAnswer)'
        const userAnswer = submittedAnswers.find(ua => ua.questionId.toString() === question._id.toString());

        let isCorrect = false;
        let pointsAwarded = 0;

        if (userAnswer) {
            if (question.type === 'multiple_choice' || question.type === 'true_false') {
                // Ensure question.options is an array and find the correct one
                const correctOption = question.options.find(opt => opt.isCorrect);
                if (correctOption && userAnswer.selectedOptionIds && userAnswer.selectedOptionIds.length === 1 &&
                    correctOption._id.toString() === userAnswer.selectedOptionIds[0].toString()) {
                    isCorrect = true;
                    pointsAwarded = question.points;
                }
            } else if (question.type === 'short_answer') {
                const submittedText = (userAnswer.submittedAnswerText || '').trim().toLowerCase();
                const correctText = (question.correctAnswerText || '').trim().toLowerCase();
                isCorrect = submittedText === correctText;
                if (isCorrect) pointsAwarded = question.points; // Award points for correct short answer
            }
        }

        detailedAnswers.push({
            questionId: question._id,
            questionType: question.type, // ADDED: Include question.type here
            selectedOptionIds: userAnswer ? userAnswer.selectedOptionIds : [],
            submittedAnswerText: userAnswer ? userAnswer.submittedAnswerText : null,
            isCorrect: isCorrect,
            pointsAwarded: pointsAwarded
        });
        score += pointsAwarded;
    }

    return { score, totalPossiblePoints, processedAnswers: detailedAnswers }; // Renamed for consistency
};


/**
 * @desc Start a quiz attempt for a user or resume an existing one.
 * Returns the start time and quiz duration to the frontend.
 * @route POST /api/quizzes/:quizId/start
 * @access Private (User)
 */
export const startQuizAttempt = async (req, res, next) => {
    try {
        const userId = req.id; // Assuming req.id contains the authenticated user's ID
        const { quizId } = req.params;

        // 1. Validate quizId
        if (!mongoose.isValidObjectId(quizId)) {
            return res.status(400).json({ success: false, message: "Invalid Quiz ID format." });
        }

        // 2. Find the quiz to get its duration
        const quiz = await Quiz.findById(mongoose.Types.ObjectId.createFromHexString(quizId)).lean();
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }
        if (quiz.duration === null || quiz.duration === undefined) {
             // Handle quizzes with no defined duration (untimed quizzes)
            return res.status(400).json({ message: 'Quiz has no defined duration. Use a different endpoint for untimed quizzes if needed.' });
        }


        // 3. Check for an existing 'in_progress' QuizSession for this user and quiz
        let existingSession = await QuizSession.findOne({
            userId: mongoose.Types.ObjectId.createFromHexString(userId),
            quizId: mongoose.Types.ObjectId.createFromHexString(quizId),
            status: 'in_progress'
        });

        if (existingSession) {
            // If an 'in_progress' session exists, return its start time and quiz duration
            console.log(`Resuming existing quiz session for user ${userId} on quiz ${quizId}. Session ID: ${existingSession._id}`);
            return res.status(200).json({
                message: 'Quiz session resumed.',
                quizSession: {
                    _id: existingSession._id,
                    quizId: existingSession.quizId,
                    userId: existingSession.userId,
                    startTime: existingSession.startTime,
                    durationMinutes: quiz.duration, // Send quiz duration from Quiz model
                }
            });
        }

        // 4. Create a new QuizSession record
        const newSession = new QuizSession({
            userId: mongoose.Types.ObjectId.createFromHexString(userId),
            quizId: mongoose.Types.ObjectId.createFromHexString(quizId),
            startTime: Date.now(), // Record the exact start time on the server
            status: 'in_progress'
        });

        await newSession.save();
        console.log(`New quiz session started for user ${userId} on quiz ${quizId}. Session ID: ${newSession._id}`);

        res.status(201).json({
            message: 'Quiz session started successfully.',
            quizSession: {
                _id: newSession._id,
                quizId: newSession.quizId,
                userId: newSession.userId,
                startTime: newSession.startTime,
                durationMinutes: quiz.duration, // Send quiz duration with new session
            }
        });

    } catch (error) {
        // Handle unique constraint errors if a race condition occurs
        if (error.code === 11000) { // MongoDB duplicate key error code
            return res.status(409).json({ message: 'A quiz session is already in progress for this user and quiz.' });
        }
        console.error('Error starting quiz session:', error);
        next(error); // Pass the error to the centralized error handler
    }
};

// @desc    Student: Submit Quiz Attempt (Integrated with time validation and QuizSession)
// @route   POST /api/v1/student/quizzes/:quizId/submit
export const submitQuizAttempt = async (req, res, next) => {
    try {
        console.log("--- Backend: submitQuizAttempt Called ---"); // Top-level log
        console.log("Backend: Full req.body received:", JSON.stringify(req.body, null, 2)); // Log full request body

        const { quizId } = req.params;
        // Expect quizSessionId from frontend to identify the active session
        // Assuming 'answers' contains the submitted answers array from frontend
        const { answers: submittedAnswers, quizSessionId } = req.body;
        const userId = req.id;

        console.log("Backend: quizId from params:", quizId);
        console.log("Backend: userId from req.id:", userId);
        console.log("Backend: quizSessionId from req.body:", quizSessionId);
        console.log("Backend: Destructured 'submittedAnswers' (from 'answers' key):", JSON.stringify(submittedAnswers, null, 2));


        // Validate IDs
        if (!mongoose.isValidObjectId(quizId)) {
            console.error("Backend Validation: Invalid Quiz ID format.");
            return res.status(400).json({ success: false, message: "Invalid Quiz ID format." });
        }
        if (!mongoose.isValidObjectId(userId)) {
            console.error("Backend Validation: Invalid User ID format.");
            return res.status(400).json({ success: false, message: "Invalid User ID." });
        }
        if (!mongoose.isValidObjectId(quizSessionId)) {
            console.error("Backend Validation: Invalid Quiz Session ID format.");
            return res.status(400).json({ success: false, message: "Invalid Quiz Session ID." });
        }

        // Check if submittedAnswers exists, is an array, and is not empty
        console.log(`Backend Validation: Checking submittedAnswers. Is it defined? ${!!submittedAnswers}. Is it an Array? ${Array.isArray(submittedAnswers)}. Has length? ${submittedAnswers ? submittedAnswers.length : 'N/A'}`);
        if (!submittedAnswers || !Array.isArray(submittedAnswers) || submittedAnswers.length === 0) {
            console.error("Backend Validation Failed: submittedAnswers is invalid or empty. Returning 400.");
            return res.status(400).json({ success: false, message: "No answers submitted." });
        }
        console.log("Backend Validation Passed: submittedAnswers is valid.");


        // 1. Find the active quiz session
        // Populate quizId to get its duration
        const quizSession = await QuizSession.findOne({
            _id: mongoose.Types.ObjectId.createFromHexString(quizSessionId),
            userId: mongoose.Types.ObjectId.createFromHexString(userId),
            quizId: mongoose.Types.ObjectId.createFromHexString(quizId),
            status: 'in_progress' // Only allow submission for in-progress sessions
        }).populate('quizId'); // Populate the quiz document to access its 'duration'

        if (!quizSession) {
            console.error(`Quiz session not found or already completed/timed out. Session ID: ${quizSessionId}`);
            return res.status(404).json({ success: false, message: 'Quiz session not found or already completed/timed out.' });
        }
        if (!quizSession.quizId) {
            // This indicates a data integrity issue or failed population
            console.error(`Quiz details not found for quizSessionId: ${quizSessionId}. QuizSession object:`, quizSession);
            return res.status(500).json({ success: false, message: 'Quiz details not found for this session.' });
        }
        if (quizSession.quizId.duration === null || quizSession.quizId.duration === undefined) {
             // Handle quizzes with no defined duration (untimed quizzes)
            console.error(`Quiz ${quizSession.quizId._id} has no defined duration. Cannot apply time limit validation.`);
            return res.status(400).json({ success: false, message: 'Quiz has no defined duration. Cannot apply time limit validation.' });
        }

        const quizDurationMinutes = quizSession.quizId.duration; // Use 'duration' from Quiz model
        const startTime = quizSession.startTime.getTime(); // Convert to milliseconds
        const currentTime = Date.now(); // Current submission time in milliseconds

        // Calculate allowed end time
        const allowedEndTime = startTime + (quizDurationMinutes * 60 * 1000); // Start time + duration in milliseconds

        console.log(`Quiz Duration: ${quizDurationMinutes} minutes`);
        console.log(`Quiz Start Time (from DB): ${new Date(startTime)}`);
        console.log(`Current Submission Time: ${new Date(currentTime)}`);
        console.log(`Allowed End Time: ${new Date(allowedEndTime)}`);

        let sessionStatus = 'completed'; // Default status
        if (currentTime > allowedEndTime) {
            sessionStatus = 'timed_out';
            console.log('Quiz submission is TIMED OUT!');
            // Update QuizSession status to timed_out immediately for integrity
            quizSession.status = sessionStatus;
            await quizSession.save();
            return res.status(400).json({ success: false, message: 'Quiz timed out. Submission not accepted after time limit.' });
        } else {
            console.log('Quiz submission is within time limit.');
        }

        // Fetch the quiz and POPULATE its 'lecture' field (from user's original logic)
        // This is done again here to ensure 'quiz.lecture.course' is available for CourseProgress
        const quiz = await Quiz.findById(mongoose.Types.ObjectId.createFromHexString(quizId))
                                .populate({ path: 'lecture', select: 'course' }) // Populate lecture and select only the course field
                                .lean();

        if (!quiz) {
            console.error("Backend: Quiz not found for ID (after re-fetch for CourseProgress):", quizId);
            // This should ideally not happen if quizSession.quizId populated successfully
            return res.status(404).json({ success: false, message: "Quiz not found." });
        }
        // Ensure quiz.lecture and quiz.lecture.course exist after population
        if (!quiz.lecture || !quiz.lecture.course) {
            console.error(`Backend: Quiz lecture or course reference not found for quizId: ${quizId}. Quiz object:`, quiz);
            return res.status(500).json({ success: false, message: "Associated lecture or course information missing for this quiz." });
        }


        // 2. Calculate score and total possible points, and get processed answers
        // Using the `calculateScore` helper function
        const { score, totalPossiblePoints, processedAnswers } = await calculateScore(quizId, submittedAnswers);

        // 3. Determine if the user passed
        // Ensure quiz.passPercentage is a valid number, default to 0 if not
        const passPercentage = quiz.passPercentage || 0;
        const passed = totalPossiblePoints > 0 ? (score / totalPossiblePoints) * 100 >= passPercentage : false;
        console.log(`Backend: Quiz Score: ${score}/${totalPossiblePoints}, Passed: ${passed}`);


        // 4. Update the QuizSession status (mark as completed)
        quizSession.status = sessionStatus; // Will be 'completed' here if not timed out
        await quizSession.save();
        console.log(`Quiz session ${quizSession._id} status updated to: ${sessionStatus}`);


        // 5. Save quiz attempt (your original logic for QuizAttemptDetail)
        const newAttempt = await QuizAttemptDetail.create({
            quizId: mongoose.Types.ObjectId.createFromHexString(quizId),
            userId: mongoose.Types.ObjectId.createFromHexString(userId),
            score,
            totalPoints: totalPossiblePoints,
            passPercentage: quiz.passPercentage, // Storing passPercentage from quiz at time of attempt
            passed,
            answers: processedAnswers, // Store processed answers from calculateScore
            submittedAt: new Date(currentTime) // Ensure submittedAt is current time of submission
        });
        console.log("Backend: New quiz attempt created:", newAttempt._id);


        // 6. Update CourseProgress for the lecture associated with this quiz (your original logic)
        let courseProgress = await CourseProgress.findOne({
            userId: mongoose.Types.ObjectId.createFromHexString(userId),
            'lectureProgress.lectureId': quiz.lecture._id, // Use quiz.lecture._id as lectureId
        });
        console.log("Backend: Existing CourseProgress found:", !!courseProgress);


        if (courseProgress) {
            const lectureIndex = courseProgress.lectureProgress.findIndex(
                lp => lp.lectureId.toString() === quiz.lecture._id.toString()
            );
            console.log("Backend: Lecture index in CourseProgress:", lectureIndex);


            if (lectureIndex !== -1) {
                // Initialize quizAttempts if it doesn't exist
                if (!courseProgress.lectureProgress[lectureIndex].quizAttempts) {
                    courseProgress.lectureProgress[lectureIndex].quizAttempts = [];
                    console.log("Backend: Initialized quizAttempts array.");
                }
                courseProgress.lectureProgress[lectureIndex].quizAttempts.push({
                    attemptId: newAttempt._id,
                    quizId: newAttempt.quizId,
                    score: newAttempt.score,
                    passed: newAttempt.passed,
                    attemptedAt: newAttempt.createdAt // Store when this attempt happened
                });
                // Optionally mark lecture as viewed if this is how your app handles it
                // courseProgress.lectureProgress[lectureIndex].viewed = true;
                console.log("Backend: Pushed new attempt to existing lecture progress.");
            } else {
                console.log("Backend: Lecture progress entry not found, creating new one.");
                // Add a new lecture progress entry and the attempt.
                courseProgress.lectureProgress.push({
                    lectureId: quiz.lecture._id, // Use quiz.lecture._id
                    viewed: false, // Mark as not viewed if only quiz was attempted
                    quizAttempts: [{
                        attemptId: newAttempt._id,
                        quizId: newAttempt.quizId,
                        score: newAttempt.score,
                        passed: newAttempt.passed,
                        attemptedAt: newAttempt.createdAt
                    }]
                });
            }
            await courseProgress.save();
            console.log("Backend: CourseProgress updated.");
        } else {
            console.log("Backend: No CourseProgress document exists, creating new one.");
            // No CourseProgress document exists for this user/course, create one
            await CourseProgress.create({
                userId: mongoose.Types.ObjectId.createFromHexString(userId),
                courseId: quiz.lecture.course._id, // Access _id from the populated course object
                lectureProgress: [{
                    lectureId: quiz.lecture._id, // Use quiz.lecture._id
                    viewed: false,
                    quizAttempts: [{
                        attemptId: newAttempt._id,
                        quizId: newAttempt.quizId,
                        score: newAttempt.score,
                        passed: newAttempt.passed,
                        attemptedAt: newAttempt.createdAt
                    }]
                }],
                completed: false,
            });
            console.log("Backend: New CourseProgress created.");
        }


        res.status(200).json({
            success: true,
            message: 'Quiz submitted successfully!',
            attemptId: newAttempt._id,
            score: newAttempt.score,
            passed: newAttempt.passed,
            status: sessionStatus // Include the session status in the response
        });
        console.log("--- Backend: submitQuizAttempt Finished Successfully ---");


    } catch (error) {
        console.error('--- Backend Error in submitQuizAttempt ---');
        console.error('Error object:', error);
        if (error.name === 'BSONError' && error.message.includes('hex string must be 24 characters')) {
            return res.status(400).json({ success: false, message: "Invalid ID format provided in submission." });
        }
        res.status(500).json({ success: false, message: "Server error submitting quiz." });
        console.error('--- Backend Error Handling Finished ---');
    }
};


// @desc    Student: Get Quiz Details and Questions for taking (without correct answers)
// @route   GET /api/v1/student/quizzes/:quizId
export const getQuizDetailsForStudent = async (req, res) => {
    try {
        const { quizId } = req.params;
        const userId = req.id; // User ID from authenticated token

        // Validate quizId before conversion
        if (!mongoose.isValidObjectId(quizId)) {
            return res.status(400).json({ success: false, message: "Invalid Quiz ID format." });
        }

        // Fetch the quiz itself
        const quiz = await Quiz.findById(mongoose.Types.ObjectId.createFromHexString(quizId)).lean();

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found.' });
        }

        // Fetch questions associated with the quiz
        const questions = await Question.find({ quiz: quiz._id }).lean();

        const questionsWithPopulatedOptions = await Promise.all(questions.map(async (q) => {
            if (q.type === 'multiple_choice' || q.type === 'true_false') {
                // Fetch options for the current question
                const options = await Option.find({ question: q._id }).lean();
                // Attach options to the question object
                return { ...q, options: options };
            }
            // For short_answer questions, ensure options is an empty array
            return { ...q, options: [] };
        }));

        // Filter out correct answers from the questions and options for the student
        const studentViewQuestions = questionsWithPopulatedOptions.map(q => {
            // Remove correctAnswerText for short_answer questions
            const { correctAnswerText, ...restQuestion } = q;

            // For multiple_choice/true_false, ensure options don't contain isCorrect
            const sanitizedOptions = q.options.map(opt => {
                const { isCorrect, ...restOption } = opt;
                return restOption;
            });

            return {
                ...restQuestion,
                options: sanitizedOptions // Use sanitized options
            };
        });

        res.status(200).json({
            success: true,
            quiz,
            questions: studentViewQuestions // Send questions with sanitized options
        });

    } catch (error) {
        console.error('Error in getQuizDetailsForStudent:', error);
        if (error.name === 'BSONError' && error.message.includes('hex string must be 24 characters')) {
            return res.status(400).json({ success: false, message: "Invalid ID format provided." });
        }
        res.status(500).json({ success: false, message: "Server error fetching quiz for student." });
    }
};


// @desc    Student: Get User's Quiz Attempts
// @route   GET /api/v1/student/quizzes/me/attempts
export const getUserQuizAttempts = async (req, res) => {
    try {
        const userId = req.id;
        // Validate userId
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ success: false, message: "Invalid User ID format." });
        }

        const attempts = await QuizAttemptDetail.find({ userId: mongoose.Types.ObjectId.createFromHexString(userId) })
            .populate({
                path: 'quizId', // Populate the quiz details
                select: 'title description duration'
            })
            .lean();

        res.status(200).json({ success: true, attempts });

    } catch (error) {
        console.error('Error fetching user quiz attempts:', error);
        res.status(500).json({ success: false, message: "Server error fetching attempts." });
    }
};

// @desc    Student: Get Details of a Specific Quiz Attempt (Now exported as getQuizResults)
// @route   GET /api/v1/student/quizzes/attempts/:attemptId
// Renamed from getQuizAttemptDetails to getQuizResults.
// Also exporting as getQuizAttemptDetails for backward compatibility/flexibility in imports.
const getQuizResultsFunction = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const userId = req.id;

        // Validate attemptId and userId
        if (!mongoose.isValidObjectId(attemptId)) {
            return res.status(400).json({ success: false, message: "Invalid Attempt ID format." });
        }
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({ success: false, message: "Invalid User ID." });
        }

        const attempt = await QuizAttemptDetail.findOne({
            _id: mongoose.Types.ObjectId.createFromHexString(attemptId),
            userId: mongoose.Types.ObjectId.createFromHexString(userId)
        })
            .populate({
                path: 'quizId',
                select: 'title description duration passPercentage' // Added passPercentage
            })
            .lean();

        if (!attempt) {
            return res.status(404).json({ success: false, message: "Quiz attempt not found." });
        }

        // Fetch questions and options for the quiz that this attempt belongs to
        const questions = await Question.find({ quiz: attempt.quizId._id }).lean();

        const questionsWithPopulatedOptions = await Promise.all(questions.map(async (q) => {
            if (q.type === 'multiple_choice' || q.type === 'true_false') {
                const options = await Option.find({ question: q._id }).lean();
                return { ...q, options: options };
            }
            return { ...q, options: [] };
        }));

        // Combine attempt's answers with question details
        const detailedAttempt = {
            ...attempt,
            answers: attempt.answers.map(attemptAns => {
                const questionDetail = questionsWithPopulatedOptions.find(q => q._id.toString() === attemptAns.questionId.toString());
                if (!questionDetail) return attemptAns; // Should not happen if data is consistent

                const submittedOptions = attemptAns.selectedOptionIds ? attemptAns.selectedOptionIds.map(optId => {
                    const optionDetail = questionDetail.options.find(opt => opt._id.toString() === optId.toString());
                    return optionDetail ? { _id: optionDetail._id, text: optionDetail.text } : { _id: optId, text: 'Unknown Option' };
                }) : [];

                const correctOptions = questionDetail.options ? questionDetail.options.filter(opt => opt.isCorrect).map(opt => ({ _id: opt._id, text: opt.text })) : [];

                return {
                    ...attemptAns,
                    questionText: questionDetail.text,
                    questionType: questionDetail.type,
                    questionPoints: questionDetail.points,
                    correctAnswerText: questionDetail.correctAnswerText || null, // For short answer, ensure it's null if not applicable
                    submittedOptions: submittedOptions, // Detailed submitted options
                    correctOptions: correctOptions,    // Detailed correct options
                };
            })
        };

        res.status(200).json({ success: true, attempt: detailedAttempt });

    } catch (error) {
        console.error('Error fetching quiz attempt details:', error);
        if (error.name === 'BSONError' && error.message.includes('hex string must be 24 characters')) {
            return res.status(400).json({ success: false, message: "Invalid ID format provided." });
        }
        res.status(500).json({ success: false, message: "Server error fetching attempt details." });
    }
};

export const getQuizResults = getQuizResultsFunction; 
export const getQuizAttemptDetails = getQuizResultsFunction; 
