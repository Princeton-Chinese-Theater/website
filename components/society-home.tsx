'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '@/components/language-provider';
import SocialIcon from '@/components/social-icon';
import TitleCover from '@/components/title-cover';
import socialLinks from '@/data/social-links.json';
import { api, type ProductionRecord } from '@/lib/api';
import { latestProduction, productionTerm, safeUrl, type Production } from '@/lib/productions';
import styles from './society-home.module.css';

export default function SocietyHome({ initialProduction }: { initialProduction: Production | null }) {
  const { t, language } = useLanguage();
  const [featured, setFeatured] = useState(initialProduction);
  const homeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const home = homeRef.current;
    const masthead = document.querySelector('.theatre-masthead');
    if (!home || !masthead) return;

    const updateMastheadHeight = () => {
      home.style.setProperty('--masthead-height', `${masthead.getBoundingClientRect().height}px`);
    };
    updateMastheadHeight();

    const observer = new ResizeObserver(updateMastheadHeight);
    observer.observe(masthead);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (initialProduction) return;
    const controller = new AbortController();
    api<{ records: ProductionRecord[] }>('/api/productions', { signal: controller.signal })
      .then(({ records }) => {
        const published = records.filter(record => record.publicationStatus === 'published');
        setFeatured(latestProduction(published.map(({ production }) => production)));
      })
      .catch(() => {
        // The introduction and archive link also work without a featured production.
      });
    return () => controller.abort();
  }, [initialProduction]);

  const title = language === 'en' ? featured?.titleEn || featured?.title : featured?.title;
  const poster = safeUrl(featured?.poster);

  return <div id="top" ref={homeRef} className={`society-home ${styles.home}`}>
    <section className={`page-content ${styles.stage}`} aria-labelledby="society-title">
      <div className={styles.opening}>
        <h1 id="society-title">{t('普林斯顿中文剧社')}</h1>
        <p className={styles.wordmark} lang={language === 'en' ? 'zh-CN' : 'en'}>
          {language === 'en' ? '普林斯顿中文剧社' : 'Princeton Chinese Theatre'}
        </p>
        <p className={styles.lead}>{t('我们在普林斯顿演出中文话剧，每年春秋两季各推出一部新作。')}</p>
        <div className={styles.actions}>
          <Link className="button primary" href="/archive/">
            {t('浏览剧目档案')} <span aria-hidden="true">→</span>
          </Link>
          <a className={styles.joinLink} href="#join">{t('加入我们')} <span aria-hidden="true">↓</span></a>
        </div>
      </div>
      {featured && <Link className={styles.featured} href={`/production/?id=${encodeURIComponent(featured.id)}`}>
        <div className={styles.featuredLabel}>
          <span>{t('最新剧目')}</span><span>{t(productionTerm(featured))}</span>
        </div>
        <div className={styles.poster}>
          {poster ? <img src={poster} alt="" fetchPriority="high" /> : <div aria-hidden="true"><TitleCover production={featured} /></div>}
        </div>
        <div className={styles.featuredTitle}>
          <h2>{title}</h2><span aria-hidden="true">↗</span>
        </div>
      </Link>}
    </section>

    <div className={`page-content ${styles.information}`}>
      <section id="about" aria-labelledby="society-about-title">
        <h2 id="society-about-title">{t('剧社介绍')}</h2>
        <p>{t('普林斯顿中文剧社（PCT）创立于 2008 年，是全美大学第一个完全由学生创办的中文剧社。')}</p>
        <p>{t('我们致力于通过表演中文话剧的形式，在校内外推广中国文化。我们曾经的导演队伍包含普林斯顿的学生和中文老师，而演员队伍则更是涵盖各年级、国家、专业的普林学生，也曾有外校同学加盟。每个春季和秋季，PCT 都会推出一部新的作品，与普林斯顿内外所有热爱中文、热爱戏剧的人倾情相约，共享时光。')}</p>
      </section>
      <section className={styles.join} id="join" aria-labelledby="society-join-title">
        <h2 id="society-join-title">{t('加入我们')}</h2>
        <p>{t('不论背景，不论经验，欢迎对戏剧感兴趣的同学加入。')}</p>
        <p>{t('演出与招新信息请关注：')}</p>
        <ul className={styles.socials}>
          {Object.entries(socialLinks).map(([platform, social]) => <li key={platform}>
            <a href={social.url} target="_blank" rel="noopener noreferrer">
              <SocialIcon platform={platform} />{t(social.label)}
            </a>
          </li>)}
        </ul>
      </section>
    </div>
  </div>;
}
