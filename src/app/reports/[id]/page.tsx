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

// Minimal markdown renderer (headings, bold, lists, paragraphs, code blocks)
function renderMarkdown(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```[\w]*\n([\s\S]*?)```/g, '<pre class="bg-zinc-900 border border-zinc-800 rounded-lg p-4 overflow-x-auto text-xs text-zinc-300 my-4"><code>$1</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-zinc-800 text-orange-300 px-1.5 py-0.5 rounded text-xs">$1</code>');
  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-white mt-6 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-white mt-8 mb-3">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-white mt-8 mb-4">$1</h1>');
  // Bold & italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em class="text-zinc-300">$1</em>');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-orange-400 hover:text-orange-300 underline">$1</a>');
  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr class="border-zinc-800 my-6">');
  // Unordered lists
  html = html.replace(/^[*-] (.+)$/gm, '<li class="text-zinc-300 text-sm">$1</li>');
  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="text-zinc-300 text-sm">$1</li>');
  // Wrap consecutive li items
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul class="list-disc list-inside space-y-1 my-3 pl-2">${match}</ul>`);
  // Paragraphs (double newlines)
  html = html.replace(/\n\n([^<])/g, '\n\n<p class="text-zinc-400 text-sm leading-relaxed mb-4">$1');
  html = html.replace(/([^>])\n\n/g, '$1</p>\n\n');
  // Single newlines in paragraphs
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

        {/* Content */}
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(report.content) }}
        />
      </div>
    </div>
  );
}
