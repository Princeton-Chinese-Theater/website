'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Session, type ProductionRecord } from '@/lib/api';
import ProductionForm from './production-form';

export default function LiveEditor(){
  const [session,setSession]=useState<Session|null>(null),[record,setRecord]=useState<ProductionRecord|undefined>(),[ready,setReady]=useState(false),[error,setError]=useState('');
  useEffect(()=>{let active=true;(async()=>{try{const s=await api<Session>('/api/session');if(!active)return;setSession(s);const id=new URLSearchParams(location.search).get('id');if(id&&s.canEdit){const data=await api<{record:ProductionRecord}>(`/api/productions/${encodeURIComponent(id)}`);if(active)setRecord(data.record);}if(active)setReady(true);}catch(error){if(active)setError(error instanceof Error?error.message:'加载失败');}})();return()=>{active=false;};},[]);
  if(error)return <div className="form-help" role="alert">{error}<p><Link href="/admin/">返回管理后台 →</Link></p></div>;
  if(!ready)return <p role="status">正在读取剧目资料……</p>;
  if(!session?.canEdit)return <div className="form-help"><p>请先启用管理后台，或使用管理员账号登录。</p><Link className="button primary" href="/admin/">进入管理后台 →</Link></div>;
  return <ProductionForm existingIds={[]} initialRecord={record}/>;
}
