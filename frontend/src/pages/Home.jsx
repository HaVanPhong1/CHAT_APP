import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import { AuthContext } from '../context/AuthContext';
import { getSocket, disconnectSocket, apiRequest } from '../services/socketService';
import { LogOut } from 'lucide-react';
import { isForeignText, isForeignMessage } from '../utils/langUtils';

export default function Home() {
  const { user, logout } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [translations, setTranslations] = useState({});
  const [translating, setTranslating] = useState({});
  const [autoTranslate, setAutoTranslate] = useState(false);

  // Per-conversation custom settings (themeColor & fontSize apply ONLY to the active conversation)
  const [groupSettings, setGroupSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(`chat_group_settings_${user?.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const updateGroupSettings = (newSettings) => {
    if (!selectedGroup) return;
    setGroupSettings(prev => {
      const key = selectedGroup._id;
      const updated = {
        ...prev,
        [key]: {
          ...(prev[key] || { themeColor: '#0084ff', fontSize: '15px' }),
          ...newSettings
        }
      };
      try {
        localStorage.setItem(`chat_group_settings_${user?.id}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleRenameGroup = async (groupId, newName) => {
    try {
      await apiRequest(`/api/groups/${groupId}`, 'PUT', { name: newName });
      setGroups(prev => prev.map(g => g._id === groupId ? { ...g, name: newName } : g));
      setSelectedGroup(prev => prev && prev._id === groupId ? { ...prev, name: newName } : prev);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSetDmNickname = (conversationId, nickname) => {
    setConversations(prev => prev.map(c => c._id === conversationId ? { ...c, nickname } : c));
    setSelectedConversation(prev => prev && prev._id === conversationId ? { ...prev, nickname } : prev);
  };

  const [showMobileSidebar, setShowMobileSidebar] = useState(true);

  const handleMobileSelectGroup = (g) => {
    const sameGroup = selectedGroup?._id === g._id && activeTab === 'group';
    if (!sameGroup) { setMessages([]); setTranslations({}); }
    setSelectedConversation(null);
    setSelectedGroup(prev => (prev?._id === g._id ? prev : g));
    setActiveTab('group');
    setShowMobileSidebar(false);
  };

  const handleMobileSelectConversation = (c) => {
    const sameConv = selectedConversation?._id === c._id && activeTab === 'dm';
    if (!sameConv) { setMessages([]); setTranslations({}); }
    setSelectedGroup(null);
    setSelectedConversation(prev => (prev?._id === c._id ? prev : c));
    setActiveTab('dm');
    setShowMobileSidebar(false);
  };

  const handleMobileOpenDm = async (username, providedConv) => {
    try {
      let conv = providedConv;
      if (!conv) conv = await apiRequest('/api/dm/start', 'POST', { username });
      const existing = conversations.find(c => c._id === conv._id);
      const target = existing || conv;
      setSelectedGroup(null);
      setSelectedConversation(prev => (prev?._id === target._id ? prev : target));
      if (!(existing && activeTab === 'dm')) {
        setMessages([]);
        setTranslations({});
        setActiveTab('dm');
      }
      loadConversations();
      setShowMobileSidebar(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBackToSidebar = () => {
    setShowMobileSidebar(true);
  };

  const currentChatThemeColor = (selectedGroup && groupSettings[selectedGroup._id]?.themeColor) || '#0084ff';
  const currentChatFontSize = (selectedGroup && groupSettings[selectedGroup._id]?.fontSize) || '15px';

  const socketRef = useRef(null);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Load groups
  const loadGroups = useCallback(async () => {
    try {
      const data = await apiRequest('/api/groups');
      const nicknames = (() => {
        try {
          const saved = localStorage.getItem(`chat_group_nicknames_${user?.id}`);
          return saved ? JSON.parse(saved) : {};
        } catch (e) {
          return {};
        }
      })();
      const groupsWithNicknames = (data || []).map(g => ({
        ...g,
        nickname: nicknames[g._id] || null
      }));
      setGroups(groupsWithNicknames);
    } catch (err) {
      console.error(err);
    }
  }, [user?.id]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await apiRequest('/api/dm');
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadFriendRequests = useCallback(async () => {
    try {
      const data = await apiRequest('/api/friends/requests');
      setFriendRequests(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadFriends = useCallback(async () => {
    try {
      const data = await apiRequest('/api/friends/list');
      setFriends(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadGroups();
    loadConversations();
    loadFriendRequests();
    loadFriends();
  }, [loadGroups, loadConversations, loadFriendRequests, loadFriends]);

  useEffect(() => {
    setSelectedGroup(null);
    setSelectedConversation(null);
    setMessages([]);
  }, [user?.id]);

  // Socket setup
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on('receive_message', (msg) => {
      setMessages(prev => {
        if (msg.replaceTempId) {
          const idx = prev.findIndex(m => m._id === msg.replaceTempId);
          if (idx !== -1) {
            const next = prev.slice();
            next[idx] = { ...msg };
            return next;
          }
        }
        if (prev.find(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('receive_dm', (msg) => {
      setMessages(prev => {
        if (prev.find(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('friend_request_incoming', (req) => {
      setFriendRequests(prev => {
        if (prev.find(r => r._id === req._id)) return prev;
        return [req, ...prev];
      });
    });

    socket.on('friend_request_resolved', () => {
      loadFriends();
      loadConversations();
      loadFriendRequests();
    });

    socket.on('message_edited', ({ messageId, newText, isEdited }) => {
      setMessages(prev => prev.map(m => ((m._id === messageId || m.id === messageId) ? { ...m, text: newText, isEdited: true } : m)));
    });

    socket.on('message_deleted', ({ messageId }) => {
      setMessages(prev => prev.filter(m => (m._id !== messageId && m.id !== messageId)));
    });

    return () => {
      socket.off('receive_message');
      socket.off('receive_dm');
      socket.off('message_edited');
      socket.off('message_deleted');
      socket.off('friend_request_incoming');
      socket.off('friend_request_resolved');
    };
  }, []);

  // Load messages when active conversation changes
  const activeConvId = activeTab === 'group' ? selectedGroup?._id : selectedConversation?._id;
  const activeConvType = activeTab;
  useEffect(() => {
    if (!activeConvId || !socketRef.current) return;
    socketRef.current.emit(activeTab === 'group' ? 'join_group' : 'join_dm', activeConvId);
    setTranslations({});
    loadMessages(activeConvId, activeTab, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId, activeTab]);

  const messagesRef = useRef([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const loadMessages = async (id, type, force = false) => {
    try {
      if (!force && messagesRef.current.length > 0) return;
      const endpoint = type === 'group' ? `/api/messages/${id}` : `/api/dm/${id}/messages`;
      const data = await apiRequest(endpoint);
      const current = activeTab === 'group' ? selectedGroup?._id : selectedConversation?._id;
      if (current !== id) return;
      setMessages(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Translation via Google Translate
  const handleTranslate = async (msg) => {
    const id = msg._id || msg.id;
    if (!msg.text || translations[id]) return;
    setTranslating(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=${encodeURIComponent(msg.text)}`);
      if (res.ok) {
        const data = await res.json();
        const translatedText = data[0]?.map(item => item[0]).join('') || msg.text;
        setTranslations(prev => ({ ...prev, [id]: translatedText }));
      } else {
        setTranslations(prev => ({ ...prev, [id]: msg.text }));
      }
    } catch (err) {
      console.error('Translate error:', err);
    } finally {
      setTranslating(prev => ({ ...prev, [id]: false }));
    }
  };

  // Auto-translate if toggle is ON
  useEffect(() => {
    if (autoTranslate) {
      messages.forEach(msg => {
        const id = msg._id || msg.id;
        if (isForeignMessage(msg) && !translations[id] && !translating[id]) {
          handleTranslate(msg);
        }
      });
    }
  }, [messages, autoTranslate]);

  const handleSendMessage = (rawText, replyTo = null) => {
    if (!rawText.trim()) return;
    if (activeTab === 'group' && selectedGroup) {
      const isForeign = isForeignText(rawText);
      socketRef.current?.emit('send_message', {
        groupId: selectedGroup._id,
        senderId: user.id,
        text: rawText,
        lang: isForeign ? 'en' : 'vi',
        replyTo: replyTo || null
      });
    } else if (activeTab === 'dm' && selectedConversation) {
      socketRef.current?.emit('send_dm', {
        conversationId: selectedConversation._id,
        text: rawText
      });
    }
  };

  const handleEditMessage = (messageId, newText) => {
    if (activeTab !== 'group' || !selectedGroup || !newText.trim()) return;
    socketRef.current?.emit('edit_message', {
      messageId,
      groupId: selectedGroup._id,
      newText
    });
    setMessages(prev => prev.map(m => ((m._id === messageId || m.id === messageId) ? { ...m, text: newText, isEdited: true } : m)));
  };

  const handleDeleteMessage = (messageId) => {
    if (activeTab !== 'group' || !selectedGroup) return;
    socketRef.current?.emit('delete_message', {
      messageId,
      groupId: selectedGroup._id
    });
    setMessages(prev => prev.filter(m => (m._id !== messageId && m.id !== messageId)));
  };

  const handleSendFile = async (file) => {
    if (activeTab !== 'group' || !selectedGroup) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('groupId', selectedGroup._id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/messages/upload/${selectedGroup._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Lỗi tải tệp (${res.status})`);
      }
      const data = await res.json();
      setMessages(prev => {
        if (prev.find(m => (m._id === data._id || m.id === data._id))) return prev;
        return [...prev, data];
      });
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Tải tệp/ghi âm thất bại: ' + err.message);
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    logout();
  };

  return (
    <div className="app-layout">
      {/* Left Panel */}
      <div className={`app-sidebar ${!showMobileSidebar ? 'hidden-mobile' : ''}`}>
        {/* User Profile */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#ffffff', padding: '12px 14px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #0084ff, #00b4d8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 'bold', fontSize: '15px', flexShrink: 0
            }}>
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '600', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                {user?.username}
              </div>
              <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                Trực tuyến
              </div>
            </div>
            <button onClick={handleLogout} title="Đăng xuất" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '6px', borderRadius: '6px' }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Sidebar groups */}
        <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>
          <Sidebar
            groups={groups}
            conversations={conversations}
            friends={friends}
            friendRequests={friendRequests}
            onFriendRequestsChange={loadFriendRequests}
            activeTab={activeTab}
            onChangeTab={(t) => {
              if (activeTab !== t) { setActiveTab(t); setMessages([]); setTranslations({}); }
            }}
            selectedGroup={selectedGroup}
            selectedConversation={selectedConversation}
            onSelectGroup={handleMobileSelectGroup}
            onSelectConversation={handleMobileSelectConversation}
            onOpenDm={handleMobileOpenDm}
            onGroupsChange={loadGroups}
            onConversationsChange={loadConversations}
            onDeleteGroup={async (groupId) => {
              try {
                await apiRequest(`/api/groups/${groupId}`, 'DELETE');
                setSelectedGroup(null);
                setMessages([]);
                loadGroups();
              } catch (err) {
                alert(err.message);
              }
            }}
            onLeaveGroup={async (groupId) => {
              try {
                await apiRequest(`/api/groups/${groupId}/leave`, 'POST');
                setSelectedGroup(null);
                setMessages([]);
                loadGroups();
              } catch (err) {
                alert(err.message);
              }
            }}
            onDeleteConversation={async (conversationId) => {
              try {
                await apiRequest(`/api/dm/${conversationId}`, 'DELETE');
                setSelectedConversation(null);
                setMessages([]);
                loadConversations();
              } catch (err) {
                alert(err.message);
              }
            }}
          />
        </div>
      </div>

      {/* Chat Area with per-conversation color & font size */}
      <div className={`app-chat-area ${showMobileSidebar ? 'hidden-mobile' : ''}`}>
        <ChatArea
          messages={messages}
          translations={translations}
          translating={translating}
          autoTranslate={autoTranslate}
          setAutoTranslate={setAutoTranslate}
          onSendMessage={handleSendMessage}
          onTranslate={handleTranslate}
          onSendFile={handleSendFile}
          selectedGroup={activeTab === 'group' ? selectedGroup : (selectedConversation ? { _id: selectedConversation._id, name: selectedConversation.nickname || selectedConversation.other?.username || 'Chat', isDm: true, conversationId: selectedConversation._id } : null)}
          currentUser={user}
          chatThemeColor={currentChatThemeColor}
          chatFontSize={currentChatFontSize}
          onUpdateChatSettings={updateGroupSettings}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onLeaveGroup={async (groupId) => {
            try {
              await apiRequest(`/api/groups/${groupId}/leave`, 'POST');
              setSelectedGroup(null);
              setMessages([]);
              loadGroups();
            } catch (err) {
              alert(err.message);
            }
          }}
          onDeleteConversation={async (groupId) => {
            try {
              await apiRequest(`/api/groups/${groupId}`, 'DELETE');
              setSelectedGroup(null);
              setMessages([]);
              loadGroups();
            } catch (err) {
              alert(err.message);
            }
          }}
          onRenameGroup={handleRenameGroup}
          onSetDmNickname={handleSetDmNickname}
          onBackToSidebar={handleBackToSidebar}
        />
      </div>
    </div>
  );
}
