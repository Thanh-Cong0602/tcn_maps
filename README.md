1. Chạy lệnh yarn install để cài đặt node_modules
2. Chạy lệnh yarn dev để chạy BE
3. Chạy API http://localhost:3000/distances sẽ lấy 6 điểm gần nhất 1 điểm dựa trên điều kiện là lớn hơn 100m và bé hơn 1000m. Sau khi lấy xong 6 điểm sẽ tính diện tích và góc tạo bởi ba cạnh hiện tại đang để là nhỏ hơn 10 độ sẽ loại cạnh đó - để loại ra các điểm thẳng hàng. Sau khi filter tất cả nếu không có cạnh nào trả về sẽ random ra 2 cạnh để chắc chắn có tồn tại đường đi giữa 2 đỉnh. Sau khi filter xong tất cả sẽ tính vận tốc trung bình dựa trên khoảng cách và thời gian lý tưởng. Sau đó ta được file mergeTrafficVolumn.

4. File mergeTrafficVolumn sẽ là tổng số cạnh sau khi mỗi đỉnh lấy 6 cạnh và loại bỏ các đỉnh thẳng hàng

5. Mở postman chạy API http://localhost:3000/calcTraffic sẽ thấy thống kê về tốc độ trung bình, 
tổng số xe trên 1 cạnh hay là trên 1 tuyến đường

6. file calcVehicles.json sẽ là kết quả cuối cùng
