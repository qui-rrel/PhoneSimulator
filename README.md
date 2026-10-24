# PhoneSimulator

PhoneSimulator 是一个以 Vue 3 和 Vite 构建的移动端叙事网页。它把锁屏、桌面、短信、电话、音乐、相册、邮件等界面组合成一部可操作的虚拟手机，并通过 Excel 与 JSON 配置初始内容和剧情流程。

项目不依赖 AI 接口。消息、通话和剧情分支均来自预先配置的内容，适合制作“捡手机文学”、互动同人 Demo 或其他手机界面叙事作品。

## 仓库结构

```text
PhoneSimulator/
├─ AGENTS.md             给后续开发者和代码助手的项目说明
├─ README.md             整个仓库的使用、备份与发布说明
├─ excel-json-tool/      Excel 配置表与转换脚本
└─ phone-simulator/      Vue 前端、运行时 JSON 与网页素材
```

- 日常编写内容：修改 `excel-json-tool/outputs/phone-config-template.xlsx`。
- 生成网页配置：运行 `excel-json-tool/convert.py`。
- 开发和编译网页：进入 `phone-simulator/` 执行 npm 命令。
- 更详细的字段说明见 [Excel 工具说明](excel-json-tool/README.md)，前端结构见 [Vue 项目说明](phone-simulator/README.md)。

## 本地使用

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
