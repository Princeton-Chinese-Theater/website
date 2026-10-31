import Link from 'next/link';

export default function NotFound() {
  return <div className="error"><h1>没有找到这部剧的档案</h1><p>请检查网址，或返回剧目档案。</p><Link href="/">返回剧目档案 →</Link></div>;
}
