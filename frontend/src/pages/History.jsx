import React, { useState, useEffect } from 'react';
import api from '../api';

export default function History() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await api.get('/activities');
        setActivities(res.data);
      } catch (err) {
        console.error('Error fetching history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  const getActionIcon = (action) => {
    if (!action) return '📝';
    if (action.includes('CREATED')) return '✨';
    if (action.includes('DELETED')) return '🗑️';
    if (action.includes('UPDATED')) return '🔄';
    return '📝';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#1f2937', margin: 0, fontSize: '1.25rem' }}>Activity Timeline (History)</h2>
        <button 
          onClick={() => window.history.back()} 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#4f46e5', fontWeight: '500', fontSize: '0.875rem', cursor: 'pointer' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>
      {loading ? <p>Loading history...</p> : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {activities.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', margin: 0 }}>No history available.</p>
          ) : (
            activities.map((activity, index) => (
              <div key={activity.id} style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '1rem', 
                padding: '1rem 1.5rem',
                borderBottom: index !== activities.length - 1 ? '1px solid #e5e7eb' : 'none'
              }}>
                <div style={{ fontSize: '1.25rem' }}>{getActionIcon(activity.action)}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 0.25rem 0', color: '#1f2937', fontSize: '0.875rem' }}>
                    <strong>{activity.user?.username}</strong> {activity.details}
                  </p>
                  <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.75rem' }}>
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

