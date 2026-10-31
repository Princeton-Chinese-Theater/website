'use client';
import { useLanguage } from '@/components/language-provider';
import TitleCover from '@/components/title-cover';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type ProductionRecord } from '@/lib/api';
import { productionTerm, safeUrl } from '@/lib/productions';
const detail=(id:string)=>`/production/?id=${encodeURIComponent(id)}`;

export default function ArchiveHome(){
  const {t,language}=useLanguage();
  const [records,setRecords]=useState<ProductionRecord[]|null>(null),[error,setError]=useState('');
  const [query,setQuery]=useState(''),[year,setYear]=useState(''),[view,setView]=useState<'grid'|'list'>('grid');
  const resultsRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(resultsRef.current)resultsRef.current.scrollTop=0;},[query,year,view]);
  const load=()=>{setError('');api<{records:ProductionRecord[]}>('/api/productions').then(data=>setRecords(data.records)).catch(error=>setError(error.message));};
  useEffect(()=>{load();},[]);
  const years=[...new Set((records||[]).map(r=>r.production.year).filter((y):y is string=>!!y))].sort().reverse();
  const filtered=useMemo(()=>[...(records||[])].sort((a,b)=>(b.production.year||'').localeCompare(a.production.year||'')).filter(({production:p})=>(!year||p.year===year)&&`${p.title} ${p.titleEn||''} ${t(productionTerm(p))}`.toLowerCase().includes(query.toLowerCase())),[records,year,query]);
  return <div id="top" className="archive-page">
    <section className="repertoire wrap" id="productions" aria-labelledby="repertoire-title"><div className="repertoire-heading"><h2 id="repertoire-title">{t("剧目档案")}</h2><div className="archive-controls"><label className="archive-search"><span aria-hidden="true">⌕</span><input aria-label={t("搜索剧目")} placeholder={t("寻找一场戏")} value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')} aria-label={t("清除搜索")}>×</button>}</label><div className="view-controls" role="group" aria-label={t("展示方式")}><button aria-label={t("海报网格")} aria-pressed={view==='grid'} className={view==='grid'?'active':''} onClick={()=>setView('grid')}>▦</button><button aria-label={t("剧目列表")} aria-pressed={view==='list'} className={view==='list'?'active':''} onClick={()=>setView('list')}>☷</button></div></div></div>
      <div className="archive-tools"><div className="year-filters" role="group" aria-label={t("按年份筛选")}><button className={!year?'active':''} aria-pressed={!year} onClick={()=>setYear('')}>{t("全部演出")} <sup>{records?.length??'—'}</sup></button>{years.map(y=><button key={y} className={year===y?'active':''} aria-pressed={year===y} onClick={()=>setYear(y)}>{y}</button>)}</div></div>
      <div className="archive-results" ref={resultsRef} role="region" aria-labelledby="repertoire-title" tabIndex={0}>
      {error?<div className="form-help" role="alert"><p>{error}</p><button className="button" onClick={load}>{t("重新加载")}</button></div>:records===null?<div className="archive-loading" role="status">{t("正在打开剧目档案……")}</div>:!records.length?<div className="empty-state"><h3>{t("更多故事，即将入藏。")}</h3><p>{t("历年剧目资料正在整理中。")}</p></div>:!filtered.length?<div className="empty-state" role="status"><h3>{t("这场戏，暂时还没找到。")}</h3><button className="text-link" onClick={()=>{setQuery('');setYear('');}}>{t("清除筛选，查看所有剧目 →")}</button></div>:<div className={`production-grid ${view==='list'?'list-view':''}`}>{filtered.map(({production:p},index)=><a className={`production-card card-${p.id.includes('rhino')?'rhino':p.id.includes('tea')?'tea':'poster'}`} href={detail(p.id)} key={p.id}><div className="card-art">{safeUrl(p.poster)?<img src={safeUrl(p.poster)} alt={language==='en'?`${p.titleEn||p.title} — production poster`:(p.posterAlt||`${p.title}演出海报`)} loading="lazy"/>:<TitleCover production={p} />}<span className="card-open" aria-hidden="true">↗</span></div><div className="card-info"><div className="card-season"><span>{t(productionTerm(p))}</span><span>{String(index+1).padStart(2,'0')}</span></div><h3>{language==='en'?(p.titleEn||p.title):p.title}</h3>{language==='en'&&p.titleEn&&<p>{p.title}</p>}</div></a>)}</div>}
      <p className="archive-endnote">{t("档案持续整理中。每一次回望，都是一次重逢。")}</p>
      </div>
    </section>
  </div>;
}
