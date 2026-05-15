import React, { useState } from 'react';
import { UserPlus, Search, LogOut, Check, X, Copy } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ user, friends, onlineUsers, activeChat, setActiveChat, fetchFriends, API_URL }) => {
  const [friendCode, setFriendCode] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { logout } = useAuth();

  const handleAddFriend = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await axios.post(`${API_URL}/friends/add`, { friendCode }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessage('Request sent!');
      setFriendCode('');
      fetchFriends();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add friend');
    }
    setTimeout(() => { setMessage(''); setError(''); }, 3000);
  };

  const handleAcceptFriend = async (friendshipId) => {
    try {
      await axios.post(`${API_URL}/friends/accept`, { friendshipId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchFriends();
    } catch (err) {
      console.error(err);
    }
  };

  const copyFriendCode = () => {
    navigator.clipboard.writeText(user.friend_code);
    setMessage('Code copied!');
    setTimeout(() => setMessage(''), 2000);
  };

  const filteredFriends = friends.filter(f => f.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-80 h-full border-r border-cyber-accent/20 bg-cyber-bg/95 flex flex-col backdrop-blur-xl z-10 shrink-0">
      {/* Current User Profile */}
      <div className="p-4 border-b border-cyber-accent/20 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden border border-cyber-accent shrink-0 relative">
          <img 
            src={user.avatar ? user.avatar : `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`} 
            alt="Avatar" 
            className="w-full h-full object-cover" 
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-black shadow-[0_0_5px_#22c55e]"></div>
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="font-bold text-white truncate">{user.username}</h3>
          <div 
            onClick={copyFriendCode}
            className="text-xs text-cyber-accent flex items-center gap-1 cursor-pointer hover:text-white transition-colors group"
          >
            <span>{user.friend_code}</span>
            <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <button onClick={logout} className="p-2 hover:bg-red-500/20 text-red-500 rounded-full transition-colors">
          <LogOut size={18} />
        </button>
      </div>

      {/* Add Friend */}
      <div className="p-4 border-b border-cyber-accent/10">
        <form onSubmit={handleAddFriend} className="flex gap-2 relative">
          <input 
            type="text" 
            placeholder="Friend Code (e.g. JOHN-12345)" 
            className="glass-input flex-1 py-2 px-3 text-sm rounded-lg"
            value={friendCode}
            onChange={e => setFriendCode(e.target.value)}
          />
          <button type="submit" className="glass-button px-3 rounded-lg flex items-center justify-center">
            <UserPlus size={18} />
          </button>
        </form>
        {message && <p className="text-green-400 text-xs mt-2">{message}</p>}
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      {/* Search Friends */}
      <div className="p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
          <input 
            type="text" 
            placeholder="Search friends..." 
            className="w-full bg-black/40 border border-cyber-accent/20 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-cyber-accent text-white transition-colors"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Friend List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        <div className="px-2 text-xs font-bold text-cyber-muted uppercase tracking-wider mb-2">Contacts</div>
        
        {filteredFriends.length === 0 ? (
          <div className="text-center text-cyber-muted text-sm py-4">No friends found</div>
        ) : (
          filteredFriends.map(friend => {
            const isOnline = onlineUsers.includes(friend.id);
            const isPending = friend.status === 'pending';
            const isRequester = friend.requester_id === user.id;

            return (
              <div 
                key={friend.friendship_id}
                onClick={() => !isPending && setActiveChat(friend)}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${activeChat?.id === friend.id ? 'bg-cyber-accent/20 border border-cyber-accent/30' : 'hover:bg-white/5 border border-transparent'}`}
              >
                <div className="relative w-10 h-10 rounded-full shrink-0 border border-cyber-muted/30">
                  <img 
                    src={friend.avatar ? friend.avatar : `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.username}`} 
                    alt="Avatar" 
                    className="w-full h-full object-cover rounded-full" 
                  />
                  {!isPending && (
                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${isOnline ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-gray-500'}`}></div>
                  )}
                </div>
                
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-semibold text-white truncate">{friend.username}</div>
                  <div className="text-xs text-cyber-muted truncate">
                    {isPending ? (isRequester ? 'Request Sent' : 'Pending Request') : (isOnline ? 'Online' : 'Offline')}
                  </div>
                </div>

                {isPending && !isRequester && (
                  <div className="flex gap-1 shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleAcceptFriend(friend.friendship_id); }}
                      className="p-1.5 bg-green-500/20 text-green-500 rounded hover:bg-green-500/40"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Sidebar;
