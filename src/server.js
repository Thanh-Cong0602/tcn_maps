/* eslint-disable no-console */
import axios from 'axios'
import express from 'express'
import fs from 'fs'
import path from 'path'

const app = express()
app.use(express.json())
const PORT = 3000
const HERE_API_KEY = 'f06PKJOz9lOzRlViSG7SUMNaKcmaN9j_bi08725lwEI'

const points = [
  { lat: 10.794117578785418, lng: 106.65099142442212, name: 'Ngã tư Bảy Hiền' },
  { lat: 10.812904879639706, lng: 106.66383852370112, name: 'Sân Bay Tân Sơn Nhất' },
  { lat: 10.80141995232255, lng: 106.71147383559278, name: 'Ngã Tư Hàng Xanh' },
  { lat: 10.78107212034334, lng: 106.6885222762067, name: 'Võ Thị Sáu - Điện Biên Phủ' },
  { lat: 10.825912494787856, lng: 106.71502015813019, name: 'Cầu Bình Lợi' },
  { lat: 10.814428065639147, lng: 106.67900497516595, name: 'Ga Gò Vấp' },
  { lat: 10.799131483020561, lng: 106.68027855728978, name: 'Nguyễn Kiệm - Hoàng Văn Thụ - Phan Đăng Lưu' },
  { lat: 10.80254250891898, lng: 106.6986732348961, name: 'Lê Quang Định - Bạch Đằng' },
  { lat: 10.791805149396877, lng: 106.67226252043307, name: 'Hẻm 115 Lê Văn Sỹ' },
  { lat: 10.791659812242546, lng: 106.68185141438717, name: 'Nguyễn Văn Trổi - Trường Sa' },
  { lat: 10.808017493074253, lng: 106.67312676919832, name: 'Phổ Quang' },
  { lat: 10.803254613223876, lng: 106.69839650387382, name: 'Lê Quang Định - Phan Đăng Lưu' },
  { lat: 10.807822088148784, lng: 106.70357336292223, name: 'Hẻm 170 Bùi Đình Túy' },
  { lat: 10.815011831283226, lng: 106.70812576075805, name: 'Thanh Đa - Nguyễn Xí' },
  { lat: 10.820142348884117, lng: 106.70394696859184, name: 'Nguyễn Xí - Nơ Trang Long' },
  { lat: 10.809863505953002, lng: 106.68389711156186, name: 'Hoàng Hoa Thám' },
  { lat: 10.793498552145124, lng: 106.69595267981002, name: 'Cầu Bông' },
  { lat: 10.794760443638125, lng: 106.70563137161508, name: 'Trần Văn Khê' }
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

// Hàm để tính khoảng cách giữa hai điểm (đơn vị: mét)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const toRadians = deg => (deg * Math.PI) / 180

  const R = 6371e3 // Bán kính Trái Đất (m)
  const φ1 = toRadians(lat1)
  const φ2 = toRadians(lat2)
  const Δφ = toRadians(lat2 - lat1)
  const Δλ = toRadians(lng2 - lng1)

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Khoảng cách (m)
}

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

app.get('/random-points-by-tcn', async (req, res) => {
  const results = [] // Mảng chứa kết quả cho tất cả các điểm

  const minDistance = 100 // khoảng cách tối thiểu (m)
  const maxDistance = 1000 // khoảng cách tối đa (m)
  const targetPoints = 12 // số điểm cần lấy

  for (const point of points) {
    const originLat = point.lat
    const originLng = point.lng

    try {
      // Gọi HERE API để lấy các điểm theo danh mục
      const response = await axios.get('https://browse.search.hereapi.com/v1/browse', {
        params: {
          at: `${originLat},${originLng}`,
          categories: '100-1000-0000',
          limit: 100,
          apikey: `${HERE_API_KEY}`
        }
      })

      const apiPoints = response.data.items

      // Lọc các điểm trong khoảng cách từ 100m đến 1000m
      const filteredPoints = []

      for (const currentPoint of apiPoints) {
        const distance = calculateDistance(
          originLat,
          originLng,
          currentPoint.position.lat,
          currentPoint.position.lng
        )

        // Kiểm tra khoảng cách trong khoảng 100m - 1000m
        if (
          distance >= minDistance &&
          distance <= maxDistance &&
          currentPoint.distance > minDistance &&
          currentPoint.distance < maxDistance
        ) {
          let isFarEnough = true

          // Kiểm tra khoảng cách với các điểm đã chọn
          for (const selectedPoint of filteredPoints) {
            const interDistance = calculateDistance(
              currentPoint.position.lat,
              currentPoint.position.lng,
              selectedPoint.position.lat,
              selectedPoint.position.lng
            )

            if (interDistance < minDistance) {
              isFarEnough = false
              break
            }
          }

          // Thêm vào danh sách nếu điểm thỏa mãn
          if (isFarEnough && filteredPoints.length < targetPoints) {
            filteredPoints.push(currentPoint)
          }

          // Dừng lại khi đã đủ số điểm yêu cầu
          if (filteredPoints.length === targetPoints) break
        }
      }

      // Thêm kết quả cho từng điểm vào mảng kết quả
      results.push({
        point: point.name,
        randomPoints: filteredPoints
      })
      var tcn = []
      results.forEach(location => {
        location.randomPoints.forEach(point => {
          const data = {
            id: point.id,
            name: point.address.label,
            lat: point.position.lat,
            lng: point.position.lng
          }
          tcn.push(data)
        })
      })
    } catch (error) {
      console.error(`Error fetching data for point ${point.name}:`, error)
      res.status(500).json({ error: `Failed to fetch data for point ${point.name}` })
      return
    }
  }

  // Ghi vào file JSON
  fs.writeFileSync('filteredPoints.json', JSON.stringify(tcn, null, 2))

  res.json(tcn)
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
