import { motion } from 'framer-motion';
import { getNodeColor } from '../Graph/graphHelpers';

const typeLabels = { entry: 'Entry Point', core: 'Core Logic', util: 'Utility', config: 'Config' };

export default function FileDetailPanel({ node, allNodes, onNodeSelect }) {
  if (!node) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', padding: '2rem',
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(173,170,170,0.3)" strokeWidth="1">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <p className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.75rem', textAlign: 'center', opacity: 0.5 }}>
          Click a node to view details
        </p>
      </div>
    );
  }

  const color = getNodeColor(node.type);
  const pathIdentifier = node.fullPath || node.id || '';
  const dependents = allNodes ? allNodes.filter(n => n.deps && n.deps.some(d => 
    d === pathIdentifier || d.endsWith(pathIdentifier) || pathIdentifier.endsWith(d)
  )) : [];

  return (
    <motion.div
      key={node.fullPath}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '1.25rem', overflowY: 'auto', height: '100%' }}
    >
      {/* File path */}
      <p className="font-mono" style={{
        color: 'var(--text-primary)', fontSize: '0.8125rem', wordBreak: 'break-all',
        marginBottom: '0.75rem', lineHeight: 1.5,
      }}>
        {node.fullPath || node.id || 'Unknown Path'}
      </p>

      {/* Badges */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <span className={`badge-${node.type}`} style={{
          padding: '0.25rem 0.625rem', borderRadius: '0.375rem',
          fontSize: '0.6875rem', fontWeight: 500,
        }}>
          {typeLabels[node.type] || node.type}
        </span>
        {node.highImpact && (
          <span className="badge-high" style={{
            padding: '0.25rem 0.625rem', borderRadius: '0.375rem',
            fontSize: '0.6875rem', fontWeight: 600,
          }}>
            ⚠ HIGH IMPACT
          </span>
        )}
      </div>

      {/* AI Summary */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="font-mono" style={{
          color: 'var(--accent-end)', fontSize: '0.6rem', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600,
        }}>
          AI Explanation
        </p>
        <div className="accent-top" style={{
          background: 'var(--bg-nested)', borderRadius: '0.375rem',
          padding: '0.875rem',
        }}>
          <p style={{
            color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.6,
          }}>
            {node.ai || 'No summary available.'}
          </p>
        </div>
      </div>

      {/* Impact Score */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p className="font-mono" style={{
          color: 'var(--text-secondary)', fontSize: '0.6rem', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: '0.5rem',
        }}>
          Impact Score
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {node.impact}
          </span>
          <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/10</span>
        </div>
        <div style={{
          height: 4, background: 'var(--bg-nested)', borderRadius: 2, overflow: 'hidden',
          marginBottom: '0.375rem',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(node.impact / 10) * 100}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: '100%', borderRadius: 2,
              background: node.impact >= 7 ? '#ef4444' : node.impact >= 4 ? '#f59e0b' : '#22c55e',
            }}
          />
        </div>
        <p className="font-mono" style={{
          color: 'var(--text-secondary)', fontSize: '0.6875rem', opacity: 0.7,
        }}>
          {node.incomingEdges || 0} files depend on this
        </p>
      </div>

      {/* Imports */}
      {node.deps && node.deps.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p className="font-mono" style={{
            color: 'var(--text-secondary)', fontSize: '0.6rem', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: '0.5rem',
          }}>
            Imports ({node.deps.length})
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {node.deps.map(dep => {
              const depNode = allNodes?.find(n => n.id === dep || dep.endsWith(n.id) || n.id.endsWith(dep));
              const depColor = depNode ? getNodeColor(depNode.type) : 'var(--text-secondary)';
              return (
                <button key={dep} onClick={() => {
                  if (depNode) onNodeSelect(depNode);
                }} className="font-mono" style={{
                  background: 'var(--bg-nested)', border: `1px solid ${depColor}30`,
                  color: depColor, fontSize: '0.6875rem', padding: '0.25rem 0.5rem',
                  borderRadius: '0.375rem', cursor: depNode ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}>
                  {dep.split('/').pop()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dependents */}
      {dependents.length > 0 && (
        <div>
          <p className="font-mono" style={{
            color: 'var(--text-secondary)', fontSize: '0.6rem', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: '0.5rem',
          }}>
            Used By ({dependents.length})
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {dependents.map(dep => {
              const depColor = getNodeColor(dep.type);
              return (
                <button key={dep.id} onClick={() => onNodeSelect(dep)} className="font-mono" style={{
                  background: 'var(--bg-nested)', border: `1px solid ${depColor}30`,
                  color: depColor, fontSize: '0.6875rem', padding: '0.25rem 0.5rem',
                  borderRadius: '0.375rem', cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  {dep.id.split('/').pop()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
