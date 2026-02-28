import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Search, LibraryBig, ChevronLeft } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const TopicPage = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [timeInput, setTimeInput] = useState(4);
  const [timeUnit, setTimeUnit] = useState('Weeks');
  const [knowledgeLevel, setKnowledgeLevel] = useState('Absolute Beginner');
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const suggestionList = [
    'Competitive Programming',
    'Machine Learning',
    'Quantitative Finance',
    'Web Development',
    'Quantum Technology',
  ];

  const colors = [
    '#D14EC4',
    '#AFD14E',
    '#4ED1B1',
    '#D14E4E',
    '#D1854E',
    '#904ED1',
    '#4EAAD1',
  ];

  const handleSubmit = async () => {
    if (!topic || timeInput <= 0) {
      alert('Please enter a valid topic and time period');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/roadmap`, {
        topic,
        time: `${timeInput} ${timeUnit}`,
        knowledge_level: knowledgeLevel,
      });
      navigate(`/roadmap/${encodeURIComponent(topic)}`);
    } catch (error) {
      console.error('Error creating roadmap:', error);
      alert(error.response?.data?.detail || 'Failed to create roadmap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="back-to-dashboard-button"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Create Learning Roadmap
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {!topic ? (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                What do you want to learn?
              </h2>
            </div>

            {/* Topic Input */}
            <div className="bg-white rounded-2xl shadow-lg p-2 flex items-center gap-3">
              <LibraryBig size={32} className="text-gray-400 ml-2" />
              <input
                type="text"
                placeholder="Enter A Topic"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && inputValue && setTopic(inputValue)}
                className="flex-1 text-lg px-2 py-4 focus:outline-none"
                data-testid="topic-input"
              />
              <button
                onClick={() => inputValue && setTopic(inputValue)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-xl hover:shadow-lg transition-all"
                data-testid="topic-submit-button"
              >
                {inputValue ? <ArrowRight size={24} /> : <Search size={24} />}
              </button>
            </div>

            {/* Suggestions */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Suggestions:</h3>
              <div className="flex flex-wrap gap-3">
                {suggestionList.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setTopic(item)}
                    className="px-6 py-3 rounded-full text-white font-medium hover:shadow-lg transition-all transform hover:scale-105"
                    style={{ backgroundColor: colors[i % colors.length] }}
                    data-testid={`suggestion-${i}`}
                  >
                    {item}
                    <ArrowRight size={18} className="inline ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="text-center">
              <div className="inline-block px-6 py-2 bg-purple-100 text-purple-800 rounded-full mb-4">
                {topic}
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                How much time do you have to learn it?
              </h2>
            </div>

            {/* Time Input */}
            <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration
                  </label>
                  <input
                    type="number"
                    value={timeInput}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= 1 && val <= 100) setTimeInput(val);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-medium text-center focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min="1"
                    max="100"
                    data-testid="time-duration-input"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    value={timeUnit}
                    onChange={(e) => setTimeUnit(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    data-testid="time-unit-select"
                  >
                    <option value="Weeks">Weeks</option>
                    <option value="Months">Months</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Knowledge Level
                </label>
                <select
                  value={knowledgeLevel}
                  onChange={(e) => setKnowledgeLevel(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  data-testid="knowledge-level-select"
                >
                  <option value="Absolute Beginner">Absolute Beginner</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="start-learning-button"
              >
                {loading ? 'Generating Roadmap...' : 'Start Learning'}
              </button>
            </div>

            <button
              onClick={() => setTopic('')}
              className="w-full text-gray-600 hover:text-gray-800 font-medium"
            >
              ← Change Topic
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicPage;
