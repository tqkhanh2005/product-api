const fs = require('node:fs');
const path = require('node:path');
function item(name, method, endpoint, body, code, extra = []) {
  const request = { method, url: '{{baseUrl}}' + endpoint, header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [] };
  if (body) request.body = { mode: 'raw', raw: typeof body === 'string' ? body : JSON.stringify(body), options: { raw: { language: 'json' } } };
  return { name, request, event: [{ listen: 'test', script: { type: 'text/javascript', exec: [`pm.test('HTTP ${code}',()=>pm.response.to.have.status(${code}));`, ...extra] } }] };
}
const collection = { info: { name: 'P1 Product CRUD and health', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' }, variable: [{ key: 'baseUrl', value: 'http://localhost:3000' }, { key: 'pid', value: '' }], item: [
  item('Health including MongoDB', 'GET', '/api/health', undefined, 200, ["pm.test('MongoDB connected',()=>pm.expect(pm.response.json().dependencies.mongodb).to.eql('connected'));"]),
  item('Create Product', 'POST', '/api/products', { pname: 'Postman Laptop', price: 1500, quantity: 10 }, 201, ["if(pm.response.code===201)pm.collectionVariables.set('pid',pm.response.json().pid);"]),
  item('List Product', 'GET', '/api/products', undefined, 200),
  item('Get Product', 'GET', '/api/products/{{pid}}', undefined, 200),
  item('Update Product', 'PUT', '/api/products/{{pid}}', { price: 1400, quantity: 9 }, 200),
  item('Verify updated Product', 'GET', '/api/products/{{pid}}', undefined, 200, ["pm.test('Updated stock and price',()=>{pm.expect(pm.response.json().quantity).to.eql(9);pm.expect(pm.response.json().price).to.eql(1400);});"]),
  item('Duplicate pid', 'POST', '/api/products', '{"pid":{{pid}},"pname":"Duplicate","price":1,"quantity":1}', 409),
  item('Invalid price', 'POST', '/api/products', { pname: 'Invalid', price: -1, quantity: 1 }, 400),
  item('Empty update', 'PUT', '/api/products/{{pid}}', {}, 400),
  item('Delete Product', 'DELETE', '/api/products/{{pid}}', undefined, 200),
  item('Confirm deleted', 'GET', '/api/products/{{pid}}', undefined, 404),
] };
fs.mkdirSync(path.join(__dirname, '../postman'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../postman/P1.postman_collection.json'), JSON.stringify(collection, null, 2));
