import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';

export default function Workspaces() {
  const { user } = useContext(AuthContext);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('CREATE'); // 'CREATE' or 'EDIT'
  const [activeWs, setActiveWs] = useState({ id: null, name: '', description: '' });

  const fetchWorkspaces = async () => {
    try {
      const res = await api.get('/workspaces');
      setWorkspaces(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'CREATE') {
        const res = await api.post('/workspaces', activeWs);
        setWorkspaces([...workspaces, res.data]);
      } else {
        const res = await api.put(`/workspaces/${activeWs.id}`, activeWs);
        setWorkspaces(workspaces.map(ws => ws.id === activeWs.id ? res.data : ws));
      }
      setShowModal(false);
      setActiveWs({ id: null, name: '', description: '' });
    } catch (err) {
      console.error('Failed to save workspace', err);
      alert('Error saving workspace. Ensure you are an Admin.');
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to delete this workspace?")) return;
    try {
      await api.delete(`/workspaces/${id}`);
      setWorkspaces(workspaces.filter(ws => ws.id !== id));
    } catch (err) {
      console.error('Failed to delete workspace', err);
      alert('Error deleting workspace. Ensure you are an Admin.');
    }
  };

  const openCreateModal = () => {
    setModalMode('CREATE');
    setActiveWs({ id: null, name: '', description: '' });
    setShowModal(true);
  };

  const openEditModal = (e, ws) => {
    e.preventDefault(); // Prevent navigating to workspace details
    setModalMode('EDIT');
    setActiveWs({ id: ws.id, name: ws.name, description: ws.description });
    setShowModal(true);
  };

  const isAdmin = user?.role === 'ROLE_ADMIN';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: '#1f2937' }}>Workspaces</h1>
        {isAdmin && (
          <button onClick={openCreateModal} className="btn-primary">+ New Workspace</button>
        )}
      </div>

      {loading ? <p>Loading...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {workspaces.map(ws => (
            <Link to={`/workspaces/${ws.id}`} key={ws.id} style={{ textDecoration: 'none' }}>
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', border: '1px solid transparent' }} 
                   onMouseOver={(e) => e.currentTarget.style.border = '1px solid #4f46e5'}
                   onMouseOut={(e) => e.currentTarget.style.border = '1px solid transparent'}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ color: '#1f2937', margin: '0 0 0.5rem 0' }}>{ws.name}</h3>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={(e) => openEditModal(e, ws)} style={{ border: 'none', background: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                      <button onClick={(e) => handleDelete(e, ws.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
                    </div>
                  )}
                </div>

                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {ws.description || 'No description provided.'}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{ fontSize: '0.75rem', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                    Owner: {ws.owner?.username}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {workspaces.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '8px', color: '#6b7280' }}>
              No workspaces found. {isAdmin && "Create one to get started!"}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && isAdmin && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '1.5rem', color: '#1f2937' }}>{modalMode === 'CREATE' ? 'Create' : 'Edit'} Workspace</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Name</label>
                <input 
                  type="text" 
                  value={activeWs.name} 
                  onChange={(e) => setActiveWs({...activeWs, name: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Description</label>
                <textarea 
                  value={activeWs.description} 
                  onChange={(e) => setActiveWs({...activeWs, description: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', minHeight: '100px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.75rem' }}>{modalMode === 'CREATE' ? 'Create' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}