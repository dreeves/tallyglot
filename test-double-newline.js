const { JSDOM } = require('jsdom');

function sanitize(s) {
  s = String(s ?? '');
  if (s.normalize) s = s.normalize('NFC');
  s = s.replace(/\r\n?/g, '\n');
  s = s.replace(/[\u00AD\u200B\u2060\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
  s = s.replace(/[\u2028\u2029]/g, '\n');
  s = s.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
  s = s.replace(/[ \t\f\v]+/g, ' ');
  s = s.replace(/[ \t\f\v]*\n[ \t\f\v]*/g, '\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s;
}

function extractText(html) {
  const dom = new JSDOM(html);
  const c = dom.window.document.body.firstChild;
  
  c.querySelectorAll('script,style,nav,footer,header,iframe').forEach(x => x.remove());
  
  // Add \n\n after each block (para spacing)
  c.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,td,th').forEach(el => {
    el.insertAdjacentText('afterend', '\n\n');
  });
  
  // Replace BR with single \n (line break)
  c.querySelectorAll('br').forEach(br => {
    br.replaceWith(dom.window.document.createTextNode('\n'));
  });
  
  const extracted = c.textContent;
  return sanitize(extracted);
}

function test(name, html, expected) {
  const result = extractText(html);
  const pass = result === expected;
  console.log(`${name}: ${pass ? '✓' : '✗'}`);
  if (!pass) {
    console.log(`  Expected: ${JSON.stringify(expected)}`);
    console.log(`  Got:      ${JSON.stringify(result)}`);
  }
}

console.log('Testing double newlines after blocks:\n');
test('P tags (para break)', '<div><p>Para 1</p><p>Para 2</p></div>', 'Para 1\n\nPara 2\n\n');
test('BR single (line break)', '<div>Line 1<br>Line 2</div>', 'Line 1\nLine 2');
test('BR double (para break)', '<div>Para 1<br><br>Para 2</div>', 'Para 1\n\nPara 2');
test('Mixed P and div', '<div><p>First</p><div>Second</div></div>', 'First\n\nSecond\n\n');
