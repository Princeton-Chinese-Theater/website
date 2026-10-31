import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: { default: '剧目档案 · 普林斯顿中文剧社', template: '%s · 普林斯顿中文剧社' },
  description: '普林斯顿中文剧社剧目档案：演出信息、演职员与舞台记忆。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>
    <header className="header">
      <Link className="brand" href="/"><span className="seal" aria-hidden="true">剧</span><span>普林斯顿中文剧社<small>PRINCETON CHINESE THEATRE</small></span></Link>
      <nav aria-label="主导航"><Link href="/">剧目档案</Link><Link className="nav-action" href="/new-play/">添加新剧 <span aria-hidden="true">↗</span></Link></nav>
    </header>
    <main>{children}</main>
    <footer><span>普林斯顿中文剧社<small>PRINCETON CHINESE THEATRE</small></span><span>让每一次登台，都有迹可循。</span></footer>
  </body></html>;
}
