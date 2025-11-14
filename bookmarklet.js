javascript:(function(){setTimeout(function(){

var VER='2025.11.13-k';
var TOPTEXT='<span>Word Count</span><span style="margin-left:auto">'
  +'<small>[tallyglot v'+VER+']</small></span>';
var ST='BEGIN_WORDCOUNT_EXCLUSION';
var ET='END_WORDCOUNT_EXCLUSION';

/* Selector config: try these in order to find prose to wordcount*/
var contentSelectors=[
  'textarea[name="issue[body]"]', /* gissues */
  '#issue_body',
  'textarea[aria-label*="description"]',
  'textarea.comment-form-textarea',
  'article',
  'main',
  '.PostsPage-postContent',
  '.PostBody-root',
  '.content',
  'body',
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
  /* Replace BR with placeholder to preserve line breaks */
  c.querySelectorAll('br').forEach(function(br){
    var tn=document.createTextNode('¶BR¶');
    br.parentNode.replaceChild(tn,br);
  });
  /* Add placeholder after block elements for paragraph spacing */
  c.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,td,th').forEach(function(el){
    el.insertAdjacentText('afterend','¶PARA¶');
  });
  bodyText=(c.innerText||c.textContent);
  /* Convert placeholders to actual newlines */
  bodyText=bodyText.replace(/\s*¶BR¶\s*/g,'\n').replace(/\s*¶PARA¶\s*/g,'\n\n');
  if(bodyText.trim())break;
}

/* Not sure if this is necessary...
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
  s=s.replace(/\n{3,}/g,'\n\n');
  return s;
}

/* Word count algorithm:
  - Split by whitespace into tokens
  - Count tokens with at least one "meat" character
  - Meat = letters (\p{L}), numbers (\p{N}), or emoji
  - Scaffold = apostrophes/hyphens/punctuation (ignored, just along for ride) */
function wordcount(text){
  text=sanitize(text);
  if(!text)return 0;
  var tokens=text.split(/\s+/);
  var emojiPattern;
  try{emojiPattern=new RegExp('\\p{Extended_Pictographic}','u')}
  catch{emojiPattern=/[\u2600-\u27BF\u{1F300}-\u{1FAFF}]/u}
  var meatPattern=/[\p{L}\p{N}]/u;
  var cnt=0;
  for(var i=0;i<tokens.length;i++){
    var token=tokens[i];
    if(token&&(meatPattern.test(token)||emojiPattern.test(token))){cnt++}
  }
  return cnt;
}

var t=sanitize(bodyText).trim();
var fi=t.indexOf(ST);
var prefix=t.slice(0,fi===-1?t.length:fi);

function getAllExclusionTexts(s){
  var exclusions=[],pos=0;
  while(true){
    var a=s.indexOf(ST,pos),b=a===-1?-1:s.indexOf(ET,a+ST.length);
    if(a===-1||b===-1)break;
    exclusions.push(s.slice(a+ST.length,b).trim());
    pos=b+ET.length;
  }
  return exclusions;
}
  
function countOccurrences(text,searchFor){
  var norm=searchFor.replace(/\s+/g,' ').trim().toLowerCase();
  if(!norm)return 0;
  var textNorm=text.replace(/\s+/g,' ').trim().toLowerCase();
  var count=0,idx=0;
  while((idx=textNorm.indexOf(norm,idx))!==-1){count++;idx+=norm.length}
  return count;
}
function escHtml(s){return String(s).replace(/&/g,'&amp;')
                                    .replace(/</g,'&lt;')
                                    .replace(/>/g,'&gt;')}
function highlightExcluded(s,exs){
  var result=escHtml(s);
  exs.forEach(function(excl){
    var pattern=escHtml(excl).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
    result=result.replace(new RegExp(pattern,'gi'),'<span style="color:#d32f2f;text-decoration:line-through;">$&</span>');
  });
  return result.replace(/\n\n/g,'<br><span style="display:block;height:0.6em"></span>')
               .replace(/\n/g,'<br>');
}

var exs=getAllExclusionTexts(t);
var x=wordcount(prefix);
var subtractTerms=[],totalSubtraction=0;
for(var i=0;i<exs.length;i++){
  var excl=exs[i];
  var y=wordcount(excl);
  var n=countOccurrences(prefix,excl);
  if(n>0){
    subtractTerms.push(y.toLocaleString()+'*'+n.toLocaleString());
    totalSubtraction+=n*y;
  }
}
var result=x-totalSubtraction;

var m=document.createElement('div');
m.style.cssText='position:fixed;top:20px;right:20px;background:#fff;padding:15px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:999999;font-family:sans-serif;width:360px;border:1px solid #ddd;max-height:calc(100vh - 40px);display:flex;flex-direction:column;overflow:hidden;';

var header=document.createElement('div');
header.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-shrink:0;';
var label=document.createElement('span');
label.style.cssText='font-size:13px;color:#666;display:flex;align-items:center;justify-content:space-between;width:100%';
label.innerHTML=TOPTEXT;
header.appendChild(label);

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
preview.style.cssText='font-size:11px;color:#444;font-family:monospace;line-height:1.2;flex:1 1 auto;min-height:0;overflow:auto;background:#f5f5f5;padding:8px;border-radius:3px;word-break:break-word;';
preview.innerHTML=highlightExcluded(prefix,exs);

var copy=document.createElement('button');
copy.id='wc-copy'; copy.type='button';
copy.style.cssText='margin-top:10px;padding:8px;background:#e3f2fd;border:2px dashed #2196F3;border-radius:3px;white-space:pre-wrap;font-size:9px;font-family:monospace;color:#1976D2;cursor:pointer;text-align:center;font-weight:bold;flex-shrink:0;';

function getSelectedTextInPreview(){
  var sel=window.getSelection();
  if(sel&&sel.rangeCount>0&&sel.toString().trim()){
    var range=sel.getRangeAt(0);
    if(preview.contains(range.commonAncestorContainer)){return sel.toString()}
  }
  return '';
}

function updateCopyButton(){
  var hasSelection=!!getSelectedTextInPreview();
  if(hasSelection){
    copy.style.background='#e3f2fd';
    copy.style.color='#1976D2';
    copy.style.cursor='pointer';
    copy.textContent='Copy exclusion tags';
  }else{
    copy.style.background='#f5f5f5';
    copy.style.color='#999';
    copy.style.cursor='default';
    copy.textContent='Highlight text to exclude from wordcount';
  }
}

updateCopyButton();
document.addEventListener('selectionchange',updateCopyButton);

copy.addEventListener('click',function(){
  var selectedText=getSelectedTextInPreview();
  if(!selectedText)return;
  var lines=[ST, selectedText, ET];
  navigator.clipboard.writeText(lines.join(String.fromCharCode(10)));
  copy.style.background='#c8e6c9';
  copy.textContent='Copied! Now hit paste at the end of your doc';
});

[header,tally,preview,copy].forEach(function(el){m.appendChild(el)});
document.body.appendChild(m);

function isTypingKey(e){
  if (e.ctrlKey || e.altKey || e.metaKey) return false; /* Shift is allowed */
  var k = e.key || '';
  return k.length === 1 /* any printable char, incl space */
      || k === 'Escape'
      || k === 'Enter' 
      || k === 'Tab' 
      || k === 'Backspace' 
      || k === 'Delete'
}

function cleanup(){
  if(m && m.parentNode)m.parentNode.removeChild(m);
  document.removeEventListener('click', clickHandler, true);
  document.removeEventListener('keydown', keyHandler, true);
}

function clickHandler(evt){if(!m || !m.contains(evt.target)) cleanup()}
function keyHandler(e){if(isTypingKey(e)) cleanup()}

/* Delay to avoid immediately catching the opening click, apparently */
setTimeout(function(){
  document.addEventListener('click', clickHandler, true);
  document.addEventListener('keydown', keyHandler, true);
}, 10);

},100); /* end of setTimeout */
})(); /* end of IIFE, end of tallyglot bookmarklet */
