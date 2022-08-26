import OSC from 'osc-js'

const config = {
  wsServer: { port: 8080 },
  udpClient: { port: 9129 },
  udpServer: { port: 9130 },
}
const osc = new OSC({ plugin: new OSC.BridgePlugin(config) })

osc.on('/rms', message => {
  console.log("RMS", message.args)
})

osc.on('open', () => {
  console.log(`Port ${config.wsServer.port} is open now.`)
  console.log(`Will redirect RMS messages to UDP port ${config.udpClient.port}`)
})

osc.open()