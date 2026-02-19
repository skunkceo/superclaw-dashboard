'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Report {
  id: string;
  title: string;
  type: string;
  content: string;
  suggestion_id: string | null;
  overnight_run_id: string | null;
  created_at: number;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Callout config ───────────────────────────────────────────────────────────

const CALLOUT_STYLES: Record<string, { border: string; bg: string; label: string; labelColor: string; icon: string }> = {
  TLDR:       { border: '#f97316', bg: 'rgba(249,115,22,0.08)',  label: 'TL;DR',       labelColor: '#fb923c', icon: '⚡' },
  INSIGHT:    { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  label: 'Key Insight', labelColor: '#60a5fa', icon: '💡' },
  COMPETITOR: { border: '#ef4444', bg: 'rgba(239,68,68,0.08)',   label: 'Competitor',  labelColor: '#f87171', icon: '⚔' },
  OPPORTUNITY:{ border: '#22c55e', bg: 'rgba(34,197,94,0.08)',   label: 'Opportunity', labelColor: '#4ade80', icon: '▲' },
  WARNING:    { border: '#eab308', bg: 'rgba(234,179,8,0.08)',   label: 'Watch',       labelColor: '#facc15', icon: '⚠' },
  ACTION:     { border: '#a855f7', bg: 'rgba(168,85,247,0.08)',  label: 'Action',      labelColor: '#c084fc', icon: '→' },
  NOTE:       { border: '#71717a', bg: 'rgba(113,113,122,0.08)', label: 'Note',        labelColor: '#a1a1aa', icon: 'ℹ' },
  STAT:       { border: '#06b6d4', bg: 'rgba(6,182,212,0.08)',   label: 'Stat',        labelColor: '#22d3ee', icon: '#' },
};

// ─── Report markdown renderer ──────────────────────────────────────────────────
// Reports are trusted internal content — HTML passes through without escaping.

function renderMarkdown(md: string): string {
  let html = md;

  // ── GitHub-style callout blocks > [!TYPE] ... ──────────────────────────────
  // Matches multi-line blocks of > lines where the first is > [!TYPE]
  html = html.replace(
    /^(> \[!([A-Z]+)\]\n((?:>.*\n?)*))$/gm,
    (_, __, type, body) => {
      const cfg = CALLOUT_STYLES[type] || CALLOUT_STYLES.NOTE;
      const content = body.replace(/^> ?/gm, '').trim();
      return `<div style="border-left:3px solid ${cfg.border};background:${cfg.bg};border-radius:0.5rem;padding:1rem 1.25rem;margin:1.25rem 0;">
  <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.08em;color:${cfg.labelColor};text-transform:uppercase;margin-bottom:0.5rem;">${cfg.icon} ${cfg.label}</div>
  <div style="color:#e4e4e7;font-size:0.95rem;line-height:1.6;">${content}</div>
</div>\n`;
    }
  );

  // ── Plain blockquotes ─────────────────────────────────────────────────────
  html = html.replace(
    /((?:^> .+\n?)+)/gm,
    (match) => {
      const content = match.replace(/^> ?/gm, '').trim();
      return `<blockquote style="border-left:3px solid #52525b;background:rgba(63,63,70,0.3);border-radius:0 0.5rem 0.5rem 0;padding:0.75rem 1rem;margin:1rem 0;color:#a1a1aa;font-style:italic;">${content}</blockquote>\n`;
    }
  );

  // ── Code blocks ───────────────────────────────────────────────────────────
  html = html.replace(/```[\w]*\n([\s\S]*?)```/g, '<pre style="background:#09090b;border:1px solid #27272a;border-radius:0.5rem;padding:1rem;overflow-x:auto;font-size:0.75rem;color:#d4d4d8;margin:1rem 0;"><code>$1</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:#27272a;color:#fb923c;padding:0.15rem 0.4rem;border-radius:0.25rem;font-size:0.8em;">$1</code>');

  // ── Headings ──────────────────────────────────────────────────────────────
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:1.1rem;font-weight:600;color:#fff;margin:1.75rem 0 0.5rem;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:1.4rem;font-weight:700;color:#fff;margin:2.5rem 0 0.75rem;padding-bottom:0.5rem;border-bottom:1px solid #27272a;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:1.8rem;font-weight:700;color:#fff;margin:2rem 0 1rem;">$1</h1>');

  // ── Bold & italic ─────────────────────────────────────────────────────────
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong style="color:#fff;font-weight:600;">$1</strong>');
  html = html.replace(/\*([^*\n]+)\*/g, '<em style="color:#d4d4d8;">$1</em>');

  // ── Links ─────────────────────────────────────────────────────────────────
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#fb923c;text-decoration:underline;">$1</a>');

  // ── Horizontal rules ──────────────────────────────────────────────────────
  html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #27272a;margin:2rem 0;">');

  // ── Tables ────────────────────────────────────────────────────────────────
  html = html.replace(
    /^(\|.+\|[ \t]*\n\|[-| :]+\|[ \t]*\n(?:\|.+\|[ \t]*\n?)+)/gm,
    (match) => {
      const lines = match.trim().split('\n');
      const headerCells = lines[0].split('|').slice(1, -1).map(c => c.trim());
      const bodyLines = lines.slice(2).filter(l => l.trim());
      const thStyle = 'padding:0.6rem 1rem;text-align:left;font-size:0.75rem;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #3f3f46;white-space:nowrap;';
      const tdStyle = 'padding:0.65rem 1rem;font-size:0.9rem;color:#d4d4d8;border-bottom:1px solid #27272a;';
      const thead = `<thead><tr>${headerCells.map(h => `<th style="${thStyle}">${h}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${bodyLines.map(line => {
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        return `<tr style="transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background=''">${cells.map(c => `<td style="${tdStyle}">${c}</td>`).join('')}</tr>`;
      }).join('')}</tbody>`;
      return `<div style="overflow-x:auto;margin:1.5rem 0;border-radius:0.5rem;border:1px solid #27272a;"><table style="width:100%;border-collapse:collapse;">${thead}${tbody}</table></div>\n`;
    }
  );

  // ── Lists ─────────────────────────────────────────────────────────────────
  html = html.replace(/^[*-] (.+)$/gm, '<li style="color:#d4d4d8;margin:0.3rem 0;">$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="color:#d4d4d8;margin:0.3rem 0;">$1</li>');
  html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, (match) =>
    `<ul style="list-style:disc;padding-left:1.5rem;margin:0.75rem 0;">${match}</ul>`
  );

  // ── Paragraphs ────────────────────────────────────────────────────────────
  html = html.replace(/\n\n([^<\n])/g, '\n\n<p style="color:#a1a1aa;font-size:1rem;line-height:1.7;margin-bottom:1rem;">$1');
  html = html.replace(/([^>\n])\n\n/g, '$1</p>\n\n');
  html = html.replace(/([^>\n])\n([^<\n])/g, '$1<br>$2');

  return html;
}

export default function ReportDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/reports/${id}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(d => { if (d) { setReport(d.report); setLoading(false); } })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Delete this report? This cannot be undone.')) return;
    setDeleting(true);
    await fetch(`/api/reports/${id}`, { method: 'DELETE' });
    window.location.href = '/reports';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-600 text-sm">Loading report...</div>
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-500 text-sm mb-4">Report not found</div>
          <Link href="/reports" className="text-orange-400 hover:text-orange-300 text-sm">
            Back to Reports
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Nav */}
        <div className="flex items-center gap-2 text-sm text-zinc-600 mb-6">
          <Link href="/reports" className="hover:text-zinc-400 transition-colors">Reports</Link>
          <span>/</span>
          <span className="text-zinc-400 truncate">{report.title}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 capitalize">
                {report.type}
              </span>
              <span className="text-xs text-zinc-600">{formatDate(report.created_at)}</span>
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">{report.title}</h1>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-shrink-0 p-2 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Delete report"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Content — strip leading h1 since title is already shown in the header */}
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(report.content.replace(/^#[^\n]*\n+/, '')) }}
        />
      </div>
    </div>
  );
}
