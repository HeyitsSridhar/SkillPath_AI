import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Plus, ArrowRight, LogOut, User, Settings } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = process.env.REACT_APP_BACKEND_URL;

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const colors = [
    '#D14EC4',
    '#AFD14E',
    '#4ED1B1',
    '#D14E4E',
    '#D1854E',
    '#904ED1',
    '#4EAAD1',
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, roadmapsRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/stats`),
        axios.get(`${API_URL}/api/roadmaps`)
      ]);
      setStats(statsRes.data);
      setRoadmaps(roadmapsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = stats ? {
    labels: Object.keys(stats.progress),
    datasets: [
      {
        label: '% Completed',
        data: Object.values(stats.progress).map(
          (p) => (p.completed * 100) / (p.total || 1)
        ),
        backgroundColor: Object.keys(stats.progress).map(
          (_, i) => colors[i % colors.length]
        ),
      },
    ],
  } : null;

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  if (loading) {
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent" data-testid="dashboard-title">
            SkillPath AI
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProfileEdit(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="profile-settings-button"
            >
              <Settings size={20} />
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              data-testid="logout-button"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Profile Section */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800" data-testid="user-display-name">{user?.full_name || user?.username}</h2>
              <p className="text-gray-600">{user?.email}</p>
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-purple-600 font-medium">
                  Courses: <b>{stats?.total_courses || 0}</b>
                </span>
                <span className="text-blue-600 font-medium">
                  Quizzes: <b>{stats?.completed_quizzes || 0}</b>
                </span>
                <span className="text-green-600 font-medium">
                  Hardness Index: <b>{stats?.hardness_index?.toFixed(3) || '1.000'}</b>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* New Topic Button */}
        <button
          onClick={() => navigate('/topic')}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl shadow-lg p-6 mb-8 hover:shadow-xl transition-all transform hover:scale-[1.02]"
          data-testid="learn-new-button"
        >
          <div className="flex items-center justify-center gap-3">
            <Plus size={32} strokeWidth={2} />
            <h2 className="text-2xl font-bold">Learn Something New</h2>
          </div>
        </button>

        {/* Continue Learning Section */}
        {roadmaps.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Continue Learning</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roadmaps.map((roadmap, i) => (
                <div
                  key={roadmap.id}
                  onClick={() => navigate(`/roadmap/${encodeURIComponent(roadmap.topic)}`)}
                  className="bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-xl transition-all transform hover:scale-[1.02] relative overflow-hidden"
                  style={{ borderTop: `4px solid ${colors[i % colors.length]}` }}
                  data-testid={`roadmap-card-${i}`}
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{roadmap.topic}</h3>
                  <div className="text-sm text-gray-600 mb-1">{roadmap.time}</div>
                  <div className="text-sm text-gray-500 capitalize">{roadmap.knowledge_level}</div>
                  <ArrowRight
                    size={40}
                    className="absolute bottom-4 right-4 text-gray-300"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Chart */}
        {chartData && Object.keys(stats.progress).length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Progress</h2>
            <div className="max-w-3xl mx-auto" style={{ height: '400px' }}>
              <Bar
                data={chartData}
                options={{
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        callback: (value) => value + '%',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <ProfileEditModal
          user={user}
          onClose={() => setShowProfileEdit(false)}
          onUpdate={fetchDashboardData}
        />
      )}
    </div>
  );
};

const ProfileEditModal = ({ user, onClose, onUpdate }) => {
  const { updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    username: user.username,
    full_name: user.full_name || '',
    email: user.email,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await updateProfile(formData);
    if (result.success) {
      onUpdate();
      onClose();
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Edit Profile</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserDashboard;
