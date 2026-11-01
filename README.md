# 普林斯顿中文剧社 · 动态剧目档案

前端使用 Next.js App Router、React 和 TypeScript；后端为同站点 Worker API。线上剧目存入 Cloudflare D1，海报、剧照与节目册存入 R2。Next.js 构建的是前端页面资源，真实资料在运行时通过 API 读取，不需要修改 JSON 或重新部署来更新内容。

## 使用网站

- `/`：剧社介绍与档案入口。
- `/board/`：按学年浏览历届 Board 姓名与职务。
- `/archive/`：已发布剧目，支持关键词和年份筛选。
- `/admin/`：管理后台，查看全部草稿和已发布剧目。
- `/new-play/`：新增剧目。
- `/new-play/?id=剧目编号`：编辑已有剧目。
- `/production/?id=剧目编号`：运行时读取的剧目详情，新增后立即可访问。
- `/preview/`：本机修改预览，不自动保存或发布。
- `/productions/example-production/`：保留的虚构模板示例，不是数据库里的正式剧目。

后台现在使用独立的邮箱＋密码登录，不再要求 ChatGPT 账号。公开页面不显示后台入口，登录地址是 `/admin/login/`。初始管理员为 `luoxi813@outlook.com`，先使用一次性邀请链接设置自己的密码。

已激活的管理员可在后台“管理员”区域添加邮箱，复制生成的邀请链接并单独发送给对方；系统不会自动发邮件。邀请 24 小时内有效且只能使用一次，新人自行设置密码后即可管理内容和邀请其他管理员。可重新邀请尚未激活或已撤销的账号；已激活账号需要先撤销才能重新邀请。不能撤销自己的权限，至少保留一位已激活管理员。

支持退出登录和修改自己的密码。撤销权限立即使该账号的会话与邀请失效；修改密码会退出其他设备。密码丢失时由其他管理员撤销旧权限并重新邀请，不提供无验证的公开重置入口。

认证数据保存在 D1 的 `admin_accounts`、`admin_sessions` 和 `auth_rate_limits` 中。密码使用带随机盐的 PBKDF2-SHA256（100,000 次，适配 Workers 上限），先以独立的服务端 pepper 做 HMAC 预哈希；数据库不保存明文密码、会话令牌或邀请令牌。会话使用 Secure、HttpOnly、SameSite=Strict Cookie，8 小时到期；密码或权限变化会更新会话版本，避免旧令牌重新生效。登录有邮箱和网络限流，写入检查 Origin。

Sites 仍是受限的私有数据服务；Vercel 通过服务端连接读取数据与认证会话。Sites／ChatGPT 登录身份不再赋予内容管理权限。

后台可保存草稿、发布、编辑，或把已发布内容保存为草稿以撤下展示。草稿只对管理员可见。更新使用版本号检查，旧窗口不能直接覆盖较新修改。文本以 React 纯文本输出，外链限定 HTTP(S)；上传文件按实际文件头检查，只支持 JPG、PNG、WebP、GIF 与 PDF，Vercel 后台每个最多 4 MB，直接 Worker API 每个最多 10 MB。

上传文件后需要保存剧目才会引用该文件。JSON 导出用于备份，不再是发布流程。2026-10-31 已将本机37条历史档案导入线上数据库：31条已发布，6条待核记录保留为后台草稿。后续本机编辑仍不会自动同步线上。

## 本地开发

需要 Node.js 22.13 或以上版本，推荐 Node.js 24 或更新版本。

```sh
npm ci
npm run dev
```

本地服务在 `127.0.0.1:3000`（Next.js）和 `127.0.0.1:8899`（API）运行。数据库和上传文件保存在忽略提交的 `.local-data/` 中，重启仍然保留。启动时自动应用尚未执行的迁移。

本地开发同样使用邮箱与密码，不再注入自动管理员身份。在忽略提交的 `.env.local` 中设置独立的随机 `AUTH_PASSWORD_PEPPER`（至少32字符），首次运行 `npm run admin:local` 取得本机的初始邀请链接，然后启动 `npm run dev` 并打开该链接设密码。本机 Cookie 使用仅供 loopback 开发的名称与 HTTP 设置；生产始终使用 Secure Cookie。不要复制生产密码 pepper 到本机。

## 本地档案资料

剧目、主创、演员和幕后信息的导入源为 `data/curated-archive.json`，首页的“浏览剧目档案”进入 `/archive/`，卡片进入 `/production/?id=...`。页面实际通过 `/api/productions` 读取本机SQLite，修改JSON后需明确运行导入脚本才能更新页面。

海报和节目册放在 `public/assets/` 与 `public/assets/archive/`，用 `/assets/...` 链接引用。共享盘与公众号原文现已接入17张真实海报；节目册支持PDF和Word原文件，2026犀牛资料标为整理稿，2016琥珀原图三页标为节目册预览。其他未找到海报的剧目标注“海报待补”。

```sh
python3 scripts/prepare-research-archive.py
node scripts/import-curated-archive.mjs
```

这两步只整理本地数据。导入前自动备份到 `.local-data/import-backups/`，按字段保留已有后台编辑，重复导入保持未变化的记录版本。包含待核记录的导入源在public目录之外；`public/data/curated-archive.json`只保留32条展示记录的备份。完整来源和读取缺口见上级 [共享盘整理说明](../research/google-drive/README.md)。

人名统一按“中文姓名 / English name”展示，双语对应表及原始证据存于上级 `research/people.json`。同一人参与不同剧目时使用已核实的对应写法，群演和共同署名逐人转换。原资料只出现单语或昵称时保留原文，缺少另一种写法的条目列在 `research/people-missing.json`，不自动生成拼音或猜测姓名。研究档案的原始 `credits` 保留，双语展示值另存为 `credits_bilingual`。

展示范围与场地写法存于 `research/site-policy.json`：只展示已核实的PCT制作或联合制作，外校演出转载不进入production列表。按用户指定的显示写法，Whitman统一为 `whiman theater`，Frist统一为 `frist theater`；研究证据中的原始名称保留。

## 检查和部署

```sh
npm test
npm run typecheck
npm run build
```

构建先生成 Next.js 前端到 `out/`，再将资源和 API 打包为 `dist/server/index.js`，使用 `.openai/hosting.json` 中已有的站点 ID 发布。

托管绑定为 `DB`（D1）和 `BUCKET`（R2）。数据库变更先改 `db/schema.ts`，运行 `npm run db:generate`，审阅并提交 `drizzle/` 迁移；Sites 发布时应用线上迁移。迁移只修改结构，不写入示例数据。生产数据库与本机数据库相互独立。

不要把 `out/` 单独部署为完整动态站点：它不包含 API 与持久化存储。Vercel 使用下面的服务端连接方式。

## Vercel 前台与线上数据库

`https://princetonchinesetheater.vercel.app` 直接提供前台、邮箱登录、管理员管理和剧目编辑，不再把后台跳转到 Sites。所有认证与档案记录仍保存在同一套 Sites D1/R2 中，更新后前台下一次读取即可显示。

Vercel 项目根目录设为此目录，保留 `vercel.json` 中的 Next.js 框架、`npm run build:vercel` 构建命令和 `.next` 输出目录。在 Vercel 的 Production／Preview 环境配置服务端 `SITES_BACKEND_TOKEN`，值为现有 Sites 的服务访问令牌。仅 Worker runtime 持有 `AUTH_PASSWORD_PEPPER`（随机服务端 secret）；该值须稳定保留，随意轮换会使已有密码无法验证。不得使用 `NEXT_PUBLIC_` 前缀，也不得把密钥放入源码、浏览器或提交。变量变化后重新部署。

初次初始化使用临时 Worker secret `ADMIN_BOOTSTRAP_TOKEN` 调用仅在账号表为空时可用的 `/api/auth/bootstrap`。此入口只生成指定 Outlook 账号的邀请，Vercel 不转发该路径；初始化后删除临时 secret 并重新部署。不得把初始邀请加入版本库或日志。结构迁移不写入账号数据，旧 `site_admin` 表只保留历史记录，不参与新认证。

`pages/api/[...path].ts` 只转发白名单接口及当前域的管理员会话 Cookie，不信任浏览器传入的 Sites 身份、Authorization 或其他 Cookie。Worker 每次检查会话、账号状态和版本。登录返回的 Cookie 由 Vercel 写入当前域，不需要浏览器跨域访问 Sites。Vercel 请求体上限对应后台上传限制为 4 MB。

`npm run build` 在本机默认保留 Sites 的静态前端与 Worker 打包；在 Vercel 上自动构建含 API 的 Next.js 应用。手动验证 Vercel 构建可运行 `npm run build:vercel`。

## 主要源码

- `components/archive-home.tsx`：动态档案列表与筛选。
- `components/admin-dashboard.tsx`、`components/admin-login.tsx`、`components/admin-accounts.tsx`：后台、登录、邀请和权限管理。
- `components/production-form.tsx`：剧目编辑、上传、在线保存、发布与备份。
- `components/production-page.tsx`：共用剧目页面。
- `lib/productions.ts`：资料类型与验证。
- `worker/api.js`：资料、版本检查与上传 API。
- `worker/auth.js`：密码、一次性邀请、会话、管理员名单与限流。
- `db/schema.ts`、`drizzle/`：数据库 schema 和迁移。
- `scripts/build-worker.mjs`：将 Next.js 资源与 API 打包成 ESM Worker。
- `scripts/dev.mjs`、`scripts/local-storage.mjs`：本机 API 与 SQLite/文件存储适配。
- `tests/api.test.mjs`：权限、持久化、草稿/发布、版本冲突和文件读取测试。

角色与演员仍按“角色 | 姓名”逐行填写；节目册、海报和剧照可以直接上传，系统自动填入链接。

## 历史档案导入线上

日常更新使用管理后台。2026-10-31 的首次迁移使用 `scripts/import-online-archive.py`，从本机数据库读取37条对应档案，保留最新编辑与发布／草稿状态；按编号只插入缺少的记录，未覆盖线上数据。

导入前检查了36个线上海报／节目册附件，导入后验证了31条已发布剧目与6条草稿的可见性。缺少文件的摩西剧照 `/assets/moses-stage.jpg` 已在本次导出中排除，原始本机记录未修改。源数据快照、排除项、逐条结果和总结保存到忽略提交的 `.local-data/online-import-backups/20261031T224817Z/`。

临时 `ARCHIVE_IMPORT_TOKEN` 已从 Sites 运行时配置删除，`/api/archive-import` 路由也已从生产代码移除。导入脚本作为本次迁移的记录保留，不能直接再次执行；后续批量迁移需要单独准备受保护的维护入口。管理员登录使用 `/admin/login/`，邀请激活使用 `/admin/activate/`。

## 本地历史档案资料

`research/legacy-site/` 保存旧版官网目录对应的 11 张海报、来源和校验记录，以及逐剧核对的日期、简介和中英文姓名依据。`research/productions.json` 是整理后的研究档案，`data/curated-archive.json` 是网站导入数据。运行 `python3 scripts/prepare-research-archive.py` 后，再运行 `node scripts/import-curated-archive.mjs` 更新本机数据库；导入会先备份，并保留后台已修改的字段。以上命令均不部署。

演职员复核结果见 `research/legacy-site/credits-audit.json`，逐页读取状态与未解决缺口分别见 `read-ledger.json`、`credits-unresolved.json`。研究数据中的 `credits.crew` 按“原始岗位、姓名”保存旧官网制作组、翻译组及巡演委员会署名，网站完整导入这些岗位；未知的中／英文姓名保留来源原文，不能自动音译或猜测。

目前本地公开目录有 31 个 PCT 制作，其中 30 个有原始海报；其余使用统一剧名封面。部分旧官网海报仅有 150–160 像素宽的原图。网页演职员资料不等同于完整节目册，没有取得的节目册继续标记待补。

## 历届 Board

页面数据位于 `data/boards.json`。每个学年记录 `id`、`term`、`members`（英文或原文姓名 `name`、可选中文姓名 `nameZh`、职务 `role`）和 `source` 来源。新增学年时按时间倒序插入 `boards`，保留来源链接；未核实的职务留空。这里只收录姓名和职务，不导入名单中的邮箱与学号。此页面目前随网站构建更新，尚未接入后台编辑。

## 中英文界面

导航栏的 `中文 / EN` 切换首页、Archive、Board 和剧目详情页的界面语言；选择保存在浏览器中，刷新和进入其他页面后继续沿用。通用文案位于 `data/translations.json`，语言状态由 `components/language-provider.tsx` 管理。英文模式优先显示已有 `titleEn`，没有英文版本的姓名和原始资料保留原文。后台编辑界面目前使用中文。

剧情简介统一在上级 `research/story-synopses.json` 中维护中文、英文及核对来源。每条简介须有具体证据 `evidence` 并标记 `verification: source_checked` 才会进入网站；新增剧目未核实剧情时留空。`source_scope` 区分本次PCT制作资料、同一作品旧版PCT资料与原作资料，原作简介不作为PCT改编细节的证据。整理脚本将中文简介写入网站导入数据，并同步英文到翻译表。简介只讲故事，不拼接研究备注、场次说明或节目册收集状态；这些证据继续保留在研究档案中。

## 首页社交媒体

链接集中维护在 `data/social-links.json`，分别配置微信公众号、YouTube、哔哩哔哩和 Instagram。公众号目前使用已确认文章作为账号入口，YouTube 来自剧社白皮书。哔哩哔哩使用用户提供的账号主页链接，已去掉搜索追踪参数。页面不会用平台首页或搜索页代替剧社账号。
