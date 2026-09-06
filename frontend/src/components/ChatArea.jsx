import React, { useRef, useEffect, useState } from 'react';
import MessageItem from './MessageItem';
import { 
  Send, Sparkles, Paperclip, Mic, StopCircle, 
  Palette, X, Reply, Pencil, Trash2, Globe, RotateCcw,
  MoreVertical, Search, Users, Tag, ArrowLeft
} from 'lucide-react';

export default function ChatArea({ 
  messages, 
  translations, 
  translating, 
  autoTranslate, 
  setAutoTranslate, 
  onSendMessage, 
  onTranslate, 
  onEditMessage,
  onDeleteMessage,
  selectedGroup, 
  onSendFile, 
  currentUser,
  chatThemeColor = '#0084ff',
  chatFontSize = '15px',
  onUpdateChatSettings,
  onLeaveGroup,
  onDeleteConversation,
  onRenameGroup,
  onSetDmNickname,
  onBackToSidebar
}) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const textInputRef = useRef(null);

  // Chat menu
  const [showChatMenu, setShowChatMenu] = useState(false);
  const chatMenuRef = useRef(null);

  // Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

   // Customizer modal
   const [showCustomizerModal, setShowCustomizerModal] = useState(false);

   // Nickname
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const nicknameRef = useRef(null);
  const [displayGroupName, setDisplayGroupName] = useState('');

  // Members
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [members, setMembers] = useState([]);

  // Replying & Editing states
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  // Right-click Context Menu state: { x, y, message }
  const [contextMenu, setContextMenu] = useState(null);

  // Tracking which messages are actively displaying translation
  const [translationsShowing, setTranslationsShowing] = useState({});

  const endOfMessagesRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync autoTranslate with translationsShowing
  useEffect(() => {
    if (autoTranslate) {
      const newShowing = { ...translationsShowing };
      let changed = false;
      Object.keys(translations).forEach(id => {
        if (!newShowing[id]) {
          newShowing[id] = true;
          changed = true;
        }
      });
      if (changed) setTranslationsShowing(newShowing);
    }
  }, [autoTranslate, translations]);

  // Reset states when selected group changes
  useEffect(() => {
    setShowChatMenu(false);
    setShowSearch(false);
    setSearchQuery('');
    setReplyingTo(null);
    setEditingMessage(null);
    setContextMenu(null);
    setInput('');
  }, [selectedGroup?._id]);

  // Click outside to close customizer and context menu
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (contextMenu) {
        setContextMenu(null);
      }
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target)) {
        setShowChatMenu(false);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [contextMenu, showChatMenu]);

  // Load nickname from localStorage for DM
  useEffect(() => {
    if (selectedGroup?._id && selectedGroup?.isDm) {
      try {
        const saved = localStorage.getItem(`dm_nickname_${selectedGroup._id}`);
        if (saved) {
          setNicknameInput(saved);
          setDisplayGroupName(saved);
        } else {
          setDisplayGroupName(selectedGroup.name || 'Chat');
        }
      } catch (e) {
        setDisplayGroupName(selectedGroup.name || 'Chat');
      }
    } else if (selectedGroup?._id && !selectedGroup?.isDm) {
      setDisplayGroupName(selectedGroup.name || 'Cuộc trò chuyện');
      setNicknameInput(selectedGroup.name || '');
    }
  }, [selectedGroup?._id, selectedGroup?.name, selectedGroup?.isDm]);

  // Load members when selectedGroup changes
  useEffect(() => {
    if (selectedGroup?.members) {
      setMembers(selectedGroup.members);
    }
  }, [selectedGroup?.members]);

  // Right click handler on message
  const handleContextMenu = (e, message) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 210;
    const menuHeight = 180;
    const x = (e.clientX + menuWidth > window.innerWidth) ? (e.clientX - menuWidth) : e.clientX;
    const y = (e.clientY + menuHeight > window.innerHeight) ? (e.clientY - menuHeight) : e.clientY;

    setContextMenu({ x, y, message });
  };

  // Reply handler
  const handleStartReply = (message) => {
    setReplyingTo(message);
    setEditingMessage(null);
    textInputRef.current?.focus();
  };

  // Edit handler
  const handleStartEdit = (message) => {
    setEditingMessage(message);
    setReplyingTo(null);
    setInput(message.text || '');
    textInputRef.current?.focus();
  };

  // Toggle translate handler
  const handleToggleTranslate = async (message) => {
    const id = message._id || message.id;
    const isCurrentlyShowing = !!translationsShowing[id];
    if (isCurrentlyShowing) {
      setTranslationsShowing(prev => ({ ...prev, [id]: false }));
    } else {
      if (!translations[id]) {
        await onTranslate(message);
      }
      setTranslationsShowing(prev => ({ ...prev, [id]: true }));
    }
  };

  const handleSaveNickname = async () => {
    if (!selectedGroup?._id) return;
    const trimmed = nicknameInput.trim();
    if (!trimmed) return;
    try {
      if (selectedGroup?.isDm) {
        localStorage.setItem(`dm_nickname_${selectedGroup._id}`, trimmed);
        onSetDmNickname?.(selectedGroup._id, trimmed);
        setDisplayGroupName(trimmed);
      } else {
        await onRenameGroup?.(selectedGroup._id, trimmed);
        setDisplayGroupName(trimmed);
      }
      setShowNicknameModal(false);
    } catch (e) {}
  };

  const handleOpenMembers = async () => {
    setShowChatMenu(false);
    if (!selectedGroup?.members) return;
    try {
      const data = await fetch(`http://localhost:5000/api/groups/${selectedGroup._id}/members`).then(r => r.json());
      setMembers(data.members || []);
    } catch (e) {
      setMembers(selectedGroup.members || []);
    }
    setShowMembersModal(true);
  };

  const handleLeaveGroup = () => {
    setShowChatMenu(false);
    if (selectedGroup && onLeaveGroup) {
      onLeaveGroup(selectedGroup._id);
    }
  };

  const handleDeleteConversation = () => {
    setShowChatMenu(false);
    if (selectedGroup && onDeleteConversation) {
      onDeleteConversation(selectedGroup._id);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (editingMessage) {
      onEditMessage?.(editingMessage._id || editingMessage.id, input.trim());
      setEditingMessage(null);
      setInput('');
    } else {
      const replyData = replyingTo ? {
        messageId: replyingTo._id || replyingTo.id,
        senderName: replyingTo.senderName || (replyingTo.senderId === currentUser?.id ? 'Tôi' : 'Thành viên'),
        text: replyingTo.text || (replyingTo.fileType ? `📎 ${replyingTo.fileType}` : '')
      } : null;
      onSendMessage(input.trim(), replyData);
      setReplyingTo(null);
      setInput('');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onSendFile(file);
    e.target.value = '';
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            const file = new File([blob], `image_${Date.now()}.png`, { type: blob.type });
            onSendFile(file);
            return;
          }
        }
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? { mimeType: 'audio/ogg;codecs=opus' } : {});

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const ext = mimeType.includes('ogg') ? 'ogg' : (mimeType.includes('mp4') ? 'm4a' : 'webm');
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: mimeType });
        onSendFile(file);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start(200); // 200ms timeslice guarantees chunks are flushed regularly
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      alert('Không thể truy cập Microphone: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.requestData?.();
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const COLOR_PALETTE = [
    { color: '#0084ff', name: 'Xanh Dương (Mặc định)' },
    { color: '#8b5cf6', name: 'Tím Neon' },
    { color: '#10b981', name: 'Xanh Lá' },
    { color: '#ef4444', name: 'Đỏ San Hô' },
    { color: '#f59e0b', name: 'Hổ Phách' },
    { color: '#ec4899', name: 'Hồng Sen' },
    { color: '#06b6d4', name: 'Xanh Cyan' },
    { color: '#6366f1', name: 'Chàm Indigo' }
  ];

  if (!selectedGroup) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>Chọn một nhóm để bắt đầu chat</div>
        <div style={{ fontSize: '14px', marginTop: '8px' }}>Hoặc tạo nhóm mới từ thanh bên trái</div>
      </div>
    );
  }

  const isOwner = selectedGroup && (selectedGroup.creator === currentUser?.id || selectedGroup.ownerId === currentUser?.id);

  const groupName = displayGroupName || (selectedGroup && typeof selectedGroup.name === 'string' ? selectedGroup.name : 'Cuộc trò chuyện');

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 1. Header: Ghim cố định ở đỉnh, né thanh điều hướng browser */}
      <div style={{ 
        position: 'sticky',
        top: 0,
        zIndex: 30,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--border-color)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexShrink: 0,
        padding: '0 20px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)',
        paddingBottom: '12px'
      }} className="chat-header-mobile">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBackToSidebar && (
            <button
              type="button"
              onClick={onBackToSidebar}
              title="Quay lại danh sách"
              className="mobile-header-back"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: 'none',
                background: '#f0f2f5',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                flexShrink: 0
              }}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', background: `linear-gradient(135deg, ${chatThemeColor}, var(--accent-bot))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '17px',
            boxShadow: `0 2px 8px ${chatThemeColor}40`
          }}>
            {groupName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>{groupName}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>💡 Chuột phải vào tin nhắn để xem tùy chọn</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {/* Chat Options Menu */}
          <div style={{ position: 'relative' }} ref={chatMenuRef}>
            <button
              type="button"
              onClick={() => { setShowChatMenu(!showChatMenu); }} 
              title="Tùy chọn cuộc trò chuyện"
              style={{ 
                background: showChatMenu ? '#e7f3ff' : 'none', 
                border: 'none', 
                cursor: 'pointer', 
                color: showChatMenu ? chatThemeColor : 'var(--text-secondary)', 
                padding: '8px', 
                borderRadius: '8px', 
                display: 'flex', 
                alignItems: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { if (!showChatMenu) e.currentTarget.style.color = chatThemeColor; }}
              onMouseLeave={e => { if (!showChatMenu) e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <MoreVertical size={20} />
            </button>

             {/* Chat Menu Dropdown */}
              {showChatMenu && (
                <div style={{
                  position: 'absolute',
                  top: '46px',
                  right: '0',
                  width: '220px',
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  boxShadow: '0 14px 40px rgba(0,0,0,0.18)',
                  border: '1px solid var(--border-color)',
                  zIndex: 600,
                  animation: 'fadeInUp 0.15s ease-out',
                  overflow: 'hidden',
                  padding: '0',
                  transition: 'width 0.15s ease'
                }}>
                  <>
                      <button
                        onClick={() => { setShowSearch(!showSearch); setShowChatMenu(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '10px 16px', border: 'none', background: 'transparent',
                          cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)',
                          textAlign: 'left', width: '100%', transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Search size={15} color="var(--accent-me)" />
                        <span>Tìm kiếm trong đoạn chat</span>
                      </button>
                      {selectedGroup?.isDm ? (
                        <button
                          onClick={() => { setShowNicknameModal(true); setShowChatMenu(false); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 16px', border: 'none', background: 'transparent',
                            cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)',
                            textAlign: 'left', width: '100%', transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Tag size={15} color="#f59e0b" />
                          <span>Đặt biệt danh</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => { setShowNicknameModal(true); setShowChatMenu(false); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 16px', border: 'none', background: 'transparent',
                            cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)',
                            textAlign: 'left', width: '100%', transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Tag size={15} color="#f59e0b" />
                          <span>Đổi tên nhóm</span>
                        </button>
                      )}
                      <button
                        onClick={() => { setShowCustomizerModal(true); setShowChatMenu(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '10px 16px', border: 'none', background: 'transparent',
                          cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)',
                          textAlign: 'left', width: '100%', transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Palette size={15} color={chatThemeColor} />
                        <span>Tùy chỉnh màu sắc & cỡ chữ</span>
                      </button>
                      <button
                        onClick={handleOpenMembers}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '10px 16px', border: 'none', background: 'transparent',
                          cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)',
                          textAlign: 'left', width: '100%', transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Users size={15} color="#10b981" />
                        <span>Xem danh sách thành viên</span>
                      </button>
                      <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
                      {!selectedGroup?.isDm && (
                        <button
                          onClick={() => setShowNicknameModal(true)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 16px', border: 'none', background: 'transparent',
                            cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)',
                            textAlign: 'left', width: '100%', transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Tag size={15} color="#f59e0b" />
                          <span>Đổi tên nhóm</span>
                        </button>
                      )}
                      {selectedGroup?.members && selectedGroup?.ownerId === currentUser?.id && (
                        <button
                          onClick={handleDeleteConversation}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 16px', border: 'none', background: 'transparent',
                            cursor: 'pointer', fontSize: '13px', color: '#ef4444',
                            textAlign: 'left', width: '100%', transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Trash2 size={15} color="#ef4444" />
                          <span>Xóa nhóm</span>
                        </button>
                      )}
                      {selectedGroup?.members && onLeaveGroup && (
                        <button
                          onClick={handleLeaveGroup}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 16px', border: 'none', background: 'transparent',
                            cursor: 'pointer', fontSize: '13px', color: '#ef4444',
                            textAlign: 'left', width: '100%', transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <X size={15} color="#ef4444" />
                          <span>Rời nhóm</span>
                        </button>
                      )}
                    </>
                </div>
              )}
           </div>
         </div>
       </div>

       {/* 2. Chat Scroll Area: Duy nhất phần này được cuộn */}
       <div style={{ 
         flex: 1, 
         overflowY: 'auto', 
         padding: '20px 24px',
         paddingBottom: '8px'
       }}>
        {/* Search Bar */}
        {showSearch && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 16px', marginBottom: '16px',
            backgroundColor: '#f0f4f9', borderRadius: '12px',
            border: `1px solid ${chatThemeColor}30`
          }}>
            <Search size={18} color={chatThemeColor} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm trong đoạn chat..."
              autoFocus
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontSize: '14px'
              }}
            />
            <button
              onClick={() => { setShowSearch(false); setSearchQuery(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', display: 'flex' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '60px', fontSize: '14px' }}>
            Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
          </div>
        )}
        {messages.filter(msg => {
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          return (msg.text || '').toLowerCase().includes(q) || (msg.senderName || '').toLowerCase().includes(q);
        }).map(msg => (
          <MessageItem 
            key={msg._id || msg.id} 
            message={msg} 
            translation={translations[msg._id || msg.id]}
            isTranslating={translating[msg._id || msg.id]}
            isShowingTranslation={!!translationsShowing[msg._id || msg.id]}
            onToggleTranslate={handleToggleTranslate}
            currentUser={currentUser}
            autoTranslate={autoTranslate}
            chatThemeColor={chatThemeColor}
            chatFontSize={chatFontSize}
            onContextMenu={handleContextMenu}
            onReply={handleStartReply}
          />
        ))}
        <div ref={endOfMessagesRef} />
      </div>

       {/* 3. Input Bar: Gọn gàng sát đáy */}
       <div style={{ 
         flexShrink: 0, 
         backgroundColor: '#ffffff', 
         borderTop: '1px solid var(--border-color)',
         padding: '10px 20px',
         paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)'
       }} className="chat-input-mobile">
        {/* Reply Preview Banner */}
        {replyingTo && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px', marginBottom: '8px', backgroundColor: '#f0f4f9',
            borderRadius: '12px', borderLeft: `3.5px solid ${chatThemeColor}`,
            animation: 'fadeInUp 0.15s ease-out'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: chatThemeColor, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Reply size={13} />
                <span>Trả lời {replyingTo.senderName || (replyingTo.senderId === currentUser?.id ? 'chính bạn' : 'thành viên')}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {replyingTo.text || (replyingTo.fileType ? `[Tệp đính kèm: ${replyingTo.fileType}]` : '')}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              title="Hủy trả lời"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', display: 'flex', alignItems: 'center' }}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Edit Preview Banner */}
        {editingMessage && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px', marginBottom: '8px', backgroundColor: '#fffbeb',
            borderRadius: '12px', borderLeft: '3.5px solid #f59e0b',
            animation: 'fadeInUp 0.15s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <Pencil size={15} color="#d97706" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '12px', color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <strong>Đang chỉnh sửa:</strong> {editingMessage.text}
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setEditingMessage(null); setInput(''); }}
              title="Hủy chỉnh sửa"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b45309', padding: '4px 8px', fontSize: '12px', fontWeight: '600' }}
            >
              Hủy
            </button>
          </div>
        )}

        {/* Audio Recording Banner */}
        {isRecording && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
            background: '#ef444420', border: '1px solid #ef4444', borderRadius: '12px', marginBottom: '12px'
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'typingDots 1s infinite' }} />
            <span style={{ color: '#ef4444', fontSize: '14px', flex: 1 }}>Đang ghi âm... {formatTime(recordingTime)}</span>
            <button onClick={stopRecording} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
              <StopCircle size={16} /> Dừng & Gửi
            </button>
          </div>
        )}
        
         <form onSubmit={handleSend} style={{
           display: 'flex', alignItems: 'center', gap: '8px',
           backgroundColor: 'var(--panel-alt)', borderRadius: '24px', padding: '6px 6px 6px 16px',
           border: input.toLowerCase().includes('@ai') ? '1px solid var(--accent-bot)' : (editingMessage ? '1px solid #f59e0b' : '1px solid var(--border-color)'),
           transition: 'all 0.3s ease',
           boxShadow: input.toLowerCase().includes('@ai') ? '0 0 12px rgba(168, 85, 247, 0.3)' : 'none'
         }}>
          {input.toLowerCase().includes('@ai') && (
            <Sparkles size={18} color="var(--accent-bot)" style={{ flexShrink: 0 }} />
          )}
          
          <input 
            ref={textInputRef}
            type="text" value={input} onChange={e => setInput(e.target.value)}
            onPaste={handlePaste}
            placeholder={
              editingMessage ? "Nhập nội dung mới để chỉnh sửa..." :
              replyingTo ? `Trả lời ${replyingTo.senderName || 'tin nhắn'}...` :
              (selectedGroup ? "Nhập tin nhắn... (@AI để gọi bot)" : "Chọn nhóm để chat")
            }
            disabled={!selectedGroup || isRecording}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: chatFontSize }}
          />
          
          {/* Hidden file input */}
          <input 
            ref={fileInputRef} 
            type="file" 
            style={{ display: 'none' }} 
            onChange={handleFileChange}
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar,.xls,.xlsx,.ppt,.pptx"
          />
          
          {/* Attach File */}
          {!editingMessage && (
            <button type="button" onClick={() => fileInputRef.current.click()} title="Đính kèm file"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center' }}>
              <Paperclip size={18} />
            </button>
          )}
          
          {/* Voice Record */}
          {!editingMessage && (
            <button type="button" onClick={isRecording ? stopRecording : startRecording} title="Ghi âm"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: isRecording ? '#ef4444' : 'var(--text-secondary)', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center' }}>
              <Mic size={18} />
            </button>
          )}
          
          {/* Send or Save Button */}
          <button type="submit" disabled={!input.trim() || !selectedGroup} style={{
            background: editingMessage ? '#f59e0b' : chatThemeColor, border: 'none', width: '40px', height: '40px',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', cursor: (input.trim() && selectedGroup) ? 'pointer' : 'default', flexShrink: 0,
            opacity: (input.trim() && selectedGroup) ? 1 : 0.5, transition: 'all 0.2s',
            boxShadow: (input.trim() && selectedGroup) ? `0 2px 8px ${editingMessage ? '#f59e0b50' : `${chatThemeColor}50`}` : 'none'
          }}>
            <Send size={17} style={{ marginLeft: '2px', marginTop: '1px' }} />
          </button>
        </form>
      </div>

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div style={{
          position: 'fixed',
          top: contextMenu.y,
          left: contextMenu.x,
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid var(--border-color)',
          padding: '6px',
          zIndex: 9999,
          minWidth: '190px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          animation: 'fadeInUp 0.12s ease-out'
        }}>
          {/* 1. Trả lời */}
          <button
            onClick={() => {
              handleStartReply(contextMenu.message);
              setContextMenu(null);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 12px', border: 'none', background: 'transparent',
              borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
              color: 'var(--text-primary)', textAlign: 'left', width: '100%',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Reply size={15} color="var(--accent-me)" />
            <span>Trả lời</span>
          </button>

          {/* 2. Dịch / Bản gốc */}
          {contextMenu.message.text && (
            <button
              onClick={() => {
                handleToggleTranslate(contextMenu.message);
                setContextMenu(null);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px', border: 'none', background: 'transparent',
                borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                color: 'var(--text-primary)', textAlign: 'left', width: '100%',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {translationsShowing[contextMenu.message._id || contextMenu.message.id] ? (
                <>
                  <RotateCcw size={15} color="#0084ff" />
                  <span>Xem bản gốc</span>
                </>
              ) : (
                <>
                  <Globe size={15} color="#10b981" />
                  <span>Dịch</span>
                </>
              )}
            </button>
          )}

          {/* 3. Chỉnh sửa (chỉ cho tin nhắn chữ của mình) */}
          {(contextMenu.message.senderId === currentUser?.id || contextMenu.message.senderId === 'me') && !contextMenu.message.fileType && (
            <button
              onClick={() => {
                handleStartEdit(contextMenu.message);
                setContextMenu(null);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px', border: 'none', background: 'transparent',
                borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                color: 'var(--text-primary)', textAlign: 'left', width: '100%',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Pencil size={15} color="#f59e0b" />
              <span>Chỉnh sửa</span>
            </button>
          )}

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

          {/* 4. Xóa */}
          {(contextMenu.message.senderId === currentUser?.id || contextMenu.message.senderId === 'me' || isOwner) && (
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc muốn xóa tin nhắn này không?')) {
                  onDeleteMessage?.(contextMenu.message._id || contextMenu.message.id);
                }
                setContextMenu(null);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 12px', border: 'none', background: 'transparent',
                borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                color: '#ef4444', textAlign: 'left', width: '100%',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Trash2 size={15} color="#ef4444" />
              <span>Xóa tin nhắn</span>
            </button>
          )}
        </div>
      )}

      {/* Nickname Modal */}
      {showNicknameModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '20px', padding: '28px 32px',
            boxShadow: '0 24px 48px rgba(0,0,0,0.25)', width: '360px', maxWidth: '90vw',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ fontWeight: '700', fontSize: '18px', color: '#1c1e21', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={20} color="#f59e0b" />
              {selectedGroup?.isDm ? 'Đặt biệt danh' : 'Đổi tên nhóm'}
            </div>
            <input
              type="text"
              value={nicknameInput}
              onChange={e => setNicknameInput(e.target.value)}
              placeholder={selectedGroup?.isDm ? 'Nhập biệt danh cho người này...' : 'Nhập tên nhóm mới...'}
              autoFocus
              maxLength={30}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                border: '1px solid var(--border-color)', fontSize: '14px',
                color: 'var(--text-primary)', outline: 'none', marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNicknameModal(false)} style={{
                padding: '8px 18px', borderRadius: '10px', border: '1px solid var(--border-color)',
                background: '#fff', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)'
              }}>Hủy</button>
              <button onClick={handleSaveNickname} style={{
                padding: '8px 18px', borderRadius: '10px', border: 'none',
                background: chatThemeColor, color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
              }}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Customizer Modal */}
      {showCustomizerModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            background: '#ffffff', borderRadius: '20px', padding: '28px 32px',
            boxShadow: '0 24px 48px rgba(0,0,0,0.25)', width: '400px', maxWidth: '90vw',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ fontWeight: '700', fontSize: '18px', color: '#1c1e21', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Palette size={22} color={chatThemeColor} />
              Tùy chỉnh cuộc trò chuyện
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Màu khung tin nhắn của bạn
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {COLOR_PALETTE.map(item => (
                  <button
                    key={item.color}
                    title={item.name}
                    onClick={() => onUpdateChatSettings?.({ themeColor: item.color })}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: item.color,
                      border: chatThemeColor === item.color ? '3px solid #ffffff' : '2px solid transparent',
                      boxShadow: chatThemeColor === item.color ? `0 0 0 2px ${item.color}` : 'none',
                      cursor: 'pointer',
                      transition: 'transform 0.15s',
                      transform: chatThemeColor === item.color ? 'scale(1.15)' : 'scale(1)'
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <span>Cỡ chữ tin nhắn</span>
                <span style={{ fontWeight: '600', color: chatThemeColor }}>{chatFontSize}</span>
              </div>
              <input
                type="range"
                min="12"
                max="20"
                value={parseInt(chatFontSize)}
                onChange={e => onUpdateChatSettings?.({ fontSize: `${e.target.value}px` })}
                style={{ width: '100%', accentColor: chatThemeColor, cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                <span>Nhỏ (12px)</span>
                <span>Chuẩn (15px)</span>
                <span>Lớn (20px)</span>
              </div>
            </div>
            <div style={{
              padding: '12px 16px',
              background: 'var(--bg-sidebar)',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '16px'
            }}>
              <div style={{
                background: chatThemeColor,
                color: '#ffffff',
                padding: '10px 14px',
                borderRadius: '14px',
                borderBottomRightRadius: '3px',
                fontSize: chatFontSize,
                lineHeight: '1.4'
              }}>
                Tin nhắn mẫu ({chatFontSize})
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCustomizerModal(false)} style={{
                padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border-color)',
                background: '#fff', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)'
              }}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '20px', padding: '28px 32px',
            boxShadow: '0 24px 48px rgba(0,0,0,0.25)', width: '400px', maxWidth: '90vw', maxHeight: '70vh',
            border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ fontWeight: '700', fontSize: '18px', color: '#1c1e21', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="#10b981" />
              Danh sách thành viên ({members.length})
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members.map((m, idx) => {
                const name = typeof m === 'string' ? m : (m.username || m.name || 'Thành viên');
                const isMe = name === currentUser?.username || m._id === currentUser?.id;
                return (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px', borderRadius: '12px', background: '#f8fafc',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0084ff, #00b4d8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 'bold', fontSize: '13px'
                    }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>{name}</div>
                      {isMe && <div style={{ fontSize: '11px', color: '#10b981' }}>Bạn</div>}
                    </div>
                    {selectedGroup?.ownerId === currentUser?.id && !isMe && (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>Thành viên</span>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={() => setShowMembersModal(false)} style={{
              marginTop: '16px', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)',
              background: '#fff', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600'
            }}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}
