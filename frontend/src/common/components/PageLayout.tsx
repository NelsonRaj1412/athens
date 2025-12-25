// src/common/components/PageLayout.tsx

import React from 'react';
import { Typography, Breadcrumb, Space, Button, Divider } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

const { Title, Text } = Typography;

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{
    title: string;
    href?: string;
  }>;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  showDivider?: boolean;
  icon?: ReactNode;
  extra?: ReactNode;
  responsive?: boolean;
}

/**
 * Standardized page layout component for consistent structure across all pages
 * 
 * Features:
 * - Consistent spacing and typography
 * - Optional breadcrumbs navigation
 * - Action buttons area
 * - Responsive design
 * - Theme-aware styling
 */
const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
  className = '',
  showDivider = true,
  icon,
  extra,
  responsive = true,
}) => {
  const containerClass = responsive ? 'responsive-spacing-md' : '';
  const titleClass = responsive ? 'responsive-title-lg' : '';
  
  return (
    <div 
      className={`page-layout ${containerClass} ${className}`}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Page Header */}
      <div 
        className="page-header responsive-spacing-sm"
        style={{
          flexShrink: 0,
          backgroundColor: 'var(--color-ui-base)',
          borderBottom: showDivider ? '1px solid var(--color-border)' : 'none',
          borderRadius: '8px 8px 0 0'
        }}
      >
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb 
            style={{ 
              marginBottom: 16,
              fontSize: 'clamp(0.75rem, 2vw, 0.875rem)'
            }}
          >
            <Breadcrumb.Item>
              <a href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
                <HomeOutlined />
              </a>
            </Breadcrumb.Item>
            {breadcrumbs.map((crumb, index) => (
              <Breadcrumb.Item key={index}>
                {crumb.href ? (
                  <a href={crumb.href} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {crumb.title}
                  </a>
                ) : (
                  crumb.title
                )}
              </Breadcrumb.Item>
            ))}
          </Breadcrumb>
        )}

        {/* Title and Actions Row */}
        <div className="flex-col-mobile" style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          justifyContent: 'space-between', 
          gap: 16 
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              marginBottom: 4,
              flexWrap: 'wrap'
            }}>
              {icon && <span style={{ fontSize: 'clamp(1.25rem, 3vw, 1.5rem)' }}>{icon}</span>}
              <Title 
                level={2} 
                className={titleClass}
                style={{ 
                  margin: 0,
                  fontSize: 'clamp(1.25rem, 4vw, 2rem)',
                  lineHeight: 1.2,
                  wordBreak: 'break-word'
                }}
              >
                {title}
              </Title>
            </div>
            {subtitle && (
              <Text 
                type="secondary"
                style={{
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                  display: 'block',
                  marginTop: 4
                }}
              >
                {subtitle}
              </Text>
            )}
          </div>
          
          <div className="responsive-button-group" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 16, 
            flexShrink: 0,
            marginTop: window.innerWidth < 769 ? 16 : 0
          }}>
            {extra && <div>{extra}</div>}
            {actions && (
              <Space size="middle" wrap style={{ justifyContent: 'center' }}>
                {actions}
              </Space>
            )}
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div 
        className="page-content responsive-scroll-container"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 'clamp(1rem, 3vw, 2rem)',
          backgroundColor: 'var(--color-bg-base)'
        }}
      >
        <div style={{ 
          height: '100%',
          maxWidth: '100%',
          margin: '0 auto'
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
