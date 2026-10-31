'use client';
import { useLanguage } from '@/components/language-provider';
import { useState } from 'react';
import archive from '@/data/boards.json';

export default function BoardArchive(){
  const {t,language}=useLanguage();
  const [term,setTerm]=useState(archive.boards[0].id);
  const board=archive.boards.find(board=>board.id===term)!;
  return <div id="top" className="board-page wrap">
    <h1>{t("历届 Board")}</h1>
    <div className="board-layout"><nav className="board-years" aria-label={t("选择 Board 学年")}>{archive.boards.map(item=><button key={item.id} onClick={()=>setTerm(item.id)} aria-pressed={term===item.id} aria-controls="board-members">{item.term}</button>)}</nav>
      <section id="board-members" aria-labelledby="board-term"><h2 id="board-term">{board.term}</h2>
        <table className="board-table"><caption className="sr-only">{board.term} {t("历届 Board")}</caption><thead><tr><th scope="col">{t("姓名")}</th><th scope="col">{t("职务")}</th></tr></thead><tbody>{board.members.map((member,index)=><tr key={`${member.name}-${index}`}><th scope="row">{language==='zh'&&'nameZh' in member?member.nameZh:member.name}</th><td>{language==='zh'&&'roleZh' in member?member.roleZh:(t(member.role)||t("未注明"))}</td></tr>)}</tbody></table>
      </section>
    </div>
  </div>;
}
