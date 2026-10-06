import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ workspaces: 0, projects: 0, tasks: 0, total: 0, todo: 0, inProgress: 0, completed: 0 });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        const [wsRes, activityRes] = await Promise.all([
          api.get('/workspaces'),
          api.get('/activities')
        ]);
        
        const workspaces = wsRes.data;
        let totalProjects = 0;
        let totalToDoTasks = 0;
        let totalInProgressTasks = 0;
        let totalCompletedTasks = 0;

        // Fetch all projects and tasks for the user's workspaces
        for (const ws of workspaces) {
          try {
            const projRes = await api.get(`/projects/workspace/${ws.id}`);
            const projects = projRes.data;
            totalProjects += projects.length;

            for (const proj of projects) {
              const tasksRes = await api.get(`/tasks/project/${proj.id}`);
              const tasks = tasksRes.data;
              
              for (const t of tasks) {
                if (t.status === 'TO_DO') totalToDoTasks++;
                else if (t.status === 'IN_PROGRESS') totalInProgressTasks++;
                else if (t.status === 'COMPLETED') totalCompletedTasks++;
              }
            }
          } catch (err) {
            console.error(`Error fetching data for workspace ${ws.id}`, err);
          }
        }

        const pendingTasks = totalToDoTasks + totalInProgressTasks;
        setStats({ 
          workspaces: workspaces.length, 
          projects: totalProjects, 
          tasks: pendingTasks,
          total: pendingTasks + totalCompletedTasks,
          todo: totalToDoTasks,
          inProgress: totalInProgressTasks,
          completed: totalCompletedTasks
        });
        setActivities(activityRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData(true);
    
    const intervalId = setInterval(() => {
      fetchDashboardData(false);
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [user]);

  const cardStyle = {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    flex: 1,
    minWidth: '200px'
  };

  const getActionIcon = (action) => {
    if (!action) return '📝';
    if (action.includes('CREATED')) return '✨';
    if (action.includes('DELETED')) return '🗑️';
    if (action.includes('UPDATED')) return '🔄';
    return '📝';
  };

  const isPrivileged = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_PROJECT_MANAGER';
  const totalTasks = stats.total || 0;
  const todoPct = totalTasks ? Math.round((stats.todo / totalTasks) * 100) : 0;
  const inProgressPct = totalTasks ? Math.round((stats.inProgress / totalTasks) * 100) : 0;
  const completedPct = totalTasks ? Math.round((stats.completed / totalTasks) * 100) : 0;

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', color: '#1f2937' }}>Welcome back, {user?.username}! 👋</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Here is what's happening across your workspaces today.</p>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
        <div style={cardStyle}>
          <h3 style={{ color: '#6b7280', fontSize: '0.875rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>My Workspaces</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
            {loading ? '-' : stats.workspaces}
          </p>
        </div>
        <div style={cardStyle}>
          <h3 style={{ color: '#6b7280', fontSize: '0.875rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Assigned Projects</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
            {loading ? '-' : stats.projects}
          </p>
        </div>
        <div style={cardStyle}>
          <h3 style={{ color: '#6b7280', fontSize: '0.875rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Tasks</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4f46e5', margin: 0 }}>
            {loading ? '-' : stats.total}
          </p>
        </div>
        <div style={cardStyle}>
          <h3 style={{ color: '#6b7280', fontSize: '0.875rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pending Tasks</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706', margin: 0 }}>
            {loading ? '-' : stats.tasks}
          </p>
        </div>
      </div>

      {/* Charts Section for Admin/PM */}
      {isPrivileged && (
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
          {/* Pie Chart Card */}
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ color: '#6b7280', fontSize: '0.875rem', textTransform: 'uppercase', marginBottom: '1.5rem', width: '100%' }}>Task Distribution (Pie)</h3>
            
            {totalTasks === 0 ? (
              <p style={{ color: '#9ca3af', margin: 'auto' }}>No tasks available</p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', width: '100%', justifyContent: 'center' }}>
                <div 
                  title={`To Do: ${stats.todo} | In Progress: ${stats.inProgress} | Completed: ${stats.completed}`}
                  style={{
                  width: '120px', height: '120px', borderRadius: '50%',
                  background: `conic-gradient(
                    #ef4444 0% ${todoPct}%, 
                    #f59e0b ${todoPct}% ${todoPct + inProgressPct}%, 
                    #10b981 ${todoPct + inProgressPct}% 100%
                  )`
                }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px' }}></div> <span style={{ fontSize: '0.875rem' }}>To Do ({stats.todo})</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '2px' }}></div> <span style={{ fontSize: '0.875rem' }}>In Progress ({stats.inProgress})</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px' }}></div> <span style={{ fontSize: '0.875rem' }}>Completed ({stats.completed})</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: '#1f2937', margin: 0, fontSize: '1.25rem' }}>Activity Timeline</h2>
          <Link to="/history" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: '#4f46e5', fontWeight: '500', fontSize: '0.875rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M12 7v5l4 2" />
            </svg>
            History
          </Link>
        </div>
        {loading ? <p>Loading activities...</p> : (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            {activities.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', margin: 0 }}>No recent activity to show.</p>
            ) : (
              activities.slice(0, 5).map((activity, index) => (
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
    </div>
  );
}