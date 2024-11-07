/* eslint-disable no-console */
import axios from 'axios'
import express from 'express'
import fs from 'fs'
import path from 'path'
import {
  calculateDistance,
  calculateTrafficVolume,
  filterLocations,
  getDetailedDistances
} from './utils/calculator'

const app = express()
app.use(express.json())
const PORT = 5000
const HERE_API_KEY = 'FzknS3Tw3Xnjmy-e-nxy_6NEMBMGSVwWfm_DnEonNXM'

const data = require('./database/unique_points.json')

app.get('/distances', async (req, res) => {
  console.log('Starting distance calculation...')

  let trafficVolumn = []
  const databases = data.map((item, index) => ({ ...item, index: index + 1 }))

  // Hàm sleep để trì hoãn
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

  for (const [index, point] of databases.slice(210, 220).entries()) {
    const originPoint = { lat: point.lat, lng: point.lng }
    console.log(`Processing point ${index + 1 + 150}:`, originPoint)

    // Lọc dữ liệu địa điểm để lấy 15 random điểm cần tính
    const filteredDistance = filterLocations(point, databases)
    console.log('Filtered distance points count:', filteredDistance.length)

    // Lấy khoảng cách từ điểm cần tính đến 15 điểm gần nhất
    const detailedDistances = await getDetailedDistances(point, filteredDistance, HERE_API_KEY)

    console.log('detailedDistances', detailedDistances.length)

    const trafficMap = calculateTrafficVolume(detailedDistances)
    const item = {
      id: point.id,
      fromName: point.title,
      fromIndex: point.index,
      distances: trafficMap
    }
    trafficVolumn.push(item)

    // Chờ 1 giây trước khi tiếp tục vòng lặp
    await sleep(5000) // Khoảng nghỉ 1000ms (1 giây) giữa các lần chạy
  }

  // Lưu kết quả vào file trafficVolumn.json
  fs.writeFileSync('trafficVolumn.json', JSON.stringify(trafficVolumn, null, 2))

  // Trả về kết quả cho client
  res.json(trafficVolumn)
})

const trafficVolumn1 = require('./database/trafficVolumn1.json')
const trafficVolumn2 = require('./database/trafficVolumn2.json')
app.get('/flat', (req, res) => {
  const flattenedData1 = trafficVolumn1.flat(Infinity)
  const flattenedData2 = trafficVolumn2.flat(Infinity)
  const mergeTrafficVolumn = [...flattenedData1, ...flattenedData2]
  fs.writeFileSync('mergeTrafficVolumn.json', JSON.stringify(mergeTrafficVolumn, null, 2))
  res.json(mergeTrafficVolumn)
})

const mergeTrafficVolumn = require('./database/mergeTrafficVolumn.json')

app.get('/calcTraffic', (req, res) => {
  const stats = mergeTrafficVolumn.reduce(
    (acc, item) => {
      const speed = item.averageSpeed

      if (speed >= 3 && speed < 4) {
        acc['3-4']++
      } else if (speed >= 4 && speed < 5) {
        acc['4-5']++
      } else if (speed >= 5 && speed < 6) {
        acc['5-6']++
      } else if (speed >= 6 && speed < 7) {
        acc['6-7']++
      } else if (speed >= 7 && speed < 8) {
        acc['7-8']++
      } else if (speed >= 8 && speed < 9) {
        acc['8-9']++
      } else if (speed >= 9) {
        acc['>9']++
      }

      return acc
    },
    {
      '3-4': 0,
      '4-5': 0,
      '5-6': 0,
      '6-7': 0,
      '7-8': 0,
      '8-9': 0,
      '>9': 0
    }
  )

  // Tính tổng tốc độ
  const totalSpeed = mergeTrafficVolumn.reduce((sum, item) => sum + item.averageSpeed, 0)

  // Tính trung bình
  const averageSpeed = totalSpeed / mergeTrafficVolumn.length
  const totalVehicles = 100

  const calcVehicles = mergeTrafficVolumn.map(item => ({
    totalVehicles: Math.ceil((totalVehicles * item.averageSpeed) / averageSpeed),
    ...item
  }))

  const vehicleStats = calcVehicles.reduce(
    (acc, item) => {
      const vehicles = item.totalVehicles

      if (vehicles < 100) {
        acc['<100']++
      } else if (vehicles >= 100 && vehicles < 200) {
        acc['100-200']++
      } else if (vehicles >= 200 && vehicles < 300) {
        acc['200-300']++
      } else if (vehicles >= 300) {
        acc['>300']++
      }

      return acc
    },
    {
      '<100': 0,
      '100-200': 0,
      '200-300': 0,
      '>300': 0
    }
  )

  fs.writeFileSync('calcVehicles.json', JSON.stringify(calcVehicles, null, 2))
  // Gửi kết quả trả về
  res.json({ averageSpeed, stats, vehicleStats, calcVehicles })
})

const points = [
  {
    lat: 10.79383,
    lng: 106.65183,
    name: '2 Đường Xuân Hồng, Phường 12, Quận Tân Bình, Hồ Chí Minh, Việt Nam',
    ggName: 'Ngã tư Bảy Hiền'
  },
  {
    lat: 10.81591,
    lng: 106.66411,
    name: 'Next Noodies, Phường 2, Quận Tân Bình, Hồ Chí Minh, Việt Nam',
    ggName: 'Sân Bay Tân Sơn Nhất'
  },
  {
    lat: 10.80138,
    lng: 106.71147,
    name: 'Đường Điện Biên Phủ, Phường 21, Quận Bình Thạnh, Hồ Chí Minh, Việt Nam',
    ggName: 'Ngã Tư Hàng Xanh'
  },
  {
    lat: 10.78121,
    lng: 106.68845,
    name: 'Đường Điện Biên Phủ, Phường Võ Thị Sáu, Quận 3, Hồ Chí Minh, Việt Nam',
    ggName: 'Võ Thị Sáu - Điện Biên Phủ'
  },
  {
    lat: 10.82591,
    lng: 106.71499,
    name: '24 Giao Lộ Ngã Tư, Phường Hiệp Bình Chánh, Thủ Đức, Hồ Chí Minh, Việt Nam',
    ggName: 'Cầu Bình Lợi'
  },
  {
    lat: 10.8144,
    lng: 106.67898,
    name: 'Đường Nguyễn Kiệm, Phường 3, Quận Gò Vấp, Hồ Chí Minh, Việt Nam',
    ggName: 'Ga Gò Vấp'
  },
  {
    lat: 10.79911,
    lng: 106.68024,
    name: '371 Đường Phan Đình Phùng, Phường 15, Quận Phú Nhuận, Hồ Chí Minh, Việt Nam',
    ggName: 'Nguyễn Kiệm - Hoàng Văn Thụ - Phan Đăng Lưu'
  },
  {
    lat: 10.80134,
    lng: 106.69864,
    name: '44B Đường Ngô Nhân Tịnh, Phường 1, Quận Bình Thạnh, Hồ Chí Minh, Việt Nam',
    ggName: 'Lê Quang Định - Bạch Đằng'
  },
  {
    lat: 10.79181,
    lng: 106.67224,
    name: 'Đường Lê Văn Sỹ, Phường 11, Quận Phú Nhuận, Hồ Chí Minh, Việt Nam',
    ggName: 'Hẻm 115 Lê Văn Sỹ'
  },
  {
    lat: 10.79162,
    lng: 106.68182,
    name: 'Cầu Công Lý, Phường Võ Thị Sáu, Quận 3, Hồ Chí Minh, Việt Nam',
    ggName: 'Nguyễn Văn Trổi - Trường Sa'
  },
  {
    lat: 10.80812,
    lng: 106.67311,
    name: '155 Đường Phổ Quang, Phường 9, Quận Phú Nhuận, Hồ Chí Minh, Việt Nam',
    ggName: 'Phổ Quang'
  },
  {
    lat: 10.80333,
    lng: 106.69869,
    name: '20C/1 Đường Lê Quang Định, Phường 14, Quận Bình Thạnh, Hồ Chí Minh, Việt Nam',
    ggName: 'Lê Quang Định - Phan Đăng Lưu'
  },
  {
    lat: 10.80778,
    lng: 106.70357,
    name: '179 Đường Bùi Đình Túy, Phường 12, Quận Bình Thạnh, Hồ Chí Minh, Việt Nam',
    ggName: 'Hẻm 170 Bùi Đình Túy'
  },
  {
    lat: 10.81512,
    lng: 106.70826,
    name: '172 Đường Nguyễn Xí, Phường 26, Quận Bình Thạnh, Hồ Chí Minh, Việt Nam',
    ggName: 'Thanh Đa - Nguyễn Xí'
  },
  {
    lat: 10.82007,
    lng: 10.82007,
    name: '403B Đường Nguyễn Xí, Phường 13, Quận Bình Thạnh, Hồ Chí Minh, Việt Nam',
    ggName: 'Nguyễn Xí - Nơ Trang Long'
  },
  {
    lat: 10.80954,
    lng: 106.68388,
    name: '156 Đường Hoàng Hoa Thám, Phường 5, Quận Phú Nhuận, Hồ Chí Minh, Việt Nam',
    ggName: 'Hoàng Hoa Thám'
  },
  {
    lat: 10.7935,
    lng: 106.69597,
    name: 'Đường Đinh Tiên Hoàng, Phường 3, Quận Bình Thạnh, Hồ Chí Minh, Việt Nam',
    ggName: 'Cầu Bông'
  },
  {
    lat: 10.79446,
    lng: 106.70561,
    name: '144/27 Hẻm 144 Phan Văn Hân, Phường 17, Quận Bình Thạnh, Hồ Chí Minh, Việt Nam',
    ggName: 'Trần Văn Khê'
  }
]

app.get('/random-places', async (req, res) => {
  const { location } = req.query

  if (!location) {
    return res
      .status(400)
      .json({ error: 'Vui lòng cung cấp tọa độ trung tâm (location) ở định dạng latitude,longitude.' })
  }

  try {
    const searchUrl = `https://browse.search.hereapi.com/v1/discover?at=${location}&limit=100&apikey=${HERE_API_KEY}`

    // Gửi yêu cầu đến HERE API để lấy các địa điểm
    const response = await axios.get(searchUrl)

    // Lấy danh sách địa điểm từ phản hồi
    const places = response.data.items

    // Kiểm tra nếu số lượng địa điểm ít hơn 15
    if (places.length < 15) {
      return res.json({ items: places })
    }

    // Trộn và lấy ngẫu nhiên 15 địa điểm
    const randomPlaces = places.sort(() => 0.5 - Math.random()).slice(0, 15)

    // Trả về 15 địa điểm ngẫu nhiên
    res.json({ items: randomPlaces })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Không thể lấy thông tin địa điểm' })
  }
})

const categoryMap = {
  restaurant: '100-1000-0000',
  hospital: '800-8000-0246',
  school: '600-6000-0064'
}

app.get('/nearby-places', async (req, res) => {
  const { lat, lng, limit = 10, category } = req.query

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Vui lòng cung cấp tọa độ trung tâm với các tham số lat và lng.' })
  }

  try {
    const categoryId = categoryMap[category.toLowerCase()]
    if (!categoryId && category) {
      return res.status(400).json({ error: 'Danh mục không hợp lệ. Vui lòng cung cấp tên danh mục hợp lệ.' })
    }

    let searchUrl = `https://browse.search.hereapi.com/v1/browse?at=${lat},${lng}&limit=${limit}&apikey=${HERE_API_KEY}`
    if (categoryId) {
      searchUrl += `&categories=${categoryId}`
    }

    const response = await axios.get(searchUrl)
    const places = response.data.items

    // Trích xuất dữ liệu và chuẩn bị nội dung lưu vào file JSON
    const points = places.map(place => ({
      title: place.title,
      position: place.position
    }))

    // Lưu dữ liệu vào file points.json
    fs.writeFileSync('points.json', JSON.stringify(points, null, 2), 'utf-8')

    // Trả về danh sách các địa điểm và thông báo lưu thành công
    res.json({ items: places, message: 'Dữ liệu đã được lưu vào points.json' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Không thể lấy thông tin địa điểm' })
  }
})

app.get('/route', async (req, res) => {
  const { origin, destination } = req.query

  if (!origin || !destination) {
    return res.status(400).json({ error: 'Vui lòng cung cấp cả điểm đi (origin) và điểm đến (destination).' })
  }

  try {
    const routeUrl = `https://router.hereapi.com/v8/routes?transportMode=car&origin=${origin}&destination=${destination}&return=summary,polyline&apikey=${HERE_API_KEY}`

    // Gửi yêu cầu tới HERE Routing API
    const response = await axios.get(routeUrl)

    // Trả về dữ liệu JSON từ API HERE
    res.json(response.data)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Không thể lấy thông tin chỉ đường' })
  }
})

// Hàm để tạo các điểm ngẫu nhiên
function generateRandomPoints(lat, lng, count, radius) {
  const randomPoints = []
  for (let i = 0; i < count; i++) {
    const randomDistance = Math.random() * radius
    const randomAngle = Math.random() * 2 * Math.PI

    const newLat = lat + (randomDistance / 111.32) * Math.cos(randomAngle)
    const newLng = lng + (randomDistance / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(randomAngle)

    randomPoints.push({ lat: newLat, lng: newLng })
  }
  return randomPoints
}

app.get('/random-points', (req, res) => {
  const { lat, lng } = req.query

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Vui lòng cung cấp cả lat và lng' })
  }

  const originLat = parseFloat(lat)
  const originLng = parseFloat(lng)

  // Số lượng điểm và bán kính (2km)
  const initialPointCount = 100
  const radius = 1 // km
  const minDistance = 100 // mét
  const targetPoints = 10

  // Tạo danh sách 100 điểm ngẫu nhiên ban đầu
  const randomPoints = generateRandomPoints(originLat, originLng, initialPointCount, radius)

  // Lọc 10 điểm đầu tiên với khoảng cách lớn hơn 100m giữa các điểm
  const filteredPoints = []

  for (let i = 0; i < randomPoints.length; i++) {
    const currentPoint = randomPoints[i]
    let isFarEnough = true

    // Kiểm tra khoảng cách với các điểm đã được chọn trong filteredPoints
    for (const selectedPoint of filteredPoints) {
      const distance = calculateDistance(
        currentPoint.lat,
        currentPoint.lng,
        selectedPoint.lat,
        selectedPoint.lng
      )

      if (distance < minDistance) {
        isFarEnough = false
        break
      }
    }

    // Nếu điểm hiện tại thỏa mãn điều kiện, thêm vào danh sách
    if (isFarEnough) {
      filteredPoints.push(currentPoint)
      if (filteredPoints.length === targetPoints) break // Dừng lại khi đạt đủ 10 điểm
    }
  }

  res.json(filteredPoints)
})

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

app.get('/random-points-by-tcn', async (req, res) => {
  const results = []
  const minDistance = 200
  const maxDistance = 3000
  const minDistanceBetweenPoints = 200
  const targetPointsPerCategory = 10
  const categories = ['500-5000-0000'] // categories: Hotel or Motel
  // const categories = ['400-4100-0036'] Bus Station
  // const categories = ['600-6300-0064'] Specialty_Store.json

  const promises = points.map(async point => {
    const originLat = point.lat
    const originLng = point.lng
    const pointResults = []

    for (const category of categories) {
      try {
        // Thêm độ trễ trước khi gọi API
        await delay(1000) // 1 giây (1000 ms) giữa các yêu cầu
        const response = await axios.get('https://browse.search.hereapi.com/v1/browse', {
          params: {
            at: `${originLat},${originLng}`,
            categories: category,
            limit: 100,
            apikey: `${HERE_API_KEY}`
          }
        })
        const apiPoints = response.data.items

        const filteredPoints = []
        for (const currentPoint of apiPoints) {
          if (currentPoint.distance >= minDistance && currentPoint.distance <= maxDistance) {
            filteredPoints.push({
              ...currentPoint,
              calculatedDistance: currentPoint.distance
            })
          }
        }
        console.log('filteredPoints', filteredPoints.length)

        const selectedPoints = []
        for (const currentPoint of filteredPoints) {
          const isFarEnough = selectedPoints.every(selectedPoint => {
            const interDistance = calculateDistance(
              selectedPoint.position.lat,
              selectedPoint.position.lng,
              currentPoint.position.lat,
              currentPoint.position.lng
            )
            return interDistance >= minDistanceBetweenPoints
          })

          if (isFarEnough && selectedPoints.length < targetPointsPerCategory) {
            selectedPoints.push(currentPoint)
          }

          if (selectedPoints.length === targetPointsPerCategory) break
        }

        console.log('selectedPoints', selectedPoints.length)

        pointResults.push({
          point: point.name,
          category,
          randomPoints: selectedPoints
        })
      } catch (error) {
        console.error(`Error fetching data for point ${point.name} in category ${category}:`, error)
        return { error: `Failed to fetch data for point ${point.name} in category ${category}` }
      }
    }

    return pointResults
  })

  try {
    const allResults = await Promise.all(promises)
    allResults.forEach(pointResult => {
      if (Array.isArray(pointResult)) {
        results.push(...pointResult)
      }
    })

    const tcn = results.flatMap(location =>
      location.randomPoints.map(point => ({
        id: point.id,
        name: point.address.label,
        lat: point.position.lat,
        lng: point.position.lng,
        distance: point.calculatedDistance
      }))
    )

    fs.writeFileSync('Hotel_Motel.json', JSON.stringify(tcn, null, 2))
    res.json(tcn)
  } catch (error) {
    console.error('Error processing points:', error)
    res.status(500).json({ error: 'An error occurred while processing points' })
  }
})

function getFilterPointsData() {
  const filePath = path.join(__dirname, '../filteredPoints.json')
  console.log('filePath', filePath)
  try {
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Lỗi khi đọc file filteredPoints.json:', error)
    return []
  }
}

const tcn1 = require('../Bus_Station.json')
const tcn2 = require('../Hotel_Motel.json')
const tcn3 = require('../Specialty_Store.json')

app.get('/filtered-points', (req, res) => {
  // Gộp các mảng lại
  const allPoints = [...tcn1, ...tcn2, ...tcn3]
  const filteredPoints = allPoints.filter((point, index) => {
    // So sánh với tất cả các điểm khác trong mảng
    for (let i = 0; i < allPoints.length; i++) {
      if (i !== index) {
        // Tính khoảng cách giữa điểm hiện tại và điểm khác
        const distance = calculateDistance(point.lat, point.lng, allPoints[i].lat, allPoints[i].lng)
        console.log(`Khoảng cách giữa ${distance} m`)
        if (distance < 100) {
          console.log(point.lat, point.lng, allPoints[i].lat, allPoints[i].lng)
          console.log('Radius:', i, index, distance)
          return false // Nếu có điểm nào gần hơn 100m, loại bỏ điểm này
        }
      }
    }
    return true // Nếu không có điểm nào gần hơn 100m, giữ lại điểm này
  })
  console.log(allPoints.length, filteredPoints.length)

  fs.writeFile('results.json', JSON.stringify(filteredPoints, null, 2), err => {
    if (err) {
      console.error('Error writing to file', err)
      return res.status(500).send('Error saving results')
    }
    console.log('Results saved to results.json')
  })

  res.json(filteredPoints)
})

const results = require('../results.json')
app.get('/final-points', (req, res) => {
  // Gộp các mảng lại
  const allPoints = results
  const filteredPoints = allPoints.filter((point, index) => {
    // So sánh với tất cả các điểm khác trong mảng
    for (let i = 0; i < allPoints.length; i++) {
      if (i !== index) {
        // Tính khoảng cách giữa điểm hiện tại và điểm khác
        const distance = calculateDistance(point.lat, point.lng, allPoints[i].lat, allPoints[i].lng)
        console.log(`Khoảng cách giữa ${distance} m`)
        if (distance < 100) {
          console.log(point.lat, point.lng, allPoints[i].lat, allPoints[i].lng)
          console.log('Radius:', i, index, distance)
          return false // Nếu có điểm nào gần hơn 100m, loại bỏ điểm này
        }
      }
    }
    return true // Nếu không có điểm nào gần hơn 100m, giữ lại điểm này
  })
  console.log(allPoints.length, filteredPoints.length)

  fs.writeFile('final__results.json', JSON.stringify(filteredPoints, null, 2), err => {
    if (err) {
      console.error('Error writing to file', err)
      return res.status(500).send('Error saving results')
    }
    console.log('Results saved to results.json')
  })

  res.json(filteredPoints)
})

app.get('/reverse-geocode', async (req, res) => {
  const { lat, lng } = req.query

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Vui lòng cung cấp cả latitude (lat) và longitude (lng).' })
  }

  try {
    const reverseGeocodeUrl = `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${lat},${lng}&apikey=${HERE_API_KEY}`
    const response = await axios.get(reverseGeocodeUrl)

    if (response.data.items.length > 0) {
      const locationName = response.data.items[0].address.label
      res.json({
        message: 'Địa điểm tìm thấy',
        name: locationName,
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      })
    } else {
      res.status(404).json({ error: 'Không tìm thấy địa điểm nào với tọa độ đã cho.' })
    }
  } catch (error) {
    console.error('Lỗi khi gọi API reverse geocoding:', error)
    res.status(500).json({ error: 'Không thể lấy thông tin địa điểm.' })
  }
})

app.get('/getPoints', async (req, res) => {
  try {
    const pointsData = getFilterPointsData()

    // Tạo mảng các promises để gọi API cho từng điểm ngẫu nhiên
    const pointsWithCoordinates = []

    for (const location of pointsData) {
      for (const point of location.randomPoints) {
        const reverseGeocodeUrl = `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${point.lat},${point.lng}&apikey=${HERE_API_KEY}`
        try {
          const response = await axios.get(reverseGeocodeUrl)
          const name =
            response.data.items.length > 0 ? response.data.items[0].address.label : 'Không tìm thấy tên điểm'

          pointsWithCoordinates.push({
            name: name,
            lat: point.lat,
            lng: point.lng
          })
        } catch (error) {
          console.error('Lỗi khi gọi API reverse geocoding:', error)
          pointsWithCoordinates.push({
            name: 'Không tìm thấy tên điểm',
            lat: point.lat,
            lng: point.lng
          })
        }
      }
    }

    // Lưu dữ liệu vào file JSON (nếu cần)
    fs.writeFileSync('points.json', JSON.stringify(pointsWithCoordinates, null, 2))

    // Trả về kết quả
    res.json({
      message: 'Dữ liệu đã được lấy từ API reverse geocoding',
      data: pointsWithCoordinates
    })
  } catch (error) {
    console.error('Lỗi khi xử lý dữ liệu:', error)
    res.status(500).json({ error: 'Không thể lấy dữ liệu từ API' })
  }
})

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`)
})
