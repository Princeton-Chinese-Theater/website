import Link from 'next/link';
import { safeUrl, type Credit, type Production } from '@/lib/productions';
import type { ReactNode } from 'react';

function ExternalLink({ url, children, className = 'button' }: { url?: string; children: ReactNode; className?: string }) {
  const valid = safeUrl(url);
  return valid ? <a className={className} href={valid} target="_blank" rel="noopener noreferrer">{children} <span aria-hidden="true">↗</span></a> : null;
}
function Credits({ items }: { items: Credit[] }) {
  return <div className="credit-list">{items.map((item, i) => <div className="credit-row" key={`${item.role}-${i}`}><span className="credit-role">{item.role}</span><span className="credit-name">{item.name}</span></div>)}</div>;
}

export default function ProductionPage({ play, catalog = [] }: { play: Production; catalog?: Production[] }) {
  const sections: { id: string; title: string; english: string; body: ReactNode }[] = [];
  const groups = [
    { title: '主创团队', items: play.creative || [] },
    { title: '演员阵容', items: play.cast || [] },
    { title: '幕后制作', items: play.crew || [] },
  ].filter(group => group.items.length);
  if (play.synopsis) sections.push({ id: 'story', title: '剧情简介', english: 'The story', body: <div className="prose">{play.synopsis}</div> });
  if (play.directorNote) sections.push({ id: 'note', title: '导演的话', english: 'Director’s note', body: <div className="prose">{play.directorNote}</div> });
  if (groups.length) sections.push({ id: 'people', title: '台前幕后', english: 'The company', body: groups.map(group => <div key={group.title}><h3 className="credit-heading">{group.title}</h3><Credits items={group.items} /></div>) });
  const photos = (play.photos || []).filter(photo => safeUrl(photo.url));
  if (photos.length) sections.push({ id: 'gallery', title: '舞台瞬间', english: 'On stage', body: <div className="gallery">{photos.map((photo, i) => <figure key={i}><img loading="lazy" src={safeUrl(photo.url)} alt={photo.alt || photo.caption || `${play.title}剧照`} />{photo.caption && <figcaption>{photo.caption}</figcaption>}</figure>)}</div> });
  const videos = (play.videos || []).filter(video => safeUrl(video.url));
  sections.push({ id: 'archive', title: '演出留档', english: 'The archive', body: <>
    <div className="archive-panel"><div><div>一册节目，一场记忆。</div><p>{safeUrl(play.playbillUrl) ? '演职员、创作文字与演出资料，收录于本场节目册。' : '节目册尚未上传，后续补充后即可在这里查看。'}</p></div><ExternalLink url={play.playbillUrl}>{play.playbillLabel || '打开节目册'}</ExternalLink></div>
    {!!videos.length && <><h3 className="credit-heading">影像记录</h3><div className="video-links">{videos.map((video,i) => <ExternalLink key={i} url={video.url}>{video.label || '观看影像'}</ExternalLink>)}</div></>}
  </> });
  if (play.thanks) sections.push({ id: 'thanks', title: '特别鸣谢', english: 'With thanks', body: <div className="prose">{play.thanks}</div> });
  const poster = safeUrl(play.poster);
  const sources = (play.sources || []).filter(source => safeUrl(source.url));
  return <>
    {play.isExample && <div className="notice">模板预览 · 以下剧名、人员及场次均为示例。<Link href="/new-play/">填写你的新剧 →</Link></div>}
    {catalog.length > 1 && <nav className="wrap actions" aria-label="其他剧目">{catalog.map(item => <Link className="button" href={`/productions/${item.id}/`} key={item.id} aria-current={item.id === play.id ? 'page' : undefined}>{item.title}</Link>)}</nav>}
    <div className="wrap">
      <div className="hero"><div><div className="eyebrow">THE PRODUCTION ARCHIVE / 剧目档案</div><div className="season">{play.season || play.year || '演出档案'}</div><h1>{play.title}</h1>{play.titleEn && <p className="english-title">{play.titleEn}</p>}{play.tagline && <p className="tagline" style={{ whiteSpace: 'pre-line' }}>{play.tagline}</p>}
        <div className="actions"><ExternalLink url={play.ticketUrl} className="button primary">前往购票</ExternalLink><a className={`button${safeUrl(play.ticketUrl) ? '' : ' primary'}`} href="#archive">{safeUrl(play.playbillUrl) ? '查看节目册' : '查看演出留档'} <span aria-hidden="true">↓</span></a>{!!groups.length && <a className="button" href="#people">认识剧组</a>}</div>{play.status && <p className="missing">{play.status}</p>}
      </div><div className="poster-area"><div className="poster">{poster ? <img src={poster} alt={play.posterAlt || `${play.title}演出海报`} /> : <div className="poster-art" role="img" aria-label={`${play.title}的文字海报占位`}><div className="poster-top"><span>PRINCETON<br />CHINESE THEATRE</span><span>{play.year || 'PCT'}<br />ON STAGE</span></div><div className="poster-word">{play.title}</div><div className="poster-bottom"><span>普林斯顿中文剧社</span><span>灯亮 · 开场</span></div></div>}</div><p className="poster-caption">{poster ? '演出海报 / PRODUCTION POSTER' : '文字海报占位 · 可替换为正式海报'}</p></div></div>
      <div className="facts"><div><span className="fact-label">演出时间 / WHEN</span><div className="fact-value">{play.performances?.length ? play.performances.map((time,i) => <div key={i}>{time}</div>) : '时间待公布'}</div></div><div><span className="fact-label">演出地点 / WHERE</span><div className="fact-value">{play.venue || '地点待公布'}</div>{play.address && <span className="fact-detail">{play.address}</span>}</div><div><span className="fact-label">观演信息 / EXPERIENCE</span><div className="fact-value">{play.language || '语言信息待补充'}</div>{play.duration && <span className="fact-detail">{play.duration}</span>}</div></div>
      <div className="body-layout"><nav className="section-nav" aria-label="本剧页面章节">{sections.map((s,i) => <a key={s.id} href={`#${s.id}`}><span>{String(i+1).padStart(2,'0')}</span>{s.title}</a>)}</nav><div className="content">{sections.map(s => <section id={s.id} key={s.id}><h2 className="section-title">{s.title}<small>{s.english}</small></h2>{s.body}</section>)}
        {(!!sources.length || !!play.updatedAt) && <div className="archive-note">{play.updatedAt && <p>档案更新：{play.updatedAt}</p>}{!!sources.length && <p>资料来源：{sources.map((source,i) => <span key={i}>{i > 0 && ' · '}<ExternalLink url={source.url} className="">{source.label || '原始资料'}</ExternalLink></span>)}</p>}</div>}
      </div></div>
    </div>
  </>;
}
