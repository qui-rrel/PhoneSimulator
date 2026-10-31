# PhoneSimulator

PhoneSimulator 是一个以 Vue 3 和 Vite 构建的移动端叙事网页。它把锁屏、桌面、短信、电话、微信、朋友圈、地图、音乐、相册、邮件、日历、天气、时钟和计算器等界面组合成一部可操作的虚拟手机，并通过 Excel 与 JSON 配置初始内容和剧情流程。

项目不依赖 AI 接口。消息、通话和剧情分支均来自预先配置的内容，适合制作“捡手机文学”、互动同人 Demo 或其他手机界面叙事作品。

## 仓库结构

```text
PhoneSimulator/
├─ AGENTS.md             给后续开发者和代码助手的项目说明
├─ README.md             整个仓库的使用、备份与发布说明
├─ excel-json-tool/      Excel 配置表与转换脚本
├─ map-generator/        独立离线 SVG 剧情地图制作工具
└─ phone-simulator/      Vue 前端、运行时 JSON 与网页素材
```

- 日常编写内容：修改 `excel-json-tool/outputs/phone-config-template.xlsx`。
- 生成网页配置：运行 `excel-json-tool/convert.py`。
- 制作剧情地图：用 Chrome 或 Edge 双击 `map-generator/index.html`。
- 开发和编译网页：进入 `phone-simulator/` 执行 npm 命令。
- 更详细的字段说明见 [Excel 工具说明](excel-json-tool/README.md)，地图制作见 [地图生成器说明](map-generator/README.md)，前端结构见 [Vue 项目说明](phone-simulator/README.md)。

## 新对话或新开发者快速接手

建议按以下顺序建立上下文：

1. 阅读根目录 [AGENTS.md](AGENTS.md)，了解架构、配置数据流、剧情运行模型和修改约束。
2. 运行 `git status --short`，确认仓库是否存在尚未提交的用户修改；不要用重置或整目录覆盖清理未知变更。
3. 前端任务继续阅读 [phone-simulator/README.md](phone-simulator/README.md)；Excel、字段或转换任务继续阅读 [excel-json-tool/README.md](excel-json-tool/README.md) 和 `excel-json-tool/convert.py`；地图制作工具任务阅读 [map-generator/README.md](map-generator/README.md)。
4. 修改前检查相关文件的当前内容。Excel 与 JSON 暂时不一致可能只是作者正在编辑表格、还没有运行转换器。
5. 完成代码或配置修改后，按任务运行转换与编译；默认不需要启动长期开发服务器或自行做视觉验收。

五份说明文档的职责如下：

| 文档 | 主要用途 |
| --- | --- |
| `README.md` | 安装、常用命令、GitHub 备份、Cloudflare Pages 发布 |
| `AGENTS.md` | 新开发聊天的架构背景、行为约束、修改与验证规则 |
| `phone-simulator/README.md` | Vue 功能、JSON 结构、剧情运行和代码入口 |
| `excel-json-tool/README.md` | 工作表、字段格式、跨表关联和转换器使用 |
| `map-generator/README.md` | 离线 SVG 地图生成、种子复现、保存和参数恢复 |

## 当前实现概览

- 内容源：唯一正式工作簿是 `excel-json-tool/outputs/phone-config-template.xlsx`；转换后生成前端读取的 `content.json` 和 `story.json`。
- 叙事能力：短信、微信、来电、主动通话、朋友圈发布/评论/互动均可由事件图组合，支持计时、玩家操作、结果分支与重试。
- 电话规则：主动通话可按拨打次数及任意数量的剧情事件状态/结果条件匹配；同一规则内的条件全部为 AND。
- 微信：使用独立联系人 ID，支持单聊、群聊、图文/表情消息、通话历史气泡、朋友圈多图、点赞、评论、回复和内部消息。
- 真实感交互：动态日期/时间、天气、未读角标、闹钟、持续播放音乐、置顶备忘录、可自由使用的计算器和桌面鼠标拖动滚动。
- 地图：每个地点使用独立 SVG，支持拖动查看，并由 Excel 配置个人收藏、最近地点和保存日期。
- 当前边界：微信通讯录不可进入；发现页只有朋友圈可进入；“我”页、浏览记录和设置等部分页面以展示为主。

## 本地使用

`map-generator/` 不需要安装依赖或启动服务器。使用 Chrome 或 Edge 双击 `map-generator/index.html`，选择 `map-generator/outputs/` 作为输出文件夹，即可生成和保存 SVG。该工具不会参与 `phone-simulator/` 的运行或编译。

需要安装：

- Node.js 20 或更高版本，建议使用 Node.js 22。
- Python 3.10 或更高版本。

首次安装：

```powershell
Set-Location .\excel-json-tool
python -m pip install -r requirements.txt

Set-Location ..\phone-simulator
npm install
```

修改 Excel 后，从仓库根目录运行：

```powershell
Set-Location .\excel-json-tool
python convert.py

Set-Location ..\phone-simulator
npm run build
```

转换器会更新 `phone-simulator/src/data/content.json` 和 `story.json`。编译成功后，可在 Vue 项目目录运行 `npm run dev` 进行本地预览；终端会显示实际访问地址。结束预览请在该终端按 `Ctrl + C`，避免端口继续被占用。

## 使用 GitHub Desktop 备份整个项目

建议把当前外层 `PhoneSimulator` 文件夹作为一个 GitHub 仓库，而不是只上传内层 Vue 项目。这样 Excel、转换工具、运行时 JSON、素材和代码可以在同一次提交中保持对应，也能一起回退到历史版本。

### 第一次上传

1. 打开 GitHub Desktop 并登录 GitHub。
2. 选择 **File → Add local repository**，选中包含本 README 的外层 `PhoneSimulator` 文件夹。
3. 如果提示该目录还不是 Git 仓库，选择 **create a repository**，Local path 仍使用这个外层目录。
4. Repository name 建议使用 `PhoneSimulator`；Git ignore 可选择 None，因为仓库已经提供 `.gitignore`。
5. 创建后检查 Changes：应看到两个子项目和文档，不应看到 `node_modules/` 或 `dist/`。
6. 在 Summary 填写本次说明，例如 `Initial project`，点击 **Commit to main**。
7. 点击 **Publish repository**。需要隐藏源码与 Excel 时勾选 **Keep this code private**。

Private 仓库可以连接 Cloudflare Pages，但必须在 GitHub 授权页面允许 **Cloudflare Workers & Pages** 读取这个仓库。建议选择 **Only select repositories**，只授权当前项目。

> GitHub 仓库设为 Private 只会隐藏仓库内容；Cloudflare Pages 生成的网站默认仍可通过公开网址访问。不要把账号密码、API 密钥、私人信息或无权发布的素材提交到仓库或网页配置中。

### 后续更新

1. 修改 Excel、素材或代码。
2. 如修改了 Excel，先运行 `python convert.py`。
3. 在 `phone-simulator/` 运行 `npm run build`。
4. 回到 GitHub Desktop 检查文件变化，填写 Summary 并点击 **Commit to main**。
5. 点击 **Push origin**。Cloudflare 会在收到新提交后自动重新部署。

不要提交 `node_modules/`、`dist/`、日志或 Excel 打开时生成的 `~$` 临时文件。正式的 `.xlsx` 配置表应提交，它是项目内容备份的一部分。单个普通 GitHub 文件需小于 100 MiB；大体积音视频应先压缩，必要时再考虑 Git LFS 或外部对象存储。

## 使用 Cloudflare Pages 发布

上传整个外层仓库不会把 Excel 发布到网页。Cloudflare 只需把 Vue 子目录设为构建根目录，并只部署其 `dist` 产物。

1. 登录 Cloudflare，进入 **Workers & Pages**。
2. 选择创建 Pages 项目并导入现有 Git 仓库。
3. 连接 GitHub，选择 `PhoneSimulator` 仓库。
4. 使用以下构建设置：

| 设置 | 值 |
| --- | --- |
| Production branch | `main` |
| Root directory | `phone-simulator` |
| Build command | `npm run build` |
| Build output directory | `dist` |

如环境要求指定 Node.js，可增加环境变量 `NODE_VERSION=22`。部署成功后会得到 `https://项目名.pages.dev/`。

`public/media/` 中的素材会随构建产物发布。网页会先加载锁屏壁纸和锁屏通知所需图片，完成后才显示手机；随后在后台按桌面壁纸、App 图标、其他 UI 图片、相册图片、音视频的顺序分阶段预加载，并限制低优先级图片并发，避免大量素材争抢首屏资源。这不会替代图片分辨率和文件体积优化。

最容易出现的配置错误是把 Root directory 留空：外层仓库根目录没有 `package.json`，Cloudflare 将无法执行 Vue 构建。Root directory 必须填写 `phone-simulator`。

### 避免只修改 Excel 时重复构建

Cloudflare 默认可能在仓库任意文件变化时开始构建。可以在 Pages 项目的构建监视路径中只包含：

```text
phone-simulator/**
```

这样单独提交 Excel 备份不会发布网页；运行转换器后，`phone-simulator/src/data/*.json` 发生变化，仍会正常触发部署。

### 用分支保留多个在线版本

可以在 GitHub Desktop 中通过 **Current Branch → New Branch** 创建 `demo-a`、`demo-b` 等分支并发布。Cloudflare 会为非生产分支创建 Preview Deployment，控制台会显示该次部署的准确 URL；分支别名通常形如 `分支名.项目名.pages.dev`。`main` 继续对应正式网址，不同分支不会互相覆盖。

切换分支前先提交当前修改。不要依赖手写猜测的预览网址，应以 Cloudflare Deployments 页面显示的地址为准。

## 移动项目文件夹

项目脚本和文档均使用相对于仓库根目录的路径，不依赖 `D:` 盘或桌面位置。以后可以移动或重命名整个 `PhoneSimulator` 文件夹；移动后在 GitHub Desktop 中重新选择 **File → Add local repository** 并指向新位置即可。

必须整体移动，保持 `excel-json-tool/` 与 `phone-simulator/` 的相对位置不变，否则转换器的默认输出路径会失效。

## 相关文档

- [Cloudflare Pages 构建配置](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Cloudflare Pages Monorepo 配置](https://developers.cloudflare.com/pages/configuration/monorepos/)
- [Cloudflare 构建监视路径](https://developers.cloudflare.com/pages/configuration/build-watch-paths/)
- [GitHub 文件上传限制](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
