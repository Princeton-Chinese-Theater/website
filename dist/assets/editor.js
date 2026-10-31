const fieldGroups = [
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
];
const form = document.querySelector('#production-form');
const status = document.querySelector('#form-status');
const fields = document.querySelector('#fields');
for (const [title,items] of fieldGroups) {
  const section = document.createElement('section'); section.className='form-section';
  const heading=document.createElement('h2'); heading.textContent=title;section.append(heading);
  const grid=document.createElement('div');grid.className='form-grid';section.append(grid);
  for (const [name,label,type,hint] of items) {
    const wrapper=document.createElement('label');wrapper.className='field'+(type==='textarea'?' wide':'');
    const labelNode=document.createElement('span');labelNode.textContent=label;wrapper.append(labelNode);
    const input=document.createElement(type==='textarea'?'textarea':'input');
    if(type!=='textarea')input.type=type;
    input.name=name;input.id=name;input.placeholder=hint;
    if(name==='id'||name==='title')input.required=true;
    if(name==='id'){input.pattern='(?!draft$)[a-z0-9]+(-[a-z0-9]+)*';input.maxLength=100;input.title='使用小写字母、数字及短横线，不能使用保留编号 draft';}
    wrapper.append(input);grid.append(wrapper);
  }
}
function lines(value){return value.split('\n').map(line=>line.trim()).filter(Boolean);}
function pairs(value,first,second){return lines(value).map(line=>{const index=line.indexOf('|');return index<0?{[first]:line,[second]:''}:{[first]:line.slice(0,index).trim(),[second]:line.slice(index+1).trim()};});}
function collect(){
  const play=Object.fromEntries(new FormData(form));play.isExample=false;
  play.performances=lines(play.performances);
  for(const key of ['creative','cast','crew'])play[key]=pairs(play[key],'role','name');
  play.photos=pairs(play.photos,'url','caption');
  for(const key of ['videos','sources'])play[key]=pairs(play[key],'url','label');
  return play;
}
function save(){
  if(!form.reportValidity())return null;
  const play=collect();
  try{localStorage.setItem('pct-production-draft',JSON.stringify(play));status.textContent='草稿已保存在当前浏览器';}
  catch{status.textContent='浏览器无法保存草稿；请使用下载按钮留存。';}
  return play;
}
form.addEventListener('submit',event=>{
  event.preventDefault();const play=save();if(!play)return;
  try{if(localStorage.getItem('pct-production-draft')!==JSON.stringify(play)){status.textContent='草稿未保存成功，无法预览；请先下载留存。';return;}}
  catch{status.textContent='当前浏览器不允许保存草稿，无法预览；请下载留存。';return;}
  location.href='index.html?play=draft';
});
document.querySelector('#download').addEventListener('click',()=>{
  const play=save();if(!play)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(play,null,2)+'\n'],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=play.id+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  status.textContent='已生成下载文件；将此剧目对象加入档案数据后即可上线。';
});
document.querySelector('#restore').addEventListener('click',()=>{
  try{
    const play=JSON.parse(localStorage.getItem('pct-production-draft'));if(!play){status.textContent='本机还没有草稿。';return;}
    for(const [,items]of fieldGroups)for(const [key]of items){
      let value=play[key]??'';
      if(Array.isArray(value))value=value.map(item=>typeof item==='string'?item:Object.hasOwn(item,'role')?`${item.role} | ${item.name}`:`${item.url} | ${item.caption??item.label??''}`).join('\n');
      form.elements.namedItem(key).value=value;
    }
    status.textContent='已恢复最近一次保存的本机草稿。';
  }catch{status.textContent='无法恢复草稿，请重新填写。';}
});
