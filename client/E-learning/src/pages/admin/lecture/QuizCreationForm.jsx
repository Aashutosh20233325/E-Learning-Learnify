// client/src/pages/dashboard/QuizCreationForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Plus, Minus, Trash2 } from 'lucide-react'; // Icons for add/remove
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Assuming you have these RTK Query hooks in src/features/api/quizApi.js
import { useCreateQuizMutation} from '@/features/api/quizApi'; // Assuming a useGetLectureDetailsQuery exists or will be added to get lecture info

const QuizCreationForm = () => {
    const navigate = useNavigate();
    const { lectureId } = useParams(); // Get lectureId from URL

    // State for overall quiz details
    const [quizDetails, setQuizDetails] = useState({
        title: '',
        description: '',
        duration: '', // in minutes
        passPercentage: '',
    });

    // State for questions array
    const [questions, setQuestions] = useState([
        {
            text: '',
            type: 'multiple_choice', // Default type
            points: 1,
            options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }], // Default 2 options for MCQ
            correctAnswerText: '', // For short_answer
        },
    ]);

    // RTK Query mutation for creating quiz
    const [
        createQuiz,
        { data, error, isLoading, isSuccess, isError }
    ] = useCreateQuizMutation();

    // Optional: Fetch lecture details if you want to display them or validate
    // const { data: lectureData } = useGetLectureDetailsQuery(lectureId);


    useEffect(() => {
        if (isSuccess && data) {
            toast.success(data.message || 'Quiz created successfully!');
            // Redirect to lecture detail page or quiz management page
            navigate(`/lectures/${lectureId}`); // Or `/dashboard/quizzes`
        }
        if (isError && error) {
            toast.error(error.data?.message || 'Failed to create quiz.');
        }
    }, [isSuccess, isError, data, error, navigate, lectureId]);

    const handleQuizDetailsChange = (e) => {
        const { name, value } = e.target;
        setQuizDetails({ ...quizDetails, [name]: value });
    };

    const handleQuestionChange = (index, e) => {
        const { name, value } = e.target;
        const newQuestions = [...questions];
        newQuestions[index][name] = value;
        setQuestions(newQuestions);
    };

    const handleQuestionTypeChange = (index, type) => {
        const newQuestions = [...questions];
        newQuestions[index].type = type;
        // Reset options/correctAnswerText based on type
        if (type === 'multiple_choice') {
            newQuestions[index].options = [{ text: '', isCorrect: false }, { text: '', isCorrect: false }];
            newQuestions[index].correctAnswerText = '';
        } else if (type === 'true_false') {
            newQuestions[index].options = [{ text: 'True', isCorrect: false }, { text: 'False', isCorrect: false }];
            newQuestions[index].correctAnswerText = '';
        } else if (type === 'short_answer') {
            newQuestions[index].options = [];
        }
        setQuestions(newQuestions);
    };

    const handleOptionChange = (qIndex, oIndex, e) => {
        const { name, value, type, checked } = e.target;
        const newQuestions = [...questions];
        if (type === 'checkbox') {
            // For multiple choice, only one option can be correct
            newQuestions[qIndex].options = newQuestions[qIndex].options.map((opt, idx) => ({
                ...opt,
                isCorrect: idx === oIndex ? checked : false, // Only set clicked option as correct
            }));
        } else {
            newQuestions[qIndex].options[oIndex][name] = value;
        }
        setQuestions(newQuestions);
    };

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                text: '',
                type: 'multiple_choice',
                points: 1,
                options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
                correctAnswerText: '',
            },
        ]);
    };

    const removeQuestion = (index) => {
        const newQuestions = questions.filter((_, i) => i !== index);
        setQuestions(newQuestions);
    };

    const addOption = (qIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options.push({ text: '', isCorrect: false });
        setQuestions(newQuestions);
    };

    const removeOption = (qIndex, oIndex) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
        setQuestions(newQuestions);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Basic frontend validation
        if (!quizDetails.title || !quizDetails.duration || !quizDetails.passPercentage || questions.length === 0) {
            toast.error("Please fill all quiz details and add at least one question.");
            return;
        }
        // More detailed validation for questions (e.g., ensure text, options, correct answers)
        for (const q of questions) {
            if (!q.text || !q.points || q.points <= 0) {
                toast.error(`Question "${q.text || 'unnamed'}" is incomplete. Fill out text and points.`);
                return;
            }
            if (q.type === 'multiple_choice' || q.type === 'true_false') {
                if (q.options.length < (q.type === 'true_false' ? 2 : 1)) { // T/F must have 2 options, MC needs at least 1
                    toast.error(`Question "${q.text}" requires at least ${q.type === 'true_false' ? 2 : 1} option(s).`);
                    return;
                }
                const hasCorrect = q.options.some(opt => opt.isCorrect);
                if (!hasCorrect) {
                    toast.error(`Question "${q.text}" must have a correct option selected.`);
                    return;
                }
            } else if (q.type === 'short_answer' && !q.correctAnswerText) {
                toast.error(`Short answer question "${q.text}" requires a correct answer text.`);
                return;
            }
        }


        // Prepare data for backend
        const quizData = {
            lectureId,
            ...quizDetails,
            duration: parseInt(quizDetails.duration, 10),
            passPercentage: parseInt(quizDetails.passPercentage, 10),
            questions: questions.map(q => ({
                ...q,
                // Ensure options are only included for relevant types
                options: (q.type === 'multiple_choice' || q.type === 'true_false') ? q.options : undefined,
                // Ensure correctAnswerText is only included for short_answer
                correctAnswerText: q.type === 'short_answer' ? q.correctAnswerText : undefined,
            })),
        };

        await createQuiz(quizData);
    };

    return (
        <div className="flex items-center w-full justify-center mt-8">
            <Card className="w-[800px]">
                <CardHeader>
                    <CardTitle>Create Quiz for Lecture ID: {lectureId}</CardTitle>
                    <CardDescription>
                        Define your quiz details, questions, and answers.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Quiz Details */}
                    <div className="space-y-4 p-4 border rounded-md">
                        <h3 className="text-lg font-semibold">Quiz Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="quiz-title">Quiz Title</Label>
                                <Input
                                    id="quiz-title"
                                    name="title"
                                    value={quizDetails.title}
                                    onChange={handleQuizDetailsChange}
                                    placeholder="e.g., Introduction to React Quiz"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="quiz-duration">Duration (minutes)</Label>
                                <Input
                                    id="quiz-duration"
                                    name="duration"
                                    type="number"
                                    value={quizDetails.duration}
                                    onChange={handleQuizDetailsChange}
                                    placeholder="e.g., 30"
                                    min="0"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="quiz-description">Description (Optional)</Label>
                            <Textarea
                                id="quiz-description"
                                name="description"
                                value={quizDetails.description}
                                onChange={handleQuizDetailsChange}
                                placeholder="A brief description of the quiz content."
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="pass-percentage">Pass Percentage (%)</Label>
                            <Input
                                id="pass-percentage"
                                name="passPercentage"
                                type="number"
                                value={quizDetails.passPercentage}
                                onChange={handleQuizDetailsChange}
                                placeholder="e.g., 70"
                                min="0"
                                max="100"
                            />
                        </div>
                    </div>

                    {/* Questions Section */}
                    <div className="space-y-4 p-4 border rounded-md">
                        <h3 className="text-lg font-semibold">Questions</h3>
                        {questions.map((q, qIndex) => (
                            <Card key={qIndex} className="p-4 border border-dashed relative">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeQuestion(qIndex)}
                                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <div className="space-y-2">
                                    <Label htmlFor={`question-text-${qIndex}`}>Question {qIndex + 1} Text</Label>
                                    <Input
                                        id={`question-text-${qIndex}`}
                                        name="text"
                                        value={q.text}
                                        onChange={(e) => handleQuestionChange(qIndex, e)}
                                        placeholder="Enter question text"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div className="space-y-1">
                                        <Label htmlFor={`question-type-${qIndex}`}>Type</Label>
                                        <Select
                                            value={q.type}
                                            onValueChange={(value) => handleQuestionTypeChange(qIndex, value)}
                                            required
                                        >
                                            <SelectTrigger id={`question-type-${qIndex}`}>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                                <SelectItem value="true_false">True/False</SelectItem>
                                                <SelectItem value="short_answer">Short Answer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor={`question-points-${qIndex}`}>Points</Label>
                                        <Input
                                            id={`question-points-${qIndex}`}
                                            name="points"
                                            type="number"
                                            value={q.points}
                                            onChange={(e) => handleQuestionChange(qIndex, e)}
                                            placeholder="Points"
                                            min="1"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Options/Correct Answer Text based on type */}
                                {(q.type === 'multiple_choice' || q.type === 'true_false') && (
                                    <div className="space-y-2 mt-4">
                                        <Label>Options (Select correct option)</Label>
                                        {q.options.map((opt, oIndex) => (
                                            <div key={oIndex} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`option-${qIndex}-${oIndex}`}
                                                    name="isCorrect"
                                                    checked={opt.isCorrect}
                                                    onCheckedChange={(checked) => handleOptionChange(qIndex, oIndex, { target: { name: 'isCorrect', type: 'checkbox', checked }})}
                                                />
                                                <Input
                                                    type="text"
                                                    name="text"
                                                    value={opt.text}
                                                    onChange={(e) => handleOptionChange(qIndex, oIndex, e)}
                                                    placeholder={`Option ${oIndex + 1}`}
                                                    required
                                                    readOnly={q.type === 'true_false'} // Make T/F options read-only
                                                />
                                                {q.type === 'multiple_choice' && ( // Allow removing options only for MCQs
                                                    <Button variant="ghost" size="icon" onClick={() => removeOption(qIndex, oIndex)}>
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        {q.type === 'multiple_choice' && ( // Allow adding options only for MCQs
                                            <Button variant="outline" onClick={() => addOption(qIndex)} className="w-full mt-2">
                                                <Plus className="mr-2 h-4 w-4" /> Add Option
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {q.type === 'short_answer' && (
                                    <div className="space-y-1 mt-4">
                                        <Label htmlFor={`correct-answer-text-${qIndex}`}>Correct Answer Text</Label>
                                        <Input
                                            id={`correct-answer-text-${qIndex}`}
                                            name="correctAnswerText"
                                            value={q.correctAnswerText}
                                            onChange={(e) => handleQuestionChange(qIndex, e)}
                                            placeholder="Enter exact correct answer (e.g., 'React')"
                                            required
                                        />
                                    </div>
                                )}
                            </Card>
                        ))}
                        <Button variant="outline" onClick={addQuestion} className="w-full">
                            <Plus className="mr-2 h-4 w-4" /> Add Question
                        </Button>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        onClick={handleSubmit}
                        className="w-full"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Quiz...
                            </>
                        ) : (
                            "Create Quiz"
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default QuizCreationForm;