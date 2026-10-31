import type { Metadata } from 'next';
import {LanguageProvider} from '@/components/language-provider';
import SiteShell from '@/components/site-shell';
import './globals.css';

export const metadata: Metadata = {
  title: { default: '普林斯顿中文剧社 · Princeton Chinese Theatre', template: '%s · 普林斯顿中文剧社' },
  description: '普林斯顿中文剧社剧目档案：演出信息、演职员与舞台记忆。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>
    <LanguageProvider><SiteShell>{children}</SiteShell></LanguageProvider>
  </body></html>;
}
