import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import { Plus, LogOut } from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const statsRes = await axios.get(API_URL + "/api/dashboard/stats");
      const roadmapRes = await axios.get(API_URL + "/api/roadmaps");
      setStats(statsRes.data);
      setRoadmaps(roadmapRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const chartData =
    stats && stats.total_courses > 0
      ? {
          labels: ["Courses"],
          datasets: [
            {
              label: "Courses Created",
              data: [stats.total_courses],
              backgroundColor: ["#8A2BE2"],
            },
          ],
        }
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-700">
            SkillPath AI
          </h1>

          <div className="flex gap-4">
            <button
              onClick={() => navigate("/topic")}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold shadow-md hover:shadow-xl transition-all duration-200"
            >
              <Plus size={18} className="inline mr-2" />
              New Topic
            </button>

            <button
              onClick={handleLogout}
              className="px-5 py-2 bg-red-100 text-red-600 rounded-xl font-medium hover:bg-red-200 transition"
            >
              <LogOut size={18} className="inline mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Profile */}
        <div className="bg-white p-6 rounded-2xl shadow-md mb-8">
          <h2 className="text-xl font-bold mb-2">
            {user?.full_name || user?.username}
          </h2>
          <p className="text-gray-600">{user?.email}</p>

          <div className="flex gap-8 mt-4 text-sm">
            <div>
              Courses: <b>{stats?.total_courses || 0}</b>
            </div>
            <div>
              Quizzes: <b>{stats?.completed_quizzes || 0}</b>
            </div>
            <div>
              Hardness Index:{" "}
              <b>{stats?.hardness_index?.toFixed(2) || "1.00"}</b>
            </div>
          </div>
        </div>

        {/* Continue Learning */}
        {roadmaps.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4">
              Continue Learning
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {roadmaps.map((r, i) => (
                <div
                  key={i}
                  onClick={() =>
                    navigate("/roadmap/" + encodeURIComponent(r.topic))
                  }
                  className="bg-white p-6 rounded-2xl shadow-md cursor-pointer hover:shadow-xl transition-all duration-200"
                >
                  <h3 className="font-bold text-lg">{r.topic}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {r.time}
                  </p>
                  <p className="text-sm text-gray-600 capitalize">
                    {r.knowledge_level}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData && (
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-bold mb-6">
              Progress Overview
            </h2>

            <div style={{ height: "300px" }}>
              <Bar
                data={chartData}
                options={{
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
