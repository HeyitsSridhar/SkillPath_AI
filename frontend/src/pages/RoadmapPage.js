import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, ChevronLeft, Book, Clock } from 'lucide-react';
import Markdown from 'react-markdown';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const RoadmapPage = () => {
  const { topic } = useParams();
  const navigate = useNavigate();
  const [roadmapData, setRoadmapData] = useState(null);
  const [quizStats, setQuizStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [openWeeks, setOpenWeeks] = useState({});
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [currentSubtopic, setCurrentSubtopic] = useState(null);
  const [resources, setResources] = useState(null);
  const [loadingResources, setLoadingResources] = useState(false);

  const colors = [
    '#D14EC4',
    '#4ED1B1',
    '#D14E4E',
    '#4EAAD1',
    '#D1854E',
    '#904ED1',
    '#AFD14E',
  ];

  const fetchRoadmapData = useCallback(async () => {
    try {
      const [roadmapRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/roadmap/${encodeURIComponent(topic)}`),
        axios.get(`${API_URL}/api/quiz/stats/${encodeURIComponent(topic)}`)
      ]);

      setRoadmapData(roadmapRes.data);
      setQuizStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching roadmap:', error);
      alert('Failed to load roadmap');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [topic, navigate]);

  useEffect(() => {
    fetchRoadmapData();
  }, [fetchRoadmapData]);

  const toggleWeek = (weekKey) => {
    setOpenWeeks(prev => ({ ...prev, [weekKey]: !prev[weekKey] }));
  };

  const openResourcesModal = (subtopic, weekNum, subtopicNum) => {
    setCurrentSubtopic({ ...subtopic, weekNum, subtopicNum });
    setShowResourceModal(true);
    setResources(null);
  };

  const generateResources = async () => {
    setLoadingResources(true);
    try {
      const response = await axios.post(`${API_URL}/api/generate-resources`, {
        course: topic,
        description: currentSubtopic.description,
        time: currentSubtopic.time,
      });

      setResources(response.data.resources || JSON.stringify(response.data));
    } catch (error) {
      console.error('Error generating resources:', error);
      alert('Failed to generate resources');
    } finally {
      setLoadingResources(false);
    }
  };

  const startQuiz = (weekNum, subtopicNum) => {
    navigate(`/quiz/${encodeURIComponent(topic)}/${weekNum}/${subtopicNum}`);
  };

  if (loading || !roadmapData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {topic}
            </h1>
            <p className="text-sm text-gray-600">
              Learning Roadmap
            </p>
          </div>
        </div>
      </header>

      {/* Roadmap Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-4">

          {Object.keys(roadmapData)
            .sort((a, b) => parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]))
            .map((weekKey, weekIndex) => {

              const week = roadmapData[weekKey];
              const weekNum = weekIndex + 1;

              return (
                <div key={weekKey} className="bg-white rounded-2xl shadow-md overflow-hidden">

                  {/* Week Header */}
                  <button
                    onClick={() => toggleWeek(weekKey)}
                    className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    style={{ borderLeft: `6px solid ${colors[weekIndex % colors.length]}` }}
                  >
                    <div className="text-left">
                      <h3 className="text-lg font-medium text-gray-600 capitalize">
                        {weekKey}
                      </h3>
                      <h2 className="text-2xl font-bold text-gray-800">
                        {week.topic}
                      </h2>
                    </div>

                    <ChevronRight
                      size={32}
                      className={`transition-transform ${openWeeks[weekKey] ? 'rotate-90' : ''}`}
                      style={{ color: colors[weekIndex % colors.length] }}
                    />
                  </button>

                  {/* Subtopics */}
                  {openWeeks[weekKey] && (
                    <div className="border-t border-gray-200 divide-y divide-gray-200">

                      {week.subtopics?.map((subtopic, subtopicIndex) => {
                        const subtopicNum = subtopicIndex + 1;

                        return (
                          <div key={subtopicIndex} className="p-6 hover:bg-gray-50">
                            <div className="flex gap-4">

                              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                                {subtopicNum}
                              </div>

                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-800 mb-2">
                                  {subtopic.subtopic}
                                </h3>

                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                  <Clock size={16} />
                                  {subtopic.time}
                                </div>

                                <p className="text-gray-600 mb-4">
                                  {subtopic.description}
                                </p>

                                <div className="flex gap-3">
                                  <button
                                    onClick={() => openResourcesModal(subtopic, weekNum, subtopicNum)}
                                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                                  >
                                    <Book size={16} className="inline mr-2" />
                                    Resources
                                  </button>

                                  <button
                                    onClick={() => startQuiz(weekNum, subtopicNum)}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                                  >
                                    Start Quiz
                                  </button>
                                </div>

                              </div>
                            </div>
                          </div>
                        );
                      })}

                    </div>
                  )}
                </div>
              );
            })}

        </div>
      </div>

      {/* Resources Modal */}
      {showResourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">

            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {currentSubtopic?.subtopic}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {currentSubtopic?.description}
                  </p>
                </div>

                <button
                  onClick={() => setShowResourceModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              {!resources ? (
                <div className="text-center py-12">
                  <button
                    onClick={generateResources}
                    disabled={loadingResources}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    {loadingResources ? 'Generating...' : '🤖 Generate AI Resources'}
                  </button>
                </div>
              ) : (
                <div className="prose max-w-none">
                  <Markdown>{resources}</Markdown>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapPage;        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {Object.keys(roadmapData?.roadmap_data || {})
            .sort((a, b) => parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]))
            .map((weekKey, weekIndex) => {
              const week = roadmapData.roadmap_data[weekKey];
              const weekNum = weekIndex + 1;
              return (
                <div key={weekKey} className="bg-white rounded-2xl shadow-md overflow-hidden">
                  {/* Week Header */}
                  <button
                    onClick={() => toggleWeek(weekKey)}
                    className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    style={{ borderLeft: `6px solid ${colors[weekIndex % colors.length]}` }}
                  >
                    <div className="text-left">
                      <h3 className="text-lg font-medium text-gray-600 capitalize">{weekKey}</h3>
                      <h2 className="text-2xl font-bold text-gray-800">{week.topic}</h2>
                    </div>
                    <ChevronRight
                      size={32}
                      className={`transition-transform ${openWeeks[weekKey] ? 'rotate-90' : ''}`}
                      style={{ color: colors[weekIndex % colors.length] }}
                    />
                  </button>

                  {/* Subtopics */}
                  {openWeeks[weekKey] && (
                    <div className="border-t border-gray-200 divide-y divide-gray-200">
                      {week.subtopics.map((subtopic, subtopicIndex) => {
                        const subtopicNum = subtopicIndex + 1;
                        const stat = quizStats[weekNum]?.[subtopicNum];
                        
                        return (
                          <div key={subtopicIndex} className="p-6 hover:bg-gray-50">
                            <div className="flex gap-4">
                              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                                {subtopicNum}
                              </div>
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-800 mb-2">
                                  {subtopic.subtopic}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                  <Clock size={16} />
                                  {subtopic.time}
                                </div>
                                <p className="text-gray-600 mb-4">{subtopic.description}</p>
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => openResourcesModal(subtopic, weekNum, subtopicNum)}
                                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                                  >
                                    <Book size={16} className="inline mr-2" />
                                    Resources
                                  </button>
                                  {stat ? (
                                    <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
                                      ✓ {((stat.numCorrect * 100) / stat.numQues).toFixed(0)}% in {(stat.timeTaken / 1000).toFixed(0)}s
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => startQuiz(weekNum, subtopicNum)}
                                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                                      data-testid={`start-quiz-button-${weekNum}-${subtopicNum}`}
                                    >
                                      Start Quiz
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Resources Modal */}
      {showResourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{currentSubtopic?.subtopic}</h2>
                  <p className="text-gray-600 mt-1">{currentSubtopic?.description}</p>
                </div>
                <button
                  onClick={() => setShowResourceModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {!resources ? (
                <div className="text-center py-12">
                  <button
                    onClick={generateResources}
                    disabled={loadingResources}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    {loadingResources ? 'Generating...' : '🤖 Generate AI Resources'}
                  </button>
                </div>
              ) : (
                <div className="prose max-w-none">
                  <Markdown>{resources}</Markdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapPage;
