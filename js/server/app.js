const http = require("http")
const { createHash } = require('crypto')
const net = require("net")

// magic string
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

const server = http.createServer((req, res) => {
  const body = http.STATUS_CODES[426]

  res.writeHead(426, {
    'Content-Length': body.length,
    'Content-Type': 'text/plain'
  })
  res.end(body)
})

server.listen(10241)

server.on("listening", () => {
  console.log("server listening")
})

server.on("error", (err) => {
  console.error("server error:", err)
})

server.on("upgrade", (req, socket, head) => {
  function socketOnError(err) {
    console.error("socket error:", err)
  }
  socket.on("error", socketOnError)

  const key = req.headers['sec-websocket-key']

  const digest = createHash("sha1").update(key + GUID).digest("base64")

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${digest}`
  ]

  socket.write(headers.concat('\r\n').join('\r\n'))

  socket.setTimeout(0)
  socket.setNoDelay()

  if (head.length > 0) socket.unshift(head)

  socket.on('close', () => {
    console.log("socket close")
  })
  socket.on('data', (chunk) => {
    receiveData(chunk, socket)
  })
  socket.on('end', () => {
    console.log("socket end")
  })

})

/**
 * receive data
 * @param {Buffer} chunk
 * @param {net.Socket} socket
 */
function receiveData(chunk, socket) {
  console.log(chunk)
  const arr = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.length / Uint8Array.BYTES_PER_ELEMENT)
  const fin = (arr[0] & 0x80) === 0x80
  const rsv1 = (arr[0] & 0x40) === 0x40
  const rsv2 = (arr[0] & 0x20) === 0x20
  const rsv3 = (arr[0] & 0x10) === 0x10
  const opcode = arr[0] & 0x0f
  const mask = (arr[1] & 0x80) === 0x80 // 客户端发给服务端必须设置 mask
  const payloadLength = arr[1] & 0x7f
  console.log(fin, rsv1, rsv2, rsv3, opcode, mask, payloadLength)

  const maskingKey = arr.slice(2, 6)

  const decoded = []
  for (let i = 0; i < payloadLength; ++i) {
    decoded.push(arr[i + 6] ^ maskingKey[i % 4])
  }

  const result = decoded.map(data => String.fromCharCode(data)).join('')
  console.log(result)

  const resData = "Hello Client!"
  const resDataByteLength = Buffer.byteLength(resData, "utf-8")
  const resBufferByteLength = 2 + resDataByteLength
  const resBuffer = Buffer.allocUnsafe(resBufferByteLength)
  const resArr = new Uint8Array(resBuffer.buffer, resBuffer.byteOffset, resBuffer.length / Uint8Array.BYTES_PER_ELEMENT)
  resArr[0] = 0x81
  resArr[1] = 0x0f & resDataByteLength
  resBuffer.fill(resData, 2, resBuffer.length, "utf-8") // 服务端发给客户端不需要 mask

  socket.write(resBuffer, (err) => {
    if (err) {
      console.log("write error:", err)
    }
    console.log("done")
  })
}
