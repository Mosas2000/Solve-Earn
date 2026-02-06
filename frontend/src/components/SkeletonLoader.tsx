import React from 'react';
import '../styles/SkeletonLoader.css';

interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  width,
  height,
  count = 1
}) => {
  const getClassName = () => {
    return `skeleton-loader skeleton-${variant}`;
  };

  const getStyle = () => {
    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;
    return style;
  };

  if (count === 1) {
    return <div className={getClassName()} style={getStyle()} />;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={getClassName()} style={getStyle()} />
      ))}
    </>
  );
};

export const BountyCardSkeleton: React.FC = () => {
  return (
    <div className="bounty-card-skeleton">
      <div className="skeleton-header">
        <SkeletonLoader variant="rectangular" width="60%" height={24} />
        <SkeletonLoader variant="circular" width={40} height={40} />
      </div>
      <SkeletonLoader variant="text" width="100%" height={16} count={3} />
      <div className="skeleton-footer">
        <SkeletonLoader variant="rectangular" width={80} height={32} />
        <SkeletonLoader variant="rectangular" width={80} height={32} />
      </div>
    </div>
  );
};
