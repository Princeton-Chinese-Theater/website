'use client';
import Link from 'next/link';
import {LanguageSwitch,useLanguage} from './language-provider';
import type {ReactNode} from 'react';
import StageCurtains from './stage-curtains';
export default function SiteShell({children}:{children:ReactNode}){const {t}=useLanguage();return <>
    <div className="theatre-masthead"><header className="header">
      <Link className="brand" href="/" aria-label={t("普林斯顿中文剧社首页")}><img className="brand-logo" src="/assets/pct-logo.png" width="44" height="44" alt=""/><span>{t("普林斯顿中文剧社")}</span></Link>
      <nav aria-label={t("主导航")}><Link href="/">{t("剧社介绍")}</Link><Link href="/archive/">{t("剧目档案")}</Link><Link href="/board/">{t("历届 Board")}</Link><a className="nav-action" href="/#join">{t("加入我们")} <span aria-hidden="true">↗</span></a></nav><LanguageSwitch/>
    </header></div>
    <main className="theatre-frame"><StageCurtains />{children}</main>
    <footer className="site-footer"><div className="footer-bottom"><div className="footer-credits"><span className="footer-copyright">© {new Date().getFullYear()} Princeton Chinese Theatre</span><span className="footer-website">Website by Lucille Wang</span></div></div></footer>
</>; }
