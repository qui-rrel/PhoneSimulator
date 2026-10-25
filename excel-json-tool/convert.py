import argparse
import json
import re
from datetime import date, datetime, time
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.utils.datetime import from_excel


TOOL_DIR = Path(__file__).resolve().parent
PROJECT_DATA = TOOL_DIR.parent / "phone-simulator" / "src" / "data"

parser = argparse.ArgumentParser(description="把手机内容配置 Excel 转换为 content.json 和 story.json")
parser.add_argument("--input", type=Path, default=TOOL_DIR / "outputs" / "phone-config-template.xlsx")
parser.add_argument("--out-dir", type=Path, default=PROJECT_DATA)
args = parser.parse_args()

content = json.loads((PROJECT_DATA / "content.json").read_text(encoding="utf-8"))
story = json.loads((PROJECT_DATA / "story.json").read_text(encoding="utf-8"))
workbook = load_workbook(args.input, data_only=True)


HEADER_ALIASES = {
    "填写值": "value",
    "格式": "type",
    "系统字段（不要修改）": "field",
    "显示顺序": "order",
    "应用 ID": "id",
    "显示名称": "label",
    "是否使用": "enabled",
    "组件名（不要修改）": "component",
    "图标路径（可空）": "iconSrc",
    "图标名（不要修改）": "icon",
    "背景色": "color",
    "图标色": "iconColor",
    "图标色（可空）": "iconColor",
    "放在底部栏": "dock",
    "照片 ID": "id",
    "图片路径": "src",
    "占位渐变": "gradient",
    "显示日期": "date",
    "备忘录 ID": "id",
    "标题": "title",
    "列表摘要": "excerpt",
    "更新时间": "updatedAt",
    "正文": "body",
    "闹钟 ID": "id",
    "时间": "time",
    "标签": "label",
    "是否开启": "enabled",
    "铃声路径（可空）": "sound",
    "联系人 ID": "contactId",
    "姓名": "name",
    "头像路径（可空）": "avatar",
    "默认头像文字": "initials",
    "头像文字": "initials",
    "头像颜色": "color",
    "列表时间": "time",
    "未读数量": "unread",
    "消息 ID": "id",
    "发送方": "side",
    "消息内容": "text",
    "显示时间": "time",
    "是否已读": "read",
    "记录 ID": "id",
    "电话剧情 ID": "dialogueId",
    "显示姓名": "name",
    "方向": "direction",
    "结果": "outcome",
    "通话秒数": "duration",
    "歌曲 ID": "id",
    "歌曲名": "title",
    "歌手": "artist",
    "MP3 路径（可空）": "src",
    "封面路径（可空）": "cover",
    "主题颜色": "color",
    "时长（秒）": "duration",
    "网页标题": "title",
    "网址": "url",
    "通知 ID": "id",
    "关联应用 ID": "appId",
    "通知标题": "title",
    "通知内容": "body",
    "邮件 ID": "id",
    "发件人": "from",
    "主题": "subject",
    "邮件列表摘要": "preview",
    "是否未读": "unread",
    "事件 ID": "id",
    "日期": "date",
    "事件名称": "title",
    "颜色": "color",
    "短信剧情 ID": "smsScriptId",
    "消息序号": "sequence",
    "键盘按键序列": "keystrokes",
    "对方发送延迟（秒）": "afterMs",
    "对白 ID": "dialogueId",
    "电话对白 ID": "dialogueId",
    "对白方向": "direction",
    "对白结束后挂断等待（秒）": "hangupAfterMs",
    "对白序号": "sequence",
    "说话方": "side",
    "对白内容": "text",
    "出现延迟（秒）": "afterMs",
    "出现延迟（毫秒）": "afterMs",
    "触发方式": "triggerType",
    "初始激活": "initialActive",
    "触发延迟（秒）": "afterMs",
    "触发延迟（毫秒）": "afterMs",
    "玩家操作": "triggerAction",
    "操作应用 ID": "triggerAppId",
    "操作目标 ID": "targetId",
    "触发对象 ID": "targetId",
    "发生内容": "actionType",
    "无人接听超时（秒）": "timeoutMs",
    "无人接听超时（毫秒）": "timeoutMs",
    "接听后事件 ID": "acceptedNext",
    "拒接后事件 ID": "rejectedNext",
    "未接后事件 ID": "missedNext",
    "完成后事件 ID": "completedNext",
    "线性模式是否重试": "retryEnabled",
    "重试等待（秒）": "retryAfterMs",
    "重试等待（毫秒）": "retryAfterMs",
    "哪些结果需要重试（每项一行）": "retryOutcomes",
    "规则序号": "order",
    "条件剧情事件 ID": "eventId",
    "剧情事件状态": "eventState",
    "起始拨打次数": "minDialCount",
    "结束拨打次数": "maxDialCount",
    "对方是否接听": "answer",
    "振铃时长（秒）": "ringMs",
    "振铃时长（毫秒）": "ringMs",
    "接通等待（秒）": "connectAfterMs",
    "接通等待（毫秒）": "connectAfterMs",
    "主动通话对白 ID": "dialogueId",
    "微信昵称": "nickname",
    "微信号": "wechatId",
    "朋友圈封面路径（可空）": "momentsCover",
    "微信联系人 ID": "contactId",
    "备注名（可空）": "remark",
    "群聊 ID": "groupId",
    "群聊名称": "name",
    "成员序号": "order",
    "会话 ID": "conversationId",
    "会话类型": "type",
    "会话目标 ID": "targetId",
    "会话序号": "order",
    "消息类型": "type",
    "发送人 ID": "senderId",
    "图片或表情路径（可空）": "mediaSrc",
    "朋友圈 ID": "momentId",
    "发布人 ID": "authorId",
    "朋友圈正文（可空）": "text",
    "朋友圈图片（可空）": "imageSrc",
    "朋友圈图片路径（每项一行，最多 9 张，可空）": "imageSrc",
    "是否初始显示": "initiallyVisible",
    "点赞人 ID": "contactId",
    "评论 ID": "id",
    "评论人 ID": "authorId",
    "回复对象 ID（可空）": "replyToCommentId",
    "回复的评论 ID（可空）": "replyToCommentId",
    "评论内容（可空）": "text",
    "评论图片路径（可空）": "imageSrc",
    "微信剧情 ID": "wechatScriptId",
    "发布剧情 ID": "publishScriptId",
    "生成的朋友圈 ID": "momentId",
    "发布正文（可空）": "text",
    "发布时间（可空）": "time",
    "玩家评论剧情 ID": "commentScriptId",
    "生成的评论 ID": "commentId",
    "互动剧情 ID": "interactionScriptId",
    "互动类型": "type",
    "互动人 ID（可空）": "actorId",
    "互动延迟（秒）": "afterMs",
    "是否生成朋友圈消息": "notify",
    "朋友圈消息文案（可空）": "notificationText",
}

EXPECTED_HEADERS = {
    "基础设置": {"field", "value"},
    "桌面应用": {"id", "label", "component"},
    "相册": {"id", "src"},
    "备忘录": {"id", "title", "body"},
    "闹钟": {"id", "time", "enabled"},
    "联系人": {"contactId", "name", "unread"},
    "短信记录": {"contactId", "id", "text"},
    "通话记录": {"id", "contactId"},
    "音乐": {"id", "title"},
    "浏览记录": {"id", "title", "url"},
    "锁屏通知": {"id", "appId", "body"},
    "邮件": {"id", "from", "subject"},
    "日历": {"id", "date", "title"},
    "短信剧情": {"smsScriptId", "contactId", "sequence", "side", "text"},
    "电话剧情": {"dialogueId", "direction", "contactId", "hangupAfterMs"},
    "电话剧情内容": {"dialogueId", "sequence", "side", "text"},
    "剧情事件": {"id", "triggerType", "actionType"},
    "剧情分支": {"id", "retryEnabled"},
    "主动通话规则": {"contactId", "order", "answer"},
    "微信账号": {"nickname", "wechatId"},
    "微信联系人": {"contactId", "nickname"},
    "微信群聊": {"groupId", "name"},
    "微信群成员": {"groupId", "contactId", "order"},
    "微信会话": {"conversationId", "type", "targetId", "order", "unread"},
    "微信消息": {"conversationId", "id", "sequence", "senderId", "type"},
    "朋友圈": {"momentId", "authorId", "order"},
    "朋友圈点赞": {"momentId", "contactId", "order"},
    "朋友圈评论": {"id", "momentId", "authorId", "order"},
    "微信剧情": {"wechatScriptId", "conversationId", "sequence", "senderId", "type"},
    "朋友圈发布剧情": {"publishScriptId", "momentId"},
    "朋友圈玩家评论剧情": {"commentScriptId", "commentId", "momentId"},
    "朋友圈互动剧情": {"interactionScriptId", "sequence", "type", "momentId"},
}

SHEET_ALIASES = {
    "短信记录": ["短信记录", "聊天记录"],
    "短信剧情": ["短信剧情", "聊天剧情"],
}

NUMBER_FIELDS = {"device.width", "device.height", "device.radius", "security.digits", "weather.seed"}
BOOLEAN_FIELDS = {"home.showGreetingWidget"}

SIDE_ALIASES = {"我": "me", "对方": "them", "me": "me", "them": "them"}
TRIGGER_ALIASES = {"计时触发": "timer", "操作触发": "operation", "timer": "timer", "operation": "operation"}
TRIGGER_ACTION_ALIASES = {
    "点击短信输入框": "message-input",
    "点击聊天输入框": "message-input",
    "打开应用": "app-open",
    "打开具体内容": "content-open",
    "主动拨打电话": "outgoing-call",
    "主动电话接通": "outgoing-call-accepted",
    "主动电话未接": "outgoing-call-missed",
    "接听来电": "incoming-call-accepted",
    "拒接来电": "incoming-call-rejected",
    "错过来电": "incoming-call-missed",
    "通话结束": "call-ended",
    "朋友圈已点赞": "moment-liked",
    "朋友圈已取消赞": "moment-unliked",
    "朋友圈评论已发送": "moment-comment-sent",
    "朋友圈已发布": "moment-published",
    "message-input": "message-input",
    "app-open": "app-open",
    "content-open": "content-open",
    "outgoing-call": "outgoing-call",
    "outgoing-call-accepted": "outgoing-call-accepted",
    "outgoing-call-missed": "outgoing-call-missed",
    "incoming-call-accepted": "incoming-call-accepted",
    "incoming-call-rejected": "incoming-call-rejected",
    "incoming-call-missed": "incoming-call-missed",
    "call-ended": "call-ended",
    "moment-liked": "moment-liked",
    "moment-unliked": "moment-unliked",
    "moment-comment-sent": "moment-comment-sent",
    "moment-published": "moment-published",
    "": "",
}
ACTION_ALIASES = {
    "收到电话": "call",
    "执行短信剧情": "sms-script",
    "执行微信剧情": "wechat-script",
    "执行朋友圈发布剧情": "moment-publish",
    "执行朋友圈玩家评论剧情": "moment-comment",
    "执行朋友圈互动剧情": "moment-interactions",
    "仅衔接下一节点": "none",
    "call": "call",
    "sms-script": "sms-script",
    "wechat-script": "wechat-script",
    "moment-publish": "moment-publish",
    "moment-comment": "moment-comment",
    "moment-interactions": "moment-interactions",
    "none": "none",
}
WECHAT_CONVERSATION_TYPE_ALIASES = {"单聊": "direct", "群聊": "group", "direct": "direct", "group": "group"}
WECHAT_MESSAGE_TYPE_ALIASES = {"文字": "text", "图片": "image", "表情图片": "sticker", "text": "text", "image": "image", "sticker": "sticker"}
MOMENT_INTERACTION_TYPE_ALIASES = {"显示朋友圈": "show-moment", "点赞": "like", "取消赞": "unlike", "评论": "comment", "show-moment": "show-moment", "like": "like", "unlike": "unlike", "comment": "comment"}
WECHAT_SELF_ID = "SELF"
OUTCOME_ALIASES = {"接听": "accepted", "拒接": "rejected", "未接": "missed", "accepted": "accepted", "rejected": "rejected", "missed": "missed"}
RETRY_OUTCOME_OPTIONS = {"接听": "accepted", "拒接": "rejected", "未接": "missed"}
DIAL_EVENT_STATE_ALIASES = {"任意": "any", "已触发": "triggered", "未触发": "not-triggered", "any": "any", "triggered": "triggered", "not-triggered": "not-triggered", "": "any"}
DIRECTION_ALIASES = {"呼入": "incoming", "呼出": "outgoing", "incoming": "incoming", "outgoing": "outgoing"}
DIALOGUE_DIRECTION_ALIASES = {"来电": "incoming", "主动拨打": "outgoing", "通用": "any", "incoming": "incoming", "outgoing": "outgoing", "any": "any"}
CALL_OUTCOME_ALIASES = {
    "已接听": "accepted",
    "已拒接": "rejected",
    "未接听": "missed",
    "已拨出": "outgoing",
    "accepted": "accepted",
    "rejected": "rejected",
    "missed": "missed",
    "outgoing": "outgoing",
}

LOCAL_TIME_INPUT = "LOCAL_TIME"
LOCAL_TIME_TOKEN = "$localTime"


def rows(sheet_name):
    actual_name = next((name for name in SHEET_ALIASES.get(sheet_name, [sheet_name]) if name in workbook.sheetnames), None)
    if actual_name is None:
        return []
    sheet = workbook[actual_name]
    required = EXPECTED_HEADERS[sheet_name]
    header_row = None
    headers = []
    for row_index in range(1, min(sheet.max_row, 10) + 1):
        raw_headers = [cell.value or "" for cell in sheet[row_index]]
        normalized = []
        for header in raw_headers:
            label = str(header).strip()
            lines = [line.strip() for line in label.splitlines() if line.strip()]
            field_name = lines[-1] if len(lines) > 1 and re.fullmatch(r"[A-Za-z][A-Za-z0-9_.]*", lines[-1]) else ""
            chinese_label = lines[0] if lines else ""
            base_label = re.sub(r"[，,]可空(?=）)", "", chinese_label).replace("（可空）", "")
            normalized.append(field_name or HEADER_ALIASES.get(chinese_label, HEADER_ALIASES.get(base_label, chinese_label)))
        if required.issubset(set(normalized)):
            header_row = row_index
            headers = normalized
            break
    if header_row is None:
        raise ValueError(f"{sheet_name}：未找到可识别的表头，请不要修改表头中的英文字段名。")
    output = []
    for values in sheet.iter_rows(min_row=header_row + 1, values_only=True):
        record = {str(header): (value if value is not None else "") for header, value in zip(headers, values) if header}
        if any(value != "" for value in record.values()):
            output.append(record)
    return output


def as_bool(value):
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"true", "1", "是", "开", "开启", "yes"}


def as_number(value, fallback=0):
    if value in (None, ""):
        return fallback
    number = float(value)
    return int(number) if number.is_integer() else number


def seconds_to_ms(value, fallback_seconds=0):
    seconds = as_number(value, fallback_seconds)
    if seconds < 0:
        raise ValueError("剧情时间不能为负数，请按秒填写 0 或正数。")
    milliseconds = seconds * 1000
    return int(milliseconds) if float(milliseconds).is_integer() else milliseconds


def as_text(value):
    if value in (None, ""):
        return ""
    if isinstance(value, datetime):
        if value.time() == time(0, 0):
            return value.strftime("%Y-%m-%d")
        return value.strftime("%Y-%m-%d %H:%M")
    if isinstance(value, date):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, time):
        return value.strftime("%H:%M")
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def as_display_time(value):
    text = as_text(value)
    if text == LOCAL_TIME_INPUT:
        return LOCAL_TIME_TOKEN
    return text


def as_time_text(value, label, allow_blank=False):
    if value in (None, ""):
        if allow_blank:
            return ""
        raise ValueError(f"{label}：时间不能为空，请按 HH:MM 填写。")
    if isinstance(value, datetime):
        value = value.time()
    if isinstance(value, time):
        return value.strftime("%H:%M")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        fraction = float(value) % 1
        total_minutes = int(round(fraction * 24 * 60)) % (24 * 60)
        return f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"
    candidate = as_text(value)
    numeric_candidate = re.fullmatch(r"\d+(?:\.\d+)?", candidate)
    if numeric_candidate and float(candidate) < 1:
        return as_time_text(float(candidate), label, allow_blank)
    match = re.fullmatch(r"(\d{1,2})[:：](\d{1,2})", candidate)
    if not match or int(match.group(1)) > 23 or int(match.group(2)) > 59:
        raise ValueError(f"{label}：{candidate!r} 不是有效时间，请按 HH:MM 填写。")
    return f"{int(match.group(1)):02d}:{int(match.group(2)):02d}"


def as_date_text(value, label):
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, date):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return from_excel(value, workbook.epoch).strftime("%Y-%m-%d")
    candidate = as_text(value)
    match = re.fullmatch(r"(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})", candidate)
    if not match:
        raise ValueError(f"{label}：{candidate!r} 不是有效日期，请按 YYYY-MM-DD 填写。")
    try:
        return date(int(match.group(1)), int(match.group(2)), int(match.group(3))).strftime("%Y-%m-%d")
    except ValueError as error:
        raise ValueError(f"{label}：{candidate!r} 不是有效日期。") from error


def as_list(value):
    return [item.strip() for item in re.split(r"\s*\|\|\s*|\r?\n", str(value or "")) if item.strip()]


def as_line_list(value, label, max_items=None):
    items = [item.strip() for item in re.split(r"\r?\n", as_text(value)) if item.strip()]
    if max_items is not None and len(items) > max_items:
        raise ValueError(f"{label}：最多填写 {max_items} 项，当前填写了 {len(items)} 项。")
    return items


def as_retry_outcomes(value, event_id):
    raw = str(value or "")
    if "||" in raw:
        raise ValueError(f"剧情分支 {event_id!r}：重试结果只允许用 Alt+Enter 换行分隔，不能使用 ||。")
    items = [item.strip() for item in re.split(r"\r?\n", raw) if item.strip()]
    if not items:
        raise ValueError(f"剧情分支 {event_id!r}：启用重试后，至少填写一个需要重试的结果。当前可填：接听、拒接、未接。")
    invalid = [item for item in items if item not in RETRY_OUTCOME_OPTIONS]
    if invalid:
        raise ValueError(f"剧情分支 {event_id!r}：重试结果 {invalid!r} 无效。当前只能填写：接听、拒接、未接；每项一行。")
    if len(items) != len(set(items)):
        raise ValueError(f"剧情分支 {event_id!r}：重试结果不能重复填写。")
    return [RETRY_OUTCOME_OPTIONS[item] for item in items]


def as_passcode(value):
    if isinstance(value, bool):
        candidate = ""
    elif isinstance(value, int):
        candidate = f"{value:04d}" if 0 <= value <= 9999 else str(value)
    elif isinstance(value, float) and value.is_integer():
        number = int(value)
        candidate = f"{number:04d}" if 0 <= number <= 9999 else str(number)
    else:
        candidate = str(value or "")
    if not re.fullmatch(r"[0-9]{4}", candidate):
        raise ValueError("基础设置中的锁屏密码必须恰好填写 4 位数字，例如 2799 或 0123。")
    return candidate


def set_path(target, key_path, value):
    keys = key_path.split(".")
    cursor = target
    for key in keys[:-1]:
        cursor = cursor.setdefault(key, {})
    cursor[keys[-1]] = value


def unique_ids(items, key, label):
    seen = set()
    for item in items:
        value = item.get(key, "")
        if not value:
            raise ValueError(f"{label}：ID 不能为空。")
        if value in seen:
            raise ValueError(f"{label}：ID {value!r} 重复。")
        seen.add(value)
    return seen


basic_fields = set()
for row in rows("基础设置"):
    value = row["value"]
    field = as_text(row["field"])
    basic_fields.add(field)
    if field == "security.passcode":
        value = as_passcode(value)
    elif field == "device.fixedDate":
        value = "" if value in (None, "") else as_date_text(value, "基础设置中的固定日期")
    elif field == "security.digits":
        value = as_number(value)
        if value != 4:
            raise ValueError("密码位数固定为 4，请不要修改。")
    elif field in NUMBER_FIELDS:
        value = as_number(value)
    elif field in BOOLEAN_FIELDS:
        value = as_bool(value)
    else:
        value = as_text(value)
    if field.startswith("story."):
        set_path(story, field[6:], value)
    else:
        set_path(content, field, value)

site_title = as_text(content.get("site", {}).get("title", ""))
if "site.title" in basic_fields and not site_title:
    raise ValueError("基础设置中的网页名称不能为空。")
if not site_title:
    set_path(content, "site.title", "PhoneSimulator")

if isinstance(content.get("home"), dict):
    content["home"].pop("pageLabel", None)

story.pop("mode", None)

if "桌面应用" in workbook.sheetnames:
    app_rows = sorted(rows("桌面应用"), key=lambda row: as_number(row.get("order", 0)))
    apps = []
    for row in app_rows:
        app = {
            "id": as_text(row["id"]),
            "label": as_text(row["label"]),
            "enabled": as_bool(row.get("enabled", True)),
            "component": as_text(row["component"]),
            "iconSrc": as_text(row.get("iconSrc", "")),
        }
        if as_bool(row.get("dock")):
            app["dock"] = True
        apps.append(app)
    app_ids = unique_ids(apps, "id", "桌面应用")
    content["apps"] = apps
else:
    app_ids = unique_ids(content.get("apps", []), "id", "桌面应用")

content["gallery"] = [{
    "id": as_text(row.get("id", "")),
    "src": as_text(row.get("src", "")),
    "gradient": as_text(row.get("gradient", "")),
    "date": as_display_time(row.get("date", "")),
} for row in rows("相册")]
content["notes"] = [{
    "id": as_text(row.get("id", "")),
    "title": as_text(row.get("title", "")),
    "excerpt": as_text(row.get("excerpt", "")),
    "updatedAt": as_display_time(row.get("updatedAt", "")),
    "body": as_text(row.get("body", "")),
} for row in rows("备忘录")]
content["alarms"] = [{"id": as_text(row["id"]), "time": as_time_text(row["time"], "闹钟"), "label": as_text(row.get("label", "")), "enabled": as_bool(row["enabled"]), "sound": as_text(row.get("sound", ""))} for row in rows("闹钟")]
content["playlist"] = [{"id": as_text(row["id"]), "title": as_text(row["title"]), "artist": as_text(row.get("artist", "")), "src": as_text(row.get("src", "")), "cover": as_text(row.get("cover", "")), "color": as_text(row.get("color", "")), "duration": as_number(row.get("duration", ""), 0)} for row in rows("音乐")]
content["browserHistory"] = [{"id": as_text(row.get("id", "")), "title": as_text(row.get("title", "")), "url": as_text(row.get("url", "")), "time": as_display_time(row.get("time", ""))} for row in rows("浏览记录")]
content["lockNotifications"] = [{"id": as_text(row.get("id", "")), "appId": as_text(row.get("appId", "")), "contactId": as_text(row.get("contactId", "")), "title": as_text(row.get("title", "")), "time": as_display_time(row.get("time", "")), "body": as_text(row.get("body", ""))} for row in rows("锁屏通知")]
content["callHistory"] = [{
    "id": as_text(row["id"]),
    "contactId": as_text(row.get("contactId", "")),
    "direction": DIRECTION_ALIASES.get(str(row["direction"]).strip(), str(row["direction"]).strip()),
    "outcome": CALL_OUTCOME_ALIASES.get(str(row["outcome"]).strip(), str(row["outcome"]).strip()),
    "time": as_display_time(row.get("time", "")),
    "duration": as_number(row["duration"]),
} for row in rows("通话记录")]
content["mail"] = [{"id": as_text(row["id"]), "from": as_text(row["from"]), "subject": as_text(row["subject"]), "preview": as_text(row.get("preview", "")), "time": as_display_time(row.get("time", "")), "unread": as_bool(row.get("unread", False)), "body": as_text(row.get("body", ""))} for row in rows("邮件")]
content["calendarEvents"] = [{"id": as_text(row["id"]), "date": as_date_text(row["date"], "日历"), "title": as_text(row["title"]), "time": as_display_time(row.get("time", "")), "color": as_text(row.get("color", ""))} for row in rows("日历")]

for collection_name, label in [
    ("gallery", "相册"),
    ("notes", "备忘录"),
    ("alarms", "闹钟"),
    ("playlist", "音乐"),
    ("browserHistory", "浏览记录"),
    ("lockNotifications", "锁屏通知"),
    ("callHistory", "通话记录"),
    ("mail", "邮件"),
    ("calendarEvents", "日历"),
]:
    unique_ids(content[collection_name], "id", label)

messages_by_contact = {}
for row in rows("短信记录"):
    message = {
        "id": as_text(row["id"]),
        "side": SIDE_ALIASES.get(str(row["side"]).strip(), str(row["side"]).strip()),
        "text": as_text(row["text"]),
        "stamp": as_display_time(row.get("time", row.get("stamp", ""))),
        "read": as_bool(row.get("read", False)),
    }
    messages_by_contact.setdefault(as_text(row["contactId"]), []).append(message)

content["contacts"] = []
for row in rows("联系人"):
    content["contacts"].append({
        "id": as_text(row["contactId"]),
        "name": as_text(row["name"]),
        "avatar": as_text(row.get("avatar", "")),
        "initials": as_text(row.get("initials", "")),
        "color": as_text(row.get("color", "")),
        "time": as_display_time(row.get("time", "")),
        "unread": as_number(row.get("unread", 0)),
        "messages": messages_by_contact.get(as_text(row["contactId"]), []),
    })
contact_ids = unique_ids(content["contacts"], "id", "联系人")

for contact_id in messages_by_contact:
    if contact_id not in contact_ids:
        raise ValueError(f"短信记录：联系人 ID {contact_id!r} 在“联系人”中不存在。")

for item in content["lockNotifications"]:
    if item["appId"] not in app_ids:
        raise ValueError(f"锁屏通知 {item['id']!r}：应用 ID {item['appId']!r} 在“桌面应用”中不存在。")
    if item["appId"] in {"messages", "phone"} and item.get("contactId") and item["contactId"] not in contact_ids:
        raise ValueError(f"锁屏通知 {item['id']!r}：联系人 ID {item['contactId']!r} 不存在。")

for item in content["callHistory"]:
    if item.get("contactId") and item["contactId"] not in contact_ids:
        raise ValueError(f"通话记录 {item['id']!r}：联系人 ID {item['contactId']!r} 不存在。")

wechat_account_rows = rows("微信账号")
if len(wechat_account_rows) != 1:
    raise ValueError("微信账号：必须且只能填写一行玩家自己的微信账号。")
wechat_account = wechat_account_rows[0]
wechat = {
    "profile": {
        "nickname": as_text(wechat_account.get("nickname", "")),
        "wechatId": as_text(wechat_account.get("wechatId", "")),
        "avatar": as_text(wechat_account.get("avatar", "")),
        "initials": as_text(wechat_account.get("initials", "")),
        "color": as_text(wechat_account.get("color", "")),
        "momentsCover": as_text(wechat_account.get("momentsCover", "")),
    },
    "contacts": [],
    "groups": [],
    "conversations": [],
    "messages": [],
    "moments": [],
    "momentLikes": [],
    "momentComments": [],
}
if not wechat["profile"]["nickname"] or not wechat["profile"]["wechatId"]:
    raise ValueError("微信账号：昵称和微信号不能为空。")

for row in rows("微信联系人"):
    wechat["contacts"].append({
        "id": as_text(row.get("contactId", "")),
        "nickname": as_text(row.get("nickname", "")),
        "remark": as_text(row.get("remark", "")),
        "wechatId": as_text(row.get("wechatId", "")),
        "avatar": as_text(row.get("avatar", "")),
        "initials": as_text(row.get("initials", "")),
        "color": as_text(row.get("color", "")),
    })
wechat_contact_ids = unique_ids(wechat["contacts"], "id", "微信联系人")
for contact in wechat["contacts"]:
    if not contact["nickname"]:
        raise ValueError(f"微信联系人 {contact['id']!r}：昵称不能为空。")

members_by_group = {}
member_sequences = set()
group_member_ids = set()
for row in rows("微信群成员"):
    group_id = as_text(row.get("groupId", ""))
    member_id = as_text(row.get("contactId", ""))
    order = as_number(row.get("order", 0))
    key = (group_id, order)
    if key in member_sequences:
        raise ValueError(f"微信群成员 {group_id!r}：成员序号 {order!r} 重复。")
    member_sequences.add(key)
    member_key = (group_id, member_id)
    if member_key in group_member_ids:
        raise ValueError(f"微信群成员 {group_id!r}：成员 {member_id!r} 重复。")
    group_member_ids.add(member_key)
    if member_id != WECHAT_SELF_ID and member_id not in wechat_contact_ids:
        raise ValueError(f"微信群成员 {group_id!r}：成员 ID {member_id!r} 不在“微信联系人”中，也不是 SELF。")
    members_by_group.setdefault(group_id, []).append((order, member_id))

for row in rows("微信群聊"):
    group_id = as_text(row.get("groupId", ""))
    members = [item[1] for item in sorted(members_by_group.get(group_id, []), key=lambda item: item[0])]
    if len(members) < 2:
        raise ValueError(f"微信群聊 {group_id!r}：至少需要在“微信群成员”中配置两名成员。")
    if WECHAT_SELF_ID not in members:
        raise ValueError(f"微信群聊 {group_id!r}：成员中必须包含玩家自己 SELF。")
    name = as_text(row.get("name", ""))
    if not name:
        raise ValueError(f"微信群聊 {group_id!r}：群聊名称不能为空。")
    wechat["groups"].append({"id": group_id, "name": name, "memberIds": members})
wechat_group_ids = unique_ids(wechat["groups"], "id", "微信群聊")
for group_id in members_by_group:
    if group_id not in wechat_group_ids:
        raise ValueError(f"微信群成员：群聊 ID {group_id!r} 在“微信群聊”中不存在。")

for row in rows("微信会话"):
    conversation_type = WECHAT_CONVERSATION_TYPE_ALIASES.get(as_text(row.get("type", "")), as_text(row.get("type", "")))
    if conversation_type not in {"direct", "group"}:
        raise ValueError("微信会话：会话类型必须选择“单聊”或“群聊”。")
    target_id = as_text(row.get("targetId", ""))
    if conversation_type == "direct" and target_id not in wechat_contact_ids:
        raise ValueError(f"微信会话：单聊目标 {target_id!r} 在“微信联系人”中不存在。")
    if conversation_type == "group" and target_id not in wechat_group_ids:
        raise ValueError(f"微信会话：群聊目标 {target_id!r} 在“微信群聊”中不存在。")
    wechat["conversations"].append({
        "id": as_text(row.get("conversationId", "")),
        "type": conversation_type,
        "targetId": target_id,
        "order": as_number(row.get("order", 0)),
        "time": as_display_time(row.get("time", "")),
        "unread": as_number(row.get("unread", 0)),
        "muted": as_bool(row.get("muted", False)),
    })
wechat_conversation_ids = unique_ids(wechat["conversations"], "id", "微信会话")
wechat_conversation_map = {item["id"]: item for item in wechat["conversations"]}
wechat_group_map = {item["id"]: item for item in wechat["groups"]}

message_sequences = set()
for row in rows("微信消息"):
    conversation_id = as_text(row.get("conversationId", ""))
    if conversation_id not in wechat_conversation_ids:
        raise ValueError(f"微信消息：会话 ID {conversation_id!r} 在“微信会话”中不存在。")
    sequence = as_number(row.get("sequence", 0))
    key = (conversation_id, sequence)
    if key in message_sequences:
        raise ValueError(f"微信消息 {conversation_id!r}：消息序号 {sequence!r} 重复。")
    message_sequences.add(key)
    message_type = WECHAT_MESSAGE_TYPE_ALIASES.get(as_text(row.get("type", "")), as_text(row.get("type", "")))
    if message_type not in {"text", "image", "sticker"}:
        raise ValueError("微信消息：消息类型必须选择“文字”“图片”或“表情图片”。")
    sender_id = as_text(row.get("senderId", ""))
    if sender_id != WECHAT_SELF_ID and sender_id not in wechat_contact_ids:
        raise ValueError(f"微信消息：发送人 ID {sender_id!r} 不在“微信联系人”中，也不是 SELF。")
    conversation = wechat_conversation_map[conversation_id]
    if conversation["type"] == "direct" and sender_id not in {WECHAT_SELF_ID, conversation["targetId"]}:
        raise ValueError(f"微信消息 {conversation_id!r}：单聊发送人只能是 SELF 或会话联系人。")
    if conversation["type"] == "group" and sender_id not in wechat_group_map[conversation["targetId"]]["memberIds"]:
        raise ValueError(f"微信消息 {conversation_id!r}：发送人 {sender_id!r} 不是该群成员。")
    text = as_text(row.get("text", ""))
    media_src = as_text(row.get("mediaSrc", ""))
    if message_type == "text" and not text:
        raise ValueError(f"微信消息 {conversation_id!r}：文字消息内容不能为空。")
    if message_type in {"image", "sticker"} and not media_src:
        raise ValueError(f"微信消息 {conversation_id!r}：图片或表情消息必须填写素材路径。")
    wechat["messages"].append({
        "id": as_text(row.get("id", "")),
        "conversationId": conversation_id,
        "order": sequence,
        "senderId": sender_id,
        "type": message_type,
        "text": text,
        "mediaSrc": media_src,
        "time": as_display_time(row.get("time", "")),
        "read": as_bool(row.get("read", True)),
    })
unique_ids(wechat["messages"], "id", "微信消息")

for row in rows("朋友圈"):
    author_id = as_text(row.get("authorId", ""))
    if author_id != WECHAT_SELF_ID and author_id not in wechat_contact_ids:
        raise ValueError(f"朋友圈：发布人 ID {author_id!r} 在“微信联系人”中不存在，也不是 SELF。")
    text = as_text(row.get("text", ""))
    image_srcs = as_line_list(row.get("imageSrc", ""), "朋友圈图片", max_items=9)
    if not text and not image_srcs:
        raise ValueError("朋友圈：正文和图片至少填写一项。")
    wechat["moments"].append({
        "id": as_text(row.get("momentId", "")),
        "authorId": author_id,
        "text": text,
        "imageSrc": image_srcs,
        "time": as_display_time(row.get("time", "")),
        "order": as_number(row.get("order", 0)),
        "initiallyVisible": as_bool(row.get("initiallyVisible", True)),
    })
wechat["moments"].sort(key=lambda item: item["order"])
initial_moment_ids = unique_ids(wechat["moments"], "id", "朋友圈")

story["momentPublishScripts"] = []
for row in rows("朋友圈发布剧情"):
    text = as_text(row.get("text", ""))
    image_srcs = as_line_list(row.get("imageSrc", ""), "朋友圈发布剧情图片", max_items=9)
    if not text and not image_srcs:
        raise ValueError("朋友圈发布剧情：发布正文和图片至少填写一项。")
    story["momentPublishScripts"].append({
        "id": as_text(row.get("publishScriptId", "")),
        "momentId": as_text(row.get("momentId", "")),
        "text": text,
        "keystrokes": as_text(row.get("keystrokes", "")),
        "imageSrc": image_srcs,
        "time": as_display_time(row.get("time", "")),
    })
publish_script_ids = unique_ids(story["momentPublishScripts"], "id", "朋友圈发布剧情")
published_moment_ids = unique_ids(story["momentPublishScripts"], "momentId", "朋友圈发布剧情生成的朋友圈")
duplicate_moments = initial_moment_ids & published_moment_ids
if duplicate_moments:
    raise ValueError(f"朋友圈发布剧情：生成的朋友圈 ID 与初始朋友圈重复：{sorted(duplicate_moments)!r}。")
wechat_moment_ids = initial_moment_ids | published_moment_ids

story["momentCommentScripts"] = []
for row in rows("朋友圈玩家评论剧情"):
    moment_id = as_text(row.get("momentId", ""))
    if moment_id not in wechat_moment_ids:
        raise ValueError(f"朋友圈玩家评论剧情：朋友圈 ID {moment_id!r} 不存在。")
    text = as_text(row.get("text", ""))
    image_src = as_text(row.get("imageSrc", ""))
    if not text and not image_src:
        raise ValueError(f"朋友圈玩家评论剧情 {moment_id!r}：文字和图片至少填写一项。")
    story["momentCommentScripts"].append({
        "id": as_text(row.get("commentScriptId", "")),
        "commentId": as_text(row.get("commentId", "")),
        "momentId": moment_id,
        "replyToCommentId": as_text(row.get("replyToCommentId", "")),
        "text": text,
        "keystrokes": as_text(row.get("keystrokes", "")),
        "imageSrc": image_src,
    })
comment_script_ids = unique_ids(story["momentCommentScripts"], "id", "朋友圈玩家评论剧情")
player_comment_ids = unique_ids(story["momentCommentScripts"], "commentId", "朋友圈玩家评论剧情生成的评论")

story["momentInteractionScripts"] = []
interaction_scripts = {}
interaction_sequences = set()
for row in rows("朋友圈互动剧情"):
    script_id = as_text(row.get("interactionScriptId", ""))
    sequence = as_number(row.get("sequence", 0))
    key = (script_id, sequence)
    if key in interaction_sequences:
        raise ValueError(f"朋友圈互动剧情 {script_id!r}：互动序号 {sequence!r} 重复。")
    interaction_sequences.add(key)
    action_type = MOMENT_INTERACTION_TYPE_ALIASES.get(as_text(row.get("type", "")), as_text(row.get("type", "")))
    if action_type not in {"show-moment", "like", "unlike", "comment"}:
        raise ValueError(f"朋友圈互动剧情 {script_id!r}：互动类型无效。")
    moment_id = as_text(row.get("momentId", ""))
    if moment_id not in wechat_moment_ids:
        raise ValueError(f"朋友圈互动剧情 {script_id!r}：朋友圈 ID {moment_id!r} 不存在。")
    actor_id = as_text(row.get("actorId", ""))
    if action_type != "show-moment" and actor_id not in wechat_contact_ids:
        raise ValueError(f"朋友圈互动剧情 {script_id!r}：互动人 {actor_id!r} 必须存在于微信联系人。")
    text = as_text(row.get("text", ""))
    image_src = as_text(row.get("imageSrc", ""))
    if action_type == "comment" and not text and not image_src:
        raise ValueError(f"朋友圈互动剧情 {script_id!r}：评论文字和图片至少填写一项。")
    action = {
        "order": sequence,
        "type": action_type,
        "momentId": moment_id,
        "actorId": actor_id,
        "commentId": as_text(row.get("commentId", "")),
        "replyToCommentId": as_text(row.get("replyToCommentId", "")),
        "text": text,
        "imageSrc": image_src,
        "afterMs": seconds_to_ms(row.get("afterMs", ""), 0),
        "notify": as_bool(row.get("notify", False)),
        "notificationText": as_text(row.get("notificationText", "")),
    }
    interaction_scripts.setdefault(script_id, {"id": script_id, "actions": []})["actions"].append(action)
for script in interaction_scripts.values():
    script["actions"].sort(key=lambda item: item["order"])
    for action in script["actions"]:
        action.pop("order", None)
    story["momentInteractionScripts"].append(script)
interaction_script_ids = unique_ids(story["momentInteractionScripts"], "id", "朋友圈互动剧情")
interaction_comment_rows = [action for script in story["momentInteractionScripts"] for action in script["actions"] if action["type"] == "comment"]
interaction_comment_ids = unique_ids(interaction_comment_rows, "commentId", "朋友圈互动剧情生成的评论") if interaction_comment_rows else set()

like_keys = set()
for row in rows("朋友圈点赞"):
    moment_id = as_text(row.get("momentId", ""))
    contact_id = as_text(row.get("contactId", ""))
    if moment_id not in wechat_moment_ids or (contact_id != WECHAT_SELF_ID and contact_id not in wechat_contact_ids):
        raise ValueError(f"朋友圈点赞：朋友圈 {moment_id!r} 或联系人 {contact_id!r} 不存在。")
    key = (moment_id, contact_id)
    if key in like_keys:
        raise ValueError(f"朋友圈点赞：{moment_id!r} 中联系人 {contact_id!r} 重复点赞。")
    like_keys.add(key)
    wechat["momentLikes"].append({"momentId": moment_id, "contactId": contact_id, "order": as_number(row.get("order", 0))})

for row in rows("朋友圈评论"):
    moment_id = as_text(row.get("momentId", ""))
    author_id = as_text(row.get("authorId", ""))
    reply_to_comment_id = as_text(row.get("replyToCommentId", ""))
    if moment_id not in wechat_moment_ids:
        raise ValueError(f"朋友圈评论：朋友圈 ID {moment_id!r} 不存在。")
    if author_id != WECHAT_SELF_ID and author_id not in wechat_contact_ids:
        raise ValueError(f"朋友圈评论 {moment_id!r}：评论人不在“微信联系人”中，也不是 SELF。")
    comment_text = as_text(row.get("text", ""))
    image_src = as_text(row.get("imageSrc", ""))
    if not comment_text and not image_src:
        raise ValueError(f"朋友圈评论 {moment_id!r}：评论文字和图片至少填写一项。")
    wechat["momentComments"].append({
        "id": as_text(row.get("id", "")),
        "momentId": moment_id,
        "authorId": author_id,
        "replyToCommentId": reply_to_comment_id,
        "text": comment_text,
        "imageSrc": image_src,
        "order": as_number(row.get("order", 0)),
    })
initial_comment_ids = unique_ids(wechat["momentComments"], "id", "朋友圈评论")
all_comment_ids = initial_comment_ids | player_comment_ids | interaction_comment_ids
if len(all_comment_ids) != len(initial_comment_ids) + len(player_comment_ids) + len(interaction_comment_ids):
    raise ValueError("朋友圈评论：初始评论、玩家评论剧情和互动剧情生成的评论 ID 不能重复。")
for comment in wechat["momentComments"]:
    reply_id = comment.get("replyToCommentId")
    if reply_id and reply_id not in all_comment_ids:
        raise ValueError(f"朋友圈评论 {comment['id']!r}：回复的评论 ID {reply_id!r} 不存在。")
for script in story["momentCommentScripts"]:
    reply_id = script.get("replyToCommentId")
    if reply_id and reply_id not in all_comment_ids:
        raise ValueError(f"朋友圈玩家评论剧情 {script['id']!r}：回复的评论 ID {reply_id!r} 不存在。")
for action in interaction_comment_rows:
    reply_id = action.get("replyToCommentId")
    if reply_id and reply_id not in all_comment_ids:
        raise ValueError(f"朋友圈互动剧情评论 {action['commentId']!r}：回复的评论 ID {reply_id!r} 不存在。")
content["wechat"] = wechat

story.pop("conversationScripts", None)
story.pop("calls", None)
story["smsScripts"] = []
sms_scripts = {}
sms_sequences = {}
for row in rows("短信剧情"):
    script_id = as_text(row["smsScriptId"])
    contact_id = as_text(row["contactId"])
    sequence = as_number(row["sequence"])
    side = SIDE_ALIASES.get(as_text(row["side"]), as_text(row["side"]))
    if side not in {"me", "them"}:
        raise ValueError(f"短信剧情 {script_id!r}：发送方必须选择“我”或“对方”。")
    script = sms_scripts.setdefault(script_id, {"id": script_id, "contactId": contact_id, "messages": []})
    if script["contactId"] != contact_id:
        raise ValueError(f"短信剧情 {script_id!r}：同一剧情 ID 的联系人 ID 必须保持一致。")
    sequence_key = (script_id, sequence)
    if sequence_key in sms_sequences:
        raise ValueError(f"短信剧情 {script_id!r}：消息序号 {sequence!r} 重复。")
    sms_sequences[sequence_key] = True
    message = {
        "order": sequence,
        "side": side,
        "text": as_text(row["text"]),
    }
    if side == "me":
        message["keystrokes"] = as_text(row.get("keystrokes", ""))
    else:
        message["afterMs"] = seconds_to_ms(row.get("afterMs", ""), 1.2)
    script["messages"].append(message)
for script in sms_scripts.values():
    script["messages"].sort(key=lambda item: item["order"])
    for message in script["messages"]:
        message.pop("order", None)
    story["smsScripts"].append(script)
sms_script_ids = unique_ids(story["smsScripts"], "id", "短信剧情")
for script in story["smsScripts"]:
    if script["contactId"] not in contact_ids:
        raise ValueError(f"短信剧情 {script['id']!r}：联系人 ID {script['contactId']!r} 在“联系人”中不存在。")

story["wechatScripts"] = []
wechat_scripts = {}
wechat_script_sequences = set()
for row in rows("微信剧情"):
    script_id = as_text(row.get("wechatScriptId", ""))
    conversation_id = as_text(row.get("conversationId", ""))
    if conversation_id not in wechat_conversation_ids:
        raise ValueError(f"微信剧情 {script_id!r}：会话 ID {conversation_id!r} 不存在。")
    sequence = as_number(row.get("sequence", 0))
    key = (script_id, sequence)
    if key in wechat_script_sequences:
        raise ValueError(f"微信剧情 {script_id!r}：消息序号 {sequence!r} 重复。")
    wechat_script_sequences.add(key)
    script = wechat_scripts.setdefault(script_id, {"id": script_id, "conversationId": conversation_id, "messages": []})
    if script["conversationId"] != conversation_id:
        raise ValueError(f"微信剧情 {script_id!r}：同一剧情 ID 的会话 ID 必须保持一致。")
    sender_id = as_text(row.get("senderId", ""))
    if sender_id != WECHAT_SELF_ID and sender_id not in wechat_contact_ids:
        raise ValueError(f"微信剧情 {script_id!r}：发送人 {sender_id!r} 不存在。")
    conversation = wechat_conversation_map[conversation_id]
    if conversation["type"] == "direct" and sender_id not in {WECHAT_SELF_ID, conversation["targetId"]}:
        raise ValueError(f"微信剧情 {script_id!r}：单聊发送人只能是 SELF 或会话联系人。")
    if conversation["type"] == "group" and sender_id not in wechat_group_map[conversation["targetId"]]["memberIds"]:
        raise ValueError(f"微信剧情 {script_id!r}：发送人 {sender_id!r} 不是群成员。")
    message_type = WECHAT_MESSAGE_TYPE_ALIASES.get(as_text(row.get("type", "")), as_text(row.get("type", "")))
    if message_type not in {"text", "image", "sticker"}:
        raise ValueError(f"微信剧情 {script_id!r}：消息类型无效。")
    text = as_text(row.get("text", ""))
    media_src = as_text(row.get("mediaSrc", ""))
    if message_type == "text" and not text:
        raise ValueError(f"微信剧情 {script_id!r}：文字消息不能为空。")
    if message_type in {"image", "sticker"} and not media_src:
        raise ValueError(f"微信剧情 {script_id!r}：图片或表情消息必须填写素材路径。")
    message = {"order": sequence, "senderId": sender_id, "type": message_type, "text": text, "mediaSrc": media_src}
    if sender_id == WECHAT_SELF_ID:
        message["keystrokes"] = as_text(row.get("keystrokes", ""))
    else:
        message["afterMs"] = seconds_to_ms(row.get("afterMs", ""), 1.2)
    script["messages"].append(message)
for script in wechat_scripts.values():
    script["messages"].sort(key=lambda item: item["order"])
    for message in script["messages"]:
        message.pop("order", None)
    story["wechatScripts"].append(script)
wechat_script_ids = unique_ids(story["wechatScripts"], "id", "微信剧情")

story["phoneDialogues"] = []
for row in rows("电话剧情"):
    dialogue_id = as_text(row["dialogueId"])
    direction = DIALOGUE_DIRECTION_ALIASES.get(as_text(row["direction"]), as_text(row["direction"]))
    if not dialogue_id:
        raise ValueError("电话剧情：对白 ID 不能为空。")
    if direction not in {"incoming", "outgoing", "any"}:
        raise ValueError(f"电话剧情 {dialogue_id!r}：对白方向必须选择“来电”“主动拨打”或“通用”。")
    story["phoneDialogues"].append({
        "id": dialogue_id,
        "contactId": as_text(row["contactId"]),
        "direction": direction,
        "hangupAfterMs": seconds_to_ms(row.get("hangupAfterMs", ""), 3),
        "conversation": [],
    })
dialogue_ids = unique_ids(story["phoneDialogues"], "id", "电话剧情")
dialogues = {dialogue["id"]: dialogue for dialogue in story["phoneDialogues"]}
dialogue_sequences = set()
for row in rows("电话剧情内容"):
    dialogue_id = as_text(row["dialogueId"])
    if dialogue_id not in dialogues:
        raise ValueError(f"电话剧情内容：对白 ID {dialogue_id!r} 在“电话剧情”中不存在。")
    sequence = as_number(row["sequence"])
    sequence_key = (dialogue_id, sequence)
    if sequence_key in dialogue_sequences:
        raise ValueError(f"电话剧情内容 {dialogue_id!r}：对白序号 {sequence!r} 重复。")
    dialogue_sequences.add(sequence_key)
    side = SIDE_ALIASES.get(as_text(row["side"]), as_text(row["side"]))
    if side not in {"me", "them"}:
        raise ValueError(f"电话剧情内容 {dialogue_id!r}：说话方必须选择“我”或“对方”。")
    dialogues[dialogue_id]["conversation"].append({
        "order": as_number(row["sequence"]),
        "side": side,
        "text": as_text(row["text"]),
        "afterMs": seconds_to_ms(row["afterMs"], 1.2),
    })
for dialogue in story["phoneDialogues"]:
    if dialogue["contactId"] not in contact_ids:
        raise ValueError(f"电话剧情 {dialogue['id']!r}：联系人 ID {dialogue['contactId']!r} 在“联系人”中不存在。")
    if not dialogue["conversation"]:
        raise ValueError(f"电话剧情 {dialogue['id']!r}：必须在“电话剧情内容”中至少填写一句对白。")
    dialogue["conversation"].sort(key=lambda item: item["order"])
    for line in dialogue["conversation"]:
        line.pop("order", None)

story["outgoingCallRules"] = []
if "主动通话规则" in workbook.sheetnames:
    for row in rows("主动通话规则"):
        story["outgoingCallRules"].append({
            "contactId": as_text(row["contactId"]),
            "order": as_number(row["order"]),
            "eventId": as_text(row.get("eventId", "")),
            "eventState": DIAL_EVENT_STATE_ALIASES.get(as_text(row.get("eventState", "")), as_text(row.get("eventState", ""))),
            "minDialCount": as_number(row.get("minDialCount", ""), 0),
            "maxDialCount": as_number(row.get("maxDialCount", ""), 0),
            "answer": as_bool(row["answer"]),
            "dialogueId": as_text(row.get("dialogueId", "")),
            "ringMs": seconds_to_ms(row.get("ringMs", ""), 6.5),
            "connectAfterMs": seconds_to_ms(row.get("connectAfterMs", ""), 1.2),
        })
story["outgoingCallRules"].sort(key=lambda item: (item["contactId"], item["order"]))

branch_rows = rows("剧情分支") if "剧情分支" in workbook.sheetnames else []
unique_ids(branch_rows, "id", "剧情分支")
branches = {row["id"]: row for row in branch_rows}
story["events"] = []
for row in rows("剧情事件"):
    event_id = as_text(row["id"])
    branch = branches.get(event_id, {})
    trigger_type = TRIGGER_ALIASES.get(str(row["triggerType"]).strip(), str(row["triggerType"]).strip())
    trigger = {"type": trigger_type}
    if row["afterMs"] != "":
        trigger["afterMs"] = seconds_to_ms(row["afterMs"])
    trigger_action = TRIGGER_ACTION_ALIASES.get(str(row["triggerAction"]).strip(), str(row["triggerAction"]).strip())
    if trigger_action:
        trigger["action"] = trigger_action
    if row.get("triggerAppId"):
        trigger["appId"] = as_text(row["triggerAppId"])
    if row.get("targetId"):
        trigger["targetId"] = as_text(row["targetId"])

    action_type = ACTION_ALIASES.get(str(row["actionType"]).strip(), str(row["actionType"]).strip())
    action = {"type": action_type}
    if action_type not in {"call", "sms-script", "wechat-script", "moment-publish", "moment-comment", "moment-interactions", "none"}:
        raise ValueError(f"剧情事件 {event_id!r}：发生内容必须选择有效的短信、微信、朋友圈、电话或衔接动作。")
    for key in ["smsScriptId", "wechatScriptId", "publishScriptId", "commentScriptId", "interactionScriptId", "dialogueId"]:
        if row.get(key):
            action[key] = as_text(row[key])
    if row["timeoutMs"] != "":
        action["timeoutMs"] = seconds_to_ms(row["timeoutMs"])

    retry_enabled = as_bool(branch.get("retryEnabled", False))
    retry_outcomes = as_retry_outcomes(branch.get("retryOutcomes", ""), event_id) if retry_enabled else []
    story["events"].append({
        "id": event_id,
        "initialActive": as_bool(row.get("initialActive", False)),
        "trigger": trigger,
        "action": action,
        "nextByOutcome": {
            "completed": as_text(branch.get("completedNext", "")),
            "accepted": branch.get("acceptedNext", "") or "",
            "rejected": branch.get("rejectedNext", "") or "",
            "missed": branch.get("missedNext", "") or "",
        },
        "retry": {
            "enabled": retry_enabled,
            "afterMs": seconds_to_ms(branch.get("retryAfterMs", ""), 30),
            "outcomes": retry_outcomes,
        },
    })

event_ids = unique_ids(story["events"], "id", "剧情事件")
for rule in story["outgoingCallRules"]:
    contact_id = rule.get("contactId")
    if contact_id not in contact_ids:
        raise ValueError(f"主动通话规则：联系人 ID {contact_id!r} 不存在。")
    event_state = rule.get("eventState", "any")
    if event_state not in {"any", "triggered", "not-triggered"}:
        raise ValueError(f"主动通话规则 {contact_id!r}：剧情事件状态必须是“任意”“已触发”或“未触发”。")
    event_id = rule.get("eventId")
    if event_id and event_id not in event_ids:
        raise ValueError(f"主动通话规则 {contact_id!r}：条件剧情事件 ID {event_id!r} 不存在。")
    dialogue_id = rule.get("dialogueId")
    if rule.get("answer") and not dialogue_id:
        raise ValueError(f"主动通话规则 {contact_id!r}：对方接听时必须填写电话对白 ID。")
    if dialogue_id and dialogue_id not in dialogues:
        raise ValueError(f"主动通话规则 {contact_id!r}：电话对白 ID {dialogue_id!r} 不存在。")
    if dialogue_id and dialogues[dialogue_id]["contactId"] != contact_id:
        raise ValueError(f"主动通话规则 {contact_id!r}：对白 {dialogue_id!r} 不属于该联系人。")
    if dialogue_id and dialogues[dialogue_id]["direction"] not in {"outgoing", "any"}:
        raise ValueError(f"主动通话规则 {contact_id!r}：对白 {dialogue_id!r} 不是“主动拨打”或“通用”方向。")
for event in story["events"]:
    if event["action"].get("type") == "call":
        dialogue_id = event["action"].get("dialogueId")
        if not dialogue_id:
            raise ValueError(f"剧情事件 {event['id']!r}：发生内容为“收到电话”时必须填写电话对白 ID。")
        if dialogue_id not in dialogues:
            raise ValueError(f"剧情事件 {event['id']!r}：电话对白 ID {dialogue_id!r} 不存在。")
        if dialogues[dialogue_id]["direction"] not in {"incoming", "any"}:
            raise ValueError(f"剧情事件 {event['id']!r}：对白 {dialogue_id!r} 不是“来电”或“通用”方向。")
    sms_script_id = event["action"].get("smsScriptId")
    if event["action"].get("type") == "sms-script" and not sms_script_id:
        raise ValueError(f"剧情事件 {event['id']!r}：发生内容为“执行短信剧情”时必须填写短信剧情 ID。")
    if sms_script_id and sms_script_id not in sms_script_ids:
        raise ValueError(f"剧情事件 {event['id']!r}：短信剧情 ID {sms_script_id!r} 不存在。")
    wechat_script_id = event["action"].get("wechatScriptId")
    if event["action"].get("type") == "wechat-script" and not wechat_script_id:
        raise ValueError(f"剧情事件 {event['id']!r}：发生内容为“执行微信剧情”时必须填写微信剧情 ID。")
    if wechat_script_id and wechat_script_id not in wechat_script_ids:
        raise ValueError(f"剧情事件 {event['id']!r}：微信剧情 ID {wechat_script_id!r} 不存在。")
    publish_script_id = event["action"].get("publishScriptId")
    if event["action"].get("type") == "moment-publish" and not publish_script_id:
        raise ValueError(f"剧情事件 {event['id']!r}：执行朋友圈发布剧情时必须填写发布剧情 ID。")
    if publish_script_id and publish_script_id not in publish_script_ids:
        raise ValueError(f"剧情事件 {event['id']!r}：朋友圈发布剧情 ID {publish_script_id!r} 不存在。")
    comment_script_id = event["action"].get("commentScriptId")
    if event["action"].get("type") == "moment-comment" and not comment_script_id:
        raise ValueError(f"剧情事件 {event['id']!r}：执行朋友圈玩家评论剧情时必须填写玩家评论剧情 ID。")
    if comment_script_id and comment_script_id not in comment_script_ids:
        raise ValueError(f"剧情事件 {event['id']!r}：朋友圈玩家评论剧情 ID {comment_script_id!r} 不存在。")
    interaction_script_id = event["action"].get("interactionScriptId")
    if event["action"].get("type") == "moment-interactions" and not interaction_script_id:
        raise ValueError(f"剧情事件 {event['id']!r}：执行朋友圈互动剧情时必须填写互动剧情 ID。")
    if interaction_script_id and interaction_script_id not in interaction_script_ids:
        raise ValueError(f"剧情事件 {event['id']!r}：朋友圈互动剧情 ID {interaction_script_id!r} 不存在。")
    trigger_app_id = event["trigger"].get("appId")
    if trigger_app_id and trigger_app_id not in app_ids:
        raise ValueError(f"剧情事件 {event['id']!r}：操作应用 ID {trigger_app_id!r} 不存在。")
    trigger_target_id = event["trigger"].get("targetId")
    contact_actions = {"outgoing-call", "outgoing-call-accepted", "outgoing-call-missed", "incoming-call-accepted", "incoming-call-rejected", "incoming-call-missed", "call-ended"}
    if event["trigger"].get("action") in contact_actions and trigger_target_id and trigger_target_id not in contact_ids:
        raise ValueError(f"剧情事件 {event['id']!r}：触发对象 ID {trigger_target_id!r} 不是有效联系人 ID。")
    if event["trigger"].get("action") == "message-input" and trigger_target_id:
        trigger_app_id = event["trigger"].get("appId")
        valid_targets = wechat_conversation_ids if trigger_app_id == "wechat" else contact_ids
        if trigger_target_id not in valid_targets:
            raise ValueError(f"剧情事件 {event['id']!r}：触发对象 ID {trigger_target_id!r} 与对应聊天应用不匹配。")
    for next_id in event["nextByOutcome"].values():
        if next_id and next_id not in event_ids:
            raise ValueError(f"剧情事件 {event['id']!r}：后续事件 ID {next_id!r} 不存在。")

args.out_dir.mkdir(parents=True, exist_ok=True)
(args.out_dir / "content.json").write_text(json.dumps(content, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(args.out_dir / "story.json").write_text(json.dumps(story, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"已生成: {args.out_dir / 'content.json'}")
print(f"已生成: {args.out_dir / 'story.json'}")
