'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { fieldGroups } from '@/lib/form-fields';
import { productionFromForm, formValue } from '@/lib/form-data';
import { DRAFT_KEY, isProduction } from '@/lib/productions';
import { api, type ProductionRecord } from '@/lib/api';

export default function ProductionForm({ existingIds, initialRecord }: { existingIds: string[]; initialRecord?: ProductionRecord }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState('');
  const [savedRecord,setSavedRecord]=useState(initialRecord);
  const [busy,setBusy]=useState(false);
  const router = useRouter();

  function collect() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return null;
    try {
      const play = productionFromForm(new FormData(form));
      if (existingIds.includes(play.id) && play.id!==savedRecord?.production.id) { setStatus('此剧目编号已经存在，请为新剧使用另一个编号。'); return null; }
      return play;
    } catch (error) { setStatus(error instanceof Error ? error.message : '请检查剧目资料'); return null; }
  }
  function preview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const play = collect();
    if (!play) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(play));
      router.push('/preview/');
    } catch { setStatus('浏览器无法保存草稿，暂时不能预览。请下载 JSON 留存。'); }
  }
  function download() {
    const play = collect();
    if (!play) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(play)); } catch { /* Export still works without browser storage. */ }
    const url = URL.createObjectURL(new Blob([JSON.stringify(play,null,2)+'\n'], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${play.id}.json`; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('已生成 JSON 备份文件。发布请使用“发布到网站”按钮。');
  }
  function restore() {
    try {
      const play: unknown = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!isProduction(play)) { setStatus('没有可恢复的有效草稿。'); return; }
      if(savedRecord&&play.id!==savedRecord.production.id){setStatus('本机草稿属于另一部剧，不能恢复到当前剧目。');return;}
      for (const [,items] of fieldGroups) for (const [key] of items) {
        const input = formRef.current?.elements.namedItem(key);
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) input.value = formValue(play,key);
      }
      setStatus('已恢复最近一次保存的本机草稿。');
    } catch { setStatus('无法读取本机草稿，请重新填写。'); }
  }

  async function save(publicationStatus:'draft'|'published') {
    const production=collect();if(!production)return;
    try{localStorage.setItem(DRAFT_KEY,JSON.stringify(production));}catch{/* Cloud save does not require local storage. */}
    setBusy(true);setStatus('正在保存……');
    try{
      const result=await api<{record:ProductionRecord}>(savedRecord?`/api/productions/${savedRecord.production.id}`:'/api/productions',{
        method:savedRecord?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({production,publicationStatus,...savedRecord?{version:savedRecord.version}:{}}),
      });
      setSavedRecord(result.record);setStatus(publicationStatus==='published'?'已发布，前台档案已更新。':'草稿已保存，访客暂时看不到。');
    }catch(error){setStatus(error instanceof Error?error.message:'保存失败，请重试');}finally{setBusy(false);}
  }
  async function upload(file:File|undefined,target:'poster'|'playbillUrl'|'photos') {
    if(!file)return;if(file.size>10*1024*1024){setStatus('文件不能超过 10 MB');return;}
    if(target==='playbillUrl'&&!file.name.toLowerCase().endsWith('.pdf')){setStatus('节目册请选择 PDF 文件');return;}
    setBusy(true);setStatus('正在上传……');
    try{
      const result=await api<{url:string;contentType:string}>('/api/media',{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});
      const input=formRef.current?.elements.namedItem(target);
      if(input instanceof HTMLInputElement||input instanceof HTMLTextAreaElement)input.value=target==='photos'?[input.value,`${result.url} | ${file.name}`].filter(Boolean).join('\n'):result.url;
      setStatus('上传完成。保存剧目后，文件会随资料一起展示。');
    }catch(error){setStatus(error instanceof Error?error.message:'上传失败');}finally{setBusy(false);}
  }

  return <form ref={formRef} onSubmit={preview}>
    {savedRecord&&<div className="notice">正在编辑：{savedRecord.production.title} · {savedRecord.publicationStatus==='published'?'已发布':'草稿'} · 版本 {savedRecord.version} <a href={`/production/?id=${savedRecord.production.id}`}>查看页面 →</a></div>}
    {fieldGroups.map(([title,items]) => <section className="form-section" key={title}><h2>{title}</h2><div className="form-grid">{items.map(([name,label,type,hint]) => <label className={`field${type === 'textarea' ? ' wide' : ''}`} key={name}><span>{label}</span>{type === 'textarea' ? <textarea name={name} placeholder={hint} defaultValue={initialRecord?formValue(initialRecord.production,name):''} /> : <input name={name} type={type} placeholder={hint} defaultValue={initialRecord?formValue(initialRecord.production,name):''} readOnly={name==='id'&&!!savedRecord} required={name === 'id' || name === 'title'} maxLength={name === 'id' ? 100 : undefined} pattern={name === 'id' ? '(?!draft$)[a-z0-9]+(-[a-z0-9]+)*' : undefined} title={name === 'id' ? '使用小写字母、数字及短横线；编号不能重复，也不能为 draft' : undefined} />}</label>)}</div></section>)}
    <section className="form-section"><h2>上传海报与节目册</h2><p className="editor-intro">每个文件最多 10 MB。上传后自动填入对应字段，支持 JPG、PNG、WebP、GIF 和 PDF。</p><div className="form-grid"><label className="field"><span>演出海报</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={e=>void upload(e.target.files?.[0],'poster')}/></label><label className="field"><span>节目册 PDF</span><input type="file" accept="application/pdf" disabled={busy} onChange={e=>void upload(e.target.files?.[0],'playbillUrl')}/></label><label className="field"><span>添加一张剧照</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={e=>void upload(e.target.files?.[0],'photos')}/></label></div></section>
    <div className="editor-actions"><button className="button primary" type="button" disabled={busy} onClick={()=>void save('published')}>发布到网站 ↗</button><button className="button" type="button" disabled={busy} onClick={()=>void save('draft')}>保存草稿</button><button className="button" type="submit" disabled={busy}>预览</button><button className="button" type="button" disabled={busy} onClick={download}>导出 JSON</button><button className="button" type="button" disabled={busy} onClick={restore}>恢复本机草稿</button><span role="status" aria-live="polite" id="form-status">{status}</span></div>
  </form>;
}
