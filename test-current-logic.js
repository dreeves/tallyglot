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
  
  // Remove unwanted
  c.querySelectorAll('script,style,nav,footer,header,iframe').forEach(x => x.remove());
  
  // Current logic: Convert double BR
  let htmlStr = c.innerHTML;
  htmlStr = htmlStr.replace(/<br\s*\/?>/gi, '<br>');
  htmlStr = htmlStr.replace(/<br><br>/gi, '</p><p>');
  c.innerHTML = htmlStr;
  
  const extracted = c.textContent;
  return sanitize(extracted);
}

function test(name, html) {
  const result = extractText(html);
  console.log(`${name}:`);
  console.log(`  Result: ${JSON.stringify(result)}`);
  console.log(`  Newlines: ${(result.match(/\n/g) || []).length}`);
  console.log('');
}

test('P tags (want \\n\\n)', '<div><p>Para 1</p><p>Para 2</p></div>');
test('BR single (want \\n)', '<div>Line 1<br>Line 2</div>');
test('BR double (want \\n\\n)', '<div>Para 1<br><br>Para 2</div>');
