'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Session, type ProductionRecord } from '@/lib/api';
import AdminLogin from './admin-login';
import AdminAccounts from './admin-accounts';
import { DRAFT_KEY } from '@/lib/productions';

export default function AdminDashboard(){
  const [session,setSession]=useState<Session|null>(null),[records,setRecords]=useState<ProductionRecord[]>([]);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function refresh(){
    setError('');
    try{const s=await api<Session>('/api/session');setSession(s);if(s.canEdit){const data=await api<{records:ProductionRecord[]}>('/api/productions?scope=all');setRecords(data.records);}}
    catch(error){setError(error instanceof Error?error.message:'加载失败');}
  }
  useEffect(()=>{void refresh();},[]);
  async function logout(){setBusy(true);try{await api('/api/auth/logout',{method:'POST'});try{localStorage.removeItem(DRAFT_KEY);}catch{}window.location.assign('/admin/login/');}catch(error){setError(error instanceof Error?error.message:'退出失败');}finally{setBusy(false);}}
  if(session&&!session.canEdit)return <AdminLogin/>;
  return <div className="editor admin"><div className="eyebrow">BEHIND THE CURTAIN / 剧目管理</div><h1>每一场戏，都有自己的位置。</h1><p className="editor-intro">在线保存、编辑和发布剧目。已发布内容会直接出现在剧目档案中。</p>
    {error&&<div className="form-help" role="alert">{error}<button className="button" onClick={refresh}>重试</button></div>}
    {!session&&!error&&<p role="status">正在加载管理后台……</p>}
    {session?.canEdit&&<><div className="actions"><Link className="button primary" href="/new-play/">添加新剧 ＋</Link><button className="button" onClick={refresh}>刷新列表</button><button className="button" disabled={busy} onClick={logout}>退出登录</button><span className="admin-session-email">{session.email}</span></div><AdminAccounts currentEmail={session.email||''}/><h2 className="admin-productions-title">剧目管理</h2><div className="admin-list">{!records.length?<div className="empty-state"><h2>这里还没有剧目。</h2><p>添加第一部剧，可以先保存草稿，再补全海报和节目册。</p></div>:records.map(record=><article className="admin-row" key={record.production.id}><div><span className={`status-pill ${record.publicationStatus}`}>{record.publicationStatus==='published'?'已发布':'草稿'}</span><h2>{record.production.title}</h2><p>{record.production.season||record.production.year||record.production.id} · 更新于 {record.updatedAt.slice(0,10)}</p></div><div className="actions"><a className="button" href={`/production/?id=${record.production.id}`}>查看</a><a className="button" href={`/new-play/?id=${record.production.id}`}>编辑 →</a></div></article>)}</div></>}
  </div>;
}
