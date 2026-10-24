# PhoneSimulator Web

这是 PhoneSimulator 的 Vue 前端。它在浏览器中呈现一部可操作的手机，并由 JSON 驱动初始内容、短信剧情、电话对白和事件分支。页面面向手机尺寸设计，也可以在桌面浏览器中以手机外壳形式预览。

完整项目还包含 Excel 配置工具。第一次使用、GitHub Desktop 备份和 Cloudflare Pages 发布步骤见[仓库总说明](../README.md)。

## 技术栈

- Vue 3：界面与组件。
- Vite 7：本地开发和生产构建。
- Pinia：手机状态、剧情运行和跨 App 音乐播放。
- Lucide Vue Next：通用界面图标。

没有后端、数据库或 AI API。当前内容都在本地 JSON 与 `public/media/` 中，生产构建可直接发布为静态网站。

## 安装和运行

在本目录执行：

```powershell
npm install
npm run dev
```

终端会显示本地地址。停止预览时在运行 Vite 的终端按 `Ctrl + C`，否则端口会继续被占用。

生产编译：

```powershell
npm run build
```

编译结果位于 `dist/`，该目录由构建生成，不提交到 GitHub。`npm run preview` 可临时预览已经生成的生产构建。

## 已实现内容

- 锁屏、四位密码、桌面、状态栏、灵动岛和 App 打开/关闭动画。
- App、聊天和内容详情使用统一返回层级；可从手机屏幕左边缘右滑逐层返回，浏览器原生返回或边缘手势也会优先返回模拟器内的上一层。
- 短信、电话、音乐、浏览器、相册、备忘录、邮件、日历、天气、时钟和设置。
- 相册大图左右滑动。
- 短信剧情逐键输入，玩家必须自行点击发送。
- 密码按键、剧情键盘和短信收发使用浏览器实时合成的轻量音效，不依赖音效文件。
- 来电接听、拒接、超时未接；手动挂断、未接通或通话对白结束后先显示“通话结束”，再自动关闭电话页面。
- 所有通话记录可以回拨，并可按剧情状态和拨打次数选择不同结果。
- 音乐列表、封面、迷你播放器、上一首/下一首、暂停、顺序/随机/单曲循环；退出音乐 App 后继续播放。
- 闹钟开关和到点响铃；未配置铃声时使用浏览器合成音。
- 浏览器历史和设置页目前只展示，不修改真实设备设置。

## 推荐的内容编辑流程

不要直接在 Vue 模板中写作品内容。推荐通过仓库中的 Excel 配置：

1. 编辑 `../excel-json-tool/outputs/phone-config-template.xlsx`。
2. 关闭正在编辑的工作簿。
3. 在 `../excel-json-tool/` 运行 `python convert.py`。
4. 转换器更新 `src/data/content.json` 和 `src/data/story.json`。
5. 回到本目录运行 `npm run build`。

Excel 是便于创作者编辑的内容源，JSON 是网页实际读取的运行时数据。表格说明和字段格式见 [Excel 工具 README](../excel-json-tool/README.md)。

如果只是在排查程序，也可以阅读 JSON，但不要在不知情的情况下同时修改 Excel 和 JSON：下次转换会以 Excel 内容覆盖生成的 JSON。

## 初始内容 `content.json`

`src/data/content.json` 保存打开网页时已经存在的手机内容：

| 字段 | 用途 |
| --- | --- |
| `site` | 浏览器标签页名称等网页自身设置，不显示在手机界面中 |
| `device` | 手机画布尺寸、外壳圆角等参数 |
| `owner` | 用户名、签名和 Wi-Fi 名称 |
| `security` | 四位数字锁屏密码 |
| `theme` | 锁屏壁纸、桌面壁纸、遮罩和强调色 |
| `weather` | 地点与天气生成参数 |
| `home` | 桌面问候组件等内容 |
| `apps` | App 注册、图标路径、显示状态、顺序和 Dock 位置 |
| `lockNotifications` | 初始锁屏通知 |
| `gallery` | 相册图片与显示日期 |
| `notes` | 备忘录 |
| `alarms` | 闹钟时间、标签、开关和可选铃声 |
| `contacts` | 联系人、头像和初始短信记录 |
| `callHistory` | 初始通话记录 |
| `playlist` | 歌曲、MP3、封面和占位色 |
| `browserHistory` | 浏览记录 |
| `mail` | 邮件列表与正文 |
| `calendarEvents` | 日历事件 |

`site.title` 控制浏览器标签页名称；修改 Excel 的“基础设置”后重新转换即可生效，不会显示在手机界面中。`security.passcode` 必须是恰好四位数字的字符串，例如 `"2799"` 或 `"0123"`。`apps[].enabled` 决定桌面是否显示入口。

### 动态本地时间

Excel 的显示时间字段填写 `LOCAL_TIME`，转换后会保存为 `$localTime`。网页加载配置时会把它统一替换为玩家打开页面时的本地 `HH:MM`。

普通文字，包括“刚刚”，都会原样显示；字段留空时对应位置不显示时间。不要在 JSON 里直接填写 `LOCAL_TIME`，JSON 使用的是 `$localTime`。

## 剧情内容 `story.json`

`src/data/story.json` 由以下部分组成：

- `smsScripts`：短信剧情。一段剧情使用一个 ID，一句消息是一条记录，发送方可以在“我”和“对方”之间交替。
- `phoneDialogues`：完整的来电、主动拨打或通用电话对白，包含联系人、方向、逐句延迟和对白结束后的自动挂断等待。
- `outgoingCallRules`：根据联系人、事件状态与拨打次数决定主动拨号是否接听以及使用哪段对白。
- `events`：剧情节点、触发条件、执行内容、结果分支和重试规则。

剧情不使用全局“线性/分支”开关。每个事件通过 `nextByOutcome` 连接后续节点，所以直线推进、条件分支和必须完成的卡点可以混合使用。

### 短信剧情运行方式

短信剧情激活后：

1. 开头和中途连续出现的“对方”消息会按各自行的延迟自动到达。
2. 遇到第一句“我”时暂停。
3. 玩家打开指定联系人并点击输入框后，页面逐键输入预设文字。
4. 玩家点击发送后继续处理后面的“对方”消息。
5. 再次遇到“我”时再次暂停；整段完成后才进入后续事件。

因此可以配置“短信剧情一 → 玩家主动拨号 → 短信剧情二”，中间操作未完成时不会提前推进。

### 事件触发与动作

操作触发目前支持：

- `app-open`：打开 App。
- `content-open`：打开具体照片、邮件、备忘录等内容。
- `message-input`：打开指定联系人输入框。
- `outgoing-call`、`outgoing-call-accepted`、`outgoing-call-missed`。
- `incoming-call-accepted`、`incoming-call-rejected`、`incoming-call-missed`。
- `call-ended`。

`appId` 限定应用，`targetId` 是触发对象 ID，可对应联系人、照片、邮件、备忘录等内容。事件动作目前支持 `call`、`sms-script` 和 `none`。

来电可按 `accepted`、`rejected`、`missed` 分支；普通操作和短信完成通常使用 `completed`。`retry.enabled` 为 `false` 时忽略重试结果，为 `true` 时只重试 `retry.outcomes` 中列出的结果。

### 主动通话

所有通话记录都会按 `contactId` 找联系人头像和姓名，并允许回拨：

- 没有匹配规则时，默认对方不接。
- 接听规则通过 `dialogueId` 选择一段主动拨打或通用对白。
- 可以用事件状态和拨打次数配置不同阶段的接听结果。
- 多条规则同时符合时，使用规则序号更小的一条。
- 来电与主动拨打在最后一句显示完毕后，等待对白的 `hangupAfterMs` 再自动挂断。

## 素材

把图片、头像、壁纸、封面、MP3 和铃声放在 `public/media/`，配置中填写从网站根目录开始的路径，例如：

```text
/media/img1.jpg
/media/song.mp3
```

路径要包含真实文件后缀，大小写也应与文件名一致。浏览器常用格式包括 JPEG、PNG、WebP、GIF、SVG、MP3、AAC 和 OGG；不能只把 HEIC 扩展名改成 `.jpg`。

路径素材为空时，界面按配置使用占位渐变、默认头像、主题色或合成铃声。浏览器可能在玩家第一次点击页面前阻止声音自动播放，这是浏览器安全限制。

桌面 App 图标通过 `apps[].iconSrc` 使用完整图片。日历图标按本地日期显示星期和日期，时钟图标按本地时间实时更新时针与分针；二者不需要图片路径。其他 App 的图片为空或加载失败时使用程序内置图标。

## 目录结构

```text
phone-simulator/
├─ public/media/           网页直接访问的图片和音频
├─ src/apps/               各个 App 页面组件
├─ src/components/         手机壳、锁屏、桌面和全局浮层
├─ src/config/             JSON 装载、图标注册与时间标记解析
├─ src/data/content.json   初始内容
├─ src/data/story.json     剧情内容
├─ src/stores/phone.js     手机状态、电话、闹钟和剧情运行器
├─ src/stores/music.js     跨 App 保持的音乐播放状态
├─ src/App.vue             应用入口布局
└─ src/styles.css          全局样式
```

新增 App 时应新建独立的 `src/apps/*App.vue`，在 `src/components/AppWindow.vue` 注册组件，并在 `src/config/phone.config.js` 注册图标。可触发剧情的页面操作应调用 `phone.openContent(...)` 或 `phone.triggerOperation(...)`，不要为单个 App 再写一套剧情系统。

更完整的代码约定和新聊天接手说明见仓库根目录的 [AGENTS.md](../AGENTS.md)。

## 发布

本项目是外层仓库的一个子目录。Cloudflare Pages 必须设置：

- Root directory：`phone-simulator`
- Build command：`npm run build`
- Build output directory：`dist`

GitHub Desktop 上传、Private 仓库授权、分支预览和更新步骤见[仓库总说明](../README.md)。
