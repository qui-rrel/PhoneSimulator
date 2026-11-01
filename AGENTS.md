# PhoneSimulator 开发接手说明

本文件适用于整个仓库。它用于让新的开发聊天、代码助手或开发者在没有旧对话记录时，仍能理解项目目标、数据流、目录结构和协作约束。

## 1. 开始工作前

1. 把“包含本 `AGENTS.md` 的目录”视为仓库根目录。
2. 不要假设仓库位于桌面、某个盘符或名为固定的父目录；所有命令、代码和文档使用仓库内相对路径。
3. 先阅读根目录 `README.md`，再按任务阅读：
   - 前端任务：`phone-simulator/README.md`。
   - Excel、字段或转换任务：`excel-json-tool/README.md` 与 `excel-json-tool/convert.py`。
   - 地图生成工具任务：`map-generator/README.md`。
4. 检查相关文件的当前内容后再编辑。项目可能处于“用户正在改 Excel、尚未重新生成 JSON”的中间状态，Excel 与 JSON 不一致不一定是错误。
5. 用户已授权在本仓库范围内完成明确提出的修改，不需要仅因文件位于 `PhoneSimulator` 内反复询问是否可以改；但仍应保护用户未要求覆盖的内容和素材。

如果当前终端工作目录失效（例如项目刚被移动或重命名），应先定位 `AGENTS.md`，再以它所在目录重新建立相对路径，不要把旧绝对路径写回项目。

## 2. 项目目标与产品边界

PhoneSimulator 是一个移动端优先的静态叙事网页，模拟一部可以操作的手机，用于“捡手机文学”和互动故事 Demo。

- 技术栈：Vue 3、Vite、Pinia、Lucide Vue Next、Python、openpyxl。
- 没有后端、数据库或 AI API。
- 所有对白、短信、通知和剧情分支都是预先配置的内容。
- Excel 面向不懂代码的内容作者；JSON 面向运行时；Vue 负责呈现和交互。
- 页面应像一部真实手机。用户可见 UI 中不要出现“配置”“模拟器”“重置剧情”“App 注册”等开发或系统实现字样；这些术语只允许出现在 README、Excel 说明或开发文档。
- 不复制参考作品中的人物照片、音乐或文案。可以使用通用手机 App 图标、通用 UI 模式和用户自己提供的素材。
- 不是每个装饰按钮都必须可用，但已经声明可交互的功能必须保持一致、可理解。

### 当前实现基线

- 已注册 App：信息、电话、微信、地图、小红书、音乐、浏览器、照片、备忘录、邮件、日历、天气、时钟、计算器和设置。
- 微信通讯录暂不可进入；发现页只有朋友圈可进入；“我”页仅展示。不要因为界面存在按钮就擅自补充未要求的交互。
- 短信和微信玩家回复均使用预设文案与屏幕键盘模拟；按键不会自由录入配置外文字，发送按钮才完成对应剧情节点。
- 电话接通后只能按对白配置自动结束，玩家不能主动挂断；来电接通前仍可拒接或等待超时。
- 主动通话规则使用稳定规则 ID，并可通过独立条件表组合事件状态、事件结果和拨打次数。一个规则内所有条件均为 AND；OR 通过多条规则表达。
- 朋友圈支持初始化内容、最多九图、查看大图、自由点赞/取消赞、剧情式发布、文字与单图评论/回复、联系人互动及内部消息列表。
- 计算器是无独立内容表的自由交互 App；浏览记录、设置和部分装饰入口保持展示状态。
- 地图使用每地点独立 SVG，支持拖动；收藏、最近和保存日期由 Excel 控制，详情收藏按钮只展示。微信定位消息可打开对应地点、加入最近列表，并通过统一导航栈返回原会话；搜索剧情暂未接入。
- 小红书首页使用基础设置中的长图，只有搜索入口可交互；搜索历史由独立工作表配置，可选外链在新标签页打开以保留当前页面和滚动进度。

## 3. 仓库结构

```text
PhoneSimulator/
├─ AGENTS.md
├─ README.md
├─ .gitignore
├─ excel-json-tool/
│  ├─ convert.py
│  ├─ requirements.txt
│  ├─ README.md
│  └─ outputs/phone-config-template.xlsx
├─ map-generator/
│  ├─ index.html
│  ├─ map-core.js
│  ├─ generator.js
│  ├─ styles.css
│  └─ outputs/
└─ phone-simulator/
   ├─ package.json
   ├─ vite.config.js
   ├─ public/media/
   └─ src/
      ├─ apps/
      ├─ components/
      ├─ config/
      ├─ data/
      ├─ stores/
      ├─ utils/
      ├─ App.vue
      ├─ main.js
      └─ styles.css
```

职责划分：

- `excel-json-tool/outputs/phone-config-template.xlsx`：创作者编辑的主要内容源和完整示例。
- `excel-json-tool/convert.py`：读取固定中文工作表结构、验证关联并生成 JSON。
- `map-generator/`：可独立发给剧情策划的离线 SVG 地图制作工具；不参与前端运行或编译。
- `phone-simulator/src/data/content.json`：网页加载时已经存在的手机内容。
- `phone-simulator/src/data/story.json`：剧情脚本、电话对白、主动通话规则和事件图。
- `phone-simulator/public/media/`：由 `/media/...` URL 直接访问的图片和音频。
- `phone-simulator/src/config/phone.config.js`：加载内容 JSON、解析 `$localTime`、注册 App 图标。
- `phone-simulator/src/config/story.config.js`：加载剧情 JSON。
- `phone-simulator/src/config/story.operations.js`：集中维护 App 操作与剧情 action 的映射及操作事件匹配；生产构建时与配置加载器一起进入受保护 chunk。
- `phone-simulator/src/stores/phone.js`：锁屏、App 状态、联系人消息、通知、电话、闹钟和剧情运行器。
- `phone-simulator/src/stores/music.js`：独立于 App 页面生命周期的音乐播放状态；退出音乐 App 不能自动停止播放。
- `phone-simulator/src/components/AppWindow.vue`：App 组件注册与窗口切换。
- `phone-simulator/src/apps/`：每个 App 的独立界面与局部交互。
- `phone-simulator/src/styles.css`：当前集中式全局样式。

## 4. 配置数据流

正常内容工作流：

```text
Excel 工作簿
  -> excel-json-tool/convert.py
  -> content.json + story.json
  -> src/config/*.config.js
  -> Pinia store / Vue components
```

源码中的两个 JSON、配置加载器和操作映射保持可读；Vite 生产构建通过虚拟模块把 `content.json` 与 `story.json` 编码为每次构建不同的载荷，并只轻度混淆配置加载器与 `story.operations.js`。浏览器运行时仍会解码出完整对象，因此该机制只提高直接复制门槛，不得用于隐藏密钥或隐私数据。`npm run build` 会在 Vite 编译后自动运行 `scripts/verify-protected-build.mjs`，检查原始 JSON、source map、剧情操作名和较长配置文案是否意外进入发布包。

规则：

1. 作品内容优先写入 Excel/JSON，不要散落硬编码在 Vue 模板中。
2. Excel 是作者可读的数据源；JSON 是可提交、可检查的运行时产物。运行转换器会覆盖两个 JSON，因此不要把只存在于 JSON 的内容当作长期配置。
3. 用户明确说正在修改 Excel 且暂时不要更新 Excel/JSON 时，必须尊重该状态。不要为了“让它们一致”擅自运行转换器或重建工作簿。
4. 修改配置 schema 时，需要检查并同步：
   - `convert.py` 的表头别名、必需列、解析、枚举映射和验证；
   - `content.json` / `story.json` 的运行时结构；
   - Vue 读取代码；
   - Excel 顶部说明、中文表头第二行字段名、下拉验证和 README。
5. 除非用户明确要求，不要生成第二份重复 Excel。唯一正式工作簿保持在 `excel-json-tool/outputs/`。
6. 如果确实修改 `.xlsx`，保留现有样式、冻结、全边框、表头换行、列宽、数据验证与填写说明。所有非“填写说明”表的列头需同时包含中文名和同格第二行的 JSON 字段名。

### `LOCAL_TIME`

- Excel 严格关键字：`LOCAL_TIME`。
- JSON 标记：`$localTime`。
- `src/config/phone.config.js` 在页面载入时递归替换为当次打开页面的本地 `HH:MM`。
- 普通文字“刚刚”必须保持普通文字，不得再作为动态时间特殊值。
- `device.fixedDate` 留空时使用本地日期；填写 `YYYY-MM-DD` 时，只固定锁屏、桌面、日历和天气使用的年月日，所有小时、分钟、秒、闹钟和剧情计时继续使用本地时间。

### 素材路径

- 文件放在 `phone-simulator/public/media/`。
- JSON/Excel 使用 `/media/文件名.后缀`，必须带真实后缀。
- 代码应先尝试路径素材，路径为空或加载失败时再使用占位素材。
- 不要把 HEIC 仅改名为 `.jpg`；必须实际转码。
- 新代码不得写入当前机器的绝对素材路径。
- 前端会先高优先级加载锁屏壁纸以及锁屏通知所需的图标或头像，完成后才显示手机界面；锁定期间不渲染桌面壁纸。进入锁屏后按“桌面壁纸 → 启用 App 图标 → 最新三条朋友圈图片 → 相册前 18 张 → 其他 UI 图片 → 其余朋友圈/相册图片 → 音视频”分阶段后台预加载。进入朋友圈或相册时还会立即以高优先级定向预热对应首屏；其余低优先级图片最多同时加载 3 项，避免大量原图争抢首屏网络与解码资源。

## 5. 初始内容模型

`content.json` 当前主要分区：

- `site`：浏览器标签页名称等网页设置，不显示在手机界面中。
- `device`：手机壳画布参数、`initialBatteryLevel` 初始电量、`batteryDrainIntervalSeconds` 每格电量耗时、`powerOffDelaySeconds` 剧情完成后关机等待，以及可空的 `fixedDate` 固定显示日期。
- `owner`：用户名、签名、Wi-Fi。
- `security`：四位数字密码；始终按字符串理解以保留前导零。
- `theme`：强调色、锁屏和桌面壁纸。
- `weather`：地点、生成种子；天气由 `src/utils/weather.js` 按日期稳定生成。
- `home`：桌面常驻问候/天气组件。
- `apps`：App ID、组件名、图标路径、启用状态、顺序和 Dock；不保存未读角标。日历和时钟图标由程序按本地日期与时间实时绘制，计算器作为无内容表的独立交互 App 注册。
- `gallery`、`notes`、`alarms`、`contacts`、`callHistory`、`playlist`、`browserHistory`、`lockNotifications`、`mail`、`calendarEvents`、`mapLocations`、`xiaohongshu`、`wechat`；地图地点保存类型、地址、SVG 路径、初始收藏/最近和保存日期；小红书区保存首页长图和带可选外链的搜索历史；备忘录可通过 `pinned` 置顶，多个置顶项保持 Excel 行顺序，非置顶项按更新时间倒序；微信会话只保存目标和置顶状态，列表摘要、时间及未读数量从消息计算；微信区还包含朋友圈、点赞和评论，其中朋友圈 `imageSrc` 是最多 9 项的图片路径数组。

重要行为：

- `apps[].enabled === false` 时桌面不显示入口。
- 联系人列表预览由代码取最后一条短信并单行省略，不在 Excel 维护独立预览文本。
- 通话记录只存 `contactId`，姓名与头像运行时从联系人解析；全部通话记录可回拨。
- 电话/短信通知优先显示联系人头像，其他 App 通知显示 App 图标。
- 当前联系人聊天界面已打开时，该联系人新短信不弹顶部通知；在其他联系人或其他 App 时要弹。
- 桌面未读角标由应用内容状态实时计算：信息汇总联系人 `unread`，邮件汇总邮件 `unread`，微信汇总 `messages[].read === false` 的对方消息；不得在微信会话、桌面应用表或 `apps[]` 中维护重复的静态角标。
- 闹钟命中当前本地 `HH:MM` 且已开启时响铃；无音频路径时合成默认铃声。
- 音乐 MP3 存在时以媒体元数据时长为准；退出 App 后继续播放，只有暂停操作停止。
- 微信使用独立联系人 ID，支持单聊、群聊、文字/图片/表情图片/定位消息、群头像拼接和会话通知；定位消息以图片卡片展示并通过 `mapLocationId` 关联地图地点。会话列表时间从最后一条消息计算：设备设定日期当天显示 `HH:MM`，其他日期显示 `MM-DD`。初始聊天记录可使用 `voice-call` / `video-call` 展示通话时长或“已取消”，两者均为不可交互的历史气泡；朋友圈支持玩家点赞、剧情式发布、图文评论/回复、联系人自动互动和内部消息列表。玩家微信身份统一来自 `wechat.profile`，运行状态位于 `src/stores/wechat.js`。
- 微信聊天时间按会话分组，相同显示时间仅在第一条消息上方出现；剧情消息使用发送时的本地分钟时间。
- 小红书首页滚动区与搜索详情同时保留在组件中，返回时恢复原滚动进度；外链只接受 `http://` 或 `https://` 并使用新标签页打开。
- 微信玩家文字回复复用短信的屏幕键盘模拟，按 `keystrokes` 逐键高亮；emoji 不生成按键事件，只在正文对应位置直接显示。

## 6. 剧情运行模型

`story.json` 当前顶层内容：

- `smsScripts`：一段短信剧情一个 ID，内部 `messages` 一句一行。
- `wechatScripts`：一段微信剧情一个 ID，关联会话并支持文字、图片、表情图片、对方定位消息和群成员发送人。
- `momentPublishScripts`：玩家发布朋友圈的预设文字、键盘序列和图片。
- `momentCommentScripts`：玩家评论或回复朋友圈的预设文字、键盘序列和单张图片。
- `momentInteractionScripts`：联系人显示朋友圈、点赞、取消赞、评论、回复和内部消息。
- `phoneDialogues`：一段完整电话对白一个 ID，包含联系人、方向、逐句内容和 `hangupAfterMs`。
- `outgoingCallRules`：主动拨号匹配规则。每条规则有稳定 ID、拨打次数范围和 `conditions`；条件可引用事件状态或最终结果。
- `events`：可激活的剧情节点组成的事件图。

### 事件生命周期

1. `phone.startTimeline()` 激活 `initialActive` 事件；若没有显式入口，则激活未被其他节点引用的根事件。
2. `timer` 事件在激活后按 `trigger.afterMs` 执行。
3. `operation` 事件保持等待，直到 `triggerOperation(action, payload)` 匹配 action、appId 和 targetId。
4. `runEvent()` 当前支持：
   - `call`：发起来电。
   - `sms-script`：激活一整段短信剧情。
   - `wechat-script`：激活一整段微信剧情。
   - `moment-publish`：激活一段玩家发布朋友圈剧情。
   - `moment-comment`：激活一段玩家评论或回复朋友圈剧情。
   - `moment-interactions`：执行一段联系人朋友圈互动剧情。
   - `none`：不展示新内容，直接完成并衔接。
5. `resolveStoryOutcome()` 根据 `nextByOutcome` 激活下一个节点；若 `retry.enabled` 且当前结果在 `retry.outcomes` 中，则等待后重试本节点。
6. 电量按 `device.batteryDrainIntervalSeconds` 定时降低；只要仍有激活事件或已触发但未完成的事件，最低保持 1%。所有初始主线、支线及其实际进入的后继分支完成后，等待 `device.powerOffDelaySeconds` 再统一关机。互斥但未进入的结果分支不参与完成判定。

不要增加全局“线性/分支模式”。线性与分支都由事件连接表达，以便未来 App 操作继续复用。

### 操作触发接口

已有操作包括：

- `app-open`
- `content-open`
- `message-input`
- `outgoing-call`
- `outgoing-call-accepted`
- `outgoing-call-missed`
- `incoming-call-accepted`
- `incoming-call-rejected`
- `incoming-call-missed`
- `call-ended`
- `moment-liked`
- `moment-unliked`
- `moment-comment-sent`
- `moment-published`

新增 App 或内容页时：

- 打开具体内容调用 `phone.openContent(appId, targetId)`。
- 其他剧情动作调用 `phone.triggerOperation(action, { appId, targetId, ... })`。
- `targetId` 使用稳定的内容 ID，而不是显示名称。
- 优先增加通用操作类型，不要为某个剧情文案写一次性判断。

### 短信剧情固定语义

- 激活后，连续的 `them` 消息按各自延迟自动发送。
- 遇到 `me` 消息暂停。
- 玩家打开对应对话并点击输入框后才逐键输入。
- 玩家自己点击发送后继续。
- 再遇到 `me` 再暂停。
- 整段完成才以 `completed` 推进事件；中途不操作会自然卡在当前事件，不需要额外 retry 配置。
- “键盘按键序列”为空时，从消息文本生成默认逐字符输入序列。

### 电话固定语义

- `phoneDialogues` 的 ID 表示一段对白，不表示联系人；一个联系人可拥有多段对白。
- 对白自身定义 `contactId` 和 `direction`；事件或主动通话规则只引用 `dialogueId`。
- 没有匹配主动通话规则时默认无人接听。
- 规则按 `order` 从小到大匹配，可限制拨打次数，并通过 `conditions` 组合任意数量的剧情事件状态或结果条件；同一规则下的条件全部使用 AND 匹配。
- 事件状态分为 `not-triggered`、`in-progress`、`completed`；事件结果可匹配 `accepted`、`rejected`、`missed`、`completed`。没有条件的规则不限制剧情状态。
- 来电和主动通话在最后一句展示后等待 `hangupAfterMs` 再自动挂断。
- 通话接通后不允许玩家主动挂断；通话页保留挂断按钮外观，但按钮不执行任何操作。来电接通前的拒接仍然有效。

## 7. 前端扩展规范

### 新增 App

1. 在 `src/apps/` 新建独立 `XxxApp.vue`。
2. 在 `src/components/AppWindow.vue` 导入并注册组件。
3. 如需新图标，在 `src/config/phone.config.js` 的 `iconRegistry` 注册。
4. 在配置表/`content.json` 的 `apps` 中添加入口，不要在 `HomeScreen.vue` 写死。
5. 打开 App 的全局行为继续走 `phone.openApp()`；可触发剧情的内容行为使用统一操作接口。
6. 同步 Excel schema、示例和文档。

### 状态归属

- 跨 App 或退出 App 后仍需保留的状态放 Pinia store，例如音乐播放、剧情、电话、通知。
- 地图收藏配置、最近地点和当前地点位于 `src/stores/maps.js`；当前页面不允许玩家改变收藏状态。
- 只属于当前页面展示的临时状态放组件内，例如相册当前索引、邮件当前选中项。
- 不要复制第二套联系人、通话或剧情状态到组件。

### UI 与交互

- 移动端优先，保持现有手机安全区、状态栏和底部 Home Indicator。
- `PhoneShell.vue` 为桌面细指针设备提供通用的鼠标纵向拖动滚动；新增可滚动页面应继续使用标准 `overflow-y: auto/scroll`，以自动继承该行为。
- 尽量复用现有颜色变量、圆角、阴影和动画命名。
- App 打开/关闭应保留动画，不应突然切换。
- 设置、浏览历史等只展示页面不要添加未要求的假功能。
- 图标优先使用现有 Lucide 图标；播放模式等紧凑控件使用图标和 `aria-label`，不额外显示模式文字。
- 保持可访问的按钮语义与必要的 `aria-label`，不要用纯 `div` 代替所有交互元素。

## 8. 修改与验证流程

用户当前要求：完成代码或配置工具修改后，只进行编译/结构验证，页面视觉与交互由用户检查。

默认验证：

```powershell
Set-Location .\phone-simulator
npm run build
```

根据任务按需增加：

- 修改转换逻辑：在明确允许更新 JSON 时，从 `excel-json-tool/` 运行 `python convert.py`，再编译。
- 只修改 README/`AGENTS.md`：检查链接、相对路径、命令和 Markdown 内容，不需要启动页面。
- 修改 `.xlsx`：使用适合电子表格的工具保留格式和数据验证，并检查工作簿结构；不要把工作簿转成 CSV 代替。

不要默认执行：

- 不要为了自行看效果启动长期运行的开发服务器。
- 不要在用户要求只编译时截图、浏览或做主观 UI 验收。
- 如果任务确实需要启动 `npm run dev`，结束前必须停止进程，避免占用 5173 或后续端口。
- 不要把 `dist/` 或 `node_modules/` 提交到仓库。

## 9. 编辑安全与协作

- 先检查工作区，保留与当前任务无关的用户改动。
- 不要用重置、覆盖整个目录等方式清除未知更改。
- 修改文件使用精确补丁；格式化只作用于必要范围。
- 不修改用户素材本身，除非用户明确要求转换、压缩或替换。
- 用户提供的 Excel 可能正处于编辑中；不要因为 JSON 对不上就重建表格。
- 不要在代码、README 或脚本中记录本机用户名、盘符或绝对路径。
- 新依赖必须有明确必要性，优先使用现有 Vue、Pinia 和 Lucide 能力。
- 变更配置格式时保持向后兼容；无法兼容时，在 README 和转换错误中给出明确迁移说明。

## 10. 文档维护

有行为或目录变化时同步对应文档：

- 仓库布局、安装、GitHub、Cloudflare：根 `README.md`。
- Vue 功能、运行命令、JSON 和扩展方式：`phone-simulator/README.md`。
- Excel 表结构、填写格式和转换器：`excel-json-tool/README.md`。
- 地图生成参数、导出和恢复方式：`map-generator/README.md`。
- 长期架构、开发约束和新聊天接手信息：本 `AGENTS.md`。

文档示例一律使用相对路径或通用占位路径，不写当前电脑的实际位置。项目移动后，除了 GitHub Desktop 重新关联本地仓库，不应要求修改任何源代码路径。

## 11. 新对话接手检查表

新开发对话开始处理任务前，按以下顺序快速确认：

1. 读取本文件、根 README 和任务对应的子目录 README。
2. 检查 `git status --short` 和相关文件 diff，区分已有用户修改与本次任务范围。
3. 确认本次修改的权威来源：作品内容通常从 Excel 开始，运行时行为从 Vue/Pinia 开始，生成 JSON 不作为长期手工配置源。
4. 若任务修改 schema，列出需要同步的 Excel、转换器、JSON、前端读取和文档，避免只改一层。
5. 若用户正在编辑 Excel 或明确要求暂不转换，不运行转换器；否则在 schema 或正式内容修改完成后重新生成 JSON。
6. 最后按风险做结构验证和 `npm run build`，保留无关改动，并在交付说明中列出修改范围和验证结果。
