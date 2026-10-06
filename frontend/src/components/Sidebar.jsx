import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';

export default function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await api.get('/notifications');
        setNotifications(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotifs();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname.startsWith(path) ? { backgroundColor: '#e0e7ff', color: '#4338ca', fontWeight: '600' } : {};
  };

  const linkStyle = {
    display: 'block',
    padding: '0.75rem 1rem',
    textDecoration: 'none',
    color: '#4b5563',
    borderRadius: '6px',
    marginBottom: '0.5rem',
    transition: 'all 0.2s'
  };

  const unreadCount = notifications.filter(n => !(n.read || n.isRead)).length;

  const toggleNotifications = async () => {
    const willShow = !showNotifications;
    setShowNotifications(willShow);
    
    if (willShow && unreadCount > 0) {
      try {
        await api.put('/notifications/read');
        setNotifications(notifications.map(n => ({ ...n, isRead: true, read: true })));
      } catch (err) {
        console.error('Failed to mark notifications as read', err);
      }
    }
  };

  return (
    <div style={{ width: '250px', backgroundColor: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, zIndex: 40 }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: '#1f2937', fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>TaskFlow</h2>
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Project Management</span>
        </div>
        
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button onClick={toggleNotifications} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', position: 'relative' }}>
            🔔
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#ef4444', color: 'white', fontSize: '0.6rem', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div style={{ position: 'absolute', top: '30px', left: '30px', width: '300px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', border: '1px solid #e5e7eb', zIndex: 50, overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.875rem', color: '#1f2937' }}>Notifications</h3>
                <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#6b7280', padding: 0 }}>✖</button>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <p style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>No notifications yet.</p>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', backgroundColor: (notif.read || notif.isRead) ? 'white' : '#eff6ff' }}>
                      <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#1f2937' }}>{notif.message}</p>
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{new Date(notif.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div style={{ flex: 1, padding: '1.5rem 1rem', overflowY: 'auto' }}>
        <Link to="/dashboard" style={{ ...linkStyle, ...isActive('/dashboard') }}>Dashboard</Link>
        <Link to="/workspaces" style={{ ...linkStyle, ...isActive('/workspaces') }}>Workspaces</Link>
      </div>

      <div style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ margin: 0, fontWeight: '600', fontSize: '0.875rem', color: '#1f2937', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{user?.username}</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>{user?.role?.replace('ROLE_', '').replace('_', ' ')}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          style={{ width: '100%', padding: '0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}