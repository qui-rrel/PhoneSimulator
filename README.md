# PhoneSimulator

PhoneSimulator 是一个用于制作手机界面互动故事的静态网页项目。它在浏览器中模拟一部可以操作的手机，适合制作“捡手机文学”、互动同人 Demo 和其他以聊天、通话或手机内容推进的叙事作品。

项目不需要后端、数据库或 AI 接口。短信、微信、电话对白、朋友圈内容和剧情分支都由作者预先配置。

## 可以制作什么

- 锁屏、桌面、四位密码、动态日期、电量和天气。
- 短信、微信单聊与群聊、来电和主动拨号剧情。
- 朋友圈发布、点赞、评论、回复和联系人互动。
- 相册、音乐、备忘录、邮件、日历、地图、小红书等手机内容。
- 按时间、玩家操作和电话结果推进的线性或分支剧情。
- 在剧情路径末端配置独立的关机事件。

微信通讯录、设置、浏览记录以及部分装饰按钮目前只用于展示；小红书只有搜索入口可以操作。短信和微信回复使用预设文案模拟输入，不是自由文字输入框。

## 项目中的工具

```text
PhoneSimulator/
├─ config-editor/        推荐使用的可视化内容与剧情编辑器
├─ phone-simulator/      手机网页及其运行时内容
├─ excel-json-tool/      旧版 Excel 兼容工具
└─ map-generator/        离线 SVG 剧情地图生成器
```

- 新作品推荐使用[可视化编辑器](config-editor/README.md)。
- 已经使用旧 Excel 制作的作品可以继续参考 [Excel 工具说明](excel-json-tool/README.md)，也可以一次性导入可视化编辑器。
- 地图素材可以使用[剧情示意地图生成器](map-generator/README.md)制作。
- 手机网页的运行和操作方法见[手机网页说明](phone-simulator/README.md)。

同一个作品应长期选择可视化项目或 Excel 其中一种作为内容源。两者都会生成相同的 `content.json` 和 `story.json`，不会自动合并或双向同步。

## 开始使用

需要安装较新的 Node.js 22。旧版 Excel 转换流程还需要 Python 3.10 或更高版本。

### 1. 启动可视化编辑器

第一次使用时，在项目根目录运行：

```powershell
Set-Location .\config-editor
npm install
npm run dev
```

打开终端显示的本地地址。编辑器首次打开和点击“新建”时都会载入通用空白模板，其中保留基础设置、桌面应用和微信玩家资料，不包含示例剧情或作品文案。

### 2. 编辑并保存作品

1. 新作品点击“新建”；已有 `.phone-project.json` 点击“打开”。
2. 旧 Excel 作品可以点击“导入 Excel”完成一次性迁移。
3. 使用左侧分类编辑基础设置、手机内容和消息脚本。
4. 使用“剧情流程”中的节点和连线配置剧情先后与结果分支。
5. 修正底部问题列表中的红色错误。
6. 点击“保存”或“另存为”，保存为 `.phone-project.json`。

项目文件是可视化流程的主要内容源。运行时 JSON 是导出结果，下一次编辑时应继续打开项目文件，不要直接修改导出的 JSON。

### 3. 放入图片和音频

把图片、头像、壁纸、SVG 地图、MP3 和铃声放入：

```text
phone-simulator/public/media/
```

编辑器和 Excel 中填写带真实后缀的相对路径，例如：

```text
/media/photos/photo-01.jpg
/media/music/theme.mp3
/media/maps/home.svg
```

配置路径不会自动复制文件。填写完成后仍需手动把素材放入对应目录。锁屏和桌面壁纸留空时使用内置渐变背景；其他素材加载失败时会尽量使用默认图标或占位内容。

### 4. 导出手机网页数据

在可视化编辑器顶部点击“导出 JSON”，选择：

```text
phone-simulator/src/data/
```

编辑器会生成或覆盖：

```text
content.json
story.json
```

导出 JSON 不等于保存项目。完成编辑后应同时保存 `.phone-project.json`。

### 5. 运行手机网页

第一次运行：

```powershell
Set-Location .\phone-simulator
npm install
npm run dev
```

打开终端显示的地址即可预览。结束预览时在终端按 `Ctrl + C`。

检查完整构建：

```powershell
npm run build
```

如果修改配置后网页没有变化，请确认已经重新导出 JSON，并重新启动本地预览或执行构建。

## 旧版 Excel 流程

已有 Excel 作品可以继续使用：

```powershell
Set-Location .\excel-json-tool
python -m pip install -r requirements.txt
python convert.py
```

转换成功后，再进入 `phone-simulator/` 运行 `npm run dev` 或 `npm run build`。

如果准备迁移到可视化编辑器，只需导入一次 Excel，保存为 `.phone-project.json`，之后继续使用项目文件维护作品。

## 地图生成器

地图工具不需要安装。使用 Chrome 或 Edge 打开：

```text
map-generator/index.html
```

生成并保存 SVG 后，把选中的文件复制到 `phone-simulator/public/media/`，再在地图地点配置中填写对应的 `/media/...svg` 路径。

## 文件保存建议

建议同时保留：

- 当前作品的 `.phone-project.json`，或仍在使用的 Excel 工作簿。
- `phone-simulator/src/data/content.json` 与 `story.json`。
- `phone-simulator/public/media/` 中实际使用的素材。

浏览器中的自动恢复副本只能防止页面意外关闭，不能代替主动保存项目文件。

移动项目时应整体移动 `PhoneSimulator` 文件夹，保持几个工具目录的相对位置不变。

## 进一步说明

- [可视化编辑器使用说明](config-editor/README.md)
- [手机网页使用说明](phone-simulator/README.md)
- [旧版 Excel 使用说明](excel-json-tool/README.md)
- [地图生成器使用说明](map-generator/README.md)
