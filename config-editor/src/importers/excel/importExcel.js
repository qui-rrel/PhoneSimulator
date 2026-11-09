import readExcelFile from 'read-excel-file/browser'
import baseContent from '../../../../phone-simulator/src/data/content.json'
import baseStory from '../../../../phone-simulator/src/data/story.json'
import { createProjectFromRuntime } from '../../project/projectFile.js'
import { convertWorkbook } from './convertWorkbook.js'
import { createWorkbookReader } from './workbookRows.js'

export async function importExcelProject(file) {
  if (!file?.name?.toLowerCase().endsWith('.xlsx')) throw new Error('请选择 .xlsx 格式的 PhoneSimulator 配置工作簿。')
  let sheets
  try {
    sheets = await readExcelFile(file)
  } catch (error) {
    throw new Error(`无法读取 Excel 文件：${error?.message || '文件可能已损坏或不是有效的 .xlsx 文件。'}`)
  }
  const reader = createWorkbookReader(sheets)
  for (const name of ['基础设置', '联系人', '短信记录', '微信账号', '剧情事件']) {
    if (!reader.has(name)) throw new Error(`Excel 缺少“${name}”工作表，无法完成导入。`)
  }
  const { content, story } = convertWorkbook(reader, { baseContent, baseStory })
  const name = file.name.replace(/\.xlsx$/i, '') || '导入的作品'
  const document = createProjectFromRuntime({ name, content, story, sourceFileName: file.name })
  return { document, summary: createImportSummary(file.name, content, story, reader.names()) }
}

export function createImportSummary(fileName, content, story, sheetNames = []) {
  return {
    fileName,
    sheetCount: sheetNames.length,
    contentCount: [
      ...(content.contacts || []), ...(content.gallery || []), ...(content.notes || []),
      ...(content.mail || []), ...(content.calendarEvents || []), ...(content.mapLocations || []),
      ...(content.wechat?.contacts || []), ...(content.wechat?.groups || []),
      ...(content.wechat?.conversations || []), ...(content.wechat?.moments || []),
    ].length,
    scriptCount: [
      ...(story.smsScripts || []), ...(story.wechatScripts || []), ...(story.phoneDialogues || []),
      ...(story.momentPublishScripts || []), ...(story.momentCommentScripts || []),
      ...(story.momentInteractionScripts || []),
    ].length,
    eventCount: (story.events || []).length,
  }
}
