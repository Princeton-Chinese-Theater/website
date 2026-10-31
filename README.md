# 普林斯顿中文剧社 · Next.js 剧目档案

使用 Next.js App Router、React 和 TypeScript。剧目页面共用 React 组件，填写页支持本机草稿、预览和 JSON 导出。当前只有明确标记的虚构示例，上级 research/ 的未核资料没有作为正式内容发布。

## 本地开发

需要 Node.js 20.9 或以上版本。

```sh
npm ci
npm run dev
```

打开终端显示的本机地址，通常为 http://localhost:3000。

## 检查与构建

```sh
npm run typecheck
npm run build
```

目前配置 output: 'export'，构建时将各剧目的 HTML、React 资源及静态文件导出到 out/。可部署到 Vercel 或其他静态托管平台。源代码是完整 Next.js 项目，现有功能无需服务端；以后增加数据库或服务端编辑时可调整部署模式。

Vercel 配置：Root Directory 选择 theatre-template，Framework Preset 选择 Next.js，Build Command 为 npm run build，Output Directory 为 out。现有 Sites 身份保存在 .openai/hosting.json，没有创建另一站点。

## 添加新剧

1. 打开 /new-play/，填写资料。编号和中文剧名必填，其余可留空。
2. 点击“预览新剧”。返回填写页后点击“恢复本机草稿”继续编辑。
3. 下载 JSON，将整个对象加入 public/data/productions.json 的 productions 数组，不要再套一层 productions。
4. 编号必须唯一，只用小写字母、数字、短横线，例如 2027-spring-title，不能为保留编号 draft。
5. 海报、剧照和节目册放入 public/assets/。资料路径填写 assets/poster.jpg 或 /assets/poster.jpg，不包含 public/。
6. 重新构建部署后，自动生成 /productions/2027-spring-title/。

也可以复制 public/data/production-template.json 直接填写。真实剧目设 isExample: false，并移除示例对象。首页展示第一部剧，多部剧时出现切换入口。巡演或复排使用不同编号，各自保留对应演职员与节目册。

## 页面和组件

- app/layout.tsx：共用导航、页脚、元信息。
- app/page.tsx：首页。
- app/productions/[slug]/page.tsx：构建时自动生成的剧目路由。
- app/new-play/page.tsx：填写页。
- app/preview/page.tsx：本机草稿预览，不收录到搜索索引。
- components/production-page.tsx：所有剧目共用的 React 页面。
- components/production-form.tsx：React 表单、恢复和导出。
- lib/productions.ts：TypeScript 类型、数据验证、安全链接处理。
- lib/catalog.ts：读取并校验正式剧目，重复编号会阻止构建。
- lib/form-fields.ts：可复用字段定义。
- app/globals.css：响应式全局样式。
- public/data/productions.json：正式剧目数据。
- public/data/production-template.json：空白模板。

## 字段约定

- performances：每场演出一条字符串。
- creative、cast、crew：role（职务或角色）与 name（姓名）组成的对象数组。
- photos：url、caption 和可选 alt 组成的对象数组。
- videos、sources：url 与 label 组成的对象数组。
- poster、playbillUrl、ticketUrl：图片、节目册、购票路径或 HTTP(S) 网址。

未填写的可选章节自动隐藏。没有海报时显示文字占位；没有节目册时显示待上传说明。文字由 React 渲染，不执行 HTML。草稿仅保存在当前浏览器，不上传、不自动发布；请下载 JSON 备份。
