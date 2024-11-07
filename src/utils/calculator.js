/* eslint-disable no-console */
import axios from 'axios'

export function calculateTrafficVolume(filterPointsCollinear) {
  return filterPointsCollinear.map(item => ({
    averageSpeed: item.length / item.baseDuration,
    ...item
  }))
}

// Hàm tính diện tích tam giác giữa ba điểm A, B, C
export function getTriangleArea(A, B, C) {
  return Math.abs((B.lng - A.lng) * (C.lat - A.lat) - (C.lng - A.lng) * (B.lat - A.lat)) / 2
}

export function getAngleBetweenVectors(A, B, C) {
  const AB = { x: B.lng - A.lng, y: B.lat - A.lat }
  const BC = { x: C.lng - B.lng, y: C.lat - B.lat }

  // Dot product của vector AB và BC
  const dotProduct = AB.x * BC.x + AB.y * BC.y

  // Độ dài của các vector
  const magnitudeAB = Math.sqrt(AB.x ** 2 + AB.y ** 2)
  const magnitudeBC = Math.sqrt(BC.x ** 2 + BC.y ** 2)

  // Cosine của góc giữa chúng
  const cosTheta = dotProduct / (magnitudeAB * magnitudeBC)

  // Trả về góc trong độ
  const angle = Math.acos(cosTheta) * (180 / Math.PI) // chuyển đổi từ radian sang độ
  return angle
}

export function arePointsCollinear(A, B, C, tolerance = 0.001, angleTolerance = 10) {
  // Tính diện tích tam giác
  const area = getTriangleArea(A, B, C)

  // Kiểm tra diện tích nếu diện tích gần bằng 0
  if (area > tolerance) {
    return false // Các điểm không thẳng hàng
  }

  // Tính góc giữa các vector AB và BC
  const angle = getAngleBetweenVectors(A, B, C)
  // Kiểm tra nếu góc gần 180 độ (chúng gần song song)
  if (Math.abs(angle - 180) < angleTolerance) {
    return true // Các điểm thẳng hàng
  }

  return false // Nếu diện tích gần 0 nhưng góc không gần 180 độ, thì không thẳng hàng
}

export function filterCollinearPoints(point, points) {
  const collinearPoints = []
  const addedPoints = new Set() // Set để theo dõi các điểm đã được thêm

  // Kiểm tra tính thẳng hàng của mỗi cặp điểm (A, Bi, Bi+1)
  for (let i = 0; i < points.length - 1; i++) {
    const B = points[i].arrival.place.location
    const C = points[i + 1].arrival.place.location

    // Nếu B và C không thẳng hàng với origin, thêm chúng vào mảng collinearPoints
    const origin = { lat: point.lat, lng: point.lng }
    if (!arePointsCollinear(origin, B, C)) {
      if (!addedPoints.has(points[i])) {
        collinearPoints.push(points[i])
        addedPoints.add(points[i])
      }
      if (!addedPoints.has(points[i + 1])) {
        collinearPoints.push(points[i + 1])
        addedPoints.add(points[i + 1])
      }
    }
  }

  return collinearPoints
}

// Hàm tính khoảng cách giữa 2 điểm

export function calculateDistance(lat1, lng1, lat2, lng2) {
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

export function filterLocations(origin, locations) {
  const { lat, lng } = origin

  // Duyệt qua các địa điểm và tính khoảng cách từ điểm gốc
  const shuffledLocations = locations
    .sort(() => 0.5 - Math.random()) // Xáo trộn mảng ngẫu nhiên
    .map(location => {
      const distance = calculateDistance(lat, lng, location.lat, location.lng)
      return { ...location, distance }
    })
    .filter(location => location.distance > 100 && location.distance < 1000)
    .slice(0, 15)

  return shuffledLocations
}

export async function getDetailedDistance(point, destination, toTitle, id, apiKey) {
  const origin = { lat: point.lat, lng: point.lng }
  const searchUrl = `https://router.hereapi.com/v8/routes?transportMode=car&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&return=summary&apikey=${apiKey}`
  try {
    const response = await axios.get(searchUrl)
    const routeInfo = response.data.routes?.[0]?.sections?.[0]
    if (routeInfo) {
      return {
        toIndex: destination.index,
        toName: toTitle,
        id,
        duration: routeInfo.summary.duration,
        length: routeInfo.summary.length,
        distance: routeInfo.summary.distance,
        baseDuration: routeInfo.summary.baseDuration
      }
    } else {
      console.error(`No route information found for destination: ${toTitle}`)
      return null
    }
  } catch (error) {
    console.error(`Error fetching route for ${toTitle}:`, error.message)
    return null
  }
}

export async function getDetailedDistances(point, filteredDistance, apiKey) {
  const results = []
  const batchSize = 5 // Số lượng yêu cầu trong mỗi đợt
  const delay = 5000 // Thời gian chờ giữa các đợt, tính bằng mili giây

  for (let i = 0; i < filteredDistance.length; i += batchSize) {
    // Chọn một nhóm 5 điểm từ danh sách
    const batch = filteredDistance.slice(i, i + batchSize)

    // Tạo các promises cho nhóm 5 điểm
    const promises = batch.map(location =>
      getDetailedDistance(point, location, location.title, location.id, apiKey)
    )

    // Chờ tất cả các yêu cầu trong nhóm này hoàn thành
    const batchResults = await Promise.all(promises)

    // Thêm kết quả của nhóm này vào kết quả tổng
    results.push(...batchResults.filter(result => result !== null))

    // Nếu còn điểm cần xử lý, chờ 5 giây trước khi tiếp tục
    if (i + batchSize < filteredDistance.length) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return results
}
