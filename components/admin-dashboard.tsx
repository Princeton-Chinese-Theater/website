'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Session, type ProductionRecord } from '@/lib/api';

export default function AdminDashboard(){
  const [session,setSession]=useState<Session|null>(null),[records,setRecords]=useState<ProductionRecord[]>([]);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function refresh(){
    setError('');
    try{const s=await api<Session>('/api/session');setSession(s);if(s.canEdit){const data=await api<{records:ProductionRecord[]}>('/api/productions?scope=all');setRecords(data.records);}}
    catch(error){setError(error instanceof Error?error.message:'加载失败');}
  }
  useEffect(()=>{void refresh();},[]);
  async function setup(){setBusy(true);try{await api('/api/setup',{method:'POST'});await refresh();}catch(error){setError(error instanceof Error?error.message:'初始化失败');}finally{setBusy(false);}}
  return <div className="editor admin"><div className="eyebrow">BEHIND THE CURTAIN / 剧目管理</div><h1>每一场戏，都有自己的位置。</h1><p className="editor-intro">在线保存、编辑和发布剧目。已发布内容会直接出现在剧目档案中。</p>
    {error&&<div className="form-help" role="alert">{error}<button className="button" onClick={refresh}>重试</button></div>}
    {!session&&!error&&<p role="status">正在加载管理后台……</p>}
    {session&&!session.authenticated&&<div className="form-help"><p>请使用网站所有者账号登录后管理内容。</p><a className="button primary" href="/signin-with-chatgpt?return_to=%2Fadmin%2F" target="_top">登录管理后台 ↗</a></div>}
    {session?.authenticated&&!session.configured&&<div className="form-help"><h2>启用剧社后台</h2><p>网站目前仅所有者可访问。首次启用后，当前账号将成为内容管理员。</p><button className="button primary" disabled={busy} onClick={setup}>{busy?'正在启用……':'启用管理后台'}</button></div>}
    {session?.configured&&!session.canEdit&&<p>当前账号没有管理权限，请使用已登记的管理员账号登录。</p>}
    {session?.canEdit&&<><div className="actions"><Link className="button primary" href="/new-play/">添加新剧 ＋</Link><button className="button" onClick={refresh}>刷新列表</button></div><div className="admin-list">{!records.length?<div className="empty-state"><h2>这里还没有剧目。</h2><p>添加第一部剧，可以先保存草稿，再补全海报和节目册。</p></div>:records.map(record=><article className="admin-row" key={record.production.id}><div><span className={`status-pill ${record.publicationStatus}`}>{record.publicationStatus==='published'?'已发布':'草稿'}</span><h2>{record.production.title}</h2><p>{record.production.season||record.production.year||record.production.id} · 更新于 {record.updatedAt.slice(0,10)}</p></div><div className="actions"><a className="button" href={`/production/?id=${record.production.id}`}>查看</a><a className="button" href={`/new-play/?id=${record.production.id}`}>编辑 →</a></div></article>)}</div></>}
  </div>;
}
