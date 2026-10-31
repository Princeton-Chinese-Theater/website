'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type ProductionRecord } from '@/lib/api';
import ProductionPage from './production-page';

export default function LiveProduction() {
  const [record,setRecord]=useState<ProductionRecord|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    const id=new URLSearchParams(window.location.search).get('id');
    if(!id||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)){setError('剧目编号无效');return;}
    api<{record:ProductionRecord}>(`/api/productions/${id}`).then(({record})=>{setRecord(record);document.title=`${record.production.title} · 普林斯顿中文剧社`;}).catch(error=>setError(error.message));
  },[]);
  if(error)return <div className="error"><h1>档案暂时无法打开</h1><p role="alert">{error}</p><Link href="/">返回剧目档案 →</Link></div>;
  if(!record)return <p className="loading" role="status">正在打开剧目档案……</p>;
  return <>{record.publicationStatus==='draft'&&<div className="notice">管理员预览 · 本剧仍为草稿，未对访客发布。<a href={`/new-play/?id=${record.production.id}`}>继续编辑 →</a></div>}<ProductionPage play={record.production}/></>;
}
