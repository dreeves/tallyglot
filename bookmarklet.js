javascript:(function(){setTimeout(function(){

var VER='2025.11.17-a';
var ST='BEGIN_WORDCOUNT_EXCLUSION';
var ET='END_WORDCOUNT_EXCLUSION';
var CONSEL=[ /* Content selectors to try in order */
'.content', /* LessWrong */
'textarea[aria-label="Markdown value"]', /* gissue */
'.tiptap', /* Substack */
'textarea.pencraft', /* Substack comment */
'body',
'textarea.MuiTextarea-textarea.MuiInputBase-input', /* LessWrong title */
'input[aria-label*="title"]', /* gissue title */
'textarea[aria-label*="description"]',
'textarea',
'article',
'main',
/* 'textarea.comment-form-textarea', #SCHDEL */
/* '.PostsPage-postContent', #SCHDEL */
/* '.PostBody-root', #SCHDEL */
];

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

/* Wordcount algorithm:
  - Split by whitespace into tokens
  - Count tokens w/ >=1 meat characters
  - Meat = letters (\p{L}), numbers (\p{N}), or emoji
  - Scaffold = apostrophes/hyphens/punctuation */
function tallyho(s){
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

function nrmlz(s){return String(s||'').replace(/\s+/g,' ').trim()}
function scount(txt, sub) {
  var needle=nrmlz(sub);if(!needle)return 0;
  var haystack=nrmlz(txt);
  if(!haystack)return 0;
  return haystack.split(needle).length-1
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

var txt='',sel='';
for(var i=0;i<CONSEL.length;i++){
  var el=document.querySelector(CONSEL[i]);if(!el)continue;
  /* textareas/inputs: use .value */
  if(el.tagName==='TEXTAREA'||el.tagName==='INPUT'){
    txt=el.value||'';
    if(txt.trim()){sel=CONSEL[i];break}continue
  }
  /* other elements: clone & extract text */
  var c=el.cloneNode(true);
  c.querySelectorAll('script,style,nav,footer,header,iframe').forEach(function(x){x.remove()});
  /* preserve line breaks, paragraph breaks */
  c.querySelectorAll('br').forEach(function(br){
    var tn=document.createTextNode('¶BR¶');
    br.parentNode.replaceChild(tn,br)
  });
  c.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,td,th').forEach(function(el){el.insertAdjacentText('afterend','¶PARA¶')});
  txt=(c.innerText||c.textContent);
  /* Placeholders back to newlines */
  txt=txt.replace(/\s*¶BR¶\s*/g,'\n').replace(/\s*¶PARA¶\s*/g,'\n\n');
  if(txt.trim()){sel=CONSEL[i];break}
}

var t=sanitize(txt).trim(); /* probably keep using txt instead of t? */
var fi=t.indexOf(ST); /* final index to care about; if -1 then make it txt.length */
var prefix=t.slice(0,fi===-1?t.length:fi);
var exs=getExclusions(t);
var pwc=tallyho(prefix);
var minusTerms=[],s=0;
for(var i=0;i<exs.length;i++){
  var excl=exs[i];
  var xwc=tallyho(excl);
  var n=scount(prefix,excl);
  minusTerms.push(xwc.toLocaleString()+'×'+n);
  s+=n*xwc
}
var twc=pwc-s;

var m=document.createElement('div');
m.style.cssText='position:fixed;top:20px;right:20px;background:#fff;padding:15px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:999999;font-family:sans-serif;width:360px;border:1px solid #ddd;max-height:calc(100vh - 40px);display:flex;flex-direction:column;overflow:hidden;';
m.appendChild(document.createElement('style')).innerHTML='a{color:inherit}.ns{flex-shrink:0}.mb{margin-bottom:10px}.mn{font-family:monospace}.r3{border-radius:3px}.p8{padding:8px}.lh{line-height:1.2}.bld{font-weight:bold}.tc{text-align:center}';

var tg=document.createElement('div');
tg.className='ns mb lh bld';
tg.style.cssText='font-size:24px;color:#333';
tg.textContent=pwc.toLocaleString()+' – '+(minusTerms.length>0?minusTerms.join(' – '):'0')+' = '+twc.toLocaleString()+" words:";

var words=document.createElement('div');
words.className='mn r3 p8 lh';
words.style.cssText='font-size:11px;color:#444;flex:1 1 auto;min-height:0;overflow:auto;background:#f5f5f5';
words.innerHTML=highlightExcluded(prefix,exs);

var cb=document.createElement('button');
cb.className='ns mn r3 p8 bld tc';
cb.style.cssText='margin-top:10px;background:#e3f2fd;border:2px dashed #2196F3;font-size:9px;color:#1976D2';

/* Return whatever text in the popup is highlighted */
function getsel(){
  var sel=window.getSelection();
  if(sel&&sel.rangeCount>0&&sel.toString().trim()){
    var range=sel.getRangeAt(0);
    if(words.contains(range.commonAncestorContainer)){return sel.toString()}
  }
  return ''
}

function buttonup(){
  var hi=!!getsel();
  cb.style.background=hi?'#e3f2fd':'#f5f5f5';
  cb.style.color=hi?'#1976D2':'#999';
  cb.style.cursor=hi?'pointer':'default';
  cb.textContent=hi?'Copy exclusion tags'
                   :'Highlight text to exclude from wordcount'
}
buttonup();
document.addEventListener('selectionchange',buttonup);

cb.addEventListener('click',function(){
  var t=getsel();if(!t)return;
  navigator.clipboard.writeText([ST,t,ET].join('\n'));
  cb.style.background='#c8e6c9';
  cb.textContent='Copied! Now hit paste at the end of your doc'
});

var footer=document.createElement('div');
footer.style.cssText='display:flex;justify-content:space-between;margin-top:8px;font-size:9px;color:#999';

var gh=document.createElement('a');
gh.href='https://github.com/dreeves/tallyglot';
gh.target='_blank';
gh.textContent='Tallyglot v'+VER;

var dbg=document.createElement('a');
dbg.href='#';
dbg.textContent='debug link';
dbg.addEventListener('click',function(e){
  e.preventDefault();
  var w=window.open('','_blank'),h='<style>body{font:12px monospace;padding:20px}h2{border-bottom:1px solid #333}pre{background:#f5f5f5;padding:10px;overflow:auto;white-space:pre-wrap}</style><h1>Tallyglot Debug Page</h1><h2>Use the first of these that's nonempty:</h2>';
  function add(label,content){
    var wc=' <small style="color:#999">('+tallyho(content)+' words)</small>';
    h+='<h3>'+label+wc+'</h3><pre>'+escHtml(content)+'</pre>'
  }
  function buildSel(e){
    var s=e.tagName.toLowerCase();
    if(e.id)s+='#'+e.id;
    if(e.className)s+='.'+e.className.split(/\s+/).join('.');
    return s
  }
  CONSEL.forEach(function(s){
    var e=document.querySelector(s),v=e?(e.tagName==='TEXTAREA'||e.tagName==='INPUT'?e.value:(e.innerText||'')):'';
    var m=e?' <small style="color:#666">→ '+buildSel(e)+'</small>':'';
    add(s+m+(s===sel?' ✓':''),v)
  });
  h+='<h2>Inputs/Textareas</h2>';
  document.querySelectorAll('input[type="text"],input:not([type]),textarea').forEach(function(e){
    add(buildSel(e),e.value||'')
  });
  h+='<h2>Contenteditable Elements</h2>';
  document.querySelectorAll('[contenteditable="true"],[role="textbox"]').forEach(function(e){
    add(buildSel(e)+'[contenteditable="true"]',e.innerText||e.textContent||'')
  });
  w.document.documentElement.innerHTML=h
});

footer.appendChild(gh);
footer.appendChild(dbg);

[tg,words,cb,footer].forEach(function(el){m.appendChild(el)});
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
  document.removeEventListener('keydown', keyHandler, true)
}

function clickHandler(evt){if(!m || !m.contains(evt.target)) cleanup()}
function keyHandler(e){if(isTypingKey(e)) cleanup()}

/* Delay to not immediately catch the opening click? */
setTimeout(function(){
  document.addEventListener('click', clickHandler, true);
  document.addEventListener('keydown', keyHandler, true)
}, 10)

},100) /* end of setTimeout */
/* NB: We're near the bookmarklet length limit, at least for Google Chrome. This comment can be jettisoned if needed. Or lengthen it to see just how much space we have left before Chrome starts truncating it when you paste it in. I think Firefox allows something longer but am not sure now. Might be worth looking up the length limit for other browsers. We're currently doing a fair bit of ugly compression in the above code, with a fair bit more possible, like by actually minifying it. */
})(); /* end of IIFE, end of tallyglot bookmarklet */
