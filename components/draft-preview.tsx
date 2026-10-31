'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DRAFT_KEY, isProduction, type Production } from '@/lib/productions';
import ProductionPage from './production-page';

export default function DraftPreview() {
  const [play, setPlay] = useState<Production | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      const draft: unknown = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!isProduction(draft)) { setError('没有可预览的有效草稿，请先填写新剧资料。'); return; }
      setPlay(draft);
    } catch { setError('无法读取本机草稿，请重新填写。'); }
  }, []);
  if (error) return <div className="error"><h1>草稿暂时无法打开</h1><p>{error}</p><Link href="/new-play/">填写或恢复新剧资料 →</Link></div>;
  if (!play) return <p className="loading" role="status">正在打开本机草稿……</p>;
  return <><div className="notice">本机草稿预览 · 尚未发布。<Link href="/new-play/">返回填写页，恢复草稿继续编辑 →</Link></div><ProductionPage play={play} /></>;
}
