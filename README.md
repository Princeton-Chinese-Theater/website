# 普林斯顿中文剧社 · 动态剧目档案

前端使用 Next.js App Router、React 和 TypeScript；后端为同站点 Worker API。线上剧目存入 Cloudflare D1，海报、剧照与节目册存入 R2。Next.js 构建的是前端页面资源，真实资料在运行时通过 API 读取，不需要修改 JSON 或重新部署来更新内容。

## 使用网站

- `/`：已发布剧目，支持关键词和年份筛选。
- `/admin/`：管理后台，查看全部草稿和已发布剧目。
- `/new-play/`：新增剧目。
- `/new-play/?id=剧目编号`：编辑已有剧目。
- `/production/?id=剧目编号`：运行时读取的剧目详情，新增后立即可访问。
- `/preview/`：本机修改预览，不自动保存或发布。
- `/productions/example-production/`：保留的虚构模板示例，不是数据库里的正式剧目。

首次访问 `/admin/` 时，使用网站所有者账号登录，点击“启用管理后台”。当前网站保持所有者私有访问；启用后管理员身份固定存入数据库，其他身份不能抢占。完成这一步后再扩大网站分享范围。不要在尚未登记管理员时把网站改为公开。

后台可保存草稿、发布、编辑，或把已发布内容保存为草稿以撤下展示。草稿只对管理员可见。更新使用版本号检查，旧窗口不能直接覆盖较新修改。文本以 React 纯文本输出，外链限定 HTTP(S)；上传文件按实际文件头检查，只支持 JPG、PNG、WebP、GIF 与 PDF，每个最多 10 MB。

上传文件后需要保存剧目才会引用该文件。JSON 导出用于备份，不再是发布流程。当前数据库为空，不会自动发布上级 research/ 中的未核实资料。

## 本地开发

需要 Node.js 22.13 或以上版本，推荐 Node.js 24 或更新版本。

```sh
npm ci
npm run dev
```

本地服务在 `127.0.0.1:3000`（Next.js）和 `127.0.0.1:8899`（API）运行。数据库和上传文件保存在忽略提交的 `.local-data/` 中，重启仍然保留。启动时自动应用尚未执行的迁移。

本地开发使用仅绑定 loopback 的开发身份，不要求 ChatGPT 登录。这个身份只在 `scripts/dev.mjs` 中设置，绝不会进入生产 Worker。线上身份来自 Sites 的认证入口，写入操作每次都在后端检查。

## 检查和部署

```sh
npm test
npm run typecheck
npm run build
```

构建先生成 Next.js 前端到 `out/`，再将资源和 API 打包为 `dist/server/index.js`，使用 `.openai/hosting.json` 中已有的站点 ID 发布。

托管绑定为 `DB`（D1）和 `BUCKET`（R2）。数据库变更先改 `db/schema.ts`，运行 `npm run db:generate`，审阅并提交 `drizzle/` 迁移；Sites 发布时应用线上迁移。迁移只修改结构，不写入示例数据。生产数据库与本机数据库相互独立。

不要把 `out/` 单独部署为完整动态站点：它不包含 API 与持久化存储。如果以后迁移到 Vercel，需同时替换 Worker API、D1/R2 接入及认证，不能只上传前端。

## 主要源码

- `components/archive-home.tsx`：动态档案列表与筛选。
- `components/admin-dashboard.tsx`：后台与管理员初始化。
- `components/production-form.tsx`：剧目编辑、上传、在线保存、发布与备份。
- `components/production-page.tsx`：共用剧目页面。
- `lib/productions.ts`：资料类型与验证。
- `worker/api.js`：资料、身份、版本检查与上传 API。
- `db/schema.ts`、`drizzle/`：数据库 schema 和迁移。
- `scripts/build-worker.mjs`：将 Next.js 资源与 API 打包成 ESM Worker。
- `scripts/dev.mjs`、`scripts/local-storage.mjs`：本机 API 与 SQLite/文件存储适配。
- `tests/api.test.mjs`：权限、持久化、草稿/发布、版本冲突和文件读取测试。

角色与演员仍按“角色 | 姓名”逐行填写；节目册、海报和剧照可以直接上传，系统自动填入链接。
