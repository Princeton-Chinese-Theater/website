# 普林斯顿中文剧社 · 剧目档案模板

静态网站，无需安装依赖。`dist/` 是完整网站目录，`research/` 历史研究资料保留在上级项目中，没有自动作为正式档案发布。

## 本地运行

在此目录运行 `python3 -m http.server 8000 --directory dist`，打开 `http://localhost:8000`。请通过 HTTP 打开；直接双击 HTML 时浏览器可能禁止读取 JSON。

## 添加一部新剧

1. 打开 `new-play.html`，填写资料；只有剧目编号和中文剧名必填。
2. 点击“预览新剧”检查排版；返回填写页可点击“恢复本机草稿”。
3. 点击“下载剧目 JSON”，将下载文件中的整个对象添加到 `dist/data/productions.json` 的 `productions` 数组。不要再套一层 `productions`。
4. 剧目编号必须唯一。例如 `2027-spring-title`；不能使用保留编号 `draft`。
5. 将海报、剧照、节目册放入 `dist/assets/`，在资料中填写路径，如 `assets/2027-title-poster.jpg`。也支持完整 HTTPS 链接。
6. 重新部署 `dist/`。新页面地址为 `index.html?play=2027-spring-title`，页面顶部会自动列出其他剧目。

也可以复制 `dist/data/production-template.json` 直接填写。添加真实剧目时设置 `isExample: false`，移除示例对象即可。默认打开数据中的第一部剧。

## 数据格式

```json
{
  "productions": [
    {
      "id": "2027-spring-title",
      "isExample": false,
      "title": "正式中文剧名",
      "titleEn": "English title",
      "season": "2027 春季制作",
      "year": "2027",
      "performances": ["2027 年 4 月 23 日 · 19:00"],
      "venue": "剧场名称",
      "synopsis": "剧情简介",
      "creative": [{"role": "导演", "name": "姓名"}],
      "cast": [{"role": "角色", "name": "演员姓名"}],
      "crew": [{"role": "舞台监督", "name": "姓名"}],
      "poster": "assets/2027-title-poster.jpg",
      "playbillUrl": "assets/2027-title-playbill.pdf",
      "photos": [{"url": "assets/2027-title-01.jpg", "caption": "第一幕剧照", "alt": "图片内容说明"}],
      "videos": [{"url": "https://example.com/video", "label": "演出录像"}],
      "sources": [{"url": "https://example.com/article", "label": "演出公告"}]
    }
  ]
}
```

以上日期、姓名及 example.com 地址仅解释格式，使用时替换。全部字段见空白 JSON 文件。

## 模板行为

- 未填写的剧情、导演手记、人员分组、剧照、影像与鸣谢自动隐藏。
- 演出留档保留；没有节目册时显示“尚未上传”，不生成失效下载按钮。
- 没有海报时显示带剧名的文字海报占位。
- 表单只保存本机浏览器草稿，不连接后台，不上传资料，不自动发布。
- 文本以纯文本输出；链接只接受 HTTP(S) 或站内文件路径。
- 样式适配手机，支持键盘操作和减少动态效果的系统设置。

## 文件

- `dist/index.html`：所有剧目共用的页面。
- `dist/new-play.html`：填表、预览、导出。
- `dist/assets/app.js`：剧目渲染与可选章节。
- `dist/assets/editor.js`：新剧表单。
- `dist/assets/style.css`：共用视觉样式。
- `dist/data/productions.json`：正式剧目数据，当前只有明确标记的虚构示例。
- `dist/data/production-template.json`：空白剧目对象。
