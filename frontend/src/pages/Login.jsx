import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) { login(data.token, data.user); }
      else { setError(data.message); }
    } catch { setError('Không thể kết nối đến server.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', background: '#f0f2f5',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 80px',
        background: 'white', borderRight: '1px solid #e4e6ea'
      }}>
        <div style={{ maxWidth: '440px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '16px',
              background: '#0084ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,132,255,0.3)'
            }}>
              <svg width="28" height="28" viewBox="0 0 38 38" fill="none">
                <path d="M19 2C9.611 2 2 9.163 2 18c0 4.517 1.894 8.59 4.962 11.548.26.246.422.583.436.944l.088 2.95a1.2 1.2 0 001.688 1.056l3.289-1.451a1.2 1.2 0 01.804-.064A19.33 19.33 0 0019 34c9.389 0 17-7.163 17-16S28.389 2 19 2z" fill="white"/>
              </svg>
            </div>
            <span style={{ fontSize: '26px', fontWeight: '700', color: '#1c1e21', letterSpacing: '-0.5px' }}>AI Chat</span>
          </div>

          <h1 style={{ fontSize: '34px', fontWeight: '700', color: '#1c1e21', lineHeight: 1.2, marginBottom: '16px' }}>
            Chào mừng<br/>trở lại! 👋
          </h1>
          <p style={{ fontSize: '16px', color: '#65676b', lineHeight: 1.6 }}>
            Kết nối, nhắn tin và gọi video với bạn bè — cùng trợ lý AI thông minh ngay trong cuộc trò chuyện.
          </p>

          {/* Feature list */}
          <div style={{ marginTop: '36px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { icon: '💬', label: 'Chat nhóm thời gian thực' },
              { icon: '🌐', label: 'Dịch thuật tự động đa ngôn ngữ' },
              { icon: '🤖', label: 'Trợ lý AI qua @mention' },
              { icon: '📹', label: 'Gọi Audio & Video (WebRTC)' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e7f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{f.icon}</div>
                <span style={{ fontSize: '14px', color: '#1c1e21', fontWeight: '500' }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ width: '440px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', background: '#f0f2f5' }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '36px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e4e6ea' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1c1e21', marginBottom: '6px' }}>Đăng nhập</h2>
            <p style={{ fontSize: '14px', color: '#65676b', marginBottom: '28px' }}>Nhập thông tin tài khoản của bạn</p>

            {error && (
              <div style={{ background: '#fff3f3', border: '1px solid #fca5a5', borderRadius: '8px', padding: '11px 14px', marginBottom: '18px', color: '#dc2626', fontSize: '14px' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1c1e21', marginBottom: '6px' }}>Tên đăng nhập</label>
                <input className="app-input" type="text" required value={username} onChange={e => setUsername(e.target.value)} placeholder="Nhập tên đăng nhập" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1c1e21', marginBottom: '6px' }}>Mật khẩu</label>
                <input className="app-input" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '6px' }}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ width: '15px', height: '15px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Đang đăng nhập...
                  </span>
                ) : 'Đăng nhập'}
              </button>
            </form>
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#65676b' }}>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={{ color: '#0084ff', fontWeight: '600', textDecoration: 'none' }}>Tạo tài khoản mới</Link>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
