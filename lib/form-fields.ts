export const fieldGroups = [
  ['基本资料',[
    ['id','剧目编号 *','text','例如：2027-spring-title；只用小写字母、数字及短横线'],
    ['title','中文剧名 *','text','填写正式剧名'],['titleEn','英文剧名','text','可留空'],['season','演出季','text','例如：2027 春季制作'],['year','年份','text','2027'],['status','演出状态','text','即将上演 / 已落幕 / 档案整理中'],['tagline','一句话介绍','textarea','写一句属于这部剧的话']]],
  ['观演信息',[
    ['performances','演出场次','textarea','每行一场，例如：2027 年 4 月 23 日 · 19:00'],['venue','剧场名称','text','剧场全称'],['address','地点 / 地址','text','剧场地址'],['language','演出语言与字幕','text','普通话 · 英文字幕'],['duration','时长与中场','text','约 120 分钟 · 含一次中场休息'],['ticketUrl','购票链接','text','https://…；没有售票时留空']]],
  ['故事与创作',[
    ['synopsis','剧情简介','textarea','可用空行分段；如为改编作品，请注明来源'],['directorNote','导演的话','textarea','没有时留空，整节自动隐藏'],['thanks','特别鸣谢','textarea','合作单位、支持者等；没有时留空']]],
  ['台前幕后',[
    ['creative','主创团队','textarea','每行：职务 | 姓名，例如：导演 | 张三'],['cast','演员阵容','textarea','每行：角色 | 演员，例如：王利发 | 李四'],['crew','幕后制作','textarea','每行：职务 | 姓名，例如：灯光设计 | 王五']]],
  ['海报与留档',[
    ['poster','海报路径或网址','text','assets/poster.jpg 或 https://…'],['posterAlt','海报图片说明','text','供使用屏幕阅读器的观众了解图片'],['playbillUrl','节目册路径或网址','text','assets/playbill.pdf 或 https://…'],['playbillLabel','节目册按钮文字','text','例如：查看完整节目册'],['photos','剧照','textarea','每行：图片路径或网址 | 图片说明；例如 assets/photo-1.jpg | 第一幕剧照'],['videos','影像链接','textarea','每行：视频网址 | 按钮名称'],['sources','资料来源','textarea','每行：来源网址 | 文章标题'],['updatedAt','档案更新日期','date','']]]
] as const;
