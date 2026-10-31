# P1 Product API

RESTful CRUD Product bằng Express/Mongoose/MongoDB, Docker Compose, health check và CI/CD theo tài liệu P1. Cổng mặc định **3000**; container database tên **nammongodb**, ứng dụng tên **product-api**.

## Chạy local

```powershell
cd C:\dev\product-api
pwsh -File scripts/setup.ps1
docker compose up -d --build --wait --wait-timeout 180
docker compose ps
curl.exe -i http://localhost:3000/api/health
```

`.env` đã có thì setup giữ nguyên. Compose cố định cổng trong container là 3000, địa chỉ database là nammongodb; HOST_PORT trong `.env` điều khiển cổng host. Chạy Node ngoài Docker phải đổi MONGO_URI sang database mà máy host truy cập được.

## Kiểm tra và demo

```powershell
npm ci
npm run lint
npm test
docker compose --profile test run --rm --build tests
npm run demo
```

Test tích hợp dùng database `product-api-test`, có chặn chạy nhầm database chính. `npm run demo` tạo sản phẩm qua API, xác minh bằng MongoDB CLI, sửa và xóa đúng sản phẩm vừa tạo. Import `postman/P1.postman_collection.json` để demo từng request bằng Postman.

## Các sửa đổi chính

- Workflow đúng repository gốc, không còn đường dẫn phase1-product-api.
- Counter nguyên tử và unique index bảo đảm các request tạo đồng thời có pid riêng; pid chỉ định cập nhật mốc counter.
- Validate pid, tên, giá, số lượng, body, field lạ và cập nhật rỗng; JSON sai trả 400.
- Health kiểm tra MongoDB, không bị rate limit; request logs không ghi body/mật khẩu.
- Docker test stage, database test riêng, collection Postman, script demo và hướng dẫn đủ 8 mục chấm.
- CD chỉ đẩy đúng image đã qua unit/integration và health check. Có job tự deploy xuống Windows self-hosted runner khi bật.

Đọc [hướng dẫn theo phiếu chấm](docs/DEMO.md), [cấu hình GitHub/Docker Hub/local runner](docs/DEPLOYMENT_GUIDE.md) và [kết quả kiểm thử](docs/TESTING.md).

Không commit `.env`, artifacts, node_modules hoặc coverage. `docker compose down` giữ volume; khi chuyển sang compose-prod phải dùng cùng project name/volume để giữ dữ liệu. Không chạy hai compose cùng lúc vì dùng cùng tên container/cổng.
