import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';

export default function WorkspaceDetails() {
  const { user } = useContext(AuthContext);
    const { workspaceId } = useParams();
  const [projects, setProjects] = useState([]);
  const [workspace, setWorkspace] = useState(null); // <-- Add this new state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('CREATE');
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // New state for project members modal
  const [showMembersModal, setShowMembersModal] = useState(false);
  
  const [activeProject, setActiveProject] = useState({ id: null, name: '', description: '', startDate: '', endDate: '', status: 'PLANNED', members: [] });
  const [selectedUser, setSelectedUser] = useState('');
  const navigate = useNavigate();

    const fetchProjects = async () => {
    try {
      // --- NEW: Fetch the workspace data which now includes members ---
      const wsRes = await api.get(`/workspaces/${workspaceId}`);
      setWorkspace(wsRes.data);

      const projRes = await api.get(`/projects/workspace/${workspaceId}`);
      setProjects(projRes.data);
      try {
        const usersRes = await api.get(`/users`);
        setUsers(usersRes.data);
      } catch (userErr) {
        console.warn('Failed to fetch users', userErr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [workspaceId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'CREATE') {
        const res = await api.post(`/projects/workspace/${workspaceId}`, activeProject);
        setProjects([...projects, res.data]);
      } else {
        const res = await api.put(`/projects/${activeProject.id}`, activeProject);
        setProjects(projects.map(p => p.id === activeProject.id ? res.data : p));
      }
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save project', err);
      alert('Error saving project. Ensure you have the PROJECT_MANAGER or ADMIN role.');
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects(projects.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete project', err);
      alert('Error deleting project. Check your permissions.');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await api.post(`/workspaces/${workspaceId}/members/${selectedUser}`);
      alert('User successfully added to workspace!');
      setShowInviteModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to add user. You might need ADMIN role.');
    }
  };

  const openCreateModal = () => {
    setModalMode('CREATE');
    setActiveProject({ id: null, name: '', description: '', startDate: '', endDate: '', status: 'PLANNED', members: [] });
    setShowModal(true);
  };

  const openEditModal = (e, proj) => {
    e.preventDefault();
    setModalMode('EDIT');
    setActiveProject({ id: proj.id, name: proj.name, description: proj.description, startDate: proj.startDate || '', endDate: proj.endDate || '', status: proj.status, members: proj.members });
    setShowModal(true);
  };

  // --- NEW: Open Members Modal ---
  const openMembersModal = (e, proj) => {
    e.preventDefault();
    setActiveProject(proj);
    setSelectedUser('');
    setShowMembersModal(true);
  };

  // --- NEW: Add Member Handler ---
  const handleAddProjectMember = async (projectId) => {
    if (!selectedUser) return;
    try {
      await api.post(`/projects/${projectId}/members/${selectedUser}`);
      const res = await api.get(`/projects/workspace/${workspaceId}`);
      setProjects(res.data);
      setActiveProject(res.data.find(p => p.id === projectId));
      setSelectedUser('');
    } catch (err) {
      console.error(err);
      alert('Failed to add member to project.');
    }
  };

  // --- NEW: Remove Member Handler ---
  const handleRemoveProjectMember = async (projectId, userId) => {
    if (!window.confirm("Remove this member from the project?")) return;
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      const res = await api.get(`/projects/workspace/${workspaceId}`);
      setProjects(res.data);
      setActiveProject(res.data.find(p => p.id === projectId));
    } catch (err) {
      console.error(err);
      alert('Failed to remove member.');
    }
  };

  const isAdmin = user?.role === 'ROLE_ADMIN';
  const isAdminOrPM = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_PROJECT_MANAGER';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/workspaces')} style={{ padding: '0.5rem', border: '1px solid #d1d5db', backgroundColor: 'white', borderRadius: '6px', cursor: 'pointer' }}>
          ← Back
        </button>
        <h1 style={{ color: '#1f2937', margin: 0 }}>Workspace Projects</h1>
        <div style={{ flex: 1 }}></div>
        
        {isAdmin && (
          <button onClick={() => setShowInviteModal(true)} style={{ padding: '0.5rem 1rem', backgroundColor: 'white', color: '#4f46e5', border: '1px solid #4f46e5', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Invite Member</button>
        )}
        {isAdminOrPM && (
          <button onClick={openCreateModal} className="btn-primary" style={{ marginLeft: '1rem' }}>+ New Project</button>
        )}
      </div>

      {loading ? <p>Loading projects...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {projects.map(proj => (
            <Link to={`/projects/${proj.id}`} key={proj.id} style={{ textDecoration: 'none' }}>
              <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', border: '1px solid transparent' }} 
                   onMouseOver={(e) => e.currentTarget.style.border = '1px solid #4f46e5'}
                   onMouseOut={(e) => e.currentTarget.style.border = '1px solid transparent'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ color: '#1f2937', margin: 0 }}>{proj.name}</h3>
                  <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '999px', fontWeight: 'bold' }}>
                    {proj.status}
                  </span>
                </div>

                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  {proj.description || 'No description provided.'}
                </p>

                {(proj.startDate || proj.endDate) && (
                  <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '1rem' }}>
                    {proj.startDate && <span>Start: {proj.startDate} </span>}
                    {proj.endDate && <span>| End: {proj.endDate}</span>}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Created: {new Date(proj.createdAt).toLocaleDateString()}
                  </span>
                  
                  {isAdminOrPM && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {/* --- NEW: Members Button --- */}
                      <button onClick={(e) => openMembersModal(e, proj)} style={{ border: 'none', background: 'none', color: '#10b981', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>Members</button>
                      <button onClick={(e) => openEditModal(e, proj)} style={{ border: 'none', background: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
                      <button onClick={(e) => handleDelete(e, proj.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
          {projects.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '8px', color: '#6b7280' }}>
              No projects yet. {isAdminOrPM && "Create your first project to get started!"}
            </div>
          )}
        </div>
      )}

      {/* --- NEW: Project Members Modal --- */}
      {showMembersModal && isAdminOrPM && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#1f2937', margin: 0 }}>Project Members</h2>
              <button onClick={() => setShowMembersModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>&times;</button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', color: '#4b5563', marginBottom: '0.5rem' }}>Current Members</h3>
              {activeProject?.members?.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                  {activeProject.members.map(member => (
                                      <li key={member.id} style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
                      <span>{member.username} <span style={{fontSize: '0.75rem', color: '#6b7280'}}>({member.role.replace('ROLE_', '')})</span></span>
                      
                      {!(user?.role === 'ROLE_PROJECT_MANAGER' && member.role === 'ROLE_ADMIN') && (
                        <button 
                          onClick={() => handleRemoveProjectMember(activeProject.id, member.id)}
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No members added yet.</p>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '1rem', color: '#4b5563', marginBottom: '0.5rem' }}>Add New Member</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select 
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white' }}
                >
                                    <option value="">-- Choose a user --</option>
                  {workspace?.members
                    ?.filter(u => !activeProject?.members?.some(m => m.id === u.id))
                    .map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.role.replace('ROLE_', '')})</option>
                  ))}
                </select>
                <button 
                  onClick={() => handleAddProjectMember(activeProject.id)}
                  className="btn-primary" 
                  style={{ padding: '0.5rem 1rem' }}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Modal (Create / Edit) */}
      {showModal && isAdminOrPM && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '1.5rem', color: '#1f2937' }}>{modalMode === 'CREATE' ? 'Create' : 'Edit'} Project</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Name</label>
                <input 
                  type="text" 
                  value={activeProject.name} 
                  onChange={(e) => setActiveProject({...activeProject, name: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Description</label>
                <textarea 
                  value={activeProject.description} 
                  onChange={(e) => setActiveProject({...activeProject, description: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', minHeight: '80px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Start Date</label>
                  <input 
                    type="date" 
                    value={activeProject.startDate} 
                    onChange={(e) => setActiveProject({...activeProject, startDate: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>End Date</label>
                  <input 
                    type="date" 
                    value={activeProject.endDate} 
                    onChange={(e) => setActiveProject({...activeProject, endDate: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>
              {modalMode === 'EDIT' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Status</label>
                  <select 
                    value={activeProject.status}
                    onChange={(e) => setActiveProject({...activeProject, status: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white' }}
                  >
                    <option value="PLANNED">Planned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.75rem' }}>{modalMode === 'CREATE' ? 'Create' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && isAdmin && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '1.5rem', color: '#1f2937' }}>Invite Member to Workspace</h2>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Select User</label>
                <select 
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white' }}
                  required
                >
                                   <option value="">-- Choose a user --</option>
                  {users
                    .filter(u => !workspace?.members?.some(m => m.id === u.id))
                    .map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.role.replace('ROLE_', '')})</option>
                  ))}
                </select>
                {users.length === 0 && <p style={{fontSize: '0.8rem', color: 'red', marginTop: '5px'}}>No other users found. You may need to register another user first.</p>}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowInviteModal(false)} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.75rem' }}>Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}