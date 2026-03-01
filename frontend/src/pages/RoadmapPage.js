import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronRight, ChevronLeft, Book, Clock } from "lucide-react";
import Markdown from "react-markdown";

const API_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

const RoadmapPage = () => {
  const { topic } = useParams();
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
    setOpenWeeks((prev) => ({
      ...prev,
      [weekKey]: !prev[weekKey],
    }));
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

      setResources(response.data.resources);
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
        Loading...
      </div>
    );
  }

  const weekKeys = Object.keys(roadmapData).sort((a, b) => {
    const numA = parseInt(a.split(" ")[1]);
    const numB = parseInt(b.split(" ")[1]);
    return numA - numB;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={24} />
          </button>

          <div>
            <h1 className="text-2xl font-bold">{topic}</h1>
            <p className="text-sm text-gray-600">
              Learning Roadmap
            </p>
          </div>
        </div>
      </header>

      {/* Weeks */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {weekKeys.map((weekKey, weekIndex) => {
          const week = roadmapData[weekKey];

          return (
            <div
              key={weekKey}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              <button
                onClick={() => toggleWeek(weekKey)}
                className="w-full p-6 flex justify-between items-center"
                style={{
                  borderLeft:
                    "6px solid " + colors[weekIndex % colors.length],
                }}
              >
                <div className="text-left">
                  <h3 className="text-lg font-medium text-gray-600">
                    {weekKey}
                  </h3>
                  <h2 className="text-xl font-bold">
                    {week.topic}
                  </h2>
                </div>

                <ChevronRight
                  size={28}
                  className={
                    openWeeks[weekKey]
                      ? "rotate-90 transition-transform"
                      : ""
                  }
                />
              </button>

              {openWeeks[weekKey] && (
                <div className="border-t divide-y">
                  {(week.subtopics || []).map(
                    (subtopic, index) => (
                      <div
                        key={index}
                        className="p-6 hover:bg-gray-50"
                      >
                        <h3 className="font-bold text-lg mb-2">
                          {index + 1}. {subtopic.subtopic}
                        </h3>

                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <Clock size={16} />
                          {subtopic.time}
                        </div>

                        <p className="text-gray-700 mb-4">
                          {subtopic.description}
                        </p>

                        <button
                          onClick={() =>
                            openResources(subtopic)
                          }
                          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg"
                        >
                          <Book size={16} className="inline mr-2" />
                          Resources
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Resources Modal */}
      {showResourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between">
              <h2 className="font-bold text-lg">
                {currentSubtopic?.subtopic}
              </h2>
              <button
                onClick={() => setShowResourceModal(false)}
                className="text-xl"
              >
                ×
              </button>
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
