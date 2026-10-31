'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { fieldGroups } from '@/lib/form-fields';
import { productionFromForm, formValue } from '@/lib/form-data';
import { DRAFT_KEY, isProduction } from '@/lib/productions';

export default function ProductionForm({ existingIds }: { existingIds: string[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState('');
  const router = useRouter();

  function collect() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return null;
    try {
      const play = productionFromForm(new FormData(form));
      if (existingIds.includes(play.id)) { setStatus('此剧目编号已经存在，请为新剧使用另一个编号。'); return null; }
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
    setStatus('已生成下载文件；将此剧目对象加入档案数据后即可上线。');
  }
  function restore() {
    try {
      const play: unknown = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!isProduction(play)) { setStatus('没有可恢复的有效草稿。'); return; }
      for (const [,items] of fieldGroups) for (const [key] of items) {
        const input = formRef.current?.elements.namedItem(key);
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) input.value = formValue(play,key);
      }
      setStatus('已恢复最近一次保存的本机草稿。');
    } catch { setStatus('无法读取本机草稿，请重新填写。'); }
  }

  return <form ref={formRef} onSubmit={preview}>
    {fieldGroups.map(([title,items]) => <section className="form-section" key={title}><h2>{title}</h2><div className="form-grid">{items.map(([name,label,type,hint]) => <label className={`field${type === 'textarea' ? ' wide' : ''}`} key={name}><span>{label}</span>{type === 'textarea' ? <textarea name={name} placeholder={hint} /> : <input name={name} type={type} placeholder={hint} required={name === 'id' || name === 'title'} maxLength={name === 'id' ? 100 : undefined} pattern={name === 'id' ? '(?!draft$)[a-z0-9]+(-[a-z0-9]+)*' : undefined} title={name === 'id' ? '使用小写字母、数字及短横线；编号不能重复，也不能为 draft' : undefined} />}</label>)}</div></section>)}
    <div className="editor-actions"><button className="button primary" type="submit">预览新剧 ↗</button><button className="button" type="button" onClick={download}>下载剧目 JSON ↓</button><button className="button" type="button" onClick={restore}>恢复本机草稿</button><span role="status" aria-live="polite" id="form-status">{status}</span></div>
  </form>;
}
