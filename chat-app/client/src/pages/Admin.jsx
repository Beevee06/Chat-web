import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ADMIN_TOKEN_KEY = 'admin_token';

const formatBytes = (value) => {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  return `${size.toFixed(1)} ${units[idx]}`;
};

const Admin = () => {
  const { API_URL } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem(ADMIN_TOKEN_KEY));
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [backupMessage, setBackupMessage] = useState('');
  const [logs, setLogs] = useState([]);
  const [logType, setLogType] = useState('combined');
  const [logLines, setLogLines] = useState(200);
  const [logsLoading, setLogsLoading] = useState(false);

  const authHeaders = useMemo(() => ({
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  }), [token]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/stats`, authHeaders);
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load stats');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/users`, authHeaders);
      setUsers(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/logs`, {
        ...authHeaders,
        params: { type: logType, lines: logLines }
      });
      setLogs(res.data?.lines || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchStats();
    fetchUsers();
    fetchLogs();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchLogs();
  }, [token, logType, logLines]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/admin/login`, { username, password });
      localStorage.setItem(ADMIN_TOKEN_KEY, res.data.token);
      setToken(res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
    setStats(null);
    setUsers([]);
    setLogs([]);
  };

  const handleDeleteUser = async (userId) => {
    const confirmDelete = window.confirm('Delete this user and all related data?');
    if (!confirmDelete) return;
    try {
      await axios.delete(`${API_URL}/admin/users/${userId}`, authHeaders);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleBackup = async () => {
    setBackupMessage('');
    try {
      const res = await axios.post(`${API_URL}/admin/backup`, {}, authHeaders);
      setBackupMessage(res.data?.message || 'Backup started');
    } catch (err) {
      setBackupMessage(err.response?.data?.error || 'Backup failed');
    }
  };

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(search.toLowerCase())
  );

  if (!token) {
    return (
      <div className="w-full h-screen bg-cyber-bg text-cyber-text flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="glass-panel w-full max-w-md p-8 rounded-2xl space-y-4">
          <h1 className="text-2xl font-display text-white">Admin Console</h1>
          <p className="text-sm text-cyber-muted">Sign in with the admin account configured on the server.</p>
          {error && <div className="text-sm text-red-300">{error}</div>}
          <input
            className="glass-input w-full rounded-lg px-4 py-2"
            placeholder="Admin username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            className="glass-input w-full rounded-lg px-4 py-2"
            placeholder="Admin password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="glass-button w-full py-2 rounded-lg font-semibold"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-cyber-bg text-cyber-text p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display text-white">Admin Console</h1>
            <p className="text-cyber-muted">Overview of users and system health.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="glass-button px-4 py-2 rounded-lg" onClick={fetchStats}>Refresh</button>
            <button className="glass-button px-4 py-2 rounded-lg" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {error && <div className="text-sm text-red-300">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="glass-panel p-4 rounded-xl">
            <div className="text-xs uppercase tracking-[0.2em] text-cyber-muted">Users</div>
            <div className="text-2xl font-display text-white">{stats?.users ?? '--'}</div>
          </div>
          <div className="glass-panel p-4 rounded-xl">
            <div className="text-xs uppercase tracking-[0.2em] text-cyber-muted">Online</div>
            <div className="text-2xl font-display text-white">{stats?.onlineUsers ?? '--'}</div>
          </div>
          <div className="glass-panel p-4 rounded-xl">
            <div className="text-xs uppercase tracking-[0.2em] text-cyber-muted">Messages</div>
            <div className="text-2xl font-display text-white">{stats?.messages ?? '--'}</div>
          </div>
          <div className="glass-panel p-4 rounded-xl">
            <div className="text-xs uppercase tracking-[0.2em] text-cyber-muted">Pending Requests</div>
            <div className="text-2xl font-display text-white">{stats?.pendingRequests ?? '--'}</div>
          </div>
          <div className="glass-panel p-4 rounded-xl">
            <div className="text-xs uppercase tracking-[0.2em] text-cyber-muted">Uploads</div>
            <div className="text-2xl font-display text-white">{stats?.uploadsCount ?? '--'}</div>
          </div>
          <div className="glass-panel p-4 rounded-xl">
            <div className="text-xs uppercase tracking-[0.2em] text-cyber-muted">Storage</div>
            <div className="text-sm text-cyber-text">Uploads: {formatBytes(stats?.storage?.uploadsBytes)}</div>
            <div className="text-sm text-cyber-text">Database: {formatBytes(stats?.storage?.databaseBytes)}</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-display text-white">Users</h2>
            <div className="flex items-center gap-2">
              <input
                className="glass-input rounded-lg px-3 py-2"
                placeholder="Search user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="glass-button px-4 py-2 rounded-lg" onClick={fetchUsers}>Reload</button>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-cyber-muted">
                <tr>
                  <th className="text-left py-2">User</th>
                  <th className="text-left py-2">Friend Code</th>
                  <th className="text-left py-2">Created</th>
                  <th className="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-white/5">
                    <td className="py-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar ? user.avatar : `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                          alt={user.username}
                          className="w-8 h-8 rounded-full border border-cyber-accent/30"
                        />
                        <div>
                          <div className="text-white font-medium">{user.username}</div>
                          <div className="text-xs text-cyber-muted">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 text-cyber-text">{user.friend_code}</td>
                    <td className="py-2 text-cyber-text">{user.created_at}</td>
                    <td className="py-2 text-right">
                      <button
                        className="text-red-300 hover:text-red-200"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-cyber-muted">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-display text-white">Logs</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="glass-input rounded-lg px-3 py-2"
                value={logType}
                onChange={(e) => setLogType(e.target.value)}
              >
                <option value="combined">Combined</option>
                <option value="error">Error</option>
              </select>
              <input
                className="glass-input rounded-lg px-3 py-2 w-24"
                type="number"
                min="50"
                max="1000"
                value={logLines}
                onChange={(e) => setLogLines(Number(e.target.value) || 200)}
              />
              <button className="glass-button px-4 py-2 rounded-lg" onClick={fetchLogs}>
                {logsLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 max-h-72 overflow-auto">
            {logs.length === 0 ? (
              <p className="text-sm text-cyber-muted">No logs yet.</p>
            ) : (
              <pre className="text-xs text-cyber-muted whitespace-pre-wrap">{logs.join('\n')}</pre>
            )}
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display text-white">Backup</h2>
            <p className="text-sm text-cyber-muted">Create a manual backup of the SQLite database.</p>
            {backupMessage && <p className="text-sm text-cyber-text mt-2">{backupMessage}</p>}
          </div>
          <button className="glass-button px-4 py-2 rounded-lg" onClick={handleBackup}>Run Backup</button>
        </div>
      </div>
    </div>
  );
};

export default Admin;
