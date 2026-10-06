import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', height: '100vh' }}>
        {children}
      </div>
    </div>
  );
}
