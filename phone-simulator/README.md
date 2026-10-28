# PhoneSimulator Web

这是 PhoneSimulator 的 Vue 前端。它在浏览器中呈现一部可操作的手机，并由 JSON 驱动初始内容、短信/微信剧情、电话对白、朋友圈互动和事件分支。页面面向手机尺寸设计，也可以在桌面浏览器中以手机外壳形式预览。

完整项目还包含 Excel 配置工具。第一次使用、GitHub Desktop 备份和 Cloudflare Pages 发布步骤见[仓库总说明](../README.md)。

## 技术栈

- Vue 3：界面与组件。
- Vite 7：本地开发和生产构建。
- Pinia：手机状态、剧情运行和跨 App 音乐播放。
- Lucide Vue Next：通用界面图标。

没有后端、数据库或 AI API。当前内容都在本地 JSON 与 `public/media/` 中，生产构建可直接发布为静态网站。

运行时数据流：

```text
src/data/content.json + src/data/story.json
  -> src/config/*.config.js
  -> Pinia stores
  -> src/apps/ 与 src/components/
```

作品内容通常不直接编辑 JSON，而是修改 Excel 后通过转换器生成。涉及架构和协作约束时先阅读根目录 [AGENTS.md](../AGENTS.md)。

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
- 锁屏显示后在后台分阶段预加载素材，按 App 图标、其他 UI 图片、相册图片、音视频的顺序逐帧启动请求，不阻塞首屏，也不显示额外加载界面。
- App、聊天和内容详情使用统一返回层级；可从手机屏幕左边缘右滑逐层返回，浏览器原生返回或边缘手势也会优先返回模拟器内的上一层。
- 在桌面浏览器中，可按住鼠标上下拖动聊天、朋友圈、设置、天气等可滚动区域；移动端仍使用原生触摸滚动。
- 短信、电话、微信、地图、小红书、音乐、浏览器、相册、备忘录、邮件、日历、天气、时钟、计算器和设置。
- 计算器支持四则运算、乘除优先级、百分比、小数、删除和连续计算；等号前显示表达式与实时预览，等号后突出最终结果。
- 相册大图左右滑动。
- 备忘录支持置顶；多个置顶项保持 Excel 行顺序，非置顶项按更新时间从晚到早排列。
- 地图支持按地点切换并拖动 SVG；个人收藏、最近列表和保存日期均由“地图地点”表控制。
- 小红书首页以可滚动长图呈现，顶部与底部使用独立固定界面；搜索页显示 Excel 配置的历史记录，可选记录可在新标签页打开外链。
- 短信剧情逐键输入，玩家必须自行点击发送；输入框可随时打开或关闭键盘，未发送草稿会保留。
- 微信支持单聊、群聊、群成员昵称、自动拼接群头像、文字/图片/表情图片消息、会话未读数和顶部通知；顶部通知可点击进入内容，也可向上滑动提前关闭。初始聊天记录还可展示已接通或已取消的语音/视频通话记录，但不会真正发起通话。通讯录暂不可进入。
- 桌面未读角标不在 App 注册中单独配置：信息按联系人未读数、邮件按未读邮件数、微信按会话未读数实时汇总；阅读对应内容后角标同步减少。
- 朋友圈支持自由点赞/取消赞、剧情式发布、文字与单图评论、回复、联系人自动互动和朋友圈内部消息列表。单条朋友圈最多 9 张图片，评论图片可点开，黑底大图按原比例完整显示并支持同条朋友圈左右切换。
- 密码按键、剧情键盘和短信收发使用浏览器实时合成的轻量音效，不依赖音效文件。
- 来电可接听、拒接或等待超时未接；通话接通后不允许玩家主动挂断，挂断按钮保留原外观但不响应。未接通或通话对白结束后先显示“通话结束”，再自动关闭电话页面。
- 所有通话记录可以回拨；主动通话规则可组合任意数量的剧情事件状态/结果条件，同一规则的条件全部满足后才能匹配。
- 音乐列表、封面、迷你播放器、上一首/下一首、暂停、顺序/随机/单曲循环；退出音乐 App 后继续播放。
- 闹钟开关和到点响铃；未配置铃声时使用浏览器合成音。
- 浏览器历史和设置页目前只展示，不修改真实设备设置。

## 当前交互边界

- 微信底部“通讯录”不可进入；“发现”仅朋友圈可进入；“我”页面只展示账号资料。
- 微信初始语音/视频通话记录只是聊天历史气泡，不会从微信聊天中发起真实通话。
- 朋友圈可自由点赞和取消赞，但发布、评论、回复的可发送内容由当前剧情脚本决定；没有匹配脚本时仍能打开界面或键盘，但不能发送。
- 短信和微信键盘只模拟预设输入过程；玩家可以按键获得反馈，但不能自由改变配置文案。
- 电话接通后的挂断按钮保留真实界面外观但不响应，只能等待对白自动结束；来电接通前仍可拒接。
- 浏览记录、设置和未声明可用的装饰按钮只负责展示，不应自动扩展成真实浏览器或系统设置。
- 地图的搜索框、添加、图层、定位、收藏状态、共享和更多目前只展示；地点详情仅开放关闭交互。
- 小红书首页只有右上角搜索按钮可用，其他导航只展示；搜索页历史记录只有填写了 `http://` 或 `https://` 链接的项目可跳转，外链在新标签页打开以保留原页和滚动进度。

## 推荐的内容编辑流程

不要直接在 Vue 模板中写作品内容。推荐通过仓库中的 Excel 配置：

1. 编辑 `../excel-json-tool/outputs/phone-config-template.xlsx`。
2. 关闭正在编辑的工作簿。
3. 在 `../excel-json-tool/` 运行 `python convert.py`。
4. 转换器更新 `src/data/content.json` 和 `src/data/story.json`。
5. 回到本目录运行 `npm run build`。

Excel 是便于创作者编辑的内容源，JSON 是网页实际读取的运行时数据。表格说明和字段格式见 [Excel 工具 README](../excel-json-tool/README.md)。

如果只是在排查程序，也可以阅读 JSON，但不要在不知情的情况下同时修改 Excel 和 JSON：下次转换会以 Excel 内容覆盖生成的 JSON。

如果用户明确说正在编辑 Excel、只想暂存表格，或要求暂不更新 JSON，不要运行转换器。Excel 与 JSON 在这种中间状态下暂时不一致是允许的。

## 初始内容 `content.json`

`src/data/content.json` 保存打开网页时已经存在的手机内容：

| 字段 | 用途 |
| --- | --- |
| `site` | 浏览器标签页名称等网页自身设置，不显示在手机界面中 |
| `device` | 手机画布尺寸、外壳圆角和可选固定日期等参数 |
| `owner` | 用户名、签名和 Wi-Fi 名称 |
| `security` | 四位数字锁屏密码 |
| `theme` | 锁屏壁纸、桌面壁纸、遮罩和强调色 |
| `weather` | 地点与天气生成参数 |
| `home` | 桌面问候组件等内容 |
| `apps` | App 注册、图标路径、显示状态、顺序和 Dock 位置 |
| `lockNotifications` | 初始锁屏通知 |
| `gallery` | 相册图片与显示日期 |
| `notes` | 备忘录；可配置置顶状态，非置顶项按更新时间倒序显示 |
| `alarms` | 闹钟时间、标签、开关和可选铃声 |
| `contacts` | 联系人、头像和初始短信记录 |
| `callHistory` | 初始通话记录 |
| `playlist` | 歌曲、MP3、封面和占位色 |
| `browserHistory` | 浏览记录 |
| `mail` | 邮件列表与正文 |
| `calendarEvents` | 日历事件 |
| `mapLocations` | 地图地点、类型、地址、SVG 路径、初始收藏/最近和保存日期 |
| `xiaohongshu` | 小红书首页长图路径与搜索历史记录、可选外链 |
| `wechat` | 微信账号、专属联系人、群聊、会话、消息、朋友圈点赞与评论 |

`site.title` 控制浏览器标签页名称；修改 Excel 的“基础设置”后重新转换即可生效，不会显示在手机界面中。`security.passcode` 必须是恰好四位数字的字符串，例如 `"2799"` 或 `"0123"`。`apps[].enabled` 决定桌面是否显示入口。

`apps` 不保存未读角标。信息角标从 `contacts[].unread` 汇总，邮件角标从 `mail[].unread` 汇总，微信角标从 `wechat.conversations[].unread` 汇总；运行时收到或读完内容后直接跟随各自状态更新。

`device.fixedDate` 可填写 `YYYY-MM-DD`，让锁屏、桌面日期、日历图标、日历 App 和天气生成始终使用该日期；留空时使用玩家本地日期。固定日期只覆盖年月日，状态栏、锁屏时钟、天气小时预报、闹钟、消息和剧情计时仍使用玩家本地时间。

### 动态本地时间

Excel 的显示时间字段填写 `LOCAL_TIME`，转换后会保存为 `$localTime`。网页加载配置时会把它统一替换为玩家打开页面时的本地 `HH:MM`。

普通文字，包括“刚刚”，都会原样显示；字段留空时对应位置不显示时间。不要在 JSON 里直接填写 `LOCAL_TIME`，JSON 使用的是 `$localTime`。

## 剧情内容 `story.json`

`src/data/story.json` 由以下部分组成：

- `smsScripts`：短信剧情。一段剧情使用一个 ID，一句消息是一条记录，发送方可以在“我”和“对方”之间交替。
- `wechatScripts`：微信剧情。推进方式与短信剧情一致，但按会话运行，并支持文字、图片、表情图片和群成员发送人。
- `momentPublishScripts`：玩家发布朋友圈的预设文字、键盘序列和图片。
- `momentCommentScripts`：玩家评论或回复朋友圈的预设文字、键盘序列和单张图片。
- `momentInteractionScripts`：按序执行联系人显示朋友圈、点赞、取消赞、评论、回复和内部消息提醒。
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
- `moment-liked`、`moment-unliked`、`moment-comment-sent`、`moment-published`。

`appId` 限定应用，`targetId` 是触发对象 ID，可对应联系人、照片、邮件、备忘录、微信会话或朋友圈等内容。事件动作支持 `call`、`sms-script`、`wechat-script`、`moment-publish`、`moment-comment`、`moment-interactions` 和 `none`。

来电可按 `accepted`、`rejected`、`missed` 分支；普通操作和短信完成通常使用 `completed`。`retry.enabled` 为 `false` 时忽略重试结果，为 `true` 时只重试 `retry.outcomes` 中列出的结果。

### 主动通话

所有通话记录都会按 `contactId` 找联系人头像和姓名，并允许回拨：

- 没有匹配规则时，默认对方不接。
- 接听规则通过 `dialogueId` 选择一段主动拨打或通用对白。
- 每条规则使用稳定的规则 ID；`conditions` 可组合任意数量的剧情事件状态或结果条件。
- 状态支持 `not-triggered`（尚未激活）、`in-progress`（已激活但未产生最终结果）、`completed`（已有最终结果），结果支持 `accepted`、`rejected`、`missed`、`completed`；同一规则内全部按 AND 匹配，不配置条件时不限制剧情。
- 可以同时使用组合条件与拨打次数范围配置不同阶段的接听结果。
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

微信账号支持可选的朋友圈封面路径；留空时使用内置深色渐变。微信聊天按会话对相同时间分组，只在该时间的第一条消息上方显示一次；运行中的微信剧情消息使用发送时的本地 `HH:MM`。
初始微信消息中，`voice-call` 和 `video-call` 使用 `connected` 表示是否接通；已接通记录使用以秒为单位的 `duration` 生成 `MM:SS` 或 `HH:MM:SS`，未接通记录显示“已取消”。

朋友圈的 `imageSrc` 是图片路径列表：Excel 单元格内使用 `Alt + Enter` 换行，一行一张，最多 9 张。运行时 JSON 保存为数组；前端仍兼容旧版单字符串数据。多图缩略图最多按 3×3 排列，4 张固定为 2×2；点击后进入黑底、等比完整显示的大图层，并只在当前朋友圈的图片之间左右切换。

微信剧情中的玩家文字回复会显示与短信一致的屏幕键盘，并按 `keystrokes` 逐键高亮和输入。emoji 不生成模拟按键，在输入到对应位置时直接出现。

桌面 App 图标通过 `apps[].iconSrc` 使用完整图片。日历图标按基础设置中的固定日期显示星期和日期，未配置时使用本地日期；时钟图标始终按本地时间实时更新时针与分针。二者不需要图片路径。其他 App 的图片为空或加载失败时使用程序内置图标。

网页进入锁屏后会利用浏览器空闲时段逐个启动素材请求：先预加载启用 App 的图标，再加载通话按钮、头像和封面等 UI 图片，然后加载相册，最后预热音视频。不同阶段不会在首帧同时抢占网络与解码资源；用户提前进入页面时，正常的图片请求仍会与后台预加载共用浏览器缓存。

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
├─ src/stores/maps.js      地图收藏配置、最近地点和当前地点
├─ src/stores/wechat.js    微信会话、群聊、朋友圈和微信剧情状态
├─ src/stores/music.js     跨 App 保持的音乐播放状态
├─ src/App.vue             应用入口布局
└─ src/styles.css          全局样式
```

新增 App 时应新建独立的 `src/apps/*App.vue`，在 `src/components/AppWindow.vue` 注册组件，并在 `src/config/phone.config.js` 注册图标。可触发剧情的页面操作应调用 `phone.openContent(...)` 或 `phone.triggerOperation(...)`，不要为单个 App 再写一套剧情系统。

### 运行时状态归属

- `src/stores/phone.js`：锁屏、导航、短信、通知、电话、闹钟和通用剧情事件。
- `src/stores/maps.js`：地图当前地点、Excel 收藏配置和最近列表。
- `src/stores/wechat.js`：微信会话、群聊、朋友圈、微信输入与朋友圈剧情状态。
- `src/stores/music.js`：退出音乐 App 后仍需继续保留的播放状态。
- 页面内部、退出后无需保留的选择状态放在对应 Vue 组件中，不复制第二套联系人或剧情状态。

### 常见修改入口

| 任务 | 主要文件 |
| --- | --- |
| 新增或调整 App 页面 | `src/apps/`、`src/components/AppWindow.vue`、`src/config/phone.config.js` |
| 调整手机壳、状态栏、锁屏或桌面 | `src/components/`、`src/styles.css` |
| 修改电话、短信、通知或事件推进 | `src/stores/phone.js` |
| 修改微信、群聊或朋友圈交互 | `src/apps/WeChatApp.vue`、`src/apps/WeChatMoments.vue`、`src/stores/wechat.js` |
| 修改音乐跨页面播放 | `src/stores/music.js`、`src/apps/MusicApp.vue` |
| 修改作品内容或新增配置字段 | `../excel-json-tool/outputs/phone-config-template.xlsx`、`../excel-json-tool/convert.py`、`src/data/*.json` |
| 修改全局视觉或通用动画 | `src/styles.css` |

更完整的代码约定和新聊天接手说明见仓库根目录的 [AGENTS.md](../AGENTS.md)。

## 发布

本项目是外层仓库的一个子目录。Cloudflare Pages 必须设置：

- Root directory：`phone-simulator`
- Build command：`npm run build`
- Build output directory：`dist`

GitHub Desktop 上传、Private 仓库授权、分支预览和更新步骤见[仓库总说明](../README.md)。
