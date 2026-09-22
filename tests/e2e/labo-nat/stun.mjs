/* STUN minimal (RFC 5389) : répond à Binding Request avec XOR-MAPPED-ADDRESS.
   C'est tout ce qu'un navigateur demande pour apprendre son adresse publique. */
import dgram from 'node:dgram';
const COOKIE = 0x2112A442;
const ports = (process.argv[2] || '19302,3478').split(',').map(Number);
for (const port of ports){
  const s = dgram.createSocket('udp4');
  s.on('message', (m, r) => {
    if (m.length < 20 || m.readUInt16BE(0) !== 0x0001 || m.readUInt32BE(4) !== COOKIE) return;
    const tid = m.subarray(8, 20);
    const attr = Buffer.alloc(12);
    attr.writeUInt16BE(0x0020, 0); attr.writeUInt16BE(8, 2);
    attr.writeUInt8(0, 4); attr.writeUInt8(1, 5);
    attr.writeUInt16BE(r.port ^ 0x2112, 6);
    const ip = r.address.split('.').reduce((a, b) => (a << 8) + Number(b), 0) >>> 0;
    attr.writeUInt32BE((ip ^ COOKIE) >>> 0, 8);
    const head = Buffer.alloc(20);
    head.writeUInt16BE(0x0101, 0); head.writeUInt16BE(attr.length, 2);
    head.writeUInt32BE(COOKIE, 4); tid.copy(head, 8);
    s.send(Buffer.concat([head, attr]), r.port, r.address);
    if (process.env.STUN_LOG) console.log('stun', port, r.address + ':' + r.port);
  });
  s.bind(port, process.env.STUN_IP || '100.64.9.1', () => console.log('STUN prêt sur ' + port));
}
