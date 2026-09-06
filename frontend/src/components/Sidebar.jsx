import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { apiRequest } from '../services/socketService';
import { Plus, Users, User as UserIcon, X, Search, Bell, Check, MessageCircle } from 'lucide-react';

export default function Sidebar({
  groups,
  conversations,
  friends,
  activeTab,
  onChangeTab,
  selectedGroup,
  selectedConversation,
  onSelectGroup,
  onSelectConversation,
  onGroupsChange,
  onConversationsChange,
  friendRequests,
  onFriendRequestsChange,
  onOpenDm,
  onDeleteGroup,
  onLeaveGroup,
  onDeleteConversation
}) {
  const { user } = useContext(AuthContext);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showStartDm, setShowStartDm] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [actionMsg, setActionMsg] = useState({});
  const [ctxMenu, setCtxMenu] = useState(null);
  const bellRef = useRef(null);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter(g => g.name.toLowerCase().includes(q));
  }, [groups, searchQuery]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c => c.other?.username?.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const isOwner = selectedGroup && selectedGroup.ownerId === user?.id;

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreating(true);
    try {
      await apiRequest('/api/groups', 'POST', { name: newGroupName });
      setNewGroupName('');
      setShowCreateGroup(false);
      onGroupsChange();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const sendFriendRequest = async (username) => {
    setActionMsg(prev => ({ ...prev, [username]: 'Đang gửi...' }));
    try {
      await apiRequest('/api/friends/request', 'POST', { username });
      setActionMsg(prev => ({ ...prev, [username]: '✅ Đã gửi lời mời' }));
      setTimeout(() => setActionMsg(prev => { const n = { ...prev }; delete n[username]; return n; }), 2500);
    } catch (err) {
      setActionMsg(prev => ({ ...prev, [username]: `❌ ${err.message}` }));
      setTimeout(() => setActionMsg(prev => { const n = { ...prev }; delete n[username]; return n; }), 3000);
    }
  };

  const startDmWithFriend = (friend) => {
    setShowStartDm(false);
    setUserResults([]);
    setSearchQuery('');
    onOpenDm(friend.username);
  };

  const searchUsers = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setUserResults([]); return; }
    try {
      const list = await apiRequest(`/api/auth/search?q=${encodeURIComponent(q)}`);
      setUserResults((list || []).filter(u => u.username !== user.username));
    } catch (e) {
      setUserResults([]);
    }
  };

  const respondRequest = async (id, action) => {
    try {
      const data = await apiRequest(`/api/friends/${id}/respond`, 'POST', { action });
      onFriendRequestsChange();
      onConversationsChange();
      if (data.conversation) {
        setShowFriendRequests(false);
        onOpenDm(null, data.conversation);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Click outside to close friend requests dropdown
  useEffect(() => {
    if (!showFriendRequests) return;
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowFriendRequests(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFriendRequests]);

  // Click outside to close ctx menu
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = () => setCtxMenu(null);
    document.addEventListener('mousedown', handler);
    document.addEventListener('scroll', handler, true);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('scroll', handler, true);
    };
  }, [ctxMenu]);

  const handleItemContextMenu = (e, type, item) => {
    e.preventDefault();
    setCtxMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      item
    });
  };

  const renderCtxMenu = () => {
    if (!ctxMenu) return null;
    const { type, item } = ctxMenu;
    const isGroup = type === 'group';
    const isOwnerGroup = isGroup && item.ownerId === user?.id;
    return (
      <div onMouseDown={e => e.stopPropagation()} style={{
        position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 2000,
        background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)', padding: '4px', minWidth: '180px'
      }}>
        {isGroup && isOwnerGroup && (
          <CtxButton color="#ef4444" onClick={() => {
            if (confirm(`Xóa nhóm "${item.name}"? Tất cả tin nhắn sẽ bị mất.`)) {
              onDeleteGroup?.(item._id);
            }
            setCtxMenu(null);
          }}>🗑 Xóa nhóm</CtxButton>
        )}
        {isGroup && !isOwnerGroup && (
          <CtxButton color="#ef4444" onClick={() => {
            if (confirm(`Rời nhóm "${item.name}"?`)) {
              onLeaveGroup?.(item._id);
            }
            setCtxMenu(null);
          }}>🚪 Rời nhóm</CtxButton>
        )}
        {!isGroup && (
          <CtxButton color="#ef4444" onClick={() => {
            if (confirm(`Xóa cuộc trò chuyện với ${item.other?.username}?`)) {
              onDeleteConversation?.(item._id);
            }
            setCtxMenu(null);
          }}>🗑 Xóa cuộc trò chuyện</CtxButton>
        )}
      </div>
    );
  };

  const renderList = () => {
    if (activeTab === 'group') {
      if (filteredGroups.length === 0) return <Empty text={searchQuery ? 'Không tìm thấy nhóm.' : 'Chưa có nhóm nào. Hãy tạo nhóm đầu tiên!'} />;
      return filteredGroups.map(g => {
        const displayName = g.nickname || g.name;
        return (
          <Item key={g._id} active={selectedGroup?._id === g._id} onClick={() => onSelectGroup(g)}
            onContextMenu={(e) => handleItemContextMenu(e, 'group', g)}
            letter={displayName.charAt(0).toUpperCase()} title={displayName} sub={`${g.members?.length || 0} thành viên`} iconType="group" />
        );
      });
    }
    if (activeTab === 'dm') {
      if (filteredConversations.length === 0) return <Empty text={searchQuery ? 'Không tìm thấy.' : 'Chưa có cuộc trò chuyện riêng. Nhấn + để bắt đầu.'} />;
      return filteredConversations.map(c => {
        const displayName = c.nickname || c.other?.username || 'Không rõ';
        return (
          <Item key={c._id} active={selectedConversation?._id === c._id} onClick={() => onSelectConversation(c)}
            onContextMenu={(e) => handleItemContextMenu(e, 'dm', c)}
            letter={displayName.charAt(0).toUpperCase()} title={displayName} iconType="dm" />
        );
      });
    }
    // all
    const items = [];
    filteredGroups.forEach(g => {
      const displayName = g.nickname || g.name;
      items.push({ key: 'g-' + g._id, type: 'group', data: g, onClick: () => onSelectGroup(g), active: selectedGroup?._id === g._id, displayName });
    });
    filteredConversations.forEach(c => {
      const displayName = c.nickname || c.other?.username || 'Không rõ';
      items.push({ key: 'c-' + c._id, type: 'dm', data: c, onClick: () => onSelectConversation(c), active: selectedConversation?._id === c._id, displayName });
    });
    items.sort((a, b) => {
      const ta = a.type === 'dm' ? new Date(a.data.lastMessageAt || 0).getTime() : 0;
      const tb = b.type === 'dm' ? new Date(b.data.lastMessageAt || 0).getTime() : 0;
      return tb - ta;
    });
    if (items.length === 0) return <Empty text="Chưa có cuộc trò chuyện nào." />;
    return items.map(it => it.type === 'group' ? (
      <Item key={it.key} active={it.active} onClick={it.onClick}
        onContextMenu={(e) => handleItemContextMenu(e, 'group', it.data)}
        letter={it.displayName.charAt(0).toUpperCase()} title={it.displayName} sub={`${it.data.members?.length || 0} thành viên`} iconType="group" />
    ) : (
      <Item key={it.key} active={it.active} onClick={it.onClick}
        onContextMenu={(e) => handleItemContextMenu(e, 'dm', it.data)}
        letter={it.displayName.charAt(0).toUpperCase()} title={it.displayName} iconType="dm" />
    ));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '4px', padding: '4px',
        background: 'var(--panel-alt)', borderRadius: '10px', marginBottom: '4px'
      }}>
        <TabButton active={activeTab === 'all'} onClick={() => onChangeTab('all')}>Tất cả</TabButton>
        <TabButton active={activeTab === 'group'} onClick={() => onChangeTab('group')}><Users size={13} /></TabButton>
        <TabButton active={activeTab === 'dm'} onClick={() => onChangeTab('dm')}><UserIcon size={13} /></TabButton>
      </div>

      {/* Search + Bell */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', position: 'relative' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
          <input
            value={searchQuery}
            onChange={e => searchUsers(e.target.value)}
            placeholder={activeTab === 'group' ? 'Tìm nhóm...' : 'Tìm username...'}
            style={{
              width: '100%', padding: '8px 10px 8px 32px',
              borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'var(--panel-alt)', color: 'var(--text-primary)',
              fontSize: '13px', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
        <div ref={bellRef} style={{ position: 'relative' }}>
          <button onClick={() => setShowFriendRequests(v => !v)} title="Lời mời kết bạn" style={{
            width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border-color)',
            background: showFriendRequests ? 'var(--accent-me)' : 'var(--panel-alt)',
            color: showFriendRequests ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
          }}>
            <Bell size={15} />
            {friendRequests.length > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 'bold',
                borderRadius: '50%', minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px', border: '2px solid var(--bg-sidebar)'
              }}>{friendRequests.length}</span>
            )}
          </button>
          {showFriendRequests && (
            <div style={{
              position: 'absolute', top: '42px', right: 0, width: '280px', maxHeight: '320px', overflowY: 'auto',
              background: '#fff', border: '1px solid var(--border-color)', borderRadius: '10px',
              boxShadow: 'var(--shadow-lg)', zIndex: 100, padding: '8px'
            }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', padding: '6px 8px' }}>
                Lời mời kết bạn ({friendRequests.length})
              </div>
              {friendRequests.length === 0 && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '12px 8px', textAlign: 'center' }}>
                  Không có lời mời nào.
                </div>
              )}
              {friendRequests.map(req => (
                <div key={req._id} style={{ padding: '8px', borderRadius: '8px', background: 'var(--panel-alt)', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-me), var(--accent-bot))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '13px' }}>
                      {req.from?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>{req.from?.username}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => respondRequest(req._id, 'accept')} style={{ flex: 1, padding: '6px', borderRadius: '6px', background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                      Chấp nhận
                    </button>
                    <button onClick={() => respondRequest(req._id, 'reject')} style={{ flex: 1, padding: '6px', borderRadius: '6px', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowStartDm(true)}
          title="Bắt đầu chat riêng / gửi lời mời"
          style={{
            width: '36px', height: '36px', borderRadius: '8px', border: 'none',
            background: 'var(--accent-me)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
          <Plus size={15} />
        </button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {activeTab === 'all' ? 'Tất cả' : activeTab === 'group' ? 'Nhóm của bạn' : 'Chat riêng'}
        </span>
        {activeTab === 'group' && (
          <button onClick={() => setShowCreateGroup(true)} title="Tạo nhóm mới" style={{
            background: 'var(--accent-me)', border: 'none', borderRadius: '50%',
            width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'white'
          }}>
            <Plus size={12} />
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {renderList()}
      </div>

      {isOwner && activeTab === 'group' && (
        <button onClick={() => setShowInviteModal(true)} style={{
          marginTop: '8px', padding: '10px', background: 'var(--panel-alt)', border: '1px solid var(--border-color)',
          borderRadius: '10px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
        }}>
          <Plus size={14} /> Mời thành viên
        </button>
      )}

      {renderCtxMenu()}

      {showCreateGroup && (
        <Modal title="Tạo nhóm mới" onClose={() => setShowCreateGroup(false)}>
          <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tên nhóm</label>
            <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} autoFocus
              placeholder="Nhập tên nhóm..."
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid var(--border-strong)', background: '#fff', color: '#1c1e21', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            <button type="submit" disabled={creating || !newGroupName.trim()}
              style={{ width: '100%', padding: '11px', borderRadius: '10px', background: 'var(--accent-me)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
              {creating ? 'Đang tạo...' : 'Tạo nhóm'}
            </button>
          </form>
        </Modal>
      )}

      {showStartDm && (
        <Modal title="Bắt đầu chat / Kết bạn" onClose={() => { setShowStartDm(false); setUserResults([]); setSearchQuery(''); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tìm theo username</label>
            <input value={searchQuery} onChange={e => searchUsers(e.target.value)} autoFocus
              placeholder="Nhập username..."
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid var(--border-strong)', background: '#fff', color: '#1c1e21', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '260px', overflowY: 'auto' }}>
              {userResults.length === 0 && searchQuery.trim() && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '12px' }}>
                  Không tìm thấy.
                </div>
              )}
              {userResults.map(u => {
                const isFriend = friends.some(f => String(f._id) === String(u._id));
                return (
                  <div key={u._id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
                    borderRadius: '8px', background: 'var(--panel-alt)'
                  }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-me), var(--accent-bot))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '14px', color: 'var(--text-primary)', flex: 1 }}>{u.username}</span>
                    {isFriend ? (
                      <button onClick={() => startDmWithFriend(u)} style={{
                        padding: '6px 10px', borderRadius: '6px', background: 'var(--accent-me)', color: '#fff',
                        border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}>
                        <MessageCircle size={12} /> Nhắn tin
                      </button>
                    ) : (
                      <button onClick={() => sendFriendRequest(u.username)} disabled={actionMsg[u.username]?.includes('Đã gửi')} style={{
                        padding: '6px 10px', borderRadius: '6px',
                        background: actionMsg[u.username]?.includes('Đã gửi') ? '#10b981' : '#f59e0b',
                        color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                      }}>
                        {actionMsg[u.username] || '+ Kết bạn'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {showInviteModal && (
        <Modal title={`Mời vào "${selectedGroup?.name}"`} onClose={() => { setShowInviteModal(false); setInviteMsg(''); }}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              await apiRequest('/api/groups/invite', 'POST', {
                groupId: selectedGroup._id,
                usernameToInvite: inviteUsername
              });
              setInviteMsg(`✅ Đã mời ${inviteUsername} thành công!`);
              setInviteUsername('');
              setTimeout(() => setInviteMsg(''), 3000);
              onGroupsChange();
            } catch (err) {
              setInviteMsg(`❌ ${err.message}`);
              setTimeout(() => setInviteMsg(''), 3000);
            }
          }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Username</label>
            <input value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} autoFocus
              placeholder="Nhập username..."
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid var(--border-strong)', background: '#fff', color: '#1c1e21', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            {inviteMsg && <div style={{ fontSize: '13px', textAlign: 'center', padding: '8px', borderRadius: '8px',
              background: inviteMsg.includes('Lỗi') ? '#fef2f2' : '#f0fdf4', color: inviteMsg.includes('Lỗi') ? '#ef4444' : '#16a34a' }}>
              {inviteMsg}
            </div>}
            <button type="submit" disabled={!inviteUsername.trim()}
              style={{ width: '100%', padding: '11px', borderRadius: '10px', background: 'var(--accent-me)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
              Mời
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '7px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
      background: active ? 'var(--accent-me)' : 'transparent',
      color: active ? '#fff' : 'var(--text-secondary)',
      fontSize: '13px', fontWeight: '600',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
      transition: 'all 0.2s'
    }}>{children}</button>
  );
}

function Empty({ text }) {
  return <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>{text}</div>;
}

function Item({ active, onClick, onContextMenu, letter, title, sub, iconType }) {
  return (
    <div onClick={onClick} onContextMenu={onContextMenu} style={{
      padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
      backgroundColor: active ? 'var(--accent-me)20' : 'transparent',
      border: active ? '1px solid var(--accent-me)60' : '1px solid transparent',
      transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px'
    }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: iconType === 'dm' ? '50%' : '10px',
        background: 'linear-gradient(135deg, var(--accent-me), var(--accent-bot))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
        fontWeight: 'bold', fontSize: '15px', flexShrink: 0
      }}>{letter}</div>
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {title}
        </div>
        {sub && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sub}</div>}
      </div>
    </div>
  );
}

function CtxButton({ children, onClick, color = 'var(--text-primary)' }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', padding: '8px 12px',
      background: 'transparent', border: 'none', cursor: 'pointer',
      color, fontSize: '13px', borderRadius: '6px',
      transition: 'background 0.15s'
    }} onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
       onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
      <div style={{ background: '#ffffff', padding: '24px 26px', borderRadius: '16px', width: '360px', maxWidth: '92vw', border: '1px solid var(--border-color)', boxShadow: '0 16px 40px rgba(0,0,0,0.18)', color: 'var(--text-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '600', color: '#1c1e21' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', borderRadius: '6px' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}