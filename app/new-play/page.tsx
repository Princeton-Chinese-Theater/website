import type { Metadata } from 'next';
import { productions } from '@/lib/catalog';
import ProductionForm from '@/components/production-form';

export const metadata: Metadata = { title: '添加新剧' };
export default function NewPlay() {
  return <div className="editor"><div className="eyebrow">A NEW STORY / 新的故事</div><h1>把新剧，写进档案。</h1>
    <p className="editor-intro">填写资料即可套用剧目页面。除剧目编号和中文名称外，其余内容均可留空；海报缺失时显示文字占位，未填写的章节自动隐藏。</p>
    <p className="editor-intro">预览草稿仅保存在当前浏览器，不会自动发布。请下载 JSON 留存，浏览器数据清除后草稿会丢失。</p>
    <ProductionForm existingIds={productions.map(play => play.id)} />
    <div className="form-help"><strong>如何加入网站</strong><ol><li>填写后预览，确认文字与演职员信息。</li><li>下载 JSON，将其中的剧目对象加入 <code>public/data/productions.json</code> 的 <code>productions</code> 数组。</li><li>把海报、剧照和节目册放入 <code>public/assets/</code>，填写路径后重新部署。</li></ol><p>新剧页面地址：<code>/productions/你的剧目编号/</code>。可以把导出的文件交给网站维护者，或直接交给我继续添加。</p><p><a href="/data/production-template.json" download>下载空白剧目 JSON ↓</a></p></div>
  </div>;
}
