// server.js — Tiny proxy server to bypass Anthropic CORS restriction
// Run: node server.js
// Then start React: npm run dev
// React calls http://localhost:3001/api/anthropic → this proxies to https://api.anthropic.com

const express = require('express')
const cors = require('cors')
const https = require('https')

const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '50mb' }))

app.post('/api/anthropic', (req, res) => {
  const apiKey = req.headers['x-api-key']
  if (!apiKey) {
    return res.status(400).json({ error: 'Missing x-api-key header' })
  }

  const body = JSON.stringify(req.body)

  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  }

  const proxyReq = https.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode)
    res.setHeader('Content-Type', 'application/json')

    let data = ''
    proxyRes.on('data', chunk => { data += chunk })
    proxyRes.on('end', () => {
      res.send(data)
    })
  })

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message)
    res.status(500).json({ error: err.message })
  })

  proxyReq.write(body)
  proxyReq.end()
})

app.listen(PORT, () => {
  console.log(`\n✅ Anthropic proxy running at http://localhost:${PORT}`)
  console.log(`   POST /api/anthropic  →  https://api.anthropic.com/v1/messages`)
  console.log(`\n   Now start React in another terminal: npm run dev\n`)
})
