# PhoneSimulator

PhoneSimulator 是一个以 Vue 3 和 Vite 构建的移动端叙事网页。它把锁屏、桌面、短信、电话、微信、朋友圈、地图、音乐、相册、邮件、日历、天气、时钟和计算器等界面组合成一部可操作的虚拟手机，并通过可视化项目或旧版 Excel 生成的 JSON 配置初始内容和剧情流程。

项目不依赖 AI 接口。消息、通话和剧情分支均来自预先配置的内容，适合制作“捡手机文学”、互动同人 Demo 或其他手机界面叙事作品。

## 项目状态

当前版本已进入功能稳定阶段，短期内以填写作品内容、替换素材、修正文案和处理明确缺陷为主，不计划主动扩展新的 App 或交互。现有功能边界以本 README 和[前端说明](phone-simulator/README.md)为准；界面上存在但未声明可用的按钮继续保持展示状态。

## 仓库结构

```text
PhoneSimulator/
├─ AGENTS.md             给后续开发者和代码助手的项目说明
├─ README.md             整个仓库的使用、备份与发布说明
├─ config-editor/        可视化内容与剧情配置编辑器
├─ excel-json-tool/      Excel 配置表与转换脚本
├─ map-generator/        独立离线 SVG 剧情地图制作工具
└─ phone-simulator/      Vue 前端、运行时 JSON 与网页素材
```

- 推荐内容入口：使用 `config-editor/` 编辑并保存 `.phone-project.json`，再导出网页运行时 JSON，具体方法见[可视化编辑器说明](config-editor/README.md)。
- 旧版兼容入口：已有 Excel 作品仍可继续使用 `excel-json-tool/outputs/phone-config-template.xlsx` 与 `excel-json-tool/convert.py`。
- 两种入口都会生成同一套运行时 JSON；一个作品应选择其中一种长期维护，不要交替修改或尝试自动合并。
- 制作剧情地图：用 Chrome 或 Edge 双击 `map-generator/index.html`。
- 运行和编译网页：进入 `phone-simulator/` 执行 npm 命令。
- 更详细的字段说明见 [Excel 工具说明](excel-json-tool/README.md)，地图制作见 [地图生成器说明](map-generator/README.md)，前端结构见 [Vue 项目说明](phone-simulator/README.md)。

## 使用说明索引

各说明文档的用途如下：

| 文档 | 主要用途 |
| --- | --- |
| `README.md` | 安装、常用命令、GitHub 备份、Cloudflare Pages 发布 |
| `config-editor/README.md` | 可视化配置编辑器介绍、界面说明和运行方法 |
| `phone-simulator/README.md` | Vue 功能、JSON 结构、剧情运行和代码入口 |
| `excel-json-tool/README.md` | 工作表、字段格式、跨表关联和转换器使用 |
| `map-generator/README.md` | 离线 SVG 地图生成、种子复现、保存和参数恢复 |

## 当前实现概览

- 内容源：新作品推荐使用单个 `.phone-project.json` 可视化项目文件；旧 Excel 工作簿作为兼容内容源继续保留。两种入口最终都生成前端读取的 `content.json` 和 `story.json`。
- 旧版模板定位：对外整理时保留表头、系统字段、下拉选项、必要结构行和填写说明，作品专属文案由使用者自行填写。只清空 Excel 不会自动清空已经生成的 JSON 或 `public/media/` 素材。
- 叙事能力：短信、微信、来电、主动通话、朋友圈发布/评论/互动均可由事件图组合，支持计时、玩家操作、结果分支与重试。
- 电话规则：主动通话可按拨打次数及任意数量的剧情事件状态/结果条件匹配；同一规则内的条件全部为 AND。
- 微信：使用独立联系人 ID，支持单聊、群聊、图文/表情消息、通话历史气泡、朋友圈多图、点赞、评论、回复和内部消息。
- 真实感交互：动态日期/时间、可配置或固定的电量、剧情关机事件、天气、未读角标、闹钟、持续播放音乐、置顶备忘录、可自由使用的计算器和桌面鼠标拖动滚动。
- 地图：每个地点使用独立 SVG，支持拖动查看，并由内容配置控制个人收藏、最近地点和保存日期。
- 当前边界：微信通讯录不可进入；发现页只有朋友圈可进入；“我”页、浏览记录和设置等部分页面以展示为主。

## 推荐的内容制作流程

可视化编辑器是面向内容作者的推荐入口。需要 Node.js `20.19.0` 或更高的 20.x，或 `22.12.0` 及更高版本；建议使用较新的 Node.js 22。

首次安装并启动编辑器：

```powershell
Set-Location .\config-editor
npm install
npm run dev
```

浏览器打开终端显示的地址后：

1. 首次打开或点击“新建”会载入内置的通用空白模板，其中保留基础设置、桌面应用和微信玩家资料，不包含示例剧情与作品文案；旧 Excel 作品点击“导入 Excel”完成一次性迁移。
2. 使用左侧分类、消息序列和剧情蓝图编辑内容。
3. 点击“保存”或“另存为”，把作品保存为 `.phone-project.json`。建议把项目文件和仓库一起备份。
4. 修正问题列表中的红色错误，点击“导出 JSON”。推荐授权并选择 `phone-simulator/src/data`，一次写入 `content.json` 与 `story.json`。
5. 进入 `phone-simulator/` 运行 `npm run build`，确认手机网页可以正式构建。

可视化项目文件是后续编辑的权威源，运行时 JSON 是导出产物。再次编辑时打开项目文件，不要从已导出的 JSON 反向修改，也不要继续同步修改原 Excel。

### 旧版 Excel 兼容流程

已有作品可以继续完全使用旧版 Excel，不要求强制迁移。旧流程需要 Python 3.10 或更高版本。首次使用时安装依赖：

```powershell
Set-Location .\excel-json-tool
python -m pip install -r requirements.txt
```

修改并关闭 `excel-json-tool/outputs/phone-config-template.xlsx` 后运行：

```powershell
Set-Location .\excel-json-tool
python convert.py

Set-Location ..\phone-simulator
npm run build
```

Excel 与可视化项目不会双向同步。决定迁移时只导入一次，保存项目文件后改用可视化编辑器维护。

## 本地运行与预览

首次安装手机网页依赖：

```powershell
Set-Location .\phone-simulator
npm install
```

运行开发预览：

```powershell
Set-Location .\phone-simulator
npm run dev
```

终端会显示实际访问地址。结束预览请在该终端按 `Ctrl + C`，避免端口继续被占用。准备发布前运行 `npm run build`。

`map-generator/` 不需要安装依赖或启动服务器。使用 Chrome 或 Edge 双击 `map-generator/index.html`，选择 `map-generator/outputs/` 作为输出文件夹，即可生成和保存 SVG。该工具不会参与 `phone-simulator/` 的运行或编译。

## 使用 GitHub Desktop 备份整个项目

建议把当前外层 `PhoneSimulator` 文件夹作为一个 GitHub 仓库，而不是只上传内层 Vue 项目。这样可视化项目文件、旧 Excel、运行时 JSON、素材和代码可以在同一次提交中保持对应，也能一起回退到历史版本。

### 第一次上传

1. 打开 GitHub Desktop 并登录 GitHub。
2. 选择 **File → Add local repository**，选中包含本 README 的外层 `PhoneSimulator` 文件夹。
3. 如果提示该目录还不是 Git 仓库，选择 **create a repository**，Local path 仍使用这个外层目录。
4. Repository name 建议使用 `PhoneSimulator`；Git ignore 可选择 None，因为仓库已经提供 `.gitignore`。
5. 创建后检查 Changes：应看到编辑器、手机网页、转换工具和文档，不应看到 `node_modules/` 或 `dist/`。
6. 在 Summary 填写本次说明，例如 `Initial project`，点击 **Commit to main**。
7. 点击 **Publish repository**。需要隐藏源码和内容源时勾选 **Keep this code private**。

Private 仓库可以连接 Cloudflare Pages，但必须在 GitHub 授权页面允许 **Cloudflare Workers & Pages** 读取这个仓库。建议选择 **Only select repositories**，只授权当前项目。

> GitHub 仓库设为 Private 只会隐藏仓库内容；Cloudflare Pages 生成的网站默认仍可通过公开网址访问。不要把账号密码、API 密钥、私人信息或无权发布的素材提交到仓库或网页配置中。

### 后续更新

1. 修改可视化项目、素材或代码。
2. 如修改了可视化项目，先导出两份运行时 JSON；如仍使用旧 Excel，则先运行 `python convert.py`。
3. 在 `phone-simulator/` 运行 `npm run build`。
4. 回到 GitHub Desktop 检查文件变化，填写 Summary 并点击 **Commit to main**。
5. 点击 **Push origin**。Cloudflare 会在收到新提交后自动重新部署。

不要提交 `node_modules/`、`dist/`、日志或 Excel 打开时生成的 `~$` 临时文件。正在使用的 `.phone-project.json` 和旧版兼容 `.xlsx` 都可以提交，它们是项目内容备份的一部分。单个普通 GitHub 文件需小于 100 MiB；大体积音视频应先压缩，必要时再考虑 Git LFS 或外部对象存储。

## 使用 Cloudflare Pages 发布

上传整个外层仓库不会把可视化项目文件或 Excel 发布到网页。Cloudflare 只需把 Vue 子目录设为构建根目录，并只部署其 `dist` 产物。

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

`public/media/` 中的素材会随构建产物发布。网页会先加载锁屏壁纸和锁屏通知所需图片，完成后才显示手机；随后在后台按桌面壁纸、App 图标、朋友圈首屏、相册首屏、其他 UI 图片、其余朋友圈/相册图片、音视频的顺序分阶段预加载。进入朋友圈或相册时还会立即高优先级预热当前首屏图片，其余图片继续懒加载。这不会替代图片分辨率和文件体积优化。

生产构建不会把 `content.json` 和 `story.json` 作为独立文件发布。Vite 会在构建时把两份配置编码为随机载荷，并对配置加载器和剧情操作映射做轻度混淆；`npm run build` 随后会自动检查是否意外生成原始 JSON、source map、明文剧情操作名或较长配置文案。这只用于提高直接复制和换配置的门槛，不是安全边界；浏览器运行时仍必须解码配置，所以密钥、隐私信息和其他真正的秘密仍不得写入前端配置。

最容易出现的配置错误是把 Root directory 留空：外层仓库根目录没有 `package.json`，Cloudflare 将无法执行 Vue 构建。Root directory 必须填写 `phone-simulator`。

### 避免只修改内容源时重复构建

Cloudflare 默认可能在仓库任意文件变化时开始构建。可以在 Pages 项目的构建监视路径中只包含：

```text
phone-simulator/**
```

这样单独提交可视化项目文件或 Excel 备份不会发布网页；导出或转换后，`phone-simulator/src/data/*.json` 发生变化，仍会正常触发部署。

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
