// Test innerText behavior with JSDOM
const { JSDOM } = require('jsdom');

function test(name, html) {
  const dom = new JSDOM(html);
  const el = dom.window.document.body.firstChild;
  const text = el.textContent; // JSDOM doesn't support innerText, use textContent
  console.log(`${name}:`);
  console.log(`  Input: ${html}`);
  console.log(`  Output: ${JSON.stringify(text)}`);
  console.log(`  Newlines: ${(text.match(/\n/g) || []).length}`);
  console.log('');
}

test('Standard P tags', '<div><p>Para 1</p><p>Para 2</p></div>');
test('Divs', '<div><div>Para 1</div><div>Para 2</div></div>');
test('BR single', '<div>Line 1<br>Line 2</div>');
test('BR double', '<div>Para 1<br><br>Para 2</div>');
test('Mixed', '<div><p>Para</p><div>Another</div></div>');
