const { createServer: createHttpsServer } = require("https");
const { createServer: createHttpServer } = require("http");
const { parse } = require("url");
const next = require("next");
const fs = require("fs");
const path = require("path");

const dev = true;
const hostname = "0.0.0.0";
const port = 4001;

// توليد شهادة SSL ذاتية التوقيع
function generateSelfSignedCert() {
  const certDir = path.join(__dirname, ".certs");
  const keyPath = path.join(certDir, "key.pem");
  const certPath = path.join(certDir, "cert.pem");

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  }

  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  const selfsigned = require("selfsigned");
  const attrs = [{ name: "commonName", value: "localhost" }];
  const pems = selfsigned.generate(attrs, {
    days: 365,
    keySize: 2048,
    algorithm: "sha256",
    extensions: [
      {
        name: "subjectAltName",
        altNames: [
          { type: 2, value: "localhost" },
          { type: 7, ip: "127.0.0.1" },
          { type: 7, ip: "192.168.100.182" },
        ],
      },
    ],
  });
  fs.writeFileSync(keyPath, pems.private);
  fs.writeFileSync(certPath, pems.cert);

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  let httpsOptions;
  try {
    httpsOptions = generateSelfSignedCert();
    console.log("✅ تم إنشاء شهادة SSL ذاتية التوقيع");
  } catch (err) {
    console.error("⚠️ فشل إنشاء شهادة HTTPS:", err.message);
    console.log("⚠️ سيتم التشغيل بـ HTTP فقط");
  }

  // HTTPS Server
  if (httpsOptions) {
    const httpsServer = createHttpsServer(httpsOptions, async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error:", err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    });

    httpsServer.listen(port, hostname, () => {
      console.log(`\n🔒 HTTPS Server ready on:`);
      console.log(`   ➜ Local:   https://localhost:${port}`);
      console.log(`   ➜ Network: https://192.168.100.182:${port}`);
      console.log(`\n📱 افتح الرابط أعلاه من هاتفك للوصول للكاميرا\n`);
    });
  }

  // HTTP redirect server on port 4000
  const httpServer = createHttpServer((req, res) => {
    if (httpsOptions) {
      // إعادة توجيه HTTP إلى HTTPS
      const host = req.headers.host?.replace(/:\d+$/, "") || "localhost";
      res.writeHead(301, { Location: `https://${host}:${port}${req.url}` });
      res.end();
    } else {
      // إذا HTTPS فشل، نشغل HTTP عادي
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }
  });

  httpServer.listen(4000, hostname, () => {
    if (httpsOptions) {
      console.log(`↪️  HTTP→HTTPS redirect on http://0.0.0.0:4000`);
    } else {
      console.log(`\n⚡ HTTP Server ready on http://0.0.0.0:4000\n`);
    }
  });
}

main().catch(console.error);
