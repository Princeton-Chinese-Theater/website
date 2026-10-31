'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type ProductionRecord } from '@/lib/api';
import { safeUrl } from '@/lib/productions';

export default function ArchiveHome() {
  const [records,setRecords]=useState<ProductionRecord[] | null>(null);
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [year,setYear]=useState('');
  const load=()=>{setError('');api<{records:ProductionRecord[]}>('/api/productions').then(data=>setRecords(data.records)).catch(error=>setError(error.message));};
  useEffect(()=>{load();},[]);
  const years=[...new Set((records||[]).map(r=>r.production.year).filter((year):year is string=>!!year))].sort().reverse();
  const filtered=(records||[]).filter(({production:p})=>(!year||p.year===year)&&`${p.title} ${p.titleEn||''} ${p.season||''}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="archive-home wrap"><div className="eyebrow">PRINCETON CHINESE THEATRE / ON THE RECORD</div><h1>好戏，值得被记住。</h1><p className="archive-intro">从开场的第一束光，到谢幕的最后一次鞠躬。<br />在这里，重访每一个属于我们的舞台。</p><div className="archive-tools"><label>寻找一场戏<input placeholder="搜索中文名、英文名或演出季" value={query} onChange={e=>setQuery(e.target.value)} /></label><label>演出年份<select value={year} onChange={e=>setYear(e.target.value)}><option value="">全部年份</option>{years.map(y=><option key={y}>{y}</option>)}</select></label></div>
    {error ? <div className="form-help" role="alert"><p>{error}</p><button className="button" onClick={load}>重试</button></div> : records===null ? <p role="status">正在打开剧目档案……</p> : !records.length ? <div className="empty-state"><div className="eyebrow">THE NEXT CHAPTER</div><h2>新的档案，从这里开始。</h2><p>目前还没有已发布的剧目。管理员可以先保存资料，准备好后再发布。</p><Link className="button primary" href="/admin/">进入管理后台 →</Link><Link className="button" href="/productions/example-production/">查看页面模板</Link></div> : !filtered.length ? <p role="status">没有找到符合条件的剧目，试试其他关键词或年份。</p> : <div className="production-grid">{filtered.map(({production:p})=><a className="production-card" href={`/production/?id=${encodeURIComponent(p.id)}`} key={p.id}><div className="card-art">{safeUrl(p.poster)?<img src={safeUrl(p.poster)} alt={p.posterAlt||`${p.title}海报`} loading="lazy"/>:<span>{p.title}</span>}</div><div className="eyebrow">{p.season||p.year||'剧目档案'}</div><h2>{p.title}</h2>{p.titleEn&&<p>{p.titleEn}</p>}<span className="card-more">走进这场戏 ↗</span></a>)}</div>}
  </div>;
}
