javascript:(function(){setTimeout(function(){

var VER='2025.11.14-d';
var TOPTEXT='<span>Word Count</span><span style="margin-left:auto">'
  +'<small>[tallyglot v'+VER+']</small></span>';
var ST='BEGIN_WORDCOUNT_EXCLUSION';
var ET='END_WORDCOUNT_EXCLUSION';

/* Selector config: try these in order to find prose to wordcount */
var contentSelectors=[
  '.content', /* LessWrong */
  'textarea[aria-label="Markdown value"]', /* gissue */
  '.tiptap[contenteditable="true"]', /* Substack */
  'body',
  'textarea.MuiTextarea-textarea:not([aria-hidden])', /* LessWrong title */
  'input[aria-label="Add a title"]', /* gissue title */
  'textarea[aria-label*="description"]',
  'textarea.comment-form-textarea',
  'article',
  'main',
  '.PostsPage-postContent',
  '.PostBody-root',
];

var bodyText='',sel='';
for(var i=0;i<contentSelectors.length;i++){
  var el=document.querySelector(contentSelectors[i]);
  if(!el)continue;
  sel=contentSelectors[i];
  /* textareas/inputs: use .value */
  if(el.tagName==='TEXTAREA'||el.tagName==='INPUT'){bodyText=el.value||'';break}
  /* other elements: clone & extract text */
  var c=el.cloneNode(true);
  c.querySelectorAll('script,style,nav,footer,header,iframe').forEach(function(x){x.remove()});
  /* preserve line breaks, paragraph breaks */
  c.querySelectorAll('br').forEach(function(br){
    var tn=document.createTextNode('¶BR¶');
    br.parentNode.replaceChild(tn,br);
  });
  c.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,td,th').forEach(function(el){el.insertAdjacentText('afterend','¶PARA¶')});
  bodyText=(c.innerText||c.textContent);
  /* Placeholders back to newlines */
  bodyText=bodyText.replace(/\s*¶BR¶\s*/g,'\n').replace(/\s*¶PARA¶\s*/g,'\n\n');
  if(bodyText.trim())break;
}

/* AI-generated black magic:
  - NFC normalize; CRLF -> \n
  - Unicode spaces to ascii (LSEP/PSEP -> \n)
  - Drop invisibles (BOM, ZWSP, SHY, bidi controls, isolates)
  - KEEP emoji machinery: ZWJ (U+200D) and VS16 (U+FE0F) */
function sanitize(s){
  s=String(s??'');
  if(s.normalize)s=s.normalize('NFC');
  s=s.replace(/\r\n?/g,'\n');
  s=s.replace(/[\u00AD\u200B\u2060\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069]/g,'');
  s=s.replace(/[\u2028\u2029]/g,'\n');
  s=s.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g,' ');
  s=s.replace(/[ \t\f\v]+/g,' ');
  s=s.replace(/[ \t\f\v]*\n[ \t\f\v]*/g,'\n');
  s=s.replace(/\n{3,}/g,'\n\n');
  return s
}

/* Algorithm:
  - Split by whitespace into tokens
  - Count tokens w/ >=1 meat characters
  - Meat = letters (\p{L}), numbers (\p{N}), or emoji
  - Scaffold = apostrophes/hyphens/punctuation */
function wordcount(s){
  s=sanitize(s);if(!s)return 0;
  var tokens=s.split(/\s+/);
  var pic;try{pic=new RegExp('\\p{Extended_Pictographic}','u')}
  catch{pic=/[\u2600-\u27BF\u{1F300}-\u{1FAFF}]/u}
  var meat=/[\p{L}\p{N}]/u;
  var n=0;
  for(var i=0;i<tokens.length;i++){
    var t=tokens[i];
    if(t&&(meat.test(t)||pic.test(t)))n++
  }
  return n
}

var t=sanitize(bodyText).trim();
var fi=t.indexOf(ST);
var prefix=t.slice(0,fi===-1?t.length:fi);

function getExclusions(s){
  var exc=[],pos=0;
  while(true){
    var a=s.indexOf(ST,pos),b=a===-1?-1:s.indexOf(ET,a+ST.length);
    if(a===-1||b===-1)break;
    exc.push(s.slice(a+ST.length,b).trim());
    pos=b+ET.length;
  }
  return exc
}
  
function subcount(txt,sub){
  var subnorm=sub.replace(/\s+/g,' ').trim();
  if(!subnorm)return 0;
  var txtnorm=txt.replace(/\s+/g,' ').trim();
  var n=0,i=0;
  while((i=txtnorm.indexOf(subnorm,i))!==-1){n++;i+=subnorm.length}
  return n
}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function highlightExcluded(s,exs){
  var result=escHtml(s);
  exs.forEach(function(excl){
    var pattern=escHtml(excl).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
    result=result.replace(new RegExp(pattern,'gi'),'<span style="color:#d32f2f;text-decoration:line-through;">$&</span>');
  });
  return result.replace(/\n\n/g,'<br><span style="display:block;height:0.6em"></span>').replace(/\n/g,'<br>')
}

var exs=getExclusions(t);
var pwc=wordcount(prefix);
var minusTerms=[],s=0;
for(var i=0;i<exs.length;i++){
  var excl=exs[i];
  var xwc=wordcount(excl);
  var n=subcount(prefix,excl);
  if(n>0){minusTerms.push(xwc.toLocaleString()+'×'+n);s+=n*xwc}
}
var twc=pwc-s;

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
if(minusTerms.length>0){
  tally.textContent=pwc.toLocaleString()+' – '+minusTerms.join(' – ')+' = '
    +twc.toLocaleString();
}else{tally.textContent=pwc.toLocaleString()+' – 0 = '+twc.toLocaleString()}

var preview=document.createElement('div');
preview.className='wc-preview';
preview.style.cssText='font-size:11px;color:#444;font-family:monospace;line-height:1.2;flex:1 1 auto;min-height:0;overflow:auto;background:#f5f5f5;padding:8px;border-radius:3px;word-break:break-word;';
preview.innerHTML=highlightExcluded(prefix,exs);

var copy=document.createElement('button');
copy.id='wc-copy'; copy.type='button';
copy.style.cssText='margin-top:10px;padding:8px;background:#e3f2fd;border:2px dashed #2196F3;border-radius:3px;white-space:pre-wrap;font-size:9px;font-family:monospace;color:#1976D2;cursor:pointer;text-align:center;font-weight:bold;flex-shrink:0;';

/* Return whatever text in the popup is highlighted */
function getsel(){
  var sel=window.getSelection();
  if(sel&&sel.rangeCount>0&&sel.toString().trim()){
    var range=sel.getRangeAt(0);
    if(preview.contains(range.commonAncestorContainer)){return sel.toString()}
  }
  return ''
}

function buttonup(){
  var hi=!!getsel();
  copy.style.background=hi?'#e3f2fd':'#f5f5f5';
  copy.style.color=hi?'#1976D2':'#999';
  copy.style.cursor=hi?'pointer':'default';
  copy.textContent=hi?'Copy exclusion tags'
                     :'Highlight text to exclude from wordcount';
}
buttonup();
document.addEventListener('selectionchange',buttonup);

copy.addEventListener('click',function(){
  var selectedText=getsel();
  if(!selectedText)return;
  var lines=[ST, selectedText, ET];
  navigator.clipboard.writeText(lines.join(String.fromCharCode(10)));
  copy.style.background='#c8e6c9';
  copy.textContent='Copied! Now hit paste at the end of your doc';
});

var dbg=document.createElement('a');
dbg.href='#';
dbg.style.cssText='font-size:9px;color:#999;text-align:center;margin-top:8px;text-decoration:none;';
dbg.textContent='[debug]';
dbg.addEventListener('click',function(e){
  e.preventDefault();
  var w=window.open('','_blank'),h='<style>body{font:12px monospace;padding:20px}h2{border-bottom:1px solid #333}pre{background:#f5f5f5;padding:10px;overflow:auto;white-space:pre-wrap}</style><h1>Tallyglot Debug</h1><h2>contentSelectors</h2>';
  contentSelectors.forEach(function(s){
    var e=document.querySelector(s),v=e?(e.tagName==='TEXTAREA'||e.tagName==='INPUT'?e.value:(e.innerText||'')):'';
    h+='<h3>'+escHtml(s)+(s===sel?' ✓':'')+'</h3><pre>'+escHtml(v)+'</pre>';
  });
  h+='<h2>Inputs/Textareas</h2>';
  document.querySelectorAll('input[type="text"],input:not([type]),textarea').forEach(function(e){
    var v=e.value||'';
    if(v.trim()){
      var attrs=e.tagName;
      if(e.id)attrs+=' #'+e.id;
      if(e.name)attrs+=' name="'+e.name+'"';
      if(e.className)attrs+=' class="'+e.className+'"';
      var arias=[];
      for(var i=0;i<e.attributes.length;i++){
        var a=e.attributes[i];
        if(a.name.startsWith('aria-'))arias.push(a.name+'="'+a.value+'"');
      }
      if(arias.length)attrs+=' '+arias.join(' ');
      h+='<h3>'+escHtml(attrs)+'</h3><pre>'+escHtml(v.substring(0,200))+'</pre>';
    }
  });
  h+='<h2>Contenteditable Elements</h2>';
  document.querySelectorAll('[contenteditable="true"],[role="textbox"]').forEach(function(e){
    var v=(e.innerText||e.textContent||'');
    if(v.trim()){
      var attrs=e.tagName;
      if(e.id)attrs+=' #'+e.id;
      if(e.className)attrs+=' class="'+e.className+'"';
      if(e.getAttribute('role'))attrs+=' role="'+e.getAttribute('role')+'"';
      attrs+=' [contenteditable]';
      h+='<h3>'+escHtml(attrs)+'</h3><pre>'+escHtml(v.substring(0,200))+'</pre>';
    }
  });
  w.document.documentElement.innerHTML=h;
});

[header,tally,preview,copy,dbg].forEach(function(el){m.appendChild(el)});
document.body.appendChild(m);

function isTypingKey(e){
  if(e.ctrlKey || e.altKey || e.metaKey) return false; /* Shift is allowed */
  var k = e.key || '';
  return k.length === 1 /* printable chars, incl space */
  || k==='Escape' || k==='Enter' || k==='Tab' || k==='Backspace' || k==='Delete'
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
