import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Plus, Minus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

import { useCreateQuizMutation } from '@/features/api/quizApi';

const QuizCreationForm = () => {
    const navigate = useNavigate();
    const { courseId, lectureId } = useParams();

    console.log("QuizCreationForm (render): courseId from useParams:", courseId);
    console.log("QuizCreationForm (render): lectureId from useParams:", lectureId);

    const [quizDetails, setQuizDetails] = useState({
        title: '',
        description: '',
        duration: '',
        passPercentage: '',
    });

    const [questions, setQuestions] = useState([
        {
            text: '',
            type: 'multiple_choice',
            points: 1,
            options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
            correctAnswerText: '',
        },
    ]);

    const [
        createQuiz,
        { data, error, isLoading, isSuccess, isError }
    ] = useCreateQuizMutation();

    useEffect(() => {
        console.log("QuizCreationForm (useEffect): isLoading:", isLoading, "isSuccess:", isSuccess, "isError:", isError, "data:", data, "error:", error);

        if (isSuccess && data) {
            toast.success(data.message || 'Quiz created successfully!');
            navigate(`/admin/course/${courseId}/lecture/${lectureId}`); // Consistent singular path
        }
        if (isError && error) {
            toast.error(error.data?.message || 'Failed to create quiz.');
        }
    }, [isSuccess, isError, data, error, navigate, courseId, lectureId, isLoading]);

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
            newQuestions[qIndex].options = newQuestions[qIndex].options.map((opt, idx) => ({
                ...opt,
                isCorrect: idx === oIndex ? checked : false,
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
        console.log("handleSubmit called!");

        if (!quizDetails.title || !quizDetails.duration || !quizDetails.passPercentage || questions.length === 0) {
            toast.error("Please fill all quiz details and add at least one question.");
            console.log("Validation failed: Missing quiz details or no questions.");
            return;
        }

        for (const q of questions) {
            if (!q.text || !q.points || q.points <= 0) {
                toast.error(`Question "${q.text || 'unnamed'}" is incomplete. Fill out text and points.`);
                console.log(`Validation failed: Question "${q.text || 'unnamed'}" incomplete (text or points).`);
                return;
            }
            if (q.type === 'multiple_choice' || q.type === 'true_false') {
                if (q.options.length < (q.type === 'true_false' ? 2 : 1)) {
                    toast.error(`Question "${q.text}" requires at least ${q.type === 'true_false' ? 2 : 1} option(s).`);
                    console.log(`Validation failed: Question "${q.text}" requires more options.`);
                    return;
                }
                const hasCorrect = q.options.some(opt => opt.isCorrect);
                if (!hasCorrect) {
                    toast.error(`Question "${q.text}" must have a correct option selected.`);
                    console.log(`Validation failed: Question "${q.text}" has no correct option selected.`);
                    return;
                }
                if (q.type === 'multiple_choice' && q.options.some(opt => !opt.text.trim())) {
                    toast.error(`Question "${q.text}" has empty option text.`);
                    console.log(`Validation failed: Question "${q.text}" has empty option text.`);
                    return;
                }
            } else if (q.type === 'short_answer' && !q.correctAnswerText.trim()) {
                toast.error(`Short answer question "${q.text}" requires a correct answer text.`);
                console.log(`Validation failed: Short answer question "${q.text}" missing correct answer text.`);
                return;
            }
        }

        console.log("All frontend validations passed. Preparing quiz data...");
        const quizData = {
            lectureId,
            ...quizDetails,
            duration: parseInt(quizDetails.duration, 10),
            passPercentage: parseInt(quizDetails.passPercentage, 10),
            questions: questions.map(q => ({
                text: q.text,
                type: q.type,
                points: parseInt(q.points, 10),
                ...(q.type === 'multiple_choice' || q.type === 'true_false'
                    ? { options: q.options }
                    : {}),
                ...(q.type === 'short_answer'
                    ? { correctAnswerText: q.correctAnswerText.trim() }
                    : {}),
            })),
        };
        console.log("Submitting quiz data:", quizData);
        await createQuiz(quizData);
        console.log("createQuiz mutation dispatched.");
    };

    return (
        <div className="flex items-center w-full justify-center mt-8">
            <Card className="w-[800px] rounded-lg shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-lg">
                    <CardTitle className="text-2xl font-bold">Create Quiz for Lecture ID: {lectureId}</CardTitle>
                    <CardDescription className="text-blue-100">
                        Define your quiz details, questions, and answers.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                    {/* Quiz Details */}
                    <div className="space-y-4 p-4 border border-blue-200 rounded-md bg-blue-50">
                        <h3 className="text-lg font-semibold text-blue-800">Quiz Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="quiz-title" className="text-blue-700">Quiz Title</Label>
                                <Input
                                    id="quiz-title"
                                    name="title"
                                    value={quizDetails.title}
                                    onChange={handleQuizDetailsChange}
                                    placeholder="e.g., Introduction to React Quiz"
                                    required
                                    className="border-blue-300 focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="quiz-duration" className="text-blue-700">Duration (minutes)</Label>
                                <Input
                                    id="quiz-duration"
                                    name="duration"
                                    type="number"
                                    value={quizDetails.duration}
                                    onChange={handleQuizDetailsChange}
                                    placeholder="e.g., 30"
                                    min="0"
                                    className="border-blue-300 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="quiz-description" className="text-blue-700">Description (Optional)</Label>
                            <Textarea
                                id="quiz-description"
                                name="description"
                                value={quizDetails.description}
                                onChange={handleQuizDetailsChange}
                                placeholder="A brief description of the quiz content."
                                className="border-blue-300 focus:border-blue-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="pass-percentage" className="text-blue-700">Pass Percentage (%)</Label>
                            <Input
                                id="pass-percentage"
                                name="passPercentage"
                                type="number"
                                value={quizDetails.passPercentage}
                                onChange={handleQuizDetailsChange}
                                placeholder="e.g., 70"
                                min="0"
                                max="100"
                                className="border-blue-300 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Questions Section */}
                    <div className="space-y-4 p-4 border border-indigo-200 rounded-md bg-indigo-50">
                        <h3 className="text-lg font-semibold text-indigo-800">Questions</h3>
                        {questions.map((q, qIndex) => (
                            <Card key={qIndex} className="p-4 border border-dashed border-indigo-300 relative bg-white shadow-sm rounded-md">
                                {/* Delete Question Button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeQuestion(qIndex)}
                                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 rounded-full"
                                    aria-label="Remove question"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <div className="space-y-2">
                                    <Label htmlFor={`question-text-${qIndex}`} className="text-indigo-700">Question {qIndex + 1} Text</Label>
                                    <Input
                                        id={`question-text-${qIndex}`}
                                        name="text"
                                        value={q.text}
                                        onChange={(e) => handleQuestionChange(qIndex, e)}
                                        placeholder="Enter question text"
                                        required
                                        className="border-indigo-300 focus:border-indigo-500"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div className="space-y-1">
                                        <Label htmlFor={`question-type-${qIndex}`} className="text-indigo-700">Type</Label>
                                        <Select
                                            value={q.type}
                                            onValueChange={(value) => handleQuestionTypeChange(qIndex, value)}
                                            required
                                        >
                                            <SelectTrigger id={`question-type-${qIndex}`} className="border-indigo-300 focus:border-indigo-500">
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
                                        <Label htmlFor={`question-points-${qIndex}`} className="text-indigo-700">Points</Label>
                                        <Input
                                            id={`question-points-${qIndex}`}
                                            name="points"
                                            type="number"
                                            value={q.points}
                                            onChange={(e) => handleQuestionChange(qIndex, e)}
                                            placeholder="Points"
                                            min="1"
                                            required
                                            className="border-indigo-300 focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                {/* Options/Correct Answer Text based on type */}
                                {(q.type === 'multiple_choice' || q.type === 'true_false') && (
                                    <div className="space-y-2 mt-4 p-3 border border-gray-200 rounded-md bg-gray-50">
                                        <Label className="text-indigo-700">Options (Select correct option)</Label>
                                        {q.options.map((opt, oIndex) => (
                                            <div key={oIndex} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`option-${qIndex}-${oIndex}`}
                                                    name="isCorrect"
                                                    checked={opt.isCorrect}
                                                    onCheckedChange={(checked) => handleOptionChange(qIndex, oIndex, { target: { name: 'isCorrect', type: 'checkbox', checked }})}
                                                    className="border-indigo-400 data-[state=checked]:bg-indigo-600 data-[state=checked]:text-white"
                                                />
                                                <Input
                                                    type="text"
                                                    name="text"
                                                    value={opt.text}
                                                    onChange={(e) => handleOptionChange(qIndex, oIndex, e)}
                                                    placeholder={`Option ${oIndex + 1}`}
                                                    required
                                                    readOnly={q.type === 'true_false'}
                                                    className="flex-grow border-gray-300 focus:border-indigo-500"
                                                />
                                                {q.type === 'multiple_choice' && (
                                                    <Button variant="ghost" size="icon" onClick={() => removeOption(qIndex, oIndex)} className="text-red-400 hover:text-red-600 rounded-full" aria-label="Remove option">
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        {q.type === 'multiple_choice' && (
                                            <Button variant="outline" onClick={() => addOption(qIndex)} className="w-full mt-2 border-indigo-400 text-indigo-700 hover:bg-indigo-100">
                                                <Plus className="mr-2 h-4 w-4" /> Add Option
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {q.type === 'short_answer' && (
                                    <div className="space-y-1 mt-4 p-3 border border-gray-200 rounded-md bg-gray-50">
                                        <Label htmlFor={`correct-answer-text-${qIndex}`} className="text-indigo-700">Correct Answer Text</Label>
                                        <Input
                                            id={`correct-answer-text-${qIndex}`}
                                            name="correctAnswerText"
                                            value={q.correctAnswerText}
                                            onChange={(e) => handleQuestionChange(qIndex, e)}
                                            placeholder="Enter exact correct answer (e.g., 'React')"
                                            required
                                            className="border-gray-300 focus:border-indigo-500"
                                        />
                                    </div>
                                )}
                            </Card>
                        ))}
                        <Button variant="outline" onClick={addQuestion} className="w-full mt-4 border-blue-400 text-blue-700 hover:bg-blue-100">
                            <Plus className="mr-2 h-4 w-4" /> Add Question
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="p-6 bg-gray-50 rounded-b-lg border-t border-gray-100">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        onClick={handleSubmit}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Creating Quiz...
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
