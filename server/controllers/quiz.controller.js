import { Quiz } from '../models/Quiz.js';
import { Question } from '../models/Question.js';
import { Option } from '../models/Option.js';
import { Lecture } from '../models/lecture.model.js';
import { CourseProgress } from '../models/CourseProgress.js';
import { QuizAttemptDetail } from '../models/QuizAttemptDetail.js';
import mongoose from 'mongoose';


const calculateScore = async (quizId, submittedAnswers) => {
    let score = 0;
    let totalPossiblePoints = 0;

  
    if (!mongoose.isValidObjectId(quizId)) {
        console.error(`Invalid quizId provided to calculateScore: ${quizId}`);
        return { score: 0, totalPossiblePoints: 0, detailedAnswers: [] }; 
    }

    const questions = await Question.find({ quiz: mongoose.Types.ObjectId.createFromHexString(quizId) }).lean();
    
    
    const questionsWithPopulatedOptions = await Promise.all(questions.map(async (q) => {
        if (q.type === 'multiple_choice' || q.type === 'true_false') {
            const options = await Option.find({ question: q._id }).lean();
            return { ...q, options: options }; 
        }
        return { ...q, options: [] }; 
    }));


    const detailedAnswers = [];

    for (const question of questionsWithPopulatedOptions) { 
        totalPossiblePoints += question.points || 0; 
        const userAnswer = submittedAnswers.find(ua => ua.questionId.toString() === question._id.toString());

        let isCorrect = false;
        let pointsAwarded = 0;

        if (userAnswer) {
            if (question.type === 'multiple_choice' || question.type === 'true_false') {
                
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
                if (isCorrect) pointsAwarded = question.points; 
            }
        }

        detailedAnswers.push({
            questionId: question._id,
            selectedOptionIds: userAnswer ? userAnswer.selectedOptionIds : [],
            submittedAnswerText: userAnswer ? userAnswer.submittedAnswerText : null,
            isCorrect: isCorrect,
            pointsAwarded: pointsAwarded
        });
        score += pointsAwarded;
    }

    return { score, totalPossiblePoints, detailedAnswers };
};


export const createQuiz = async (req, res) => {
    try {
        const { lectureId, title, description, duration, passPercentage, questions } = req.body;

        if (!lectureId || !title || !questions || questions.length === 0) {
            return res.status(400).json({ message: 'Missing required quiz fields or questions.' });
        }

       
        if (!mongoose.isValidObjectId(lectureId)) {
            return res.status(400).json({ success: false, message: "Invalid Lecture ID format." });
        }

        
        if (!mongoose.isValidObjectId(req.id)) {
            return res.status(400).json({ success: false, message: "Invalid User ID from token." });
        }

        const lectureExists = await Lecture.findById(mongoose.Types.ObjectId.createFromHexString(lectureId));
        if (!lectureExists) {
            return res.status(404).json({ message: 'Lecture not found.' });
        }

        const existingQuiz = await Quiz.findOne({ lecture: mongoose.Types.ObjectId.createFromHexString(lectureId) });
        if (existingQuiz) {
            return res.status(400).json({ message: 'A quiz already exists for this lecture. Please update it instead.' });
        }

        const quiz = await Quiz.create({
            lecture: mongoose.Types.ObjectId.createFromHexString(lectureId),
            title,
            description,
            duration,
            passPercentage,
            createdBy: mongoose.Types.ObjectId.createFromHexString(req.id)
        });

        for (let q of questions) {
            if (!q.text || !q.type || !q.points) {
                
                await Quiz.deleteOne({ _id: quiz._id });
                return res.status(400).json({ message: 'Each question must have text, type, and points.' });
            }

            const question = await Question.create({
                quiz: quiz._id,
                text: q.text,
                type: q.type,
                points: q.points,
                correctAnswerText: q.correctAnswerText || null,
                
            });

            if (q.type === 'multiple_choice' || q.type === 'true_false') {
                if (!q.options || q.options.length === 0) {
                    await Quiz.deleteOne({ _id: quiz._id });
                    await Question.deleteMany({ quiz: quiz._id });
                    return res.status(400).json({ message: `Question "${q.text}" of type ${q.type} must have options.` });
                }
                const hasCorrectOption = q.options.some(opt => opt.isCorrect);
                if (!hasCorrectOption) {
                    await Quiz.deleteOne({ _id: quiz._id });
                    await Question.deleteMany({ quiz: quiz._id });
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

    
        lectureExists.quiz = quiz._id;
        await lectureExists.save();

        res.status(201).json({ message: 'Quiz created successfully', quizId: quiz._id });
    } catch (error) {
        console.error('Error creating quiz:', error);
        res.status(500).json({
            success: false,
            message: "Failed to create quiz."
        });
    }
};


export const getQuizByLecture = async (req, res) => {
    try {
        const { lectureId } = req.params;

        // Validate lectureId before conversion
        if (!mongoose.isValidObjectId(lectureId)) {
            return res.status(400).json({ success: false, message: "Invalid Lecture ID format." });
        }

        const quiz = await Quiz.findOne({ lecture: mongoose.Types.ObjectId.createFromHexString(lectureId) }).lean();

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'No quiz found for this lecture.' });
        }

        // Fetch questions without populating options directly
        const questions = await Question.find({ quiz: quiz._id }).lean();

        // Manually fetch options for each question and attach them
        const questionsWithPopulatedOptions = await Promise.all(questions.map(async (q) => {
            if (q.type === 'multiple_choice' || q.type === 'true_false') {
                const options = await Option.find({ question: q._id }).lean();
                return { ...q, options: options }; // Attach options array
            }
            return { ...q, options: [] }; // For short_answer, ensure options is an empty array
        }));

        res.status(200).json({ quiz, questions: questionsWithPopulatedOptions }); // Send questions with populated options

    } catch (error) {
        console.error('Error fetching quiz by lecture:', error);
        res.status(500).json({
            success: false,
            message: "Failed to get quiz details by lecture."
        });
    }
};


export const getQuizDetails = async (req, res) => {
    try {
        const { quizId } = req.params;

        // Validate quizId before conversion
        if (!mongoose.isValidObjectId(quizId)) {
            return res.status(400).json({ success: false, message: "Invalid Quiz ID format." });
        }

        const quiz = await Quiz.findById(mongoose.Types.ObjectId.createFromHexString(quizId)).lean();

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }

        // Fetch questions without populating options directly
        const questions = await Question.find({ quiz: quiz._id }).lean();

        // Manually fetch options for each question and attach them
        const questionsWithPopulatedOptions = await Promise.all(questions.map(async (q) => {
            if (q.type === 'multiple_choice' || q.type === 'true_false') {
                const options = await Option.find({ question: q._id }).lean();
                return { ...q, options: options }; // Attach options array
            }
            return { ...q, options: [] }; // For short_answer, ensure options is an empty array
        }));

        res.status(200).json({ quiz, questions: questionsWithPopulatedOptions }); // Send questions with populated options
    } catch (error) {
        console.error('Error fetching quiz details:', error);
        res.status(500).json({
            success: false,
            message: "Failed to get details"
        });
    }
};



export const updateQuiz = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { title, description, duration, passPercentage, questions } = req.body;

       
        if (!mongoose.isValidObjectId(quizId)) {
            return res.status(400).json({ success: false, message: "Invalid Quiz ID format." });
        }

        const quiz = await Quiz.findById(mongoose.Types.ObjectId.createFromHexString(quizId));

        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }

        if (!questions || questions.length === 0) {
            return res.status(400).json({ message: 'Questions array cannot be empty for quiz update.' });
        }

        quiz.title = title || quiz.title;
        quiz.description = description || quiz.description;
        quiz.duration = duration;
        quiz.passPercentage = passPercentage;
        await quiz.save();

        // Clear existing questions and options for this quiz
        const existingQuestions = await Question.find({ quiz: quiz._id });
        if (existingQuestions.length > 0) {
            const existingQuestionIds = existingQuestions.map(q => q._id);
            await Option.deleteMany({ question: { $in: existingQuestionIds } }); // Delete options first
            await Question.deleteMany({ quiz: quiz._id }); // Then delete questions
        }

        for (let q of questions) {
            if (!q.text || !q.type || !q.points) {
                
                return res.status(400).json({ message: 'Each question must have text, type, and points.' });
            }

            const newQuestion = await Question.create({
                quiz: quiz._id,
                text: q.text,
                type: q.type,
                points: q.points,
                correctAnswerText: q.correctAnswerText || null,
                // Removed 'options: []' initialization
            });

            if (q.type === 'multiple_choice' || q.type === 'true_false') {
                if (!q.options || q.options.length === 0) {
                   
                    await Question.deleteOne({ _id: newQuestion._id }); 
                    return res.status(400).json({ message: `Question "${newQuestion.text}" of type ${q.type} must have options.` });
                }
                const hasCorrectOption = q.options.some(opt => opt.isCorrect);
                if (!hasCorrectOption) {
                    await Question.deleteOne({ _id: newQuestion._id }); 
                    return res.status(400).json({ message: `Multiple choice/True-False question "${newQuestion.text}" must have at least one correct option.` });
                }

                for (let opt of q.options) {
                    await Option.create({
                        question: newQuestion._id,
                        text: opt.text,
                        isCorrect: opt.isCorrect
                    });
                    // Removed: newQuestion.options.push(newOption._id);
                }
                // Removed: await newQuestion.save();
            }
        }

        res.status(200).json({ message: 'Quiz updated successfully', quizId: quiz._id });
    } catch (error) {
        console.error('Error updating quiz:', error);
        res.status(500).json({
            success: false,
            message: "Failed to update quiz."
        });
    }
};


export const deleteQuiz = async (req, res) => {
    try {
        const { quizId } = req.params;
       
        if (!mongoose.isValidObjectId(quizId)) {
            return res.status(400).json({ success: false, message: "Invalid Quiz ID format." });
        }
     
        if (!mongoose.isValidObjectId(req.id)) {
            return res.status(400).json({ success: false, message: "Invalid User ID for authorization." });
        }


        const quiz = await Quiz.findById(mongoose.Types.ObjectId.createFromHexString(quizId));
        if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found.' });
        }

        const userRole = req.user?.role;
        const isOwner = quiz.createdBy.toString() === req.id.toString();
        const isAdmin = userRole === 'admin';
        const isInstructor = userRole === 'instructor';

        if (!isOwner && !isAdmin && !isInstructor) {
            return res.status(403).json({ message: 'Not authorized to delete this quiz.' });
        }

        const questions = await Question.find({ quiz: quiz._id });
        for (const question of questions) {
            await Option.deleteMany({ question: question._id }); 
        }
        await Question.deleteMany({ quiz: quiz._id }); 

        await QuizAttemptDetail.deleteMany({ quizId: quiz._id });


        const lecture = await Lecture.findOne({ quiz: quiz._id });
        if (lecture) {
            lecture.quiz = null;
            await lecture.save();
        }

        
        await CourseProgress.updateMany(
            { 'lectureProgress.quizAttempts.quizId': quiz._id },
            { $pull: { 'lectureProgress.$.quizAttempts': { quizId: quiz._id } } }
        );

        await Quiz.deleteOne({ _id: quiz._id });

        res.status(200).json({ message: 'Quiz and all associated data deleted successfully.' });

    } catch (error) {
        console.error('Error deleting quiz:', error);
        res.status(500).json({
            success: false,
            message: "Failed to delete quiz."
        });
    }
};
