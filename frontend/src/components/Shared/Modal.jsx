import React from 'react';

const Modal = ({ isOpen, onClose, title, children, actions }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="anim-in" style={{
        background: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          padding: '20px', borderBottom: '1px solid #eee',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, color: '#333' }}>{title}</h3>
          <button onClick={onClose} style={{ fontSize: '1.5rem', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
        </div>
        
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
        
        {actions && (
          <div style={{
            padding: '16px 20px', borderTop: '1px solid #eee',
            display: 'flex', justifyContent: 'flex-end', gap: '10px',
            background: '#fafafa', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px'
          }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
