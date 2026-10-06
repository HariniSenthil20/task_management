import React, { useState } from 'react';
import api from '../api';

export default function TaskDetailsModal({ task, onClose, onUpdate, onDelete }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    setLoading(true);
    try {
      await api.delete(`/tasks/${task.id}`);
      onDelete(task.id, task.status);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to delete task. You may not have permission.');
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'URGENT': return '#ef4444';
      case 'HIGH': return '#f59e0b';
      case 'LOW': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '10px', width: '100%', maxWidth: '600px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#1f2937' }}>{task.title}</h2>
          <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', backgroundColor: getPriorityColor(task.priority), color: 'white', borderRadius: '999px', fontWeight: 'bold' }}>
            {task.priority}
          </span>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ color: '#4b5563', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Description</h4>
          <p style={{ color: '#1f2937', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '6px', border: '1px solid #e5e7eb', minHeight: '80px' }}>
            {task.description || 'No description provided.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <h4 style={{ color: '#4b5563', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Status</h4>
            <span style={{ fontSize: '0.875rem', padding: '0.3rem 0.8rem', backgroundColor: '#e0e7ff', color: '#4338ca', borderRadius: '4px', fontWeight: '500' }}>
              {task.status.replace('_', ' ')}
            </span>
          </div>
          
          <div>
            <h4 style={{ color: '#4b5563', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Created By</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                {task.createdBy?.username?.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '0.875rem', color: '#1f2937' }}>{task.createdBy?.username}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
          <button onClick={onClose} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Close</button>
          <button onClick={handleDelete} disabled={loading} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
            {loading ? 'Deleting...' : 'Delete Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
