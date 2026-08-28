// ============================================
// SKELETON LOADING COMPONENTS
// ============================================

export function SkeletonCard({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-text-short" />
        </div>
      ))}
    </>
  );
}

export function SkeletonStats() {
  return (
    <div className="skeleton-stats-grid">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton-stat">
          <div className="skeleton skeleton-label" />
          <div className="skeleton skeleton-value" />
          <div className="skeleton skeleton-change" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-th" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-table-row">
          {Array.from({ length: 6 }).map((_, j) => (
            <div key={j} className="skeleton skeleton-td" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonRanking() {
  return (
    <div className="skeleton-ranking">
      <div className="skeleton-ranking-header">
        <div className="skeleton skeleton-badge" />
        <div className="skeleton-ranking-info">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text" />
        </div>
      </div>
      <div className="skeleton skeleton-progress" />
      <div className="skeleton-ranking-stats">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-stat-item" />
        ))}
      </div>
    </div>
  );
}