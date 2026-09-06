import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'https://aichat-backend-avw7.onrender.com';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); return; }
    if (password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) { setSuccess(true); setTimeout(() => navigate('/login'), 2200); }
      else { setError(data.message); }
    } catch { setError('Không thể kết nối đến server.'); }
    finally { setLoading(false); }
  };

  const strength = !password ? null :
    password.length < 6 ? { label: 'Yếu', color: '#ef4444', pct: '30%' } :
    password.length < 10 ? { label: 'Trung bình', color: '#f59e0b', pct: '62%' } :
    { label: 'Mạnh', color: '#22c55e', pct: '100%' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f0f2f5', fontFamily: "'Inter', sans-serif" }}>
      {/* Left — branding */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 80px', background: 'white', borderRight: '1px solid #e4e6ea' }}>
        <div style={{ maxWidth: '440px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: '#0084ff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,132,255,0.3)' }}>
              <svg width="28" height="28" viewBox="0 0 38 38" fill="none">
                <path d="M19 2C9.611 2 2 9.163 2 18c0 4.517 1.894 8.59 4.962 11.548.26.246.422.583.436.944l.088 2.95a1.2 1.2 0 001.688 1.056l3.289-1.451a1.2 1.2 0 01.804-.064A19.33 19.33 0 0019 34c9.389 0 17-7.163 17-16S28.389 2 19 2z" fill="white"/>
              </svg>
            </div>
            <span style={{ fontSize: '26px', fontWeight: '700', color: '#1c1e21', letterSpacing: '-0.5px' }}>AI Chat</span>
          </div>
          <h1 style={{ fontSize: '34px', fontWeight: '700', color: '#1c1e21', lineHeight: 1.2, marginBottom: '14px' }}>
            Bắt đầu<br/>hành trình mới ✨
          </h1>
          <p style={{ fontSize: '16px', color: '#65676b', lineHeight: 1.6 }}>
            Tạo tài khoản trong vài giây và trải nghiệm cách nhắn tin thông minh với AI.
          </p>
          <div style={{ marginTop: '32px', padding: '20px', background: '#e7f3ff', borderRadius: '14px', border: '1px solid #b3d9ff' }}>
            <div style={{ fontSize: '13px', color: '#0084ff', fontWeight: '600', marginBottom: '8px' }}>💡 Tính năng nổi bật</div>
            <ul style={{ fontSize: '13px', color: '#444', lineHeight: 1.8, paddingLeft: '16px', margin: 0 }}>
              <li>Gọi điện video/thoại P2P qua WebRTC</li>
              <li>Gửi file & ghi âm trực tiếp</li>
              <li>Tạo nhóm, mời thành viên</li>
              <li>Trợ lý AI @mention ngay trong chat</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{ width: '440px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', background: '#f0f2f5' }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          {success ? (
            <div style={{ background: 'white', borderRadius: '16px', padding: '48px 32px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e4e6ea' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1c1e21', marginBottom: '8px' }}>Đăng ký thành công!</h3>
              <p style={{ color: '#65676b', fontSize: '14px' }}>Đang chuyển đến trang đăng nhập...</p>
              <div style={{ marginTop: '20px', height: '4px', background: '#e4e6ea', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#0084ff', animation: 'progress 2.2s linear forwards', borderRadius: '2px' }} />
              </div>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '16px', padding: '36px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e4e6ea' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1c1e21', marginBottom: '6px' }}>Tạo tài khoản</h2>
              <p style={{ fontSize: '14px', color: '#65676b', marginBottom: '26px' }}>Miễn phí, không cần email</p>

              {error && (
                <div style={{ background: '#fff3f3', border: '1px solid #fca5a5', borderRadius: '8px', padding: '11px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '14px' }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1c1e21', marginBottom: '6px' }}>Tên đăng nhập</label>
                  <input className="app-input" type="text" required value={username} onChange={e => setUsername(e.target.value)} placeholder="vd: nguyen_phong" />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1c1e21', marginBottom: '6px' }}>Mật khẩu</label>
                  <input className="app-input" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" />
                  {strength && (
                    <div style={{ marginTop: '7px' }}>
                      <div style={{ height: '3px', background: '#e4e6ea', borderRadius: '2px' }}>
                        <div style={{ height: '100%', width: strength.pct, background: strength.color, transition: 'all 0.35s', borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontSize: '12px', color: strength.color, marginTop: '3px', display: 'block' }}>Độ mạnh: {strength.label}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1c1e21', marginBottom: '6px' }}>Xác nhận mật khẩu</label>
                  <input className="app-input" type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Nhập lại mật khẩu"
                    style={{ borderColor: confirm ? (confirm === password ? '#22c55e' : '#ef4444') : undefined }} />
                  {confirm && (
                    <span style={{ fontSize: '12px', marginTop: '3px', display: 'block', color: confirm === password ? '#22c55e' : '#ef4444' }}>
                      {confirm === password ? '✓ Khớp' : '✕ Chưa khớp'}
                    </span>
                  )}
                </div>

                <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '6px' }}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span style={{ width: '15px', height: '15px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                      Đang tạo...
                    </span>
                  ) : 'Tạo tài khoản'}
                </button>
              </form>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#65676b' }}>
            Đã có tài khoản?{' '}
            <Link to="/login" style={{ color: '#0084ff', fontWeight: '600', textDecoration: 'none' }}>Đăng nhập</Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes progress { from { width: 0% } to { width: 100% } }
        .app-input { width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid #e4e6ea;background:white;color:#1c1e21;font-size:14px;font-family:inherit;outline:none;transition:border-color 0.2s,box-shadow 0.2s;box-sizing:border-box; }
        .app-input:focus { border-color:#0084ff;box-shadow:0 0 0 3px rgba(0,132,255,0.12); }
        .app-input::placeholder { color:#b0b3b8; }
        .btn-primary { width:100%;padding:12px;border-radius:10px;background:#0084ff;color:white;border:none;font-weight:600;font-size:15px;cursor:pointer;font-family:inherit;transition:background 0.2s,transform 0.15s;box-shadow:0 2px 8px rgba(0,132,255,0.3); }
        .btn-primary:hover { background:#0070d8; }
        .btn-primary:disabled { background:#b0ccf8;box-shadow:none;cursor:not-allowed; }
      `}</style>
    </div>
  );
}
