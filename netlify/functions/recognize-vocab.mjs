import { timingSafeEqual } from 'node:crypto';

const json = (value, status=200) => new Response(JSON.stringify(value), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const eq = (a,b) => {const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length>0&&x.length===y.length&&timingSafeEqual(x,y)};
const mime = {pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',txt:'text/plain',csv:'text/plain',tsv:'text/plain'};
const prompt = `이 파일은 영어 단어장이다. 반드시 파일에 실제로 보이는 영어 표현과 바로 옆 한국어 뜻을 한 쌍씩 추출한다.
- 좌우 2세트가 있는 4열 표라면 (왼쪽 영어, 왼쪽 뜻)과 (오른쪽 영어, 오른쪽 뜻)을 독립적으로 처리한다. 다른 열의 영어 단어를 뜻에 섞지 않는다.
- 다단어 표현(take a picture of ~, limit ~ to …)은 절대 잘라내지 않는다.
- 단어의 원래 순서를 따르며 원문의 품사 표시(vt., n., a. 등), 물결표, 기호, 복수의 의미를 최대한 유지한다.
- 표 제목, 페이지 번호, 머리글, 빈 칸은 제외한다. 추측하거나 창작하지 않는다.
- 보이지 않거나 불확실한 행은 누락한다. 결과를 저장하기 전에 반드시 사용자가 검토할 예정이다.
JSON 객체의 words 배열로 출력한다. 각 원소에는 영어 en과 한국어 ko가 있어야 한다.`;
const schema = {type:'OBJECT',properties:{words:{type:'ARRAY',items:{type:'OBJECT',properties:{en:{type:'STRING'},ko:{type:'STRING'}},required:['en','ko']}}},required:['words']};

export default async function handler(request) {
 if(request.method!=='POST')return json({error:'POST 요청만 지원합니다.'},405);
 const secret=Netlify.env.get('GEMINI_API_KEY');
 const access=Netlify.env.get('IMPORT_ACCESS_CODE');
 if(!secret||!access)return json({error:'AI 서버 설정이 필요합니다. Netlify 환경 변수 GEMINI_API_KEY와 IMPORT_ACCESS_CODE를 등록하세요.'},503);
 if(!eq(request.headers.get('x-import-code'),access))return json({error:'AI 인식 접근 코드가 올바르지 않습니다.'},403);
 if(Number(request.headers.get('content-length')||0)>7_500_000)return json({error:'5MB 이하 파일을 사용하세요.'},413);
 let payload;try{payload=await request.json()}catch{return json({error:'요청을 읽을 수 없습니다.'},400)}
 const filename=String(payload.filename||'').split(/[\\/]/).pop().slice(0,120);
 const ext=filename.split('.').pop().toLowerCase();
 if(!mime[ext])return json({error:'파일 형식을 지원하지 않습니다. PDF·이미지·TXT·CSV 또는 앱에서 변환한 문서를 사용하세요.'},400);
 const data=String(payload.data||'');
 if(!data||data.length>7_100_000||!/^[A-Za-z0-9+/=]+$/.test(data))return json({error:'파일 데이터가 올바르지 않거나 너무 큽니다.'},400);
 const bytes=Buffer.from(data,'base64');
 if(bytes.length>5*1024*1024)return json({error:'5MB 이하 파일을 사용하세요.'},413);
 const isText=['txt','csv','tsv'].includes(ext);
 const contents = isText
  ? [{text:prompt},{text:bytes.toString('utf8').slice(0,230000)}]
  : [{text:prompt},{inline_data:{mime_type:mime[ext],data}}];
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),53000);
 let result;
 try{
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',{
   method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':secret},signal:controller.signal,
   body:JSON.stringify({contents:[{role:'user',parts:contents}],generationConfig:{responseMimeType:'application/json',responseSchema:schema,maxOutputTokens:12000,temperature:0}})
  });
  result=await response.json();
  if(!response.ok){console.error('Gemini error',response.status,String(result?.error?.status||''));
   if(response.status===429)return json({error:'Gemini 무료 사용 한도에 도달했습니다. 나중에 다시 시도하세요.'},429);
   if(response.status===400)return json({error:'파일 형식을 AI가 처리하지 못했습니다. PDF나 PNG/JPG로 변환해서 시도하세요.'},422);
   if(response.status===401||response.status===403)return json({error:'Gemini API 키 또는 프로젝트 접근 권한을 확인하세요.'},502);
   return json({error:'Gemini 처리 중 오류가 발생했습니다. 설정 또는 AI 사용 한도를 확인하세요.'},502);
  }
 }catch(e){console.error('Gemini request failed',String(e));return json({error:'AI 요청 시간이 초과되거나 연결에 실패했습니다. 파일을 나누어 시도하세요.'},504)}finally{clearTimeout(timer)}
 const answer=result.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
 let parsed;try{parsed=JSON.parse(answer)}catch{return json({error:'AI 결과가 완성되지 않았습니다. PDF 페이지 수를 줄여 주세요.'},502)}
 const words=[],seen=new Set();
 for(const pair of (Array.isArray(parsed.words)?parsed.words:[])){
  const en=String(pair.en||'').trim().replace(/\s+/g,' '),ko=String(pair.ko||'').trim().replace(/\s+/g,' ');
  if(!en||en.length>95||!/[A-Za-z]/.test(en)||/[가-힣]/.test(en)||!ko||ko.length>250||!/[가-힣]/.test(ko)||/[|\n\r]/.test(en+ko))continue;
  if(/(?:[A-Za-z][A-Za-z'-]{2,})\s+(?:vt|vi|adj|adv|n)\./i.test(ko))continue;
  const key=en.toLowerCase();if(!seen.has(key)){seen.add(key);words.push({en,ko})}
 }
 if(!words.length)return json({error:'영어와 한국어 뜻을 분리하지 못했습니다. 더 선명한 PDF나 사진으로 시도하세요.'},422);
 return json({words,count:words.length});
}
