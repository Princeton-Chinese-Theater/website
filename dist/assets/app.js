const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const url = value.trim();
  if (/^https?:\/\//i.test(url)) { try { return new URL(url).href; } catch { return ''; } }
  if (/^[a-z0-9_.-]+(?:\/[a-z0-9_.% -]+)*$/i.test(url) && !url.startsWith('..')) return url;
  return '';
}
const list = value => Array.isArray(value) ? value : [];
function link(url, label, classes = 'button') {
  const valid = safeUrl(url);
  return valid ? `<a class="${esc(classes)}" href="${esc(valid)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span></a>` : '';
}
function credits(items) {
  return `<div class="credit-list">${list(items).map(item => `<div class="credit-row"><span class="credit-role">${esc(item.role)}</span><span class="credit-name">${esc(item.name)}</span></div>`).join('')}</div>`;
}
function section(id, title, english, body) {
  return `<section id="${id}"><h2 class="section-title">${title}<small>${english}</small></h2>${body}</section>`;
}
function render(play, all) {
  document.title = `${play.title || '剧目档案'} · 普林斯顿中文剧社`;
  const sections = [];
  if (play.synopsis) sections.push(['story','剧情简介','The story',`<div class="prose">${esc(play.synopsis)}</div>`]);
  if (play.directorNote) sections.push(['note','导演的话',"Director’s note",`<div class="prose">${esc(play.directorNote)}</div>`]);
  const groups = [['主创团队',play.creative],['演员阵容',play.cast],['幕后制作',play.crew]].filter(([,items]) => list(items).length);
  if (groups.length) sections.push(['people','台前幕后','The company',groups.map(([title,items]) => `<h3 class="credit-heading">${title}</h3>${credits(items)}`).join('')]);
  const photos = list(play.photos).filter(photo => safeUrl(photo.url));
  if (photos.length) sections.push(['gallery','舞台瞬间','On stage',`<div class="gallery">${photos.map(photo => `<figure><img loading="lazy" src="${esc(safeUrl(photo.url))}" alt="${esc(photo.alt || photo.caption || play.title + '剧照')}">${photo.caption ? `<figcaption>${esc(photo.caption)}</figcaption>` : ''}</figure>`).join('')}</div>`]);
  const videos = list(play.videos).filter(video => safeUrl(video.url));
  sections.push(['archive','演出留档','The archive',`<div class="archive-panel"><div><div>一册节目，一场记忆。</div><p>${safeUrl(play.playbillUrl) ? '演职员、创作文字与演出资料，收录于本场节目册。' : '节目册尚未上传，后续补充后即可在这里查看。'}</p></div>${link(play.playbillUrl,play.playbillLabel || '打开节目册')}</div>${videos.length ? `<h3 class="credit-heading">影像记录</h3><div class="video-links">${videos.map(video=>link(video.url,video.label || '观看影像')).join('')}</div>` : ''}`]);
  if (play.thanks) sections.push(['thanks','特别鸣谢','With thanks',`<div class="prose">${esc(play.thanks)}</div>`]);
  const poster = safeUrl(play.poster);
  const sources = list(play.sources).filter(source=>safeUrl(source.url));
  document.querySelector('#app').innerHTML = `
    ${play.isExample ? '<div class="notice">模板预览 · 以下剧名、人员及场次均为示例。<a href="new-play.html">填写你的新剧 →</a></div>' : ''}
    ${all.length > 1 ? `<div class="wrap actions" aria-label="其他剧目">${all.map(item=>`<a class="button" href="?play=${encodeURIComponent(item.id)}">${esc(item.title)}</a>`).join('')}</div>` : ''}
    <div class="wrap"><div class="hero"><div><div class="eyebrow">THE PRODUCTION ARCHIVE / 剧目档案</div><div class="season">${esc(play.season || play.year || '演出档案')}</div><h1>${esc(play.title || '未命名剧目')}</h1>${play.titleEn ? `<p class="english-title">${esc(play.titleEn)}</p>` : ''}${play.tagline ? `<p class="tagline">${esc(play.tagline).replace(/\n/g,'<br>')}</p>` : ''}<div class="actions">${link(play.ticketUrl,'前往购票','button primary')}<a class="button${safeUrl(play.ticketUrl) ? '' : ' primary'}" href="#archive">${safeUrl(play.playbillUrl) ? '查看节目册' : '查看演出留档'} <span aria-hidden="true">↓</span></a>${groups.length ? '<a class="button" href="#people">认识剧组</a>' : ''}</div>${play.status ? `<p class="missing">${esc(play.status)}</p>` : ''}</div>
    <div class="poster-area"><div class="poster">${poster ? `<img src="${esc(poster)}" alt="${esc(play.posterAlt || play.title + '演出海报')}">` : `<div class="poster-art" role="img" aria-label="${esc(play.title)}的文字海报占位"><div class="poster-top"><span>PRINCETON<br>CHINESE THEATRE</span><span>${esc(play.year || 'PCT')}<br>ON STAGE</span></div><div class="poster-word">${esc(play.title || '一场好戏')}</div><div class="poster-bottom"><span>普林斯顿中文剧社</span><span>灯亮 · 开场</span></div></div>`}</div><p class="poster-caption">${poster ? '演出海报 / PRODUCTION POSTER' : '文字海报占位 · 可替换为正式海报'}</p></div></div>
    <div class="facts"><div><span class="fact-label">演出时间 / WHEN</span><div class="fact-value">${list(play.performances).length ? list(play.performances).map(esc).join('<br>') : '时间待公布'}</div></div><div><span class="fact-label">演出地点 / WHERE</span><div class="fact-value">${esc(play.venue || '地点待公布')}</div>${play.address ? `<span class="fact-detail">${esc(play.address)}</span>` : ''}</div><div><span class="fact-label">观演信息 / EXPERIENCE</span><div class="fact-value">${esc(play.language || '语言信息待补充')}</div>${play.duration ? `<span class="fact-detail">${esc(play.duration)}</span>` : ''}</div></div>
    <div class="body-layout"><nav class="section-nav" aria-label="本剧页面章节">${sections.map(([id,title],index)=>`<a href="#${id}"><span>${String(index+1).padStart(2,'0')}</span>${title}</a>`).join('')}</nav><div class="content">${sections.map(args=>section(...args)).join('')}${sources.length || play.updatedAt ? `<div class="archive-note">${play.updatedAt ? `<p>档案更新：${esc(play.updatedAt)}</p>` : ''}${sources.length ? `<p>资料来源：${sources.map(source=>link(source.url,source.label || '原始资料','')).join(' · ')}</p>` : ''}</div>` : ''}</div></div></div>`;
}
async function start() {
  try {
    const response = await fetch('data/productions.json');
    if (!response.ok) throw new Error('档案文件读取失败');
    const data = await response.json();
    const all = list(data.productions);
    const id = new URLSearchParams(location.search).get('play');
    let play;
    if (id === 'draft') {
      try { play = JSON.parse(localStorage.getItem('pct-production-draft')); } catch { throw new Error('无法读取本机草稿'); }
      if (!play) throw new Error('尚无草稿，请先填写新剧资料');
    } else play = id ? all.find(item=>item.id===id) : all[0];
    if (!play) throw new Error('没有找到这部剧的档案');
    render(play,all);
  } catch (error) {
    document.querySelector('#app').innerHTML = `<div class="error"><h1>档案暂时无法打开</h1><p>${esc(error.message)}</p><a href="new-play.html">填写或恢复新剧资料 →</a></div>`;
  }
}
start();
