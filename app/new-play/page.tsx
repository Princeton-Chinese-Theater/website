import type { Metadata } from 'next';
import LiveEditor from '@/components/live-editor';

export const metadata: Metadata = { title: '编辑剧目', robots:{index:false,follow:false} };
export default function NewPlay() {
  return <div className="editor"><div className="eyebrow">A NEW STORY / 新的故事</div><h1>把新剧，写进档案。</h1>
    <p className="editor-intro">填写资料即可套用剧目页面。除剧目编号和中文名称外，其余内容均可留空；海报缺失时显示文字占位，未填写的章节自动隐藏。</p>
    <p className="editor-intro">“保存草稿”将资料保存在后台；“发布到网站”会让访客立即看到。已有剧目可保存为草稿以撤下前台展示。</p>
    <LiveEditor />
  </div>;
}
