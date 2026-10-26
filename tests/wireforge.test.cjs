const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));

function functionSource(name, endMarker) {
  const start = script.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, 'missing function ' + name);
  const end = script.indexOf(endMarker, start);
  assert.notEqual(end, -1, 'missing end marker for ' + name);
  return script.slice(start, end).trim();
}

test('inline application JavaScript parses', () => {
  assert.ok(script.length > 1000);
  assert.doesNotThrow(() => new Function(script));
});

test('E90 starter topology has stable expected shape and connected endpoints', () => {
  const source = functionSource('e90ProjectStarter', String.fromCharCode(10) + 'let S=');
  const mkW = (a, b, options) => Object.assign({
    id: 0, a, b, sig: '', awg: 18, color: '', len: 0, amps: 0, fuse: '', fa: 0
  }, options);
  const project = new Function('mkW', source + '; return e90ProjectStarter();')(mkW);
  assert.equal(project.parts.length, 59); // updated starter fixture after intentional breakout cleanup
  assert.equal(project.wires.length, 96); // current starter netlist size
  assert.ok(project.wires.every(w => w.autoRoute === true), 'E90 example wires use the cleaner orthogonal routing mode');
  const partIds = new Set(project.parts.map(p => String(p.id)));
  assert.equal(partIds.size, project.parts.length, 'part IDs must be unique');
  assert.equal(new Set(project.wires.map(w => String(w.id))).size, project.wires.length, 'wire IDs must be unique');
  assert.ok(partIds.has('161'), 'trunk DT6 is present');
  for (const id of ['163', '164', '165']) assert.ok(partIds.has(id), 'cabin DT2 ' + id + ' is present');
  for (const wire of project.wires) {
    for (const endpoint of [wire.a, wire.b]) {
      assert.ok(endpoint && partIds.has(String(endpoint.p)), 'every wire endpoint resolves to a part');
      assert.ok(Number.isInteger(Number(endpoint.i)) && Number(endpoint.i) >= 0, 'pin indices are non-negative integers');
    }
  }
  assert.ok(script.includes("id:'ECU-MOTOR-OUTPUT'"), 'muffler output conflict remains documented in the Harness Book seed');
});

test('voltage-drop estimate uses round-trip copper resistance', () => {
  const source = functionSource('electricalEstimate', String.fromCharCode(10) + 'function loadElectricalWire');
  const estimate = new Function(source + '; return electricalEstimate;')();
  const result = estimate(14, 20, 10, 14);
  assert.ok(result);
  assert.equal(result.drop, 1.01);
  assert.ok(Math.abs(result.pct - 7.2142857) < 0.01);
  assert.equal(result.loadV, 12.99);
  assert.ok(Math.abs(result.loss - 20.2) < 0.0001);
  assert.equal(estimate(0, 20, 10, 14), null);
  assert.equal(estimate(14, -1, 10, 14), null);
  assert.equal(estimate(14, 20, 10, 5), null, 'unsupported gauge should not silently calculate');
  assert.ok(estimate(14, 20, 10, 0), 'large conductors must be supported');
});

test('CSV formatter escapes commas, quotes and newlines', () => {
  const start = script.indexOf('const csv=rows=>');
  const end = script.indexOf(String.fromCharCode(10) + 'const dotColor', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const csv = new Function(script.slice(start, end).trim() + '; return csv;')();
  assert.equal(csv([['header'], ['comma,value'], ['say "hi"'], ['two' + String.fromCharCode(10) + 'lines']]),
    ['header','"comma,value"','"say ""hi"""','"two' + String.fromCharCode(10) + 'lines"'].join(String.fromCharCode(10)));
});

test('safety and backup affordances are present', () => {
  for (const token of [
    'function runProjectSelfTests()',
    'function validateBackupObject(o)',
    'function downloadBackup()',
    'function applyElectricalToWire()',
    "case'runSelfTests'",
    "case'downloadAudit'",
    "case'bkDownload'",
    'output assignment conflict',
    'not an electrical safety certification'
  ]) assert.ok(script.toLowerCase().includes(token.toLowerCase()), 'expected source token: ' + token);
});

test('Power Budget and filtered wire schedule features are wired into the app', () => {
  for (const token of [
    "['power','Power Budget']",
    'function rPower()',
    'function downloadPowerBudget()',
    'function downloadProjectReport()',
    "case'savePowerVoltage'",
    "case'downloadPower'",
    "case'powerReport'",
    'id="wireSearch"',
    'id="wireFilter"',
    "filter==='missing'",
    "filter==='powered'",
    'drawing-estimate',
    'may double-count loads'
  ]) assert.ok(script.includes(token), 'expected feature token: ' + token);
});

test('Power budget groups are described as segment-level estimates, not safety certification', () => {
  const start = script.indexOf('function rPower()');
  const end = script.indexOf('function downloadPowerBudget()', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const power = script.slice(start, end);
  assert.ok(power.includes('new Map()'));
  assert.ok(power.includes('unknownCurrent'));
  assert.ok(power.includes('unknownFuse'));
  assert.ok(power.includes('wire segments'));
  assert.ok(power.includes('safety certification'));
});
