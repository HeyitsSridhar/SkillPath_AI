import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Clock, CheckCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const QuizPage = () => {
  const { topic, weekNum, subtopicNum } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [startTime, setStartTime] = useState(null);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState(null);

  const fetchQuiz = useCallback(async () => {
    try {
      const response = await axios.post(`${API_URL}/api/quiz`, {
        course: topic,
        topic: `Week ${weekNum}`,
        subtopic: `Subtopic ${subtopicNum}`,
        description: 'Quiz description'
      });
      setQuiz(response.data);
      setStartTime(Date.now());
    } catch (error) {
      console.error('Error fetching quiz:', error);
      alert('Failed to load quiz');
      navigate(`/roadmap/${encodeURIComponent(topic)}`);
    } finally {
      setLoading(false);
    }
  }, [topic, weekNum, subtopicNum, navigate]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const handleAnswerSelect = (questionId, answerIndex) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    const timeTaken = Date.now() - startTime;
    let numCorrect = 0;

    quiz.questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correct) {
        numCorrect++;
      }
    });

    const results = {
      numCorrect,
      numQuestions: quiz.questions.length,
      timeTaken,
      percentage: (numCorrect * 100) / quiz.questions.length
    };

    setResults(results);
    setFinished(true);

    // Save quiz stats
    try {
      await axios.post(`${API_URL}/api/quiz/stats`, {
        topic,
        week_num: parseInt(weekNum),
        subtopic_num: parseInt(subtopicNum),
        num_correct: numCorrect,
        num_questions: quiz.questions.length,
        time_taken: timeTaken
      });
    } catch (error) {
      console.error('Error saving quiz stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <CheckCircle size={64} className="mx-auto text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Quiz Completed!</h1>
          <div className="space-y-3 mb-8">
            <div className="text-5xl font-bold text-purple-600">
              {results.percentage.toFixed(0)}%
            </div>
            <p className="text-gray-600">
              You answered <b>{results.numCorrect}</b> out of <b>{results.numQuestions}</b> questions correctly
            </p>
            <p className="text-gray-600">
              Time taken: <b>{(results.timeTaken / 1000).toFixed(0)}s</b>
            </p>
          </div>
          <button
            onClick={() => navigate(`/roadmap/${encodeURIComponent(topic)}`)}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-bold hover:shadow-xl transition-all"
            data-testid="back-to-roadmap-button"
          >
            Back to Roadmap
          </button>
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{topic}</h1>
            <p className="text-sm text-gray-600">
              Week {weekNum} - Subtopic {subtopicNum}
            </p>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock size={20} />
            <span className="font-medium">
              {Math.floor((Date.now() - startTime) / 1000)}s
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
            <span>{Math.round(((currentQuestion + 1) / quiz.questions.length) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {question.question}
          </h2>
          <div className="space-y-3">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswers[question.id] === index;
              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(question.id, index)}
                  className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  data-testid={`answer-option-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-purple-600 bg-purple-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className="font-medium text-gray-800">{option}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          
          {currentQuestion === quiz.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(selectedAnswers).length !== quiz.questions.length}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="submit-quiz-button"
            >
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:shadow-xl transition-all"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
