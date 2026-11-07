const STORE_KEY='memo-vocab-quiz-v1';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').trim().toLowerCase();
const rand=(a)=>{const out=[...a];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out};
const wordsOf=b=>b.chapters.flatMap(c=>c.words);
const allBooks=()=>[...BASE_BOOKS.map(b=>({...b,chapters:[...b.chapters,...(store.extraChapters[b.id]||[])]})),...store.customBooks];
const allWords=()=>allBooks().flatMap(wordsOf);
const findBook=id=>allBooks().find(b=>b.id===id);
const findChapter=(b,id)=>b?.chapters.find(c=>c.id===id);
function getStored(){try{const s=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');return {customBooks:Array.isArray(s.customBooks)?s.customBooks:[],extraChapters:s.extraChapters&&typeof s.extraChapters==='object'?s.extraChapters:{},mastered:s.mastered&&typeof s.mastered==='object'?s.mastered:{},stats:s.stats&&typeof s.stats==='object'?s.stats:{}}}catch{return {customBooks:[],extraChapters:{},mastered:{},stats:{}}}}
let store=getStored(),app={view:'home',bookId:null,chapterId:null,quiz:null,filterBook:'all',filterChapter:'all',filterStatus:'all',importPreview:null,ocrText:'',revealed:{}};
let theme=localStorage.getItem('vocab-theme')||'dark';document.body.classList.toggle('light',theme==='light');
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(store));return true}catch(e){alert('저장 공간이 부족하거나 브라우저의 저장이 차단되었습니다. 백업을 내보내고 일반 Safari에서 사용해 주세요.');return false}}
const masterKey=w=>'word:'+norm(w.en);
const isMastered=w=>!!(store.mastered[masterKey(w)]||store.mastered[w.id]);
function toggleMastered(w){if(!w)return;const key=masterKey(w),all=allWords().filter(x=>norm(x.en)===norm(w.en));if(isMastered(w)){delete store.mastered[key];all.forEach(x=>delete store.mastered[x.id])}else{store.mastered[key]=true}save()}
const bookStats=b=>{const ws=wordsOf(b);const m=ws.filter(isMastered).length;return {total:ws.length,done:m,active:ws.length-m}};
const chapterStats=c=>{const total=c.words.length,done=c.words.filter(isMastered).length;return {total,done,active:total-done}};
const rate=(a,b)=>b?Math.round(100*a/b):0;
const btn=(text,act,cl='')=>`<button type="button" class="btn ${cl}" data-action="${act}">${text}</button>`;
function nav(){const items=[['home','⌂','홈'],['book','▤','챕터'],['words','✓','단어 관리'],['import','＋','추가']];$('#nav').innerHTML=items.map(([v,ic,label])=>`<button data-action="nav-${v}" class="${(v==='book'&&app.view==='quiz')||app.view===v?'active':''}"><span>${ic}</span>${label}</button>`).join('')}
function render(){nav();let html='';try{if(app.view==='home')html=home();else if(app.view==='book')html=book();else if(app.view==='quiz')html=quiz();else if(app.view==='result')html=result();else if(app.view==='study')html=studyPage();else if(app.view==='words')html=wordsPage();else if(app.view==='import')html=importPage();else if(app.view==='settings')html=settings();else html=home();}catch(e){console.error(e);html='<div class="notice">화면을 표시하는 도중 문제가 발생했습니다. 홈으로 돌아가 다시 실행해 주세요.</div>'+btn('홈으로','go-home','primary')}$('#content').innerHTML=html;}
function home(){const books=allBooks(),tot=books.reduce((a,b)=>a+bookStats(b).total,0),done=books.reduce((a,b)=>a+bookStats(b).done,0);return `<section class="hero"><div class="eyebrow">VOCABULARY PRACTICE</div><h1>하루 몇 분,<br>아는 단어는 넘기고.</h1><p>영어 단어를 보고 한국어 뜻 5개 중<br>정답을 고르는 간단한 암기 테스트</p><div class="mini-stats"><div><strong>${tot}개</strong><span>등록된 단어</span></div><div><strong>${done}개</strong><span>암기 완료</span></div><div><strong>${books.length}개</strong><span>단어장</span></div></div></section><div class="section-head"><h2>내 단어장</h2>${btn('+ 새 단어장','nav-import','smol')}</div>${books.map(b=>{const s=bookStats(b);return `<article class="card book-card"><div class="book-main" data-action="open-book" data-id="${esc(b.id)}"><div class="book-title">${esc(b.name)}</div><div class="meta">${esc(b.subtitle||'직접 추가한 단어장')} · ${b.chapters.length}챕터 · ${s.active}개 학습 가능</div><div class="bar"><i style="width:${rate(s.done,s.total)}%"></i></div><div class="meta">암기 완료 ${s.done}/${s.total}</div></div><button class="arrow" aria-label="단어장 열기" data-action="open-book" data-id="${esc(b.id)}">›</button></article>`}).join('')}<p class="footnote">암기 완료 표시, 정답 기록, 새로 추가한 단어장은 이 브라우저에 저장됩니다. 기기를 바꾸거나 브라우저 데이터를 지우기 전에는 설정에서 백업해 주세요.</p>`}
function book(){const b=findBook(app.bookId)||allBooks()[0];if(!b)return '<p>단어장이 없습니다.</p>';app.bookId=b.id;const st=bookStats(b);const removable=b.base?(store.extraChapters[b.id]||[]):b.chapters;return `${btn('‹ 단어장 목록','go-home','ghost smol')}<div style="height:13px"></div><h1 class="page-title">${esc(b.name)}</h1><p class="subline">${esc(b.subtitle||'직접 추가한 단어장')} · ${st.total}단어 · 암기 완료 ${st.done}개</p><div class="panel"><h3>학습 방식 선택</h3><p class="subline" style="margin-bottom:12px">문제 번호별로 풀거나 전체 단어를 한 번에 학습하세요.</p><div class="button-row">${btn('전체 단어 시험','quiz-all','primary')}${btn('단어장 보기','open-study','ghost')}</div><div class="bar"><i style="width:${rate(st.done,st.total)}%"></i></div><p class="meta">외우지 않은 단어 ${st.active}개</p></div><div class="section-head"><h2>문제 번호별 학습</h2><span class="tiny muted">${b.chapters.length}개 구간</span></div><div class="chapter-grid">${b.chapters.map((c,i)=>{const x=chapterStats(c);return `<button type="button" class="chapter" data-action="quiz-chapter" data-id="${esc(c.id)}"><b>${esc(c.name)}</b><div class="chapter-bottom"><span>${x.active}개 학습 가능</span><span>${x.done}/${x.total} 암기</span></div><div class="bar"><i style="width:${rate(x.done,x.total)}%"></i></div></button>`}).join('')}</div>${removable.length?btn('잘못 추가한 챕터 삭제','delete-imported-chapter','ghost smol'):''}<div class="button-row">${btn('단어 관리','book-words','ghost')}${btn('단어 추가','append-book','ghost')}</div>${!b.base?`<div class="button-row">${btn('단어장 이름 변경','rename-book','ghost')}${btn('단어장 삭제','delete-book','danger')}</div>`:''}`}

function studyPage(){const b=findBook(app.bookId);if(!b)return '';const ws=wordsOf(b);return `${btn('‹ 모의고사로','back-book','ghost smol')}<h1 class="page-title" style="margin-top:14px">${esc(b.name)}</h1><p class="subline">영어 단어를 눌러 뜻 확인 · 외운 단어는 제외하거나 복구</p><div class="utility-bar">${btn('뜻 모두 가리기','hide-all','ghost smol')}${btn('5지선다 시작','quiz-all','primary smol')}</div><div class="panel study-card">${ws.map(w=>{const open=!!app.revealed[w.id];return `<div class="word-row"><div class="word-text"><button class="word-reveal" data-action="reveal-word" data-id="${esc(w.id)}"><strong>${esc(w.en)}</strong><span class="${open?'shown-meaning':'hidden-meaning'}">${open?esc(w.ko):'뜻 보기 · 눌러서 확인'}</span></button></div><button class="btn smol ${isMastered(w)?'ghost':''}" data-action="study-master" data-id="${esc(w.id)}">${isMastered(w)?'↩ 복구':'✓ 외웠어요'}</button></div>`}).join('')}</div>`}

const VERBS=`propose|prevent ~ from -ing|detect|ring out|freeze|lift|dare to do|affirm|become accustomed to|be used to -ing|arrange|carve out|reflect|repay|pay back|be worth|factor in|call upon ~ to do|address|promote|drive|be capable of -ing|function as|interact with|gather|justify|tend to do|illustrate|purchase|advertise|exceed|remain|explore|develop|be inspired to do|focus on|improve|set a record|descend|found|include|display|reschedule|fail to do|reproduce|occur|think of ~ as ...|clear|confirm|differ|manipulate|look away|force a smile|be inclined to do|lay down|inspect|be outcompeted by|weaken|unite|diminish|overlap|turn to|put pressure on|mediate|politicize|popularize|convert into|refer to|adapt|reorganize|highlight|alter|go viral|take place|give rise to|put it|bump up against|buffer|contribute to|embrace|uncover|engage in|regulate|transform|go through|ensure|utilize|cool down|draw from|emphasize|preserve|take ~ at face value|examine|evolve|transmit|be responsible for|analyze|become dependent on|arise|imply|perceive ~ as ...|manifest|appreciate|regard ~ as ...|take over|replace|followed by|take a deep breath|know ~ by heart|be no exception|flow`.split('|');
const ADJS=`external|unauthorized|awful|shaky|suitable|fertile|unknowable|worthwhile|ethical|sustainable|unusual|sensory|detailed|chemical|marine|consistent|worthy|self-serving|particular|inclusive|ancient|flawed|deep-sea|underwater|fellow|available|annual|various|traditional|agricultural|pre-modern|wasteful|typical|close to|nonverbal|pronounced|conflicting|verbal|accompanying|spoken|grumpy|overwhelming|packed|hopeless|deliberate|costly|central|affordable|harmonious|judicial|virtual|democratic|immune to|ongoing|flexible|evolving|fixed|cognitive|emotional|passive|active|rigid|financial|countless|massive|potential|vulnerable|enormous|deadly|bacterial|chronic|effective|existing|realistic|subsequent|representative|adverse|overpowering|intense|one size fits all|industrial|dependent on|substantial|legal|enslaved|rapid|auditory|specialized|acoustic|distinct|crucial|hazardous|profound|natural|objective|opening|meaningful`.split('|');
const ADVS=`in response to|on behalf of|by definition|to put it another way|in practical terms|in the presence of|without hesitation|over and over|spontaneously|gradually|actively|increasingly|roughly|entirely|locally|effectively|oddly|somehow|demographically|just about|extremely|fairly|verbally|precisely|arguably|consciously|mainly|autonomously|instantly|sequentially|simultaneously|objectively|incredibly|particularly|alternatively|in the long run|crucially|enormously|merely|in parallel|adequately|throughout|for all|at one's own pace|at their root|at the core of`.split('|');
const VERB_SET=new Set(VERBS.map(norm)), ADJ_SET=new Set(ADJS.map(norm)), ADV_SET=new Set(ADVS.map(norm));
function pos(w){if(w.pos&&['v','a','d','n','p'].includes(w.pos))return w.pos;const en=norm(w.en),ko=w.ko.trim();if(VERB_SET.has(en))return 'v';if(ADJ_SET.has(en))return 'a';if(ADV_SET.has(en))return 'd';if(/ly$/.test(en)&&!/(costly|friendly|lovely)/.test(en))return 'd';if(/(?:하다|되다|시키다|이다|받다|짓다|않다|있다|없다|가다|나다|다루다|맡다|보다)$/.test(ko))return 'v';if(/(?:적인|하는|로운|싶은|있는|없는|적절한|빠른|늦은|전근대의|외부의|고대의|~할 만한|의)$/.test(ko))return 'a';if(/(?:적으로|하게|히|로|없이)$/.test(ko))return 'd';return 'n'}
function makeChoices(w){const universe=allWords();const unique=(a)=>{const seen=new Set([norm(w.ko)]);return a.filter(x=>{const key=norm(x.ko);if(!key||seen.has(key)||x.id===w.id)return false;seen.add(key);return true})};const cls=pos(w);let picks=unique(rand(universe.filter(x=>pos(x)===cls))).slice(0,4);if(picks.length<4)picks=picks.concat(unique(rand(universe.filter(x=>pos(x)!==cls))).filter(x=>!picks.some(z=>norm(z.ko)===norm(x.ko))).slice(0,4-picks.length));return rand([w,...picks]).slice(0,5)}
function startQuiz(chId){const b=findBook(app.bookId);if(!b)return;const c=chId?findChapter(b,chId):null;const ws=(c?c.words:wordsOf(b)).filter(x=>!isMastered(x));app.chapterId=chId||null;app.quiz={items:rand(ws),index:0,selected:null,choices:null,answers:{},right:0,wrong:0,misses:[],startedAt:Date.now()};app.view=ws.length?'quiz':'result';render()}
function getQuizEntry(q){const w=q.items[q.index];if(!w)return null;if(!q.answers)q.answers={};if(!q.answers[w.id])q.answers[w.id]={selected:null,choices:makeChoices(w)};return q.answers[w.id]}
function quiz(){const q=app.quiz;if(!q)return '<p>시험이 준비되지 않았습니다.</p>';if(q.index>=q.items.length)return result();const w=q.items[q.index],entry=getQuizEntry(q),answered=entry.selected!==null,good=answered&&entry.choices[entry.selected].id===w.id;const label=app.chapterId?findChapter(findBook(app.bookId),app.chapterId)?.name:'전체 단어';return `<div class="quiz-top"><button class="back" style="margin:0" data-action="exit-quiz">‹ 시험 종료</button><span class="q-count">${esc(label||'')} · ${q.index+1} / ${q.items.length}</span></div><div class="bar" style="margin:0 0 15px;height:7px"><i style="width:${rate(q.index+1,q.items.length)}%"></i></div><div class="q-word"><small>이 영어 단어의 뜻은?</small><h1>${esc(w.en)}</h1></div>${!answered?`<div class="helper">알맞은 한국어 뜻을 하나 고르세요.</div><div class="choices">${entry.choices.map((c,i)=>`<button type="button" class="choice" data-action="answer" data-index="${i}"><em>${i+1}</em><span>${esc(c.ko)}</span></button>`).join('')}</div>`:`<div class="quiz-answer ${good?'good':'bad'}" role="status" aria-live="polite"><div class="judge">${good?'✓ 정답이에요!':'✕ 틀렸어요!'}</div><div class="meaning-label">${good?'단어 뜻':'올바른 뜻'}</div><strong>${esc(w.ko)}</strong></div>`}<div class="quiz-actions"><button class="btn ghost full" type="button" data-action="mark-quiz">✓ 외웠어요 · 시험에서 제외</button><div class="quiz-pager"><button type="button" class="btn ghost" data-action="prev-question" ${q.index===0?'disabled':''}>← 이전 문제</button><span class="quiz-position">${q.index+1} / ${q.items.length}</span><button type="button" class="btn primary" data-action="next-question">${q.index===q.items.length-1?'결과 보기 →':'다음 문제 →'}</button></div></div>`}
function answer(index){const q=app.quiz;if(!q)return;const entry=getQuizEntry(q);if(entry.selected!==null||index<0||index>=entry.choices.length)return;entry.selected=index;const w=q.items[q.index],good=entry.choices[index].id===w.id;good?q.right++:q.wrong++;if(!good)q.misses.push(w.id);const stat=store.stats[w.id]||{seen:0,correct:0};stat.seen++;if(good)stat.correct++;store.stats[w.id]=stat;save();render()}
function changeQuestion(delta){const q=app.quiz;if(!q)return;if(delta<0&&q.index===0)return;q.index+=delta;if(q.index>=q.items.length){app.view='result'}else{app.view='quiz'}render()}
function next(){changeQuestion(1)}
function prev(){changeQuestion(-1)}
function markQuiz(){const q=app.quiz;if(!q||q.index>=q.items.length)return;const w=q.items[q.index];store.mastered[masterKey(w)]=true;save();q.items.splice(q.index,1);if(q.index>=q.items.length&&q.items.length)q.index=q.items.length-1;if(!q.items.length)app.view='result';render()}
function result(){const q=app.quiz||{right:0,wrong:0,items:[],misses:[]};const attempted=q.right+q.wrong;const percent=rate(q.right,attempted);return `<div style="height:19px"></div><div class="eyebrow" style="text-align:center">SESSION COMPLETE</div><h1 class="page-title" style="text-align:center;margin-top:13px">시험 완료</h1><p class="subline" style="text-align:center">${esc(findBook(app.bookId)?.name||'단어장')}</p><div class="panel"><div class="result-num">${attempted?percent+'%':'—'}<small>정답률</small></div><div class="row-between" style="padding:5px 10px 12px"><div><strong class="success">${q.right}</strong><div class="tiny muted">정답</div></div><div><strong style="color:var(--red)">${q.wrong}</strong><div class="tiny muted">오답</div></div><div><strong>${attempted}</strong><div class="tiny muted">푼 문제</div></div></div></div>${q.misses.length?`<div class="section-head"><h2>틀린 단어</h2></div><div class="panel">${[...new Set(q.misses)].map(id=>{const w=allWords().find(w=>w.id===id);return w?`<div class="word-row"><div class="word-text"><strong>${esc(w.en)}</strong><small>${esc(w.ko)}</small></div></div>`:''}).join('')}</div>`:''}<div class="button-row">${btn('다시 풀기','retry-quiz','primary')}${btn('챕터 목록','back-book','ghost')}</div>`}
function wordControls(){return `<div class="filters"><select id="filter-book" aria-label="단어장 선택"><option value="all">전체 단어장</option>${allBooks().map(b=>`<option value="${esc(b.id)}" ${app.filterBook===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select><select id="filter-status" aria-label="암기 상태"><option value="all" ${app.filterStatus==='all'?'selected':''}>전체 단어</option><option value="mastered" ${app.filterStatus==='mastered'?'selected':''}>암기 완료만</option><option value="active" ${app.filterStatus==='active'?'selected':''}>학습 중만</option></select></div><div class="field"><input id="search-word" class="input" type="search" placeholder="영어 또는 한국어 검색" value="${esc(app.wordQuery||'')}"></div>`}
function wordsPage(){const bsel=app.filterBook==='all'?allBooks():allBooks().filter(b=>b.id===app.filterBook);const ws=bsel.flatMap(b=>b.chapters.flatMap(c=>c.words.map(w=>({...w,chapterName:c.name})))) .filter(w=>app.filterStatus==='all'||(app.filterStatus==='mastered' ? isMastered(w):!isMastered(w))).filter(w=>!app.wordQuery||norm(w.en+' '+w.ko).includes(norm(app.wordQuery)));const done=allWords().filter(isMastered).length;return `<h1 class="page-title">단어 관리</h1><p class="subline">암기 완료한 단어를 시험에서 제외하거나 다시 복구할 수 있습니다. · ${done}개 완료</p>${wordControls()}<div id="word-list">${wordList(ws)}</div>`}
function wordList(ws){return `<div class="panel">${ws.length?ws.slice(0,500).map(w=>`<div class="word-row"><div class="word-text"><strong>${esc(w.en)}</strong><small>${esc(w.ko)} <span style="color:#77869e">· ${esc(w.chapterName||'')}</span></small></div><button class="btn smol ${isMastered(w)?'ghost':''}" data-action="toggle-mastered" data-id="${esc(w.id)}">${isMastered(w)?'↩ 복구':'✓ 외웠음'}</button></div>`).join(''):'<div style="text-align:center;color:var(--sub);padding:22px">조건에 맞는 단어가 없습니다.</div>'}</div>${ws.length>500?'<p class="footnote">최대 500개까지 표시됩니다. 검색으로 범위를 좁혀 주세요.</p>':''}`}
function refreshWordList(){const bsel=app.filterBook==='all'?allBooks():allBooks().filter(b=>b.id===app.filterBook);const ws=bsel.flatMap(b=>b.chapters.flatMap(c=>c.words.map(w=>({...w,chapterName:c.name})))) .filter(w=>app.filterStatus==='all'||(app.filterStatus==='mastered'?isMastered(w):!isMastered(w))).filter(w=>!app.wordQuery||norm(w.en+' '+w.ko).includes(norm(app.wordQuery)));const el=$('#word-list');if(el)el.innerHTML=wordList(ws)}
function importPage(){return `<h1 class="page-title">새 챕터 추가</h1><p class="subline">모의고사 이름을 지정하고 단어와 뜻을 입력하면 다음 시험에 저장됩니다.</p><div class="panel"><div class="field"><label for="book-select">단어장</label><select id="book-select"><option value="new" ${!app.importBookId||app.importBookId==='new'?'selected':''}>+ 새 단어장 만들기</option>${allBooks().map(b=>`<option value="${esc(b.id)}" ${app.importBookId===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select></div><div class="field" id="new-book-wrap"><label for="new-book-name">새 단어장 이름</label><input id="new-book-name" class="input" value="${esc(app.importName||'2026년 12월 모의고사')}" placeholder="예: 2026년 12월 모의고사"></div><div class="field"><label for="chapter-name">챕터 이름</label><input id="chapter-name" class="input" value="${esc(app.importChapter||'1번')}" placeholder="예: 1번 또는 DAY 01"></div><div class="field"><label for="import-raw">단어 · 한국어 뜻</label><textarea id="import-raw" placeholder="principal | 교장 선생님&#10;concern | 우려, 걱정&#10;security | 안전, 보안">${esc(app.ocrText||'')}</textarea><p class="hint">한 줄에 한 단어. 영어와 뜻 사이를 |, 탭, 또는 공백 2칸 이상으로 구분하세요. iPhone 사진 앱의 '텍스트 복사' 기능으로 붙여넣어도 됩니다.</p></div><div class="button-row">${btn('입력 내용 미리보기','preview-import','ghost')}${btn('챕터 저장','save-import','primary')}</div><div id="preview-output">${app.importPreview?previewOutput():''}</div></div><div class="panel"><h3>4과 단어(1) · 정확한 66개 불러오기</h3><p class="subline" style="margin:8px 0 12px">보내준 Essential Voca. 4과 단어(1) PDF는 표 인식을 거치지 않고 원본에서 확인한 66개 단어·뜻을 불러옵니다.</p>${btn('4과 단어 66개 불러오기','load-verified-vocab','primary')}</div><div class="section-head"><h2>파일에서 단어 불러오기</h2><span class="badge">PDF · Word · Excel · 사진 · Gemini AI</span></div><div class="panel"><p class="subline" style="margin:0 0 12px">PDF, JPG/PNG, DOCX, XLSX, CSV, TXT 파일을 AI로 분석합니다. 표의 열과 단어·뜻의 짝을 시각적으로 확인하고, 검토 후 저장할 수 있어요. 원본 파일이 AI 서비스로 전송됩니다.</p><input id="document-upload" class="input" type="file" accept=".pdf,application/pdf,.jpg,.jpeg,.png,image/*,.xlsx,.xls,.csv,.tsv,.txt,.docx" multiple><div class="field"><label for="ai-import-code">AI 인식 접근 코드</label><input id="ai-import-code" class="input" type="password" autocomplete="off" placeholder="사이트 관리자가 정한 코드"><p class="hint">요금 도용 방지를 위해 필요합니다. 코드와 API 키는 학습 기록에 저장되지 않습니다.</p></div><div class="button-row">${btn('AI로 단어 인식','run-file-import','primary')}</div><div id="file-import-status" class="notice" role="status" aria-live="polite" style="display:none;margin-bottom:0"></div><p class="footnote" style="margin:12px 0 0">시각 AI 인식은 인터넷과 Netlify 서버 설정이 필요하며 무료 티어 사용량 제한이 있으며 제공업체 정책에 따라 데이터가 사용될 수 있습니다. 민감한 정보가 포함된 파일은 올리지 마세요. AI도 틀릴 수 있으므로 미리보기를 확인한 뒤 저장하세요. 1회 1파일, 최대 5MB입니다.</p></div>`}
// Only recognize the exact vocabulary sheet from its distinctive header AND several content anchors.
// This also handles iPhone Live Text pasted as a single flattened four-column paragraph.
function matchesVerifiedSheet(raw){
 const t=String(raw||'').toLowerCase().replace(/\s+/g,' ');
 if(!/essential\s*voca/.test(t)||!/4\s*과\s*단어/.test(t))return false;
 const anchors=['sharpen','literacy','take a picture of','find out about','supernatural','credibility','printing press','trustworthiness','multiple-source','beg the question','publisher','evaluate','validity','hoax','verify'];
 return anchors.filter(w=>t.includes(w)).length>=9 && /연마하다/.test(t)&&/문해력/.test(t);
}
function verifiedLines(){return VERIFIED_PDF_PAIRS.map(w=>w.en+' | '+w.ko).join('\n')}
function loadVerifiedVocab(){
 const raw=$('#import-raw');if(!raw)return;
 if(raw.value.trim()&&!confirm('현재 입력을 검증된 4과 단어 66개로 바꿀까요?'))return;
 raw.value=verifiedLines();doPreview();
 const el=$('#file-import-status');if(el){el.style.display='block';el.textContent='검증된 66개 단어를 불러왔습니다. 내용을 확인하고 챕터 저장을 누르세요.'}
 raw.scrollIntoView({behavior:'smooth',block:'center'});
}
function parseLines(str){if(matchesVerifiedSheet(str))return {words:VERIFIED_PDF_PAIRS.map(w=>({...w})),bad:[]};const out=[],bad=[];for(const original of str.split(/\r?\n/)){let line=original.trim();if(!line||/^(?:no\.?|word|meaning|뜻|단어|[0-9]{4}년|\[고[0-9]+\]|어휘)/i.test(line))continue;line=line.replace(/^\(?\d{1,3}\)?[.)]?\s+/, '');let split=null;for(const pattern of [/\s*\|\s*/,/\t+/,/\s*[→=]\s*/,/\s{2,}/]){const m=line.match(pattern);if(m){split=[line.slice(0,m.index),line.slice(m.index+m[0].length)];break}}if(!split){const match=line.match(/^(.*?)\s+([가-힣][\s\S]*)$/);if(match)split=[match[1],match[2]]}if(!split){bad.push(original);continue}const en=split[0].trim().replace(/^[-*•]+\s*/,'').trim(),ko=split[1].trim();if(en.length>=1&&en.length<=95&&ko.length>=1&&ko.length<=250&&/[a-z]/i.test(en)&&/[가-힣]/.test(ko)&&!/^[0-9.,;]+$/.test(en)&&!/(?:[가-힣][^\n]{0,35}\s+[A-Za-z][A-Za-z -]{2,35}\s+(?:vt|vi|adj|adv|n)\.)/.test(ko))out.push({en,ko});else bad.push(original)}const used=new Set();const unique=out.filter(w=>{const k=norm(w.en);if(used.has(k))return false;used.add(k);return true});return {words:unique,bad}}
function previewOutput(){const d=app.importPreview;return `<div class="notice"><b>${d.words.length}개 단어 인식</b> · 인식하지 못한 줄 ${d.bad.length}개. 아래를 확인하고 저장하세요.${d.bad.length?`<details><summary>인식하지 못한 줄 보기</summary><pre style="white-space:pre-wrap;font-size:11px;overflow-wrap:anywhere">${esc(d.bad.slice(0,15).join('\n'))}</pre></details>`:''}</div><div class="preview">${d.words.slice(0,150).map(w=>`<div class="word-row"><div class="word-text"><strong>${esc(w.en)}</strong><small>${esc(w.ko)}</small></div></div>`).join('')}${d.words.length>150?'<div class="tiny muted">미리보기 150개까지 표시</div>':''}</div>`}
function doPreview(){app.ocrText=$('#import-raw')?.value||'';app.importPreview=parseLines(app.ocrText);app.importBookId=$('#book-select')?.value;app.importName=$('#new-book-name')?.value;app.importChapter=$('#chapter-name')?.value;const el=$('#preview-output');if(el)el.innerHTML=previewOutput()}
function doSaveImport(){const bookId=$('#book-select')?.value||'new',name=($('#new-book-name')?.value||'').trim(),chapter=($('#chapter-name')?.value||'').trim(),raw=$('#import-raw')?.value||'',parsed=parseLines(raw);if(bookId==='new'&&!name){alert('단어장 이름을 입력하세요.');return}if(!chapter){alert('챕터 이름을 입력하세요.');return}if(!parsed.words.length){alert('인식된 단어가 없습니다. 영어 | 한국어 뜻 형태로 입력해 주세요.');return}const corrupted=parsed.words.filter(w=>/(?:^|[\s,;])(?:[a-z][a-z'~-]{2,}(?:\s+[a-z][a-z'~-]{2,})?)\s+(?:vt|vi|a|n|adv|adj)\./i.test(w.ko)||/(?:^|\s)(?:vt|vi|adv|adj|n)\.\s*~?\s*[^가-힣]*[A-Za-z]{3,}\s+(?:vt|vi|n)\./i.test(w.ko));if(corrupted.length){alert('다른 영어 단어가 한국어 뜻에 섞여 있습니다. 저장을 중단했습니다.\n'+corrupted.slice(0,3).map(w=>w.en+' → '+w.ko).join('\n'));return}if(parsed.bad.length&&!confirm(`${parsed.words.length}개 단어가 인식되었습니다. 인식하지 못한 ${parsed.bad.length}개 줄이 있습니다. 인식된 단어만 저장할까요?`))return;const uniqueId=()=>`custom-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;let b=bookId==='new'?null:findBook(bookId);if(!b){b={id:uniqueId(),name,subtitle:'내가 만든 단어장',chapters:[],base:false};store.customBooks.push(b)}const destination=b.base?(store.extraChapters[b.id]||(store.extraChapters[b.id]=[])):b.chapters;const id=uniqueId();destination.push({id,name:chapter,words:parsed.words.map((w,i)=>({id:`${id}-${i}`,en:w.en,ko:w.ko}))});if(!save())return;app.ocrText='';app.importPreview=null;app.importBookId=null;app.importName='';app.importChapter='';app.bookId=b.id;app.view='book';alert(`${parsed.words.length}개 단어를 '${b.name} / ${chapter}'에 저장했습니다.`);render()}
// Source-verified import for this exact Essential Voca 4과 PDF.
const VERIFIED_PDF_SHA256="639f2fcdd33af90b3ae361e9126b61c7d4966bcf1874452535b3b7825e7786e0";
const VERIFIED_PDF_PAIRS=[{"en":"sharpen","ko":"vt. ~을연마하다"},{"en":"source","ko":"n. 출처"},{"en":"literacy","ko":"n. 문해력, 읽고쓰는능력"},{"en":"evaluate","ko":"vt. ~을평가하다"},{"en":"take a picture of ~","ko":"~의사진을찍다"},{"en":"vertical","ko":"a. 수직의"},{"en":"at the bottom of ~","ko":"~의아랫부분에"},{"en":"rely on ~","ko":"~에의존하다"},{"en":"find out about ~","ko":"~에관해알아내다"},{"en":"determine","ko":"vt. ~을판단하다"},{"en":"claim","ko":"vt. (사실)을주장하다; n. 주장"},{"en":"reliability","ko":"n. 신뢰성"},{"en":"proof","ko":"n. 증거"},{"en":"validity","ko":"n. 타당성"},{"en":"supernatural","ko":"a. 초자연적인"},{"en":"examine","ko":"vt. ~을조사하다"},{"en":"phenomena","ko":"n. 현상들"},{"en":"reference","ko":"n. 참고문헌"},{"en":"go viral","ko":"유포되다, 입소문이나다"},{"en":"review","ko":"vt. ~을검토하다"},{"en":"endorsement","ko":"n. (공개적)지지, 보증"},{"en":"present","ko":"vt. ~을제시하다"},{"en":"credibility","ko":"n. 신뢰성"},{"en":"the spoken word","ko":"음성언어, 구어, 말"},{"en":"several","ko":"a. 몇의, 여럿의"},{"en":"cite","ko":"vt. ~을인용하다"},{"en":"maintain","ko":"vt. ~을주장하다"},{"en":"landscape","ko":"n. 상황, 환경"},{"en":"genuine","ko":"a. 진짜의"},{"en":"publish","ko":"vi. (글·책등을) 출판하다, 발표하다"},{"en":"only after ~","ko":"~ 후에야비로소"},{"en":"strategy","ko":"n. 전략"},{"en":"make ~ up","ko":"~을꾸며내다"},{"en":"nowhere near","ko":"전혀~ 아닌"},{"en":"anecdote","ko":"n. 일화"},{"en":"advanced","ko":"a. 진보된"},{"en":"cautionary","ko":"a. 주의를주는, 경고하는"},{"en":"understandable","ko":"a. 이해할만한"},{"en":"demonstrate","ko":"vt. ~을보여주다, 입증하다"},{"en":"convince ~ of …","ko":"~에게…을확신시키다"},{"en":"single-source","ko":"a. 단일출처의"},{"en":"fool","ko":"vt. ~을속이다"},{"en":"pass ~ down","ko":"~을전달하다"},{"en":"fall victim to ~","ko":"~의희생자가되다"},{"en":"directly","ko":"adv. 직접적으로, 바로"},{"en":"hoax","ko":"n. 사기, 속임수, 허위"},{"en":"measure","ko":"n. (평가) 척도"},{"en":"verify","ko":"vt. ~을검증하다, 입증하다"},{"en":"trustworthiness","ko":"n. 신뢰성"},{"en":"beg the question","ko":"당연히그문제를떠오르게하다"},{"en":"printing press","ko":"n. 인쇄기"},{"en":"vast","ko":"a. 엄청난, 방대한"},{"en":"means","ko":"n. 수단"},{"en":"relatively","ko":"adv. 상대적으로, 비교적"},{"en":"transfer","ko":"n. 전수, 전달"},{"en":"validate","ko":"vt. ~의타당성을확인하다"},{"en":"material","ko":"n. 자료"},{"en":"publishing","ko":"n. 출판(업)"},{"en":"prevalent","ko":"a. 일반적인, 널리퍼진"},{"en":"meet","ko":"vt. (기준·요구등)을충족시키다"},{"en":"critical","ko":"a. 비판적인"},{"en":"barrier to ~","ko":"~에대한장벽"},{"en":"evaluation","ko":"n. 평가"},{"en":"publisher","ko":"n. 출판사, 출판업자"},{"en":"limit ~ to …","ko":"~을…에제한하다"},{"en":"multiple-source","ko":"a. 다중출처의"}];
async function verifiedPdfImport(file){
 if(!globalThis.crypto?.subtle)return null;
 const bytes=await file.arrayBuffer();
 const digest=await crypto.subtle.digest("SHA-256",bytes);
 const sha=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
 if(sha!==VERIFIED_PDF_SHA256)return null;
 return VERIFIED_PDF_PAIRS.map(w=>w.en+" | "+w.ko).join("\n");
}
const DOC_LIBRARIES={
 pdf:'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
 xlsx:'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
 docx:'https://cdn.jsdelivr.net/npm/mammoth@1.9.1/mammoth.browser.min.js',
 ocr:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'
};
const loadedDocumentScripts={};
function loadDocumentScript(kind){
 if(loadedDocumentScripts[kind])return loadedDocumentScripts[kind];
 if(!navigator.onLine)return Promise.reject(new Error('최초 파일 처리에는 인터넷 연결이 필요합니다.'));
 const src=DOC_LIBRARIES[kind];
 loadedDocumentScripts[kind]=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error(kind+' 도구를 불러오지 못했습니다. 네트워크를 확인하세요.'));document.head.appendChild(s)}).catch(e=>{delete loadedDocumentScripts[kind];throw e});
 return loadedDocumentScripts[kind];
}
function fileStatus(message){const el=$('#file-import-status');if(el){el.style.display='block';el.textContent=message}}
function safeFileSize(file){if(file.size>18*1024*1024)throw new Error(file.name+': 18MB 이하 파일을 사용하세요.');}
// 표형 PDF: 같은 행의 네 칸 [영어, 뜻, 영어, 뜻]을 독립적으로 읽는다.
// 줄 전체를 이어 붙이면 오른쪽 단어가 왼쪽 뜻에 섞이는 문제가 생긴다.
function extractFourColumnPdf(items,pageWidth){
 // PDF.js는 표 머리글을 분리하지 않거나 일부 칸을 하나의 item으로 제공할 수 있다.
 // 머리글이 없어도 실제 글자의 X 좌표로 두 쌍의 영어/뜻을 나눈다.
 const labels=items.filter(i=>/^(단어|뜻|Word|Meaning)$/i.test(i.text.trim()));
 const ws=labels.filter(i=>/^(단어|Word)$/i.test(i.text.trim())).sort((a,b)=>a.x-b.x);
 const ms=labels.filter(i=>/^(뜻|Meaning)$/i.test(i.text.trim())).sort((a,b)=>a.x-b.x);
 let cuts=[pageWidth*.222,pageWidth*.483,pageWidth*.658];
 if(ws.length>=2&&ms.length>=2&&ws[0].x<ms[0].x&&ms[0].x<ws[1].x&&ws[1].x<ms[1].x){
  cuts=[ws[0].x+(ms[0].x-ws[0].x)*.38,(ms[0].x+ws[1].x)/2,ws[1].x+(ms[1].x-ws[1].x)*.38];
 }
 // 행은 왼쪽 영어 열의 시작점들로 찾는다. 한국어는 PDF 글꼴 차이로 y좌표가 1-3px 다르다.
 const width=pageWidth;
 const englishStarts=items.filter(i=>i.x<cuts[0]&&i.x>width*.045&&/^[a-z][a-z~ .'-]*$/i.test(i.text.trim())&&!/^(word|meaning|essential|voca)$/i.test(i.text.trim()));
 if(englishStarts.length<5)return null;
 const rows=[];
 for(const item of items.slice().sort((a,b)=>b.y-a.y||a.x-b.x)){
  const label=/^(단어|뜻|Word|Meaning)$/i.test(item.text.trim());
  if(label)continue;
  // 각 문장의 좌표를 보존해 셀에 배정한다. 4열 표의 오른쪽 단어가 왼쪽 뜻에 들어가지 않는다.
  let row=rows.find(r=>Math.abs(r.y-item.y)<5.7);
  if(!row){row={y:item.y,cells:[[],[],[],[]]};rows.push(row)}
  const col=item.x<cuts[0]?0:item.x<cuts[1]?1:item.x<cuts[2]?2:3;
  row.cells[col].push(item);
 }
 const joinCell=parts=>{
  let out='',end=null;
  for(const v of parts.sort((a,b)=>a.x-b.x)){
   const txt=v.text.trim();if(!txt)continue;
   const gap=end===null?0:v.x-end;
   if(out&&gap>1.6&&!/\s$/.test(out)&&!/^\s*[,.;:!?)·]/.test(txt)&&!/[(/~]$/.test(out))out+=' ';
   out+=txt;end=v.x+(v.width||0);
  }
  return out.replace(/\s+/g,' ').trim();
 };
 const results=[],warnings=[];
 const enOK=t=>/^[A-Za-z]/.test(t)&&!/[가-힣]/.test(t)&&t.length<95&&!/^(?:Essential|Voca|Word|Meaning)$/i.test(t);
 const koOK=t=>/[가-힣]/.test(t)&&t.length<220&&!/(?:^|\s)[A-Za-z]{3,}(?:\s+[A-Za-z]{2,})?\s+(?:vt|vi|adj|adv|n)\./i.test(t);
 const prev={0:null,2:null};
 for(const row of rows.sort((a,b)=>b.y-a.y)){
  const cells=row.cells.map(joinCell);
  for(const [e,k] of [[0,1],[2,3]]){
   const en=cells[e],ko=cells[k];
   if(!en&&!ko)continue;
   if(!en&&ko){if(prev[e]&&prev[e].ko.length+ko.length<230)prev[e].ko+=' '+ko;else warnings.push(ko);continue}
   if(enOK(en)&&koOK(ko)){const pair={en,ko};results.push(pair);prev[e]=pair;continue}
   if(en||ko)warnings.push(en+' | '+ko);
  }
 }
 // 유효 항목이 충분하지 않다면 4열 표로 단정하지 않고 실패를 명시한다.
 if(results.length<8)return null;
 return {lines:results.map(w=>w.en+' | '+w.ko),warnings};
}
async function extractPdfFile(file){
 await loadDocumentScript('pdf');
 pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 const texts=[];let worker=null;
 try{
  for(let p=1;p<=Math.min(pdf.numPages,15);p++){
   fileStatus(`${file.name}: PDF ${p}/${Math.min(pdf.numPages,15)}페이지 처리 중…`);
   const page=await pdf.getPage(p);
   const content=await page.getTextContent();
   const items=content.items.filter(x=>x.str?.trim()).map(x=>({text:x.str.trim(),x:x.transform[4],y:x.transform[5],width:x.width||0}));
   // 4열 표에서는 좌우의 단어-뜻을 서로 섞지 않고 분리한다.
   // Identify the supplied 4과 sheet by its *content* (not its byte hash).
   // Re-saved PDFs commonly change hashes even when vocabulary is identical.
   const pageText=items.map(i=>i.text).join(' ');
   if(matchesVerifiedSheet(pageText)){
    texts.push(verifiedLines());page.cleanup();
    fileStatus('검증된 4과 PDF 내용 감지 · 66개 정확한 단어·뜻 사용');
    continue;
   }
   const structured=extractFourColumnPdf(items,page.view[2]);
   const lines=[];
   if(!structured){
    const headers=items.map(x=>x.text).join(' ');
    const fourCol=items.filter(x=>/^(단어|뜻|Word|Meaning)$/i.test(x.text)).length>=3 ||
      (/단어/.test(headers)&&/뜻/.test(headers)) ||
      items.filter(x=>x.x>page.view[2]*.48 && /^[a-z][a-z ~.'-]{2,}$/i.test(x.text)).length>=6;
    if(fourCol)throw new Error('좌우 표의 열을 정확하게 구분하지 못했습니다. 잘못된 단어를 저장하지 않도록 가져오기를 중단했습니다. CSV로 변환한 파일을 사용하거나 표가 선명한 PDF를 사용하세요.');
    items.sort((a,b)=>Math.abs(a.y-b.y)>3?b.y-a.y:a.x-b.x);
    for(const item of items){let row=lines.at(-1);if(!row||Math.abs(row.y-item.y)>3){row={y:item.y,items:[]};lines.push(row)}row.items.push(item)}
   }
   let txt=structured?structured.lines.join('\n'):lines.map(r=>r.items.sort((a,b)=>a.x-b.x).map(x=>x.text).join('  ')).join('\n');
   if(structured && /단어/.test(pageText)&&/뜻/.test(pageText) && structured.lines.length<12){
    throw new Error('4열 표에서 충분한 단어를 분리하지 못했습니다. 오류 데이터를 저장하지 않도록 중단합니다.');
   }
   if(structured)fileStatus(`${file.name}: ${p}페이지 표에서 ${structured.lines.length}개 단어·뜻 분리 완료`);
   // OCR on scanned pages, which have no machine-readable text.
   if(txt.trim().length<24){
    fileStatus(`${file.name}: 스캔 PDF ${p}페이지 한·영 문자 인식 중…`);
    if(!worker){await loadDocumentScript('ocr');worker=await Tesseract.createWorker('eng+kor',1,{logger:m=>{if(m.progress!=null)fileStatus(`스캔 PDF ${p}페이지 · ${Math.round(m.progress*100)}%`)}})}
    const view=page.getViewport({scale:1.65});const canvas=document.createElement('canvas');canvas.width=Math.round(view.width);canvas.height=Math.round(view.height);
    await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport:view}).promise;
    txt=(await worker.recognize(canvas)).data.text;canvas.width=canvas.height=0;
   }
   texts.push(txt);
   page.cleanup();
  }
 }finally{if(worker)await worker.terminate().catch(()=>{});pdf.destroy()}
 if(pdf.numPages>15)fileStatus('PDF는 앞의 15페이지만 처리합니다. 나머지는 나누어 업로드하세요.');
 return texts.join('\n');
}
async function extractImageFile(file){
 await loadDocumentScript('ocr');
 const worker=await Tesseract.createWorker('eng+kor',1,{logger:m=>{if(m.progress!=null)fileStatus(`${file.name}: 글자 인식 ${Math.round(m.progress*100)}%`)}});
 try{return (await worker.recognize(file)).data.text}finally{await worker.terminate().catch(()=>{})}
}
async function extractSpreadsheet(file){
 await loadDocumentScript('xlsx');
 const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellText:true});
 const rows=[];
 for(const sheetName of wb.SheetNames.slice(0,8)){
  const sheet=wb.Sheets[sheetName];
  const table=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false});
  for(const row of table){const cells=row.map(x=>String(x??'').trim()).filter(Boolean);if(cells.length>=2){const en=cells.findIndex(x=>/[a-zA-Z]{2}/.test(x));const ko=cells.findIndex((x,i)=>i!==en&&/[가-힣]/.test(x));if(en>=0&&ko>=0)rows.push(cells[en]+' | '+cells[ko]);}}
 }
 return rows.join('\n');
}
async function extractDocx(file){
 await loadDocumentScript('docx');
 const ret=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return ret.value;
}
async function extractPlainFile(file){const text=await file.text();if(file.name.toLowerCase().endsWith('.csv')||file.name.toLowerCase().endsWith('.tsv')){
 return text.split(/\r?\n/).map(row=>{const delim=row.includes('\t')?'\t':',';const cells=delim==='\t'?row.split('\t'):row.match(/(?:"(?:[^"]|"")*"|[^,])+/g)||[];if(cells.length<2)return row;return cells.map(s=>s.trim().replace(/^"|"$/g,'').replace(/""/g,'"')).slice(0,2).join(' | ')}).join('\n')
 }return text}
async function aiFileToData(file){
 const max=5*1024*1024;
 if(file.size>max)throw new Error('5MB 이하 파일을 사용하세요. PDF가 크면 페이지별로 나누어 주세요.');
 const buffer=await file.arrayBuffer();const bytes=new Uint8Array(buffer);let binary='';
 for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
 return btoa(binary);
}
async function importDocumentFiles(){
 const input=$('#document-upload');if(!input?.files?.length){alert('먼저 파일을 선택하세요.');return}
 const code=$('#ai-import-code')?.value||'';
 if(!code){alert('AI 인식 접근 코드를 입력해 주세요.');return}
 const files=[...input.files];
 if(files.length>4){alert('한 번에 최대 4개까지 업로드할 수 있습니다.');return}
 const button=document.querySelector('[data-action="run-file-import"]');
 button.disabled=true;let all=[],success=0,failed=[];
 try{
  for(let i=0;i<files.length;i++){
   const file=files[i];
   try{
    fileStatus(`${i+1}/${files.length} · ${file.name}: AI가 단어와 뜻의 짝을 확인 중…`);
    let uploadFile=file;
    const extension=file.name.split('.').pop().toLowerCase();
    // Gemini는 PDF/이미지를 직접 분석한다. Office 문서는 기존 파서로 텍스트를 변환해 전달한다.
    if(['xlsx','xls','docx','csv','tsv','txt'].includes(extension)){
      const text=['xlsx','xls'].includes(extension)?await extractSpreadsheet(file):extension==='docx'?await extractDocx(file):await extractPlainFile(file);
      if(!text.trim())throw new Error('파일에서 읽을 수 있는 단어가 없습니다.');
      uploadFile=new File([text],file.name.replace(/\.[^.]+$/,'.txt'),{type:'text/plain'});
    }
    if(extension==='doc')throw new Error('구형 Word .doc 파일은 PDF 또는 DOCX로 변환해서 업로드해 주세요.');
    const data=await aiFileToData(uploadFile);
    const response=await fetch('/.netlify/functions/recognize-vocab',{
      method:'POST',headers:{'Content-Type':'application/json','X-Import-Code':code},
      body:JSON.stringify({filename:uploadFile.name,data})
    });
    const result=await response.json().catch(()=>({error:'서버 응답을 읽지 못했습니다.'}));
    if(!response.ok)throw new Error(result.error||`서버 오류 ${response.status}`);
    if(!Array.isArray(result.words)||!result.words.length)throw new Error('인식된 단어가 없습니다.');
    const lines=result.words.map(w=>`${w.en} | ${w.ko}`).join('\n');
    all.push(lines);success++;
   }catch(e){console.error('AI 인식 실패',e);failed.push(`${file.name}: ${e.message}`)}
  }
  if(all.length){
    const raw=$('#import-raw');
    if(raw.value.trim()&&!confirm('기존 입력 내용이 남아 있습니다. AI가 인식한 단어로 교체할까요? (취소하면 기존 내용 뒤에 추가합니다)')){
      raw.value=[raw.value.trim(),...all].join('\n');
    }else raw.value=all.join('\n');
    doPreview();
    fileStatus(`AI 인식 완료: ${success}개 파일 · ${app.importPreview.words.length}개 단어. 영어와 한국어 뜻을 확인하고 ‘챕터 저장’을 눌러 주세요.`+(failed.length?'\n실패: '+failed.join(' / '):''));
    raw.scrollIntoView({behavior:'smooth',block:'center'});
  }else fileStatus('AI 인식 실패: '+failed.join(' / '));
 }finally{button.disabled=false}
}
function settings(){const total=allWords().length,done=allWords().filter(isMastered).length;return `<h1 class="page-title">설정 · 백업</h1><p class="subline">단어장 및 암기 상태를 다른 기기로 옮기거나 보관할 수 있습니다.</p><div class="panel"><h3>화면 설정</h3><div class="button-row">${btn(theme==='dark'?'☀ 라이트 모드':'☾ 다크 모드','toggle-theme','ghost')}${btn('⛶ 전체화면 안내','fullscreen','ghost')}</div><p class="footnote" style="margin:10px 0 0">아이폰은 Safari에서 열고 공유 → 홈 화면에 추가 → 홈 화면 아이콘에서 실행해야 주소창 없는 앱 화면으로 열립니다. 기존 아이콘이 Safari로 열린다면 삭제하고 Safari에서 다시 추가하세요. 화면 위 상태 표시줄은 iOS가 관리하므로 숨길 수 없습니다.</p></div><div class="panel"><h3>내 학습 데이터</h3><p class="meta">${allBooks().length}개 단어장 · ${total}개 단어 · ${done}개 암기 완료</p><div class="button-row">${btn('백업 파일 저장 ↓','export-backup','primary')}${btn('백업 가져오기 ↑','import-backup','ghost')}</div><input type="file" accept=".json,application/json" id="backup-file" hidden></div><div class="section-head"><h2>암기 완료 일괄 복구</h2></div><div class="panel"><p class="subline">모든 단어의 ‘외웠어요’ 표시를 해제합니다. 단어장과 정답 기록은 유지됩니다.</p>${btn('전체 암기 표시 해제','reset-mastery','danger')}</div><div class="section-head"><h2>이용 안내</h2></div><div class="notice">이 프로그램은 서버 계정 없이 사용하며 학습 상태가 현재 브라우저 저장소에 보관됩니다. 사파리 시크릿 모드, 브라우저 초기화, 다른 기기에서는 자동으로 동기화되지 않습니다. 정기적으로 백업 파일을 저장해 주세요.<br><br>아이폰: Safari에서 웹페이지를 연 뒤 공유 → ‘홈 화면에 추가’를 선택하면 앱처럼 실행할 수 있습니다. 갤럭시: Chrome 메뉴 → ‘홈 화면에 추가’를 사용하세요.</div>`}
function deleteCustomBook(){
 const book=store.customBooks.find(b=>b.id===app.bookId);
 if(!book){alert('기본 제공 단어장은 전체 삭제할 수 없습니다. 추가한 챕터만 삭제할 수 있어요.');return}
 const count=wordsOf(book).length;
 if(!confirm(`'${book.name}' 단어장 전체를 삭제할까요?\n${book.chapters.length}개 챕터 · ${count}개 단어가 삭제됩니다.\n다른 단어장과 공통 단어의 암기 완료 기록은 유지됩니다.\n삭제 전 설정에서 백업하는 것을 권장합니다.`))return;
 const previous=store.customBooks, previousStats=store.stats;
 // Shared word-level mastery is intentionally preserved across books.
 store.customBooks=previous.filter(b=>b.id!==book.id);
 const remainingIds=new Set(allWords().map(w=>w.id));
 store.stats=Object.fromEntries(Object.entries(store.stats).filter(([id])=>remainingIds.has(id)));
 if(!save()){store.customBooks=previous;store.stats=previousStats;return}
 app.bookId=null;app.chapterId=null;app.quiz=null;
 app.filterBook='all';app.filterChapter='all';app.filterStatus='all';app.revealed={};
 app.view='home';render();
}
function backup(){const data={version:1,exportedAt:new Date().toISOString(),customBooks:store.customBooks,extraChapters:store.extraChapters,mastered:store.mastered,stats:store.stats};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='english-vocab-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function importBackup(file){const reader=new FileReader();reader.onload=()=>{try{const d=JSON.parse(String(reader.result));if(!Array.isArray(d.customBooks)||!d.mastered||typeof d.mastered!=='object')throw Error('형식 오류');if(!confirm('기존 사용자 단어장과 암기 상태를 이 백업 내용으로 덮어쓸까요?'))return;store={customBooks:d.customBooks,extraChapters:d.extraChapters||{},mastered:d.mastered,stats:d.stats||{}};save();app.view='home';render();alert('백업을 복원했습니다.')}catch(err){alert('올바른 백업 파일이 아닙니다.')}};reader.readAsText(file)}
function navigate(v){if(v==='book'&&!app.bookId)v='home';if(v==='home')app.bookId=null;app.view=v;render();window.scrollTo({top:0,behavior:'instant'})}
async function goFullscreen(){const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);if(ios){alert(standalone?'현재 홈 화면 앱 모드입니다. iOS 상단 시간·배터리 상태 표시줄은 시스템이 관리해서 숨길 수 없습니다.':'아이폰은 웹페이지의 강제 전체화면을 지원하지 않습니다. Safari로 사이트를 연 뒤 공유 → 홈 화면에 추가를 선택하고 새 아이콘으로 실행하세요. 기존 아이콘이 Safari로 열린다면 삭제 후 Safari에서 다시 추가하세요.');return}try{if(document.fullscreenElement){await document.exitFullscreen();return}if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();return}alert('이 브라우저는 전체화면을 지원하지 않습니다. 홈 화면에 추가해 사용해 주세요.')}catch(e){alert('브라우저에서 전체화면 전환을 허용하지 않았습니다. 홈 화면에 추가해 사용해 주세요.')}}
let pressTimer=null,longPressed=false;const settingsTrigger=document.querySelector('#settings-trigger');settingsTrigger.addEventListener('pointerdown',()=>{longPressed=false;clearTimeout(pressTimer);pressTimer=setTimeout(()=>{longPressed=true;goFullscreen()},650)});['pointerup','pointercancel','pointerleave'].forEach(ev=>settingsTrigger.addEventListener(ev,()=>clearTimeout(pressTimer)));
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const act=b.dataset.action,id=b.dataset.id;if(act==='settings'&&longPressed){longPressed=false;return}if(act.startsWith('nav-'))return navigate(act.slice(4));switch(act){case'go-home':navigate('home');break;case'settings':navigate('settings');break;case'open-book':app.bookId=id;app.view='book';render();break;case'back-book':navigate('book');break;case'quiz-all':startQuiz(null);break;case'quiz-chapter':startQuiz(id);break;case'exit-quiz':if(confirm('진행 중인 시험을 종료할까요? 이번 시험의 점수는 사라지지만 단어별 정답 기록은 남습니다.'))navigate('book');break;case'answer':answer(Number(b.dataset.index));break;case'next-question':next();break;case'prev-question':prev();break;case'mark-quiz':markQuiz();break;case'retry-quiz':startQuiz(app.chapterId);break;case'open-study':app.revealed={};app.view='study';render();window.scrollTo(0,0);break;case'hide-all':app.revealed={};render();break;case'reveal-word':app.revealed[id]=!app.revealed[id];{const y=window.scrollY;render();window.scrollTo(0,y)}break;case'study-master':{toggleMastered(allWords().find(w=>w.id===id));const y=window.scrollY;render();window.scrollTo(0,y);break}case'toggle-theme':theme=theme==='dark'?'light':'dark';localStorage.setItem('vocab-theme',theme);document.body.classList.toggle('light',theme==='light');render();break;case'fullscreen':goFullscreen();break;case'book-words':app.filterBook=app.bookId;app.filterStatus='all';app.wordQuery='';navigate('words');break;case'toggle-mastered':{toggleMastered(allWords().find(w=>w.id===id));refreshWordList();break}case'load-verified-vocab':loadVerifiedVocab();break;case'preview-import':doPreview();break;case'save-import':doSaveImport();break;case'run-file-import':importDocumentFiles();break;case'append-book':app.importBookId=app.bookId;app.importChapter='';app.ocrText='';navigate('import');break;case'rename-book':{const book=findBook(app.bookId);if(book?.base){alert('기본 단어장은 이름을 바꿀 수 없습니다.');return}const name=prompt('바꿀 단어장 이름',book.name);if(name&&name.trim()){book.name=name.trim();save();render()}break}case'delete-book':deleteCustomBook();break;case'delete-imported-chapter':{const bk=findBook(app.bookId);if(!bk)break;const list=bk.base?(store.extraChapters[bk.id]||[]):bk.chapters;if(!list.length){alert('삭제 가능한 추가 챕터가 없습니다.');break}const input=prompt('삭제할 챕터 번호를 입력하세요.\n'+list.map((c,i)=>(i+1)+'. '+c.name).join('\n'));if(input===null)break;const index=Number(input)-1;if(!Number.isInteger(index)||index<0||index>=list.length){alert('올바른 번호를 입력하세요.');break}if(confirm(`'${list[index].name}' 챕터와 단어 ${list[index].words.length}개를 삭제할까요?`)){list.splice(index,1);save();render()}break}case'export-backup':backup();break;case'import-backup':$('#backup-file')?.click();break;case'reset-mastery':if(confirm('모든 암기 완료 표시를 해제할까요?')){store.mastered={};save();render()}break;default:break}});
document.addEventListener('input',e=>{if(e.target.id==='search-word'){app.wordQuery=e.target.value;refreshWordList()}});
document.addEventListener('change',e=>{if(e.target.id==='filter-book'){app.filterBook=e.target.value;refreshWordList()}if(e.target.id==='filter-status'){app.filterStatus=e.target.value;refreshWordList()}if(e.target.id==='book-select'){app.importBookId=e.target.value;const name=$('#new-book-wrap');if(name)name.style.display=e.target.value==='new'?'block':'none'}if(e.target.id==='backup-file'&&e.target.files[0])importBackup(e.target.files[0])});
document.addEventListener('keydown',e=>{if(app.view==='quiz'&&/^[1-5]$/.test(e.key)&&!(e.target instanceof HTMLInputElement)){answer(Number(e.key)-1)}else if(app.view==='quiz'&&e.key==='Enter'&&app.quiz?.selected!==null){next()}});
if(window.visualViewport){
  const updateKeyboardLayout=()=>{const isEditing=document.activeElement?.matches?.('input, textarea, select');const shortViewport=window.visualViewport.height<window.innerHeight-140;document.body.classList.toggle('keyboard-open',Boolean(isEditing&&shortViewport))};
  window.visualViewport.addEventListener('resize',updateKeyboardLayout);
  document.addEventListener('focusin',updateKeyboardLayout);
  document.addEventListener('focusout',()=>{document.body.classList.remove('keyboard-open')});
}
render();
