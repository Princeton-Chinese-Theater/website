'use client';
import { useLanguage } from '@/components/language-provider';
import TitleCover from '@/components/title-cover';
import Link from 'next/link';
import { archiveDisplayText, productionTerm, safeUrl, type Credit, type Production } from '@/lib/productions';
import type { ReactNode } from 'react';
import { productionDateRange } from '@/lib/production-dates';

function ExternalLink({ url, children, className = 'button' }: { url?: string; children: ReactNode; className?: string }) {
  const valid = safeUrl(url);
  return valid ? <a className={className} href={valid} target="_blank" rel="noopener noreferrer">{children} <span aria-hidden="true">↗</span></a> : null;
}
function Credits({ items }: { items: Credit[] }) {
  const {t}=useLanguage();
  return <div className="credit-list">{items.map((item, i) => <div className="credit-row" key={`${item.role}-${i}`}><span className="credit-role">{t(item.role)}</span><span className="credit-name">{item.name}</span></div>)}</div>;
}

export default function ProductionPage({ play: originalPlay, catalog = [] }: { play: Production; catalog?: Production[] }) {
  const {t,language}=useLanguage();
  const play = {...originalPlay};
  for (const key of ['synopsis','directorNote','thanks','status','tagline','venue','address','language','duration','playbillLabel'] as const) play[key] = archiveDisplayText(play[key], language);
  const sections: { id: string; title: string; english: string; body: ReactNode }[] = [];
  const groups = [
    { title: t("主创团队"), items: play.creative || [] },
    { title: t("演员阵容"), items: play.cast || [] },
    { title: t("幕后制作"), items: play.crew || [] },
  ].filter(group => group.items.length);
  if (play.synopsis) sections.push({ id: 'story', title: t("剧情简介"), english: 'The story', body: <div className="prose">{t(play.synopsis)}</div> });
  if (play.directorNote?.trim()) sections.push({ id: 'note', title: t("导演宣言"), english: 'Director’s note', body: <div className="prose">{play.directorNote}</div> });
  if (groups.length) sections.push({ id: 'people', title: t("台前幕后"), english: 'The company', body: groups.map(group => <div key={group.title}><h3 className="credit-heading">{group.title}</h3><Credits items={group.items} /></div>) });
  const videos = (play.videos || []).filter(video => safeUrl(video.url));
  if (play.thanks) sections.push({ id: 'thanks', title: t("特别鸣谢"), english: 'With thanks', body: <div className="prose">{play.thanks}</div> });
  const poster = safeUrl(play.poster);
  const performanceDates = productionDateRange(play, language) || t(productionTerm(play));
  return <div className="production-window" role="region" aria-label={t("剧目档案")} tabIndex={0}>
    {play.isExample && <div className="notice">模板预览 · 以下剧名、人员及场次均为示例。<Link href="/new-play/">填写你的新剧 →</Link></div>}
    {catalog.length > 1 && <nav className="wrap actions" aria-label={t("其他剧目")}>{catalog.map(item => <Link className="button" href={`/productions/${item.id}/`} key={item.id} aria-current={item.id === play.id ? 'page' : undefined}>{item.title}</Link>)}</nav>}
    <div className="wrap production-detail">
      {language==='en'&&<p className="original-language-note">Archive text and names are shown in their original language where no English version is available.</p>}
      <div className="hero"><div><h1>{language==='en'?(play.titleEn||play.title):play.title}</h1><div className="season">{t(productionTerm(play))}</div>{language==='en' && play.titleEn && <p className="english-title">{language==='en'?play.title:play.titleEn}</p>}{play.tagline && <p className="tagline" style={{ whiteSpace: 'pre-line' }}>{play.tagline}</p>}
        <div className="facts"><div><span className="fact-label">{language==='zh'?"演出时间":t("演出时间 / WHEN")}</span><div className="fact-value">{performanceDates}</div></div><div><span className="fact-label">{language==='zh'?"演出地点":t("演出地点 / WHERE")}</span><div className="fact-value">{t(play.venue || "地点待公布")}</div>{play.address && <span className="fact-detail">{play.address}</span>}</div></div>
        <div className="actions"><ExternalLink url={play.ticketUrl} className="button primary">{t("前往购票")}</ExternalLink>{play.directorNote?.trim()&&<a className="button" href="#note">{t("导演宣言")} ↓</a>}{!!groups.length && <a className="button" href="#people">{t("认识剧组")}</a>}{videos.map((video,i)=><ExternalLink key={i} url={video.url}>{video.label||t("观看影像")}</ExternalLink>)}</div>{play.status && <p className="missing">{play.status}</p>}
      </div><div className="poster-area"><div className="poster">{poster ? <img src={poster} alt={play.posterAlt || `${play.title}演出海报`} /> : <TitleCover production={play} />}</div><p className="poster-caption">{poster ? t("演出海报 / PRODUCTION POSTER") : (language==='en' ? 'Title cover' : '剧名封面')}</p></div></div>

      <div className="body-layout production-body"><div className="content">{sections.map(s => <section id={s.id} key={s.id}><h2 className="section-title">{s.title}</h2>{s.body}</section>)}
        {play.updatedAt && <div className="archive-note"><p>{t("档案更新：")}{play.updatedAt}</p></div>}
      </div></div>
    </div>
  </div>;
}
