import { timingSafeEqual } from 'node:crypto';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const eq=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length>0&&x.length===y.length&&timingSafeEqual(x,y)};
const allowed=/\.(pdf|png|jpe?g|webp|gif|docx?|xlsx?|csv|tsv|txt)$/i;
const mime={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',doc:'application/msword',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',xls:'application/vnd.ms-excel',csv:'text/csv',tsv:'text/tab-separated-values',txt:'text/plain'};
export default async function handler(request){
 if(request.method!=='POST')return json({error:'POST 요청만 지원합니다.'},405);
 const secret=Netlify.env.get('OPENAI_API_KEY');
 const access=Netlify.env.get('IMPORT_ACCESS_CODE');
 if(!secret||!access)return json({error:'AI 인식 서버 설정이 아직 완료되지 않았습니다. Netlify 환경 변수 OPENAI_API_KEY와 IMPORT_ACCESS_CODE를 등록하세요.'},503);
 if(!eq(request.headers.get('x-import-code'),access))return json({error:'AI 인식 접근 코드가 올바르지 않습니다.'},403);
 const len=Number(request.headers.get('content-length')||0);
 if(len>7_500_000)return json({error:'파일이 너무 큽니다. 5MB 이하를 사용하세요.'},413);
 let payload;try{payload=await request.json()}catch{return json({error:'잘못된 요청입니다.'},400)}
 const filename=String(payload.filename||'').split(/[\\/]/).pop().slice(0,120);
 const ext=filename.split('.').pop().toLowerCase();
 if(!allowed.test(filename)||!mime[ext])return json({error:'지원하지 않는 파일 형식입니다.'},400);
 const data=String(payload.data||'');
 if(!data||data.length>7_100_000||!/^[A-Za-z0-9+/=]+$/.test(data))return json({error:'파일 데이터가 올바르지 않거나 너무 큽니다.'},400);
 const bytes=Buffer.from(data,'base64');
 if(bytes.length>5*1024*1024)return json({error:'5MB 이하 파일을 사용하세요.'},413);
 const image=['png','jpg','jpeg','webp','gif'].includes(ext);
 const parts=[];
 if(image){parts.push({type:'input_image',image_url:`data:${mime[ext]};base64,${data}`,detail:'high'})}
 else{parts.push({type:'input_file',filename,file_data:`data:${mime[ext]};base64,${data}`,...(ext==='pdf'?{detail:'high'}:{})})}
 parts.push({type:'input_text',text:`첨부된 단어장의 영어와 한글 뜻을 정확히 한 쌍씩 추출하라. 두 개의 영어/뜻 열이 나란한 표에서는 [영어1,뜻1]과 [영어2,뜻2]를 별도로 연결한다. 행 간 또는 열 간 다른 단어 뜻을 합치지 마라. 'take a picture of ~', 'limit ~ to ...' 같은 다단어 표현은 영어를 자르지 않는다. 뜻의 품사 표시 vt., n., a. 등과 문장부호는 원문대로 보존한다. 원문에 존재하지 않는 항목을 생성하지 마라. 글자가 불확실하면 추측하지 말고 해당 항목을 생략하라. 제목·머리글·번호는 포함하지 마라. 모든 단어를 누락하지 않도록 끝까지 확인하라.`});
 const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),53000);
 let result;
 try{
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${secret}`,'Content-Type':'application/json'},signal:abort.signal,body:JSON.stringify({model:'gpt-4.1',store:false,input:[{role:'user',content:parts}],text:{format:{type:'json_schema',name:'vocabulary_pairs',strict:true,schema:{type:'object',additionalProperties:false,properties:{words:{type:'array',items:{type:'object',additionalProperties:false,properties:{en:{type:'string'},ko:{type:'string'}},required:['en','ko']}}},required:['words']}}},max_output_tokens:12000})});
  result=await response.json();
  if(!response.ok){console.error('AI provider error',response.status,JSON.stringify(result).slice(0,400));return json({error:response.status===429?'AI 사용 한도에 도달했습니다. 잠시 후 다시 시도하세요.':'AI 서비스 처리에 실패했습니다. 관리자에게 API 설정과 이용 한도를 확인해 달라고 하세요.'},502)}
 }catch(error){console.error('AI request failed',String(error));return json({error:'AI 요청 시간이 초과되거나 연결에 실패했습니다. 페이지를 나누어 다시 시도하세요.'},504)}finally{clearTimeout(timer)}
 const text=result.output?.flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('')||'';
 let parsed;try{parsed=JSON.parse(text)}catch{return json({error:'AI 결과가 완성되지 않았습니다. 파일 페이지 수를 줄여 다시 시도하세요.'},502)}
 const words=[],seen=new Set();
 for(const pair of parsed.words||[]){
  const en=String(pair.en||'').trim().replace(/\s+/g,' '),ko=String(pair.ko||'').trim().replace(/\s+/g,' ');
  if(!en||en.length>95||!/[A-Za-z]/.test(en)||/[가-힣]/.test(en)||!ko||ko.length>250||!/[가-힣]/.test(ko)||/[|\n\r]/.test(en+ko))continue;
  if(/(?:[A-Za-z][A-Za-z'-]{2,})\s+(?:vt|vi|adj|adv|n)\./i.test(ko))continue;
  const key=en.toLowerCase();if(!seen.has(key)){words.push({en,ko});seen.add(key)}
 }
 if(!words.length)return json({error:'영어와 한국어 뜻을 분리하지 못했습니다. 다른 형식의 파일로 시도하세요.'},422);
 return json({words,count:words.length});
}
