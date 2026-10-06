import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { AuthContext } from '../context/AuthContext';
import api from '../api';

export default function KanbanBoard() {
  const { user } = useContext(AuthContext);
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [allTasks, setAllTasks] = useState([]);
  const [tasks, setTasks] = useState({ TO_DO: [], IN_PROGRESS: [], COMPLETED: [] });
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [users, setUsers] = useState([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Pagination State
  const [taskLimit, setTaskLimit] = useState(5);
  const [page, setPage] = useState({ TO_DO: 1, IN_PROGRESS: 1, COMPLETED: 1 });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('CREATE');
  const [activeTask, setActiveTask] = useState({ id: null, title: '', description: '', priority: 'MEDIUM', status: 'TO_DO', startDate: '', dueDate: '', assigneeId: '' });
  
  // Comments State
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetchData(true);
    
    const interval = setInterval(() => {
      fetchData(false);
    }, 5000); // 5 seconds polling
    
    return () => clearInterval(interval);
  }, [projectId]);

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [projRes, tasksRes, usersRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/tasks/project/${projectId}`),
        api.get('/users').catch(() => ({ data: [] }))
      ]);
      setProject(projRes.data);
      setUsers(usersRes.data);
      
      const fetchedTasks = tasksRes.data;
      const tasksWithComments = await Promise.all(fetchedTasks.map(async (task) => {
        try {
          const commentRes = await api.get(`/comments/task/${task.id}`);
          return { ...task, commentCount: commentRes.data.length };
        } catch (e) {
          return { ...task, commentCount: 0 };
        }
      }));

      setAllTasks(tasksWithComments);
      organizeTasks(tasksWithComments, searchQuery, filterPriority);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const organizeTasks = (taskList, search, priority) => {
    const organized = { TO_DO: [], IN_PROGRESS: [], COMPLETED: [] };
    taskList.forEach(task => {
      const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) || (task.description && task.description.toLowerCase().includes(search.toLowerCase()));
      const matchesPriority = priority === '' || task.priority === priority;
      
      if (organized[task.status] && matchesSearch && matchesPriority) {
        organized[task.status].push(task);
      }
    });
    setTasks(organized);
  };

  useEffect(() => {
    organizeTasks(allTasks, searchQuery, filterPriority);
  }, [searchQuery, filterPriority, allTasks]);

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceStartIndex = (page[source.droppableId] - 1) * taskLimit;
    const destStartIndex = (page[destination.droppableId] - 1) * taskLimit;

    const realSourceIndex = sourceStartIndex + source.index;
    const realDestIndex = destStartIndex + destination.index;

    // Optimistically update UI
    const sourceCol = [...tasks[source.droppableId]];
    const destCol = [...tasks[destination.droppableId]];
    
    const [movedTask] = sourceCol.splice(realSourceIndex, 1);
    
    movedTask.status = destination.droppableId;
    
    // If dropping in same column, ensure we don't insert out of bounds
    if (source.droppableId === destination.droppableId) {
      sourceCol.splice(realDestIndex, 0, movedTask);
      setTasks({ ...tasks, [source.droppableId]: sourceCol });
    } else {
      destCol.splice(realDestIndex, 0, movedTask);
      setTasks({ ...tasks, [source.droppableId]: sourceCol, [destination.droppableId]: destCol });
    }

    // Update backend
    try {
      await api.put(`/tasks/${draggableId}/status`, { status: destination.droppableId, priority: movedTask.priority });
      setAllTasks(allTasks.map(t => t.id.toString() === draggableId ? { ...t, status: destination.droppableId } : t));
    } catch (err) {
      console.error('Failed to update status', err);
      fetchData(); // revert on failure
    }
  };

  const isAdminOrPM = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_PROJECT_MANAGER';

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    try {
      let savedTask;
      if (modalMode === 'CREATE') {
        const res = await api.post(`/tasks/project/${projectId}`, activeTask);
        savedTask = res.data;
        
        if (activeTask.status && activeTask.status !== 'TO_DO') {
          const statusRes = await api.put(`/tasks/${savedTask.id}/status`, { status: activeTask.status, priority: activeTask.priority });
          savedTask = statusRes.data;
        }
        
        setAllTasks([...allTasks, savedTask]);
      } else {
        if (isAdminOrPM || activeTask.assigneeId === user.id) {
          const res = await api.put(`/tasks/${activeTask.id}`, activeTask);
          savedTask = res.data;
          
          if (isAdminOrPM && activeTask.assigneeId && (!savedTask.assignee || savedTask.assignee.id.toString() !== activeTask.assigneeId.toString())) {
             const assignRes = await api.put(`/tasks/${savedTask.id}/assign/${activeTask.assigneeId}`);
             savedTask = assignRes.data;
          }
        } else {
          // Team members can only update status and priority on tasks they don't own
          savedTask = allTasks.find(t => t.id === activeTask.id);
        }
        
        // Sync Status through Status API (accessible by Team Members too)
        const statusRes = await api.put(`/tasks/${savedTask.id}/status`, { status: activeTask.status, priority: activeTask.priority });
        savedTask = statusRes.data;
        
        setAllTasks(allTasks.map(t => t.id === savedTask.id ? savedTask : t));
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert('Error saving task.');
    }
  };

  const handleDeleteTask = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this task?")) return;
    try {
      await api.delete(`/tasks/${id}`);
      setAllTasks(allTasks.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete task.');
    }
  };

  const openCreateModal = () => {
    setModalMode('CREATE');
    setActiveTask({ id: null, title: '', description: '', priority: 'MEDIUM', status: 'TO_DO', startDate: '', dueDate: '', assigneeId: isAdminOrPM ? '' : user.id });
    setShowModal(true);
    setComments([]);
  };

  const openCommentsModal = async (e, task) => {
    e.stopPropagation();
    setModalMode('COMMENTS');
    setActiveTask({ id: task.id, title: task.title });
    setComments([]);
    setShowModal(true);
    
    try {
      const res = await api.get(`/comments/task/${task.id}`);
      setComments(res.data);
    } catch (err) {
      console.error('Failed to fetch comments', err);
    }
  };

  const openEditModal = async (e, task) => {
    if (e) e.stopPropagation();
    setModalMode('EDIT');
    setActiveTask({ 
      id: task.id, 
      title: task.title, 
      description: task.description || '', 
      priority: task.priority, 
      status: task.status,
      startDate: task.startDate || '', 
      dueDate: task.dueDate || '', 
      assigneeId: task.assignee ? task.assignee.id : '' 
    });
    setComments([]);
    setShowModal(true);
    
    // Fetch comments
    try {
      const res = await api.get(`/comments/task/${task.id}`);
      setComments(res.data);
    } catch (err) {
      console.error('Failed to fetch comments', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/comments/task/${activeTask.id}`, { content: newComment });
      setComments([res.data, ...comments]);
      setNewComment('');
      
      setAllTasks(prevTasks => prevTasks.map(t => t.id === activeTask.id ? { ...t, commentCount: (t.commentCount || 0) + 1 } : t));
    } catch (err) {
      console.error(err);
      alert('Failed to add comment');
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

  if (loading) return <p>Loading Kanban Board...</p>;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate(-1)} style={{ padding: '0.5rem', border: '1px solid #d1d5db', backgroundColor: 'white', borderRadius: '6px', cursor: 'pointer' }}>
          ← Back
        </button>
        <h1 style={{ color: '#1f2937', margin: 0 }}>{project?.name}</h1>
        <div style={{ flex: 1 }}></div>
        <button onClick={openCreateModal} className="btn-primary">+ Add Task</button>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', backgroundColor: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Search tasks..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', width: '250px' }}
        />
        <select 
          value={filterPriority} 
          onChange={(e) => setFilterPriority(e.target.value)}
          style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white' }}
        >
          <option value="">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        
        {/* --- NEW: Pagination Limit Dropdown --- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <label style={{ fontSize: '0.875rem', color: '#4b5563', fontWeight: '500' }}>Tasks per page:</label>
          <select 
            value={taskLimit} 
            onChange={(e) => {
              setTaskLimit(Number(e.target.value));
              setPage({ TO_DO: 1, IN_PROGRESS: 1, COMPLETED: 1 }); // reset pages on limit change
            }}
            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white' }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={9999}>All</option>
          </select>
        </div>
      </div>

      <div style={{ flex: 1, overflowX: 'auto', paddingBottom: '1rem' }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: 'flex', gap: '1.5rem', minWidth: '900px', height: '100%', alignItems: 'flex-start' }}>
            {Object.entries(tasks).map(([status, columnTasks]) => {
              
              // --- NEW: Pagination Logic ---
              const totalPages = Math.ceil(columnTasks.length / taskLimit) || 1;
              const currentPage = page[status];
              const startIndex = (currentPage - 1) * taskLimit;
              const paginatedTasks = columnTasks.slice(startIndex, startIndex + taskLimit);

              return (
              <div key={status} style={{ flex: 1, backgroundColor: '#f9fafb', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', border: '1px solid #e5e7eb', maxHeight: 'calc(100vh - 220px)' }}>
                <h3 style={{ marginBottom: '1rem', color: '#4b5563', fontSize: '0.875rem' }}>
                  {status.replace('_', ' ')} <span style={{ backgroundColor: '#e5e7eb', padding: '0.1rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{columnTasks.length} total</span>
                </h3>
                
                <Droppable droppableId={status}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} style={{ flex: 1, minHeight: '100px', overflowY: 'auto', paddingRight: '5px' }}>
                      {paginatedTasks.map((task, index) => (
                        <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={(e) => openEditModal(e, task)}
                              style={{
                                userSelect: 'none',
                                padding: '1rem',
                                margin: '0 0 0.75rem 0',
                                backgroundColor: snapshot.isDragging ? '#f3f4f6' : 'white',
                                borderRadius: '6px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                border: '1px solid #e5e7eb',
                                borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                                cursor: 'pointer',
                                ...provided.draggableProps.style
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1f2937', fontSize: '0.875rem' }}>{task.title}</h4>
                                {isAdminOrPM && (
                                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                                    <button onClick={(e) => handleDeleteTask(e, task.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }} title="Delete Task">×</button>
                                  </div>
                                )}
                              </div>
                              
                              <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.75rem' }}>{task.description}</p>
                              
                              {task.dueDate && (
                                <div style={{ fontSize: '0.7rem', color: '#d97706', marginBottom: '0.5rem', fontWeight: '500' }}>
                                  Due: {task.dueDate}
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>{new Date(task.createdAt).toLocaleDateString()}</span>
                                  <div 
                                    onClick={(e) => openCommentsModal(e, task)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#6b7280', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f3f4f6', transition: 'background-color 0.2s' }}
                                    title="View Comments"
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                                  >
                                    💬 {task.commentCount || 0}
                                  </div>
                                </div>
                                {task.assignee && (
                                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }} title={task.assignee.username}>
                                    {task.assignee.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                       ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* --- NEW: Pagination Controls --- */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                    <button 
                      disabled={currentPage === 1} 
                      onClick={() => setPage({...page, [status]: currentPage - 1})}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white', border: '1px solid #d1d5db', borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#9ca3af' : '#4b5563' }}
                    >
                      Prev
                    </button>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Page {currentPage} of {totalPages}</span>
                    <button 
                      disabled={currentPage === totalPages} 
                      onClick={() => setPage({...page, [status]: currentPage + 1})}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white', border: '1px solid #d1d5db', borderRadius: '4px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? '#9ca3af' : '#4b5563' }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )})}
          </div>
        </DragDropContext>
      </div>

      {/* Add / Edit Task Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', color: '#1f2937' }}>
              {modalMode === 'CREATE' ? 'Add New Task' : modalMode === 'COMMENTS' ? `Comments: ${activeTask.title}` : (isAdminOrPM ? 'Edit Task' : 'Task Details')}
            </h2>
            
            {modalMode !== 'COMMENTS' && (
            <form onSubmit={handleSubmitTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Title</label>
                <input 
                  type="text" 
                  value={activeTask.title} 
                  onChange={(e) => setActiveTask({...activeTask, title: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: (!isAdminOrPM && modalMode !== 'CREATE' && activeTask.assigneeId !== user.id) ? '#f3f4f6' : 'white' }}
                  required
                  disabled={!isAdminOrPM && modalMode !== 'CREATE' && activeTask.assigneeId !== user.id}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Description</label>
                <textarea 
                  value={activeTask.description} 
                  onChange={(e) => setActiveTask({...activeTask, description: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', minHeight: '60px', backgroundColor: (!isAdminOrPM && modalMode !== 'CREATE' && activeTask.assigneeId !== user.id) ? '#f3f4f6' : 'white' }}
                  disabled={!isAdminOrPM && modalMode !== 'CREATE' && activeTask.assigneeId !== user.id}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Start Date</label>
                  <input 
                    type="date" 
                    value={activeTask.startDate} 
                    onChange={(e) => setActiveTask({...activeTask, startDate: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: (!isAdminOrPM && modalMode !== 'CREATE' && activeTask.assigneeId !== user.id) ? '#f3f4f6' : 'white' }}
                    disabled={!isAdminOrPM && modalMode !== 'CREATE' && activeTask.assigneeId !== user.id}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Due Date</label>
                  <input 
                    type="date" 
                    value={activeTask.dueDate} 
                    onChange={(e) => setActiveTask({...activeTask, dueDate: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: (!isAdminOrPM && modalMode !== 'CREATE' && activeTask.assigneeId !== user.id) ? '#f3f4f6' : 'white' }}
                    disabled={!isAdminOrPM && modalMode !== 'CREATE' && activeTask.assigneeId !== user.id}
                  />
                </div>
              </div>

              {/* Status and Priority are always editable by everyone assigned to the project */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Priority</label>
                  <select 
                    value={activeTask.priority}
                    onChange={(e) => setActiveTask({...activeTask, priority: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white' }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Status</label>
                  <select 
                    value={activeTask.status}
                    onChange={(e) => setActiveTask({...activeTask, status: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: 'white' }}
                  >
                    <option value="TO_DO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Assign To</label>
                <select 
                  value={activeTask.assigneeId}
                  onChange={(e) => setActiveTask({...activeTask, assigneeId: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: !isAdminOrPM ? '#f3f4f6' : 'white' }}
                  disabled={!isAdminOrPM}
                >
                  <option value="">-- Unassigned --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.75rem' }}>{modalMode === 'CREATE' ? 'Add Task' : 'Save Changes'}</button>
              </div>
            </form>
            )}

            {/* Comments Section */}
            {(modalMode === 'EDIT' || modalMode === 'COMMENTS') && (
              <div style={modalMode === 'EDIT' ? { marginTop: '2.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' } : {}}>
                {modalMode === 'EDIT' && <h3 style={{ fontSize: '1rem', color: '#1f2937', marginBottom: '1rem' }}>Comments</h3>}
                
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <input 
                    type="text" 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..." 
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <button type="button" onClick={handleAddComment} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Post</button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {comments.length === 0 ? (
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', margin: '1rem 0' }}>No comments yet.</p>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} style={{ backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <strong style={{ fontSize: '0.875rem', color: '#1f2937' }}>{c.user?.username}</strong>
                          <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#4b5563' }}>{c.content}</p>
                      </div>
                    ))
                  )}
                </div>
                
                {modalMode === 'COMMENTS' && (
                  <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowModal(false)} style={{ padding: '0.5rem 1rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}