import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronRight, ChevronLeft, Book, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";

const API_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

function RoadmapPage() {
  const { topic } = useParams();
  const navigate = useNavigate();

  const [roadmapData, setRoadmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openWeeks, setOpenWeeks] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [currentSubtopic, setCurrentSubtopic] = useState(null);
  const [resources, setResources] = useState(null);
  const [loadingResources, setLoadingResources] = useState(false);

  useEffect(() => {
    async function fetchRoadmap() {
      try {
        const res = await axios.get(
          API_URL + "/api/roadmap/" + encodeURIComponent(topic)
        );
        setRoadmapData(res.data);
      } catch (err) {
        console.error(err);
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    }

    fetchRoadmap();
  }, [topic, navigate]);

  const toggleWeek = (key) => {
    setOpenWeeks((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const generateResources = async () => {
    if (!currentSubtopic) return;

    setLoadingResources(true);

    try {
      const res = await axios.post(API_URL + "/api/generate-resources", {
        course: topic,
        description: currentSubtopic.description,
        time: currentSubtopic.time,
      });

      setResources(res.data.resources || JSON.stringify(res.data));
    } catch (err) {
      console.error(err);
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

  const weekKeys = Object.keys(roadmapData);

  return (
    <div className="min-h-screen p-6">
      <button onClick={() => navigate("/dashboard")}>
        <ChevronLeft /> Back
      </button>

      <h1 className="text-3xl font-bold mb-6">{topic}</h1>

      {weekKeys.map((weekKey) => {
        const week = roadmapData[weekKey];

        return (
          <div key={weekKey} className="border rounded p-4 mb-4">
            <button onClick={() => toggleWeek(weekKey)}>
              <ChevronRight />
              {weekKey} - {week.topic}
            </button>

            {openWeeks[weekKey] &&
              week.subtopics.map((sub, i) => (
                <div key={i} className="mt-3 pl-4">
                  <h3 className="font-bold">{sub.subtopic}</h3>
                  <p>{sub.description}</p>
                  <p>
                    <Clock size={14} /> {sub.time}
                  </p>

                  <button
                    onClick={() => {
                      setCurrentSubtopic(sub);
                      setShowModal(true);
                      setResources(null);
                    }}
                    className="mt-2"
                  >
                    <Book size={14} /> Resources
                  </button>
                </div>
              ))}
          </div>
        );
      })}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded w-2/3">
            <h2 className="text-xl font-bold mb-4">
              {currentSubtopic?.subtopic}
            </h2>

            {!resources ? (
              <button
                onClick={generateResources}
                disabled={loadingResources}
              >
                {loadingResources ? "Generating..." : "Generate Resources"}
              </button>
            ) : (
              <ReactMarkdown>{resources}</ReactMarkdown>
            )}

            <button
              className="mt-4"
              onClick={() => setShowModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoadmapPage;
