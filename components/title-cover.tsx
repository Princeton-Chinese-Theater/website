'use client';

import { useLanguage } from '@/components/language-provider';
import type { Production } from '@/lib/productions';
import styles from './title-cover.module.css';

/** One typographic cover for productions whose original poster is not yet available. */
export default function TitleCover({ production }: { production: Pick<Production, 'title' | 'titleEn' | 'year'> }) {
  const { language } = useLanguage();
  const primary = language === 'en' && production.titleEn ? production.titleEn : production.title;
  const secondary = language === 'en' && production.titleEn ? production.title : '';
  const chinese = /[\u3400-\u9fff]/.test(primary);
  const length = Array.from(primary).length;
  const density = chinese ? (length > 8 ? 'long' : length > 4 ? 'medium' : 'short') : (length > 24 ? 'long' : 'medium');

  return <div className={styles.cover} role="img" aria-label={language === 'en' ? `${primary} — title cover` : `《${primary}》剧名封面`}>
    <div className={styles.imprint} aria-hidden="true"><span>PRINCETON<br />CHINESE THEATRE</span><span className={styles.mark}>PCT</span></div>
    <div className={styles.names} aria-hidden="true">
      <span className={styles.rule} />
      <strong className={`${styles.title} ${styles[density]} ${chinese ? styles.chinese : styles.english}`} lang={chinese ? 'zh-CN' : 'en'}>{primary}</strong>
      {secondary && <span className={styles.subtitle}>{secondary}</span>}
    </div>
    <div className={styles.footer} aria-hidden="true"><span>{language === 'en' ? 'PRODUCTION ARCHIVE' : '普林斯顿中文剧社 · 剧目档案'}</span><span>{production.year || 'PCT'}</span></div>
  </div>;
}
