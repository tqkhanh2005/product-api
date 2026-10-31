# Demo P1 theo đủ 8 tiêu chí

Mở PowerShell tại `C:\dev\product-api`. Sau mỗi bước kiểm tra kết quả mong đợi trước khi chuyển bước.

## 1 Gitignore và env

```powershell
git check-ignore -v .env
git ls-files .env
git ls-files .env.example .gitignore
```

Mong đợi: `.env` bị ignore; lệnh thứ hai không in tệp nào. Mở repository GitHub để chứng minh `.gitignore`/`.env.example` có, `.env` không có. Không hiển thị giá trị `.env` khi quay/chụp demo.

## 2 Docker Compose

```powershell
pwsh -File scripts/setup.ps1
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 180
```

Mong đợi: exit code 0, nammongodb và product-api healthy. Dockerfile nhiều stage: test cài dev dependencies; runtime chỉ cài production dependencies và chạy non-root.

## 3 Health

```powershell
curl.exe -i http://localhost:3000/api/health
```

Mong đợi HTTP 200, status UP, dependencies.mongodb connected. Khi MongoDB không kết nối thì HTTP 503/DOWN, không trả UP chỉ vì HTTP server còn sống.

## 4 Danh sách container

```powershell
docker ps --filter name=nammongodb --filter name=product-api
docker inspect --format '{{.Name}} {{.State.Status}} {{.State.Health.Status}}' nammongodb product-api
```

Mong đợi cả hai running/healthy. Không nhầm container tests đã chạy xong với ứng dụng chính.

## 5 Postman thêm sản phẩm

Import `postman/P1.postman_collection.json`. Base URL mặc định `http://localhost:3000`. Chạy Health rồi Create Product, lưu pid từ response. Dừng tại đây để thực hiện bước 6; chạy phần Update/Delete sau khi đã kiểm tra MongoDB.

```json
{"pname":"Laptop","price":1500,"quantity":10}
```

Mong đợi POST `/api/products` trả 201, đủ pid/pname/price/quantity. Có thể chỉ định pid số nguyên dương; trùng pid trả 409. pid tự sinh an toàn cho các request đồng thời, không tái sử dụng id sau khi xóa.

## 6 Xem dữ liệu MongoDB qua CLI

```powershell
docker exec nammongodb mongosh product-api --quiet --eval 'db.products.find({},{_id:0}).toArray()'
docker exec nammongodb mongosh product-api --quiet --eval 'db.products.countDocuments()'
```

Mong đợi nhìn thấy đúng sản phẩm vừa tạo, giá 1500, quantity 10. Sau khi chứng minh dữ liệu, có thể chạy tiếp các request sửa/xóa trong collection.

## 7 Log ứng dụng

```powershell
docker logs --tail 50 product-api
```

Mong đợi log kết nối/index, cổng lắng nghe, method/path/status/duration của request vừa gửi. Không in token hay nội dung `.env`.

## 8 Test và CI/CD

```powershell
npm ci
npm run lint
npm test
docker compose --profile test run --rm --build tests
```

Unit tests dùng model mock để kiểm tra HTTP/validation; integration dùng MongoDB thật, bao gồm CRUD, duplicate, concurrent pid và dữ liệu lỗi. Test database riêng nên không xóa dữ liệu demo.

Trên GitHub mở Actions: test-productci, test-productci-prod và cd-dockerhub. CD yêu cầu Docker Hub secrets, còn tự deploy về local cần self-hosted runner như DEPLOYMENT_GUIDE.md. Không khẳng định Actions/Docker Hub đã thành công chỉ dựa vào kết quả máy local.

## Demo tự động

```powershell
npm run demo
```

Mong đợi PASS cho health, CRUD và truy vấn MongoDB CLI. Kết quả gọn được ghi trong `artifacts/demo.json`.
