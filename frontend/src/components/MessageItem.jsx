import React from 'react';
import { Globe, Sparkles, RotateCcw } from 'lucide-react';
import { isForeignMessage } from '../utils/langUtils';

export default function MessageItem({ 
  message, 
  translation, 
  isTranslating, 
  isShowingTranslation,
  onToggleTranslate, 
  currentUser,
  chatThemeColor = '#0084ff',
  chatFontSize = '15px',
  onContextMenu,
  onReply
}) {
  const isMe = String(message.senderId) === String(currentUser?.id) || message.senderId === 'me';
  const isBot = message.senderId === 'bot' || message.senderType === 'Bot' || message.senderName === 'AI Bot' || message.senderName === 'bot';
  const senderName = isMe ? 'Tôi' : (isBot ? 'AI Bot' : (message.senderName || message.senderId));

  const avatarLetter = isBot ? 'AI' : senderName.charAt(0).toUpperCase();
  const avatarColor = isBot 
    ? 'linear-gradient(135deg, #7928ca, #b026ff)' 
    : (isMe ? chatThemeColor : '#f59e0b');

  const createdAt = message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (message.time || '');

  const isForeign = isForeignMessage(message);

  const renderContent = () => {
    if (message.isTyping) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '24px', gap: '3px' }}>
          <span className="typing-dot" style={{ background: isBot ? '#c084fc' : undefined }}></span>
          <span className="typing-dot" style={{ background: isBot ? '#c084fc' : undefined }}></span>
          <span className="typing-dot" style={{ background: isBot ? '#c084fc' : undefined }}></span>
        </div>
      );
    }

    if (message.fileType === 'image') {
      return <img src={message.fileUrl} alt="Hình ảnh" style={{ maxWidth: '250px', maxHeight: '200px', borderRadius: '8px', display: 'block' }} />;
    }

    if (message.fileType === 'audio') {
      return <audio controls src={message.fileUrl} style={{ maxWidth: '240px' }} />;
    }

    if (message.fileType === 'document') {
      const filename = message.fileUrl?.split('/').pop();
      return (
        <a href={message.fileUrl} target="_blank" rel="noreferrer" style={{ color: (isMe || isBot) ? '#ffffff' : chatThemeColor, textDecoration: 'underline', fontSize: chatFontSize }}>
          📎 {filename}
        </a>
      );
    }

    // Display either translated text or original text
    const textToShow = (isShowingTranslation && translation) ? translation : message.text;
    return <span>{textToShow}</span>;
  };

  return (
    <div 
      className="animate-fade-in" 
      style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: '14px', gap: '10px' }}
    >
      {/* Avatar for others & bot */}
      {!isMe && (
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
          background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#ffffff', fontWeight: 'bold', fontSize: '13px',
          border: isBot ? '1.5px solid #d8b4fe' : 'none',
          boxShadow: isBot ? '0 0 12px rgba(176,38,255,0.65)' : 'none'
        }}>
          {avatarLetter}
        </div>
      )}

      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        {!isMe && (
          <div style={{
            fontSize: '12px',
            color: isBot ? '#a855f7' : 'var(--text-secondary)',
            marginBottom: '4px',
            fontWeight: isBot ? '600' : 'normal',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {isBot && <Sparkles size={13} color="#a855f7" />}
            <span>{senderName}</span>
            <span style={{ opacity: 0.7 }}>· {createdAt}</span>
            {message.isEdited && <span style={{ opacity: 0.6, fontStyle: 'italic' }}>· (đã sửa)</span>}
          </div>
        )}

        {/* Bubble + Translate Button in a single line */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexDirection: isMe ? 'row-reverse' : 'row'
        }}>
          {/* Main Bubble */}
          <div 
            onContextMenu={(e) => onContextMenu?.(e, message)}
            style={{
              background: isBot 
                ? 'linear-gradient(135deg, #0d041a 0%, #1e0938 100%)' 
                : (isMe ? chatThemeColor : 'var(--panel-alt)'),
              color: (isMe || isBot) ? '#ffffff' : 'var(--text-primary)',
              padding: '10px 14px',
              borderRadius: '16px',
              borderBottomRightRadius: isMe ? '4px' : '16px',
              borderBottomLeftRadius: !isMe ? '4px' : '16px',
              border: isBot ? '1.5px solid #a855f7' : 'none',
              boxShadow: isBot 
                ? '0 0 14px rgba(168, 85, 247, 0.45), 0 4px 14px rgba(0, 0, 0, 0.35)' 
                : 'none',
              fontSize: chatFontSize,
              lineHeight: '1.5',
              wordBreak: 'break-word',
              transition: 'background-color 0.2s, font-size 0.15s',
              cursor: 'context-menu',
              userSelect: 'text'
            }}
          >
            {/* Quoted Message (Reply Preview) */}
            {message.replyTo && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                padding: '5px 9px',
                marginBottom: '6px',
                borderRadius: '8px',
                backgroundColor: (isMe || isBot) ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.06)',
                borderLeft: `3px solid ${(isMe || isBot) ? '#ffffff' : chatThemeColor}`,
                fontSize: '12px',
                lineHeight: '1.4'
              }}>
                <span style={{ fontWeight: '600', opacity: 0.95 }}>
                  ↩ {message.replyTo.senderName || 'Tin nhắn'}
                </span>
                <span style={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                  {message.replyTo.text || '...'}
                </span>
              </div>
            )}

            {renderContent()}
          </div>

          {/* Small Translate / Original button next to foreign messages */}
          {isForeign && (
            <button
              onClick={() => onToggleTranslate?.(message)}
              disabled={isTranslating}
              title={isShowingTranslation ? "Bấm để xem bản gốc" : "Bấm để dịch sang tiếng Việt"}
              style={{
                background: isShowingTranslation ? '#e7f3ff' : 'var(--panel-alt)',
                color: isShowingTranslation ? '#0084ff' : 'var(--text-secondary)',
                border: isShowingTranslation ? '1px solid #b3d9ff' : '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '3px 9px',
                fontSize: '11px',
                fontWeight: '500',
                cursor: isTranslating ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                alignSelf: 'center',
                flexShrink: 0
              }}
            >
              {isTranslating ? (
                <>
                  <Globe size={11} style={{ animation: 'spin 1.5s linear infinite' }} />
                  <span>Đang dịch...</span>
                </>
              ) : isShowingTranslation ? (
                <>
                  <RotateCcw size={11} />
                  <span>Bản gốc</span>
                </>
              ) : (
                <>
                  <Globe size={11} />
                  <span>Dịch</span>
                </>
              )}
            </button>
          )}
        </div>

        {isMe && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{createdAt}</span>
            {message.isEdited && <span style={{ opacity: 0.7, fontStyle: 'italic' }}>· (đã sửa)</span>}
          </div>
        )}
      </div>
    </div>
  );
}
