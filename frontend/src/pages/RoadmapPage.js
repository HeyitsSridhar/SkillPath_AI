import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronRight, ChevronLeft, Book, Clock } from "lucide-react";
import Markdown from "react-markdown";

const API_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

const RoadmapPage = () => {
  const params = useParams();
  const topic = params.topic;
  const navigate = useNavigate();

  const [roadmapData, setRoadmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openWeeks, setOpenWeeks] = useState({});
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [currentSubtopic, setCurrentSubtopic] = useState(null);
  const [resources, setResources] = useState(null);
  const [loadingResources, setLoadingResources] = useState(false);

  const colors = [
    "#D14EC4",
    "#4ED1B1",
    "#D14E4E",
    "#4EAAD1",
    "#D1854E",
    "#904ED1",
    "#AFD14E",
  ];

  const fetchRoadmap = useCallback(async () => {
    try {
      const response = await axios.get(
        API_URL + "/api/roadmap/" + encodeURIComponent(topic)
      );
      setRoadmapData(response.data);
    } catch (error) {
      console.error("Failed to load roadmap", error);
      alert("Failed to load roadmap");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [topic, navigate]);

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  const toggleWeek = (weekKey) => {
    setOpenWeeks(function (prev) {
      return { ...prev, [weekKey]: !prev[weekKey] };
    });
  };

  const openResources = (subtopic) => {
    setCurrentSubtopic(subtopic);
    setShowResourceModal(true);
    setResources(null);
  };

  const generateResources = async () => {
    if (!currentSubtopic) return;

    setLoadingResources(true);

    try {
      const response = await axios.post(
        API_URL + "/api/generate-resources",
        {
          course: topic,
          description: currentSubtopic.description,
          time: currentSubtopic.time,
        }
      );

      if (response.data.resources) {
        setResources(response.data.resources);
      } else {
        setResources(JSON.stringify(response.data));
      }
    } catch (error) {
      console.error("Failed to generate resources", error);
      alert("Failed to generate resources");
    } finally {
      setLoadingResources(false);
    }
  };

  if (loading || !roadmapData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const weekKeys = Object.keys(roadmapData).sort(function (a, b) {
    return parseInt(a.split(" ")[1]) - parseInt(b.split(" ")[1]);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={24} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-gray-800">{topic}</h1>
            <p className="text-sm text-gray-600">Learning Roadmap</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        {weekKeys.map(function (weekKey, weekIndex) {
          const week = roadmapData[weekKey];

          return (
            <div
              key={weekKey}
              className="bg-white rounded-2xl shadow-md overflow-hidden"
            >
              {/* Week Header */}
              <button
                onClick={() => toggleWeek(weekKey)}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50"
                style={{
                  borderLeft:
                    "6px solid " + colors[weekIndex % colors.length],
                }}
              >
                <div className="text-left">
                  <h3 className="text-lg font-medium text-gray-600">
                    {weekKey}
                  </h3>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {week.topic}
                  </h2>
                </div>

                <ChevronRight
                  size={28}
                  className={
                    openWeeks[weekKey] ? "rotate-90 transition-transform" : ""
                  }
                />
              </button>

              {/* Subtopics */}
              {openWeeks[weekKey] && (
                <div className="border-t border-gray-200 divide-y divide-gray-200">
                  {(week.subtopics || []).map(function (
                    subtopic,
                    index
                  ) {
                    return (
                      <div key={index} className="p-6 hover:bg-gray-50">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                            {index + 1}
                          </div>

                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                              {subtopic.subtopic}
                            </h3>

                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <Clock size={16} />
                              {subtopic.time}
                            </div>

                            <p className="text-gray-600 mb-4">
                              {subtopic.description}
                            </p>

                            <button
                              onClick={() => openResources(subtopic)}
                              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg"
                            >
                              <Book size={16} className="inline mr-2" />
                              Resources
                            </button>
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

      {/* Resource Modal */}
      {showResourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between">
                <h2 className="text-xl font-bold">
                  {currentSubtopic.subtopic}
                </h2>
                <button
                  onClick={() => setShowResourceModal(false)}
                  className="text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              {!resources ? (
                <button
                  onClick={generateResources}
                  disabled={loadingResources}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg"
                >
                  {loadingResources
                    ? "Generating..."
                    : "Generate AI Resources"}
                </button>
              ) : (
                <div className="prose">
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
