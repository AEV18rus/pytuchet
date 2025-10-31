'use client';

import { useState, useEffect } from 'react';

interface VersionInfo {
  version: string;
  buildDate: string;
  description: string;
}

export default function VersionDisplay() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Загружаем информацию о версии
    console.log('VersionDisplay: Загружаем информацию о версии...');
    fetch('/version.json')
      .then(response => response.json())
      .then(data => {
        console.log('VersionDisplay: Версия загружена:', data);
        setVersionInfo(data);
      })
      .catch(error => console.error('Ошибка загрузки версии:', error));
  }, []);

  if (!versionInfo) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      zIndex: 1000
    }}>
      <div 
        style={{
          backgroundColor: 'var(--primary-color)',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          userSelect: 'none'
        }}
        onClick={() => setShowDetails(!showDetails)}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--primary-light)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--primary-color)';
        }}
      >
        v{versionInfo.version}
      </div>
      
      {showDetails && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: '0',
          marginBottom: '8px',
          backgroundColor: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          padding: '16px',
          minWidth: '320px',
          maxWidth: '384px'
        }}>
          <div style={{ fontSize: '14px' }}>
            <div style={{
              fontWeight: '600',
              color: 'var(--font-color)',
              marginBottom: '8px'
            }}>
              Версия {versionInfo.version}
            </div>
            <div style={{
              color: '#666',
              marginBottom: '8px'
            }}>
              Сборка: {formatDate(versionInfo.buildDate)}
            </div>
            <div style={{
              color: 'var(--font-color)',
              fontSize: '12px',
              lineHeight: '1.5'
            }}>
              {versionInfo.description}
            </div>
          </div>
          <div style={{
            position: 'absolute',
            top: '100%',
            right: '16px',
            width: '0',
            height: '0',
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '4px solid white'
          }}></div>
        </div>
      )}
    </div>
  );
}