// Test script to trace newline handling

const testHTML = `
<div>
  <p>First paragraph.</p>
  <p>Second paragraph.</p>
  <p>Third with line<br>break inside.</p>
</div>
`;

// Simulate DOM extraction
const div = document.createElement('div');
div.innerHTML = testHTML;

// Add newlines before blocks (simulating our code)
const paras = div.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6');
paras.forEach(p => p.insertAdjacentText('beforebegin', '\n\n'));
const lines = div.querySelectorAll('br,li,td,th');
lines.forEach(l => l.insertAdjacentText('beforebegin', '\n'));

const extracted = div.innerText || div.textContent;

console.log('=== EXTRACTED TEXT ===');
console.log(JSON.stringify(extracted));
console.log('\n=== AFTER SANITIZE ===');

function sanitize(s) {
  s = String(s ?? '');
  if (s.normalize) s = s.normalize('NFC');
  s = s.replace(/\r\n?/g, '\n');
  s = s.replace(
    /[\u00AD\u200B\u2060\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
  s = s.replace(/[\u2028\u2029]/g, '\n');
  s = s.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
  s = s.replace(/[ \t\f\v]+/g, ' ');
  s = s.replace(/[ \t\f\v]*\n[ \t\f\v]*/g, '\n');
  s = s.replace(/\n+/g, '\n');  // THIS IS THE PROBLEM!
  return s;
}

const sanitized = sanitize(extracted);
console.log(JSON.stringify(sanitized));
console.log('\n=== IN PREVIEW (with white-space:pre-line) ===');
console.log('Single newlines become line breaks');
console.log('Double newlines would become paragraph spacing');
console.log('But we collapsed them all to single!');
