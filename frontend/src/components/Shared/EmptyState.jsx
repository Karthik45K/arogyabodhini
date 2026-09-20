import React from 'react';

const EmptyState = ({ icon, title, description, action }) => {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 20px', textAlign: 'center',
      color: '#666', background: '#fafafa', borderRadius: '12px', border: '1px dashed #ddd'
    }}>
      {icon && <div style={{ fontSize: '3rem', marginBottom: '16px', color: '#ccc' }}>{icon}</div>}
      <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>{title}</h3>
      <p style={{ margin: '0 0 20px 0', maxWidth: '400px' }}>{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
