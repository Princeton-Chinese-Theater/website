'use client';
import { useLanguage } from '@/components/language-provider';
import Link from 'next/link';
import socialLinks from '@/data/social-links.json';
import SocialIcon from '@/components/social-icon';

export default function Home() {
  const {t}=useLanguage();
  return <div id="top" className="society-home">
    <section className="society-intro wrap" id="about" aria-labelledby="society-title">
      <div className="intro-copy"><div className="intro-heading"><div><h1 id="society-title">{t("普林斯顿中文剧社")}</h1></div><div className="intro-logo"><img src="/assets/pct-logo.png" alt={t("普林斯顿中文剧社 PCT 标志")} width="220" height="220"/></div></div><div className="intro-description"><p>{t("普林斯顿中文剧社（PCT）创立于 2008 年，是全美大学第一个完全由学生创办的中文剧社。")}</p><p>{t("我们致力于通过表演中文话剧的形式，在校内外推广中国文化。我们曾经的导演队伍包含普林斯顿的学生和中文老师，而演员队伍则更是涵盖各年级、国家、专业的普林学生，也曾有外校同学加盟。每个春季和秋季，PCT 都会推出一部新的作品，与普林斯顿内外所有热爱中文、热爱戏剧的人倾情相约，共享时光。")}</p></div><Link className="text-link intro-archive-link" href="/archive/">{t("查看剧目档案 →")}</Link><div className="intro-contact" id="join"><p>{t("不论背景，不论经验，欢迎对戏剧感兴趣的同学加入。")}</p><section className="social-media" aria-labelledby="social-title"><p id="social-title">{t("演出与招新信息请关注：")}</p><ul>{Object.entries(socialLinks).map(([platform,social])=><li key={platform}>{social.url?<a href={social.url} target="_blank" rel="noopener noreferrer" aria-label={`${t(social.label)} — ${t(social.account)}`} title={`${t(social.label)} — ${t(social.account)}`}><SocialIcon platform={platform}/></a>:<div className="social-pending" aria-label={`${t(social.label)} — ${t("账号链接待补")}`} title={`${t(social.label)} — ${t("账号链接待补")}`}><SocialIcon platform={platform}/></div>}</li>)}</ul></section></div></div>

    </section>
  </div>;
}
