javascript:(function(){
  
setTimeout(function(){

var ST='BEGIN_WORDCOUNT_EXCLUSION';
var EG="paste text here that shouldn't get counted in the word count  ";
var ET='END_WORDCOUNT_EXCLUSION';

/* Selector config: try these in order to find content */
var contentSelectors=[
  'textarea[name="issue[body]"]',    /* GitHub issues */
  '#issue_body',
  'textarea[aria-label*="description"]',
  'textarea.comment-form-textarea',
  'article',                          /* Blog posts */
  'main',
  '.PostsPage-postContent',
  '.PostBody-root',
  '.content',
  'body'
];

var bodyText='';
for(var i=0;i<contentSelectors.length;i++){
  var el=document.querySelector(contentSelectors[i]);
  if(!el)continue;
  /* For textareas/inputs, use .value */
  if(el.tagName==='TEXTAREA'||el.tagName==='INPUT'){
    bodyText=el.value||'';
    break;
  }
  /* For other elements, clone and extract text */
  var c=el.cloneNode(true);
  c.querySelectorAll('script,style,nav,footer,header,iframe')
   .forEach(function(x){x.remove();});
  var blocks=c.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,td,th,br');
  blocks.forEach(function(b){
    if(b.tagName==='BR'){b.replaceWith(document.createTextNode(' '));}
    else{b.insertAdjacentText('afterend',' ');}
  });
  bodyText=(c.innerText||c.textContent);
  if(bodyText.trim())break;
}

/* Sanitize for word counting:
   - NFC normalize; CRLF -> \n
   - Convert Unicode spaces to ASCII space (LSEP/PSEP -> \n)
   - Drop invisibles (BOM, ZWSP, SHY, bidi controls, isolates)
   - KEEP emoji machinery: ZWJ (U+200D) and VS16 (U+FE0F) */
function sanitize(s){
  s=String(s??'');
  if(s.normalize)s=s.normalize('NFC');
  s=s.replace(/\r\n?/g,'\n');
  s=s.replace(
    /[\u00AD\u200B\u2060\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069]/g,'');
  s=s.replace(/[\u2028\u2029]/g,'\n');
  s=s.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g,' ');
  s=s.replace(/[ \t\f\v]+/g,' ');
  s=s.replace(/[ \t\f\v]*\n[ \t\f\v]*/g,'\n');
  return s;
}

/* Word count:
   - Contiguous letters/digits/marks OR emoji clusters count as ONE word
   - No spaces => not separate words (e.g., "foo🙂bar" -> 1)
   - Spaced punctuation (e.g., " — ") does not count */
function wordcount(text){
  text=sanitize(text);
  if(!text)return 0;

  var segOK=typeof Intl!=='undefined'&&typeof Intl.Segmenter==='function';
  var graphemes=segOK?[...new Intl.Segmenter(undefined,{granularity:'grapheme'})
                             .segment(text)].map(function(x){return x.segment;})
                      : matchGraphemesFallback(text);

  var EP=tryRe('\\p{Extended_Pictographic}');
  var pictoFallback=/[\u2600-\u27BF\u{1F300}-\u{1FAFF}]/u;
  var flagRE=/^[\u{1F1E6}-\u{1F1FF}]{2}$/u;
  var keycapRE=/^(?:[0-9#*]\uFE0F?\u20E3)$/u;
  var letterNumMark=/[\p{L}\p{N}\p{M}]/u;
  var apostrophe=/^['\u2018\u2019\u02BC\u2032\u201B\u02BB]$/u;
  var hyphen=/^-$/u;

  var inWord=false,cnt=0;
  for(var i=0;i<graphemes.length;i++){
    var g=graphemes[i];
    var isEmoji = 
      flagRE.test(g)||keycapRE.test(g)||(EP?EP.test(g):pictoFallback.test(g));
    var isWordChar=isEmoji||letterNumMark.test(g);
    if(isWordChar){ if(!inWord){ inWord=true; cnt++; } }
    else if(apostrophe.test(g)&&inWord){ /* keep word open */ }
    else if(hyphen.test(g)&&inWord){ /* keep word open for hyphenated words */ }
    else { inWord=false; }
  }
  return cnt;
}

/* Helpers */
function tryRe(src){ try{return new RegExp(src,'u')}catch{return null} }

/* Grapheme fallback:
   - Emoji ZWJ sequences (+ optional VS16 + skin tones)
   - Flags and keycaps as single graphemes
   - Otherwise any single code point */
function matchGraphemesFallback(s){
  var base='[\\u2600-\\u27BF\\u{1F300}-\\u{1FAFF}]';
  var tone='[\\u{1F3FB}-\\u{1F3FF}]';
  var re=new RegExp(
    '(?:'+base+')(?:\\uFE0F)?(?:'+tone+')?(?:\\u200D(?:'+base+')(?:\\uFE0F)?(?:'
    +tone+')?)*'
    +'|[\\u{1F1E6}-\\u{1F1FF}]{2}'
    +'|[#*0-9]\\uFE0F?\\u20E3'
    +'|[\\s\\S]'
  ,'gu');
  return s.match(re)||[];
}

var t=sanitize(bodyText).trim();

function getPrefixToFirst(s){ 
  var fi=s.indexOf(ST); 
  return s.slice(0,fi===-1?s.length:fi);
}
  
function getAllExclusionTexts(s){
  var exclusions=[],pos=0;
  while(true){
    var a=s.indexOf(ST,pos),b=a===-1?-1:s.indexOf(ET,a+ST.length);
    if(a===-1||b===-1)break;
    exclusions.push(s.slice(a+ST.length,b));
    pos=b+ET.length;
  }
  return exclusions;
}
  
function normalizeWS(s){return s.replace(/\s+/g,' ').trim();}
  
function countOccurrences(text,searchFor){
  var norm=normalizeWS(searchFor).toLowerCase();
  console.log('[WC] Normalized searchFor:',norm);
  if(!norm)return 0; /* avoid infinite loop if norm is empty */
  var textNorm=normalizeWS(text).toLowerCase();
  console.log('[WC] Normalized text length:',textNorm.length);
  var count=0,idx=0;
  while((idx=textNorm.indexOf(norm,idx))!==-1){count++;idx+=norm.length;}
  return count;
}
function escHtml(s){ 
  return String(s).replace(/&/g,'&amp;')
                  .replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;'); }
function highlightExcluded(s,exclusionTexts){
  var sNorm=normalizeWS(s);
  var sNormLower=sNorm.toLowerCase();
  var matches=[];
  for(var i=0;i<exclusionTexts.length;i++){
    var norm=normalizeWS(exclusionTexts[i]);
    var searchFor=norm.toLowerCase();
    if(!searchFor)continue; /* skip empty exclusions to avoid infinite loop */
    var idx=0;
    while((idx=sNormLower.indexOf(searchFor,idx))!==-1){
      matches.push({start:idx,end:idx+searchFor.length});
      idx+=searchFor.length;
    }
  }
  matches.sort(function(a,b){return a.start-b.start;});
  var lastIdx=0,result='';
  for(var j=0;j<matches.length;j++){
    var m=matches[j];
    if(m.start>=lastIdx){
      result+=escHtml(sNorm.slice(lastIdx,m.start));
      result+='<span style="color:#d32f2f;text-decoration:line-through;">'
        +escHtml(sNorm.slice(m.start,m.end))+'</span>';
      lastIdx=m.end;
    }
  }
  return result+escHtml(sNorm.slice(lastIdx));
}

var prefix=getPrefixToFirst(t);
var exclusionTexts=getAllExclusionTexts(t);
var x=wordcount(prefix);
console.log('[WC] Total words before exclusions:',x);
var subtractTerms=[],totalSubtraction=0;
for(var i=0;i<exclusionTexts.length;i++){
  var excl=exclusionTexts[i];
  var y=wordcount(excl);
  console.log('[WC] Exclusion',i+1,': "',excl,'" =>',y,'words');
  var n=countOccurrences(prefix,excl);
  console.log('[WC] Occurrences in prefix:',n);
  if(n>0){
    subtractTerms.push(y.toLocaleString()+'*'+n.toLocaleString());
    totalSubtraction+=n*y;
  }
}
var result=x-totalSubtraction;
console.log('[WC] Final word count after exclusions:',result);

var m=document.createElement('div');
m.style.cssText='position:fixed;top:20px;right:20px;background:#fff;padding:15px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:999999;font-family:sans-serif;width:360px;border:1px solid #ddd;max-height:calc(100vh - 40px);display:flex;flex-direction:column;overflow:hidden;';

var header=document.createElement('div');
header.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-shrink:0;';
var label=document.createElement('span'); 
label.style.cssText='font-size:13px;color:#666;'; 
label.textContent='Word Count';
var close=document.createElement('button'); 
close.type='button'; 
close.setAttribute('aria-label','Close'); 
close.style.cssText='border:none;background:none;cursor:pointer;font-size:16px;color:#999;padding:0;width:20px;height:20px;'; 
close.textContent='x';
header.appendChild(label); header.appendChild(close);

var tally=document.createElement('div');
tally.className='wc-count';
tally.style.cssText='font-size:24px;font-weight:bold;color:#333;margin-bottom:10px;line-height:1.2;flex-shrink:0;';
if(subtractTerms.length>0){
  tally.textContent=x.toLocaleString()+' - '+subtractTerms.join(' - ')+' = '
    +result.toLocaleString();
}else{
  tally.textContent=x.toLocaleString()+' - 0 = '+result.toLocaleString();
}

var preview=document.createElement('div');
preview.className='wc-preview';
preview.style.cssText='font-size:11px;color:#444;font-family:monospace;line-height:1.4;flex:1 1 auto;min-height:0;overflow:auto;background:#f5f5f5;padding:8px;border-radius:3px;white-space:pre-wrap;word-break:break-word;';
if(exclusionTexts.length>0){
  var tempDiv=document.createElement('div');
  tempDiv.innerHTML=highlightExcluded(prefix,exclusionTexts);
  while(tempDiv.firstChild)preview.appendChild(tempDiv.firstChild);
}else{
  preview.textContent=prefix;
}

var copy=document.createElement('button');
copy.id='wc-copy'; copy.type='button';
copy.style.cssText='margin-top:10px;padding:8px;background:#e3f2fd;border:2px dashed #2196F3;border-radius:3px;white-space:pre-wrap;font-size:9px;font-family:monospace;color:#1976D2;cursor:pointer;text-align:center;font-weight:bold;flex-shrink:0;';
copy.textContent='Copy exclusion tags';
copy.addEventListener('click',function(){
  var sel=window.getSelection();
  var selectedText='';
  if(sel&&sel.rangeCount>0&&sel.toString().trim()){
    var range=sel.getRangeAt(0);
    if(preview.contains(range.commonAncestorContainer)){
      selectedText=sel.toString();
    }
  }
  var middleText=selectedText||EG;
  var lines=[ST, middleText, ET];
  navigator.clipboard.writeText(lines.join(String.fromCharCode(10)));
  copy.style.background='#c8e6c9';
  copy.textContent='Copied';
  setTimeout(function(){
    copy.style.background='#e3f2fd';
    copy.textContent='Copy exclusion tags';},1500);
});

m.appendChild(header); 
m.appendChild(tally); 
m.appendChild(preview); 
m.appendChild(copy);
document.body.appendChild(m);

function isTypingKey(e){
  if (e.ctrlKey || e.altKey || e.metaKey) return false; /* Shift is allowed */
  const k = e.key || '';
  if (k === 'Escape') return true;
  if (k.length === 1) return true;        /* any printable char, incl space */
  return k === 'Enter' || k === 'Tab' || k === 'Backspace' || k === 'Delete';
}

function cleanup(){
  if (m && m.parentNode) m.parentNode.removeChild(m);
  document.removeEventListener('click', closeHandler, true);
  document.removeEventListener('keydown', keyHandler, true);
  if (close) close.removeEventListener('click', onCloseClick, { capture:true });
}

function closeHandler(evt) { if (!m || !m.contains(evt.target)) cleanup() }
function keyHandler(e) { if (isTypingKey(e)) cleanup() }

function onCloseClick(e) {
  e.preventDefault();
  e.stopPropagation();
  cleanup();
}

if (close) close.addEventListener('click', onCloseClick, { capture:true });

/* Delay to avoid immediately catching the opening click */
setTimeout(function(){
  document.addEventListener('click', closeHandler, true);
  document.addEventListener('keydown', keyHandler, true);
}, 10);

},100); /* end of setTimeout */

})();
