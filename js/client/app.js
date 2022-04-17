const socket = new WebSocket("ws://localhost:10241/chat", [])

socket.addEventListener("open", (event) => {
  socket.send("Hello Server!")
})

socket.addEventListener("message", (event) => {
  console.log("Message from server:", event.data)
})

