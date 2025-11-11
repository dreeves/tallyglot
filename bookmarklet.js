javascript:(function(){
  
setTimeout(function(){
  var title='',h1=document.querySelector('h1,.PostsPage-title'),
    tt=document.querySelector('title');
  if(h1){title=(h1.innerText||h1.textContent).trim();}
  else if(tt){title=(tt.innerText||tt.textContent).trim();}

  var sels=['article','main',
            '.PostsPage-postContent',
            '.PostBody-root','.content','body'],e=null;
  for(var i=0;i<sels.length;i++){e=document.querySelector(sels[i]);if(e)break;}
  if(!e)e=document.body;

  var c=e.cloneNode(true);
  c.querySelectorAll('script,style,nav,footer,header,iframe')
    .forEach(function(x){x.remove();});
  c.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,td,th,br').forEach(function(b){
    if(b.tagName==='BR'){b.replaceWith(document.createTextNode(' '));}
    else{b.insertAdjacentText('afterend',' ');} 
  });

  function sanitize(s){
    s=String(s||'');
    var inv=[8203,8204,8205,8288,65279,173];
    for(var i=0;i<inv.length;i++){s=s.split(String.fromCharCode(inv[i])).join('');}
    s=s.split(String.fromCharCode(160)).join(' ');
    return s;
  }

  var t=sanitize((c.innerText||c.textContent)).trim();
  if(title && t.indexOf(title)!==0) t=title+' '+t;

  var ST='BEGIN_TEXT_TO_SUBTRACT_THE_WORDCOUNT_OF', 
    ET='END_TEXT_TO_SUBTRACT_THE_WORDCOUNT_OF';

  function getBase(s){
    var le=s.lastIndexOf(ET);
    if(le!==-1) return s.slice(0,le+ET.length);
    var fb=s.indexOf(ST);
    return fb!==-1 ? s.slice(0,fb) : s;
  }
  function getPrefixToFirst(s){ 
    var fi=s.indexOf(ST); 
    return fi!==-1 ? s.slice(0,fi) : s; }
  var base=getBase(t);

  /* ASCII word tokens with optional internal apostrophes/hyphens. "--" does not count. */
  var WORD=/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g;
  function countWords(s){ 
    s=sanitize(String(s)).trim(); 
    if(!s) return 0; 
    var m=s.match(WORD); 
    return m?m.length:0; }

  function sumExcluded(s){
    var sum=0,i=0,a,b;
    while((a=s.indexOf(ST,i))!==-1 && (b=s.indexOf(ET,a+ST.length))!==-1){
      sum += countWords(s.slice(a+ST.length,b));
      i=b+ET.length;
    }
    return sum;
  }
  function stripBlocks(s){
    var out='',i=0,a,b;
    while((a=s.indexOf(ST,i))!==-1 && (b=s.indexOf(ET,a+ST.length))!==-1){
      out += s.slice(i,a);
      i = b + ET.length;
    }
    return out + s.slice(i);
  }
  function escHtml(s){ 
    return String(s).replace(/&/g,'&amp;')
                    .replace(/</g,'&lt;')
                    .replace(/>/g,'&gt;'); }
  function highlightExcluded(s){
    var b=getBase(s), out='', i=0, a, b2;
    while((a=b.indexOf(ST,i))!==-1 && (b2=b.indexOf(ET,a+ST.length))!==-1){
      out += escHtml(b.slice(i,a));
      out += '<span style="color:#d32f2f;text-decoration:line-through;">' 
          + escHtml(b.slice(a+ST.length,b2)) + '</span>';
      i=b2+ET.length;
    }
    out += escHtml(b.slice(i));
    return out;
  }

  var excludedWords=sumExcluded(base);
  var shown=stripBlocks(base);
  var wPrefix=countWords(getPrefixToFirst(base));
  var wShown=countWords(shown);

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
  tally.textContent=
    wPrefix.toLocaleString()+' - '+excludedWords.toLocaleString()+' = '
    +wShown.toLocaleString();

  var preview=document.createElement('div');
  preview.className='wc-preview';
  preview.style.cssText='font-size:11px;color:#444;font-family:monospace;line-height:1.4;flex:1 1 auto;min-height:0;overflow:auto;background:#f5f5f5;padding:8px;border-radius:3px;white-space:pre-wrap;word-break:break-word;';
  preview.innerHTML=highlightExcluded(t);

  var copy=document.createElement('button');
  copy.id='wc-copy'; copy.type='button';
  copy.style.cssText='margin-top:10px;padding:8px;background:#e3f2fd;border:2px dashed #2196F3;border-radius:3px;white-space:pre-wrap;font-size:9px;font-family:monospace;color:#1976D2;cursor:pointer;text-align:center;font-weight:bold;flex-shrink:0;';
  copy.textContent='Copy exclusion tags';
  copy.addEventListener('click',function(){
    var lines=['BEGIN_TEXT_TO_SUBTRACT_THE_WORDCOUNT_OF',
"paste text here that shouldn't get counted in the word count  \n(notice how this text has 24 words which get subtracted from the count)  ",
               'END_TEXT_TO_SUBTRACT_THE_WORDCOUNT_OF'];
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

  function cleanup(){ if(m&&m.parentNode) m.parentNode.removeChild(m); 
    document.removeEventListener('click',closeHandler,true); 
    document.removeEventListener('keydown',keyHandler,true); }
  function closeHandler(evt){ if(!m.contains(evt.target)) cleanup(); }
  function keyHandler(e){ if((e.key||'')==='Escape') cleanup(); }

  close.addEventListener('click',function(e){ 
    e.preventDefault(); e.stopPropagation(); cleanup(); }, {capture:true});
  setTimeout(function(){
    document.addEventListener('click',closeHandler,true); 
    document.addEventListener('keyup',keyHandler,true); 
  },10);
},100);
  
})();
