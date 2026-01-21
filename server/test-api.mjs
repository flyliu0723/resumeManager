import http from 'http'

async function test() {
  try {
    const result = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/positions/17/resumes',
        method: 'GET'
      }, (res) => {
        let data = ''
        res.on('data', (chunk) => data += chunk)
        res.on('end', () => resolve({ status: res.statusCode, data }))
      })
      req.on('error', reject)
      req.end()
    })
    
    console.log('Status:', result.status)
    console.log('Response:', result.data.substring(0, 2000))
  } catch (e) {
    console.error('Error:', e.message)
  }
}

test()
